import * as m from '$lib/paraglide/messages';

export type ModelNoteKey = 'slow' | 'very_slow' | 'very_restrictive';

export interface ModelOption {
	id: string;
	name: string;
	provider: 'OpenRouter' | 'Google';
	isRecommended: boolean;
	noteKey?: ModelNoteKey;
}

export const AVAILABLE_MODELS = [
	{
		id: 'inclusionai/ling-3.0-flash:free',
		name: 'Ling 3.0 Flash',
		provider: 'OpenRouter',
		isRecommended: true
	},
	{
		id: 'cohere/north-mini-code:free',
		name: 'North Mini Code',
		provider: 'OpenRouter',
		isRecommended: false,
		noteKey: 'slow'
	},
	{
		id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
		name: 'Nvidia Nemotron 3 Ultra 550B',
		provider: 'OpenRouter',
		isRecommended: false
	},
	{
		id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
		name: 'Nvidia Nemotron 3 Nano Omni 30B Reasoning',
		provider: 'OpenRouter',
		isRecommended: false,
		noteKey: 'very_slow'
	},
	{
		id: 'gemini-3.5-flash-lite',
		name: 'Gemini 3.5 Flash Lite',
		provider: 'Google',
		isRecommended: false,
		noteKey: 'very_restrictive'
	}
] as const satisfies readonly ModelOption[];

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

export const DEFAULT_MODEL_ID: ModelId = AVAILABLE_MODELS[0].id;

export function getModelNote(modelOption: ModelOption): string | null {
	if (!modelOption.noteKey) return null;
	if (modelOption.noteKey === 'slow') return m['chat.model_note_slow']();
	if (modelOption.noteKey === 'very_slow') return m['chat.model_note_very_slow']();
	if (modelOption.noteKey === 'very_restrictive') return m['chat.model_note_very_restrictive']();
	return null;
}
