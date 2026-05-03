import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	newChat: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) throw redirect(303, '/login');

		const formData = await request.formData();
		const initialMessage = formData.get('message') as string;

		if (!initialMessage) {
			return { error: 'Please enter a message' };
		}

		const { data: chat, error: chatError } = await supabase
			.from('chats')
			.insert({ user_id: user.id, title: 'Neues Rezept' })
			.select()
			.single();

		if (chatError || !chat) {
			return { error: 'Failed to create chat' };
		}

		const { error: msgError } = await supabase.from('chat_messages').insert({
			chat_id: chat.id,
			role: 'user',
			content: initialMessage
		});

		if (msgError) {
			return { error: 'Failed to save message' };
		}
		throw redirect(303, `/dashboard/${chat.id}?start=true`);
	}
} satisfies Actions;
