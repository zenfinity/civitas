import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { Channel, Tone } from '$lib/types';

const MODEL = 'mistral-small-latest';

const TONE_PHRASES: Record<Tone, string> = {
	constituent_concern: 'as a concerned constituent',
	formal_request: 'in a formal, professional tone',
	urgent_action: 'with urgency, calling for immediate action'
};

function buildPrompt(
	repName: string,
	repTitle: string,
	districtName: string | null,
	issues: { name: string; description: string }[],
	channel: Channel,
	tone: Tone,
	userName: string,
	userAddress: string,
	userEmail: string
): string {
	const rep = [repTitle, repName, districtName ? `(${districtName})` : ''].filter(Boolean).join(' ');
	const from = userName || 'a constituent';
	const tonePhrase = TONE_PHRASES[tone] ?? TONE_PHRASES.constituent_concern;
	const issueList = issues
		.map((i) => `- ${i.name}${i.description ? ': ' + i.description : ''}`)
		.join('\n');

	switch (channel) {
		case 'phone':
			return `Write a phone script for ${from} calling ${rep} about multiple policy issues:\n${issueList}\n\nWrite ${tonePhrase}. Open with a brief introduction, then give one focused talking point per issue, then a closing ask. Under 200 words. Plain text only, no markdown.`;

		case 'email':
			return `Write an email from ${from} to ${rep} addressing multiple policy issues:\n${issueList}\n\nWrite ${tonePhrase}. Start with "Subject:" on the first line, then a salutation, then one short paragraph per issue, then a closing. Under 400 words. Plain text only, no markdown.`;

		case 'mail': {
			const today = new Date().toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
			const senderBlock = [from, userAddress, userEmail].filter(Boolean).join('\n');
			return `Write a formal letter from ${from} to ${rep} addressing multiple policy issues:\n${issueList}\n\nWrite ${tonePhrase}. Use this exact structure: sender block:\n${senderBlock}\n\nDate (${today}), blank line, salutation "Dear ${repTitle} ${repName},", one paragraph per issue, then "Sincerely," followed by ${from}. Under 450 words. Plain text only, no markdown.`;
		}

		case 'web_form':
			return `Write a web form message from ${from} to ${rep} about multiple policy issues:\n${issueList}\n\nWrite ${tonePhrase}. Address each issue briefly in its own short paragraph. Under 250 words. Plain text only, no markdown.`;

		case 'fax':
			return `Write a fax message from ${from} to ${rep} about multiple policy issues:\n${issueList}\n\nWrite ${tonePhrase}. Start with "Dear ${repTitle} ${repName}," and address each issue concisely. End with "Sincerely," followed by ${from}. Under 200 words. Plain text only, no markdown.`;

		default:
			return `Write a message from ${from} to ${rep} about the following issues:\n${issueList}\n\nWrite ${tonePhrase}. Under 300 words. Plain text only.`;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	if (!env.MISTRAL_AI_API_KEY) {
		throw error(500, 'MISTRAL_AI_API_KEY is not configured');
	}

	const { repName, repTitle, districtName, issues, channel, tone, userName, userAddress, userEmail } =
		await request.json();

	if (!repName || !issues?.length || !channel) {
		throw error(400, 'Missing required fields');
	}

	const prompt = buildPrompt(
		repName,
		repTitle ?? '',
		districtName ?? null,
		issues,
		channel as Channel,
		(tone ?? 'constituent_concern') as Tone,
		userName ?? '',
		userAddress ?? '',
		userEmail ?? ''
	);

	const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.MISTRAL_AI_API_KEY}`
		},
		body: JSON.stringify({
			model: MODEL,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 650,
			temperature: 0.7
		})
	});

	if (!res.ok) {
		const msg = await res.text();
		console.error('Mistral error:', res.status, msg);
		throw error(502, `Mistral ${res.status}: ${msg}`);
	}

	const data = await res.json();
	const script = data.choices?.[0]?.message?.content;
	if (!script) throw error(502, 'No content returned');

	return json({ script });
};
