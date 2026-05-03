import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { EmailOtpType } from '@supabase/supabase-js';
import { localizeHref } from '$lib/paraglide/runtime';

export const GET: RequestHandler = async ({ url, locals }) => {
	const token_hash = url.searchParams.get('token_hash') as string;
	const type = url.searchParams.get('type') as EmailOtpType;

	if (token_hash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({
			token_hash,
			type
		});
		if (!error) {
			throw redirect(303, localizeHref('/dashboard'));
		} else {
			console.error('Verification error:', error);
		}
	}
	throw redirect(303, localizeHref('/login?error=invalid_link'));
};
