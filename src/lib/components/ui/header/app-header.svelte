<script>
	import DropdownSettings from '../settings/dropdown-settings.svelte';
	import logoIcon from '$lib/assets/logo-icon.svg';
</script>

<header class="flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-xs">
	<a href="/dashboard" class="flex items-center gap-2.5 transition-opacity hover:opacity-90">
		<img src={logoIcon} alt="Step-Chef Logo" class="h-10 w-10 object-contain shrink-0" />
		<span class="text-xl font-bold tracking-tight text-foreground">Step-Chef</span>
	</a>
	<DropdownSettings />
</header>

