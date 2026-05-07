<script lang="ts">
	import { pack } from '$lib/store';
	import { resolveScript } from '$lib/templates';
	import { type Representative, type Tone } from '$lib/types';
	import allTemplates from '$lib/issue-templates.json';

	type LetterItem = {
		rep: Representative;
		issueLabel: string;
		text: string;
	};

	const letters = $derived<LetterItem[]>(
		$pack.actions
			.filter((a) => a.channel === 'mail' && (a.status === 'pending' || a.status === 'sent'))
			.flatMap((action) => {
				const rep = $pack.reps.find((r) => r.id === action.rep_id);
				const issue = $pack.issues.find((i) => i.id === action.issue_id);
				if (!rep || !issue) return [];
				const text = resolveScript(
					action.script,
					issue.label,
					'mail',
					$pack.prefs.tone_preference as Tone,
					rep,
					$pack.prefs.name,
					$pack.prefs.email ?? '',
					$pack.meta.address ?? '',
					allTemplates as Record<string, Record<string, string>>
				);
				return [{ rep, issueLabel: issue.label, text }];
			})
	);

	// Only reps that have a mailing address can get an envelope
	const envelopes = $derived(letters.filter((l) => l.rep.mailing_address));

	let includeEnvelopes = $state(false);
	let handwritten = $state(false);

	function buildLetterHeader(rep: Representative): string {
		const name = $pack.prefs.name || 'Your Name';
		const addr = $pack.meta.address || '';
		const date = new Date().toLocaleDateString('en-US', {
			year: 'numeric', month: 'long', day: 'numeric'
		});
		const parts = [`${name}\n${addr}`, date];
		if (rep.mailing_address) {
			const { street, city, state, zip } = rep.mailing_address;
			parts.push(`${rep.name}\n${rep.title}\n${street}\n${city}, ${state} ${zip}`);
		}
		parts.push(`Dear ${rep.title} ${rep.name},`);
		return parts.join('\n\n');
	}

	function formatMailingAddress(rep: Representative): string {
		if (!rep.mailing_address) return '';
		const { street, city, state, zip } = rep.mailing_address;
		return `${street}\n${city}, ${state} ${zip}`;
	}

	let root: HTMLElement;

	function printLetters() {
		root.dataset.printMode = 'letters';
		window.print();
		window.addEventListener('afterprint', () => delete root.dataset.printMode, { once: true });
	}

	function printEnvelopes() {
		root.dataset.printMode = 'envelopes';
		window.print();
		window.addEventListener('afterprint', () => delete root.dataset.printMode, { once: true });
	}
</script>

<svelte:head>
	<title>Print letters — Civitas</title>
</svelte:head>

