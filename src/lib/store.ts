import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Pack, Representative, Issue, Action } from './types';
import { emptyPack } from './types';

const STORAGE_KEY = 'civitas_pack';

function readStorage(): Pack | null {
	if (!browser) return null;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Pack) : null;
	} catch {
		return null;
	}
}

function writeStorage(p: Pack) {
	if (!browser) return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
	} catch {}
}

export const pack = writable<Pack>(readStorage() ?? emptyPack());

// Keep sessionStorage in sync so a page refresh doesn't lose state.
pack.subscribe(writeStorage);

// Convenience derived stores so pages don't need to destructure manually.
export const reps = derived(pack, ($p) => $p.reps);
export const issues = derived(pack, ($p) => $p.issues);
export const actions = derived(pack, ($p) => $p.actions);
export const prefs = derived(pack, ($p) => $p.prefs);

export function setAddress(address: string) {
	pack.update((p) => ({ ...p, meta: { ...p.meta, address } }));
}

export function setName(name: string) {
	pack.update((p) => ({ ...p, prefs: { ...p.prefs, name } }));
}

export function setReps(incoming: Representative[], address: string) {
	pack.update((p) => ({
		...p,
		meta: { ...p.meta, address },
		reps: incoming
	}));
}

export function toggleIssue(issue: Issue) {
	pack.update((p) => {
		const exists = p.issues.find((i) => i.id === issue.id);
		return {
			...p,
			issues: exists ? p.issues.filter((i) => i.id !== issue.id) : [...p.issues, issue]
		};
	});
}

export function recordAction(action: Action) {
	pack.update((p) => {
		const idx = p.actions.findIndex(
			(a) => a.rep_id === action.rep_id && a.issue_id === action.issue_id && a.channel === action.channel
		);
		const actions = idx >= 0
			? p.actions.map((a, i) => (i === idx ? action : a))
			: [...p.actions, action];
		return { ...p, actions };
	});
}

export function removeAction(repId: string, issueId: string, channel: Channel) {
	pack.update((p) => ({
		...p,
		actions: p.actions.filter(
			(a) => !(a.rep_id === repId && a.issue_id === issueId && a.channel === channel)
		)
	}));
}

export function loadPack(loaded: Pack) {
	pack.set(loaded);
}
