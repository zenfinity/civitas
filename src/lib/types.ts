export type Level = 'federal' | 'state' | 'metro' | 'county' | 'city' | 'school' | 'special';
export type Channel = 'phone' | 'mail' | 'email' | 'fax' | 'web_form';
export type ActionStatus = 'sent' | 'skipped';
export type Tone = 'constituent_concern' | 'formal_request' | 'urgent_action';

export interface MailingAddress {
	street: string;
	city: string;
	state: string;
	zip: string;
}

export interface Representative {
	id: string;
	district_id: string;
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
}

export interface Issue {
	id: string;
	label: string;
	description: string;
	relevant_levels: Level[];
}

export interface Action {
	rep_id: string;
	issue_id: string;
	channel: Channel;
	sent_at: string;
	status: ActionStatus;
	script_used: boolean;
}

export interface Prefs {
	ai_scripts_enabled: boolean;
	preferred_channels: Channel[];
	name: string;
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