<div class="root" bind:this={root}>
	<div class="toolbar no-print">
		<a href="/action" class="btn btn-ghost">← Back</a>
		<div class="toolbar-right">
			{#if letters.length > 0}
				<label class="envelope-toggle">
					<input type="checkbox" bind:checked={handwritten} />
					<span>Handwritten</span>
				</label>
				<label class="envelope-toggle">
					<input type="checkbox" bind:checked={includeEnvelopes} />
					<span>Include envelopes</span>
				</label>
				<button class="btn btn-primary" onclick={printLetters}>
					Print {letters.length} letter{letters.length !== 1 ? 's' : ''}
				</button>
				{#if includeEnvelopes && envelopes.length > 0}
					<button class="btn btn-secondary" onclick={printEnvelopes}>
						Print {envelopes.length} envelope{envelopes.length !== 1 ? 's' : ''}
					</button>
				{/if}
			{/if}
		</div>
	</div>

	{#if !letters.length}
		<div class="empty-state no-print">
			<p>No mail actions selected. <a href="/packet">Go back and add some.</a></p>
		</div>
	{:else}
		<div class="letters-wrap">
			{#each letters as letter, i}
				<article class="letter-page" class:letter-hw={handwritten}>
					<div class="letter-label no-print">
						<span class="letter-num">Letter {i + 1}</span>
						{letter.rep.name} — {letter.issueLabel}
					</div>
					{#if handwritten}
						<pre class="hw-header">{buildLetterHeader(letter.rep)}</pre>
						<div class="hw-write"></div>
						<div class="hw-footer">
							<p class="hw-closing">Sincerely,</p>
							<div class="hw-sig-gap"></div>
							<div class="hw-sig-line"></div>
							<p class="hw-sig-name">{$pack.prefs.name || 'Your Name'}</p>
						</div>
					{:else if letter.text}
						<pre class="letter-text">{letter.text}</pre>
					{:else}
						<p class="no-script-note">
							No script drafted yet. Go to <a href="/action">Take action</a> and click "Draft
							script" for this mail item, then return here.
						</p>
					{/if}
				</article>
			{/each}
		</div>

		<div class="envelopes-wrap" class:hidden={!includeEnvelopes}>
			<div class="envelopes-heading no-print">Envelopes</div>
			{#each envelopes as env, i}
				<div class="envelope-page">
					<div class="env-label no-print">Envelope {i + 1}</div>
					<div class="env-return">
						{$pack.prefs.name || 'Your Name'}{'\n'}{$pack.meta.address}
					</div>
					<div class="env-recipient">
						{env.rep.name}{'\n'}{env.rep.title}{'\n'}{formatMailingAddress(env.rep)}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Named @page rules for mixed paper sizes -->
<svelte:element this="style">
	{'@page letter-page { size: letter portrait; margin: 1in; }'}
	{'@page envelope-page { size: 9.5in 4.125in landscape; margin: 0; }'}
</svelte:element>

<style>
	.root {
		background: #d1d5db;
		min-height: 100vh;
		padding: 1.5rem;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: white;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.envelope-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	/* Empty state */
	.empty-state {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		max-width: 480px;
		font-size: 0.9375rem;
	}

	/* Letters */
	.letters-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.letter-page {
		background: white;
		width: min(8.5in, 100%);
		min-height: 11in;
		padding: 1in;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
		position: relative;
	}

	.letter-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.letter-num {
		background: var(--color-accent);
		color: white;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.6875rem;
	}

	.letter-text {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 12pt;
		line-height: 1.7;
		white-space: pre-wrap;
		margin: 0;
		color: #111;
	}

	.no-script-note {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	/* Handwritten layout */
	.letter-page.letter-hw {
		display: flex;
		flex-direction: column;
		height: 11in;
		min-height: unset;
	}

	.hw-header {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 12pt;
		line-height: 1.7;
		white-space: pre-wrap;
		margin: 0 0 0.5em;
		color: #111;
		flex-shrink: 0;
	}

	.hw-write {
		flex: 1;
		background-image: repeating-linear-gradient(
			to bottom,
			transparent,
			transparent calc(1.85em - 1px),
			#c8d2dc calc(1.85em - 1px),
			#c8d2dc 1.85em
		);
		margin: 0.5em 0;
	}

	.hw-footer {
		flex-shrink: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 12pt;
		padding-top: 0.5em;
	}

	.hw-closing {
		margin: 0 0 0.25em;
	}

	.hw-sig-gap {
		height: 1.6em;
	}

	.hw-sig-line {
		width: 2.5in;
		border-bottom: 1px solid #333;
		margin-bottom: 0.3em;
	}

	.hw-sig-name {
		margin: 0;
		font-size: 12pt;
	}

	/* Envelopes */
	.envelopes-wrap {
		margin-top: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.envelopes-wrap.hidden {
		display: none;
	}

	.envelopes-heading {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #6b7280;
		align-self: flex-start;
	}

	.envelope-page {
		background: white;
		width: min(9.5in, 100%);
		height: 4.125in;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
		position: relative;
		font-family: Georgia, 'Times New Roman', serif;
		overflow: hidden;
	}

	.env-label {
		position: absolute;
		top: 0.15in;
		right: 0.3in;
		font-size: 0.6875rem;
		color: #9ca3af;
	}

	.env-return {
		position: absolute;
		top: 0.3in;
		left: 0.4in;
		font-size: 9pt;
		line-height: 1.5;
		white-space: pre-line;
		color: #111;
	}

	.env-recipient {
		position: absolute;
		top: 1.35in;
		left: 4in;
		font-size: 11pt;
		line-height: 1.65;
		white-space: pre-line;
		color: #111;
	}

	/* Print */
	@media print {
		.no-print {
			display: none !important;
		}

		.root {
			background: white;
			padding: 0;
		}

		/* Default print mode: letters only */
		.envelope-page,
		.envelopes-wrap {
			display: none !important;
		}

		.letter-page {
			page: letter-page;
			break-after: page;
			box-shadow: none;
			padding: 0;
			width: 100%;
			min-height: 0;
		}

		.letter-page.letter-hw {
			display: flex;
			flex-direction: column;
			height: 9in;
		}

		/* Envelope print mode */
		[data-print-mode='envelopes'] .letter-page,
		[data-print-mode='envelopes'] .letters-wrap {
			display: none !important;
		}

		[data-print-mode='envelopes'] .envelopes-wrap,
		[data-print-mode='envelopes'] .envelope-page {
			display: block !important;
		}

		[data-print-mode='envelopes'] .envelope-page {
			page: envelope-page;
			break-after: page;
			box-shadow: none;
			width: 100%;
			height: 100%;
		}
	}
</style>
