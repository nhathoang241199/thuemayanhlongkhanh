import { Injectable } from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service';
import { CameraService } from '../camera/camera.service';
import { cameraModelShortLabel } from './messenger-formatters';
import {
  DEFAULT_AVAILABILITY_SLOT,
  formatAvailabilityReply,
  isAvailabilityQuestion,
  parseAvailabilityDate,
} from './messenger-availability';
import { matchCameraInText } from './messenger-price-quote';
import type { PronounChatTurn } from './messenger-pronouns';
import { resolveMessengerPronouns } from './messenger-pronouns';

@Injectable()
export class MessengerAvailabilityCannedService {
  constructor(
    private readonly cameras: CameraService,
    private readonly availability: AvailabilityService,
  ) {}

  async tryReply(
    text: string,
    bookUrl: string,
    history: PronounChatTurn[] = [],
  ): Promise<string | null> {
    if (!isAvailabilityQuestion(text)) return null;
    const date = parseAvailabilityDate(text);
    if (!date) return null;

    const rows = await this.cameras.findPublic();
    const pronouns = resolveMessengerPronouns(text, history);
    const matched = matchCameraInText(text, rows);

    if (matched) {
      const check = await this.availability.isRangeAvailable(
        matched.id,
        date.startDate,
        date.endDate,
        DEFAULT_AVAILABILITY_SLOT,
      );
      return formatAvailabilityReply({
        dayLabel: date.label,
        modelLabel: cameraModelShortLabel(matched.brand, matched.name),
        available: check.available,
        bookUrl,
        pronouns,
      });
    }

    const available = await this.availability.camerasForSlot(
      undefined,
      date.startDate,
      date.endDate,
      DEFAULT_AVAILABILITY_SLOT,
    );

    return formatAvailabilityReply({
      dayLabel: date.label,
      available: available.length > 0,
      bookUrl,
      pronouns,
    });
  }
}
