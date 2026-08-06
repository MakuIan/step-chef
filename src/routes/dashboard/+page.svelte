<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { ChefHat } from 'lucide-svelte'; // Optional: if you use lucide icons
	import * as m from '$lib/paraglide/messages';

	import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '$lib/models';

	let isSubmitting = $state(false);
	let selectedModel = $state<string>(DEFAULT_MODEL_ID);

	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('step_chef_selected_model');
			if (saved && AVAILABLE_MODELS.some((m) => m.id === saved)) {
				selectedModel = saved;
			}
		}
	});

	function handleModelChange(newModel: string) {
		selectedModel = newModel;
		if (typeof window !== 'undefined') {
			localStorage.setItem('step_chef_selected_model', newModel);
		}
	}
</script>

<div class="flex h-screen flex-col items-center justify-center bg-gray-50 px-4">
	<div class="mb-8 flex flex-col items-center text-center">
		<!-- Optional Icon/Logo -->
		<div
			class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600"
		>
			<ChefHat size={32} />
		</div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Step-Chef</h1>
		<p class="text-gray-500">
			{m['chat.new_chat_subtitle']()}
		</p>
	</div>

	<form
		method="POST"
		action="?/newChat"
		class="w-full max-w-2xl flex flex-col gap-3"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<div class="flex justify-end items-center gap-2">
			<span class="text-xs font-medium text-gray-500">{m['chat.model_label']()}</span>
			<select
				value={selectedModel}
				onchange={(e) => handleModelChange(e.currentTarget.value)}
				disabled={isSubmitting}
				class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{#each AVAILABLE_MODELS as modelOption (modelOption.id)}
					<option value={modelOption.id}>
						{modelOption.name} ({modelOption.isRecommended ? `${m['chat.recommended']()} - ` : ''}{'note' in modelOption && modelOption.note ? `${modelOption.note} - ` : ''}{modelOption.provider})
					</option>
				{/each}
			</select>
		</div>

		<div
			class="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
		>
			<Input
				name="message"
				placeholder={m['chat.new_chat_placeholder']()}
				class="border-0 py-6 text-lg shadow-none focus-visible:ring-0 flex-1"
				disabled={isSubmitting}
				required
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<Button type="submit" disabled={isSubmitting} class="h-12 px-6">
				{isSubmitting ? m['chat.new_chat_starting']() : m['chat.new_chat_go']()}
			</Button>
		</div>

		<!-- Quick Category Pills -->
		{#snippet categoryPill(label: string, value: string, pillClass: string)}
			<button
				type="submit"
				name="message"
				{value}
				disabled={isSubmitting}
				class="rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all {pillClass}"
			>
				{label}
			</button>
		{/snippet}

		<div class="mt-4 flex flex-wrap justify-center gap-2">
			{@render categoryPill(
				'🍳 Schnelle Pfannen-Idee',
				'Schlag mir ein leckeres Hähnchen-Rezept für die Pfanne vor',
				'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
			)}
			{@render categoryPill(
				'🥩 Grillrezepte & BBQ',
				'Ich möchte heute etwas Leckeres grillen! Gib mir Ideen für den Grill.',
				'border-amber-200 bg-amber-50/50 text-amber-800 hover:border-amber-400 hover:bg-amber-100'
			)}
			{@render categoryPill(
				'🍸 Drinks & Cocktails mixen',
				'Ich möchte einen erfrischenden Cocktail oder Drink mixen. Welche Zutaten brauche ich?',
				'border-purple-200 bg-purple-50/50 text-purple-800 hover:border-purple-400 hover:bg-purple-100'
			)}
			{@render categoryPill(
				'♨️ Ofen & Backen',
				'Ich habe Lust auf etwas Frisches aus dem Backofen.',
				'border-orange-200 bg-orange-50/50 text-orange-800 hover:border-orange-400 hover:bg-orange-100'
			)}
		</div>
	</form>
</div>

