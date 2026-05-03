import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '$env/dynamic/private';
import { type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai';
import type { Json } from '$lib/database.types';

const google = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_API_KEY
});

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const {
		messages,
		language,
		chatId
	}: { messages: UIMessage[]; language: 'de' | 'en'; chatId: string } = await request.json();

	const languageInstruction =
		language === 'de'
			? 'Antworte IMMER auf Deutsch. Alle Rezepttitel, Beschreibungen und Zutaten müssen in deutscher Sprache sein.'
			: 'Always respond in English. All recipe titles, descriptions, and ingredients must be in English.';

	const result = streamText({
		model: google('gemini-2.5-flash'),
		messages: await convertToModelMessages(messages),
		system: `Du bist ein professioneller, aber freundlicher Familien-Koch für die App 'Step-Chef'. 
				${languageInstruction}
                 Wenn der User nach etwas zu essen fragt oder Zutaten/Bilder schickt, 
                 MUSST du das Tool 'suggest_recipes' nutzen, um 1 bis 3 Rezeptvorschläge zu machen.`,
		tools: {
			suggest_recipes: tool({
				description:
					'Schlägt 1 bis 3 Rezepte basierend auf den Zutaten oder Wünschen des Users vor.',
				inputSchema: z.object({
					recipes: z
						.array(
							z.object({
								title: z.string().describe('Der Name des Rezepts'),
								prepTimeMinutes: z.number().describe('Die geschätzte Dauer in Minuten'),
								difficulty: z.enum(['easy', 'medium', 'hard']).describe('Schwierigkeitsgrad'),
								description: z
									.string()
									.describe('Eine kurze Beschreibung des Gerichts (1-2 Sätze)'),
								ingredients: z
									.array(
										z.object({
											name: z.string().describe('Name der Zutat, z.B. Mehl'),
											menge: z.string().describe('Menge und Einheit, z.B. 500g oder 2 EL')
										})
									)
									.describe('Eine Liste der Hauptzutaten für die Rezeptvorschau')
							})
						)
						.min(1)
						.max(3)
				})
			})
		},
		async onFinish({ text, toolCalls }) {
			await supabase.from('chat_messages').insert({
				chat_id: chatId,
				role: 'assistant',
				content: text || 'Rezeptvorschläge generiert',
				metadata: { toolCalls: toolCalls as unknown as Json }
			});
		}
	});

	return result.toUIMessageStreamResponse();
};
