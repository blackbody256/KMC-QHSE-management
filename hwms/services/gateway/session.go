package main

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"

	"golang.org/x/oauth2"

	"github.com/kiiramotors/hwms/platform/auth"
)

// session is the server-side record of a signed-in browser.
//
// Tokens are held here and never sent to the browser. The browser holds an
// opaque identifier in an HttpOnly cookie and nothing else. In a system
// holding health data, an access token readable by any script on the page is
// not acceptable, which is the whole reason this gateway exists rather than
// the application talking to Keycloak directly.
type session struct {
	Subject   auth.Subject
	Token     *oauth2.Token
	IDToken   string
	ExpiresAt time.Time
}

// sessionStore keeps sessions for the lifetime of the process.
//
// This implementation is in-memory and therefore single-instance: two gateway
// replicas would not share sessions, and a restart signs everybody out.
// Before the gateway is scaled beyond one replica, replace this with a shared
// store, Postgres or Redis, behind the same three methods. The interface is
// small precisely so that swap is cheap.
type sessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*session
	ttl      time.Duration
}

func newSessionStore(ttl time.Duration) *sessionStore {
	s := &sessionStore{sessions: map[string]*session{}, ttl: ttl}
	go s.reap()
	return s
}

func newSessionID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (s *sessionStore) put(sess *session) (string, error) {
	id, err := newSessionID()
	if err != nil {
		return "", err
	}
	sess.ExpiresAt = time.Now().Add(s.ttl)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[id] = sess
	return id, nil
}

func (s *sessionStore) get(id string) (*session, bool) {
	s.mu.RLock()
	sess, ok := s.sessions[id]
	s.mu.RUnlock()
	if !ok || time.Now().After(sess.ExpiresAt) {
		if ok {
			s.delete(id)
		}
		return nil, false
	}
	return sess, true
}

func (s *sessionStore) delete(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, id)
}

// touch extends an active session. Inactivity, not age, ends a session, per
// FR-SEC-07. Infirmary workstations are shared space and an idle timeout is
// the control that matters there.
func (s *sessionStore) touch(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if sess, ok := s.sessions[id]; ok {
		sess.ExpiresAt = time.Now().Add(s.ttl)
	}
}

func (s *sessionStore) reap() {
	for range time.Tick(time.Minute) {
		now := time.Now()
		s.mu.Lock()
		for id, sess := range s.sessions {
			if now.After(sess.ExpiresAt) {
				delete(s.sessions, id)
			}
		}
		s.mu.Unlock()
	}
}
