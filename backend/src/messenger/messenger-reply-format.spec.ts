import { truncateMessengerReply } from './messenger-reply-format';

describe('truncateMessengerReply', () => {
  it('preserves Google Maps short links with dots', () => {
    const reply =
      'Bên anh đây nhé: https://maps.app.goo.gl/QuD6HpHiBBzWC2HXA';
    expect(truncateMessengerReply(reply)).toBe(reply);
  });

  it('still limits to two sentences for plain text', () => {
    const reply = 'Câu một. Câu hai. Câu ba.';
    expect(truncateMessengerReply(reply)).toBe('Câu một. Câu hai.');
  });
});
