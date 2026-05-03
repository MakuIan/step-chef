<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { ChefHat } from 'lucide-svelte'; // Optional: if you use lucide icons

	let isSubmitting = $state(false);
</script>

<div class="flex h-screen flex-col items-center justify-center bg-gray-50 px-4">
	<div class="mb-8 flex flex-col items-center text-center">
		<!-- Optional Icon/Logo -->
		<div
			class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600"
		>
			<ChefHat size={32} />
		</div>
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Step-Chef</h1>
		<p class="text-gray-500">
			Was möchtest du heute kochen? Gib Zutaten ein oder frage nach einer Idee.
		</p>
	</div>

	<form
		method="POST"
		action="?/newChat"
		class="w-full max-w-2xl"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<div
			class="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
		>
			<Input
				name="message"
				placeholder="z.B. Ich habe Hühnchen, Reis und Paprika..."
				class="border-0 py-6 text-lg shadow-none focus-visible:ring-0"
				disabled={isSubmitting}
				required
			/>
			<Button type="submit" disabled={isSubmitting} class="h-12 px-6">
				{isSubmitting ? 'Startet...' : 'Los!'}
			</Button>
		</div>
	</form>
</div>
