export interface GeoResult {
	lat: number;
	lng: number;
	matchedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
	const params = new URLSearchParams({
		address,
		benchmark: 'Public_AR_Current',
		format: 'json'
	});

	const res = await fetch(
		`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`
	);

	if (!res.ok) return null;

	const data = await res.json();
	const matches = data?.result?.addressMatches;

	if (!matches?.length) return null;

	const match = matches[0];
	return {
		lat: match.coordinates.y,
		lng: match.coordinates.x,
		matchedAddress: match.matchedAddress
	};
}
