<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import DropdownSettings from '$lib/components/ui/settings/dropdown-settings.svelte';
	import SettingsModal from '$lib/components/ui/settings/settings-modal.svelte';
	import logoIcon from '$lib/assets/logo-icon.svg';
	import type { Snippet } from 'svelte';
	import type { PageData } from './$types';
	import {
		Pencil,
		Trash2,
		Check,
		X,
		AlertTriangle,
		ChefHat,
		PanelLeftClose,
		PanelLeftOpen,
		MessageSquare
	} from 'lucide-svelte';
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
	let isSettingsOpen = $state(false);

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

<div class="flex h-screen w-screen overflow-hidden bg-background">
	<!-- Mobile Backdrop Overlay -->
	{#if isSidebarOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity md:hidden"
			onclick={toggleSidebar}
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out md:static md:z-auto
               {isSidebarOpen
			? 'w-64 max-w-[85vw] translate-x-0 p-3 shadow-xl md:shadow-none'
			: 'w-16 -translate-x-full p-2 md:translate-x-0'}"
	>
		<!-- Top Section: Logo & Collapse Button -->
		<div class="flex h-12 items-center justify-between gap-2 px-1 py-1 shrink-0">
			{#if isSidebarOpen}
				<a
					href={localizeHref('/dashboard')}
					class="flex items-center gap-2.5 transition-opacity hover:opacity-90 min-w-0"
				>
					<img src={logoIcon} alt="Step-Chef Logo" class="h-9 w-9 object-contain shrink-0" />
					<span class="text-xl font-bold tracking-tight text-foreground truncate">Step-Chef</span>
				</a>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
					onclick={toggleSidebar}
					title="Sidebar einklappen"
				>
					<PanelLeftClose class="h-4 w-4" />
				</Button>
			{:else}
				<button
					onclick={toggleSidebar}
					class="flex h-10 w-full items-center justify-center transition-opacity hover:opacity-90"
					title="Sidebar ausklappen"
				>
					<img src={logoIcon} alt="Step-Chef Logo" class="h-8 w-8 object-contain shrink-0" />
				</button>
			{/if}
		</div>

		<!-- New Recipe Action Button with ChefHat Icon -->
		<div class="mt-3 mb-2 shrink-0">
			{#if isSidebarOpen}
				<Button class="w-full justify-start gap-2.5 shadow-xs font-semibold" href={localizeHref('/dashboard')}>
					<ChefHat class="h-4 w-4 text-primary-foreground shrink-0" />
					<span class="truncate">{m['chat.new_recipe']()}</span>
				</Button>
			{:else}
				<Button
					variant="outline"
					size="icon"
					class="h-10 w-10 mx-auto flex items-center justify-center rounded-xl shadow-xs border-border bg-card hover:bg-accent text-primary"
					href={localizeHref('/dashboard')}
					title={m['chat.new_recipe']()}
				>
					<ChefHat class="h-5 w-5" />
				</Button>
			{/if}
		</div>

		<!-- Chat History List (ONLY this section scrolls!) -->
		<div class="flex-1 overflow-y-auto min-h-0 py-1">
			{#if isSidebarOpen}
				<ul class="flex flex-col gap-1">
					{#each data.chats as chat (chat._id)}
						<li
							class="group relative flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent text-foreground"
						>
							{#if editingChatId === chat._id}
								<div class="flex w-full items-center gap-2">
									<!-- svelte-ignore a11y_autofocus -->
									<input
										type="text"
										bind:value={editingTitle}
										class="w-full min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs"
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
										class="text-green-600 hover:text-green-700 p-0.5"
									>
										<Check class="h-3.5 w-3.5" />
									</button>
									<button
										onclick={(e) => {
											e.preventDefault();
											editingChatId = null;
										}}
										class="text-red-600 hover:text-red-700 p-0.5"
									>
										<X class="h-3.5 w-3.5" />
									</button>
								</div>
							{:else}
								<a
									href={localizeHref(`/dashboard/${chat._id}`)}
									class="flex-1 truncate font-medium text-xs sm:text-sm"
								>
									{chat.title}
								</a>
								<div class="hidden gap-1 group-hover:flex shrink-0">
									<button
										onclick={(e) => {
											e.preventDefault();
											editingChatId = chat._id;
											editingTitle = chat.title;
										}}
										class="p-1 text-muted-foreground hover:text-foreground"
										title={m['chat.rename']()}
									>
										<Pencil class="h-3.5 w-3.5" />
									</button>
									<button
										onclick={(e) => {
											e.preventDefault();
											chatToDelete = { id: chat._id, title: chat.title };
										}}
										class="p-1 text-muted-foreground hover:text-destructive"
										title={m['chat.delete']()}
									>
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<div class="flex flex-col items-center gap-2 pt-1">
					{#each data.chats as chat (chat._id)}
						<a
							href={localizeHref(`/dashboard/${chat._id}`)}
							class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
							title={chat.title}
						>
							<MessageSquare class="h-4 w-4" />
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Bottom Section: User Profile & Settings (ALWAYS VISIBLE AT BOTTOM) -->
		<div class="border-t border-border pt-2 pb-1 shrink-0 flex justify-center">
			<DropdownSettings
				collapsed={!isSidebarOpen}
				onOpenSettings={() => (isSettingsOpen = true)}
			/>
		</div>
	</aside>

	<!-- Main Content Area -->
	<main class="flex flex-1 flex-col overflow-hidden bg-background">
		<!-- Header Toggle Bar when sidebar is collapsed or on mobile -->
		<header
			class="flex h-12 items-center justify-between border-b border-border px-4 py-2 shrink-0 {isSidebarOpen
				? 'md:hidden'
				: 'flex'}"
		>
			<div class="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					onclick={toggleSidebar}
					class="h-8 w-8 text-muted-foreground hover:text-foreground"
					title="Sidebar ausklappen"
				>
					<PanelLeftOpen class="h-4 w-4" />
				</Button>
				{#if !isSidebarOpen}
					<span class="text-sm font-semibold text-foreground">Step-Chef</span>
				{/if}
			</div>
		</header>

		<div class="flex-1 overflow-y-auto">
			{@render children()}
		</div>
	</main>
</div>

<!-- Global Settings Modal (Opens centered in the app window) -->
<SettingsModal bind:isOpen={isSettingsOpen} />

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
