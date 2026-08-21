package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

// Delivery of sick-leave facts to the metrics service.
//
// The write path stores the fact in referral_leave_outbox in the same
// transaction as the feedback that produced it. This is the other half: a loop
// that picks up unpublished rows and delivers them.
//
// Splitting it that way is the point of an outbox. If delivery were attempted
// inline, a metrics service that happened to be restarting would either fail
// the officer's save, for a reason that has nothing to do with the referral -
// or lose the contribution silently. Here the save always succeeds, and the
// delivery retries until it lands.
//
// Delivery is at least once, so the receiving end is idempotent on
// (referral_id, feedback_version). A redelivered contribution changes nothing.
//
// What travels is four fields: a referral identifier, a version, a month and a
// number of days. No name, no diagnosis, no free text. A contract test on each
// side fails the build if either widens.

// leaveBatchSize is small on purpose: the batch is delivered inside a
// transaction, so a large one would hold row locks across many HTTP calls.
const leaveBatchSize = 20

type leavePublisher struct {
	log      *slog.Logger
	store    *store
	endpoint string
	token    string
	http     *http.Client
	interval time.Duration
}

func newLeavePublisher(log *slog.Logger, st *store, metricsURL, token string, interval time.Duration) *leavePublisher {
	return &leavePublisher{
		log:      log,
		store:    st,
		endpoint: metricsURL + "/internal/leave-contributions",
		token:    token,
		http:     &http.Client{Timeout: 10 * time.Second},
		interval: interval,
	}
}

// Run delivers pending contributions until the context is cancelled.
func (p *leavePublisher) Run(ctx context.Context) {
	// Once at startup, so a service that was down while a referral came back
	// does not wait a full interval to catch up.
	p.drain(ctx)

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.drain(ctx)
		}
	}
}

type pendingContribution struct {
	OutboxID        int64   `json:"-"`
	ReferralID      string  `json:"referralId"`
	FeedbackVersion int     `json:"feedbackVersion"`
	Period          string  `json:"period"`
	Days            float64 `json:"days"`
}

// drain claims a batch of pending contributions and delivers them.
//
// The claim, the delivery and the mark all happen inside one transaction. Rows
// are selected FOR UPDATE SKIP LOCKED, which is what stops a second clinical
// replica taking the same work, and it only means anything inside a
// transaction, because the row locks are released the moment one ends.
//
// That does hold a database transaction across an HTTP call, which is normally
// worth avoiding. It is bounded here by a small batch and the client's ten
// second timeout, and the alternative is worse: marking a row published before
// it is delivered loses the contribution if the process dies in between, and a
// figure quietly missing from absenteeism is the failure nobody notices.
func (p *leavePublisher) drain(ctx context.Context) {
	tx, err := p.store.pool.Begin(ctx)
	if err != nil {
		p.log.Error("begin leave delivery failed", slog.String("error", err.Error()))
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	pending, err := pendingLeaveContributions(ctx, tx, leaveBatchSize)
	if err != nil {
		p.log.Error("read pending leave contributions failed", slog.String("error", err.Error()))
		return
	}
	if len(pending) == 0 {
		return
	}

	delivered := 0
	for _, contribution := range pending {
		if err := p.deliver(ctx, contribution); err != nil {
			// The whole batch rolls back, so the rows stay unpublished and
			// unlocked and the next tick retries them. A contribution that
			// cannot be delivered is a figure missing from absenteeism, so it
			// stays visible in the outbox rather than being dropped.
			//
			// The referral is not named: this log is not access-controlled as
			// a clinical record, and a referral identifier in it would be one.
			p.log.Warn("deliver leave contribution failed", slog.String("error", err.Error()))
			return
		}
		if _, err := tx.Exec(ctx,
			`update referral_leave_outbox set published_at = now() where outbox_id = $1`,
			contribution.OutboxID); err != nil {
			p.log.Error("mark leave contribution published failed", slog.String("error", err.Error()))
			return
		}
		delivered++
	}

	if err := tx.Commit(ctx); err != nil {
		// Delivered but not recorded as delivered. The next tick redelivers,
		// which the receiving end absorbs. The safe direction to fail in.
		p.log.Error("commit leave delivery failed", slog.String("error", err.Error()))
		return
	}

	p.log.Info("leave contributions delivered", slog.Int("count", delivered))
}

func (p *leavePublisher) deliver(ctx context.Context, contribution pendingContribution) error {
	body, err := json.Marshal(contribution)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.token)

	response, err := p.http.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode != http.StatusNoContent && response.StatusCode != http.StatusOK {
		return fmt.Errorf("metrics service returned %d", response.StatusCode)
	}
	return nil
}

// pendingLeaveContributions claims undelivered rows for this transaction.
//
// SKIP LOCKED rather than waiting: a second replica should move on to other
// work rather than block behind this one. Ordering across replicas is still not
// guaranteed, which is why the receiving end derives supersession from the
// highest version it has seen rather than trusting arrival order.
func pendingLeaveContributions(ctx context.Context, tx pgx.Tx, limit int) ([]pendingContribution, error) {
	rows, err := tx.Query(ctx, `
		select outbox_id, referral_id, feedback_version, period, days
		from referral_leave_outbox
		where published_at is null
		order by outbox_id
		limit $1
		for update skip locked`, limit)
	if err != nil {
		return nil, fmt.Errorf("query pending contributions: %w", err)
	}
	defer rows.Close()

	pending := []pendingContribution{}
	for rows.Next() {
		var c pendingContribution
		if err := rows.Scan(&c.OutboxID, &c.ReferralID, &c.FeedbackVersion, &c.Period, &c.Days); err != nil {
			return nil, err
		}
		pending = append(pending, c)
	}
	return pending, rows.Err()
}
