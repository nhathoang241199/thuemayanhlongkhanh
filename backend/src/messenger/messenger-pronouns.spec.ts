import {
  formatAvailabilityReply,
  isAvailabilityQuestion,
  parseAvailabilityDate,
} from './messenger-availability';
import {
  customerAddressesShopAsAnh,
  customerSelfRefersAsEm,
  resolveMessengerPronouns,
} from './messenger-pronouns';

describe('resolveMessengerPronouns', () => {
  it('shop em / customer anh when khách gọi anh', () => {
    expect(
      resolveMessengerPronouns('ngày mai còn lịch trống không anh'),
    ).toEqual({ shop: 'em', customer: 'anh' });
    expect(customerAddressesShopAsAnh('không anh')).toBe(true);
  });

  it('shop anh / customer em when khách xưng em', () => {
    expect(resolveMessengerPronouns('em xin giá r50 1 ngày ạ')).toEqual({
      shop: 'anh',
      customer: 'em',
    });
    expect(customerSelfRefersAsEm('em xin giá')).toBe(true);
  });

  it('shop em / customer bạn when khách gọi anh ở đầu câu', () => {
    expect(resolveMessengerPronouns('anh còn r50 không ạ')).toEqual({
      shop: 'em',
      customer: 'bạn',
    });
  });

  it('shop anh / customer em when khách xưng e (viết tắt)', () => {
    expect(
      resolveMessengerPronouns('a oi cho e xin lại giá thuê máy ảnh với ạ'),
    ).toEqual({ shop: 'anh', customer: 'em' });
  });

  it('defaults to mình / bạn', () => {
    expect(resolveMessengerPronouns('còn máy không')).toEqual({
      shop: 'mình',
      customer: 'bạn',
    });
  });
});

describe('formatAvailabilityReply', () => {
  it('uses consistent em/anh pronouns', () => {
    expect(
      formatAvailabilityReply({
        dayLabel: 'Ngày mai',
        available: true,
        bookUrl: 'https://shop.com',
        pronouns: { shop: 'em', customer: 'anh' },
      }),
    ).toBe(
      'Ngày mai em còn máy ạ, anh lên https://shop.com/book xem và đặt lịch giúp em nhé.',
    );
  });
});

describe('isAvailabilityQuestion', () => {
  it('detects schedule questions', () => {
    expect(isAvailabilityQuestion('ngày mai còn lịch trống không anh')).toBe(
      true,
    );
    expect(isAvailabilityQuestion('hôm nay còn máy không')).toBe(true);
  });
});

describe('parseAvailabilityDate', () => {
  it('parses ngày mai', () => {
    expect(parseAvailabilityDate('ngày mai còn máy')?.label).toBe('Ngày mai');
  });
});
