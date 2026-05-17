# SePay — chuyển khoản + webhook

Hướng dẫn cấu hình thanh toán chuyển khoản qua [SePay Webhooks](https://developer.sepay.vn/en/sepay-webhooks): khách quét QR / chuyển khoản trong app, SePay gửi webhook khi tiền vào tài khoản đã liên kết.

## Điều kiện

1. Tài khoản [SePay](https://sepay.vn/) và **ít nhất một tài khoản ngân hàng liên kết**.
2. Backend chạy public HTTPS (production) hoặc **ngrok** khi dev (tương tự VNPay trước đây).
3. Điền `SEPAY_*` trong `backend/.env` (xem [backend/.env.example](../backend/.env.example)).

## Biến môi trường

| Biến                    | Mô tả                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `SEPAY_WEBHOOK_API_KEY` | API Key đăng ký trên SePay — header `Authorization: Apikey ...` khi webhook gọi vào |
| `SEPAY_BANK_BIN`        | Mã BIN ngân hàng (6 số) cho VietQR, vd. `970436`                                    |
| `SEPAY_BANK_ACCOUNT`    | Số tài khoản nhận tiền                                                              |
| `SEPAY_ACCOUNT_NAME`    | Tên chủ TK (hiển thị + VietQR)                                                      |
| `SEPAY_BANK_NAME`       | Tên ngân hàng hiển thị (vd. Vietcombank)                                            |

Nội dung chuyển khoản hiển thị trên app = **`SEVQR` + mã đơn** (vd. `SEVQR DH-20260517-ABCD`).

**VietinBank + SePay (API Banking):** mọi giao dịch vào TK phải có nội dung **bắt đầu bằng `SEVQR`** thì SePay mới nhận biến động số dư và gửi webhook. Chuyển chỉ `DH-...` hoặc `DH20260517...` **không** xuất hiện trong SePay.

Mã đơn vẫn dạng `DH-YYYYMMDD-XXXX`. Webhook khớp theo `code` / `content` (có hoặc không dấu `-`). Trên SePay có thể lọc tiền tố **DH** trong mã thanh toán.

## Webhook URL

Đăng ký trên dashboard SePay:

```text
https://<ngrok-or-domain>/api/payments/sepay/webhook
```

Ví dụ dev với ngrok:

```text
https://xxxx.ngrok-free.app/api/payments/sepay/webhook
```

SePay yêu cầu phản hồi **HTTP 200** và body `{ "success": true }` — đã xử lý trong API.

## Ngrok (dev)

```bash
export NGROK_AUTHTOKEN=<token>
docker compose --profile ngrok up ngrok
```

Mở `http://localhost:4040` → copy URL HTTPS → dán vào cấu hình Webhook SePay.

Mỗi lần URL ngrok đổi, cập nhật lại URL trên SePay.

## Luồng kiểm thử

1. Đặt lịch trên app → trang `/book/payment` hiện QR, số tiền, STK, nội dung CK.
2. Chuyển khoản đúng số tiền + đúng nội dung (mã đơn).
3. SePay gửi webhook → đơn `CONFIRMED`, FE hiện **Đặt lịch thành công**.
4. Sai số tiền → không confirm (payment `FAILED`).
5. Webhook retry → idempotent, không double-confirm.

## API liên quan

| Method | Path                                                 | Mô tả                             |
| ------ | ---------------------------------------------------- | --------------------------------- |
| GET    | `/api/payments/sepay/instructions?bookingId=&phone=` | QR + thông tin CK (cần SĐT khách) |
| POST   | `/api/payments/sepay/webhook`                        | Webhook SePay                     |
