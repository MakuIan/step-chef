import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_API_KEY } from '$env/static/private';
import { type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
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

	const languageInstruction =
		language === 'de'
			? 'Antworte IMMER auf Deutsch. Alle Rezepttitel, Beschreibungen und Zutaten müssen in deutscher Sprache sein.'
			: 'Always respond in English. All recipe titles, descriptions, and ingredients must be in English.';

	const result = streamText({
		model: google('gemini-3.1-flash-lite-preview'),
		messages: await convertToModelMessages(messages),
		stopWhen: (event) => event.steps.length >= 5,
		system: `Du bist ein professioneller, aber freundlicher Familien-Koch für die App 'Step-Chef'. 
				Du MUSST zwingend das Tool 'suggest_recipes' aufrufen, um die Optionen bereitzustellen.
				WICHTIG: Wenn der User nach Rezepten fragt, DARFST DU DIE REZEPTE NICHT ALS TEXT AUFLISTEN.
				Der Text-Teil deiner Antwort sollte nur eine kurze, freundliche Einleitung sein.
				${languageInstruction}
                 Wenn der User nach etwas zu essen fragt oder Zutaten/Bilder schickt, 
				 Gib immer die Art des Kochgeschirrs an (z.B. Wok, beschichtete Pfanne) und ob ein Deckel genutzt wird.
                 MUSST du das Tool 'suggest_recipes' nutzen, um 1 bis 3 Rezeptvorschläge zu machen.
				 WICHTIG FÜR REZEPTE:
				- Nutze immer Mengenangaben, Minuten und Herdstufen (dein Herd hat 1-9 Stufen).
				- Gib immer die Art des Kochgeschirrs an (z.B. Wok, beschichtete Pfanne) und ob ein Deckel genutzt wird.
				- Wenn ein Rezept ausgewählt wurde, nutze das Tool 'provide_full_recipe'`,
		toolChoice: 'required',
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
				}),
				execute: async () => ({ status: 'success', message: 'Rezepte wurden dem User angezeigt' })
			}),
			provide_full_recipe: tool({
				description: 'Gibt das detaillierte Rezept mit Einzelschritten aus.',
				inputSchema: z.object({
					title: z.string(),
					ingredients: z.array(z.object({ name: z.string(), menge: z.string() })),
					steps: z.array(
						z.object({
							instruction: z.string(),
							timerMinutes: z.number().optional(),
							heatLevel: z.number().min(1).max(9).optional(),
							equipment: z.string(),
							hasLid: z.boolean()
						})
					)
				}),
				execute: async () => ({ status: 'success', message: 'Rezept wurde geladen' })
			})
		},
		async onFinish({ text, toolCalls }) {
			await supabase.from('chat_messages').insert({
				chat_id: chatId,
				role: 'assistant',
				content:
					text ||
					(toolCalls?.[0]?.toolName === 'suggest_recipes'
						? 'Vorschläge generiert'
						: 'Rezept erstellt'),
				metadata: { toolCalls: toolCalls as unknown as Json }
			});
		}
	});

	console.log('result', result);

	return result.toUIMessageStreamResponse();
};
