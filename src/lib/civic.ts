import type { Representative, Level, MailingAddress, CivicInfo, CivicVotingLocation, CivicContest } from './types';

// Google Civic Information API types
interface CivicAddress {
	line1?: string;
	line2?: string;
	city?: string;
	state?: string;
	zip?: string;
}

interface CivicOfficial {
	name: string;
	address?: CivicAddress[];
	party?: string;
	phones?: string[];
	urls?: string[];
	emails?: string[];
	photoUrl?: string;
	channels?: { type: string; id: string }[];
}

interface CivicOffice {
	name: string;
	divisionId: string;
	levels?: string[];
	roles?: string[];
	officialIndices: number[];
}

interface CivicResponse {
	normalizedInput?: CivicAddress;
	offices?: CivicOffice[];
	officials?: CivicOfficial[];
	error?: { message: string };
}

const CIVIC_BASE = 'https://www.googleapis.com/civicinfo/v2';
const CIVIC_API = `${CIVIC_BASE}/representatives`;

const LEVEL_MAP: Record<string, Level> = {
	country: 'federal',
	administrativeArea1: 'state',
	administrativeArea2: 'county',
	locality: 'city',
	regional: 'metro',
	special: 'special'
};

function mapLevel(levels?: string[]): Level {
	if (!levels?.length) return 'special';
	return LEVEL_MAP[levels[0]] ?? 'special';
}

function computeCompleteness(official: CivicOfficial): number {
	const checks = [
		!!official.phones?.length,
		!!official.emails?.length,
		!!official.address?.length,
		!!official.urls?.length,
		false // fax — Google API never has it
	];
	return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function mapMailingAddress(addr?: CivicAddress): MailingAddress | null {
	if (!addr?.line1) return null;
	return {
		street: [addr.line1, addr.line2].filter(Boolean).join(', '),
		city: addr.city ?? '',
		state: addr.state ?? '',
		zip: addr.zip ?? ''
	};
}

// Stable ID derived from division + office name — consistent across lookups
function stableId(divisionId: string, officeName: string): string {
	const raw = `${divisionId}::${officeName}`;
	let hash = 0;
	for (let i = 0; i < raw.length; i++) {
		hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
	}
	const hex = Math.abs(hash).toString(16).padStart(8, '0');
	return `${hex.slice(0, 8)}-0000-0000-0000-${hex.padStart(12, '0')}`;
}

export async function getRepsByAddress(
	address: string,
	apiKey: string
): Promise<{ reps: Representative[]; normalizedAddress: string } | { error: string }> {
	const url = new URL(CIVIC_API);
	url.searchParams.set('address', address);
	url.searchParams.set('key', apiKey);

	const res = await fetch(url.toString());
	const data: CivicResponse = await res.json();

	if (!res.ok || data.error) {
		return { error: data.error?.message ?? 'Civic API error' };
	}

	const offices = data.offices ?? [];
	const officials = data.officials ?? [];

	const reps: Representative[] = [];

	for (const office of offices) {
		const level = mapLevel(office.levels);
		for (const idx of office.officialIndices) {
			const official = officials[idx];
			if (!official) continue;

			const addr = official.address?.[0];
			reps.push({
				id: stableId(office.divisionId, office.name),
				district_id: null,
				name: official.name,
				title: office.name,
				level,
				phone: official.phones?.[0] ?? null,
				fax: null,
				email: official.emails?.[0] ?? null,
				mailing_address: mapMailingAddress(addr),
				web_form_url: official.urls?.[0] ?? null,
				data_source: 'google_civic',
				verified_at: new Date().toISOString(),
				completeness_score: computeCompleteness(official),
				community_verified: false
			});
		}
	}

	// Sort by level: federal → state → metro → county → city → school → special
	const ORDER: Level[] = ['federal', 'state', 'metro', 'county', 'city', 'school', 'special'];
	reps.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));

	const ni = data.normalizedInput;
	const normalizedAddress = ni
		? [ni.line1, ni.city, ni.state, ni.zip].filter(Boolean).join(', ')
		: address;

	return { reps, normalizedAddress };
}

