import { localizeHref } from '$lib/paraglide/runtime';
import { redirect } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw redirect(300, localizeHref('/login'));
	}

	const { data, error } = await supabase.from('chats').select('*').eq('user_id', user.id);

	if (error) {
		console.error('Failed to fetch chats for user:', user.id, error);
	}

	return {
		chats: data ?? [],
		chatsFetchError: error ? m['fetch_errors.chat_history_fetch_error']() : null
	};
};
