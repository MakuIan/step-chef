<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { page } from '$app/state';
	import { fly, slide } from 'svelte/transition';
	import { DefaultChatTransport, type UIMessage } from 'ai';

	const chatId = page.params.chatId;
	let { data } = $props();
	const initialMessages: UIMessage[] = data.messages.map((msg: any) => ({
		id: msg.id,
		role: msg.role,
		parts: [
			{
				type: 'text',
				text: msg.content
			},
			...(msg.metadata?.toolCalls?.map((tc: any) => ({
				type: 'tool-invocation',
				toolInvocation: {
					state: 'result',
					toolCallId: tc.id,
					toolName: tc.function.name,
					args:
						typeof tc.function.arguments === 'string'
							? JSON.parse(tc.function.arguments)
							: tc.function.arguments,
					result: { status: 'success' }
				}
			})) || [])
		]
	}));

	const chat = new Chat({
		messages: initialMessages,
		transport: new DefaultChatTransport({
			api: '/api/chat',
			body: {
				chatId: chatId,
				language: 'de'
			}
		})
	});

	const isStart = page.url.searchParams.get('start') === 'true';
	$effect(() => {
		if (isStart && chat.messages.length > 0 && chat.status === 'ready') {
			const url = new URL(window.location.href);
			url.searchParams.delete('start');
			window.history.replaceState({}, '', url);

			chat.sendMessage();
		}
	});

	let inputValue = $state('');
	let activeRecipe = $state<any>(null);
	let currentStepIndex = $state(0);

	function handleFormSubmit(e: Event) {
		e.preventDefault();
		console.log('1. Formular abgeschickt!'); // <--- TEST LOG

		if (!inputValue.trim()) {
			console.log('Abbruch: Input leer');
			return;
		}

		console.log('2. Sende Nachricht an API...'); // <--- TEST LOG
		chat.sendMessage({ text: inputValue });
		inputValue = '';
	}

	function handleRecipeSelection(selectedRecipeTitle: string) {
		chat.sendMessage({
			text: `Ich wähle: ${selectedRecipeTitle}. Bitte erstelle das genaue Kochrezept mit allen Schritten und Timern.`
		});
	}
	function startTimer(minutes: number) {
		alert(`Timer gestartet: ${minutes} Minuten`);
		// TODO Implement timer logic
	}
</script>

<div class="flex h-screen max-h-screen flex-col bg-gray-50">
	{#if chat.messages.length > 0}
		<details class="mt-4 rounded border border-red-200 bg-red-50 p-2 font-mono text-[10px]">
			<summary class="cursor-pointer font-bold text-red-700">DEBUG: Last Message Raw Data</summary>
			<pre>{JSON.stringify(chat.messages)}</pre>
		</details>
	{/if}
	<!-- Chat History Area -->

	<main class="flex-1 overflow-y-auto p-4 pb-24">
		{#each chat.messages as message (message.id)}
			<div class="mb-4 flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
				<div class="max-w-[90%]">
					{#if message.role === 'assistant'}
						<Card>
							<CardContent class="p-4">
								{#each message.parts as part, index (index)}
									{#if part.type === 'text'}
										<p>{part.text}</p>
									{/if}

									<!-- TOOL 1: Rezeptvorschläge (Flex-Row & Animation) -->
									{#if part.type === 'tool-invocation' && part.toolInvocation.toolName === 'suggest_recipes'}
										<div class="mt-4 flex flex-row flex-wrap gap-4">
											{#each part.toolInvocation.args.recipes as recipe, i}
												<button
													in:fly={{ y: 20, delay: i * 100 }}
													onclick={() => handleRecipeSelection(recipe.title)}
													class="min-w-[200px] flex-1 rounded-xl border bg-white p-4 text-left transition-all hover:shadow-lg"
												>
													<h4 class="font-bold">{recipe.title}</h4>
													<p class="text-sm text-gray-500">{recipe.description}</p>
													<div class="mt-2 text-xs">⏱ {recipe.prepTimeMinutes} Min</div>
												</button>
											{/each}
										</div>
									{/if}

									<!-- TOOL 2: Full Recipe Rendering -->
									{#if part.type === 'tool-invocation' && part.toolInvocation.toolName === 'provide_full_recipe'}
										{@const recipe = part.toolInvocation.args}
										<div class="mt-4 space-y-4" in:slide>
											<h3 class="text-xl font-bold">{recipe.title}</h3>

											<!-- Zutaten Liste -->
											<div class="rounded-lg bg-blue-50 p-3">
												<h4 class="mb-1 font-semibold">Zutaten:</h4>
												<ul class="text-sm">
													{#each recipe.ingredients as ing}
														<li>• {ing.menge} {ing.name}</li>
													{/each}
												</ul>
											</div>

											<!-- Step-by-Step Tracker -->
											<div class="space-y-2">
												{#each recipe.steps as step, index}
													<div
														class="rounded-lg border p-3 {currentStepIndex === index
															? 'border-blue-500 bg-blue-50'
															: 'opacity-50'}"
													>
														<div class="flex items-start justify-between">
															<span class="font-bold">Schritt {index + 1}</span>
															{#if step.timerMinutes}
																<Button
																	size="sm"
																	variant="outline"
																	onclick={() => startTimer(step.timerMinutes)}
																>
																	⏲ {step.timerMinutes} Min starten
																</Button>
															{/if}
														</div>
														<p class="my-2 text-sm">{step.instruction}</p>
														<div class="flex gap-2 text-xs text-gray-600">
															<span>🍳 {step.equipment}</span>
															{#if step.heatLevel}<span>🔥 Stufe: {step.heatLevel}</span>{/if}
															<span>{step.hasLid ? '🥘 Mit Deckel' : '🍳 Ohne Deckel'}</span>
														</div>
														{#if currentStepIndex === index}
															<Button class="mt-2 w-full" onclick={() => currentStepIndex++}>
																Schritt erledigt
															</Button>
														{/if}
													</div>
												{/each}
											</div>
										</div>
									{/if}
								{/each}
							</CardContent>
						</Card>
					{/if}

					{#if message.role === 'user'}
						<div class="rounded-2xl rounded-tr-none bg-blue-600 p-3 text-white">
							{message.parts[0].text}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</main>

	<!-- Chat Input Bar -->
	<div class="fixed right-0 bottom-0 left-0 border-t bg-white p-4">
		<form onsubmit={handleFormSubmit} class="mx-auto flex max-w-4xl items-center gap-2">
			<Input
				bind:value={inputValue}
				placeholder="Was möchtest du kochen?"
				class="flex-1"
				disabled={chat.status === 'streaming' || chat.status === 'submitted'}
			/>
			<Button
				type="submit"
				disabled={chat.status === 'streaming' || chat.status === 'submitted' || !inputValue.trim()}
			>
				Senden
			</Button>
		</form>
	</div>
</div>
