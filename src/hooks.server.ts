import { redirect, type Handle } from '@sveltejs/kit';
import { getTextDirection, localizeHref } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../convex/_generated/api';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	const isAuthApi = event.url.pathname.startsWith('/api/auth');

	// If it is the auth API, let the proxy handle it
	if (isAuthApi) {
		return resolve(event);
	}

	const sessionToken = event.cookies.get('better-auth.session_token');
	let session = null;

	if (sessionToken) {
		try {
			session = await convex.query(api.auth.getSession, { sessionToken });
		} catch (error) {
			console.error('Failed to retrieve session from Convex:', error);
		}
	}

	event.locals.user = session?.user || null;
	event.locals.session = session?.session || null;

	const isPublicRoute = /^\/([a-z]{2}\/)?(login|signup|waiting_for_email_confirmation)/.test(
		event.url.pathname
	);

	if (!session && !isPublicRoute) {
		throw redirect(303, localizeHref('/login'));
	}

	const isHomeRoute = /^\/([a-z]{2}\/)?$/.test(event.url.pathname);

	if (session && (isPublicRoute || isHomeRoute)) {
		throw redirect(303, localizeHref('/dashboard'));
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleAuth);
