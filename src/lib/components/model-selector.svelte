<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Sparkles, ChevronDown, Check } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';
	import { AVAILABLE_MODELS, getModelNote } from '$lib/models';

	interface Props {
		selectedModel: string;
		onModelChange: (modelId: string) => void;
		disabled?: boolean;
		align?: 'start' | 'end' | 'center';
		side?: 'top' | 'bottom';
		showLabel?: boolean;
	}

	let {
		selectedModel,
		onModelChange,
		disabled = false,
		align = 'end',
		side = 'bottom',
		showLabel = true
	}: Props = $props();

	let currentModel = $derived(
		AVAILABLE_MODELS.find((m) => m.id === selectedModel) ?? AVAILABLE_MODELS[0]
	);
</script>

<div class="flex items-center gap-2">
	{#if showLabel}
		<span class="text-xs font-medium text-muted-foreground">{m['chat.model_label']()}</span>
	{/if}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			{disabled}
			class="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
		>
			<Sparkles class="h-3.5 w-3.5 text-primary shrink-0" />
			<span class="truncate max-w-[160px] sm:max-w-[220px] font-semibold">{currentModel.name}</span>
			{#if currentModel.isRecommended}
				<Badge
					variant="secondary"
					class="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0 hidden sm:inline-flex"
				>
					{m['chat.recommended']()}
				</Badge>
			{/if}
			<ChevronDown class="h-3.5 w-3.5 text-muted-foreground ml-0.5 shrink-0" />
		</DropdownMenu.Trigger>

		<DropdownMenu.Content {align} {side} class="w-80 sm:w-96 p-1.5 z-50">
			<DropdownMenu.Label
				class="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider"
			>
				{m['chat.model_label']()}
			</DropdownMenu.Label>
			<DropdownMenu.Separator class="my-1" />
			{#each AVAILABLE_MODELS as modelOption (modelOption.id)}
				<DropdownMenu.Item
					onclick={() => onModelChange(modelOption.id)}
					class="flex items-start justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent"
				>
					<div class="flex flex-col min-w-0 flex-1">
						<div class="flex items-center gap-1.5 flex-wrap">
							<span class="font-medium text-sm text-foreground leading-snug">{modelOption.name}</span>
							{#if modelOption.isRecommended}
								<span
									class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0"
								>
									{m['chat.recommended']()}
								</span>
							{/if}
							{#if getModelNote(modelOption)}
								<span
									class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0"
								>
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
