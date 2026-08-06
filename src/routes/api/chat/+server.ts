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

	let userSettings = null;
	try {
		userSettings = await convex.query(api.userSettings.getUserSettings, { email: user.email });
	} catch (e) {
		console.error('Could not fetch user settings:', e);
	}

	const openrouterProvider = userSettings?.openrouterApiKey?.trim()
		? createOpenRouter({ apiKey: userSettings.openrouterApiKey.trim() })
		: openrouter;

	function getModelInstance(requestedModel: string) {
		if (requestedModel.includes('/') || requestedModel.includes('openrouter')) {
			return openrouterProvider(requestedModel);
		}
		return google(requestedModel || 'gemini-3.5-flash-lite');
	}

	const maxStoveLevel = userSettings?.stoveMaxLevel || 9;
	const stoveType = userSettings?.stoveType || 'Standard';
	const cookwareList = userSettings?.availableCookware?.length
		? userSettings.availableCookware.join(', ')
		: 'Pfanne, Topf, Wok';
	const enabledEquipments = userSettings?.enabledEquipments || ['stove', 'oven', 'grill', 'barware', 'airfryer'];

	const equipmentInstruction = `
AUSTATTUNG DES NUTZERS:
- Herdstufen-Skala: 1 bis ${maxStoveLevel} (Herdtyp: ${stoveType}). Passe alle Herdstufen-Empfehlungen genau an diese Skala an!
- Verfügbares Kochgeschirr: ${cookwareList}.
- Verfügbare Geräte & Zubereitungsarten: ${enabledEquipments.join(', ')}.

KATEGORIEN & ZUBEREITUNGSARTEN:
- 'cooking' (Kochen am Herd): Nutze 'applianceType': 'stove', 'heatLevel' (1-${maxStoveLevel}), 'equipment', 'hasLid'.
- 'grilling' (Grillrezepte): Nutze 'category': 'grilling', 'applianceType': 'grill', 'grillZone' ('direkt' | 'indirekt' | 'Plancha' | 'Oberhitze'), 'grillTemperature' (°C), 'lidClosed'.
- 'mixing' (Drinks & Cocktails mixen): Nutze 'category': 'mixing', 'applianceType': 'barware' oder 'blender', 'actionType' ('shake' | 'stir' | 'muddle' | 'blend' | 'build' | 'strain'), 'iceType' ('cubes' | 'crushed' | 'none'), 'glassType' (z.B. Highball, Coupe, Rocks, Tumbler), 'shakeTimeSeconds'.
- 'baking' (Backen): Nutze 'category': 'baking', 'applianceType': 'oven', 'temperatureCelsius', 'ovenMode' (Umluft / Ober-Unterhitze).
- 'airfrying' (Heißluftfritteuse): Nutze 'category': 'airfrying', 'applianceType': 'airfryer', 'temperatureCelsius'.
`;

	try {
		const result = streamText({
			model: getModelInstance(model),
			messages: await convertToModelMessages(messages),
			stopWhen: (event) => event.steps.length >= 5,
			system: `Du bist ein professioneller, flexibler Allround-Chef & Bar-Expert für die App 'Step-Chef'. 
					WICHTIG: Wenn der User nach Rezepten, Grillideen oder Drinks fragt, DARFST DU DIE REZEPTE ODER ZUTATEN NIEMALS ALS TEXT AUFLISTEN!
					Der Text-Teil deiner Antwort darf IMMER nur eine extrem kurze Einleitung sein.
					${languageInstruction}
					${equipmentInstruction}
					 Wenn der User nach Speisen oder Drinks fragt, MUSST du das Tool 'suggest_recipes' nutzen, um 1 bis 3 Vorschläge zu machen.
					 WICHTIG FÜR REZEPTE & DRINKS:
					- Gib immer die passende Kategorie an ('cooking', 'grilling', 'mixing', 'baking', 'airfrying').
					- Gib die genauen Schritt-Details an (z.B. bei Herdstufen 1-${maxStoveLevel}, Grillzone/Temperatur bei Grill, Mix-Aktion/Eis/Glas bei Drinks).
					- Wenn der User eine Option auswählt, MUSST DU ZWINGEND das Tool 'provide_full_recipe' aufrufen! Schreibe die Details niemals als einfachen Chat-Text.
					- STRIKTES VERBOT: Wenn du 'provide_full_recipe' aufrufst, DARFST DU DANACH KEINE Zutatenlisten, Schritte, Tabellen oder Rezepttexte als Chat-Text generieren! Das Rezept wird ausschließlich über das Tool als interaktive UI angezeigt. Schreibe nach dem Tool-Aufruf NUR einen kurzen Satz (z.B. 'Viel Spaß beim Zubereiten! 🥢' oder 'Prost! 🍸'). Generiere KEINE Trennlinien (---), Überschriften (###) oder Listen als Text!`,
			toolChoice: 'auto',
			tools: {
				suggest_recipes: tool({
					description:
						'Schlägt 1 bis 3 Rezepte oder Drinks basierend auf den Wünschen des Users vor.',
					inputSchema: suggestRecipesInputSchema,
					execute: async () => ({ status: 'success', message: 'Rezepte wurden dem User angezeigt' })
				}),
				provide_full_recipe: tool({
					description: 'Gibt das detaillierte Rezept oder Drink-Rezept mit Einzelschritten aus.',
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

				const sanitizedToolCalls = allToolCalls.map((tc: any) => ({
					toolCallId: tc.toolCallId || tc.id || '',
					toolName: tc.toolName || tc.name || '',
					input: tc.args ?? tc.input ?? {}
				}));

				try {
					await convex.mutation(api.chat.insertMessage, {
						chatId,
						role: 'assistant',
						content: contentToSave,
						metadata: { toolCalls: sanitizedToolCalls }
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
