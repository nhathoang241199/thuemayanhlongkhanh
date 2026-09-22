/**
 * Build Google Maps iframe src without Embed API key.
 */

export function mapsEmbedFromLatLng(
  latitude: number,
  longitude: number,
  zoom = 16,
): string {
  const params = new URLSearchParams({
    q: `${latitude},${longitude}`,
    hl: 'vi',
    z: String(zoom),
    output: 'embed',
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

export function mapsEmbedFromAddress(address: string, zoom = 16): string {
  const params = new URLSearchParams({
    q: address.trim(),
    hl: 'vi',
    z: String(zoom),
    output: 'embed',
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

/** Extract lat/lng from a full Google Maps URL (place/@lat,lng or !3d!4d). */
export function parseMapsLatLng(
  url: string,
): { latitude: number; longitude: number } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Place marker (!3d!4d) chính xác hơn toạ độ khung nhìn (@lat,lng).
  const marker = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (marker) {
    const latitude = Number(marker[1]);
    const longitude = Number(marker[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  const at = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) {
    const latitude = Number(at[1]);
    const longitude = Number(at[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  const q = trimmed.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) {
    const latitude = Number(q[1]);
    const longitude = Number(q[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}

export function isMapsShortLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host.endsWith('.app.goo.gl')
    );
  } catch {
    return false;
  }
}

export function isAlreadyMapsEmbed(url: string): boolean {
  return url.includes('/maps/embed') || /[?&]output=embed\b/i.test(url);
}

/** Follow one Maps short-link redirect (no browser CORS). */
export async function resolveMapsRedirectUrl(
  url: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ThuemayanhBot/1.0; +https://thuemayanhlongkhanh.com)',
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location?.trim()) return location.trim();
    }
    if (res.ok) return res.url || url;
  } catch {
    /* ignore */
  }
  return null;
}

export async function resolveMapsEmbedSrc(opts: {
  address?: string | null;
  mapUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<string | null> {
  const lat = opts.latitude;
  const lng = opts.longitude;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return mapsEmbedFromLatLng(lat, lng);
  }

  const mapUrl = opts.mapUrl?.trim() ?? '';
  if (mapUrl && isAlreadyMapsEmbed(mapUrl)) {
    return mapUrl;
  }

  if (mapUrl) {
    let resolved = mapUrl;
    if (isMapsShortLink(mapUrl)) {
      const next = await resolveMapsRedirectUrl(mapUrl);
      if (next) resolved = next;
    }
    const coords = parseMapsLatLng(resolved);
    if (coords) {
      return mapsEmbedFromLatLng(coords.latitude, coords.longitude);
    }
    // Full place URL without coords — try place name in path
    try {
      const u = new URL(resolved);
      const placeMatch = u.pathname.match(/\/maps\/place\/([^/]+)/);
      if (placeMatch?.[1]) {
        const name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        if (name.trim()) return mapsEmbedFromAddress(name);
      }
    } catch {
      /* ignore */
    }
  }

  const address = opts.address?.trim() ?? '';
  if (address) return mapsEmbedFromAddress(address);

  return null;
}
