import { localizeHref } from '$lib/paraglide/runtime';
import { redirect } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';
import type { LayoutServerLoad } from './$types';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const load: LayoutServerLoad = async ({ locals: { user } }) => {

	if (!user) {
		throw redirect(300, localizeHref('/login'));
	}

	try {
		const chats = await convex.query(api.chat.getChatsForUser, { email: user.email });
		
		return {
			chats: chats ?? [],
			chatsFetchError: null
		};
	} catch (error) {
		console.error('Failed to fetch chats for user:', user.id, error);
		return {
			chats: [],
			chatsFetchError: m['fetch_errors.chat_history_fetch_error']()
		};
	}
};
