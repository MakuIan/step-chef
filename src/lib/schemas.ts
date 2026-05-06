import { z } from 'zod';

export const suggestedRecipeSchema = z.object({
	title: z.string().describe('Der Name des Rezepts'),
	prepTimeMinutes: z.number().describe('Die geschätzte Dauer in Minuten'),
	difficulty: z.enum(['easy', 'medium', 'hard']).describe('Schwierigkeitsgrad'),
	description: z.string().describe('Eine kurze Beschreibung des Gerichts (1-2 Sätze)'),
	ingredients: z
		.array(
			z.object({
				name: z.string().describe('Name der Zutat, z.B. Mehl'),
				menge: z.string().describe('Menge und Einheit, z.B. 500g oder 2 EL')
			})
		)
		.describe('Eine Liste der Hauptzutaten für die Rezeptvorschau')
});

export const suggestRecipesInputSchema = z.object({
	recipes: z.array(suggestedRecipeSchema).min(1).max(3)
});

export const fullRecipeInputSchema = z.object({
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
});

export type SuggestRecipesInput = z.infer<typeof suggestRecipesInputSchema>;
export type FullRecipeInput = z.infer<typeof fullRecipeInputSchema>;
export type SuggestedRecipe = z.infer<typeof suggestedRecipeSchema>;
