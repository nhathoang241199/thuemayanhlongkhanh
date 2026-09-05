import { BookingStatus } from '../../generated/prisma/enums';
import { shipEarnActionsForBookingStatusChange } from './ship-order-booking-status';

describe('shipEarnActionsForBookingStatusChange', () => {
  it('does nothing when status is unchanged', () => {
    expect(
      shipEarnActionsForBookingStatusChange(
        BookingStatus.CONFIRMED,
        BookingStatus.CONFIRMED,
      ),
    ).toEqual({
      completeOutbound: false,
      completeReturn: false,
      revertOutbound: false,
      revertReturn: false,
      cancelActive: false,
    });
  });

  it('settles outbound when admin marks renting', () => {
    expect(
      shipEarnActionsForBookingStatusChange(
        BookingStatus.CONFIRMED,
        BookingStatus.RENTING,
      ),
    ).toEqual({
      completeOutbound: true,
      completeReturn: false,
      revertOutbound: false,
      revertReturn: false,
      cancelActive: false,
    });
  });

  it('settles both legs when admin marks completed', () => {
    expect(
      shipEarnActionsForBookingStatusChange(
        BookingStatus.RENTING,
        BookingStatus.COMPLETED,
      ),
    ).toEqual({
      completeOutbound: true,
      completeReturn: true,
      revertOutbound: false,
      revertReturn: false,
      cancelActive: true,
    });
  });

  it('reverts outbound credit when admin goes back to confirmed', () => {
    expect(
      shipEarnActionsForBookingStatusChange(
        BookingStatus.RENTING,
        BookingStatus.CONFIRMED,
      ),
    ).toEqual({
      completeOutbound: false,
      completeReturn: false,
      revertOutbound: true,
      revertReturn: false,
      cancelActive: false,
    });
  });

  it('reverts return credit when admin goes back to renting', () => {
    expect(
      shipEarnActionsForBookingStatusChange(
        BookingStatus.COMPLETED,
        BookingStatus.RENTING,
      ),
    ).toEqual({
      completeOutbound: true,
      completeReturn: false,
      revertOutbound: false,
      revertReturn: true,
      cancelActive: false,
    });
  });

  it('cancels active ship orders on booking cancel without reversing pay', () => {
    expect(
      shipEarnActionsForBookingStatusChange(
        BookingStatus.RENTING,
        BookingStatus.CANCELLED,
      ),
    ).toEqual({
      completeOutbound: false,
      completeReturn: false,
      revertOutbound: false,
      revertReturn: false,
      cancelActive: true,
    });
  });
});
