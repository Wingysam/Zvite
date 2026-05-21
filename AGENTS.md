# Agent Guidelines

Before finishing any task, ensure the following checks pass.

## Formatting

Run Prettier to format all changed files:

```sh
bun run format
```

Verify formatting is correct (useful in CI or before commit):

```sh
bun run format:check
```

## Type Checking

Run the Svelte type checker:

```sh
bun run check
```

## E2E Tests

### Run all e2e tests

```sh
bun run e2e
```

This runs the production build first, then starts a dev server using
`bun run dev`, runs the Playwright tests against it, and shuts the server
down. **Make sure no other process is already listening on port 4173**
before running.

### Project-specific e2e details

- **Test framework:** Playwright, configured in `playwright.config.ts`.
- **Test directory:** `tests/e2e/`
- **Database:** Each e2e run uses a fresh SQLite database at `.e2e/zvite-e2e.db`
  (controlled by `E2E_DB_PATH`), cleaned up automatically via
  `tests/e2e/cleanup-db.mjs` before the dev server starts.
- **Static assets:** The dev server is started with `E2E_STATIC_PATH` set to
  `tests/e2e/static`, which serves test-specific static files (e.g.,
  `barbeque.jpg` used in the main e2e test).
- **Tests run serially** (`workers: 1`, `fullyParallel: false`) and have a
  90-second timeout.
- There are two e2e specs:
  - `tests/e2e/app.spec.ts` — main flow: register, create party, invite
    guests, RSVP.
  - `tests/e2e/migration.spec.ts` — verifies database migration from a
    pre-migration schema. This test starts its **own** dev server on port
    4174 with a seed database, so it is safe to run alongside other tests
    that use port 4173.

## Summary checklist

Before wrapping up, confirm:

- [ ] `bun run format:check` passes
- [ ] `bun run check` passes
- [ ] `bun run build` succeeds
- [ ] `bun run e2e` passes
