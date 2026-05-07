<script lang="ts">
	import { decryptPack } from '$lib/crypto';
	import { loadPack } from '$lib/store';

	let fileInput: HTMLInputElement;
	let passphrase = $state('');
	let error = $state('');
	let loading = $state(false);
	let showUploadPanel = $state(false);

	function openUploadPanel() {
		showUploadPanel = true;
		error = '';
		passphrase = '';
	}

	async function handleUpload() {
		const file = fileInput?.files?.[0];
		if (!file || !passphrase) return;

		loading = true;
		error = '';
		try {
			const loaded = await decryptPack(file, passphrase);
			loadPack(loaded);
			window.location.assign('/packet');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load pack';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Civitas — Find your representatives</title>
</svelte:head>

<section class="hero">
	<div class="container hero-inner">
		<div class="hero-text">
			<h1>Know who represents you.<br />Know how to reach them.</h1>
			<p class="subtitle">
				Enter your address and get a complete contact matrix for every elected official — from city
				council to Congress — across every channel.
			</p>
			<div class="ctas">
				<a href="/lookup" class="btn btn-primary">Get started</a>
				<button class="btn btn-secondary" onclick={openUploadPanel}>
					Load saved session
				</button>
			</div>
		</div>

		{#if showUploadPanel}
		<div class="upload-card card">
			<h3>Load your pack</h3>
			<p style="font-size: 0.875rem; color: var(--color-text-muted);">
				Your pack file is decrypted entirely in your browser. Nothing is sent to any server.
			</p>
			<label class="label" for="pack-file">Pack file (.cvts)</label>
			<input
				id="pack-file"
				type="file"
				accept=".cvts"
				class="input"
				bind:this={fileInput}
				style="padding: 0.375rem;"
			/>
			<label class="label" for="load-passphrase" style="margin-top: 1rem;">Passphrase</label>
			<input
				id="load-passphrase"
				type="password"
				class="input"
				placeholder="Your encryption passphrase"
				bind:value={passphrase}
			/>
			{#if error}
				<p style="color: var(--color-danger); font-size: 0.875rem; margin-top: 0.5rem;">{error}</p>
			{/if}
			<div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
				<button
					class="btn btn-primary"
					onclick={handleUpload}
					disabled={loading}
				>
					{loading ? 'Decrypting…' : 'Load session'}
				</button>
				<button class="btn btn-ghost" onclick={() => (showUploadPanel = false)}>Cancel</button>
			</div>
		</div>
		{/if}
	</div>
</section>

<section class="how-it-works">
	<div class="container">
		<h2>How it works</h2>
		<div class="steps">
			<div class="step">
				<div class="step-num">1</div>
				<h3>Enter your address</h3>
				<p>
					Your address is geocoded to find your districts. It never touches our servers — the lookup
					returns rep data, not your location.
				</p>
			</div>
			<div class="step">
				<div class="step-num">2</div>
				<h3>See your full rep matrix</h3>
				<p>
					From city council to the US Senate — every elected official across all levels of
					government, with completeness scores for their contact info.
				</p>
			</div>
			<div class="step">
				<div class="step-num">3</div>
				<h3>Pick issues and channels</h3>
				<p>
					Choose what you care about and how you want to reach out — phone, email, mail, fax, or web
					form. Optionally generate a script.
				</p>
			</div>
			<div class="step">
				<div class="step-num">4</div>
				<h3>Take action</h3>
				<p>
					Work through your contact checklist. Save your encrypted session to your device and pick up
					where you left off.
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		padding: 5rem 0 4rem;
		background: linear-gradient(180deg, #ede9fe 0%, var(--color-bg) 100%);
		border-bottom: 1px solid var(--color-border);
	}

	.hero-inner {
		max-width: 720px;
	}

	.hero-text h1 {
		font-size: 3rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		margin-bottom: 1rem;
	}

	.subtitle {
		font-size: 1.125rem;
		color: var(--color-text-muted);
		line-height: 1.7;
		margin-bottom: 2rem;
	}

	.ctas {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.how-it-works {
		padding: 4rem 0;
	}

	.how-it-works h2 {
		margin-bottom: 2rem;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 2rem;
	}

	.step {
		position: relative;
	}

	.step-num {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-accent);
		color: #fff;
		font-weight: 700;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.75rem;
	}

	.step h3 {
		margin-bottom: 0.5rem;
	}

	.step p {
		font-size: 0.9375rem;
		color: var(--color-text-muted);
		margin: 0;
	}
</style>
