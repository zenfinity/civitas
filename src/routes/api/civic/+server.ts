import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCivicVoterInfo } from '$lib/civic';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { address } = await request.json();

	if (!address?.trim()) {
		return json({ civic_info: null });
	}

	if (!env.GOOGLE_CIVIC_API_KEY) {
		return json({ civic_info: null });
	}

	const civic_info = await getCivicVoterInfo(address.trim(), env.GOOGLE_CIVIC_API_KEY);
	return json({ civic_info });
};
