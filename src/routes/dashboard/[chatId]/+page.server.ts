import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { localizeHref } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';
import { error } from 'console';

export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw redirect(300, localizeHref('/login'));
	}

	const { data: chat, error: chatMessagesError } = await supabase
		.from('chat_messages')
		.select('*')
		.eq('id', params.chatId)
		.single();

	if (chatMessagesError) {
		console.error('Failed to fetch chat messages:', params.chatId, chatMessagesError);
		throw error(404, 'Chat not found');
	}

	return {
		chat: chat ?? null,

		chatMessagesError: chatMessagesError ? m['fetch_errors.chat_messages_fetch_error']() : null
	};
};
