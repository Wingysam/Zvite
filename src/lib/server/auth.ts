import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
	const [salt, hashHex] = storedHash.split(':');
	if (!salt || !hashHex) {
		return false;
	}

	const derived = scryptSync(password, salt, KEY_LENGTH);
	const stored = Buffer.from(hashHex, 'hex');
	if (stored.length !== derived.length) {
		return false;
	}

	return timingSafeEqual(derived, stored);
}
