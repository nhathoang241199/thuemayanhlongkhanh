import type { ShopPromotionView } from '../common/discount-promotion';

function formatDateVi(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function buildPromotionFanpagePost(
  promo: ShopPromotionView,
  bookUrl: string,
  customMessage?: string,
): string {
  if (customMessage?.trim()) return customMessage.trim();

  const pct = promo.discountPercent;
  const period =
    promo.startDate && promo.endDate
      ? `${formatDateVi(promo.startDate)} – ${formatDateVi(promo.endDate)}`
      : 'trong thời gian có hạn';

  return [
    `Giảm ${pct}% tiền thuê máy ảnh!`,
    '',
    `Áp dụng: ${period}`,
    'Khu vực Long Khánh',
    '',
    `Đặt lịch online: ${bookUrl}`,
  ].join('\n');
}
