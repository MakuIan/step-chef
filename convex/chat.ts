import { mutation, query } from './_generated/server';
import type { QueryCtx } from './_generated/server';
import { v } from 'convex/values';

// Helper function to resolve user by email or ID string
async function getConvexUser(ctx: QueryCtx, email?: string, userId?: string) {
	if (userId) {
		const parsedId = ctx.db.normalizeId('users', userId);
		if (parsedId) {
			const user = await ctx.db.get(parsedId);
			if (user) return user._id;
		}
	}
	if (email) {
		const user = await ctx.db
			.query('users')
			.withIndex('by_email', (q) => q.eq('email', email))
			.first();
		if (user) return user._id;
	}
	throw new Error('User not found');
}

// Helper function for mutations to get or lazily create a Convex user by email
async function getOrCreateConvexUser(ctx: any, email: string, name?: string) {
	const user = await ctx.db
		.query('users')
		.withIndex('by_email', (q: any) => q.eq('email', email))
		.first();
	if (user) return user._id;

	const newUserDbId = await ctx.db.insert('users', {
		email,
		name: name || email.split('@')[0]
	});
	return newUserDbId;
}

export const insertMessage = mutation({
	args: {
		chatId: v.string(),
		role: v.string(),
		content: v.string(),
		metadata: v.optional(v.any())
	},
	handler: async (ctx, args) => {
		const chatId = ctx.db.normalizeId('chats', args.chatId);
		if (!chatId) {
			throw new Error(`Invalid chatId: ${args.chatId}`);
		}

		const messageId = await ctx.db.insert('chatMessages', {
			chatId,
			role: args.role,
			content: args.content,
			metadata: args.metadata ?? {}
		});
		return messageId;
	}
});

// Alias to support either casing
export const insertmessage = insertMessage;

export const insertRecipe = mutation({
	args: {
		userId: v.optional(v.string()),
		userEmail: v.optional(v.string()),
		originalChatId: v.optional(v.string()),
		title: v.string(),
		language: v.string(),
		statusText: v.string(),
		currentStep: v.number(),
		steps: v.any()
	},
	handler: async (ctx, args) => {
		const userDbId = args.userEmail
			? await getOrCreateConvexUser(ctx, args.userEmail)
			: await getConvexUser(ctx, undefined, args.userId);

		let originalChatId = undefined;
		if (args.originalChatId) {
			originalChatId = ctx.db.normalizeId('chats', args.originalChatId) ?? undefined;
		}

		if (originalChatId) {
			const existingRecipe = await ctx.db
				.query('recipes')
				.withIndex('by_original_chat_id', (q) => q.eq('originalChatId', originalChatId))
				.first();

			if (existingRecipe) {
				await ctx.db.patch(existingRecipe._id, {
					title: args.title,
					language: args.language,
					statusText: args.statusText,
					currentStep: args.currentStep,
					steps: args.steps,
					updatedAt: Date.now()
				});
				return existingRecipe._id;
			}
		}

		const recipeId = await ctx.db.insert('recipes', {
			userId: userDbId,
			originalChatId: originalChatId,
			title: args.title,
			language: args.language,
			statusText: args.statusText,
			currentStep: args.currentStep,
			steps: args.steps,
			updatedAt: Date.now()
		});
		return recipeId;
	}
});

export const getChatsForUser = query({
	args: {
		email: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_email', (q) => q.eq('email', args.email))
			.first();
		if (!user) {
			return [];
		}
		return await ctx.db
			.query('chats')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.collect();
	}
});

export const createChat = mutation({
	args: {
		email: v.string(),
		title: v.string(),
		initialMessage: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const userDbId = await getOrCreateConvexUser(ctx, args.email);
		const chatId = await ctx.db.insert('chats', {
			userId: userDbId,
			title: args.title
		});
		if (args.initialMessage) {
			await ctx.db.insert('chatMessages', {
				chatId,
				role: 'user',
				content: args.initialMessage,
				metadata: {}
			});
		}
		return chatId;
	}
});

export const getMessages = query({
	args: {
		chatId: v.string()
	},
	handler: async (ctx, args) => {
		const chatDbId = ctx.db.normalizeId('chats', args.chatId);
		if (!chatDbId) {
			return [];
		}
		return await ctx.db
			.query('chatMessages')
			.withIndex('by_chat_id', (q) => q.eq('chatId', chatDbId))
			.collect();
	}
});

