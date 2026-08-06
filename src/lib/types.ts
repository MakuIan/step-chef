import type { Database } from './database.types';

export type RecipeCategory = 'cooking' | 'grilling' | 'mixing' | 'baking' | 'airfrying' | 'general';
export type ApplianceType = 'stove' | 'oven' | 'microwave' | 'grill' | 'barware' | 'blender' | 'airfryer' | 'prep' | 'none';

export type DrinkActionType = 'shake' | 'stir' | 'muddle' | 'blend' | 'build' | 'strain';
export type DrinkIceType = 'cubes' | 'crushed' | 'none';

export interface RecipeStep {
	step_number?: number;
	instruction: string;
	equipment?: string;
	timerMinutes?: number | null;
	appliance_type?: ApplianceType;

	// Stove properties
	heatLevel?: number;
	stove_level?: number;
	hasLid?: boolean;

	// Oven & Airfryer properties
	temperature_celsius?: number;
	temperatureCelsius?: number;
	oven_mode?: string;
	ovenMode?: string;

	// Grill properties
	grillZone?: 'direkt' | 'indirekt' | 'Plancha' | 'Oberhitze';
	grillTemperature?: number;
	lidClosed?: boolean;

	// Drink mixing / Barware properties
	actionType?: DrinkActionType;
	iceType?: DrinkIceType;
	glassType?: string;
	shakeTimeSeconds?: number;
}

export interface UserSettings {
	stoveMaxLevel: number;
	stoveType: string;
	availableCookware: string[];
	enabledEquipments: string[];
}

type RecipeRow = Database['public']['Tables']['recipes']['Row'];

export interface AppRecipe extends Omit<RecipeRow, 'steps'> {
	category?: RecipeCategory;
	steps: RecipeStep[];
}

