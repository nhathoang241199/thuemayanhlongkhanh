import { parseShipMessengerLink } from './messenger.types';

describe('parseShipMessengerLink', () => {
  it('parses SHIP + phone', () => {
    expect(parseShipMessengerLink('SHIP 0900111222')).toEqual({
      action: 'link',
      phone: '0900111222',
    });
    expect(parseShipMessengerLink('ship:0900333444')).toEqual({
      action: 'link',
      phone: '0900333444',
    });
    expect(parseShipMessengerLink('  Ship  0375398903  ')).toEqual({
      action: 'link',
      phone: '0375398903',
    });
  });

  it('parses HUY SHIP / HỦY SHIP', () => {
    expect(parseShipMessengerLink('HUY SHIP')).toEqual({ action: 'unlink' });
    expect(parseShipMessengerLink('hủy ship')).toEqual({ action: 'unlink' });
  });

  it('returns null for normal chat', () => {
    expect(parseShipMessengerLink('thuê máy nào')).toBeNull();
    expect(parseShipMessengerLink('shipper')).toBeNull();
  });
});
