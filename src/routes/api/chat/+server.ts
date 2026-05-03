import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '$env/dynamic/private';
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { localizeHref } from '$lib/paraglide/runtime';
import { z } from 'zod';
import { streamText, tool } from 'ai';

const google = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_API_KEY
});

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const { messages, language } = (await request.json()) as {
		messages: any[];
		language: 'de' | 'en';
	};

	const languageInstruction =
		language === 'de'
			? 'Antworte IMMER auf Deutsch. Alle Rezepttitel, Beschreibungen und Zutaten müssen in deutscher Sprache sein.'
			: 'Always respond in English. All recipe titles, descriptions, and ingredients must be in English.';

	const result = streamText({
		model: google('gemini-3.1-flash-lite-preview'),
		messages,
		system: `Du bist ein professioneller, aber freundlicher Familien-Koch für die App 'Step-Chef'. 
				${languageInstruction}
                 Wenn der User nach etwas zu essen fragt oder Zutaten/Bilder schickt, 
                 MUSST du das Tool 'suggest_recipes' nutzen, um 1 bis 3 Rezeptvorschläge zu machen.`,
		tools: {
			suggest_recipes: tool({
				description:
					'Schlägt 1 bis 3 Rezepte basierend auf den Zutaten oder Wünschen des Users vor.',
				// @ts-expect-error
				parameters: z.object({
					recipes: z
						.array(
							z.object({
								title: z.string().describe('Der Name des Rezepts'),
								prepTimeMinutes: z.number().describe('Die geschätzte Dauer in Minuten'),
								difficulty: z.enum(['easy', 'medium', 'hard']).describe('Schwierigkeitsgrad'),
								description: z
									.string()
									.describe('Eine kurze Beschreibung des Gerichts (1-2 Sätze)'),
								zutaten: z
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
		}
	});

	return result.toTextStreamResponse();
};
