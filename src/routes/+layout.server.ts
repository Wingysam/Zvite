import type { LayoutServerLoad } from './$types';

const DISABLE_SIGNUPS = import.meta.env.DISABLE_SIGNUPS === 'true' ||
	(typeof process !== 'undefined' && process.env.DISABLE_SIGNUPS === 'true');

export const load: LayoutServerLoad = ({ locals, url }) => {
	const isRsvpPage = url.pathname.startsWith('/rsvp/');
	return {
		user: locals.user,
		showChrome: !isRsvpPage,
		signupsDisabled: DISABLE_SIGNUPS
	};
};
