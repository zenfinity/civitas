<script lang="ts">
	import { onMount } from 'svelte';
	import { LEVEL_LABELS, type Representative, type Issue, type Tone } from '$lib/types';
	import { encryptPack, downloadPack } from '$lib/crypto';
	import { pack, reps as storeReps, issues as storeIssues, recordAction } from '$lib/store';
	import { applyTemplate } from '$lib/templates';
	import allTemplates from '$lib/issue-templates.json';

	type ScriptEntry = { loading: boolean; text: string; error: string };
	let scripts = $state<Record<string, ScriptEntry>>({});
	let copiedKey = $state('');

	onMount(() => {
		const restored: Record<string, ScriptEntry> = {};
		for (const action of $pack.actions) {
			if (action.script) {
				restored[actionKey(action.rep_id, action.issue_id, action.channel)] = {
					loading: false, text: action.script, error: ''
				};
			}
		}
		scripts = restored;
	});

	function actionKey(repId: string, issueId: string, channel: string) {
		return `${repId}:${issueId}:${channel}`;
	}

	async function generateScript(rep: Representative, issue: Issue, channel: string) {
		const k = actionKey(rep.id, issue.id, channel);
		const tone = $pack.prefs.tone_preference as Tone;
		const templateKey = `${channel}:${tone}`;
		const issueTemplates = (allTemplates as Record<string, Record<string, string>>)[issue.label];
		const template = issueTemplates?.[templateKey];

		if (template) {
			const text = applyTemplate(template, rep, $pack.prefs.name, $pack.prefs.email ?? '', $pack.meta.address ?? '');
			scripts[k] = { loading: false, text, error: '' };
			const existing = getAction(rep.id, issue.id, channel);
			if (existing) recordAction({ ...existing, script_used: true, script: text });
			return;
		}

		scripts[k] = { loading: true, text: '', error: '' };
		try {
			const res = await fetch('/api/script', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repName: rep.name,
					repTitle: rep.title,
					districtName: rep.district_name,
					issueName: issue.label,
					issueDescription: issue.description,
					channel,
					tone,
					userName: $pack.prefs.name,
					userAddress: $pack.meta.address,
					userEmail: $pack.prefs.email
				})
			});

			if (!res.ok) throw new Error((await res.text()) || 'Generation failed');
			const data = await res.json();
			scripts[k] = { loading: false, text: data.script, error: '' };

			const existing = getAction(rep.id, issue.id, channel);
			if (existing) recordAction({ ...existing, script_used: true, script: data.script });
		} catch (e) {
			scripts[k] = { loading: false, text: '', error: e instanceof Error ? e.message : 'Failed' };
		}
	}

	async function copyScript(k: string, text: string) {
		await navigator.clipboard.writeText(text);
		copiedKey = k;
		setTimeout(() => { copiedKey = ''; }, 2000);
	}

	const reps = $derived($storeReps);
	const issues = $derived($storeIssues);

	let passphrase = $state('');
	let showSaveDialog = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	// Only show reps that have at least one selected action.
	const activeReps = $derived(
		reps.filter((rep) =>
			$pack.actions.some((a) => a.rep_id === rep.id && (a.status === 'pending' || a.status === 'sent'))
		)
	);

	const mailActionCount = $derived(
		$pack.actions.filter((a) => a.channel === 'mail' && (a.status === 'pending' || a.status === 'sent')).length
	);

	// Combined scripts — keyed by "combined:repId:channel", ephemeral (not persisted to pack)
	let combinedScripts = $state<Record<string, ScriptEntry>>({});
	let copiedCombinedKey = $state('');

	function combineKey(repId: string, channel: string) {
		return `combined:${repId}:${channel}`;
	}

	function issuesForRepChannel(repId: string, channel: string): Issue[] {
		return issues.filter((issue) =>
			$pack.actions.some(
				(a) => a.rep_id === repId && a.issue_id === issue.id &&
					a.channel === channel && (a.status === 'pending' || a.status === 'sent')
			)
		);
	}

	function uniqueChannelsForRep(repId: string): Channel[] {
		const seen = new Set<Channel>();
		const result: Channel[] = [];
		for (const a of $pack.actions) {
			if (a.rep_id === repId && (a.status === 'pending' || a.status === 'sent') && !seen.has(a.channel)) {
				seen.add(a.channel);
				result.push(a.channel as Channel);
			}
		}
		return result;
	}

	async function generateCombinedScript(rep: Representative, channel: string) {
		const ck = combineKey(rep.id, channel);
		const tone = $pack.prefs.tone_preference as Tone;
		const channelIssues = issuesForRepChannel(rep.id, channel);
		combinedScripts[ck] = { loading: true, text: '', error: '' };
		try {
			const res = await fetch('/api/script-combined', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repName: rep.name,
					repTitle: rep.title,
					districtName: rep.district_name,
					issues: channelIssues.map((i) => ({ name: i.label, description: i.description })),
					channel,
					tone,
					userName: $pack.prefs.name,
					userAddress: $pack.meta.address,
					userEmail: $pack.prefs.email
				})
			});
			if (!res.ok) throw new Error((await res.text()) || 'Generation failed');
			const data = await res.json();
			combinedScripts[ck] = { loading: false, text: data.script, error: '' };
		} catch (e) {
			combinedScripts[ck] = { loading: false, text: '', error: e instanceof Error ? e.message : 'Failed' };
		}
	}

	async function copyCombinedScript(ck: string, text: string) {
		await navigator.clipboard.writeText(text);
		copiedCombinedKey = ck;
		setTimeout(() => { copiedCombinedKey = ''; }, 2000);
	}

	function getAction(repId: string, issueId: string, channel: string) {
		return $pack.actions.find(
			(a) => a.rep_id === repId && a.issue_id === issueId && a.channel === channel
		);
	}

	function selectedChannels(repId: string, issueId: string) {
		return $pack.actions.filter(
			(a) => a.rep_id === repId && a.issue_id === issueId && (a.status === 'pending' || a.status === 'sent')
		);
	}

	function markDone(repId: string, issueId: string, channel: string, isDone: boolean) {
		const existing = getAction(repId, issueId, channel);
		if (!existing) return;
		recordAction({ ...existing, status: isDone ? 'sent' : 'pending' });
	}

	function contactInfo(rep: Representative, channel: string): { href: string | null; display: string } | null {
		switch (channel) {
			case 'phone':
				return rep.phone ? { href: `tel:${rep.phone}`, display: rep.phone } : null;
			case 'email':
				return rep.email ? { href: `mailto:${rep.email}`, display: rep.email } : null;
			case 'web_form':
				return rep.web_form_url ? { href: rep.web_form_url, display: 'Contact form' } : null;
			case 'fax':
				return rep.fax ? { href: null, display: rep.fax } : null;
			case 'mail':
				if (!rep.mailing_address) return null;
				const { street, city, state, zip } = rep.mailing_address;
				return { href: null, display: `${street}\n${city}, ${state} ${zip}` };
			default:
				return null;
		}
	}

	const CHANNEL_LABELS: Record<string, string> = {
		phone: 'Phone',
		email: 'Email',
		fax: 'Fax',
		mail: 'Mail',
		web_form: 'Web form'
	};

	const completedCount = $derived($pack.actions.filter((a) => a.status === 'sent').length);
	const totalSelected = $derived(
		$pack.actions.filter((a) => a.status === 'pending' || a.status === 'sent').length
	);


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
</script>

