import type { Representative, Tone } from './types';

export function applyTemplate(
	template: string,
	rep: Representative,
	name: string,
	email: string,
	address: string
): string {
	const date = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	return template
		.replace(/\{\{DATE\}\}/g, date)
		.replace(/\{\{REP_NAME\}\}/g, rep.name)
		.replace(/\{\{REP_TITLE\}\}/g, rep.title)
		.replace(/\{\{YOUR_NAME\}\}/g, name || 'a constituent')
		.replace(/\{\{YOUR_EMAIL\}\}/g, email)
		.replace(/\{\{YOUR_ADDRESS\}\}/g, address)
		.replace(/\{\{DISTRICT\}\}/g, rep.district_name ?? '');
}

export function resolveScript(
	savedScript: string | undefined,
	issueLabel: string,
	channel: string,
	tone: Tone,
	rep: Representative,
	name: string,
	email: string,
	address: string,
	allTemplates: Record<string, Record<string, string>>
): string {
	if (savedScript) return savedScript;
	const template = allTemplates[issueLabel]?.[`${channel}:${tone}`];
	return template ? applyTemplate(template, rep, name, email, address) : '';
}
