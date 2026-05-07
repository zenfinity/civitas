/**
 * Pre-generate script templates for all preset issues × channels × tones.
 * Templates use {{REP_NAME}}, {{REP_TITLE}}, {{YOUR_NAME}}, {{DISTRICT}} as placeholders.
 * Writes results to src/lib/issue-templates.json (skips already-generated keys).
 *
 * Usage: node scripts/generate-templates.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dir, '../src/lib/issue-templates.json');

function loadEnv() {
	try {
		return Object.fromEntries(
			readFileSync(resolve(__dir, '../.env'), 'utf-8')
				.split('\n')
				.filter((l) => l.includes('=') && !l.startsWith('#'))
				.map((l) => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
		);
	} catch { return {}; }
}

const env = { ...process.env, ...loadEnv() };
const MISTRAL_KEY = env.MISTRAL_AI_API_KEY;
if (!MISTRAL_KEY) { console.error('Missing MISTRAL_AI_API_KEY'); process.exit(1); }

const ISSUES = [
	{ label: 'Housing affordability',  description: 'Affordable housing production, rent stabilization, anti-displacement.' },
	{ label: 'Public transit funding', description: 'TriMet operations, bus service, MAX expansion.' },
	{ label: 'Climate and environment',description: 'Clean energy, building emissions, urban tree canopy.' },
	{ label: 'Public safety',          description: 'Police accountability, community safety programs, mental health response.' },
	{ label: 'Education funding',      description: 'K-12 funding, school resources, PPS budget.' },
	{ label: 'Homelessness response',  description: 'Shelter capacity, services, Shelter to Housing Continuum.' },
	{ label: 'Immigrant rights',       description: 'Sanctuary policies, access to services, deportation protections.' },
	{ label: 'Reproductive rights',    description: 'Access to reproductive healthcare and related protections.' },
	{ label: 'Water and utilities',    description: 'Clean water infrastructure, utility affordability.' }
];

const CHANNELS = ['phone', 'email', 'mail', 'web_form', 'fax'];
const TONES = ['constituent_concern', 'formal_request', 'urgent_action'];

const TONE_PHRASES = {
	constituent_concern: 'as a concerned constituent',
	formal_request:      'in a formal, professional tone',
	urgent_action:       'with urgency, calling for immediate action'
};

function buildPrompt(issue, channel, tone) {
	const rep   = '{{REP_TITLE}} {{REP_NAME}} ({{DISTRICT}})';
	const from  = '{{YOUR_NAME}}';
	const ctx   = issue.description ? ` Context: ${issue.description}` : '';
	const toneP = TONE_PHRASES[tone];

	switch (channel) {
		case 'phone':
			return `Write a phone script for ${from} calling ${rep} about "${issue.label}".${ctx} Write ${toneP}. Format as a brief opening sentence followed by 3–4 talking points. Under 150 words. Plain text only, no markdown. Use {{YOUR_NAME}}, {{REP_NAME}}, {{REP_TITLE}}, {{DISTRICT}} as literal placeholders — do not substitute them.`;
		case 'email':
			return `Write an email from ${from} to ${rep} about "${issue.label}".${ctx} Write ${toneP}. Include salutation, 2–3 short paragraphs, and a closing. Under 250 words. Plain text only, no markdown. Use {{YOUR_NAME}}, {{REP_NAME}}, {{REP_TITLE}}, {{DISTRICT}} as literal placeholders — do not substitute them.`;
		case 'mail':
			return `Write a formal letter from ${from} to ${rep} about "${issue.label}".${ctx} Write ${toneP}. Format it as a formal letter: start with "{{DATE}}", skip a line, then the salutation "Dear {{REP_TITLE}} {{REP_NAME}},", then 2–3 body paragraphs, then "Sincerely," followed by {{YOUR_NAME}} on the next line. Under 300 words. Plain text only, no markdown. Use {{YOUR_NAME}}, {{REP_NAME}}, {{REP_TITLE}}, {{DISTRICT}}, {{DATE}} as literal placeholders — do not substitute them.`;
		case 'web_form':
			return `Write a web form message from ${from} to ${rep} about "${issue.label}".${ctx} Write ${toneP}. Under 150 words. Plain text only, no markdown. Use {{YOUR_NAME}}, {{REP_NAME}}, {{REP_TITLE}}, {{DISTRICT}} as literal placeholders — do not substitute them.`;
		case 'fax':
			return `Write a fax message from ${from} to ${rep} about "${issue.label}".${ctx} Write ${toneP}. Under 200 words. Plain text only, no markdown. Use {{YOUR_NAME}}, {{REP_NAME}}, {{REP_TITLE}}, {{DISTRICT}} as literal placeholders — do not substitute them.`;
	}
}

async function callMistral(prompt) {
	const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MISTRAL_KEY}` },
		body: JSON.stringify({
			model: 'mistral-small-latest',
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 500,
			temperature: 0.7
		})
	});
	if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
	const data = await res.json();
	return data.choices?.[0]?.message?.content?.trim();
}

async function main() {
	let out = {};
	try { out = JSON.parse(readFileSync(OUT_PATH, 'utf-8')); } catch {}

	const total = ISSUES.length * CHANNELS.length * TONES.length;
	let done = 0, skipped = 0, failed = 0;

	for (const issue of ISSUES) {
		out[issue.label] ??= {};
		for (const channel of CHANNELS) {
			for (const tone of TONES) {
				const key = `${channel}:${tone}`;
				if (out[issue.label][key]) { skipped++; done++; continue; }

				const prompt = buildPrompt(issue, channel, tone);
				try {
					const text = await callMistral(prompt);
					out[issue.label][key] = text;
					writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
					console.log(`  [${++done}/${total}] ${issue.label} / ${channel} / ${tone}`);
				} catch (e) {
					console.error(`  FAILED ${issue.label} / ${channel} / ${tone}: ${e.message}`);
					failed++;
					done++;
				}
			}
		}
	}

	console.log(`\nDone. ${done} total, ${skipped} skipped, ${failed} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
