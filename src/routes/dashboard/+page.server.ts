import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ConvexHttpClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../../convex/_generated/api';

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL.replace(/\/+$/, ''));

export const actions = {
	newChat: async ({ request, locals: { user } }) => {
		if (!user) throw redirect(303, '/login');

		const formData = await request.formData();
		const initialMessage = formData.get('message') as string;

		if (!initialMessage) {
			return { error: 'Please enter a message' };
		}

		let chatId: string;
		try {
			chatId = await convex.mutation(api.chat.createChat, {
				email: user.email,
				title: 'Neues Rezept',
				initialMessage
			});
		} catch (err) {
			console.error('Failed to create new chat:', err);
			return { error: 'Failed to create chat' };
		}

		throw redirect(303, `/dashboard/${chatId}?start=true`);
	}
} satisfies Actions;
