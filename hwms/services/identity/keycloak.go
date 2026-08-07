package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// keycloakClient talks to the Keycloak administration API using this service's
// own service account.
//
// The manager's token is never used for administration. The manager is
// authorised by this service, which then acts through its own credentials.
// That keeps Keycloak administration rights out of every browser session and
// means a stolen manager token cannot create accounts directly.
type keycloakClient struct {
	baseURL      string
	realm        string
	clientID     string
	clientSecret string
	http         *http.Client

	mu          sync.Mutex
	token       string
	tokenExpiry time.Time
}

func newKeycloakClient(baseURL, realm, clientID, clientSecret string) *keycloakClient {
	return &keycloakClient{
		baseURL:      strings.TrimRight(baseURL, "/"),
		realm:        realm,
		clientID:     clientID,
		clientSecret: clientSecret,
		http:         &http.Client{Timeout: 15 * time.Second},
	}
}

func (k *keycloakClient) accessToken(ctx context.Context) (string, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	if k.token != "" && time.Now().Before(k.tokenExpiry) {
		return k.token, nil
	}

	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {k.clientID},
		"client_secret": {k.clientSecret},
	}
	endpoint := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", k.baseURL, k.realm)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := k.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("service account token request returned %s", resp.Status)
	}

	var body struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}

	k.token = body.AccessToken
	// Refresh early so a request never races the expiry.
	k.tokenExpiry = time.Now().Add(time.Duration(body.ExpiresIn-30) * time.Second)
	return k.token, nil
}

func (k *keycloakClient) do(ctx context.Context, method, path string, body, out any) error {
	token, err := k.accessToken(ctx)
	if err != nil {
		return fmt.Errorf("obtain service account token: %w", err)
	}

	var reader *bytes.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(encoded)
	} else {
		reader = bytes.NewReader(nil)
	}

	endpoint := fmt.Sprintf("%s/admin/realms/%s%s", k.baseURL, k.realm, path)
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := k.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var detail bytes.Buffer
		_, _ = detail.ReadFrom(resp.Body)
		return fmt.Errorf("keycloak %s %s returned %s: %s", method, path, resp.Status, strings.TrimSpace(detail.String()))
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// keycloakUser is the subset of the Keycloak user representation this service
// reads and writes.
type keycloakUser struct {
	ID            string       `json:"id,omitempty"`
	Username      string       `json:"username"`
	Email         string       `json:"email,omitempty"`
	FirstName     string       `json:"firstName,omitempty"`
	LastName      string       `json:"lastName,omitempty"`
	Enabled       bool         `json:"enabled"`
	EmailVerified bool         `json:"emailVerified,omitempty"`
	Credentials   []credential `json:"credentials,omitempty"`
	CreatedAt     int64        `json:"createdTimestamp,omitempty"`
}

type credential struct {
	Type      string `json:"type"`
	Value     string `json:"value"`
	Temporary bool   `json:"temporary"`
}

type realmRole struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (k *keycloakClient) listUsers(ctx context.Context) ([]keycloakUser, error) {
	var users []keycloakUser
	if err := k.do(ctx, http.MethodGet, "/users?briefRepresentation=true&max=500", nil, &users); err != nil {
		return nil, err
	}
	return users, nil
}

func (k *keycloakClient) createUser(ctx context.Context, u keycloakUser) (string, error) {
	if err := k.do(ctx, http.MethodPost, "/users", u, nil); err != nil {
		return "", err
	}
	// Keycloak returns the new identifier in a Location header, which the
	// shared helper does not surface. Looking the user up by username is
	// simpler than special-casing the response, and the username is unique.
	var found []keycloakUser
	if err := k.do(ctx, http.MethodGet, "/users?exact=true&username="+url.QueryEscape(u.Username), nil, &found); err != nil {
		return "", err
	}
	if len(found) == 0 {
		return "", fmt.Errorf("user %s was created but could not be read back", u.Username)
	}
	return found[0].ID, nil
}

func (k *keycloakClient) setEnabled(ctx context.Context, id string, enabled bool) error {
	return k.do(ctx, http.MethodPut, "/users/"+url.PathEscape(id), map[string]any{"enabled": enabled}, nil)
}

func (k *keycloakClient) realmRole(ctx context.Context, name string) (realmRole, error) {
	var role realmRole
	err := k.do(ctx, http.MethodGet, "/roles/"+url.PathEscape(name), nil, &role)
	return role, err
}

func (k *keycloakClient) assignRealmRole(ctx context.Context, userID string, role realmRole) error {
	return k.do(ctx, http.MethodPost,
		"/users/"+url.PathEscape(userID)+"/role-mappings/realm", []realmRole{role}, nil)
}

func (k *keycloakClient) userRealmRoles(ctx context.Context, userID string) ([]realmRole, error) {
	var roles []realmRole
	err := k.do(ctx, http.MethodGet, "/users/"+url.PathEscape(userID)+"/role-mappings/realm", nil, &roles)
	return roles, err
}

// ping reports whether the administration API is reachable and this service's
// credentials still work. Used as a readiness check.
func (k *keycloakClient) ping(ctx context.Context) error {
	var out map[string]any
	return k.do(ctx, http.MethodGet, "/", nil, &out)
}
