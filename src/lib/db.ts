import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';
import type { Representative } from './types';

function sql() {
	return neon(DATABASE_URL);
}

// Spatial lookup — active once district boundary polygons are loaded.
export async function getRepsByLatLng(lat: number, lng: number): Promise<Representative[]> {
	const db = sql();
	const rows = await db`
		SELECT r.*, d.name AS district_name
		FROM representatives r
		JOIN districts d ON d.id = r.district_id
		WHERE ST_Contains(d.boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
		ORDER BY
			CASE r.level
				WHEN 'federal'  THEN 1 WHEN 'state'   THEN 2 WHEN 'metro'  THEN 3
				WHEN 'county'   THEN 4 WHEN 'city'    THEN 5 WHEN 'school' THEN 6
				ELSE 7
			END, r.name
	`;
	return rows as Representative[];
}

// Fallback: return all seeded reps (used until district boundaries are loaded).
export async function getAllReps(): Promise<Representative[]> {
	const db = sql();
	const rows = await db`
		SELECT r.*, d.name AS district_name
		FROM representatives r
		LEFT JOIN districts d ON d.id = r.district_id
		ORDER BY
			CASE r.level
				WHEN 'federal'  THEN 1 WHEN 'state'   THEN 2 WHEN 'metro'  THEN 3
				WHEN 'county'   THEN 4 WHEN 'city'    THEN 5 WHEN 'school' THEN 6
				ELSE 7
			END, r.name
	`;
	return rows as Representative[];
}
