<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { page } from '$app/state';
	import { fly, slide } from 'svelte/transition';
	import { DefaultChatTransport, type UIMessage } from 'ai';
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

	function getInitialMessages(msgs: any[]): UIMessage[] {
		return msgs.map((msg) => {
			const metadata = msg.metadata as
				| {
						toolCalls?: Array<{
							toolCallId: string;
							toolName: string;
							input?: any;
						}>;
				  }
				| null
				| undefined;

			const parts: any[] = [];
			if (msg.content && msg.content.trim() !== '') {
				parts.push({
					type: 'text',
					text: msg.content
				});
			}

			const toolParts =
				metadata?.toolCalls?.map((tc) => {
					const parsedArgs = typeof tc.input === 'string' ? JSON.parse(tc.input) : tc.input || {};
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
				id: msg.id,
				role: msg.role as 'user' | 'assistant' | 'system' | 'data',
				parts: parts
			};
		}) as UIMessage[];
	}

	function createChatInstance(messages: any[], currentChatId: string) {
		console.log(`messages:${messages} with type ${typeof messages}`);
		return new Chat({
			messages: getInitialMessages(messages),
			transport: new DefaultChatTransport({
				api: '/api/chat',
				body: {
					chatId: currentChatId,
					language: 'de'
				}
			})
		});
	}

	let chat = $state(createChatInstance(data.messages, page.params.chatId as string));
	$effect(() => {
		chat = createChatInstance(data.messages, page.params.chatId as string);
	});

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

	let inputValue = $state('');
	let currentStepIndex = $state(0);

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

									<!-- Added (recipe.title) as the key here -->
									{#if part.type === 'tool-suggest_recipes' && (part.state === 'input-available' || part.state === 'output-available')}
										<div class="mt-4 flex flex-row flex-wrap gap-4">
											<!-- Added ?. and || [] -->
											{#each part.input?.recipes || [] as recipe, i (recipe.title)}
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

									{#if part.type === 'tool-provide_full_recipe' && (part.state === 'input-available' || part.state === 'output-available')}
										{@const recipe = part.input}
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
													{#each recipe?.steps || [] as step, index (index)}
														<div
															class="rounded-lg border p-3 {currentStepIndex === index
																? 'border-blue-500 bg-blue-50'
																: 'opacity-50'}"
														>
															<div class="flex items-start justify-between">
																<span class="font-bold">Schritt {index + 1}</span>
																{#if step?.timerMinutes}
																	<Button
																		size="sm"
																		variant="outline"
																		onclick={() => startTimer(step.timerMinutes)}
																	>
																		⏲ {step.timerMinutes} Min starten
																	</Button>
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

															{#if currentStepIndex === index && step?.instruction}
																<Button class="mt-2 w-full" onclick={() => currentStepIndex++}>
																	Schritt erledigt
																</Button>
															{/if}
														</div>
													{/each}
												</div>
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
							<span class="text-sm font-medium">Step-Chef überlegt...</span>
						</CardContent>
					</Card>
				</div>
			</div>
		{/if}
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
