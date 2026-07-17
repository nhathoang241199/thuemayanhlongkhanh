import { Injectable } from '@nestjs/common';
import { CameraService } from '../camera/camera.service';
import {
  buildPriceQuoteFromCamera,
  type PriceQuoteChatTurn,
  resolvePriceQuoteRequest,
} from './messenger-price-quote';

@Injectable()
export class MessengerPriceQuoteCannedService {
  constructor(private readonly cameras: CameraService) {}

  /** Báo giá cố định (0 round Claude) khi nhận diện máy + số ngày. */
  async tryReply(
    text: string,
    history: PriceQuoteChatTurn[] = [],
  ): Promise<string | null> {
    const rows = await this.cameras.findPublic();
    const request = resolvePriceQuoteRequest(text, rows, history);
    if (!request) return null;
    return buildPriceQuoteFromCamera(request.camera, request.dayCount);
  }
}
