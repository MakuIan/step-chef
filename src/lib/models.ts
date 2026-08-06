export interface ModelOption {
	id: string;
	name: string;
	provider: 'OpenRouter' | 'Google';
	isRecommended: boolean;
	note?: string;
}

export const AVAILABLE_MODELS = [
	{
		id: 'inclusionai/ling-3.0-flash:free',
		name: 'Ling 3.0 Flash',
		provider: 'OpenRouter',
		isRecommended: true
	},
	{
		id:'cohere/north-mini-code:free',
		name: 'North Mini Code',
		provider: 'OpenRouter',
		isRecommended: false,
		note: 'langsam'
	},
	{
		id:'nvidia/nemotron-3-ultra-550b-a55b:free',
		name: 'Nvidia Nemotron 3 Ultra 550B',
		provider: 'OpenRouter',
		isRecommended: false,
	},
	{
		id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
		name: 'Nvidia Nemotron 3 Nano Omni 30B Reasoning',
		provider: 'OpenRouter',
		isRecommended: false,
		note: 'sehr langsam'
	},
	{
		id: 'gemini-3.5-flash-lite',
		name: 'Gemini 3.5 Flash Lite',
		provider: 'Google',
		isRecommended: false,
		note: 'sehr restriktiv'
	}
] as const satisfies readonly ModelOption[];

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

export const DEFAULT_MODEL_ID: ModelId = AVAILABLE_MODELS[0].id;
