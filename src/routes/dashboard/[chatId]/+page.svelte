<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { fly, slide } from 'svelte/transition';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import type { FullRecipeInput, SuggestRecipesInput } from '$lib/schemas.js';
	import { ConvexClient } from 'convex/browser';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { api } from '../../../../convex/_generated/api';
	import * as m from '$lib/paraglide/messages';
	import { cleanRecipeText } from '$lib/utils';
	import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '$lib/models';
	let { data } = $props();

	// type DatabaseMessage = {
	// 	id: string;
	// 	role: 'user' | 'assistant' | 'system' | 'data';
	// 	content: string;
	// 	metadata?: {
	// 		toolCalls?: Array<{
	// 			toolCallId: string;
	// 			toolName: string;
	// 			args: Record<string, any>;
	// 		}>;
	// 	};
	// };
	function getSuggestRecipesInput(input: any): SuggestRecipesInput {
		return input as SuggestRecipesInput;
	}
	function getFullRecipeInput(input: any): FullRecipeInput {
		return input as FullRecipeInput;
	}
	function getInitialMessages(msgs: any[]): UIMessage[] {
		return msgs.map((msg) => {
			const metadata = msg.metadata as
				| {
						toolCalls?: Array<{
							toolCallId: string;
							toolName: string;
							input?: any;
							args?: any;
						}>;
				  }
				| null
				| undefined;

			const parts: any[] = [];
			if (msg.content && msg.content.trim() !== '') {
				const cleanedContent = cleanRecipeText(msg.content);
				if (cleanedContent) {
					parts.push({
						type: 'text',
						text: cleanedContent
					});
				}
			}

			const toolParts =
				metadata?.toolCalls?.map((tc) => {
					const rawInput = tc.args ?? tc.input ?? {};
					const parsedArgs = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
					return {
						type: `tool-${tc.toolName}` as any,
						toolCallId: tc.toolCallId,
						state: 'output-available',
						input: parsedArgs,
						output: { status: 'success' }
					};
				}) || [];

			parts.push(...toolParts);

			return {
				id: msg._id || msg.id,
				role: msg.role as 'user' | 'assistant' | 'system' | 'data',
				parts: parts
			};
		}) as UIMessage[];
	}

	let selectedModel = $state<string>(DEFAULT_MODEL_ID);
	let errorMessageBanner = $state<string | null>(null);

	function createChatInstance(messages: any[], currentChatId: string, modelName: string) {
		console.log(`messages:${messages} with type ${typeof messages}, model: ${modelName}`);
		return new Chat({
			messages: getInitialMessages(messages),
			transport: new DefaultChatTransport({
				api: '/api/chat',
				body: {
					chatId: currentChatId,
					language: 'de',
					model: modelName
				}
			}),
			onError: (err) => {
				console.error('Chat error:', err);
				const msg = err?.message || String(err);
				if (
					msg.includes('Quota') ||
					msg.includes('quota') ||
					msg.includes('429') ||
					msg.includes('rate') ||
					msg.includes('limit')
				) {
					errorMessageBanner = m['chat.quota_error_message']({ model: modelName });
				} else {
					errorMessageBanner = `Fehler (${modelName}): ${msg}`;
				}
			}
		});
	}

	let currentChatId = page.params.chatId as string;
	let chat = $state(createChatInstance(data.messages, currentChatId, selectedModel));

	$effect(() => {
		if (typeof window !== 'undefined') {
			const savedModel = localStorage.getItem('step_chef_selected_model');
			if (savedModel && savedModel !== selectedModel) {
				selectedModel = savedModel;
				chat = createChatInstance(data.messages, currentChatId, selectedModel);
			}
		}
	});

	$effect(() => {
		if (page.params.chatId !== currentChatId) {
			currentChatId = page.params.chatId as string;
			chat = createChatInstance(data.messages, currentChatId, selectedModel);
		}
	});

	function handleModelChange(newModel: string) {
		selectedModel = newModel;
		if (typeof window !== 'undefined') {
			localStorage.setItem('step_chef_selected_model', newModel);
		}
		errorMessageBanner = null;
		chat = createChatInstance(data.messages, currentChatId, newModel);
	}

	let shouldAutoStart = $state(page.url.searchParams.get('start') === 'true');
	$effect(() => {
		if (shouldAutoStart && chat.messages.length > 0 && chat.status === 'ready') {
			shouldAutoStart = false;

			const url = new URL(window.location.href);
			url.searchParams.delete('start');
			window.history.replaceState({}, '', url);

			chat.sendMessage();
		}
	});

	type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

	let inputValue = $state('');
	let currentStepIndex = $state(0);
	let currentRecipeId = $state<string | null>(null);
	let timerStatus = $state<TimerStatus>('idle');
	let timerEndsAt = $state<string | null>(null);
	let timerRemainingSeconds = $state<number | null>(null);
	let remainingTimeText = $state<string | null>(null);

	const convexClient = new ConvexClient(PUBLIC_CONVEX_URL);

	// Effect for fetching initial state and setting up Realtime subscription via Convex
	$effect(() => {
		const unsubscribe = convexClient.onUpdate(
			api.chat.getActiveRecipe,
			{ chatId: page.params.chatId as string },
			(recipe) => {
				if (recipe) {
					currentRecipeId = recipe._id;
					currentStepIndex = recipe.currentStep;
					timerEndsAt = recipe.activeTimerEndsAt ?? null;
					timerRemainingSeconds = recipe.timerRemainingSeconds ?? null;
					timerStatus = (recipe.timerStatus as TimerStatus) ?? (recipe.activeTimerEndsAt ? 'running' : 'idle');
				}
			}
		);

		return unsubscribe;
	});

	// Effect for Handle the countdown timer logic dynamically
	$effect(() => {
		if (timerStatus === 'idle') {
			remainingTimeText = null;
			return;
		}

		if (timerStatus === 'paused') {
			if (timerRemainingSeconds !== null) {
				const mins = Math.floor(timerRemainingSeconds / 60);
				const secs = timerRemainingSeconds % 60;
				const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
				remainingTimeText = m['chat.timer_paused_status']({ time: formatted });
			}
			return;
		}

		if (timerStatus === 'finished') {
			remainingTimeText = m['chat.timer_done_status']();
			return;
		}

		if (timerStatus === 'running') {
			if (!timerEndsAt) {
				remainingTimeText = null;
				return;
			}

			const updateCountdown = () => {
				const now = Date.now();
				const end = new Date(timerEndsAt as string).getTime();
				const distanceMs = end - now;

				if (distanceMs <= 0) {
					timerStatus = 'finished';
					timerRemainingSeconds = 0;
					remainingTimeText = m['chat.timer_done_status']();
				} else {
					const totalSecs = Math.ceil(distanceMs / 1000);
					timerRemainingSeconds = totalSecs;
					const minutes = Math.floor(totalSecs / 60);
					const seconds = totalSecs % 60;
					remainingTimeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
				}
			};

			updateCountdown();
			const interval = setInterval(updateCountdown, 1000);

			return () => clearInterval(interval);
		}
	});

	async function updateStep(newIndex: number) {
		currentStepIndex = newIndex;
		timerStatus = 'idle';
		timerEndsAt = null;
		timerRemainingSeconds = null;
		remainingTimeText = null;

		if (currentRecipeId) {
			await convexClient.mutation(api.chat.updateRecipe, {
				recipeId: currentRecipeId,
				currentStep: newIndex,
				activeTimerEndsAt: null,
				timerRemainingSeconds: null,
				timerStatus: 'idle'
			});
		}
	}

	function handleFormSubmit(e: Event) {
		e.preventDefault();
		console.log('1. Formular abgeschickt!');

		if (!inputValue.trim()) {
			console.log('Abbruch: Input leer');
			return;
		}

		console.log('2. Sende Nachricht an API...');
		chat.sendMessage({ text: inputValue });
		inputValue = '';
	}

	let isSelectingRecipe = $state(false);

	async function handleRecipeSelection(selectedRecipeTitle: string) {
		if (isSelectingRecipe || chat.status === 'streaming' || chat.status === 'submitted') return;
		isSelectingRecipe = true;

		try {
			chat.sendMessage({
				text: m['chat.prompt_select_recipe']({ title: selectedRecipeTitle })
			});

			await convexClient.mutation(api.chat.updateTitle, {
				chatId: page.params.chatId as any,
				title: selectedRecipeTitle
			});
			await invalidateAll();
		} catch (error) {
			console.error('Failed to update chat title:', error);
		} finally {
			isSelectingRecipe = false;
		}
	}

	async function startTimer(minutes: number) {
		const totalSecs = minutes * 60;
		const endsAt = new Date(Date.now() + totalSecs * 1000).toISOString();
		timerEndsAt = endsAt;
		timerRemainingSeconds = totalSecs;
		timerStatus = 'running';

		if (currentRecipeId) {
			await convexClient.mutation(api.chat.updateRecipe, {
				recipeId: currentRecipeId,
				activeTimerEndsAt: endsAt,
				timerRemainingSeconds: totalSecs,
				timerStatus: 'running'
			});
		}
	}

	async function pauseTimer() {
		if (timerStatus !== 'running') return;
		let remainingSecs = timerRemainingSeconds ?? 0;
		if (timerEndsAt) {
			const distanceMs = new Date(timerEndsAt).getTime() - Date.now();
			remainingSecs = Math.max(0, Math.ceil(distanceMs / 1000));
		}
		timerStatus = 'paused';
		timerEndsAt = null;
		timerRemainingSeconds = remainingSecs;

		if (currentRecipeId) {
			await convexClient.mutation(api.chat.updateRecipe, {
				recipeId: currentRecipeId,
				activeTimerEndsAt: null,
				timerRemainingSeconds: remainingSecs,
				timerStatus: 'paused'
			});
		}
	}

	async function resumeTimer() {
		if (timerStatus !== 'paused') return;
		const remainingSecs = timerRemainingSeconds && timerRemainingSeconds > 0 ? timerRemainingSeconds : 60;
		const endsAt = new Date(Date.now() + remainingSecs * 1000).toISOString();
		timerEndsAt = endsAt;
		timerStatus = 'running';

		if (currentRecipeId) {
			await convexClient.mutation(api.chat.updateRecipe, {
				recipeId: currentRecipeId,
				activeTimerEndsAt: endsAt,
				timerRemainingSeconds: remainingSecs,
				timerStatus: 'running'
			});
		}
	}

	async function resetTimer() {
		timerStatus = 'idle';
		timerEndsAt = null;
		timerRemainingSeconds = null;
		remainingTimeText = null;

		if (currentRecipeId) {
			await convexClient.mutation(api.chat.updateRecipe, {
				recipeId: currentRecipeId,
				activeTimerEndsAt: null,
				timerRemainingSeconds: null,
				timerStatus: 'idle'
			});
		}
	}
