import { json } from '@sveltejs/kit';
import { geocodeAddress } from '$lib/geocode';
import { getRepsByLatLng, getAllReps } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { address } = await request.json();

	if (!address?.trim()) {
		return json({ error: 'Address is required' }, { status: 400 });
	}

	const geo = await geocodeAddress(address.trim());
	if (!geo) {
		return json(
			{ error: 'Address not found — try adding a city and state.' },
			{ status: 422 }
		);
	}

	// Try spatial lookup first; fall back to full list until boundaries are loaded.
	let reps = await getRepsByLatLng(geo.lat, geo.lng);
	if (!reps.length) {
		reps = await getAllReps();
	}

	return json({ reps, matchedAddress: geo.matchedAddress });
};
