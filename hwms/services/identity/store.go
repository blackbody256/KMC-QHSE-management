package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// auditStore records every administrative action.
//
// Role grants are themselves recorded, per Appendix 6.5 of the requirements
// and Section 2.3 of the production build plan. The manager can create the
// account that holds the clinical role; the record of having done so is the
// control that makes that acceptable.
type auditStore struct{ pool *pgxpool.Pool }

type auditEntry struct {
	ActorID       string
	ActorUsername string
	Action        string
	EntityType    string
	EntityID      string
	Detail        map[string]any
}

func (s *auditStore) record(ctx context.Context, e auditEntry) error {
	detail := []byte("{}")
	if e.Detail != nil {
		encoded, err := json.Marshal(e.Detail)
		if err != nil {
			return fmt.Errorf("encode audit detail: %w", err)
		}
		detail = encoded
	}

	_, err := s.pool.Exec(ctx, `
		insert into audit_log (actor_id, actor_username, action, entity_type, entity_id, detail)
		values ($1, $2, $3, $4, $5, $6)`,
		e.ActorID, e.ActorUsername, e.Action, e.EntityType, e.EntityID, detail,
	)
	if err != nil {
		return fmt.Errorf("write audit entry: %w", err)
	}
	return nil
}
