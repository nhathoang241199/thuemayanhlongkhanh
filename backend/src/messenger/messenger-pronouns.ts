export type MessengerPronouns = {
  shop: 'em' | 'anh' | 'mình';
  customer: 'anh' | 'em' | 'chị' | 'bạn';
};

export type PronounChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

function normalizePronounText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Khách tự xưng em (em xin, cho em…). */
export function customerSelfRefersAsEm(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    /^(em|e|cho em|cho e|em oi|e oi)\b/.test(lower) ||
    /\b(em|e)\s+(xin|hoi|muon|dat|can|muon hoi)/.test(lower) ||
    /cho\s+(em|e)\s+(xin|hoi|muon|dat|can)/.test(lower)
  );
}

/** Khách gọi shop là anh (…không anh, anh ơi). */
export function customerAddressesShopAsAnh(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    /\banh\s*$/i.test(lower) ||
    /\banh\s*(oi|a|ah|ạ)\s*$/i.test(lower) ||
    /(cho|hoi|xin|muon).*\banh\b/.test(lower)
  );
}

/** Khách gọi shop là anh ở đầu câu (anh còn, anh ơi…) — không coi là khách xưng anh. */
export function customerAddressesShopAsAnhAtStart(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /^(anh|a)(\s+|$)/.test(lower) || /^a\s+oi\b/.test(lower);
}

/** Khách gọi shop là chị. */
export function customerAddressesShopAsChi(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    /\bchi\s*$/i.test(lower) ||
    /\bchi\s*(oi|a|ah|ạ)\s*$/i.test(lower) ||
    /(cho|hoi|xin).*\bchi\b/.test(lower)
  );
}

export function customerAddressesShopAsChiAtStart(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /^chi(\s+|$)/.test(lower);
}

export function resolveMessengerPronouns(
  text: string,
  history: PronounChatTurn[] = [],
): MessengerPronouns {
  const userTexts = [
    ...history.filter((m) => m.role === 'user').map((m) => m.content),
    text,
  ];
  const latest = userTexts[userTexts.length - 1] ?? text;

  if (customerSelfRefersAsEm(latest)) {
    return { shop: 'anh', customer: 'em' };
  }
  if (customerAddressesShopAsChi(latest)) {
    return { shop: 'em', customer: 'chị' };
  }
  if (customerAddressesShopAsAnh(latest)) {
    return { shop: 'em', customer: 'anh' };
  }
  if (customerAddressesShopAsChiAtStart(latest)) {
    return { shop: 'em', customer: 'bạn' };
  }
  if (customerAddressesShopAsAnhAtStart(latest)) {
    return { shop: 'em', customer: 'bạn' };
  }

  for (let i = userTexts.length - 1; i >= 0; i -= 1) {
    const t = userTexts[i]!;
    if (customerSelfRefersAsEm(t)) {
      return { shop: 'anh', customer: 'em' };
    }
    if (customerAddressesShopAsChi(t)) {
      return { shop: 'em', customer: 'chị' };
    }
    if (customerAddressesShopAsAnh(t)) {
      return { shop: 'em', customer: 'anh' };
    }
    if (customerAddressesShopAsChiAtStart(t)) {
      return { shop: 'em', customer: 'bạn' };
    }
    if (customerAddressesShopAsAnhAtStart(t)) {
      return { shop: 'em', customer: 'bạn' };
    }
  }

  return { shop: 'mình', customer: 'bạn' };
}
