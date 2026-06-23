const HOW_TO_RENT_PHRASES = [
  'cách thuê',
  'cach thue',
  'làm sao để thuê',
  'lam sao de thue',
  'làm sao thuê',
  'lam sao thue',
  'hướng dẫn thuê',
  'huong dan thue',
  'quy trình thuê',
  'quy trinh thue',
  'thuê máy ảnh như thế nào',
  'thue may anh nhu the nao',
  'muốn thuê máy',
  'muon thue may',
  'cách đặt lịch',
  'cach dat lich',
  'đặt lịch thuê',
  'dat lich thue',
] as const;

export function isHowToRentQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return HOW_TO_RENT_PHRASES.some((phrase) => lower.includes(phrase));
}

export function howToRentReply(siteUrl: string): string {
  let host = 'thuemayanhlongkhanh.com';
  try {
    host = new URL(siteUrl).host || host;
  } catch {
    // keep default
  }
  return `Bạn vui lòng truy cập vào trang ${host} để đặt lịch nhé ạ`;
}
