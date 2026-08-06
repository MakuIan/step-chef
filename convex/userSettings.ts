import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getUserSettings = query({
	args: {
		email: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_email', (q) => q.eq('email', args.email))
			.first();

		if (!user) {
			return null;
		}

		const settings = await ctx.db
			.query('userSettings')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.first();

		return settings;
	}
});

export const saveUserSettings = mutation({
	args: {
		email: v.string(),
		stoveMaxLevel: v.number(),
		stoveType: v.string(),
		availableCookware: v.array(v.string()),
		enabledEquipments: v.array(v.string()),
		openrouterApiKey: v.optional(v.string()),
		geminiApiKey: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		let user = await ctx.db
			.query('users')
			.withIndex('by_email', (q) => q.eq('email', args.email))
			.first();

		if (!user) {
			const newUserId = await ctx.db.insert('users', {
				email: args.email,
				name: args.email.split('@')[0]
			});
			user = await ctx.db.get(newUserId);
		}

		if (!user) throw new Error('User not found');

		const existingSettings = await ctx.db
			.query('userSettings')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.first();

		if (existingSettings) {
			await ctx.db.patch(existingSettings._id, {
				stoveMaxLevel: args.stoveMaxLevel,
				stoveType: args.stoveType,
				availableCookware: args.availableCookware,
				enabledEquipments: args.enabledEquipments,
				openrouterApiKey: args.openrouterApiKey,
				geminiApiKey: args.geminiApiKey,
				updatedAt: Date.now()
			});
			return existingSettings._id;
		}

		const newSettingsId = await ctx.db.insert('userSettings', {
			userId: user._id,
			stoveMaxLevel: args.stoveMaxLevel,
			stoveType: args.stoveType,
			availableCookware: args.availableCookware,
			enabledEquipments: args.enabledEquipments,
			openrouterApiKey: args.openrouterApiKey,
			geminiApiKey: args.geminiApiKey,
			updatedAt: Date.now()
		});

		return newSettingsId;
	}
});
