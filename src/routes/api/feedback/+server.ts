import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const REPO = 'zenfinity/civitas';

export const POST: RequestHandler = async ({ request }) => {
	if (!env.GITHUB_TOKEN) {
		throw error(500, 'GITHUB_TOKEN is not configured');
	}

	const { message, contact } = await request.json();
	if (!message?.trim()) {
		throw error(400, 'Message is required');
	}

	const body = contact?.trim()
		? `${message.trim()}\n\n---\n**Contact:** ${contact.trim()}`
		: message.trim();

	const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.GITHUB_TOKEN}`,
			'X-GitHub-Api-Version': '2022-11-28',
			Accept: 'application/vnd.github+json'
		},
		body: JSON.stringify({
			title: `Feedback: ${message.trim().slice(0, 72)}${message.trim().length > 72 ? '…' : ''}`,
			body,
			labels: ['feedback']
		})
	});

	if (!res.ok) {
		const msg = await res.text();
		console.error('GitHub API error:', res.status, msg);
		throw error(502, `GitHub ${res.status}`);
	}

	const issue = await res.json();
	return json({ url: issue.html_url });
};
