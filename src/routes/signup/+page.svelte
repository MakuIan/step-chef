<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
</script>

<main class="flex items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<Card.Title class="text-2xl font-bold tracking-tight">
				{m['auth.welcome']()}
			</Card.Title>
			<Card.Description>
				{m['auth.label_sign_up']()}
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			<form action="?/register">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" placeholder={m['auth.email_placeholder']()} />
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						placeholder={m['auth.password_placeholder']()}
					/>
				</div>
				<Button class="w-full">
					{m['auth.sign_up']()}
				</Button>
			</form>
			<Card.Footer>
				<p class="text-sm text-muted-foreground">
					{m['auth.to_sign_in']()}
					<a href={resolve('/login')} class="font-medium text-primary hover:underline"> Sign in </a>
				</p>
			</Card.Footer>
		</Card.Content>
	</Card.Root>
</main>
