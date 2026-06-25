<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let loading = $state(false);

	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		errorMessage = '';

		const { data, error } = await authClient.signUp.email({
			email,
			password,
			name: email.split('@')[0],
			callbackURL: localizeHref('/dashboard')
		});

		loading = false;
		if (error) {
			console.error('Registration error:', error);
			errorMessage = error.message || 'Registrierung fehlgeschlagen';
		} else {
			await goto(resolve(localizeHref('/waiting_for_email_confirmation')));
		}
	}
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
			<form onsubmit={handleRegister}>
				{#if errorMessage}
					<div class="text-sm text-red-500 mb-2">{errorMessage}</div>
				{/if}
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" bind:value={email} placeholder={m['auth.email_placeholder']()} required />
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						bind:value={password}
						placeholder={m['auth.password_placeholder']()}
						required
					/>
				</div>
				<Button class="w-full" type="submit" disabled={loading}>
					{#if loading}
						Lade...
					{:else}
						{m['auth.sign_up']()}
					{/if}
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