export const getActiveRecipe = query({
	args: {
		chatId: v.string()
	},
	handler: async (ctx, args) => {
		const chatDbId = ctx.db.normalizeId('chats', args.chatId);
		if (!chatDbId) {
			return null;
		}
		const recipe = await ctx.db
			.query('recipes')
			.withIndex('by_original_chat_id', (q) => q.eq('originalChatId', chatDbId))
			.order('desc')
			.first();
		return recipe;
	}
});

export const updateRecipe = mutation({
	args: {
		recipeId: v.string(),
		currentStep: v.optional(v.number()),
		activeTimerEndsAt: v.optional(v.union(v.string(), v.null())),
		timerRemainingSeconds: v.optional(v.union(v.number(), v.null())),
		timerStatus: v.optional(v.union(v.string(), v.null()))
	},
	handler: async (ctx, args) => {
		const recipeId = ctx.db.normalizeId('recipes', args.recipeId);
		if (!recipeId) {
			throw new Error(`Invalid recipeId: ${args.recipeId}`);
		}
		const updates: any = { updatedAt: Date.now() };
		if (args.currentStep !== undefined) {
			updates.currentStep = args.currentStep;
		}
		if (args.activeTimerEndsAt !== undefined) {
			updates.activeTimerEndsAt = args.activeTimerEndsAt ?? undefined;
		}
		if (args.timerRemainingSeconds !== undefined) {
			updates.timerRemainingSeconds = args.timerRemainingSeconds ?? undefined;
		}
		if (args.timerStatus !== undefined) {
			updates.timerStatus = args.timerStatus ?? undefined;
		}
		await ctx.db.patch(recipeId, updates);
	}
});

/**
 * Updates the title of an existing chat session.
 */
export const updateTitle = mutation({
	args: {
		chatId: v.id('chats'),
		title: v.string()
	},
	handler: async (ctx, args) => {
		const trimmedTitle = args.title.trim();
		if (!trimmedTitle) {
			throw new Error('Chat title cannot be empty');
		}

		await ctx.db.patch(args.chatId, { title: trimmedTitle });
		return { success: true };
	}
});

/**
 * Deletes a chat session from the database along with its messages and recipes.
 */
export const deleteChat = mutation({
	args: {
		chatId: v.id('chats')
	},
	handler: async (ctx, args) => {
		// Fetch the chat to ensure it exists before trying to delete
		const chat = await ctx.db.get(args.chatId);
		if (!chat) {
			throw new Error('Chat not found');
		}

		// 1. Delete all associated messages
		const messages = await ctx.db
			.query('chatMessages')
			.withIndex('by_chat_id', (q) => q.eq('chatId', args.chatId))
			.collect();
		for (const msg of messages) {
			await ctx.db.delete(msg._id);
		}

		// 2. Delete all associated recipes
		const recipes = await ctx.db
			.query('recipes')
			.withIndex('by_original_chat_id', (q) => q.eq('originalChatId', args.chatId))
			.collect();
		for (const recipe of recipes) {
			await ctx.db.delete(recipe._id);
		}

		// 3. Delete the chat record itself
		await ctx.db.delete(args.chatId);
		return { success: true };
	}
});

/**
 * Utility mutation to purge orphaned chatMessages and recipes left behind by past chat deletions.
 */
export const cleanupOrphanedData = mutation({
	args: {},
	handler: async (ctx) => {
		const chats = await ctx.db.query('chats').collect();
		const validChatIds = new Set(chats.map((c) => c._id));

		const messages = await ctx.db.query('chatMessages').collect();
		let deletedMessagesCount = 0;
		const seenMessages = new Set<string>();

		for (const msg of messages) {
			if (!validChatIds.has(msg.chatId)) {
				await ctx.db.delete(msg._id);
				deletedMessagesCount++;
				continue;
			}
			const key = `${msg.chatId}:${msg.role}:${msg.content.trim()}`;
			if (seenMessages.has(key)) {
				await ctx.db.delete(msg._id);
				deletedMessagesCount++;
			} else {
				seenMessages.add(key);
			}
		}

		const recipes = await ctx.db.query('recipes').collect();
		let deletedRecipesCount = 0;
		const seenRecipes = new Set<string>();

		for (const recipe of recipes) {
			if (recipe.originalChatId && !validChatIds.has(recipe.originalChatId)) {
				await ctx.db.delete(recipe._id);
				deletedRecipesCount++;
				continue;
			}
			const key = `${recipe.originalChatId}:${recipe.title.trim()}`;
			if (seenRecipes.has(key)) {
				await ctx.db.delete(recipe._id);
				deletedRecipesCount++;
			} else {
				seenRecipes.add(key);
			}
		}

		return {
			deletedMessagesCount,
			deletedRecipesCount
		};
	}
});
