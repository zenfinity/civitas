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
	issueName: string,
	issueDescription: string,
	channel: Channel,
	tone: Tone,
	userName: string
): string {
	const rep = [repTitle, repName, districtName ? `(${districtName})` : ''].filter(Boolean).join(' ');
	const from = userName || 'a constituent';
	const tonePhrase = TONE_PHRASES[tone] ?? TONE_PHRASES.constituent_concern;
	const context = issueDescription ? ` Context: ${issueDescription}` : '';

	switch (channel) {
		case 'phone':
			return `Write a phone script for ${from} calling ${rep} about "${issueName}".${context} Write ${tonePhrase}. Format as a brief opening sentence followed by 3–4 talking points. Under 150 words. Plain text only, no markdown.`;
		case 'email':
			return `Write an email from ${from} to ${rep} about "${issueName}".${context} Write ${tonePhrase}. Include salutation, 2–3 short paragraphs, and a closing. Under 250 words. Plain text only, no markdown.`;
		case 'mail': {
			const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
			return `Write a formal letter from ${from} to ${rep} about "${issueName}".${context} Write ${tonePhrase}. Format it as a formal letter: start with the date (${today}), skip a line, then the salutation "Dear ${repTitle} ${repName},", then 2–3 body paragraphs, then "Sincerely," followed by ${from} on the next line. Under 300 words. Plain text only, no markdown.`;
		}
		case 'web_form':
			return `Write a web form message from ${from} to ${rep} about "${issueName}".${context} Write ${tonePhrase}. Under 150 words. Plain text only, no markdown.`;
		case 'fax':
			return `Write a fax message from ${from} to ${rep} about "${issueName}".${context} Write ${tonePhrase}. Under 200 words. Plain text only, no markdown.`;
		default:
			return `Write a message from ${from} to ${rep} about "${issueName}". Write ${tonePhrase}. Under 150 words. Plain text only.`;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	if (!env.MISTRAL_AI_API_KEY) {
		throw error(500, 'MISTRAL_AI_API_KEY is not configured');
	}

	const { repName, repTitle, districtName, issueName, issueDescription, channel, tone, userName } =
		await request.json();

	if (!repName || !issueName || !channel) {
		throw error(400, 'Missing required fields');
	}

	const prompt = buildPrompt(
		repName,
		repTitle ?? '',
		districtName ?? null,
		issueName,
		issueDescription ?? '',
		channel as Channel,
		(tone ?? 'constituent_concern') as Tone,
		userName ?? ''
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
			max_tokens: 500,
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
