<script lang="ts">
	import { goto } from '$app/navigation';
	import { LEVEL_LABELS } from '$lib/types';
	import { setReps, reps as storeReps } from '$lib/store';
	import RepCard from '$lib/components/RepCard.svelte';

	let address = $state('');
	let matchedAddress = $state('');
	let loading = $state(false);
	let error = $state('');
	let searched = $state(false);

	// Show reps already in the store if the user navigated back.
	let reps = $derived($storeReps);

	async function lookup() {
		if (!address.trim()) return;
		loading = true;
		error = '';
		searched = false;

		try {
			const res = await fetch('/api/reps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error ?? 'Lookup failed';
				return;
			}

			setReps(data.reps, address);
			matchedAddress = data.matchedAddress;
			searched = true;
		} catch {
			error = 'Network error — please try again';
		} finally {
			loading = false;
		}
	}

	const levels = ['federal', 'state', 'metro', 'county', 'city', 'school', 'special'] as const;

	function repsByLevel(level: string) {
		return reps.filter((r) => r.level === level);
	}
</script>

<svelte:head>
	<title>Find your representatives — Civitas</title>
</svelte:head>

<div class="container" style="padding-top: 2.5rem; padding-bottom: 4rem;">
	<h1>Find your representatives</h1>
	<p style="color: var(--color-text-muted); margin-bottom: 2rem;">
		Enter a Portland-area address to see your full matrix of elected officials.
	</p>

	<form class="address-form" onsubmit={(e) => { e.preventDefault(); lookup(); }}>
		<div class="address-row">
			<input
				class="input"
				type="text"
				placeholder="e.g. 1234 NW Thurman St, Portland, OR 97209"
				bind:value={address}
				disabled={loading}
			/>
			<button class="btn btn-primary" type="submit" disabled={loading || !address.trim()}>
				{loading ? 'Looking up…' : 'Look up'}
			</button>
		</div>
	</form>

	{#if error}
		<p class="error-msg">{error}</p>
	{/if}

	{#if searched && !reps.length}
		<div class="empty-state card">
			<p>No representatives found for this address. Make sure the address is in the Portland metro area.</p>
		</div>
	{/if}

	{#if reps.length}
		<div class="results-header">
			<p class="matched-address">Showing results for: <strong>{matchedAddress}</strong></p>
			<a href="/issues" class="btn btn-primary">Select issues →</a>
		</div>

		{#each levels as level}
			{@const group = repsByLevel(level)}
			{#if group.length}
				<section class="level-section">
					<h2 class="level-heading">
						<span class="badge badge-{level}">{LEVEL_LABELS[level]}</span>
					</h2>
					<div class="rep-grid">
						{#each group as rep}
							<RepCard {rep} />
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	{/if}
</div>

<style>
	.address-form {
		max-width: 640px;
		margin-bottom: 2rem;
	}

	.address-row {
		display: flex;
		gap: 0.75rem;
	}

	.address-row .input {
		flex: 1;
	}

	.error-msg {
		color: var(--color-danger);
		font-size: 0.9375rem;
		margin-bottom: 1.5rem;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.matched-address {
		font-size: 0.9375rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.level-section {
		margin-bottom: 2.5rem;
	}

	.level-heading {
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.rep-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.empty-state {
		max-width: 480px;
		color: var(--color-text-muted);
		font-size: 0.9375rem;
	}
</style>
