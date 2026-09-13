# Đơn ship local — shipper

Khách nhập địa chỉ giao khi đặt lịch. Sau cọc, hệ thống tự tạo **đơn giao (OUTBOUND)** trên bảng ship. Khách bấm **Trả máy** trên `/home` để tạo **đơn trả (RETURN)**. Shipper local đăng nhập và nhận đơn.

## Trạng thái (bảng shipper)

| Hiển thị | Ý nghĩa |
|----------|---------|
| **Chờ nhận** | Chưa có shipper nhận — bấm nút ▶ (chevron phải) để nhận |
| **Chờ giao** | Đã nhận — giao máy, chụp CCCD; bấm ▶ để **hoàn thành giao** (+ tiền) |
| **Chờ trả** | Đã giao / đơn trả đã nhận — hiện **giờ trả máy**; bấm ▶ để **hoàn thành trả** (+ tiền) |
| **Hoàn thành** | Đơn RETURN đã hoàn tất trong ngày |

Shipper nhấn ▶ để hoàn thành **giao** và **trả**. Đơn vừa giao xong trong ngày vẫn nằm tab chờ trả (có ◀ hoàn tác nếu bấm nhầm).

## Luồng

| Bước | Ai | Việc |
|------|-----|------|
| 1 | Khách | Đặt lịch + nhập địa chỉ giao (tạm miễn phí ship) |
| 2 | Hệ thống | Sau cọc SePay → tạo đơn ship OUTBOUND `PENDING` |
| 3 | Shipper | Vào `/ship/login` → xem đơn chờ → **Nhận đơn** |
| 4 | Shipper | Giao máy + chụp CCCD → **Hoàn thành giao** (▶). Cộng tiền; booking → đang thuê |
| 5 | Khách | Khi đang thuê, bấm **Trả máy** trên `/home` |
| 6 | Shipper | Nhận đơn RETURN → **Hoàn thành trả** (▶). Cộng tiền; booking → hoàn thành |

**Nhận đơn atomic:** chỉ một shipper nhận được — nếu đơn đã có người nhận, API trả lỗi.

## Admin — quản lý shipper

1. Vào **Admin → Shipper** (`/admin/shippers`)
2. Thêm shipper: SĐT (tài khoản đăng nhập), tên, mật khẩu
3. Cấp link `/ship/login` và mật khẩu cho shipper

## Shipper — bảng đơn

- URL: `https://<domain>/ship/login`
- Đăng nhập: **SĐT + mật khẩu**
- **Đơn chờ:** OUTBOUND + RETURN chưa ai nhận
- **Đơn của tôi:** đã nhận, chờ shop xác nhận trên đơn booking

## API (tham khảo)

| Endpoint | Auth | Mô tả |
|----------|------|--------|
| `POST /api/auth/shipper/login` | Public | `{ phone, password }` |
| `GET /api/ship-orders/pending` | Shipper | Đơn chờ |
| `GET /api/ship-orders/mine` | Shipper | Đơn đã nhận |
| `POST /api/ship-orders/:id/claim` | Shipper | Nhận đơn |
| `POST /api/ship-orders/:id/complete` | Shipper | Hoàn thành đơn **giao** hoặc **trả** đã nhận |
| `POST /api/auth/shipper/request-payout` | Shipper | Gửi yêu cầu rút tiền |
| `PATCH /api/bookings/:id` | Admin | Đổi trạng thái — hoàn thành chặng ship + cộng tiền nếu có người nhận |
| `POST /api/bookings/customer/:id/request-return` | Public + SĐT | Khách gọi trả máy |
| `GET/POST/PATCH/DELETE /api/shippers` | Admin | CRUD shipper |
| `POST /api/shippers/:id/payout-qr` | Admin | Upload QR nhận tiền của shipper |

## Telegram

