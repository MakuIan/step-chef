import type { Actions } from './$types';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const actions: Actions = {
	login: async ({ cookies, request }) => {
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
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
			email: email,
			password: password
		});

		if (authError) {
			console.error('Login error:', authError);
			return { success: false, error: authError.message };
		}

		return { success: true, data: authData };
	},
	register: async ({ cookies, request }) => {
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
				emailRedirectTo: '/dashboard'
			}
		});

		if (authError) {
			console.error('Registration error:', authError);
			return { success: false, error: authError.message };
		}

		return { success: true, data: authData };
	}
};
