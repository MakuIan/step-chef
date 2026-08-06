<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Check, Flame, Utensils, GlassWater, CookingPot, Wrench } from 'lucide-svelte';
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

	let isSaving = $state(false);
	let saveMessage = $state<string | null>(null);

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
					}
				})
				.catch((err) => console.error('Error fetching settings:', err));
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
				enabledEquipments
			});
			saveMessage = m['settings.saved_success']();
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
	<!-- Modal Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
		onclick={() => (isOpen = false)}
	>
		<!-- Modal Content Container -->
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
				<!-- Herdstufen & Herdtyp -->
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

				<!-- Vorhandene Töpfe & Pfannen -->
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

				<!-- Zubereitungsarten & Stationen -->
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
			</div>

			<!-- Footer -->
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
