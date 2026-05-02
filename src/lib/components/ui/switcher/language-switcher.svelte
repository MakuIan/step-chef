<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { User, Settings, LogOut, Languages } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { setLocale } from '$lib/paraglide/runtime';

	const switchLanguage = (locale: 'de' | 'en') => {
		setLocale(locale);
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="icon" class="rounded-full">
				<User class="h-5 w-5 text-stone-600" />
				<span class="sr-only">Menü öffnen</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-56" align="end">
		<DropdownMenu.Label>Mein Haushalt</DropdownMenu.Label>
		<DropdownMenu.Separator />

		<DropdownMenu.Group>
			<DropdownMenu.Item>
				<Settings class="mr-2 h-4 w-4" />
				<span>Einstellungen</span>
			</DropdownMenu.Item>

			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Languages class="mr-2 h-4 w-4" />
					<span>Sprache</span>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item onclick={() => switchLanguage('de')}>Deutsch</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => switchLanguage('en')}>English</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		</DropdownMenu.Group>

		<DropdownMenu.Separator />

		<DropdownMenu.Item class="text-red-600 focus:text-red-600">
			<LogOut class="mr-2 h-4 w-4" />
			<span>{m.btn_sign_out()}</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
