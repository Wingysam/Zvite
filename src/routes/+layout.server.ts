import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	const isRsvpPage = url.pathname.startsWith('/rsvp/');
	return {
		user: locals.user,
		showChrome: !isRsvpPage
	};
};
