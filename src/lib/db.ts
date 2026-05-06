import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';
import type { Representative } from './types';

function sql() {
	return neon(DATABASE_URL);
}

export async function getRepsByLatLng(lat: number, lng: number): Promise<Representative[]> {
	const db = sql();
	const rows = await db`
		SELECT r.*
		FROM representatives r
		JOIN districts d ON d.id = r.district_id
		WHERE ST_Contains(d.boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
		ORDER BY
			CASE r.level
				WHEN 'federal'  THEN 1
				WHEN 'state'    THEN 2
				WHEN 'metro'    THEN 3
				WHEN 'county'   THEN 4
				WHEN 'city'     THEN 5
				WHEN 'school'   THEN 6
				WHEN 'special'  THEN 7
			END,
			r.name
	`;
	return rows as Representative[];
}
