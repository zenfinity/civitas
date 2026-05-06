<script lang="ts">
	import type { Representative } from '$lib/types';
	import { CHANNEL_LABELS } from '$lib/types';

	const { rep }: { rep: Representative } = $props();

	const channels = $derived([
		{ key: 'phone' as const, available: !!rep.phone, value: rep.phone },
		{ key: 'email' as const, available: !!rep.email, value: rep.email },
		{ key: 'fax' as const, available: !!rep.fax, value: rep.fax },
		{ key: 'mail' as const, available: !!rep.mailing_address, value: null },
		{ key: 'web_form' as const, available: !!rep.web_form_url, value: rep.web_form_url }
	]);

	const availableCount = $derived(channels.filter((c) => c.available).length);
</script>

<div class="rep-card card">
	<div class="rep-header">
		<div>
			<div class="rep-name">{rep.name}</div>
			<div class="rep-title">{rep.title}</div>
		</div>
		{#if rep.community_verified}
			<span class="verified-badge" title="Community verified">✓</span>
		{/if}
	</div>

	<div class="channels">
		{#each channels as ch}
			<span class="channel-dot" class:available={ch.available} title={CHANNEL_LABELS[ch.key]}>
				{ch.key === 'phone' ? '☎' : ch.key === 'email' ? '✉' : ch.key === 'fax' ? 'F' : ch.key === 'mail' ? '✉' : '🌐'}
			</span>
		{/each}
	</div>

	<div class="completeness">
		<div class="completeness-bar">
			<div class="completeness-fill" style="width: {rep.completeness_score}%"></div>
		</div>
		<span class="completeness-label">{availableCount}/5 channels</span>
	</div>

	{#if rep.phone}
		<a href="tel:{rep.phone}" class="contact-link">☎ {rep.phone}</a>
	{/if}
	{#if rep.email}
		<a href="mailto:{rep.email}" class="contact-link">✉ {rep.email}</a>
	{/if}
	{#if rep.web_form_url}
		<a href={rep.web_form_url} target="_blank" rel="noopener" class="contact-link">Web contact form →</a>
	{/if}
</div>

<style>
	.rep-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.rep-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.rep-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.rep-title {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin-top: 0.125rem;
	}

	.verified-badge {
		font-size: 0.75rem;
		color: var(--color-success);
		font-weight: 700;
		background: #dcfce7;
		padding: 0.15rem 0.4rem;
		border-radius: 999px;
	}

	.channels {
		display: flex;
		gap: 0.5rem;
	}

	.channel-dot {
		font-size: 0.875rem;
		opacity: 0.25;
	}

	.channel-dot.available {
		opacity: 1;
	}

	.completeness {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.completeness-bar {
		flex: 1;
	}

	.completeness-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.contact-link {
		font-size: 0.875rem;
		color: var(--color-accent);
		text-decoration: none;
		display: block;
	}

	.contact-link:hover {
		text-decoration: underline;
	}
</style>
