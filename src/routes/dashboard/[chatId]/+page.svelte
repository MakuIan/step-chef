<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { fly } from 'svelte/transition';
	import { DefaultChatTransport } from 'ai';

	const chat = new Chat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
			body: {
				chatId: 'your-current-chat-id'
			}
		})
	});

	let inputValue = $state('');

	function handleFormSubmit(e: Event) {
		e.preventDefault();
		if (!inputValue.trim()) return;

		chat.sendMessage({ text: inputValue });
		inputValue = '';
	}

	function handleRecipeSelection(selectedRecipeTitle: string) {
		chat.sendMessage({
			text: `Ich wähle: ${selectedRecipeTitle}. Bitte erstelle das genaue Kochrezept mit allen Schritten und Timern.`
		});
	}

	type RecipeSuggestionArgs = {
		recipes: {
			title: string;
			prepTimeMinutes: number;
			difficulty: 'easy' | 'medium' | 'hard';
			description: string;
			ingredients: {
				name: string;
				menge: string;
			}[];
		}[];
	};
</script>

<div class="flex h-screen max-h-screen flex-col bg-gray-50">
	<!-- Chat History Area -->
	<main class="flex-1 space-y-4 overflow-y-auto p-4 pb-24">
		{#each chat.messages as message (message.id)}
			<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'} w-full">
				<div class="max-w-[80%]">
					{#if message.role === 'user'}
						<div class="rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-white shadow-sm">
							<!-- Loop through parts for user messages -->
							{#each message.parts as part, index (index)}
								{#if part.type === 'text'}
									{part.text}
								{/if}
							{/each}
						</div>
					{:else}
						<!-- Assistant Message Container -->
						<Card>
							<CardContent class="flex flex-col gap-4 p-4">
								<!-- Loop through parts for assistant messages -->
								{#each message.parts as part, index (index)}
									<!-- 1. Render normal text -->
									{#if part.type === 'text'}
										<p class="text-gray-800">{part.text}</p>
									{/if}
									{#if 'toolName' in part && part.toolName === 'suggest_recipes'}
										{@const toolInput = part.input as RecipeSuggestionArgs}

										<!-- 2. Render Tool Calls (Your Recipes!) -->
										{#if toolInput && toolInput.recipes}
											<div class="mt-2 flex flex-col gap-2">
												<p class="text-sm font-semibold text-gray-500">Vorgeschlagene Rezepte:</p>
												<div class="flex flex-row flex-wrap gap-4">
													{#each toolInput.recipes as recipe, index (index)}
														<div
															class="min-w-60 flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:translate-y-1 hover:border-blue-300 hover:shadow-md"
															in:fly={{ y: 30, duration: 400, delay: index * 50 }}
															onclick={() => handleRecipeSelection(recipe.title)}
															onkeydown={(e) =>
																e.key === 'Enter' && handleRecipeSelection(recipe.title)}
															tabindex="0"
															role="button"
														>
															<h4 class="font-bold">{recipe.title}</h4>
															<p class="text-sm text-gray-600">{recipe.description}</p>
															<div class="mt-1 flex gap-2 text-xs text-gray-500">
																<span>⏱️ {recipe.prepTimeMinutes} min</span>
																<span class="capitalize">🍳 {recipe.difficulty}</span>
															</div>
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
				</div>
			</div>
		{/each}

		{#if chat.status === 'streaming' || chat.status === 'submitted'}
			<div class="flex w-full justify-start">
				<div class="animate-pulse rounded-2xl rounded-tl-sm bg-gray-200 px-4 py-2 text-gray-500">
					Thinking...
				</div>
			</div>
		{/if}
	</main>

	<!-- Chat Input Bar -->
	<div class="fixed right-0 bottom-0 left-0 border-t bg-white p-4">
		<form onsubmit={handleFormSubmit} class="mx-auto flex max-w-4xl items-center gap-2">
			<Input
				bind:value={inputValue}
				placeholder="What do you want to cook today?"
				class="flex-1"
				disabled={chat.status === 'streaming' || chat.status === 'submitted'}
			/>
			<Button
				type="submit"
				disabled={chat.status === 'streaming' || chat.status === 'submitted' || !inputValue.trim()}
			>
				Send
			</Button>
		</form>
	</div>
</div>
