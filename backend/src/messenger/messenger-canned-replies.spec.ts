import {
  bookingRedirectReply,
  deliveryPickupReply,
  greetingReply,
  isBookingRedirectQuestion,
  isDeliveryPickupQuestion,
  isGreetingOnly,
  resolveCannedReply,
} from './messenger-canned-replies';

describe('isBookingRedirectQuestion', () => {
  it('detects booking questions', () => {
    expect(isBookingRedirectQuestion('cách đặt lịch')).toBe(true);
    expect(isBookingRedirectQuestion('cho em link book')).toBe(true);
    expect(isBookingRedirectQuestion('muốn đặt lịch r50')).toBe(true);
  });

  it('does not catch pure availability', () => {
    expect(isBookingRedirectQuestion('ngày mai còn máy không anh')).toBe(
      false,
    );
  });
});

describe('bookingRedirectReply', () => {
  it('uses site host and customer pronoun', () => {
    expect(
      bookingRedirectReply('https://thuemayanhlongkhanh.com', 'đặt lịch anh'),
    ).toBe(
      'Em lên trang thuemayanhlongkhanh.com kiểm tra lịch trống và đặt lịch giúp anh nhé.',
    );
  });
});

describe('isGreetingOnly', () => {
  it('detects simple greetings', () => {
    expect(isGreetingOnly('hi anh')).toBe(true);
    expect(isGreetingOnly('hi')).toBe(true);
    expect(isGreetingOnly('xin chào shop')).toBe(true);
  });

  it('rejects substantive messages', () => {
    expect(isGreetingOnly('hi cho em hỏi giá r50')).toBe(false);
    expect(isGreetingOnly('giá r50')).toBe(false);
  });
});

describe('greetingReply', () => {
  it('matches customer pronoun', () => {
    expect(greetingReply('hi anh')).toBe('Hi! anh cần gì ạ');
    expect(greetingReply('hi')).toBe('Hi! bạn cần gì ạ');
    expect(greetingReply('em ơi')).toBe('Hi! em cần gì ạ');
  });
});

describe('isDeliveryPickupQuestion', () => {
  it('detects ship vs self-pickup', () => {
    expect(isDeliveryPickupQuestion('bạn ship hay mình tự tới lấy')).toBe(true);
    expect(isDeliveryPickupQuestion('có giao máy không ạ')).toBe(true);
    expect(isDeliveryPickupQuestion('tự tới lấy hay ship')).toBe(true);
  });

  it('rejects unrelated', () => {
    expect(isDeliveryPickupQuestion('giá r50 có ship không')).toBe(false);
    expect(isDeliveryPickupQuestion('hi shop')).toBe(false);
  });
});

describe('deliveryPickupReply', () => {
  it('matches shop FAQ', () => {
    expect(resolveCannedReply('bạn ship hay mình tự tới lấy')).toBe(
      deliveryPickupReply(),
    );
  });
});
