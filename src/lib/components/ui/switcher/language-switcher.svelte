<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { User, Settings, LogOut, Languages } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { i18n } from '$lib/i18n.js';
	import { page } from '$app/stores';
</script>

<DropdownMenu.Root>
	<!-- Der Button, der das Menü öffnet -->
	<DropdownMenu.Trigger asChild let:builder>
		<Button builders={[builder]} variant="outline" size="icon" class="rounded-full">
			<User class="h-5 w-5 text-stone-600" />
			<span class="sr-only">Menü öffnen</span>
		</Button>
	</DropdownMenu.Trigger>

	<!-- Das eigentliche Menü -->
	<DropdownMenu.Content class="w-56" align="end">
		<DropdownMenu.Label>Mein Haushalt</DropdownMenu.Label>
		<DropdownMenu.Separator />

		<DropdownMenu.Group>
			<DropdownMenu.Item>
				<Settings class="mr-2 h-4 w-4" />
				<span>Einstellungen</span>
			</DropdownMenu.Item>

			<!-- Ein Sub-Menü für die Spracheingabe -->
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Languages class="mr-2 h-4 w-4" />
					<span>Sprache</span>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<DropdownMenu.Item href={i18n.route($page.url.pathname)} hreflang="de">
						Deutsch
					</DropdownMenu.Item>
					<DropdownMenu.Item href={i18n.route($page.url.pathname)} hreflang="en">
						English
					</DropdownMenu.Item>
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		</DropdownMenu.Group>

		<DropdownMenu.Separator />

		<!-- Logout Button -->
		<DropdownMenu.Item class="text-red-600 focus:text-red-600">
			<LogOut class="mr-2 h-4 w-4" />
			<span>{m.btn_sign_out()}</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
