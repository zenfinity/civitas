<script lang="ts">
	import { LEVEL_LABELS } from '$lib/types';
	import { pack, setReps, setName, setEmail, reps as storeReps } from '$lib/store';
	import RepCard from '$lib/components/RepCard.svelte';

	let name = $state($pack.prefs.name);
	let email = $state($pack.prefs.email ?? '');
	let address = $state($pack.meta.address);
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
		<div class="form-row">
			<div class="field">
				<label class="label" for="your-name">Your name</label>
				<input
					id="your-name"
					class="input"
					type="text"
					placeholder="e.g. Jane Smith"
					bind:value={name}
					onblur={() => setName(name)}
					disabled={loading}
				/>
			</div>
			<div class="field">
				<label class="label" for="your-email">Email</label>
				<input
					id="your-email"
					class="input"
					type="email"
					placeholder="e.g. jane@example.com"
					bind:value={email}
					onblur={() => setEmail(email)}
					disabled={loading}
				/>
			</div>
			<div class="field field-address">
				<label class="label" for="your-address">Address</label>
				<div class="address-row">
					<input
						id="your-address"
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
			</div>
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

		<section class="civic-section">
				<h2 class="civic-heading">Oregon voter resources</h2>
				<div class="civic-card card">
					<div class="civic-links">
						<a href="https://myvote.sos.oregon.gov/" target="_blank" rel="noopener" class="civic-link">My Vote Oregon — registration, ballot tracking &amp; drop boxes</a>
						<a href="https://registertovote.oregon.gov/" target="_blank" rel="noopener" class="civic-link">Register or update your registration</a>
						<a href="https://sos.oregon.gov/elections/" target="_blank" rel="noopener" class="civic-link">Oregon Secretary of State — Elections</a>
						<a href="https://www.multco.us/elections" target="_blank" rel="noopener" class="civic-link">Multnomah County Elections</a>
					</div>
				</div>
			</section>
	{/if}
</div>

<style>
	.address-form {
		max-width: 720px;
		margin-bottom: 2rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 160px;
	}

	.field-address {
		flex: 1;
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

	.civic-section {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border);
	}

	.civic-heading {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-text);
	}

	.civic-card {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.civic-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}

	.civic-election {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.civic-election-name {
		font-size: 1rem;
		font-weight: 600;
	}

	.civic-election-date {
		font-size: 0.9375rem;
		color: var(--color-text-muted);
	}

	.civic-tag {
		display: inline-block;
		margin-top: 0.25rem;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		width: fit-content;
	}

	.civic-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.civic-link {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--color-accent);
		font-size: 0.8125rem;
		color: var(--color-accent);
		text-decoration: none;
		white-space: nowrap;
	}

	.civic-link:hover {
		background: var(--color-accent);
		color: #fff;
	}

	.civic-locations {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.civic-location {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		font-size: 0.875rem;
	}

	.civic-hours {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.civic-notes {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>
