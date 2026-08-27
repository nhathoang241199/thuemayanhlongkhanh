import { formatNewBookingNotification } from './telegram-booking-notification';

describe('formatNewBookingNotification', () => {
  it('formats pickup date, time, and optional note', () => {
    expect(
      formatNewBookingNotification({
        customer: { name: 'Phạm Thảo Quyên', phone: '0343435371' },
        camera: { name: 'M50' },
        pickupAt: new Date('2026-08-27T03:00:00.000Z'),
        note: 'Gọi trước khi đến',
      }),
    ).toBe(
      'Đơn thuê mới:\n\n1. Phạm Thảo Quyên - 0343435371\nMáy: M50\nNhận lúc: 27/08 10h\nNote: Gọi trước khi đến',
    );
  });

  it('omits the note line when there is no note', () => {
    expect(
      formatNewBookingNotification({
        customer: { name: 'A', phone: '0900000000' },
        camera: { name: 'X-T5' },
        pickupAt: new Date('2026-08-28T03:30:00.000Z'),
        note: null,
      }),
    ).toBe('Đơn thuê mới:\n\n1. A - 0900000000\nMáy: X-T5\nNhận lúc: 28/08 10h30');
  });
});
