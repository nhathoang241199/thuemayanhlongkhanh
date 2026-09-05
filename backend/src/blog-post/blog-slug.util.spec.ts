import { excerptFromContent, slugifyTitle } from './blog-slug.util';

describe('slugifyTitle', () => {
  it('slugifies Vietnamese title', () => {
    expect(slugifyTitle('Cách chọn máy ảnh thuê Long Khánh')).toBe(
      'cach-chon-may-anh-thue-long-khanh',
    );
  });
});

describe('excerptFromContent', () => {
  it('strips markdown and truncates', () => {
    const text = excerptFromContent('## Hello\n\nThis is **bold** text.', 20);
    expect(text.length).toBeLessThanOrEqual(20);
    expect(text).not.toContain('#');
  });
});