</script>

<div class="flex h-screen max-h-screen flex-col bg-gray-50">
	<main class="flex-1 overflow-y-auto p-4 pb-24">
		{#each chat.messages as message (message.id)}
			<div class="mb-4 flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
				<div class="max-w-[90%]">
					{#if message.role === 'assistant'}
						<Card>
							<CardContent class="p-4">
								{#each message.parts as part, index (index)}
									{#if part.type === 'text'}
										{@const cleaned = cleanRecipeText(part.text)}
										{#if cleaned}
											<p class="whitespace-pre-line text-sm text-gray-700">{cleaned}</p>
										{/if}
									{/if}

									<!-- Added (recipe.title) as the key here -->
									{#if part.type === 'tool-suggest_recipes' && (part.state === 'input-available' || part.state === 'output-available')}
										{@const inputData = getSuggestRecipesInput(part.input)}
										<div class="mt-4 flex flex-row flex-wrap gap-4">
											<!-- Added ?. and || [] -->
											{#each inputData.recipes || [] as recipe, i (recipe.title)}
												<button
													in:fly={{ y: 20, delay: i * 100 }}
													onclick={() => handleRecipeSelection(recipe.title)}
													disabled={isSelectingRecipe || chat.status === 'streaming' || chat.status === 'submitted'}
													class="min-w-50 flex-1 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<h4 class="font-bold">{recipe.title}</h4>
													<p class="text-sm text-gray-500">{recipe.description}</p>
													<div class="mt-2 text-xs">⏱ {recipe.prepTimeMinutes} Min</div>
												</button>
											{/each}
										</div>
									{/if}

									{#if part.type === 'tool-provide_full_recipe' && (part.state === 'input-available' || part.state === 'output-available')}
										{@const recipe = getFullRecipeInput(part.input)}
										<!-- Safeguard: Only render if recipe actually has a title -->
										{#if recipe?.title}
											<div class="mt-4 space-y-4" in:slide>
												<h3 class="text-xl font-bold">{recipe.title}</h3>

												<div class="rounded-lg bg-blue-50 p-3">
													<h4 class="mb-1 font-semibold">Zutaten:</h4>
													<ul class="text-sm">
														<!-- Added ?. and || [] -->
														{#each recipe?.ingredients || [] as ingredient, index (index)}
															<li>• {ingredient.menge} {ingredient.name}</li>
														{/each}
													</ul>
												</div>

												<!-- Step-by-Step Tracker -->
												<div class="space-y-2">
													<!-- Added ?. and || [] for safety -->
													{#each recipe?.steps || [] as step, stepIndex (stepIndex)}
														<div
															class="rounded-lg border p-3 {currentStepIndex === stepIndex
																? 'border-blue-500 bg-blue-50'
																: 'opacity-50'}"
														>
															<div class="flex items-start justify-between">
																<span class="font-bold">Schritt {stepIndex + 1}</span>
																{#if step?.timerMinutes}
																	<div class="flex flex-wrap items-center gap-2">
																		{#if currentStepIndex === stepIndex}
																			{#if remainingTimeText}
																				<span class="font-mono text-sm font-bold text-blue-600">
																					{remainingTimeText}
																				</span>
																			{/if}

																			{#if timerStatus === 'idle'}
																				<Button
																					size="sm"
																					variant="outline"
																					onclick={() => {
																						if (step.timerMinutes) startTimer(step.timerMinutes);
																					}}
																				>
																					{m['chat.timer_start']({ minutes: step.timerMinutes })}
																				</Button>
																			{:else if timerStatus === 'running'}
																				<Button
																					size="sm"
																					variant="outline"
																					onclick={pauseTimer}
																					class="border-amber-400 text-amber-700 hover:bg-amber-50"
																				>
																					{m['chat.timer_pause']()}
																				</Button>
																				<Button
																					size="sm"
																					variant="ghost"
																					onclick={resetTimer}
																					class="text-gray-500 hover:text-gray-700"
																				>
																					{m['chat.timer_reset']()}
																				</Button>
																			{:else if timerStatus === 'paused'}
																				<Button
																					size="sm"
																					variant="outline"
																					onclick={resumeTimer}
																					class="border-green-500 text-green-700 hover:bg-green-50"
																				>
																					{m['chat.timer_resume']()}
																				</Button>
																				<Button
																					size="sm"
																					variant="ghost"
																					onclick={resetTimer}
																					class="text-gray-500 hover:text-gray-700"
																				>
																					{m['chat.timer_reset']()}
																				</Button>
																			{:else if timerStatus === 'finished'}
																				<Button
																					size="sm"
																					variant="outline"
																					onclick={() => {
																						if (step.timerMinutes) startTimer(step.timerMinutes);
																					}}
																				>
																					{m['chat.timer_start']({ minutes: step.timerMinutes })}
																				</Button>
																				<Button
																					size="sm"
																					variant="ghost"
																					onclick={resetTimer}
																					class="text-gray-500 hover:text-gray-700"
																				>
																					{m['chat.timer_reset']()}
																				</Button>
																			{/if}
																		{:else}
																			<Button size="sm" variant="outline" disabled>
																				⏲ {step.timerMinutes} Min
																			</Button>
																		{/if}
																	</div>
																{/if}
															</div>

															<!-- Safely render instruction with a fallback while streaming -->
															<p class="my-2 text-sm">{step?.instruction || 'Lade Anweisung...'}</p>

															<div class="flex gap-2 text-xs text-gray-600">
																{#if step?.equipment}<span>🍳 {step.equipment}</span>{/if}
																{#if step?.heatLevel}<span>🔥 Stufe: {step.heatLevel}</span>{/if}

																<!-- Only check hasLid if it has actually streamed in -->
																{#if step?.hasLid !== undefined}
																	<span>{step.hasLid ? '🥘 Mit Deckel' : '🍳 Ohne Deckel'}</span>
																{/if}
															</div>

															{#if currentStepIndex === stepIndex}
																<div class="mt-2 flex gap-2">
																	{#if stepIndex > 0}
																		<Button
																			variant="outline"
																			class="flex-1"
																			onclick={() => updateStep(stepIndex - 1)}
																		>
																			Zurück
																		</Button>
																	{/if}
																	<Button
																		class="flex-1"
																		onclick={() => updateStep(stepIndex + 1)}
																		disabled={!step?.instruction}
																	>
																		Schritt erledigt
																	</Button>
																</div>
															{/if}
														</div>
													{/each}
												</div>

												{#if currentStepIndex >= (recipe?.steps?.length || 0) && (recipe?.steps?.length || 0) > 0}
													<div class="mt-4 flex gap-2">
														<Button
															class="flex-1"
															variant="outline"
															onclick={() => updateStep(currentStepIndex - 1)}
														>
															Zurück
														</Button>
														<Button
															class="flex-1 bg-green-600 text-white hover:bg-green-700"
															onclick={() => updateStep(0)}
														>
															{m['chat.restart_recipe']()}
														</Button>
													</div>
												{/if}
											</div>
										{/if}
									{/if}
								{/each}
							</CardContent>
						</Card>
					{/if}
					<!-- User Messages -->
					{#if message.role === 'user'}
						<div class="rounded-2xl rounded-tr-none bg-blue-600 p-3 text-white">
							{#if message.parts.length > 0 && message.parts[0].type === 'text'}
								{message.parts[0].text}
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
		<!-- StepChef thinking -->
		{#if chat.status === 'submitted' || chat.status === 'streaming'}
			<div class="mb-4 flex justify-start">
				<div class="max-w-[90%]">
					<Card>
						<CardContent class="flex items-center gap-3 p-4 text-gray-500">
							<!-- Bouncing Dots Animation using Tailwind -->
							<div class="flex space-x-1.5">
								<div
									class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"
								></div>
								<div
									class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"
								></div>
								<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
							</div>
							<span class="text-sm font-medium">{m['chat.thinking']()}</span>
						</CardContent>
					</Card>
				</div>
			</div>
		{/if}
		{#if errorMessageBanner}
			<div
				class="mx-auto mb-4 flex max-w-4xl items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm"
				in:slide
			>
				<div class="flex items-start gap-3">
					<span class="text-xl">⚠️</span>
					<div>
						<h4 class="text-sm font-bold">{m['chat.quota_title']()}</h4>
						<p class="text-xs text-amber-800">{errorMessageBanner}</p>
					</div>
				</div>
				<button
					onclick={() => (errorMessageBanner = null)}
					class="px-2 py-1 text-sm font-bold text-amber-700 hover:text-amber-900"
				>
					✕
				</button>
			</div>
		{/if}
	</main>

	<!-- Chat Input Bar -->
	<div class="sticky bottom-0 z-10 mt-4 w-full border-t bg-background p-4">
		<form onsubmit={handleFormSubmit} class="mx-auto flex max-w-4xl items-center gap-2">
			<!-- Model Selection Dropdown -->
			<select
				value={selectedModel}
				onchange={(e) => handleModelChange(e.currentTarget.value)}
				disabled={chat.status === 'streaming' || chat.status === 'submitted'}
				class="h-9 rounded-lg border border-input bg-white px-3 py-1 text-xs font-medium text-foreground shadow-xs outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50"
			>
				{#each AVAILABLE_MODELS as modelOption (modelOption.id)}
					<option value={modelOption.id}>
						{modelOption.name} ({modelOption.isRecommended ? `${m['chat.recommended']()} - ` : ''}{modelOption.provider})
					</option>
				{/each}
			</select>

			<Input
				bind:value={inputValue}
				placeholder={m['chat.input_placeholder']()}
				class="flex-1"
				disabled={chat.status === 'streaming' || chat.status === 'submitted'}
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<Button
				type="submit"
				disabled={chat.status === 'streaming' || chat.status === 'submitted' || !inputValue.trim()}
			>
				{m['chat.send']()}
			</Button>
		</form>
	</div>
</div>
