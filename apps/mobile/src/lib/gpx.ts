import type { GeoPoint } from '@motogroup/shared';

// Minimal GPX yardımcıları. Tam GPX şeması yerine trkpt/wpt/rtept noktalarını çıkarır;
// haritadan çizilen rotaları GPX'e dönüştürür. (v1 için yeterli — gelişmiş GPX v2.)

const PT_REGEX = /<(?:trkpt|rtept|wpt)\b[^>]*\blat="([-0-9.]+)"[^>]*\blon="([-0-9.]+)"/gi;

/** GPX metninden sıralı lat/lng noktalarını çıkarır. */
export function parseGpxPoints(gpx: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let match: RegExpExecArray | null;
  PT_REGEX.lastIndex = 0;
  while ((match = PT_REGEX.exec(gpx)) !== null) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng });
    }
  }
  return points;
}

/** Noktalardan basit bir GPX track belgesi üretir (haritadan çizim için). */
export function buildGpx(points: GeoPoint[], name = 'MotoGroup Rotası'): string {
  const trkpts = points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MotoGroup" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/** Noktalar arası toplam mesafe (km), haversine. */
export function totalDistanceKm(points: GeoPoint[]): number {
  let meters = 0;
  for (let i = 1; i < points.length; i++) {
    meters += haversineMeters(points[i - 1]!, points[i]!);
  }
  return Math.round((meters / 1000) * 100) / 100;
}

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;',
  );
}
