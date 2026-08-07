// Package migrate applies versioned SQL migrations held in the repository.
//
// Migrations are versioned, forward-only files in source control, per
// NFR-MNT-03. This runner is deliberately small: it records what it has
// applied and refuses to apply anything twice. When the schema grows beyond
// what one team can hold in mind, replace it with golang-migrate, which the
// file naming convention here is already compatible with.
package migrate

import (
	"context"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Apply runs every *.up.sql file in dir, in lexical order, that has not
// already been recorded.
func Apply(ctx context.Context, pool *pgxpool.Pool, files fs.FS, dir string) ([]string, error) {
	if _, err := pool.Exec(ctx, `
		create table if not exists schema_migrations (
			version     text primary key,
			applied_at  timestamptz not null default now()
		)`); err != nil {
		return nil, fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(files, dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	var applied []string
	for _, name := range names {
		version := strings.TrimSuffix(name, ".up.sql")

		var exists bool
		if err := pool.QueryRow(ctx,
			`select exists (select 1 from schema_migrations where version = $1)`, version,
		).Scan(&exists); err != nil {
			return applied, fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists {
			continue
		}

		body, err := fs.ReadFile(files, path.Join(dir, name))
		if err != nil {
			return applied, fmt.Errorf("read %s: %w", name, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return applied, fmt.Errorf("begin %s: %w", version, err)
		}
		if _, err := tx.Exec(ctx, string(body)); err != nil {
			_ = tx.Rollback(ctx)
			return applied, fmt.Errorf("apply %s: %w", version, err)
		}
		if _, err := tx.Exec(ctx,
			`insert into schema_migrations (version) values ($1)`, version,
		); err != nil {
			_ = tx.Rollback(ctx)
			return applied, fmt.Errorf("record %s: %w", version, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return applied, fmt.Errorf("commit %s: %w", version, err)
		}
		applied = append(applied, version)
	}
	return applied, nil
}
