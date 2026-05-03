import { redirect, type Handle } from '@sveltejs/kit';
import { getTextDirection, localizeHref } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';

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
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = session?.user || null;

	const isPublicRoute = /^\/([a-z]{2}\/)?(login|signup|auth|waiting_for_email_confirmation)/.test(
		event.url.pathname
	);

	if (!session && !isPublicRoute) {
		throw redirect(303, localizeHref('/login'));
	}
	if (session && isPublicRoute && !event.url.pathname.startsWith('/auth/callback')) {
		throw redirect(303, localizeHref('/dashboard'));
	}
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

export const handle: Handle = sequence(handleParaglide, handleAuth);
