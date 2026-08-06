<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Sparkles, ChevronDown, Check } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import logo from '$lib/assets/logo.svg';

	import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, getModelNote } from '$lib/models';

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

	let currentModel = $derived(
		AVAILABLE_MODELS.find((m) => m.id === selectedModel) ?? AVAILABLE_MODELS[0]
	);
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center bg-background px-4">
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
		<div class="flex justify-end items-center gap-2">
			<span class="text-xs font-medium text-muted-foreground">{m['chat.model_label']()}</span>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					disabled={isSubmitting}
					class="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
				>
					<Sparkles class="h-3.5 w-3.5 text-primary shrink-0" />
					<span class="truncate max-w-[180px] sm:max-w-[220px] font-semibold">{currentModel.name}</span>
					{#if currentModel.isRecommended}
						<Badge variant="secondary" class="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0 hidden sm:inline-flex">
							{m['chat.recommended']()}
						</Badge>
					{/if}
					<ChevronDown class="h-3.5 w-3.5 text-muted-foreground ml-0.5 shrink-0" />
				</DropdownMenu.Trigger>

				<DropdownMenu.Content align="end" class="w-80 sm:w-96 p-1.5">
					<DropdownMenu.Label class="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
						{m['chat.model_label']()}
					</DropdownMenu.Label>
					<DropdownMenu.Separator class="my-1" />
					{#each AVAILABLE_MODELS as modelOption (modelOption.id)}
						<DropdownMenu.Item
							onclick={() => handleModelChange(modelOption.id)}
							class="flex items-start justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent"
						>
							<div class="flex flex-col min-w-0 flex-1">
								<div class="flex items-center gap-1.5 flex-wrap">
									<span class="font-medium text-sm text-foreground leading-snug">{modelOption.name}</span>
									{#if modelOption.isRecommended}
										<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
											{m['chat.recommended']()}
										</span>
									{/if}
									{#if getModelNote(modelOption)}
										<span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
											{getModelNote(modelOption)}
										</span>
									{/if}
								</div>
								<span class="text-xs text-muted-foreground mt-0.5">{modelOption.provider}</span>
							</div>
							{#if selectedModel === modelOption.id}
								<Check class="h-4 w-4 text-primary shrink-0 mt-0.5" />
							{/if}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
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
