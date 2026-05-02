import type { Database } from './database.types';

export type ApplianceType = 'stove' | 'oven' | 'microwave' | 'grill' | 'none';
export interface RecipeStep {
	step_number: number;
	description: string;
	ingredients: { name: string; amount: string }[];
	equipment: string;
	duration_minutes: number | null;
	appliance_type: ApplianceType;

	stove_level?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
	temperature_celsius?: number;
	microwave_watt?: number;
	oven_mode?: 'Umluft' | 'Ober-/Unterhitze' | 'Grill';
}
type RecipeRow = Database['public']['Tables']['recipes']['Row'];

export interface AppRecipe extends Omit<RecipeRow, 'steps'> {
	steps: RecipeStep[];
}
