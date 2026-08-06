import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_API_KEY, OPENROUTER_API_KEY } from '$env/static/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { type RequestHandler } from '@sveltejs/kit';
import { suggestRecipesInputSchema, fullRecipeInputSchema } from '$lib/schemas';
import { cleanRecipeText } from '$lib/utils';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { DEFAULT_MODEL_ID, type ModelId } from '$lib/models';

const google = createGoogleGenerativeAI({
	apiKey: GOOGLE_API_KEY
});
const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });

const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	console.log('🚀 API Route /api/chat wurde aufgerufen!');

	if (!user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const {
		messages,
		language,
		chatId,
		model = DEFAULT_MODEL_ID
	}: { messages: UIMessage[]; language: 'de' | 'en'; chatId: string; model?: ModelId | string } = await request.json();

	const latestMessage = messages[messages.length - 1];
	if (latestMessage && latestMessage.role === 'user') {
		let extractedContent = '';
		if (latestMessage.parts && latestMessage.parts.length > 0) {
			const textPart = latestMessage.parts.find((p: any) => p.type === 'text');
			if (textPart && textPart.type === 'text') extractedContent = textPart.text;
		}
		if (!extractedContent) {
			// @ts-expect-error - Fallback mapping
			extractedContent = latestMessage.content || latestMessage.text || '';
		}
		try {
			// Prevent duplicate insertion (e.g., initial chat message or fast double click)
			const existingMessages = await convex.query(api.chat.getMessages, { chatId });
			const isDuplicate = existingMessages.some(
				(m) => m.role === 'user' && m.content.trim() === extractedContent.trim()
			);

			if (!isDuplicate) {
				await convex.mutation(api.chat.insertMessage, {
					chatId,
					role: 'user',
					content: extractedContent
				});
			}
		} catch (insertError) {
			console.error('Failed to save user message:', insertError);
		}
	}

	const languageInstruction =
		language === 'de'
			? 'Antworte IMMER auf Deutsch. Alle Rezepttitel, Beschreibungen und Zutaten müssen in deutscher Sprache sein.'
			: 'Always respond in English. All recipe titles, descriptions, and ingredients must be in English.';

	function getModelInstance(requestedModel: string) {
		if (requestedModel.includes('/') || requestedModel.includes('openrouter')) {
			return openrouter(requestedModel);
		}
		return google(requestedModel || 'gemini-3.5-flash-lite');
	}

	try {
		const result = streamText({
			model: getModelInstance(model),
			messages: await convertToModelMessages(messages),
			stopWhen: (event) => event.steps.length >= 5,
			system: `Du bist ein professioneller, aber freundlicher Familien-Koch für die App 'Step-Chef'. 
					WICHTIG: Wenn der User nach Rezepten fragt, DARFST DU DIE REZEPTE ODER ZUTATEN NIEMALS ALS TEXT AUFLISTEN!
					Der Text-Teil deiner Antwort darf IMMER nur eine extrem kurze Einleitung sein.
					${languageInstruction}
					 Wenn der User nach etwas zu essen fragt, MUSST du das Tool 'suggest_recipes' nutzen, um 1 bis 3 Rezeptvorschläge zu machen.
					 WICHTIG FÜR REZEPTE:
					- Nutze immer Mengenangaben, Minuten und Herdstufen (dein Herd hat 1-9 Stufen).
					- Gib immer die Art des Kochgeschirrs an (z.B. Wok, beschichtete Pfanne) und ob ein Deckel genutzt wird.
					- Wenn der User ein Rezept auswählt, MUSST DU ZWINGEND das Tool 'provide_full_recipe' aufrufen! Schreibe die Details niemals als einfachen Chat-Text.
					- STRIKTES VERBOT: Wenn du 'provide_full_recipe' aufrufst, DARFST DU DANACH KEINE Zutatenlisten, Herdstufen, Schritte, Tabellen oder Rezepttexte als Chat-Text generieren! Das Rezept wird ausschließlich über das Tool als interaktive UI angezeigt. Schreibe nach dem Tool-Aufruf NUR einen kurzen Satz (z.B. 'Viel Spaß beim Kochen! 🥢'). Generiere KEINE Trennlinien (---), Überschriften (###) oder Listen als Text!`,
			toolChoice: 'auto',
			tools: {
				suggest_recipes: tool({
					description:
						'Schlägt 1 bis 3 Rezepte basierend auf den Zutaten oder Wünschen des Users vor.',
					inputSchema: suggestRecipesInputSchema,
					execute: async () => ({ status: 'success', message: 'Rezepte wurden dem User angezeigt' })
				}),
				provide_full_recipe: tool({
					description: 'Gibt das detaillierte Rezept mit Einzelschritten aus.',
					inputSchema: fullRecipeInputSchema,
					execute: async (args) => {
						try {
							await convex.mutation(api.chat.insertRecipe, {
								userId: user.id,
								userEmail: user.email,
								originalChatId: chatId,
								title: args.title,
								language: language,
								statusText: 'Erstellt',
								currentStep: 0,
								steps: args.steps
							});
						} catch (recipeError) {
							console.log('DB Insert Error (recipes table via Convex):', recipeError);
						}
						return { status: 'success', message: 'Rezept wurde geladen und in DB gespeichert' };
					}
				})
			},
			async onFinish(result) {
				const { text, toolCalls, steps } = result;
				const allToolCalls = steps ? steps.flatMap((step) => step.toolCalls) : toolCalls || [];
				const isFullRecipe = allToolCalls?.some((tc) => tc.toolName === 'provide_full_recipe');

				let contentToSave = text;
				if (isFullRecipe) {
					contentToSave = cleanRecipeText(text) || 'Viel Spaß beim Kochen! 🥢';
				} else if (contentToSave) {
					contentToSave = cleanRecipeText(contentToSave);
				}

				if (!contentToSave) {
					contentToSave =
						allToolCalls?.[0]?.toolName === 'suggest_recipes'
							? 'Vorschläge generiert'
							: 'Rezept erstellt';
				}

				try {
					await convex.mutation(api.chat.insertMessage, {
						chatId,
						role: 'assistant',
						content: contentToSave,
						metadata: { toolCalls: allToolCalls }
					});
				} catch (err) {
					console.error('Failed to save assistant message:', err);
				}
			}
		});

		return result.toUIMessageStreamResponse();
	} catch (err: any) {
		console.error('🚀 Error in /api/chat streamText:', err);
		return new Response(
			JSON.stringify({
				error: err?.message || 'Quota exceeded or AI API Error',
				code: err?.status || 429
			}),
			{
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
