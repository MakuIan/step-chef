import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_API_KEY } from '$env/static/private';
import { type RequestHandler } from '@sveltejs/kit';
import { suggestRecipesInputSchema, fullRecipeInputSchema } from '$lib/schemas.ts';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai';
import type { Json } from '$lib/database.types';

const google = createGoogleGenerativeAI({
	apiKey: GOOGLE_API_KEY
});

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	console.log('🚀 API Route /api/chat wurde aufgerufen!');
	const { user } = await safeGetSession();

	if (!user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const {
		messages,
		language,
		chatId
	}: { messages: UIMessage[]; language: 'de' | 'en'; chatId: string } = await request.json();

	const latestMessage = messages[messages.length - 1];
	if (latestMessage && latestMessage.role === 'user') {
		let extractedContent = '';
		if (latestMessage.parts && latestMessage.parts.length > 0) {
			const textPart = latestMessage.parts.find((p: any) => p.type === 'text');
			if (textPart) extractedContent = textPart.text;
		}
		if (!extractedContent) {
			// @ts-expect-error - Fallback mapping
			extractedContent = latestMessage.content || latestMessage.text || '';
		}
		const { error: insertError } = await supabase.from('chat_messages').insert({
			chat_id: chatId,
			role: 'user',
			content: extractedContent
		});

		if (insertError) {
			console.error('Failed to save user message:', insertError);
		}
	}

	const languageInstruction =
		language === 'de'
			? 'Antworte IMMER auf Deutsch. Alle Rezepttitel, Beschreibungen und Zutaten müssen in deutscher Sprache sein.'
			: 'Always respond in English. All recipe titles, descriptions, and ingredients must be in English.';

	const result = streamText({
		model: google('gemini-3.1-flash-lite-preview'),
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
				- Wenn der User ein Rezept auswählt, MUSST DU ZWINGEND das Tool 'provide_full_recipe' aufrufen! Schreibe die Details niemals als einfachen Chat-Text.`,
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
					const { error: recipeError } = await supabase.from('recipes').insert({
						user_id: user.id,
						original_chat_id: chatId,
						title: args.title,
						language: language,
						status_text: 'Erstellt',
						current_step: 0,
						steps: args.steps as unknown as Json
					});
					if (recipeError) {
						console.log('DB Insert Error (recipes table):', recipeError);
					}
					return { status: 'success', message: 'Rezept wurde geladen und in DB gespeichert' };
				}
			})
		},
		async onFinish(result) {
			const { text, toolCalls, steps } = result;
			const allToolCalls = steps ? steps.flatMap((step) => step.toolCalls) : toolCalls || [];
			console.log('allToolCalls', allToolCalls);
			await supabase.from('chat_messages').insert({
				chat_id: chatId,
				role: 'assistant',
				content:
					text ||
					(allToolCalls?.[0]?.toolName === 'suggest_recipes'
						? 'Vorschläge generiert'
						: 'Rezept erstellt'),
				metadata: { toolCalls: allToolCalls as unknown as Json }
			});
		}
	});

	return result.toUIMessageStreamResponse();
};
