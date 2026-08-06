import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { localizeHref } from '$lib/paraglide/runtime';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const load: PageServerLoad = async ({ params, locals: { user } }) => {
	if (!user) {
		throw redirect(303, localizeHref('/login'));
	}

	try {
		const messages = await convex.query(api.chat.getMessages, { chatId: params.chatId });
		return {
			messages: messages ?? [],
			chatMessagesError: null
		};
	} catch (err) {
		console.error('Failed to fetch chat messages:', params.chatId, err);
		throw error(404, 'Chat not found');
	}
};
