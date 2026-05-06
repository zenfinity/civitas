<script lang="ts">
	import '../app.css';

	const { children } = $props();
</script>

<div class="site">
	<header class="site-header">
		<div class="container header-inner">
			<a href="/" class="wordmark">Civitas</a>
		</div>
	</header>

	<main class="site-main">
		{@render children()}
	</main>

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
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: 0.04em;
		text-decoration: none;
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
</style>
