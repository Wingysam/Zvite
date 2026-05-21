#!/usr/bin/env node

/**
 * Creates a SQLite database matching the schema that existed at commit
 * 1fe9eb1e49ba37ff7936cb1fe6ea8ab97e6dcadb (before migrations were added).
 *
 * At that commit, the schema was:
 *   - All tables created directly in db.ts (no migration system)
 *   - invites already had name and allow_self_add_names columns
 *   - invite_members did NOT have responded_at column
 *   - No metadata table (no version tracking)
 *
 * When the app starts with this database, the migration system in db.ts
 * will detect version 0 (no metadata table) and apply Migration 1,
 * which adds the responded_at column and the metadata table.
 */

import { mkdirSync, unlinkSync } from "node:fs";
import { Database } from "bun:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { dirname } from "node:path";

const dbPath = process.argv[2];

if (!dbPath) {
  throw new Error("Expected database path as first argument");
}

mkdirSync(dirname(dbPath), { recursive: true });

// Remove any existing file first
try {
  unlinkSync(dbPath);
} catch {
  // ignore if not exists
}

const db = new Database(dbPath);
db.run("PRAGMA foreign_keys = ON;");

// === Schema matching commit 1fe9eb1 (pre-migration) ===

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS organization_members (
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS party_owners (
    party_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    owner_type TEXT CHECK(owner_type IN ('User', 'Organization')) NOT NULL,
    PRIMARY KEY (party_id, owner_id),
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
  );
`);

// At commit 1fe9eb1, invites already had name and allow_self_add_names
db.run(`
  CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    party_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'General Invite',
    allow_self_add_names INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
  );
`);

// At commit 1fe9eb1, invite_members did NOT have responded_at
db.run(`
  CREATE TABLE IF NOT EXISTS invite_members (
    id TEXT PRIMARY KEY,
    invite_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK(status IN ('Yes', 'Maybe', 'No', 'NoResponse')) DEFAULT 'NoResponse',
    FOREIGN KEY (invite_id) REFERENCES invites(id) ON DELETE CASCADE
  );
`);

// === Seed data ===

const USER_EMAIL = "migration-test@example.com";
const USER_PASSWORD = "e2e-migration-password";

// Generate deterministic password hash using the same crypto as auth.ts
const KEY_LENGTH = 64;
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(USER_PASSWORD, salt, KEY_LENGTH).toString("hex");
const passwordHash = `${salt}:${hash}`;

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PARTY_ID = "00000000-0000-4000-8000-000000000002";
const INVITE_ID = "00000000-0000-4000-8000-000000000003";
const MEMBER_ALICE_ID = "00000000-0000-4000-8000-000000000004";
const MEMBER_BOB_ID = "00000000-0000-4000-8000-000000000005";
const MEMBER_CHARLIE_ID = "00000000-0000-4000-8000-000000000006";
const TOKEN = "e2e-migration-token";

db.run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", [
  USER_ID,
  USER_EMAIL,
  passwordHash,
]);

db.run("INSERT INTO parties (id, name, description) VALUES (?, ?, ?)", [
  PARTY_ID,
  "Migration Test Party",
  "This party was created before the migration.",
]);

db.run(
  "INSERT INTO party_owners (party_id, owner_id, owner_type) VALUES (?, ?, ?)",
  [PARTY_ID, USER_ID, "User"],
);

// Insert invite with the columns that existed at commit 1fe9eb1
db.run(
  "INSERT INTO invites (id, party_id, token, name, allow_self_add_names) VALUES (?, ?, ?, ?, ?)",
  [INVITE_ID, PARTY_ID, TOKEN, "General Invite", 0],
);

// Insert invite members WITHOUT responded_at (didn't exist at commit 1fe9eb1)
// Alice: default status NoResponse
db.run(
  "INSERT INTO invite_members (id, invite_id, name, status) VALUES (?, ?, ?, ?)",
  [MEMBER_ALICE_ID, INVITE_ID, "Alice", "NoResponse"],
);

// Bob: Maybe
db.run(
  "INSERT INTO invite_members (id, invite_id, name, status) VALUES (?, ?, ?, ?)",
  [MEMBER_BOB_ID, INVITE_ID, "Bob", "Maybe"],
);

// Charlie: Yes
db.run(
  "INSERT INTO invite_members (id, invite_id, name, status) VALUES (?, ?, ?, ?)",
  [MEMBER_CHARLIE_ID, INVITE_ID, "Charlie", "Yes"],
);

console.log(`Seed database created at: ${dbPath}`);
console.log(`  Schema from commit 1fe9eb1e49ba37ff7936cb1fe6ea8ab97e6dcadb`);
console.log(`  User: ${USER_EMAIL} / ${USER_PASSWORD}`);
console.log(`  Party: "Migration Test Party"`);
console.log(`  Token: ${TOKEN}`);
console.log(`  Members: Alice (NoResponse), Bob (Maybe), Charlie (Yes)`);

db.close();
