export type Level = 'federal' | 'state' | 'metro' | 'county' | 'city' | 'school' | 'special';

export interface CivicVotingLocation {
	name?: string;
	address: string;
	notes?: string;
	polling_hours?: string;
	start_date?: string;
	end_date?: string;
}

export interface CivicContest {
	office?: string;
	district?: string;
	candidates?: { name: string; party?: string; url?: string }[];
	referendum_title?: string;
	referendum_url?: string;
}

export interface CivicStateInfo {
	name: string;
	election_info_url?: string;
	voter_registration_url?: string;
	registration_confirmation_url?: string;
	absentee_url?: string;
	ballot_info_url?: string;
	voting_location_finder_url?: string;
}

export interface CivicInfo {
	fetched_at: string;
	election_name?: string;
	election_day?: string;
	mail_only: boolean;
	drop_off_locations: CivicVotingLocation[];
	early_vote_sites: CivicVotingLocation[];
	polling_locations: CivicVotingLocation[];
	contests: CivicContest[];
	state_info?: CivicStateInfo;
}

export type Channel = 'phone' | 'mail' | 'email' | 'fax' | 'web_form';
export type ActionStatus = 'pending' | 'sent' | 'skipped';
export type Tone = 'constituent_concern' | 'formal_request' | 'urgent_action';

export interface MailingAddress {
	street: string;
	city: string;
	state: string;
	zip: string;
}

export interface Representative {
	id: string;
	district_id: string | null;
	name: string;
	title: string;
	level: Level;
	phone: string | null;
	fax: string | null;
	email: string | null;
	mailing_address: MailingAddress | null;
	web_form_url: string | null;
	data_source: string | null;
	verified_at: string | null;
	completeness_score: number;
	community_verified: boolean;
	district_name: string | null;
}

export interface Issue {
	id: string;
	label: string;
	description: string;
	relevant_levels: Level[];
	script_templates?: Record<string, string>;
}

export interface Action {
	rep_id: string;
	issue_id: string;
	channel: Channel;
	sent_at: string;
	status: ActionStatus;
	script_used: boolean;
	script?: string;
}

export interface Prefs {
	ai_scripts_enabled: boolean;
	preferred_channels: Channel[];
	name: string;
	email: string;
	tone_preference: Tone;
}

export interface PackMeta {
	version: string;
	created_at: string;
	address: string;
	district_ids: string[];
}

export interface Pack {
	meta: PackMeta;
	reps: Representative[];
	issues: Issue[];
	actions: Action[];
	prefs: Prefs;
	civic_info?: CivicInfo | null;
}

export function emptyPack(address = ''): Pack {
	return {
		meta: {
			version: '1',
			created_at: new Date().toISOString(),
			address,
			district_ids: []
		},
		reps: [],
		issues: [],
		actions: [],
		prefs: {
			ai_scripts_enabled: false,
			preferred_channels: ['phone', 'email'],
			name: '',
			email: '',
			tone_preference: 'constituent_concern'
		}
	};
}

export const LEVEL_LABELS: Record<Level, string> = {
	federal: 'Federal',
	state: 'State',
	metro: 'Regional',
	county: 'County',
	city: 'City',
	school: 'School',
	special: 'Special District'
};

export const CHANNEL_LABELS: Record<Channel, string> = {
	phone: 'Phone',
	mail: 'Mail',
	email: 'Email',
	fax: 'Fax',
	web_form: 'Web Form'
};
