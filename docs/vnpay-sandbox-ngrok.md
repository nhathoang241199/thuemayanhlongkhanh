# VNPay sandbox và ngrok

Hướng dẫn chạy thanh toán test trên máy local: tunnel HTTPS (ngrok) để VNPay gọi IPN tới NestJS.

## Bảo mật

- Không commit `backend/.env` chứa TMN / Hash Secret.
- Secret sandbox cũng không đưa lên Git/issue công khai.

## 1. Cài ngrok và authtoken

1. Đăng ký [ngrok](https://ngrok.com), copy **Authtoken** trong dashboard.
2. **macOS (Homebrew):** `brew install ngrok/ngrok/ngrok`
3. Một lần: `ngrok config add-authtoken <TOKEN>`

## 2. Chạy tunnel tới API (Nest mặc định port 3000)

**Cách A — CLI:**

```bash
# Terminal 1: backend
cd backend && npm run start:dev

# Terminal 2: tunnel (forward tới cổng API)
ngrok http 3000
```

Sao chép URL HTTPS hiển thị (vd. `https://xxxx.ngrok-free.app`).

**Cách B — Docker Compose (profile `ngrok`):**

Từ **thư mục gốc repo** (cùng cấp với `docker-compose.yml`):

```bash
export NGROK_AUTHTOKEN=<token_của_bạn>
docker-compose --profile ngrok up ngrok
```

*(Docker Compose V2 plugin: có thể dùng `docker compose` thay cho `docker-compose` tùy cài đặt.)*

Hoặc thêm `NGROK_AUTHTOKEN=...` vào file `.env` ở **gốc repo** (Compose tự đọc; không nhầm với `backend/.env`).

- Trên Linux, `extra_hosts: host.docker.internal:host-gateway` đã cấu hình trong compose để container ngrok tới máy host.
- Nếu Nest chạy trong container khác, đổi target trong `command` (vd. `http://backend:3000`).

## 3. Endpoint cần nhớ

| Mục đích | Đường dẫn |
|----------|-----------|
| IPN (server VNPay gọi) | `https://<ngrok-host>/api/payments/vnpay/ipn` |
| Return (redirect trình duyệt) | `https://<ngrok-host>/api/payments/vnpay/return` hoặc `http://localhost:3000/api/payments/vnpay/return` |

## 4. Cấu hình `backend/.env`

Copy [`backend/.env.example`](../backend/.env.example) → `backend/.env` và điền:

- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` (theo email sandbox VNPay).
- `VNPAY_RETURN_URL`: thường giữ `http://localhost:3000/api/payments/vnpay/return`; nếu test từ thiết bị khác mạng, đổi sang URL ngrok.
- `FRONTEND_URL`, `FRONTEND_ORIGIN`: cổng Next.js (thường `http://localhost:3001`).

`VNPAY_IPN_URL` trong `.env.example` chỉ để ghi nhớ URL đầy đủ khi đăng ký phía VNPay.

Khởi động lại backend sau khi sửa `.env`.

## 5. Đăng ký IPN trên Merchant Admin sandbox

1. Đăng nhập [sandbox merchant](https://sandbox.vnpayment.vn/merchantv2/).
2. Cấu hình **IPN / URL thông báo** (tên menu có thể khác theo phiên bản).
3. Dán: `https://<ngrok-host>/api/payments/vnpay/ipn`
4. Lưu. **Mỗi lần subdomain ngrok free đổi**, cập nhật lại URL này.

## 6. Kiểm tra end-to-end

1. Backend + frontend + ngrok đang chạy.
2. Tạo đơn → Thanh toán VNPay → dùng thẻ test (theo email / tài liệu sandbox).
3. Xem log Nest: có request `GET /api/payments/vnpay/ipn?...`.
4. Đơn chuyển `CONFIRMED` sau IPN thành công; trình duyệt redirect về `/payment/return`.

## 7. Deploy VPS (production)

Không dùng ngrok. Dùng domain + Nginx/Caddy + HTTPS; đăng ký với VNPay:

- `https://api.<domain>/api/payments/vnpay/ipn`
- `https://api.<domain>/api/payments/vnpay/return`

và credential merchant **production**.

## 8. Lưu ý ngrok free

- Subdomain có thể đổi mỗi lần chạy → cập nhật IPN trên VNPay.
- Nếu IPN trả HTML (trang chặn bot): xem [ngrok docs](https://ngrok.com/docs); cân nhắc gói có domain cố định hoặc deploy staging.
