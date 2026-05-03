<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import AppHeader from '$lib/components/ui/header/app-header.svelte';
	import type { Snippet } from 'svelte';
	import type { PageData } from './$types';
	import { Menu } from 'lucide-svelte';
	import { localizeHref } from '$lib/paraglide/runtime';

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
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background">
	<AppHeader />
	<div class="relative flex flex-1 overflow-hidden">
		<!-- Overlay für Mobile: Dunkelt den Hintergrund ab, wenn Sidebar offen ist -->
		{#if isSidebarOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm transition-opacity md:hidden"
				onclick={toggleSidebar}
			></div>
		{/if}

		<!-- SideBar -->
		<section
			class="absolute top-0 bottom-0 z-30 flex flex-col overflow-hidden border-r border-border
                   bg-muted/20 transition-all duration-300 ease-in-out md:relative
                   {isSidebarOpen
				? 'w-3/4 max-w-xs translate-x-0 p-4 opacity-100 md:w-1/5'
				: 'pointer-events-none w-0 -translate-x-full p-0 opacity-0 md:translate-x-0'}"
		>
			<div class="flex w-full min-w-50 flex-col">
				<Button class="mb-4 w-full" href={localizeHref('/dashboard')}>New Recipe</Button>
				<ul class="flex flex-col gap-2 overflow-y-auto">
					{#each data.chats as chat (chat.id)}
						<li class="cursor-pointer truncate rounded-md p-2 transition-colors hover:bg-muted">
							<a href={localizeHref(`/dashboard/${chat.id}`)}>
								{chat.title}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- Chat Area -->
		<section class="relative flex flex-1 flex-col overflow-hidden transition-all duration-300">
			<div class="absolute top-4 left-4 z-10">
				<Button variant="outline" size="icon" onclick={toggleSidebar}>
					<Menu class="h-4 w-4" />
				</Button>
			</div>

			<div class="flex-1 overflow-y-auto p-4 pt-16 md:p-8 md:pt-16">
				{@render children()}
			</div>
		</section>
	</div>
</div>
