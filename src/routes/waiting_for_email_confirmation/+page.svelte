<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as m from '$lib/paraglide/messages';
</script>

<main class="flex items-center justify-center p-4">
	<Card.Root class="w-full max-w-md text-center">
		<Card.Header>
			<Card.Title class="text-2xl font-bold tracking-tight"
				>{m['email_confirmation.title']()}</Card.Title
			>
			<Card.Description>
				{m['email_confirmation.description']()}
			</Card.Description>
		</Card.Header>
	</Card.Root>
</main>
