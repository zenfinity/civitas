<script lang="ts">
	import { LEVEL_LABELS, type Channel, type Representative } from '$lib/types';
	import { encryptPack, downloadPack } from '$lib/crypto';
	import { pack, reps as storeReps, issues as storeIssues, recordAction, removeAction } from '$lib/store';

	const reps = $derived($storeReps);
	const issues = $derived($storeIssues);

	let passphrase = $state('');
	let showSaveDialog = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	function selectedChannel(repId: string, issueId: string): string {
		return $pack.actions.find(
			(a) => a.rep_id === repId && a.issue_id === issueId && (a.status === 'pending' || a.status === 'sent')
		)?.channel ?? '';
	}

	function selectChannel(repId: string, issueId: string, channel: string) {
		const existing = $pack.actions.filter((a) => a.rep_id === repId && a.issue_id === issueId);
		for (const a of existing) removeAction(repId, issueId, a.channel);
		if (channel) {
			recordAction({
				rep_id: repId,
				issue_id: issueId,
				channel: channel as Channel,
				sent_at: new Date().toISOString(),
				status: 'pending',
				script_used: false
			});
		}
	}

	function availableChannels(rep: Representative) {
		const all: { key: string; label: string }[] = [];
		if (rep.phone) all.push({ key: 'phone', label: 'Phone' });
		if (rep.email) all.push({ key: 'email', label: 'Email' });
		if (rep.fax) all.push({ key: 'fax', label: 'Fax' });
		if (rep.mailing_address) all.push({ key: 'mail', label: 'Mail' });
		if (rep.web_form_url) all.push({ key: 'web_form', label: 'Web form' });
		return all;
	}

	async function savePack() {
		if (!passphrase) return;
		saving = true;
		saveError = '';
		try {
			const blob = await encryptPack($pack, passphrase);
			downloadPack(blob);
			showSaveDialog = false;
			passphrase = '';
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	const selectedCount = $derived($pack.actions.filter((a) => a.status === 'pending').length);
</script>

<svelte:head>
	<title>Select actions — Civitas</title>
</svelte:head>

<div class="container" style="padding-top: 2.5rem; padding-bottom: 6rem;">
	<div class="page-header">
		<div>
			<h1>Select actions</h1>
			<p style="color: var(--color-text-muted); margin: 0;">
				Choose which channels to use for each representative and issue.
				{#if selectedCount > 0}
					<strong style="color: var(--color-accent);">{selectedCount} selected.</strong>
				{/if}
			</p>
		</div>
		<div class="header-actions">
			<button class="btn btn-secondary" onclick={() => (showSaveDialog = true)}>Save pack</button>
			{#if selectedCount > 0}
				<a href="/action" class="btn btn-primary">Take action →</a>
			{/if}
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
								<div class="rep-cell-inner">
									<div class="rep-text">
										<div class="rep-name">{rep.name}</div>
										<div class="rep-title">{rep.title}</div>
									</div>
									<div class="rep-meta">
										<span class="badge badge-{rep.level}">{LEVEL_LABELS[rep.level]}</span>
										{#if rep.district_name}
											<span class="rep-dept">{rep.district_name}</span>
										{/if}
									</div>
								</div>
							</td>
							{#each issues as issue}
								{@const sel = selectedChannel(rep.id, issue.id)}
								<td class="actions-cell">
									{#if channels.length}
										<label class="action-radio">
											<input
												type="radio"
												name="{rep.id}:{issue.id}"
												value=""
												checked={!sel}
												onchange={() => selectChannel(rep.id, issue.id, '')}
											/>
											<span>None</span>
										</label>
										{#each channels as ch}
											<label class="action-radio">
												<input
													type="radio"
													name="{rep.id}:{issue.id}"
													value={ch.key}
													checked={sel === ch.key}
													onchange={() => selectChannel(rep.id, issue.id, ch.key)}
												/>
												<span>{ch.label}</span>
											</label>
										{/each}
									{:else}
										<span style="color: var(--color-text-muted); font-size: 0.8125rem;">No contact info</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if selectedCount > 0}
			<div class="next-bar">
				<a href="/action" class="btn btn-primary">Take action →</a>
			</div>
		{/if}
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
		align-items: center;
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

	.rep-cell-inner {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.rep-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.rep-dept {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: right;
	}

	.rep-name {
		font-weight: 600;
	}

	.rep-title {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	@media (max-width: 480px) {
		.rep-cell-inner {
			flex-direction: column-reverse;
		}

		.rep-meta {
			align-items: flex-start;
		}

		.rep-dept {
			text-align: left;
		}
	}

	.issue-col {
		min-width: 160px;
		border-left: 1px solid var(--color-border);
	}

	.actions-cell {
		vertical-align: top;
		border-left: 1px solid var(--color-border);
	}

	.action-radio {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
		cursor: pointer;
	}

	.action-radio input[type='radio'] {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.next-bar {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.5rem;
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
</style>
