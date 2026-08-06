import { z } from 'zod';

export const recipeCategorySchema = z.enum(['cooking', 'grilling', 'mixing', 'baking', 'airfrying', 'general']);
export const applianceTypeSchema = z.enum([
	'stove',
	'oven',
	'microwave',
	'grill',
	'barware',
	'blender',
	'airfryer',
	'prep',
	'none'
]);

export const suggestedRecipeSchema = z.object({
	title: z.string().describe('Der Name des Rezepts oder Drinks'),
	category: recipeCategorySchema.optional().describe('Die Kategorie des Rezepts (z.B. cooking, grilling, mixing, baking)'),
	prepTimeMinutes: z.number().describe('Die geschätzte Dauer in Minuten'),
	difficulty: z.enum(['easy', 'medium', 'hard']).describe('Schwierigkeitsgrad'),
	description: z.string().describe('Eine kurze Beschreibung des Gerichts oder Drinks (1-2 Sätze)'),
	ingredients: z
		.array(
			z.object({
				name: z.string().describe('Name der Zutat, z.B. Mehl oder Rum'),
				menge: z.string().describe('Menge und Einheit, z.B. 500g oder 4 cl')
			})
		)
		.describe('Eine Liste der Hauptzutaten für die Rezeptvorschau')
});

export const suggestRecipesInputSchema = z.object({
	recipes: z.array(suggestedRecipeSchema).min(1).max(3)
});

export const fullRecipeInputSchema = z.object({
	title: z.string(),
	category: recipeCategorySchema.optional(),
	ingredients: z.array(z.object({ name: z.string(), menge: z.string() })),
	steps: z.array(
		z.object({
			instruction: z.string().describe('Genaue Anweisung für den Schritt'),
			timerMinutes: z.number().optional().describe('Timer in Minuten falls relevant'),
			applianceType: applianceTypeSchema.optional().describe('Verwendetes Gerät oder Station'),
			
			// Stove specific
			heatLevel: z.number().optional().describe('Herdstufe (z.B. 1 bis 9)'),
			equipment: z.string().optional().describe('Kochgeschirr oder Equipment (z.B. Wok, Shaker, Gusseisenpfanne)'),
			hasLid: z.boolean().optional().describe('Ob ein Deckel genutzt werden soll'),

			// Grill specific
			grillZone: z.enum(['direkt', 'indirekt', 'Plancha', 'Oberhitze']).optional().describe('Grillzone'),
			grillTemperature: z.number().optional().describe('Grill-Temperatur in °C'),
			lidClosed: z.boolean().optional().describe('Ob der Grilldeckel geschlossen ist'),

			// Drink mixing specific
			actionType: z.enum(['shake', 'stir', 'muddle', 'blend', 'build', 'strain']).optional().describe('Mix-Aktion'),
			iceType: z.enum(['cubes', 'crushed', 'none']).optional().describe('Verwendetes Eis'),
			glassType: z.string().optional().describe('Glas-Typ (z.B. Highball, Coupe, Rocks, Tumbler)'),
			shakeTimeSeconds: z.number().optional().describe('Schütteldauer in Sekunden'),

			// Oven & Airfryer specific
			temperatureCelsius: z.number().optional().describe('Temperatur in °C'),
			ovenMode: z.string().optional().describe('Ofenmodus, z.B. Umluft, Ober-/Unterhitze')
		})
	)
});

export type SuggestRecipesInput = z.infer<typeof suggestRecipesInputSchema>;
export type FullRecipeInput = z.infer<typeof fullRecipeInputSchema>;
export type SuggestedRecipe = z.infer<typeof suggestedRecipeSchema>;

