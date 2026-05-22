import { Database } from "bun:sqlite";

const dbPath = process.env.DB_PATH ?? "app.db";
const db = new Database(dbPath);

db.run("PRAGMA foreign_keys = ON;");

type Migration = {
  toVersion: number;
  up: () => void;
};

type DatabaseVersionRow = {
  database_version: number;
};

function tableExists(tableName: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )
    .get(tableName) as { name: string } | null;
  return row !== null;
}

function ensureMetadataTable(): void {
  db.run(`
		CREATE TABLE IF NOT EXISTS metadata (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			database_version INTEGER NOT NULL
		);
	`);
  db.run(
    "INSERT OR IGNORE INTO metadata (id, database_version) VALUES (1, 0);",
  );
}

function getCurrentDatabaseVersion(): number {
  if (!tableExists("metadata")) {
    return 0;
  }
  const row = db
    .prepare("SELECT database_version FROM metadata WHERE id = 1 LIMIT 1")
    .get() as DatabaseVersionRow | null;
  return row?.database_version ?? 0;
}

function setCurrentDatabaseVersion(version: number): void {
  db.run("UPDATE metadata SET database_version = ? WHERE id = 1;", [version]);
}

const migrations: Migration[] = [
  {
    toVersion: 1,
    up: () => {
      ensureMetadataTable();

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

      db.run(`
				CREATE TABLE IF NOT EXISTS invite_members (
					id TEXT PRIMARY KEY,
					invite_id TEXT NOT NULL,
					name TEXT NOT NULL,
					status TEXT CHECK(status IN ('Yes', 'Maybe', 'No', 'NoResponse')) DEFAULT 'NoResponse',
					FOREIGN KEY (invite_id) REFERENCES invites(id) ON DELETE CASCADE
				);
			`);

      // responded_at is added separately because pre-migration databases
      // (commit 1fe9eb1) already have the tables above but are missing this
      // column. The IF NOT EXISTS on the CREATE TABLEs no-ops for those
      // databases, and this ALTER TABLE adds the missing column. For fresh
      // databases, the table was just created without it, so this also works.
      db.run("ALTER TABLE invite_members ADD COLUMN responded_at INTEGER;");
    },
  },
];

function runMigrations(): void {
  let currentVersion = getCurrentDatabaseVersion();
  const orderedMigrations = [...migrations].sort(
    (a, b) => a.toVersion - b.toVersion,
  );

  for (const migration of orderedMigrations) {
    if (migration.toVersion <= currentVersion) {
      continue;
    }
    migration.up();
    setCurrentDatabaseVersion(migration.toVersion);
    currentVersion = migration.toVersion;
  }
}

runMigrations();

export default db;
