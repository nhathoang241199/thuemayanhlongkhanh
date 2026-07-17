const SAMPLE_POLICY = `CÁCH THỨC THUÊ & CỌC

- Cọc CCCD chính chủ có đối chiếu VNeID có định danh mức 2 (đối với HSSV đang còn lịch học tại TP.HCM).
- Cọc 2 triệu + cọc CCCD chính chủ có đối chiếu VNeID có định danh mức 2.
- Thế chấp tài sản giá trị tương đương (laptop, điện thoại) hoặc thế chấp 50% giá trí máy  + hình chụp CCCD chính chủ
- Khách hàng thanh toán 100% phí thuê khi nhận máy.

QUY ĐỊNH ĐỀN BÙ

- Nếu máy bị hư hỏng hoặc mất phụ kiện, khách hàng vui lòng bồi thường theo giá trị thiệt hại.`;

import {
  embedTextForChunk,
  parsePolicyChunks,
} from './policy-chunk.parser';

describe('parsePolicyChunks', () => {
  it('parses ALL CAPS sections and bullet lines', () => {
    const chunks = parsePolicyChunks(SAMPLE_POLICY);

    expect(chunks).toHaveLength(5);
    expect(chunks[0]).toMatchObject({
      section: 'CÁCH THỨC THUÊ & CỌC',
      chunkIndex: 0,
    });
    expect(chunks[0].content).toContain('HSSV');
    expect(chunks[1].content).toContain('2 triệu');
    expect(chunks[4]).toMatchObject({
      section: 'QUY ĐỊNH ĐỀN BÙ',
      chunkIndex: 4,
    });
  });

  it('embedTextForChunk prepends section', () => {
    const chunks = parsePolicyChunks(SAMPLE_POLICY);
    const text = embedTextForChunk(chunks[1].section, chunks[1].content);
    expect(text).toContain('CÁCH THỨC THUÊ & CỌC');
    expect(text).toContain('2 triệu');
  });

  it('returns empty for blank content', () => {
    expect(parsePolicyChunks('   ')).toEqual([]);
  });

  it('falls back to single chunk for plain paragraph', () => {
    const chunks = parsePolicyChunks('Một đoạn chính sách duy nhất.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('Một đoạn');
  });
});
