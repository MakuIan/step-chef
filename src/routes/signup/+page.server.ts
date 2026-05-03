import type { Actions } from './$types';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { fail, redirect } from '@sveltejs/kit';
import { localizeHref } from '$lib/paraglide/runtime';

export const actions: Actions = {
	register: async ({ cookies, request, url }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll() {
					return cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		});

		const { data: authData, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${url.origin}/auth/confirm`
			}
		});

		if (authError) {
			console.error('Registration error:', authError);
			return fail(400, { error: authError.message });
		}

		throw redirect(303, localizeHref('/waiting_for_email_confirmation'));
	}
};
