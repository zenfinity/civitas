<svelte:head>
	<title>Privacy — Civitas</title>
</svelte:head>

<div class="container" style="max-width: 720px; padding-top: 2.5rem; padding-bottom: 4rem;">
	<h1>How your data works</h1>

	<section>
		<h2>Your address stays on your device</h2>
		<p>
			When you enter an address, it is sent to the Census Bureau's free geocoding API to convert it
			to a latitude and longitude. That lat/long is then sent to our server to find your
			representatives. <strong>We never store your address, lat/long, or any identifying
			information.</strong> The only thing our server keeps is the public rep contact data itself.
		</p>
	</section>

	<section>
		<h2>The encrypted pack file</h2>
		<p>
			If you choose to save your session, it is encrypted entirely in your browser using AES-256-GCM
			(the Web Crypto API) before anything touches your disk. The encrypted file — called a pack —
			lives only on your device. We never see it.
		</p>
		<p>
			To load a saved session, you upload the file and enter your passphrase. Decryption happens
			in-browser. The passphrase is never sent anywhere.
		</p>
	</section>

	<section>
		<h2>The public rep database</h2>
		<p>
			Representative contact information (phone numbers, emails, office addresses) is civic commons
			data — information about public officials, not about users. This data lives in our database and
			is returned when your district is resolved. It contains nothing about you.
		</p>
	</section>

	<section>
		<h2>Community contributions</h2>
		<p>
			If you submit a missing phone number or email for a representative, that record is attached to
			the representative's ID — not to you, your address, or your district. There is no contributor
			log.
		</p>
	</section>

	<section>
		<h2>No analytics, no tracking</h2>
		<p>
			There are no cookies, no analytics scripts, no third-party trackers. The only external call
			from your browser is to the Census Bureau geocoding API.
		</p>
	</section>

	<section>
		<h2>Intellectual lineage</h2>
		<p>
			This privacy architecture is directly inspired by Alex Pentland's New Deal on Data and the
			personal data store tradition (openPDS, Solid/Pods). The principle: individuals should own
			their data the way they own physical property. The encrypted pack is an implementation of that
			principle that works today, without waiting for infrastructure that doesn't exist yet.
		</p>
	</section>
</div>

<style>
	section {
		margin-bottom: 2rem;
	}

	h2 {
		margin-bottom: 0.5rem;
	}

	p {
		color: var(--color-text-muted);
		line-height: 1.75;
	}
</style>
