import { json } from '@sveltejs/kit';
import { geocodeAddress } from '$lib/geocode';
import { getRepsByLatLng } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { address } = await request.json();

	if (!address?.trim()) {
		return json({ error: 'Address is required' }, { status: 400 });
	}

	const geo = await geocodeAddress(address.trim());
	if (!geo) {
		return json({ error: 'Address not found. Try a more complete address.' }, { status: 422 });
	}

	const reps = await getRepsByLatLng(geo.lat, geo.lng);

	return json({
		reps,
		matchedAddress: geo.matchedAddress,
		lat: geo.lat,
		lng: geo.lng
	});
};
