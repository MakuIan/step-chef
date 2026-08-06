<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Check, Flame, Utensils, GlassWater, CookingPot, Wrench, Key, RefreshCw, Eye, EyeOff } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { ConvexClient } from 'convex/browser';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import { api } from '../../../../../convex/_generated/api';
	import { authClient } from '$lib/auth-client';

	let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

	let stoveMaxLevel = $state(9);
	let stoveType = $state('Induktion');
	let availableCookware = $state<string[]>([
		'Beschichtete Pfanne',
		'Wok',
		'Suppentopf',
		'Edelstahlpfanne'
	]);
	let enabledEquipments = $state<string[]>(['stove', 'oven', 'grill', 'barware', 'airfryer']);
	let openrouterApiKey = $state('');
	let showApiKey = $state(false);

	let isSaving = $state(false);
	let saveMessage = $state<string | null>(null);

	let usageData = $state<{
		hasKey: boolean;
		keyType: 'custom' | 'system';
		label?: string;
		usage?: number;
		limit?: number | null;
		limitRemaining?: number | null;
		isFreeTier?: boolean;
		rateLimit?: { requests?: number; interval?: string } | null;
		error?: string;
	} | null>(null);
	let isLoadingUsage = $state(false);

	const convexClient = new ConvexClient(PUBLIC_CONVEX_URL);
	const session = authClient.useSession();

	const ALL_COOKWARE = [
		{ id: 'Beschichtete Pfanne', get label() { return m['settings.cookware_nonstick'](); } },
		{ id: 'Edelstahlpfanne', get label() { return m['settings.cookware_stainless'](); } },
		{ id: 'Gusseisenpfanne', get label() { return m['settings.cookware_castiron'](); } },
		{ id: 'Wok', get label() { return m['settings.cookware_wok'](); } },
		{ id: 'Suppentopf', get label() { return m['settings.cookware_stockpot'](); } },
		{ id: 'Bräter', get label() { return m['settings.cookware_roaster'](); } },
		{ id: 'Schnellkochtopf', get label() { return m['settings.cookware_pressure'](); } },
		{ id: 'Kasserolle', get label() { return m['settings.cookware_saucepan'](); } }
	];

	const ALL_EQUIPMENTS = [
		{ id: 'stove', get label() { return m['settings.eq_stove'](); }, icon: CookingPot },
		{ id: 'grill', get label() { return m['settings.eq_grill'](); }, icon: Flame },
		{ id: 'barware', get label() { return m['settings.eq_barware'](); }, icon: GlassWater },
		{ id: 'oven', get label() { return m['settings.eq_oven'](); }, icon: Utensils },
		{ id: 'airfryer', get label() { return m['settings.eq_airfryer'](); }, icon: Wrench }
	];

	async function fetchUsage() {
		isLoadingUsage = true;
		try {
			const res = await fetch('/api/openrouter/usage');
			if (res.ok) {
				usageData = await res.json();
			} else {
				const err: any = await res.json();
				usageData = { hasKey: false, keyType: 'system', error: err?.error || 'Fehler beim Laden' };
			}
		} catch (e: any) {
			console.error('Error fetching OpenRouter usage:', e);
			usageData = { hasKey: false, keyType: 'system', error: 'Netzwerkfehler beim Laden' };
		} finally {
			isLoadingUsage = false;
		}
	}

	$effect(() => {
		if (isOpen && $session.data?.user?.email) {
			convexClient
				.query(api.userSettings.getUserSettings, { email: $session.data.user.email })
				.then((settings) => {
					if (settings) {
						stoveMaxLevel = settings.stoveMaxLevel ?? 9;
						stoveType = settings.stoveType ?? 'Induktion';
						availableCookware = settings.availableCookware ?? [];
						enabledEquipments = settings.enabledEquipments ?? [];
						openrouterApiKey = settings.openrouterApiKey ?? '';
					}
				})
				.catch((err) => console.error('Error fetching settings:', err));

			fetchUsage();
		}
	});

	function toggleCookware(item: string) {
		if (availableCookware.includes(item)) {
			availableCookware = availableCookware.filter((i) => i !== item);
		} else {
			availableCookware = [...availableCookware, item];
		}
	}

	function toggleEquipment(eqId: string) {
		if (enabledEquipments.includes(eqId)) {
			enabledEquipments = enabledEquipments.filter((i) => i !== eqId);
		} else {
			enabledEquipments = [...enabledEquipments, eqId];
		}
	}

	async function handleSave() {
		if (!$session.data?.user?.email) return;
		isSaving = true;
		saveMessage = null;

		try {
			await convexClient.mutation(api.userSettings.saveUserSettings, {
				email: $session.data.user.email,
				stoveMaxLevel,
				stoveType,
				availableCookware,
				enabledEquipments,
				openrouterApiKey: openrouterApiKey.trim() || undefined
			});
			saveMessage = m['settings.saved_success']();
			fetchUsage();
			setTimeout(() => {
				saveMessage = null;
				isOpen = false;
			}, 1000);
		} catch (error) {
			console.error('Save settings error:', error);
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isOpen}
	
	
	
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
		onclick={() => (isOpen = false)}
	>
		
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-start justify-between border-b border-border pb-4">
				<div>
					<h2 class="text-xl font-bold text-foreground">{m['settings.title']()}</h2>
					<p class="mt-1 text-sm text-muted-foreground">{m['settings.subtitle']()}</p>
				</div>
				<button
					onclick={() => (isOpen = false)}
					class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="mt-6 space-y-6">
				
				<div class="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
					<h3 class="flex items-center gap-2 font-semibold text-foreground">
						<Flame class="h-5 w-5 text-orange-500" />
						{m['settings.stove_section']()}
					</h3>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label for="stove-level-select" class="block text-xs font-medium text-muted-foreground mb-1">
								{m['settings.stove_max_level']()}
							</label>
							<select
								id="stove-level-select"
								bind:value={stoveMaxLevel}
								class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value={6}>{m['settings.stove_levels_6']()}</option>
								<option value={9}>{m['settings.stove_levels_9']()}</option>
								<option value={12}>{m['settings.stove_levels_12']()}</option>
							</select>
						</div>

						<div>
							<label for="stove-type-select" class="block text-xs font-medium text-muted-foreground mb-1">
								{m['settings.stove_type']()}
							</label>
							<select
								id="stove-type-select"
								bind:value={stoveType}
								class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="Induktion">{m['settings.stove_type_induction']()}</option>
								<option value="Ceran">{m['settings.stove_type_ceramic']()}</option>
								<option value="Gas">{m['settings.stove_type_gas']()}</option>
								<option value="Elektro">{m['settings.stove_type_electric']()}</option>
							</select>
						</div>
					</div>
				</div>

				
				<div class="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
					<h3 class="flex items-center gap-2 font-semibold text-foreground">
						<CookingPot class="h-5 w-5 text-blue-500" />
						{m['settings.cookware_section']()}
					</h3>
					<div class="flex flex-wrap gap-2">
						{#each ALL_COOKWARE as cookware (cookware.id)}
							{@const isSelected = availableCookware.includes(cookware.id)}
							<button
								type="button"
								onclick={() => toggleCookware(cookware.id)}
								class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {isSelected
									? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
									: 'border-border bg-background text-muted-foreground hover:border-foreground/30'}"
							>
								{#if isSelected}
									<Check class="h-3.5 w-3.5 text-blue-500" />
								{/if}
								{cookware.label}
							</button>
						{/each}
					</div>
				</div>

				
				<div class="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
					<h3 class="flex items-center gap-2 font-semibold text-foreground">
						<GlassWater class="h-5 w-5 text-purple-500" />
						{m['settings.equipment_section']()}
					</h3>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{#each ALL_EQUIPMENTS as eq (eq.id)}
							{@const isSelected = enabledEquipments.includes(eq.id)}
							<button
								type="button"
								onclick={() => toggleEquipment(eq.id)}
								class="flex items-center justify-between rounded-xl border p-3 text-left transition-all {isSelected
									? 'border-purple-500 bg-purple-500/10 text-foreground font-medium'
									: 'border-border bg-background text-muted-foreground hover:border-foreground/30'}"
							>
								<span class="text-sm">{eq.label}</span>
								{#if isSelected}
									<Check class="h-4 w-4 text-purple-600 dark:text-purple-400" />
								{/if}
							</button>
						{/each}
					</div>
				</div>

				
				<div class="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
					<h3 class="flex items-center gap-2 font-semibold text-foreground">
						<Key class="h-5 w-5 text-emerald-500" />
						{m['settings.openrouter_section']()}
					</h3>

					<div class="space-y-3">
						<div>
							<label for="openrouter-key-input" class="block text-xs font-medium text-muted-foreground mb-1">
								{m['settings.openrouter_key_label']()}
							</label>
							<div class="relative flex items-center">
								<input
									id="openrouter-key-input"
									type={showApiKey ? 'text' : 'password'}
									bind:value={openrouterApiKey}
									placeholder={m['settings.openrouter_key_placeholder']()}
									class="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
								/>
								<button
									type="button"
									onclick={() => (showApiKey = !showApiKey)}
									class="absolute right-2 text-muted-foreground hover:text-foreground p-1"
									title={showApiKey ? 'Ausblenden' : 'Anzeigen'}
								>
									{#if showApiKey}
										<EyeOff class="h-4 w-4" />
									{:else}
										<Eye class="h-4 w-4" />
									{/if}
								</button>
							</div>
							<p class="mt-1 text-xs text-muted-foreground">
								{m['settings.openrouter_key_help']()}
							</p>
						</div>

						
						<div class="rounded-lg border border-border bg-card p-3 space-y-2">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-muted-foreground">
										{m['settings.openrouter_usage_title']()}
									</span>
									{#if usageData}
										{#if usageData.keyType === 'custom'}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
												{m['settings.openrouter_key_custom']()}
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
												{m['settings.openrouter_key_system']()}
											</span>
										{/if}
									{/if}
								</div>

								<button
									type="button"
									onclick={fetchUsage}
									disabled={isLoadingUsage}
									class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
								>
									<RefreshCw class="h-3.5 w-3.5 {isLoadingUsage ? 'animate-spin' : ''}" />
									{m['settings.openrouter_refresh_usage']()}
								</button>
							</div>

							{#if isLoadingUsage && !usageData}
								<div class="py-2 text-center text-xs text-muted-foreground animate-pulse">
									Lade Verbrauchsdaten...
								</div>
							{:else if usageData?.error}
								<div class="text-xs text-destructive">
									{usageData.error}
								</div>
							{:else if usageData}
								<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
									<div class="bg-muted/40 rounded-md p-2">
										<div class="text-[11px] text-muted-foreground">{m['settings.openrouter_usage_used']()}</div>
										<div class="text-sm font-semibold text-foreground font-mono">
											${usageData.usage !== undefined ? usageData.usage.toFixed(4) : '0.0000'}
										</div>
									</div>

									<div class="bg-muted/40 rounded-md p-2">
										<div class="text-[11px] text-muted-foreground">{m['settings.openrouter_usage_limit']()}</div>
										<div class="text-sm font-semibold text-foreground font-mono">
											{usageData.limit !== null && usageData.limit !== undefined
												? `$${usageData.limit.toFixed(2)}`
												: 'Unbegrenzt'}
										</div>
									</div>

									<div class="bg-muted/40 rounded-md p-2 col-span-2 sm:col-span-1">
										<div class="text-[11px] text-muted-foreground">{m['settings.openrouter_ratelimit_label']()}</div>
										<div class="text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
											{usageData.rateLimit && usageData.rateLimit.requests && usageData.rateLimit.requests > 0
												? `${usageData.rateLimit.requests} / ${usageData.rateLimit.interval}`
												: 'Standard (20 req/min)'}
										</div>
									</div>
								</div>

								{#if usageData.isFreeTier}
									<div class="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
										<div class="flex items-center gap-1.5 font-semibold">
											<span>🎁</span>
											<span>{m['settings.openrouter_freetier_badge']()}</span>
										</div>
										<p class="text-[11px] opacity-90 leading-relaxed">
											{m['settings.openrouter_freetier_info']()}
										</p>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</div>
			</div>

			
			<div class="mt-6 flex items-center justify-between border-t border-border pt-4">
				{#if saveMessage}
					<span class="text-sm font-semibold text-green-600 dark:text-green-400">
						{saveMessage}
					</span>
				{:else}
					<span></span>
				{/if}

				<div class="flex gap-2">
					<Button variant="outline" onclick={() => (isOpen = false)}>
						{m['chat.cancel']()}
					</Button>
					<Button onclick={handleSave} disabled={isSaving}>
						{isSaving ? m['settings.saving']() : m['settings.save']()}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
