<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import FeedbackButton from '$lib/components/FeedbackButton.svelte';

	const { children } = $props();

	const steps = [
		{ href: '/lookup', label: 'Find reps' },
		{ href: '/issues', label: 'Select issues' },
		{ href: '/packet', label: 'Select actions' },
		{ href: '/action', label: 'Take action' }
	];

	const currentStep = $derived(steps.findIndex((s) => page.url.pathname === s.href));
</script>

<div class="site">
	<header class="site-header">
		<div class="container header-inner">
			<a href="/" class="wordmark">Civitas</a>

			<nav class="breadcrumbs" aria-label="Steps">
				{#each steps as step, i}
					{#if i > 0}
						<span class="sep" aria-hidden="true">›</span>
					{/if}
					<a
						href={step.href}
						class="crumb"
						class:active={currentStep === i}
						class:visited={currentStep > i}
						aria-current={currentStep === i ? 'step' : undefined}
					>
						<span class="crumb-num">{i + 1}</span>
						{step.label}
					</a>
				{/each}
			</nav>
		</div>
	</header>

	<main class="site-main">
		{@render children()}
	</main>

	<FeedbackButton />

	<footer class="site-footer">
		<div class="container">
			<p>Your address is never stored. <a href="/privacy">How this works.</a></p>
		</div>
	</footer>
</div>

<style>
	.site {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.site-header {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-inner {
		display: flex;
		align-items: center;
		height: 52px;
		gap: 2rem;
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: 0.04em;
		text-decoration: none;
		flex-shrink: 0;
	}

	.breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}

	.sep {
		color: var(--color-border);
		font-size: 1rem;
		user-select: none;
		padding: 0 0.125rem;
	}

	.crumb {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
		text-decoration: none;
		padding: 0.25rem 0.375rem;
		border-radius: var(--radius-sm);
		transition: color 0.15s;
		white-space: nowrap;
	}

	.crumb:hover {
		color: var(--color-text);
	}

	.crumb.visited {
		color: var(--color-text-muted);
	}

	.crumb.active {
		color: var(--color-accent);
		font-weight: 600;
	}

	.crumb-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		font-size: 0.6875rem;
		font-weight: 700;
		background: var(--color-border);
		color: var(--color-text-muted);
		flex-shrink: 0;
		transition: background 0.15s, color 0.15s;
	}

	.crumb.visited .crumb-num {
		background: var(--color-border);
	}

	.crumb.active .crumb-num {
		background: var(--color-accent);
		color: #fff;
	}

	.site-main {
		flex: 1;
	}

	.site-footer {
		padding: 2rem 0;
		border-top: 1px solid var(--color-border);
		margin-top: 4rem;
	}

	.site-footer p {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0;
		text-align: center;
	}

	@media (max-width: 480px) {
		.site-footer {
			padding-bottom: 4.5rem;
		}

		.crumb-num {
			display: none;
		}

		.header-inner {
			height: auto;
			padding: 0.5rem 0;
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 0.375rem 1rem;
		}

		.breadcrumbs {
			width: 100%;
			flex-wrap: wrap;
			row-gap: 0.125rem;
		}
	}
</style>
