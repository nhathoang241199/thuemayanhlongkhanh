export function isShopAddressQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (/địa chỉ|dia chi|địa điểm|dia diem|chỉ đường|chi duong/.test(lower)) {
    return true;
  }
  if (
    /(shop|cửa hàng|cua hang|tiệm|tiem|bạn|ban|mình|minh).*(ở đâu|o dau)/.test(
      lower,
    )
  ) {
    return true;
  }
  if (/(ở đâu|o dau).*(shop|cửa hàng|cua hang|lấy máy|lay may)/.test(lower)) {
    return true;
  }
  if (/^(ở đâu|o dau|đâu vậy|dau vay)/.test(lower) && lower.length < 35) {
    return true;
  }
  return false;
}

export function formatShopAddressReply(info: {
  address: string;
  mapUrl?: string;
}): string | null {
  const map = info.mapUrl?.trim();
  const address = info.address?.trim();
  const link = map || address;
  if (!link) return null;
  return `Mình ở đây nhé ạ: ${link}`;
}

export function isShopPhoneQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (
    /số điện thoại|so dien thoai|\bsdt\b|hotline|số phone|so phone|zalo/.test(
      lower,
    )
  ) {
    return true;
  }
  if (/(gọi|goi).*(shop|bạn|ban|mình|minh|liên hệ|lien he)/.test(lower)) {
    return true;
  }
  if (
    /(liên hệ|lien he|contact).*(shop|số|so|phone)/.test(lower) ||
    /(shop).*(liên hệ|lien he|số|so)/.test(lower)
  ) {
    return true;
  }
  if (/^(gọi|goi|call)\b/.test(lower) && lower.length < 40) {
    return true;
  }
  return false;
}

export function formatShopPhoneReply(info: { phone: string }): string | null {
  const phone = info.phone?.trim();
  if (!phone) return null;
  return `Số mình đây nhé: ${phone}`;
}
