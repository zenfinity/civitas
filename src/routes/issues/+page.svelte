<script lang="ts">
	import type { Issue, Level } from '$lib/types';
	import { LEVEL_LABELS } from '$lib/types';

	// Preset issues seeded for Portland v1
	const PRESET_ISSUES: Omit<Issue, 'id'>[] = [
		{
			label: 'Housing affordability',
			description: 'Affordable housing production, rent stabilization, anti-displacement.',
			relevant_levels: ['federal', 'state', 'county', 'city']
		},
		{
			label: 'Public transit funding',
			description: 'TriMet operations, bus service, MAX expansion.',
			relevant_levels: ['federal', 'state', 'metro', 'county', 'special']
		},
		{
			label: 'Climate and environment',
			description: 'Clean energy, building emissions, urban tree canopy.',
			relevant_levels: ['federal', 'state', 'county', 'city']
		},
		{
			label: 'Public safety',
			description: 'Police accountability, community safety programs, mental health response.',
			relevant_levels: ['federal', 'state', 'county', 'city']
		},
		{
			label: 'Education funding',
			description: 'K-12 funding, school resources, PPS budget.',
			relevant_levels: ['federal', 'state', 'school']
		},
		{
			label: 'Homelessness response',
			description: 'Shelter capacity, services, Shelter to Housing Continuum.',
			relevant_levels: ['federal', 'state', 'county', 'city']
		},
		{
			label: 'Immigrant rights',
			description: 'Sanctuary policies, access to services, deportation protections.',
			relevant_levels: ['federal', 'state', 'county', 'city']
		},
		{
			label: 'Reproductive rights',
			description: 'Access to reproductive healthcare and related protections.',
			relevant_levels: ['federal', 'state']
		},
		{
			label: 'Water and utilities',
			description: 'Clean water infrastructure, utility affordability.',
			relevant_levels: ['federal', 'state', 'city', 'special']
		}
	];

	import { toggleIssue, issues as storeIssues } from '$lib/store';

	let customLabel = $state('');
	let customDescription = $state('');

	// IDs of issues currently in the store.
	const selectedIds = $derived(new Set($storeIssues.map((i) => i.id)));

	function togglePreset(preset: Omit<Issue, 'id'>) {
		const existing = $storeIssues.find((i) => i.label === preset.label);
		if (existing) {
			toggleIssue(existing);
		} else {
			toggleIssue({ id: crypto.randomUUID(), ...preset });
		}
	}

	function addCustom() {
		if (!customLabel.trim()) return;
		toggleIssue({
			id: crypto.randomUUID(),
			label: customLabel.trim(),
			description: customDescription.trim(),
			relevant_levels: ['federal', 'state', 'metro', 'county', 'city', 'school', 'special']
		});
		customLabel = '';
		customDescription = '';
	}

	function removeCustom(issue: Issue) {
		toggleIssue(issue);
	}

	const totalSelected = $derived(selectedIds.size);
	const customIssues = $derived($storeIssues.filter(
		(i) => !PRESET_ISSUES.some((p) => p.label === i.label)
	));
</script>

<svelte:head>
	<title>Select issues — Civitas</title>
</svelte:head>

<div class="container" style="padding-top: 2.5rem; padding-bottom: 4rem;">
	<div class="page-header">
		<div>
			<h1>Select issues</h1>
			<p style="color: var(--color-text-muted); margin: 0;">
				Choose what you want to contact your representatives about. Add your own.
			</p>
		</div>
		{#if totalSelected > 0}
			<a href="/packet" class="btn btn-primary">{totalSelected} issue{totalSelected !== 1 ? 's' : ''} selected — Build packet →</a>
		{/if}
	</div>

	<div class="issue-grid">
		{#each PRESET_ISSUES as issue}
			{@const isSelected = $storeIssues.some((i) => i.label === issue.label)}
			<button
				class="issue-card card"
				class:selected={isSelected}
				onclick={() => togglePreset(issue)}
				type="button"
			>
				<div class="issue-header">
					<span class="issue-label">{issue.label}</span>
					<span class="check-icon">{isSelected ? '✓' : '+'}</span>
				</div>
				<p class="issue-desc">{issue.description}</p>
				<div class="issue-levels">
					{#each issue.relevant_levels as level}
						<span class="badge badge-{level}">{LEVEL_LABELS[level]}</span>
					{/each}
				</div>
			</button>
		{/each}
	</div>

	<section class="custom-section">
		<h2>Add a custom issue</h2>
		<div class="custom-form card">
			<div class="form-row">
				<div style="flex: 1;">
					<label class="label" for="custom-label">Issue name</label>
					<input
						id="custom-label"
						class="input"
						type="text"
						placeholder="e.g. Local library funding"
						bind:value={customLabel}
					/>
				</div>
				<div style="flex: 2;">
					<label class="label" for="custom-desc">Short description (optional)</label>
					<input
						id="custom-desc"
						class="input"
						type="text"
						placeholder="What's the context?"
						bind:value={customDescription}
					/>
				</div>
				<button
					class="btn btn-secondary"
					onclick={addCustom}
					disabled={!customLabel.trim()}
					style="align-self: flex-end;"
				>
					Add
				</button>
			</div>
		</div>

		{#if customIssues.length}
			<div class="custom-list">
				{#each customIssues as issue}
					<div class="custom-item card">
						<div>
							<strong>{issue.label}</strong>
							{#if issue.description}
								<span style="color: var(--color-text-muted); font-size: 0.875rem;"> — {issue.description}</span>
							{/if}
						</div>
						<button class="btn btn-ghost" onclick={() => removeCustom(issue)} style="padding: 0.25rem 0.5rem;">✕</button>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if totalSelected > 0}
		<div class="sticky-footer">
			<a href="/packet" class="btn btn-primary">
				Build contact packet ({totalSelected} issue{totalSelected !== 1 ? 's' : ''}) →
			</a>
		</div>
	{/if}
</div>

<style>
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.issue-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.issue-card {
		text-align: left;
		cursor: pointer;
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		transition: border-color 0.15s, box-shadow 0.15s;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.issue-card:hover {
		border-color: var(--color-accent);
	}

	.issue-card.selected {
		border-color: var(--color-accent);
		background: #f5f3ff;
	}

	.issue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.issue-label {
		font-weight: 600;
		font-size: 1rem;
	}

	.check-icon {
		font-size: 1rem;
		color: var(--color-accent);
		font-weight: 700;
		width: 24px;
		text-align: center;
	}

	.issue-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.issue-levels {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}

	.custom-section h2 {
		margin-bottom: 1rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.custom-list {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.custom-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
	}

	.sticky-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1rem 1.5rem;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		display: flex;
		justify-content: center;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
	}
</style>
