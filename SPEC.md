# System Specification: Minimalist RSVP Web Application

## 1. Tech Stack & Environment

* **Framework:** SvelteKit (latest stable, using standard routing).
* **Runtime & Package Manager:** Bun.
* **Database:** SQLite via the native, synchronous `bun:sqlite` module.
* **Styling:** Simple, clean CSS (Tailwind or semantic HTML framework like Pico.css is acceptable, but prioritize functionality).

---

## 2. Database Schema (`database.ts`)

Implement the database initialization script using `bun:sqlite`. You must create tables matching the provided ER diagram. Run this script on application startup if the database file (`app.db`) does not exist.

```typescript
import { Database } from "bun:sqlite";

const db = new Database("app.db");

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON;");

// 1. Users Table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

// 2. Organizations Table
db.run(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
`);

// 3. Organization Members Junction (M:N)
db.run(`
  CREATE TABLE IF NOT EXISTS organization_members (
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// 4. Parties Table
db.run(`
  CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  );
`);

// 5. Party Owners Junction (Handles Polymorphic Ownership via separate columns or resolving IDs)
db.run(`
  CREATE TABLE IF NOT EXISTS party_owners (
    party_id TEXT NOT NULL,
    owner_id TEXT NOT NULL, 
    owner_type TEXT CHECK(owner_type IN ('User', 'Organization')) NOT NULL,
    PRIMARY KEY (party_id, owner_id),
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
  );
`);

// 6. Invites Table
db.run(`
  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    party_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
  );
`);

// 7. Invite Members Table
db.run(`
  CREATE TABLE IF NOT EXISTS invite_members (
    id TEXT PRIMARY KEY,
    invite_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK(status IN ('Yes', 'Maybe', 'No', 'NoResponse')) DEFAULT 'NoResponse',
    FOREIGN KEY (invite_id) REFERENCES invites(id) ON DELETE CASCADE
  );
`);

export default db;

```

---

## 3. Architecture & Routing Map (SvelteKit)

All database mutations and queries must happen in server-side files (`+page.server.ts` or `+server.ts`).

### Authentication & Core Layout

* `/login` -> Simple email/password form. Sets a signed cookie session containing the `user_id`.
* `/register` -> Sign-up form creating records in the `users` table.

### Dashboard & Creation (Auth Required)

* `/dashboard` -> List all `parties` owned by the logged-in user or an organization they belong to.
* *Query logic:* Fetch parties where `party_owners.owner_id = current_user_id` OR `party_owners.owner_id` matches an `organization_id` where the user is a member.


* `/dashboard/new` -> Form to create a party. Includes a dropdown to choose the owner: "Myself" or an organization they manage. Automatically generates a baseline `invite` record and an accompanying unique 16-character alphanumeric `token` string.

### Manage Party (Owner Access Only)

* `/party/[partyId]` -> View party metrics, see everyone who responded grouped by status, and contains a form to add/remove names to the `invite_members` table.
* Displays the shareable Magic Link: `http://<domain>/rsvp/[token]`



### Public Magic Link RSVP (No Auth Required)

* `/rsvp/[token]` -> The core public entry point.
* *Server logic:* Look up the token in the `invites` table to find the associated `party` and all `invite_members`.
* *UI View:* Displays the party details. Shows a list of names allocated to this invite token. Next to each name, provide three distinct buttons: **Yes**, **Maybe**, and **No**. Submitting updates the `status` column for that specific `invite_member.id`.



---

## 4. Implementation Steps for the Agent

### Step 1: Base Setup

1. Scaffold a fresh SvelteKit project using Bun.
2. Create a utility file at `src/lib/server/db.ts` and paste the Database schema setup provided above. Import this into `src/hooks.server.ts` to guarantee initialization on startup.

### Step 2: Authentication Layer

1. Create a basic session checker mechanism in `src/hooks.server.ts` that reads a `session` cookie and populates `event.locals.user`.
2. Block access to `/dashboard` paths if `event.locals.user` is undefined.

### Step 3: Write SQLite Query Helpers

Implement synchronous helper queries inside a server utility file using Bun's `.prepare()` function:

```typescript
// Example pattern for bun:sqlite helper
export function getPartyByToken(token: string) {
  const query = db.prepare(`
    SELECT p.*, i.id as invite_id FROM invites i
    JOIN parties p ON i.party_id = p.id
    WHERE i.token = ?
  `);
  return query.get(token);
}

```

### Step 4: Build the Public RSVP Route (`/rsvp/[token]`)

1. Create `src/routes/rsvp/[token]/+page.server.ts`. The `load` function must fetch party details and all rows from `invite_members` matching the token.
2. Create standard form actions (`export const actions = { ... }`) to update member attendance statuses.
3. The frontend page component (`+page.svelte`) must be strictly reactive. It should display exactly three status buttons next to each name (**Yes**, **Maybe**, **No**). *Do not display a button for 'NoResponse'*; that is strictly a default backend state.

---

## 5. Explicit Constraints for the Agent

* **Do not use an external ORM** (such as Prisma or Drizzle). Utilize raw SQL strings inside `db.prepare().run()` or `db.prepare().get()`.
* **Use synchronous executions:** Bun's SQLite driver is synchronous. Do not use `await` on database operations.
* **Do not leak tokens:** The magic link tokens must remain hidden from other users. Never display an event's invite tokens on a public directory page. They should only be accessible on the owner dashboard and inside the matching invitation link.
* **Fail gracefully:** If a magic token is missing or malformed in `/rsvp/[token]`, throw a standard SvelteKit `error(404, 'Invitation not found')`.
