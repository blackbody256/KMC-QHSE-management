package main

import (
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode"

	"github.com/go-chi/chi/v5"

	"github.com/kiiramotors/hwms/platform/auth"
	"github.com/kiiramotors/hwms/platform/httpx"
)

// assignableRoles are the roles a manager may grant.
//
// The manager cannot grant the manager role. Account administration expands
// only by a decision taken outside this screen, which is a deliberate limit on
// what a single compromised or mistaken manager session can do.
var assignableRoles = []roleOption{
	{Value: auth.RoleOfficer, Label: "Health and Wellness Officer",
		Description: "Records patient visits, monitoring, ergonomics and safety incidents. The only role with access to individual clinical records."},
	{Value: auth.RoleDirector, Label: "Director",
		Description: "Executive summaries and trends. No entry controls and no clinical access."},
}

type roleOption struct {
	Value       string `json:"value"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type userView struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	RoleLabel string    `json:"roleLabel"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"createdAt"`
}

type createUserRequest struct {
	FirstName         string `json:"firstName"`
	LastName          string `json:"lastName"`
	Email             string `json:"email"`
	Role              string `json:"role"`
	TemporaryPassword string `json:"temporaryPassword"`
}

type service struct {
	log      *slog.Logger
	keycloak *keycloakClient
	audit    *auditStore
}

func (s *service) routes(r chi.Router) {
	// Handler-layer check. The service methods check again — see the note in
	// platform/auth about why that is not redundant.
	r.Use(auth.RequireRole(auth.RoleManager))

	r.Get("/roles", s.handleRoles)
	r.Get("/users", s.handleListUsers)
	r.Post("/users", s.handleCreateUser)
	r.Post("/users/{id}/enable", s.handleSetEnabled(true))
	r.Post("/users/{id}/disable", s.handleSetEnabled(false))
}

func (s *service) handleRoles(w http.ResponseWriter, r *http.Request) {
	if err := auth.RequireRoleCtx(r.Context(), auth.RoleManager); err != nil {
		httpx.Problem(w, http.StatusForbidden, "Only the manager can administer accounts.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"roles": assignableRoles})
}

func (s *service) handleListUsers(w http.ResponseWriter, r *http.Request) {
	if err := auth.RequireRoleCtx(r.Context(), auth.RoleManager); err != nil {
		httpx.Problem(w, http.StatusForbidden, "Only the manager can administer accounts.")
		return
	}

	users, err := s.keycloak.listUsers(r.Context())
	if err != nil {
		s.log.Error("list users failed", slog.String("error", err.Error()))
		httpx.Problem(w, http.StatusBadGateway, "Accounts could not be read. Try again shortly.")
		return
	}

	views := make([]userView, 0, len(users))
	for _, u := range users {
		roles, err := s.keycloak.userRealmRoles(r.Context(), u.ID)
		if err != nil {
			s.log.Warn("could not read roles for a user", slog.String("user_id", u.ID))
			continue
		}
		role := firstHWMSRole(roles)
		if role == "" {
			// Not a user of this system. Keycloak realms often hold service
			// accounts and others that this screen has no business listing.
			continue
		}
		views = append(views, userView{
			ID:        u.ID,
			Username:  u.Username,
			Name:      strings.TrimSpace(u.FirstName + " " + u.LastName),
			Email:     u.Email,
			Role:      role,
			RoleLabel: roleLabel(role),
			Enabled:   u.Enabled,
			CreatedAt: time.UnixMilli(u.CreatedAt),
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"users": views})
}

func (s *service) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	if err := auth.RequireRoleCtx(r.Context(), auth.RoleManager); err != nil {
		httpx.Problem(w, http.StatusForbidden, "Only the manager can administer accounts.")
		return
	}
	actor, _ := auth.SubjectFrom(r.Context())

	var req createUserRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, "Send the first name, last name, email address, role and a temporary password.")
		return
	}
	if err := validateCreate(req); err != nil {
		httpx.Problem(w, http.StatusBadRequest, err.Error())
		return
	}

	username := strings.ToLower(strings.TrimSpace(req.Email))
	role, err := s.keycloak.realmRole(r.Context(), req.Role)
	if err != nil {
		s.log.Error("role lookup failed", slog.String("role", req.Role), slog.String("error", err.Error()))
		httpx.Problem(w, http.StatusBadGateway, "That role could not be read from the identity provider.")
		return
	}

	id, err := s.keycloak.createUser(r.Context(), keycloakUser{
		Username:      username,
		Email:         username,
		FirstName:     strings.TrimSpace(req.FirstName),
		LastName:      strings.TrimSpace(req.LastName),
		Enabled:       true,
		EmailVerified: false,
		Credentials: []credential{{
			Type: "password", Value: req.TemporaryPassword, Temporary: true,
		}},
	})
	if err != nil {
		if strings.Contains(err.Error(), "409") {
			httpx.Problem(w, http.StatusConflict, "An account already exists for that email address. Use a different address.")
			return
		}
		s.log.Error("create user failed", slog.String("error", err.Error()))
		httpx.Problem(w, http.StatusBadGateway, "The account could not be created. Try again shortly.")
		return
	}

	if err := s.keycloak.assignRealmRole(r.Context(), id, role); err != nil {
		// The account exists without a role, which grants nothing. Say so
		// plainly rather than reporting a generic failure that leaves the
		// manager unsure whether to try again.
		s.log.Error("role assignment failed", slog.String("user_id", id), slog.String("error", err.Error()))
		httpx.Problem(w, http.StatusBadGateway,
			"The account was created but the role was not assigned, so it currently has no access. Disable the account and create it again.")
		return
	}

	// The password is never logged and never recorded in the audit detail.
	if err := s.audit.record(r.Context(), auditEntry{
		ActorID: actor.ID, ActorUsername: actor.Username,
		Action: "user.created", EntityType: "user", EntityID: id,
		Detail: map[string]any{"username": username, "role": req.Role},
	}); err != nil {
		s.log.Error("audit write failed", slog.String("error", err.Error()))
	}

	s.log.Info("account created",
		slog.String("actor", actor.Username),
		slog.String("username", username),
		slog.String("role", req.Role),
	)

	httpx.JSON(w, http.StatusCreated, userView{
		ID: id, Username: username,
		Name:      strings.TrimSpace(req.FirstName + " " + req.LastName),
		Email:     username,
		Role:      req.Role,
		RoleLabel: roleLabel(req.Role),
		Enabled:   true,
		CreatedAt: time.Now(),
	})
}

func (s *service) handleSetEnabled(enabled bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := auth.RequireRoleCtx(r.Context(), auth.RoleManager); err != nil {
			httpx.Problem(w, http.StatusForbidden, "Only the manager can administer accounts.")
			return
		}
		actor, _ := auth.SubjectFrom(r.Context())
		id := chi.URLParam(r, "id")

		if id == actor.ID {
			httpx.Problem(w, http.StatusBadRequest,
				"You cannot disable your own account. Ask another manager to do it.")
			return
		}

		if err := s.keycloak.setEnabled(r.Context(), id, enabled); err != nil {
			s.log.Error("enable/disable failed", slog.String("user_id", id), slog.String("error", err.Error()))
			httpx.Problem(w, http.StatusBadGateway, "The account could not be updated. Try again shortly.")
			return
		}

		action := "user.disabled"
		if enabled {
			action = "user.enabled"
		}
		if err := s.audit.record(r.Context(), auditEntry{
			ActorID: actor.ID, ActorUsername: actor.Username,
			Action: action, EntityType: "user", EntityID: id,
		}); err != nil {
			s.log.Error("audit write failed", slog.String("error", err.Error()))
		}

		httpx.JSON(w, http.StatusOK, map[string]any{"id": id, "enabled": enabled})
	}
}

func validateCreate(req createUserRequest) error {
	if strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.LastName) == "" {
		return errors.New("Enter both a first name and a last name.")
	}
	if _, err := mail.ParseAddress(strings.TrimSpace(req.Email)); err != nil {
		return errors.New("Enter a valid email address, for example name@kiiramotors.com.")
	}
	if !isAssignable(req.Role) {
		return errors.New("Choose either Health and Wellness Officer or Director.")
	}
	if err := checkPassword(req.TemporaryPassword); err != nil {
		return err
	}
	return nil
}

// checkPassword states the rule rather than reporting that the value failed
// it, per NFR-USE-03. Keycloak enforces the realm policy as well; this exists
// so the manager is told before the request leaves the browser.
func checkPassword(p string) error {
	if len([]rune(p)) < 12 {
		return errors.New("Enter a temporary password of at least 12 characters.")
	}
	var hasLetter, hasDigit bool
	for _, r := range p {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return errors.New("Include at least one letter and one digit in the temporary password.")
	}
	return nil
}

func isAssignable(role string) bool {
	for _, r := range assignableRoles {
		if r.Value == role {
			return true
		}
	}
	return false
}

func roleLabel(role string) string {
	for _, r := range assignableRoles {
		if r.Value == role {
			return r.Label
		}
	}
	if role == auth.RoleManager {
		return "Manager"
	}
	return role
}

func firstHWMSRole(roles []realmRole) string {
	for _, r := range roles {
		switch r.Name {
		case auth.RoleOfficer, auth.RoleManager, auth.RoleDirector:
			return r.Name
		}
	}
	return ""
}
