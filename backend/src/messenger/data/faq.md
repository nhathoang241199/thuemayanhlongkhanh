# FAQ bổ sung

Nội dung shop và vài ví dụ. **Luồng tool + mẫu câu** nằm ở `system.md` (phần Mẫu câu).

## Chào hỏi

Khách **chỉ chào**, chưa hỏi máy/giá/lịch — một câu:

_Hi! bạn cần gì ạ_

## Giờ mở cửa

Shop mở cửa lúc 7h, đóng cửa lúc 23h

## Giao máy

Có hỗ trợ giao & trả tận nơi khu vực Long Khánh. Phí ship 20k

## Cọc & giấy tờ

Chỉ chụp lại CCCD (chi tiết cọc → tool `search_booking_policy`)

## Nhận máy sớm (lấy tối hôm trước)

Đơn thuê **cả ngày**, tối thiểu **1 ngày** → lấy máy sớm **17h–23h tối hôm trước** ngày thuê.

Format chunk admin (RAG):

```
NHẬN MÁY SỚM

- Đơn thuê cả ngày tối thiểu 1 ngày: lấy máy từ 17h–23h tối hôm trước ngày thuê
- Ví dụ: thuê thứ Bảy có thể lấy tối thứ Sáu
```

Câu hỏi kiểu _thuê thứ 7 tối thứ 6 lấy được không_ → canned hoặc `search_booking_policy`:

_Được, Với đơn thuê tối thiểu 1 ngày thì em có thể lấy sớm vào tối ngày hôm trước_

## Trả máy trễ — phụ thu (ghi trong chính sách / RAG)

Khách hỏi **trả trễ có tính thêm tiền / phụ thu / phạt** (không hỏi sáng cụ thể) → gọi `search_booking_policy` hoặc canned:

_Không nhen_

Format chunk admin:

```
TRẢ MÁY TRỄ

- Trả trễ không tính thêm tiền, không phụ thu
- Không phạt trả muộn trong khung giờ shop cho phép
```

Phân biệt:

| Khách hỏi | Trả lời |
|-----------|---------|
| _trả trễ có tính thêm tiền không_ | _Không nhen_ (theo chunk phụ thu) |
| _trả trễ vào sáng thứ 5 có thêm tiền không_ | _Không nhen_ (hỏi phụ thu — ưu tiên trước) |
| _trả trễ vào sáng thứ 5 được không_ | _Được nha_ (hỏi được phép trả — canned riêng) |

## Phụ kiện kèm thuê (pin, thẻ nhớ)

Khách **xin thêm / cho thêm** pin hoặc thẻ (thẻ nhớ) — trả lời đúng một câu:

_Được nhen_

(Không chuyển admin, không gọi tool.)

## Chỉnh màu / hậu kỳ

Khách hỏi **chỉnh màu**, nhờ chỉnh màu giúp — một câu:

_Anh có hỗ trợ chỉnh màu giúp em nhé_

## Gặp nhân viên

Khách gõ "AD" hoặc bấm "Gặp admin" để được chuyển tư vấn viên.

## Giá thuê nhiều ngày

Gọi `quote_rental`. Hệ số: 2 ngày = 1.75×, 3 = 2.4×, 4 = 3×, 5 = 3.5× giá ngày.

_Ví dụ:_ Khách (xưng em): _em xin giá pocket3 1 ngày ạ_ → _Pocket 3 1 ngày 280k nhé ạ._

_Ví dụ:_ _em đặt r50 2 ngày thứ 4 thứ 5 bao nhiêu ạ_ → _R50 2 ngày 438k nhé ạ._

## Ví dụ nhanh (áp mẫu system.md)

| Khách | Sau tool |
|-------|----------|
| em xin giá pocket3 1 ngày ạ | _Pocket 3 1 ngày 280k nhé ạ._ |
| em đặt r50 2 ngày bao nhiêu ạ | _R50 2 ngày 438k nhé ạ._ |
| hôm nay còn r50 không ạ | _R50 hôm nay còn nhé ạ, em lên link đặt lịch giúp anh nhé._ (khách xưng em) |
| thứ 7 còn máy không (không nêu máy) | _Thứ 7 mình còn máy ạ, Bạn lên link xem và đặt lịch giúp mình nhé._ |

Khách gõ `r50` / `m50` vẫn đủ rõ — tên trong shop có thể dài (vd. EOS R50 kit…).
