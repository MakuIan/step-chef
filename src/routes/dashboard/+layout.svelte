<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import AppHeader from '$lib/components/ui/header/app-header.svelte';
	import type { Snippet } from 'svelte';
	import type { PageData } from './$types';
	import { Menu, Pencil, Trash2, Check, X, AlertTriangle } from 'lucide-svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { ConvexClient } from 'convex/browser';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { api } from '../../../convex/_generated/api';
	import { invalidateAll, goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { page } from '$app/state';
	interface Props {
		children: Snippet;
		data: PageData;
	}

	let { children, data }: Props = $props();

	// Auf Mobile starten wir standardmäßig geschlossen, auf Desktop geöffnet
	let isSidebarOpen = $state(true);

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	let editingChatId = $state<string | null>(null);
	let editingTitle = $state('');

	let chatToDelete = $state<{ id: string; title: string } | null>(null);
	let isDeleting = $state(false);

	const convexClient = new ConvexClient(PUBLIC_CONVEX_URL);

	async function handleUpdateTitle(chatId: string) {
		if (editingTitle.trim()) {
			await convexClient.mutation(api.chat.updateTitle, {
				chatId: chatId as any,
				title: editingTitle
			});
			editingChatId = null;
			await invalidateAll();
		}
	}

	async function confirmDeleteChat() {
		if (!chatToDelete) return;
		isDeleting = true;
		const targetId = chatToDelete.id;
		try {
			await convexClient.mutation(api.chat.deleteChat, {
				chatId: targetId as any
			});
			await invalidateAll();
			if (page.params.chatId === targetId) {
				goto(localizeHref('/dashboard'));
			}
		} finally {
			isDeleting = false;
			chatToDelete = null;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<AppHeader />
	<div class="relative flex flex-1">
		
		{#if isSidebarOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm transition-opacity md:hidden"
				onclick={toggleSidebar}
			></div>
		{/if}

		
		<section
			class="absolute top-0 bottom-0 z-30 flex flex-col border-r border-border
                   bg-muted/20 transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:max-h-screen
                   {isSidebarOpen
				? 'w-3/4 max-w-xs translate-x-0 p-4 opacity-100 md:w-1/5'
				: 'pointer-events-none w-0 -translate-x-full p-0 opacity-0 md:translate-x-0'}"
		>
			<div class="flex h-full w-full min-w-50 flex-col overflow-hidden">
				<Button class="mb-4 w-full shrink-0" href={localizeHref('/dashboard')}
					>{m['chat.new_recipe']()}</Button
				>
				<ul class="flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
					{#each data.chats as chat (chat._id)}
						<li
							class="group relative flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
						>
							{#if editingChatId === chat._id}
								<div class="flex w-full items-center gap-2">
									<!-- svelte-ignore a11y_autofocus -->
									<input
										type="text"
										bind:value={editingTitle}
										class="w-full min-w-0 flex-1 rounded border bg-background px-2 py-1 text-sm"
										onkeydown={(e) => {
											if (e.key === 'Enter') handleUpdateTitle(chat._id);
											if (e.key === 'Escape') editingChatId = null;
										}}
										autofocus
									/>
									<button
										onclick={(e) => {
											e.preventDefault();
											handleUpdateTitle(chat._id);
										}}
										class="text-green-600 hover:text-green-700"
									>
										<Check class="h-4 w-4" />
									</button>
									<button
										onclick={(e) => {
											e.preventDefault();
											editingChatId = null;
										}}
										class="text-red-600 hover:text-red-700"
									>
										<X class="h-4 w-4" />
									</button>
								</div>
							{:else}
								<a href={localizeHref(`/dashboard/${chat._id}`)} class="flex-1 truncate">
									{chat.title}
								</a>
								<div class="hidden gap-1 group-hover:flex">
									<button
										onclick={(e) => {
											e.preventDefault();
											editingChatId = chat._id;
											editingTitle = chat.title;
										}}
										class="p-1 text-muted-foreground hover:text-foreground"
										title={m['chat.rename']()}
									>
										<Pencil class="h-4 w-4" />
									</button>
									<button
										onclick={(e) => {
											e.preventDefault();
											chatToDelete = { id: chat._id, title: chat.title };
										}}
										class="p-1 text-muted-foreground hover:text-destructive"
										title={m['chat.delete']()}
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</section>

		
		<section class="relative flex flex-1 flex-col transition-all duration-300">
			<div class="sticky top-4 left-4 z-10 mt-4 ml-4 w-fit">
				<Button variant="outline" size="icon" onclick={toggleSidebar}>
					<Menu class="h-4 w-4" />
				</Button>
			</div>

			<div class="flex-1 p-4 pt-4 md:p-8 md:pt-4">
				{@render children()}
			</div>
		</section>
	</div>
</div>

{#if chatToDelete}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
		onclick={() => (chatToDelete = null)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl transition-all"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (chatToDelete = null)}
		>
			<div class="flex items-start gap-4">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
				>
					<AlertTriangle class="h-5 w-5" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-foreground">
						{m['chat.delete_confirm_title']()}
					</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						{m['chat.delete_confirm_description']({ title: chatToDelete.title })}
					</p>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<Button variant="outline" disabled={isDeleting} onclick={() => (chatToDelete = null)}>
					{m['chat.cancel']()}
				</Button>
				<Button variant="destructive" disabled={isDeleting} onclick={confirmDeleteChat}>
					{#if isDeleting}
						{m['chat.thinking']()}
					{:else}
						{m['chat.delete']()}
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}
