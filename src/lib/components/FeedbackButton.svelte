<script lang="ts">
	let open = $state(false);
	let message = $state('');
	let contact = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');

	async function submit() {
		if (!message.trim()) return;
		status = 'sending';
		errorMsg = '';
		try {
			const res = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: message.trim(), contact: contact.trim() })
			});
			if (!res.ok) throw new Error(await res.text());
			status = 'sent';
			message = '';
			contact = '';
		} catch (e) {
			status = 'error';
			errorMsg = e instanceof Error ? e.message : 'Failed to send';
		}
	}

	function close() {
		open = false;
		if (status === 'sent' || status === 'error') status = 'idle';
	}
</script>

<button class="fab" onclick={() => (open = true)} aria-label="Send feedback">
	Feedback
</button>

{#if open}
	<div
		class="overlay"
		role="presentation"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
	>
		<div
			class="dialog card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="fb-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			{#if status === 'sent'}
				<h3 id="fb-title">Thanks!</h3>
				<p style="color: var(--color-text-muted); font-size: 0.9375rem;">Your feedback was submitted as a GitHub issue.</p>
				<button class="btn btn-ghost" onclick={close}>Close</button>
			{:else}
				<h3 id="fb-title">Send feedback</h3>
				<p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 1rem;">
					Bug, idea, or general thought — all welcome.
				</p>
				<label class="label" for="fb-message">Message</label>
				<textarea
					id="fb-message"
					class="input"
					rows="5"
					placeholder="What's on your mind?"
					bind:value={message}
					disabled={status === 'sending'}
					style="resize: vertical;"
				></textarea>
				<label class="label" for="fb-contact" style="margin-top: 0.75rem;">
					Email <span style="color: var(--color-text-muted); font-weight: 400;">(optional — if you'd like a reply)</span>
				</label>
				<input
					id="fb-contact"
					class="input"
					type="email"
					placeholder="you@example.com"
					bind:value={contact}
					disabled={status === 'sending'}
				/>
				{#if status === 'error'}
					<p style="color: var(--color-danger); font-size: 0.875rem; margin-top: 0.5rem;">{errorMsg}</p>
				{/if}
				<div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
					<button
						class="btn btn-primary"
						onclick={submit}
						disabled={!message.trim() || status === 'sending'}
					>{status === 'sending' ? 'Sending…' : 'Submit'}</button>
					<button class="btn btn-ghost" onclick={close}>Cancel</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.fab {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 400;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		padding: 0.4rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		transition: color 0.15s, border-color 0.15s;
	}

	.fab:hover {
		color: var(--color-text);
		border-color: var(--color-text-muted);
	}

	.overlay {
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
		margin-bottom: 0.5rem;
	}

	@media print {
		.fab {
			display: none;
		}
	}
</style>
