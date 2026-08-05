<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { ChefHat } from 'lucide-svelte'; // Optional: if you use lucide icons
	import * as m from '$lib/paraglide/messages';

	let isSubmitting = $state(false);
	let selectedModel = $state('gemini-3.5-flash-lite');

	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('step_chef_selected_model');
			if (saved) selectedModel = saved;
		}
	});

	function handleModelChange(newModel: string) {
		selectedModel = newModel;
		if (typeof window !== 'undefined') {
			localStorage.setItem('step_chef_selected_model', newModel);
		}
	}
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
			{m['chat.new_chat_subtitle']()}
		</p>
	</div>

	<form
		method="POST"
		action="?/newChat"
		class="w-full max-w-2xl flex flex-col gap-3"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<div class="flex justify-end items-center gap-2">
			<span class="text-xs font-medium text-gray-500">Modell:</span>
			<select
				value={selectedModel}
				onchange={(e) => handleModelChange(e.currentTarget.value)}
				disabled={isSubmitting}
				class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
			>
				<option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Google)</option>
			</select>
		</div>

		<div
			class="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
		>
			<Input
				name="message"
				placeholder={m['chat.new_chat_placeholder']()}
				class="border-0 py-6 text-lg shadow-none focus-visible:ring-0 flex-1"
				disabled={isSubmitting}
				required
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<Button type="submit" disabled={isSubmitting} class="h-12 px-6">
				{isSubmitting ? m['chat.new_chat_starting']() : m['chat.new_chat_go']()}
			</Button>
		</div>
	</form>
</div>
