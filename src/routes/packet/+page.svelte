<script lang="ts">
	import type { Representative, Issue } from '$lib/types';
	import { CHANNEL_LABELS } from '$lib/types';
	import { encryptPack, downloadPack } from '$lib/crypto';
	import { emptyPack } from '$lib/types';

	// TODO: pull reps and issues from session store
	let reps = $state<Representative[]>([]);
	let issues = $state<Issue[]>([]);

	// checked[repId][issueId][channel] = true/false
	let checked = $state<Record<string, Record<string, Record<string, boolean>>>>({});

	let passphrase = $state('');
	let showSaveDialog = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	function toggle(repId: string, issueId: string, channel: string) {
		if (!checked[repId]) checked[repId] = {};
		if (!checked[repId][issueId]) checked[repId][issueId] = {};
		checked[repId][issueId][channel] = !checked[repId][issueId][channel];
		checked = { ...checked };
	}

	function availableChannels(rep: Representative) {
		const all: { key: string; label: string; href: string | null }[] = [];
		if (rep.phone) all.push({ key: 'phone', label: 'Phone', href: `tel:${rep.phone}` });
		if (rep.email) all.push({ key: 'email', label: 'Email', href: `mailto:${rep.email}` });
		if (rep.fax) all.push({ key: 'fax', label: 'Fax', href: null });
		if (rep.mailing_address) all.push({ key: 'mail', label: 'Mail', href: null });
		if (rep.web_form_url) all.push({ key: 'web_form', label: 'Web form', href: rep.web_form_url });
		return all;
	}

	async function savePack() {
		if (!passphrase) return;
		saving = true;
		saveError = '';
		try {
			const pack = emptyPack();
			pack.reps = reps;
			pack.issues = issues;
			const blob = await encryptPack(pack, passphrase);
			downloadPack(blob);
			showSaveDialog = false;
			passphrase = '';
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	const totalActions = $derived(
		Object.values(checked)
			.flatMap((r) => Object.values(r))
			.flatMap((i) => Object.values(i))
			.filter(Boolean).length
	);
</script>

<svelte:head>
	<title>Contact packet — Civitas</title>
</svelte:head>

<div class="container" style="padding-top: 2.5rem; padding-bottom: 6rem;">
	<div class="page-header">
		<div>
			<h1>Contact packet</h1>
			<p style="color: var(--color-text-muted); margin: 0;">
				Check off each contact as you complete it.
				{#if totalActions > 0}
					<strong style="color: var(--color-success);">{totalActions} completed.</strong>
				{/if}
			</p>
		</div>
		<div class="header-actions">
			<button class="btn btn-secondary" onclick={() => window.print()}>Print PDF</button>
			<button class="btn btn-primary" onclick={() => (showSaveDialog = true)}>Save pack</button>
		</div>
	</div>

	{#if !reps.length || !issues.length}
		<div class="empty-state card">
			<h3>Nothing here yet</h3>
			<p>
				First <a href="/lookup">look up your representatives</a>, then
				<a href="/issues">select issues</a> to build your packet.
			</p>
		</div>
	{:else}
		<div class="packet-table-wrap">
			<table class="packet-table">
				<thead>
					<tr>
						<th class="rep-col">Representative</th>
						{#each issues as issue}
							<th class="issue-col">{issue.label}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each reps as rep}
						{@const channels = availableChannels(rep)}
						<tr>
							<td class="rep-cell">
								<div class="rep-name">{rep.name}</div>
								<div class="rep-title">{rep.title}</div>
							</td>
							{#each issues as issue}
								<td class="actions-cell">
									{#each channels as ch}
										<label class="action-check">
											<input
												type="checkbox"
												checked={checked[rep.id]?.[issue.id]?.[ch.key] ?? false}
												onchange={() => toggle(rep.id, issue.id, ch.key)}
											/>
											{#if ch.href}
												<a href={ch.href} target="_blank" rel="noopener">{ch.label}</a>
											{:else}
												<span>{ch.label}</span>
											{/if}
										</label>
									{/each}
									{#if !channels.length}
										<span style="color: var(--color-text-muted); font-size: 0.8125rem;">No contact info</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if showSaveDialog}
	<div
		class="dialog-overlay"
		role="presentation"
		onclick={() => (showSaveDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showSaveDialog = false)}
	>
		<div
			class="dialog card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="save-dialog-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3 id="save-dialog-title">Save your session</h3>
			<p style="font-size: 0.875rem; color: var(--color-text-muted);">
				Your session is encrypted in your browser and saved as a file on your device. The passphrase
				never leaves your machine.
			</p>
			<label class="label" for="save-passphrase">Passphrase</label>
			<input
				id="save-passphrase"
				type="password"
				class="input"
				placeholder="Choose a passphrase"
				bind:value={passphrase}
			/>
			{#if saveError}
				<p style="color: var(--color-danger); font-size: 0.875rem; margin-top: 0.5rem;">{saveError}</p>
			{/if}
			<div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
				<button class="btn btn-primary" onclick={savePack} disabled={!passphrase || saving}>
					{saving ? 'Encrypting…' : 'Save to device'}
				</button>
				<button class="btn btn-ghost" onclick={() => (showSaveDialog = false)}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.empty-state {
		max-width: 480px;
	}

	.empty-state h3 {
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: var(--color-text-muted);
		font-size: 0.9375rem;
		margin: 0;
	}

	.packet-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.packet-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	.packet-table th,
	.packet-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
		text-align: left;
	}

	.packet-table th {
		background: var(--color-bg);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.rep-col {
		min-width: 180px;
		position: sticky;
		left: 0;
		background: var(--color-bg) !important;
		border-right: 1px solid var(--color-border);
	}

	.rep-cell {
		position: sticky;
		left: 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
	}

	.rep-name {
		font-weight: 600;
	}

	.rep-title {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.issue-col {
		min-width: 160px;
	}

	.actions-cell {
		vertical-align: top;
	}

	.action-check {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		cursor: pointer;
	}

	.action-check input[type='checkbox'] {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 500;
		padding: 1rem;
	}

	.dialog {
		max-width: 440px;
		width: 100%;
	}

	.dialog h3 {
		margin-bottom: 0.75rem;
	}

	@media print {
		.header-actions,
		.dialog-overlay {
			display: none !important;
		}
	}
</style>
