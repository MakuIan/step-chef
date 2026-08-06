<script>
	import DropdownSettings from '../settings/dropdown-settings.svelte';
	import logo from '$lib/assets/logo.svg';
</script>

<header class="flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-xs">
	<a href="/dashboard" class="flex items-center gap-2.5 transition-opacity hover:opacity-90">
		<img src={logo} alt="Step-Chef Logo" class="h-9 w-auto" />
	</a>
	<DropdownSettings />
</header>

