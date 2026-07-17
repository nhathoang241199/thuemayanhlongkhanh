import {
  formatShopAddressReply,
  formatShopPhoneReply,
  isShopAddressQuestion,
  isShopPhoneQuestion,
} from './messenger-shop-address';

describe('isShopAddressQuestion', () => {
  it('detects address questions', () => {
    expect(isShopAddressQuestion('địa chỉ bạn ở đâu')).toBe(true);
    expect(isShopAddressQuestion('shop ở đâu ạ')).toBe(true);
    expect(isShopAddressQuestion('chỉ đường giúp mình')).toBe(true);
  });

  it('rejects unrelated', () => {
    expect(isShopAddressQuestion('giá r50')).toBe(false);
    expect(isShopAddressQuestion('hi shop')).toBe(false);
  });
});

describe('formatShopAddressReply', () => {
  it('uses map link when available', () => {
    expect(
      formatShopAddressReply({
        address: '123 Nguyễn Trãi, Long Khánh',
        mapUrl: 'https://maps.app.goo.gl/abc',
      }),
    ).toBe('Mình ở đây nhé ạ: https://maps.app.goo.gl/abc');
  });

  it('falls back to address when no map', () => {
    expect(
      formatShopAddressReply({
        address: '123 Nguyễn Trãi, Long Khánh',
        mapUrl: '',
      }),
    ).toBe('Mình ở đây nhé ạ: 123 Nguyễn Trãi, Long Khánh');
  });

  it('returns null when empty', () => {
    expect(formatShopAddressReply({ address: '' })).toBeNull();
  });
});

describe('isShopPhoneQuestion', () => {
  it('detects phone questions', () => {
    expect(isShopPhoneQuestion('cho số điện thoại shop')).toBe(true);
    expect(isShopPhoneQuestion('gọi shop số mấy')).toBe(true);
    expect(isShopPhoneQuestion('liên hệ shop ạ')).toBe(true);
  });

  it('rejects unrelated', () => {
    expect(isShopPhoneQuestion('địa chỉ shop')).toBe(false);
    expect(isShopPhoneQuestion('giá r50')).toBe(false);
  });
});

describe('formatShopPhoneReply', () => {
  it('formats phone', () => {
    expect(formatShopPhoneReply({ phone: '0901234567' })).toBe(
      'Số mình đây nhé: 0901234567',
    );
  });

  it('returns null when empty', () => {
    expect(formatShopPhoneReply({ phone: '' })).toBeNull();
  });
});
