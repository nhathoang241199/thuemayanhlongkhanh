# Trợ lý AI admin

Panel chat floating trên mọi trang `/admin` (trừ login). Admin hỏi tiếng Việt về doanh thu, đơn thuê, chi phí, khách, kho máy/lens — Claude gọi **12 tools** đọc DB, không text-to-SQL.

## Yêu cầu

Trong `backend/.env`:

| Biến | Mô tả |
|------|--------|
| `ADMIN_ASSISTANT_ENABLED` | `true` / `false` |
| `ANTHROPIC_API_KEY` | API key Claude (dùng chung với Messenger bot) |
| `ANTHROPIC_MODEL` | Mặc định `claude-sonnet-4-6` |

API: `POST /api/admin-assistant/chat` — **yêu cầu cookie admin** (đăng nhập `/admin/login`).

## Cách dùng

1. Đăng nhập admin
2. Bấm nút chat góc phải dưới
3. Hỏi tự nhiên hoặc chọn gợi ý nhanh

Ví dụ:

- *"Doanh thu tháng này?"*
- *"Tháng này bao nhiêu đơn hủy?"*
- *"Ai thuê nhiều tiền nhất tháng này?"*
- *"Số điện thoại của Bảo Trâm?"*
- *"Tổng bao nhiêu thiết bị?"*
- *"Máy còn trống từ 28/6 đến 30/6?"*

## 12 tools

| Tool | Dữ liệu |
|------|---------|
| `get_monthly_summary` | Doanh thu, chi, lợi nhuận, số đơn PAID theo tháng |
| `get_revenue_by_month` | Doanh thu 12 tháng trong năm |
| `get_equipment_stats` | Tổng máy/lens, giá trị tồn kho |
| `query_bookings` | Đếm + liệt kê đơn theo status/tháng |
| `get_expense_summary` | Tổng chi, top khoản chi |
| `get_customer_stats` | Tổng khách, theo tag, đã xác minh |
| `get_top_customers_by_revenue` | Top khách theo tổng tiền thuê PAID trong tháng |
| `lookup_customer` | Tra cứu khách theo tên hoặc SĐT |
| `list_cameras` | Danh sách máy trong kho |
| `list_lenses` | Danh sách lens (optional theo máy) |
| `get_closed_days` | Ngày shop nghỉ trong tháng |
| `check_availability` | Máy còn trống theo khoảng ngày |

## Ghi chú

- Lịch sử chat chỉ lưu trên trình duyệt (không lưu DB)
- Phản hồi có thể mất 5–15 giây khi Claude gọi nhiều tool
- Lỗi 401 → đăng nhập lại admin