Khi có đơn ship mới (giao hoặc trả), shop nhận tin qua `TELEGRAM_BOT_TOKEN` + `TELEGRAM_NEW_BOOKING_CHAT_ID` (cùng kênh đơn cọc).

## Messenger — gắn shipper (trả máy)

Shipper gắn inbox fanpage để nhận tin **yêu cầu trả máy** (không nhận tin đơn giao mới trên Messenger):

1. Admin tạo shipper (SĐT) trên `/admin/shippers`
2. Shipper nhắn fanpage đúng cú pháp:
   - Đăng ký: `SHIP 0900111222` (SĐT trùng tài khoản ship)
   - Huỷ: `HUY SHIP`
3. Admin thấy cột **FB = Đã gắn**
4. Đơn giao/trả mới hiện trên `/ship`. Shipper bật **thông báo đẩy** trên `/ship` nếu muốn được báo khi có đơn mới. Fanpage chỉ nhắn shipper đã gắn khi khách gọi trả máy.

Lưu ý Meta: ngoài cửa sổ ~24h sau tin cuối của shipper, gửi tin trả máy có thể bị từ chối (hệ thống thử tag `HUMAN_AGENT`). Shipper nên nhắn fanpage thỉnh thoảng để giữ cửa sổ.

## Số dư shipper

- Admin xác nhận **đã lấy máy** / **đã trả máy**: nếu chặng đó có shipper nhận → +**20.000đ** (tối đa **40.000đ**/đơn có giao + trả).
- Chặng chưa ai nhận thì hoàn thành **không** cộng tiền.
- Admin lùi bước (trả máy → đang thuê, đang thuê → chờ lấy máy) thì trừ lại tiền chặng tương ứng.
- Shipper xem số dư góc phải trên `/ship`. Bấm **Rút** → **Gửi yêu cầu rút** để shop biết.
- Admin → **Shipper**: cột **Rút tiền** hiện badge **Đang rút** khi shipper đã gửi yêu cầu. Shop quét QR → **Xác nhận thanh toán** để trừ hết số dư và xoá yêu cầu.

## Triển khai VPS

```bash
cd backend && npx prisma migrate deploy && npm run build
cd ../frontend && npm run build
pm2 restart thue-may-api thue-may-web
```

Migration: `20260905180000_local_ship_order` (bảng `Shipper`, `ShipOrder`; migrate từ `DeliveryShipment` nếu có).

## Mock data local

Sau khi Postgres chạy và migrate xong:

```bash
cd backend && npm run db:seed
```

Seed tạo sẵn:

| Tài khoản | SĐT | Mật khẩu |
|-----------|-----|----------|
| Shipper Test | `0900111222` | `ship123` |
| Shipper Demo | `0900333444` | `ship456` |

Đơn demo (mã booking):

| Mã | Trạng thái ship |
|----|-----------------|
| `DH-SHIP-OUT-PEND` | Giao — chờ nhận |
| `DH-SHIP-OUT-CLAIM` | Giao — shipper 1 đã nhận |
| `DH-SHIP-RET-PEND` | Giao xong + trả — chờ nhận |
| `DH-SHIP-RET-CLAIM` | Trả — shipper 2 đã nhận |

Thêm ~12 đơn giao `PENDING` backfill từ booking seed có địa chỉ giao.

Test nhanh:

1. `http://localhost:3001/ship/login` — đăng nhập shipper
2. Tab **Đơn chờ** — nhận `DH-SHIP-OUT-PEND`
3. Tab **Đơn của tôi** — đã nhận, chờ admin xác nhận trên đơn booking

Admin: `http://localhost:3001/admin/shippers` (user/pass trong `backend/.env`).

## Ghi chú

- Booking có địa chỉ giao → hệ thống tạo đơn OUTBOUND (seed backfill tương tự).
- Booking hủy → đơn ship `PENDING`/`CLAIMED` chuyển `CANCELLED`.
- Trạng thái booking (RENTING, COMPLETED…) vẫn do admin cập nhật thủ công như trước.
