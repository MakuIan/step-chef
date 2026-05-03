import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { RequestHandler } from './$types';
import { localizeHref } from '$lib/paraglide/runtime';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll() {
					return cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						console.log(name, value, options);
						cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		});

		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			throw redirect(303, localizeHref('/dashboard'));
		} else {
			console.error('Session exchange error:', error);
		}
	}

	throw redirect(303, localizeHref('/login'));
};
