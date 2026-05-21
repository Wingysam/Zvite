import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.argv[2];

if (!dbPath) {
	throw new Error('Expected e2e database path as first argument');
}

mkdirSync(dirname(dbPath), { recursive: true });
rmSync(dbPath, { force: true });
