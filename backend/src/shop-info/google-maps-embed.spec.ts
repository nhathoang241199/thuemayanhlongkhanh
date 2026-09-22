import {
  isAlreadyMapsEmbed,
  isMapsShortLink,
  mapsEmbedFromAddress,
  mapsEmbedFromLatLng,
  parseMapsLatLng,
  resolveMapsEmbedSrc,
  resolveMapsRedirectUrl,
} from './google-maps-embed';

describe('google-maps-embed', () => {
  it('builds embed from lat/lng', () => {
    const src = mapsEmbedFromLatLng(10.9405036, 107.225559);
    expect(src).toContain('output=embed');
    expect(src).toContain('10.9405036%2C107.225559');
  });

  it('builds embed from address', () => {
    const src = mapsEmbedFromAddress('Long Khánh, Đồng Nai');
    expect(src).toContain('output=embed');
    expect(src).toContain('Long+Kh%C3%A1nh');
  });

  it('prefers !3d!4d marker over @ view center', () => {
    const url =
      'https://www.google.com/maps/place/Shop/@10.944512,107.2300032,15z/data=!3d10.9405036!4d107.225559';
    expect(parseMapsLatLng(url)).toEqual({
      latitude: 10.9405036,
      longitude: 107.225559,
    });
  });

  it('parses @lat,lng when marker missing', () => {
    const url =
      'https://www.google.com/maps/place/Shop/@10.944512,107.2300032,15z';
    expect(parseMapsLatLng(url)).toEqual({
      latitude: 10.944512,
      longitude: 107.2300032,
    });
  });

  it('detects short links and embed urls', () => {
    expect(isMapsShortLink('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isAlreadyMapsEmbed('https://www.google.com/maps?q=1,2&output=embed')).toBe(
      true,
    );
  });

  it('resolveMapsEmbedSrc prefers coordinates', async () => {
    const src = await resolveMapsEmbedSrc({
      latitude: 10.94,
      longitude: 107.22,
      address: 'ignored',
    });
    expect(src).toContain('10.94%2C107.22');
  });

  it('resolveMapsRedirectUrl returns null for invalid host without throwing', async () => {
    const src = await resolveMapsRedirectUrl('not-a-url');
    expect(src).toBeNull();
  });
});
