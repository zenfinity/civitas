/**
 * Seed the Neon DB with Portland-area elected officials via the Cicero API.
 * Uses 4 addresses covering all Portland city council districts.
 * Safe to re-run — uses ON CONFLICT DO NOTHING via source_id.
 *
 * Usage: node scripts/seed-portland.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
	try {
		return Object.fromEntries(
			readFileSync(resolve(__dir, '../.env'), 'utf-8')
				.split('\n')
				.filter((l) => l.includes('=') && !l.startsWith('#'))
				.map((l) => {
					const [k, ...v] = l.split('=');
					return [k.trim(), v.join('=').trim()];
				})
		);
	} catch {
		return {};
	}
}

const env = { ...process.env, ...loadEnv() };
const CICERO_KEY = env.CICERO_API_KEY;
const DATABASE_URL = env.DATABASE_URL;

if (!CICERO_KEY || !DATABASE_URL) {
	console.error('Missing CICERO_API_KEY or DATABASE_URL in .env');
	process.exit(1);
}

// One address per Portland city council district.
// Federal/state/county/Metro officials appear in every result and are deduped by source_id.
const SEED_ADDRESSES = [
	{ label: 'NW Portland — City District 1',   addr: '1234 NW 23rd Ave, Portland, OR 97210' },
	{ label: 'NE Portland — City District 2',   addr: '4444 NE Broadway, Portland, OR 97213' },
	{ label: 'SE Portland — City District 3',   addr: '3456 SE Division St, Portland, OR 97202' },
	{ label: 'SW Portland — City District 4',   addr: '6543 SW Capitol Hwy, Portland, OR 97219' },
	{ label: 'N Portland  — Metro District 7',  addr: '4321 N Mississippi Ave, Portland, OR 97217' },
	{ label: 'E Portland  — Metro District 4',  addr: '1234 NE 82nd Ave, Portland, OR 97220' }
];

// District types to include.
// LOCAL covers city council, Metro district seats, county, school boards.
// LOCAL_EXEC covers Metro President, county chair.
// STATE_EXEC covers Governor, AG, SoS — meaningful contacts for most issues.
// Skip NATIONAL_EXEC (President's cabinet — not useful for constituent outreach).
const INCLUDE_TYPES = new Set([
	'NATIONAL_UPPER',
	'NATIONAL_LOWER',
	'STATE_UPPER',
	'STATE_LOWER',
	'STATE_EXEC',
	'LOCAL_EXEC',
	'LOCAL',
	'SCHOOL'
]);

function mapLevel(districtType, label = '') {
	const l = label.toLowerCase();
	switch (districtType) {
		case 'NATIONAL_UPPER':
		case 'NATIONAL_LOWER':
			return 'federal';
		case 'STATE_UPPER':
		case 'STATE_LOWER':
		case 'STATE_EXEC':
			return 'state';
		case 'LOCAL_EXEC':
		case 'LOCAL':
		case 'SCHOOL':
			if (l.includes('metro')) return 'metro';
			if (l.includes('multnomah') || l.includes('county')) return 'county';
			if (l.includes('school') || l.includes('pps') || l.includes('education')) return 'school';
			return 'city';
		default:
			return 'special';
	}
}

function officialName(o) {
	return [o.salutation, o.preferred_name || o.first_name, o.middle_initial, o.last_name, o.name_suffix]
		.filter(Boolean)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function computeCompleteness(o) {
	const addr = o.addresses?.[0];
	const checks = [
		!!(addr?.phone_1 || addr?.phone_2),
		!!o.email_addresses?.length,
		!!o.addresses?.length,
		!!o.urls?.length,
		!!(addr?.fax_1 || addr?.fax_2)
	];
	return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function mailingAddress(o) {
	const a = o.addresses?.[0];
	if (!a?.address_1) return null;
	return JSON.stringify({
		street: [a.address_1, a.address_2, a.address_3].filter(Boolean).join(', '),
		city: a.city ?? '',
		state: a.state ?? '',
		zip: a.postal_code ?? ''
	});
}

async function fetchCiceroPage(address, offset = 0) {
	const url = new URL('https://cicero.azavea.com/v3.1/official');
	url.searchParams.set('search_loc', address);
	url.searchParams.set('key', CICERO_KEY);
	if (offset > 0) url.searchParams.set('offset', String(offset));
	const res = await fetch(url.toString());
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Cicero ${res.status}: ${text.slice(0, 200)}`);
	}
	const data = await res.json();
	const errors = data.response?.errors;
	if (errors?.length) throw new Error(`Cicero error: ${JSON.stringify(errors)}`);
	const results = data.response?.results;
	const officials = results?.candidates?.[0]?.officials ?? [];
	const total = results?.candidates?.[0]?.count?.total ?? officials.length;
	return { officials, total };
}

async function fetchCicero(address) {
	const { officials: first, total } = await fetchCiceroPage(address, 0);
	if (first.length >= total) return { officials: first, pages: 1 };
	const { officials: rest } = await fetchCiceroPage(address, first.length);
	return { officials: [...first, ...rest], pages: 2 };
}

async function main() {
	const sql = neon(DATABASE_URL);

	let totalFetched = 0;
	let districtsInserted = 0;
	let repsInserted = 0;

	// district source_id → db uuid cache
	const districtIdCache = new Map();

	for (const { label, addr } of SEED_ADDRESSES) {
		console.log(`\n── ${label}`);
		console.log(`   ${addr}`);

		let officials, pages;
		try {
			({ officials, pages } = await fetchCicero(addr));
		} catch (e) {
			console.error(`   ERROR: ${e.message}`);
			continue;
		}

		const relevant = officials.filter((o) => INCLUDE_TYPES.has(o.office?.district?.district_type));
		console.log(`   ${officials.length} officials returned (${pages} page${pages > 1 ? 's' : ''}), ${relevant.length} relevant (~${officials.length} credits used)`);
		totalFetched += officials.length;

		for (const o of relevant) {
			const district = o.office?.district;
			const districtType = district?.district_type;
			const districtLabel = district?.label || district?.name || o.office?.title || '';
			const level = mapLevel(districtType, districtLabel);
			const districtSourceId = district?.ocd_id ?? `cicero-district:${district?.id}`;

			// Upsert district
			if (!districtIdCache.has(districtSourceId)) {
				const rows = await sql`
					INSERT INTO districts (level, name, source_id)
					VALUES (${level}, ${districtLabel}, ${districtSourceId})
					ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name
					RETURNING id
				`;
				districtIdCache.set(districtSourceId, rows[0].id);
				districtsInserted++;
			}

			const districtDbId = districtIdCache.get(districtSourceId);
			const officialSourceId = `cicero-official:${o.id}`;
			const addr0 = o.addresses?.[0];

			const rows = await sql`
				INSERT INTO representatives (
					district_id, name, title, level,
					phone, fax, email,
					mailing_address, web_form_url,
					data_source, verified_at,
					completeness_score, community_verified,
					source_id
				) VALUES (
					${districtDbId},
					${officialName(o)},
					${o.office?.title ?? ''},
					${level},
					${addr0?.phone_1 ?? null},
					${addr0?.fax_1 ?? null},
					${o.email_addresses?.[0] ?? null},
					${mailingAddress(o)},
					${o.urls?.[0] ?? null},
					${'cicero'},
					${new Date().toISOString()},
					${computeCompleteness(o)},
					${false},
					${officialSourceId}
				)
				ON CONFLICT (source_id) DO UPDATE SET
					name            = EXCLUDED.name,
					phone           = EXCLUDED.phone,
					fax             = EXCLUDED.fax,
					email           = EXCLUDED.email,
					mailing_address = EXCLUDED.mailing_address,
					web_form_url    = EXCLUDED.web_form_url,
					completeness_score = EXCLUDED.completeness_score,
					verified_at     = EXCLUDED.verified_at
				RETURNING id, name, title, level
			`;

			if (rows.length) {
				repsInserted++;
				console.log(`   [${level.padEnd(7)}] ${rows[0].name} — ${rows[0].title}`);
			}
		}
	}

	console.log('\n══════════════════════════════');
	console.log(`Cicero credits used: ~${totalFetched}`);
	console.log(`Districts upserted:  ${districtsInserted}`);
	console.log(`Officials upserted:  ${repsInserted}`);
	console.log('══════════════════════════════\n');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
