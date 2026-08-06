<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { User, Settings, LogOut, Languages } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { localizeHref, setLocale } from '$lib/paraglide/runtime';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import SettingsModal from './settings-modal.svelte';

	interface Props {
		collapsed?: boolean;
		onOpenSettings?: () => void;
	}

	let { collapsed = false, onOpenSettings }: Props = $props();

	let internalSettingsOpen = $state(false);

	function openSettings() {
		if (onOpenSettings) {
			onOpenSettings();
		} else {
			internalSettingsOpen = true;
		}
	}

	const switchLanguage = (locale: 'de' | 'en') => {
		setLocale(locale);
	};
	async function handleLogout() {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					await goto(localizeHref('/login'));
				}
			}
		});
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			{#if collapsed}
				<Button
					{...props}
					variant="ghost"
					size="icon"
					class="h-10 w-10 rounded-xl hover:bg-accent text-foreground shrink-0"
					title={m['dropdown.settings']()}
				>
					<User class="h-5 w-5" />
				</Button>
			{:else}
				<Button
					{...props}
					variant="ghost"
					class="w-full justify-start gap-3 px-2 py-5 rounded-xl hover:bg-accent text-foreground"
				>
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20"
					>
						<User class="h-4 w-4" />
					</div>
					<div class="flex flex-col items-start min-w-0 text-left flex-1">
						<span class="text-xs font-semibold truncate text-foreground leading-tight"
							>{m['dropdown.settings']()}</span
						>
						<span class="text-[11px] text-muted-foreground truncate leading-tight"
							>{m['dropdown.language']()}</span
						>
					</div>
				</Button>
			{/if}
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-56" align="start">
		<DropdownMenu.Group>
			<DropdownMenu.Item onclick={openSettings}>
				<Settings class="mr-2 h-4 w-4" />
				<span>{m['dropdown.settings']()}</span>
			</DropdownMenu.Item>
		</DropdownMenu.Group>
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger>
				<Languages class="mr-2 h-4 w-4" />
				<span>{m['dropdown.language']()}</span>
			</DropdownMenu.SubTrigger>
			<DropdownMenu.Portal>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onclick={() => switchLanguage('de')}>Deutsch</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => switchLanguage('en')}>English</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Portal>
		</DropdownMenu.Sub>

		<DropdownMenu.Separator />

		<DropdownMenu.Item class="text-red-600 focus:text-red-600" onclick={handleLogout}>
			<LogOut class="mr-2 h-4 w-4" />
			<span>{m['dropdown.btn_sign_out']()}</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

{#if !onOpenSettings}
	<SettingsModal bind:isOpen={internalSettingsOpen} />
{/if}
