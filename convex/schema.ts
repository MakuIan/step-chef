import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table to sync with Better Auth
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // 1. Chats Table (formerly 'chats')
  chats: defineTable({
    title: v.string(),
    userId: v.id("users"),
  }).index("by_user_id", ["userId"]),

  // 2. Chat Messages Table (formerly 'chat_messages')
  chatMessages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    imageUrls: v.optional(v.array(v.string())),
    metadata: v.any(), // Flexible JSON metadata
    role: v.string(), // e.g. "user", "assistant"
  }).index("by_chat_id", ["chatId"]),

  // 3. Recipes Table (formerly 'recipes')
  recipes: defineTable({
    title: v.string(),
    userId: v.id("users"),
    currentStep: v.number(),
    statusText: v.string(),
    language: v.string(),
    steps: v.any(), // RecipeStep[] from the app
    activeTimerEndsAt: v.optional(v.string()),
    originalChatId: v.optional(v.id("chats")),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_original_chat_id", ["originalChatId"]),
});
