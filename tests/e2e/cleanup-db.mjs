import { rmSync } from 'node:fs';

const dbPath = process.argv[2] ?? '/tmp/zvite-e2e.db';
rmSync(dbPath, { force: true });
