import { Injectable } from '@nestjs/common';
import { ShopInfoService } from '../shop-info/shop-info.service';
import {
  formatShopAddressReply,
  formatShopPhoneReply,
  isShopAddressQuestion,
  isShopPhoneQuestion,
} from './messenger-shop-address';

const FALLBACK_REPLY =
  'Bạn nhắn "AD" để được tư vấn viên hỗ trợ thêm nhé.';

@Injectable()
export class MessengerShopAddressCannedService {
  constructor(private readonly shopInfo: ShopInfoService) {}

  async tryReply(text: string): Promise<string | null> {
    const info = await this.shopInfo.getPublic();

    if (isShopAddressQuestion(text)) {
      return formatShopAddressReply(info) ?? FALLBACK_REPLY;
    }
    if (isShopPhoneQuestion(text)) {
      return formatShopPhoneReply(info) ?? FALLBACK_REPLY;
    }
    return null;
  }
}
