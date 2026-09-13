<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ModelSelector from '$lib/components/model-selector.svelte';
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import logo from '$lib/assets/logo.svg';

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

<div class="flex-1 overflow-y-auto flex min-h-full flex-col items-center justify-center bg-background px-4 py-8">
	<div class="mb-8 flex flex-col items-center text-center">
		
		<div class="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 p-3 shadow-xs">
			<img src={logo} alt="Step-Chef Logo" class="h-full w-full object-contain" />
		</div>
		<h1 class="mb-2 text-3xl font-bold tracking-tight text-foreground">Step-Chef</h1>
		<p class="text-muted-foreground text-sm max-w-md">
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
		<!-- Modern Model Selector -->
		<div class="flex justify-end">
			<ModelSelector
				{selectedModel}
				onModelChange={handleModelChange}
				disabled={isSubmitting}
				align="end"
			/>
		</div>

		<div
			class="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
		>
			<Input
				name="message"
				placeholder={m['chat.new_chat_placeholder']()}
				class="border-0 py-6 text-lg shadow-none focus-visible:ring-0 flex-1 bg-transparent"
				disabled={isSubmitting}
				required
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<Button type="submit" disabled={isSubmitting} class="h-12 px-6 font-semibold">
				{isSubmitting ? m['chat.new_chat_starting']() : m['chat.new_chat_go']()}
			</Button>
		</div>

		
		{#snippet categoryPill(label: string, value: string)}
			<button
				type="submit"
				name="message"
				{value}
				disabled={isSubmitting}
				class="transition-transform hover:scale-105"
			>
				<Badge variant="outline" class="cursor-pointer px-3.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground border-border bg-card shadow-2xs">
					{label}
				</Badge>
			</button>
		{/snippet}

		<!-- Category Pills with i18n Translations -->
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			{@render categoryPill(
				m['chat.category_skillet_title'](),
				m['chat.category_skillet_prompt']()
			)}
			{@render categoryPill(
				m['chat.category_grill_title'](),
				m['chat.category_grill_prompt']()
			)}
			{@render categoryPill(
				m['chat.category_drinks_title'](),
				m['chat.category_drinks_prompt']()
			)}
			{@render categoryPill(
				m['chat.category_oven_title'](),
				m['chat.category_oven_prompt']()
			)}
		</div>
	</form>
</div>
