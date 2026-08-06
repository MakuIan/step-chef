export interface ModelOption {
	id: string;
	name: string;
	provider: 'OpenRouter' | 'Google';
	isRecommended: boolean;
}

export const AVAILABLE_MODELS = [
	{
		id: 'inclusionai/ling-3.0-flash:free',
		name: 'Ling 3.0 Flash',
		provider: 'OpenRouter',
		isRecommended: true
	},
	{
		id: 'gemini-3.5-flash-lite',
		name: 'Gemini 3.5 Flash Lite',
		provider: 'Google',
		isRecommended: false
	}
] as const satisfies readonly ModelOption[];

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

export const DEFAULT_MODEL_ID: ModelId = AVAILABLE_MODELS[0].id;
