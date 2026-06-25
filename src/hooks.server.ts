import { redirect, type Handle } from '@sveltejs/kit';
import { getTextDirection, localizeHref } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

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
	// Retrieve user session
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.user = session?.user || null;
	event.locals.session = session?.session || null;

	const isAuthApi = event.url.pathname.startsWith('/api/auth');
	const isPublicRoute = /^\/([a-z]{2}\/)?(login|signup|waiting_for_email_confirmation)/.test(
		event.url.pathname
	);

	if (!session && !isPublicRoute && !isAuthApi) {
		throw redirect(303, localizeHref('/login'));
	}

	if (session && isPublicRoute) {
		throw redirect(303, localizeHref('/dashboard'));
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleParaglide, handleAuth);

