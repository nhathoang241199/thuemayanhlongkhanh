import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingSlot, CameraBrand } from '../../generated/prisma/enums';
import { Public } from '../auth/public.decorator';
import { AvailabilityService } from './availability.service';

@Public()
@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('calendar')
  @ApiOperation({ summary: 'Lịch tháng theo máy' })
  calendar(
    @Query('cameraId') cameraId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    if (!cameraId?.trim()) {
      throw new BadRequestException('cameraId is required');
    }
    const y = Number(year);
    const m = Number(month);
    if (!Number.isFinite(y) || !Number.isFinite(m)) {
      throw new BadRequestException('year and month are required');
    }
    return this.availabilityService.calendarMonth(
      cameraId,
      y,
      m,
      excludeBookingId?.trim() || undefined,
    );
  }

  @Get('slots')
  @ApiOperation({ summary: 'Buổi khả dụng trong một ngày' })
  slots(
    @Query('cameraId') cameraId: string,
    @Query('date') date: string,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    if (!cameraId?.trim() || !date?.trim()) {
      throw new BadRequestException('cameraId and date are required');
    }
    return this.availabilityService.slotsForDate(
      cameraId,
      date,
      excludeBookingId?.trim() || undefined,
    );
  }

  @Get('range')
  @ApiOperation({ summary: 'Kiểm tra khoảng ngày' })
  range(
    @Query('cameraId') cameraId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('slot') slot?: BookingSlot,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    if (!cameraId?.trim() || !startDate?.trim() || !endDate?.trim()) {
      throw new BadRequestException(
        'cameraId, startDate and endDate are required',
      );
    }
    const effectiveSlot = slot ?? BookingSlot.FULL_DAY;
    return this.availabilityService.isRangeAvailable(
      cameraId,
      startDate,
      endDate,
      effectiveSlot,
      excludeBookingId?.trim() || undefined,
    );
  }

  @Get('range-slots')
  @ApiOperation({ summary: 'Buổi khả dụng theo máy + khoảng ngày' })
  rangeSlots(
    @Query('cameraId') cameraId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    if (!cameraId?.trim() || !startDate?.trim() || !endDate?.trim()) {
      throw new BadRequestException(
        'cameraId, startDate and endDate are required',
      );
    }
    return this.availabilityService.rangeSlotsAvailability(
      cameraId,
      startDate,
      endDate,
      excludeBookingId?.trim() || undefined,
    );
  }

  @Get('range-slots-any')
  @ApiOperation({ summary: 'Buổi khả dụng (có ít nhất một máy) theo khoảng ngày' })
  rangeSlotsAny(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('brand') brand?: CameraBrand,
    @Query('excludeBookingId') excludeBookingId?: string,
    @Query('date') date?: string,
  ) {
    const start = startDate ?? date;
    const end = endDate ?? date;
    if (!start?.trim() || !end?.trim()) {
      throw new BadRequestException(
        'startDate (or date) and endDate (or date) are required',
      );
    }
    return this.availabilityService.rangeSlotsAnyAvailability(
      start,
      end,
      brand,
      excludeBookingId?.trim() || undefined,
    );
  }

  @Get('cameras')
  @ApiOperation({ summary: 'Máy khả dụng theo khoảng ngày + buổi' })
  cameras(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('slot') slot: BookingSlot,
    @Query('brand') brand?: CameraBrand,
    @Query('date') date?: string,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    const start = startDate ?? date;
    const end = endDate ?? date;
    if (!start?.trim() || !end?.trim() || !slot) {
      throw new BadRequestException(
        'startDate (or date), endDate (or date), and slot are required',
      );
    }
    return this.availabilityService.camerasForSlot(
      brand,
      start,
      end,
      slot,
      excludeBookingId?.trim() || undefined,
    );
  }
}