<svelte:head>
	<title>Take action — Civitas</title>
</svelte:head>

<div class="container" style="padding-top: 2.5rem; padding-bottom: 6rem;">
	<div class="page-header">
		<div>
			<h1>Take action</h1>
			<p style="color: var(--color-text-muted); margin: 0;">
				Work through your contacts and check each one off when done.
				{#if totalSelected > 0}
					<strong style="color: var(--color-success);">{completedCount} of {totalSelected} done.</strong>
				{/if}
			</p>
		</div>
		<div class="header-actions">
			<a href="/packet" class="btn btn-ghost">← Edit selections</a>
			<button class="btn btn-secondary" onclick={() => window.print()}>Print PDF</button>
			{#if mailActionCount > 0}
				<a href="/print-letters" class="btn btn-secondary">Print letters</a>
			{/if}
			<button class="btn btn-secondary" onclick={() => (showSaveDialog = true)}>Save pack</button>
		</div>
	</div>

	{#if !activeReps.length || !issues.length}
		<div class="empty-state card">
			<h3>No actions selected</h3>
			<p>
				Go back to <a href="/packet">select actions</a> to choose which channels to use.
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
						{#if issues.length > 1}
							<th class="combined-col">Combined</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each activeReps as rep}
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
								{@const actions = selectedChannels(rep.id, issue.id)}
								<td class="actions-cell">
									{#each actions as action}
										{@const info = contactInfo(rep, action.channel)}
										{@const done = action.status === 'sent'}
										{@const k = actionKey(rep.id, issue.id, action.channel)}
										{@const entry = scripts[k]}
										<div class="action-item" class:done>
											<div class="action-main">
												<div class="action-contact">
													<span class="channel-label">{CHANNEL_LABELS[action.channel]}</span>
													{#if info}
														{#if info.href}
															<a
																href={info.href}
																target={action.channel === 'web_form' ? '_blank' : undefined}
																rel={action.channel === 'web_form' ? 'noopener' : undefined}
																class="contact-link"
															>{info.display}</a>
														{:else}
															<span class="contact-text">{info.display}</span>
														{/if}
													{/if}
												</div>
												{#if entry?.error}
													<p class="script-error">{entry.error}</p>
												{/if}
												{#if entry?.text}
													<div class="script-box">
														<pre class="script-text">{entry.text}</pre>
														<button class="btn-copy" onclick={() => copyScript(k, entry.text)}>
															{copiedKey === k ? 'Copied!' : 'Copy'}
														</button>
													</div>
												{/if}
											</div>
											<div class="action-right">
												<label class="done-check">
													<input
														type="checkbox"
														checked={done}
														onchange={(e) => markDone(rep.id, issue.id, action.channel, e.currentTarget.checked)}
													/>
													<span>Done</span>
												</label>
												<button
													class="btn-draft"
													onclick={() => generateScript(rep, issue, action.channel)}
													disabled={entry?.loading}
												>{entry?.loading ? 'Drafting…' : entry?.text ? 'Regenerate' : 'Draft script'}</button>
											</div>
										</div>
									{/each}
									{#if !actions.length}
										<span class="no-action">—</span>
									{/if}
								</td>
							{/each}
							{#if issues.length > 1}
								{@const channels = uniqueChannelsForRep(rep.id).filter((ch) => issuesForRepChannel(rep.id, ch).length > 1)}
								<td class="combined-cell">
									{#each channels as channel}
										{@const ck = combineKey(rep.id, channel)}
										{@const entry = combinedScripts[ck]}
										<div class="action-item">
											<div class="action-main">
												<span class="channel-label">{CHANNEL_LABELS[channel]}</span>
												{#if entry?.error}
													<p class="script-error">{entry.error}</p>
												{/if}
												{#if entry?.text}
													<div class="script-box">
														<pre class="script-text">{entry.text}</pre>
														<button class="btn-copy" onclick={() => copyCombinedScript(ck, entry.text)}>
															{copiedCombinedKey === ck ? 'Copied!' : 'Copy'}
														</button>
													</div>
												{/if}
											</div>
											<div class="action-right">
												<button
													class="btn-draft"
													onclick={() => generateCombinedScript(rep, channel)}
													disabled={entry?.loading}
												>{entry?.loading ? 'Drafting…' : entry?.text ? 'Regenerate' : 'Generate combined'}</button>
											</div>
										</div>
									{/each}
									{#if !channels.length}
										<span class="no-action">—</span>
									{/if}
								</td>
							{/if}
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
		align-items: center;
		flex-wrap: wrap;
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
		table-layout: fixed;
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
		width: 220px;
		position: sticky;
		left: 0;
		background: var(--color-bg) !important;
		border-right: 1px solid var(--color-border);
	}

	.rep-cell {
		width: 220px;
		position: sticky;
		left: 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		overflow: hidden;
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
		width: 300px;
		border-left: 1px solid var(--color-border);
	}

	.combined-col {
		min-width: 220px;
		background: var(--color-bg) !important;
		border-left: 2px solid var(--color-border);
	}

	.combined-cell {
		border-left: 2px solid var(--color-border);
		vertical-align: top;
	}

	.combined-cell .action-item {
		flex-direction: column;
		gap: 0.375rem;
	}

	.combined-cell .action-right {
		align-items: flex-start;
	}

	.actions-cell {
		vertical-align: top;
		overflow: hidden;
		border-left: 1px solid var(--color-border);
	}

	.action-item {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	@media (max-width: 480px) {
		.action-item {
			flex-direction: column;
		}
	}

	.action-item:last-child {
		border-bottom: none;
	}

	.action-item.done {
		opacity: 0.5;
	}

	.action-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.action-contact {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.action-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn-draft {
		font-size: 0.8125rem;
		color: var(--color-accent);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: right;
		white-space: nowrap;
	}

	.btn-draft:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.script-box {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm, 6px);
		padding: 0.625rem 0.75rem;
		max-height: 20rem;
		overflow-y: auto;
	}

	.script-text {
		font-family: inherit;
		font-size: 0.8125rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
		margin: 0;
		color: var(--color-text);
	}

	.btn-copy {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm, 6px);
		padding: 0.2rem 0.5rem;
		cursor: pointer;
	}

	.btn-copy:hover {
		color: var(--color-text);
	}

	.script-error {
		font-size: 0.8125rem;
		color: var(--color-danger);
		margin: 0;
	}

	.channel-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.contact-link {
		font-size: 0.875rem;
		color: var(--color-accent);
		word-break: break-all;
	}

	.contact-text {
		font-size: 0.875rem;
		white-space: pre-line;
	}

	.done-check {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		cursor: pointer;
		width: fit-content;
	}

	.done-check input[type='checkbox'] {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.no-action {
		color: var(--color-border);
		font-size: 0.875rem;
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

	.civic-print-banner {
		margin-bottom: 1.75rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}

	.civic-print-inner {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem 2.5rem;
	}

	.civic-print-block {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.875rem;
	}

	.civic-print-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
		margin-bottom: 0.1rem;
	}

	.civic-print-tag {
		display: inline-block;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		font-size: 0.6875rem;
		color: var(--color-text-muted);
		width: fit-content;
	}

	.civic-print-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.75rem;
	}

	.civic-print-links a {
		font-size: 0.8125rem;
		color: var(--color-accent);
		text-decoration: none;
	}

	.civic-print-links a:hover {
		text-decoration: underline;
	}

	.civic-print-location {
		line-height: 1.4;
		color: var(--color-text);
	}

	.civic-print-hours {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	@media print {
		.header-actions,
		.dialog-overlay {
			display: none !important;
		}

		.civic-print-banner {
			border: 1px solid #ccc;
			break-inside: avoid;
			margin-bottom: 1rem;
		}

		.civic-print-links a::after {
			content: ' (' attr(href) ')';
			font-size: 0.6875rem;
			color: #555;
		}
	}
</style>