// --- Voter information ---

interface RawLocation {
	address?: {
		locationName?: string;
		line1?: string;
		line2?: string;
		city?: string;
		state?: string;
		zip?: string;
	};
	notes?: string;
	pollingHours?: string;
	startDate?: string;
	endDate?: string;
}

interface RawContest {
	type?: string;
	office?: string;
	district?: { name?: string };
	candidates?: { name: string; party?: string; candidateUrl?: string }[];
	referendumTitle?: string;
	referendumUrl?: string;
}

interface VoterInfoResponse {
	election?: { name?: string; electionDay?: string };
	mailOnly?: boolean;
	pollingLocations?: RawLocation[];
	earlyVoteSites?: RawLocation[];
	dropOffLocations?: RawLocation[];
	contests?: RawContest[];
	state?: {
		name?: string;
		electionAdministrationBody?: {
			electionInfoUrl?: string;
			electionRegistrationUrl?: string;
			electionRegistrationConfirmationUrl?: string;
			absenteeVotingInfoUrl?: string;
			ballotInfoUrl?: string;
			votingLocationFinderUrl?: string;
		};
	}[];
	error?: { message: string; code: number };
}

function mapLocation(loc: RawLocation): CivicVotingLocation {
	const a = loc.address;
	const parts = [a?.locationName, a?.line1, a?.line2, a?.city, a?.state, a?.zip].filter(Boolean);
	return {
		name: a?.locationName,
		address: parts.filter((p, i) => i > 0 || p !== a?.locationName).join(', '),
		notes: loc.notes,
		polling_hours: loc.pollingHours,
		start_date: loc.startDate,
		end_date: loc.endDate
	};
}

function mapContest(c: RawContest): CivicContest {
	return {
		office: c.office,
		district: c.district?.name,
		candidates: c.candidates?.map((cand) => ({
			name: cand.name,
			party: cand.party,
			url: cand.candidateUrl
		})),
		referendum_title: c.referendumTitle,
		referendum_url: c.referendumUrl
	};
}

export async function getCivicVoterInfo(
	address: string,
	apiKey: string
): Promise<CivicInfo | null> {
	const url = new URL(`${CIVIC_BASE}/voterinfo`);
	url.searchParams.set('address', address);
	url.searchParams.set('key', apiKey);
	url.searchParams.set('returnAllAvailableData', 'true');

	let res: Response;
	try {
		res = await fetch(url.toString());
	} catch {
		return null;
	}

	const data: VoterInfoResponse = await res.json();

	// 400 with code 400 means no election data available — not an error worth surfacing
	if (!res.ok) return null;

	const admin = data.state?.[0]?.electionAdministrationBody;

	const info: CivicInfo = {
		fetched_at: new Date().toISOString(),
		election_name: data.election?.name,
		election_day: data.election?.electionDay,
		mail_only: data.mailOnly ?? false,
		polling_locations: (data.pollingLocations ?? []).map(mapLocation),
		early_vote_sites: (data.earlyVoteSites ?? []).map(mapLocation),
		drop_off_locations: (data.dropOffLocations ?? []).map(mapLocation),
		contests: (data.contests ?? []).map(mapContest),
		state_info: data.state?.[0]
			? {
					name: data.state[0].name ?? '',
					election_info_url: admin?.electionInfoUrl,
					voter_registration_url: admin?.electionRegistrationUrl,
					registration_confirmation_url: admin?.electionRegistrationConfirmationUrl,
					absentee_url: admin?.absenteeVotingInfoUrl,
					ballot_info_url: admin?.ballotInfoUrl,
					voting_location_finder_url: admin?.votingLocationFinderUrl
				}
			: undefined
	};

	return info;
}
