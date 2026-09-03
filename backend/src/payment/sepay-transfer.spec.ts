import {
  buildTransferContent,
  collectWebhookSearchTexts,
  compactPaymentRef,
  extractBookingCodeFromTransferText,
} from './sepay-transfer';

describe('sepay-transfer', () => {
  it('buildTransferContent prefixes booking code', () => {
    expect(buildTransferContent('DH-20260520-ABCD')).toMatch(
      /^SEVQR DH-20260520-ABCD$/,
    );
  });

  it('extractBookingCodeFromTransferText handles dashed content', () => {
    expect(
      extractBookingCodeFromTransferText('SEVQR DH-20260520-ABCD chuyen coc'),
    ).toBe('DH-20260520-ABCD');
  });

  it('extractBookingCodeFromTransferText handles compact bank content', () => {
    const compact = `SEVQR${compactPaymentRef('DH-20260520-ABCD')}`;
    expect(extractBookingCodeFromTransferText(compact)).toBe('DH-20260520-ABCD');
  });

  it('extractBookingCodeFromTransferText handles SePay prefix before SEVQR', () => {
    expect(
      extractBookingCodeFromTransferText('ZP7D96VQGBUI SEVQR DH20260901M8UB'),
    ).toBe('DH-20260901-M8UB');
  });

  it('extractBookingCodeFromTransferText handles IBFT prefix and split lines', () => {
    expect(
      extractBookingCodeFromTransferText(
        '922D6090212TQS41 IBFT SEVQR DH202609023XCQ',
      ),
    ).toBe('DH-20260902-3XCQ');
    expect(
      extractBookingCodeFromTransferText('922D6090212TQS41 IBFT SEVQR\nDH202609023XCQ'),
    ).toBe('DH-20260902-3XCQ');
    expect(extractBookingCodeFromTransferText('DH202609023XCQ')).toBe(
      'DH-20260902-3XCQ',
    );
  });

  it('extractBookingCodeFromTransferText handles CT DEN VietinBank prefix', () => {
    expect(
      extractBookingCodeFromTransferText(
        'CT DEN:922T26903APKUYZX\nSEVQR DH20260903IIM9',
      ),
    ).toBe('DH-20260903-IIM9');
    expect(
      extractBookingCodeFromTransferText(
        'CT DEN:922T26903APKUYZX SEVQR DH20260903IIM9',
      ),
    ).toBe('DH-20260903-IIM9');
  });

  it('collectWebhookSearchTexts joins split webhook fields', () => {
    const texts = collectWebhookSearchTexts([
      '922D6090212TQS41 IBFT SEVQR',
      'DH202609023XCQ',
    ]);
    expect(texts).toContain('DH202609023XCQ');
    expect(extractBookingCodeFromTransferText(texts.at(-1) ?? '')).toBe(
      'DH-20260902-3XCQ',
    );
  });
});
