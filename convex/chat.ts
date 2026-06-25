import { mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// Helper function to resolve user by email or ID string
async function getConvexUser(ctx: QueryCtx, email?: string, userId?: string) {
  if (userId) {
    const parsedId = ctx.db.normalizeId("users", userId);
    if (parsedId) {
      const user = await ctx.db.get(parsedId);
      if (user) return user._id;
    }
  }
  if (email) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (user) return user._id;
  }
  throw new Error("User not found");
}

export const insertMessage = mutation({
  args: {
    chatId: v.string(),
    role: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const chatId = ctx.db.normalizeId("chats", args.chatId);
    if (!chatId) {
      throw new Error(`Invalid chatId: ${args.chatId}`);
    }

    const messageId = await ctx.db.insert("chatMessages", {
      chatId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
    });
    return messageId;
  },
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
    steps: v.any(),
  },
  handler: async (ctx, args) => {
    const userDbId = await getConvexUser(ctx, args.userEmail, args.userId);

    let originalChatId = undefined;
    if (args.originalChatId) {
      originalChatId = ctx.db.normalizeId("chats", args.originalChatId) ?? undefined;
    }

    const recipeId = await ctx.db.insert("recipes", {
      userId: userDbId,
      originalChatId,
      title: args.title,
      language: args.language,
      statusText: args.statusText,
      currentStep: args.currentStep,
      steps: args.steps,
      updatedAt: Date.now(),
    });
    return recipeId;
  },
});
