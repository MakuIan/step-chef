<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';
</script>

<main class="flex h-screen items-center justify-center bg-stone-50 p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<Card.Title class="text-2xl font-bold tracking-tight">{m['login.welcome']}</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" placeholder={m['login.email_placeholder']()} />
			</div>
			<Button class="w-full">
				{m['login.sign_in']}
			</Button>
		</Card.Content>
	</Card.Root>
</main>
