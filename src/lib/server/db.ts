import { Database } from 'bun:sqlite';

const db = new Database('app.db');

db.run('PRAGMA foreign_keys = ON;');

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

type TableInfoRow = {
	name: string;
};

function hasColumn(tableName: string, columnName: string): boolean {
	const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as TableInfoRow[];
	return tableInfo.some((column) => column.name === columnName);
}

if (!hasColumn('invites', 'name')) {
	db.run("ALTER TABLE invites ADD COLUMN name TEXT NOT NULL DEFAULT 'General Invite';");
}

if (!hasColumn('invites', 'allow_self_add_names')) {
	db.run('ALTER TABLE invites ADD COLUMN allow_self_add_names INTEGER NOT NULL DEFAULT 0;');
}

export default db;
