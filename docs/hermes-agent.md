# Hermes agent — khuyến mãi, fanpage & blog

API cho **Hermes agent (MiniMax)** hoặc automation khác — **không** nằm trong ai-service Messenger.

Xác thực: header `X-Hermes-API-Key` = `HERMES_API_KEY` trong `backend/.env` (đã có sẵn cho các endpoint khách/booking).

Base URL production: `https://thuemayanhlongkhanh.com/api`

## Luồng agent đề xuất (khuyến mãi)

1. Bạn chat Hermes: *"Tháng sau giảm 20%"*
2. Agent **tính ngày** (vd. `2026-10-01` → `2026-10-31`) và **xác nhận** với bạn
3. Agent gọi `POST /hermes/promotion/preview-post` → show nội dung bài
4. Bạn ok → `POST /hermes/promotion/launch` (setup web + đăng fanpage)

Hoặc gọi từng bước: `setup` → `publish`.

## Luồng agent đề xuất (blog SEO)

1. Hermes viết bài Markdown (tiêu đề, nội dung, slug tuỳ chọn)
2. Gọi `POST /hermes/blog/publish` với `publish: false` → chờ admin duyệt tại `/admin/blog-posts`
3. Hoặc `publish: true` → lên `/posts/{slug}` ngay (khi bạn tin agent)

Bài blog **không** có link trên app khách — chỉ truy cập qua URL `/posts` (SEO, Google).

## Endpoints khuyến mãi & fanpage

### `GET /hermes/promotion`

Khuyến mãi hiện tại trên web.

### `POST /hermes/promotion/preview-post`

Xem trước bài fanpage **chưa** thay đổi hệ thống.

```json
{
  "discountPercent": 20,
  "startDate": "2026-10-01",
  "endDate": "2026-10-31"
}
```

### `POST /hermes/promotion/setup`

Áp dụng % giảm + khoảng ngày lên **ShopPromotion** và toàn bộ máy/ống kính (giống admin → Giảm giá hàng loạt).

### `POST /hermes/promotion/launch` *(tool chính)*

Setup KM trên web + **gửi bài fanpage chờ duyệt** (không đăng ngay).

```json
{
  "discountPercent": 20,
  "startDate": "2026-10-01",
  "endDate": "2026-10-31",
  "publishToFanpage": true,
  "published": false
}
```

Admin duyệt tại **`/admin/fanpage-posts`** → **Duyệt & đăng**.

### `POST /hermes/facebook/publish`

Gửi bài lẻ chờ duyệt (không đăng thẳng).

## Endpoints blog SEO

### `POST /hermes/blog/publish`

Gửi bài blog Markdown.

```json
{
  "title": "Cách chọn máy ảnh thuê cho du lịch Long Khánh",
  "content": "## Giới thiệu\n\nThuê máy ảnh tại Long Khánh...\n\n[Đặt lịch](/book)",
  "slug": "cach-chon-may-anh-thue-long-khanh",
  "excerpt": "Mẹo chọn máy phù hợp khi thuê tại Long Khánh",
  "seoDescription": "Hướng dẫn chọn máy ảnh thuê tại Long Khánh — giá, loại máy, kinh nghiệm.",
  "bannerUrl": "https://example.com/banner.jpg",
  "publish": false
}
```

| Field | Mô tả |
|-------|--------|
| `title` | Bắt buộc |
| `content` | Markdown, bắt buộc |
| `slug` | Tuỳ chọn — tự sinh từ title nếu bỏ trống |
| `bannerUrl` / `coverImageUrl` | **Bắt buộc** trước khi xuất bản (URL ảnh banner) |
| `publish` | `false` (mặc định) = chờ duyệt admin; `true` = lên `/posts` ngay |

Admin duyệt tại **`/admin/blog-posts`** → **Xuất bản**.

Public: **`/posts`** (danh sách), **`/posts/{slug}`** (chi tiết). Sitemap: `/sitemap.xml`.

## cURL mẫu (khuyến mãi)

```bash
export HERMES_KEY="your-hermes-api-key"
export API="https://thuemayanhlongkhanh.com/api"

curl -s -X POST "$API/hermes/promotion/launch" \
  -H "Content-Type: application/json" \
  -H "X-Hermes-API-Key: $HERMES_KEY" \
  -d '{
    "discountPercent": 20,
    "startDate": "2026-10-01",
    "endDate": "2026-10-31"
  }' | jq
```

## cURL mẫu (blog)

```bash
curl -s -X POST "$API/hermes/blog/publish" \
  -H "Content-Type: application/json" \
  -H "X-Hermes-API-Key: $HERMES_KEY" \
  -d '{
    "title": "5 mẹo chụp ảnh đẹp khi thuê máy tại Long Khánh",
    "content": "## 1. Chọn máy phù hợp\n\n...",
    "publish": false
  }' | jq
```

## Cấu hình Meta (đăng fanpage)

| Biến | Mô tả |
|------|--------|
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Page token (đã có cho Messenger) |
| `FACEBOOK_PAGE_ID` | ID fanpage |
| `FACEBOOK_PUBLISH_ENABLED` | `true` (mặc định bật nếu không set `false`) |

Trên Meta Developer app, thêm quyền **`pages_manage_posts`** và cấp cho Page token.

## Đăng ký tool trên Hermes (MiniMax)

| Tool | Method | Path | Mô tả |
|------|--------|------|--------|
| `get_shop_promotion` | GET | `/hermes/promotion` | KM hiện tại |
| `preview_promotion_post` | POST | `/hermes/promotion/preview-post` | Xem trước bài |
| `launch_shop_promotion` | POST | `/hermes/promotion/launch` | Setup + đăng fanpage |
| `publish_blog_post` | POST | `/hermes/blog/publish` | Gửi bài blog SEO |

Header mọi request: `X-Hermes-API-Key: {HERMES_API_KEY}`

Prompt gợi ý cho agent:

- Luôn **hỏi xác nhận** trước khi gọi `launch`
- Parse "tháng sau" → ngày đầu/cuối tháng theo lịch VN
- Bài fanpage **luôn chờ admin duyệt** — báo user kiểm tra `/admin/fanpage-posts`
- Bài blog mặc định chờ duyệt `/admin/blog-posts`; chỉ `publish: true` khi user yêu cầu đăng ngay
- Viết blog bằng **Markdown**, có link nội bộ `/book` khi phù hợp
- Mỗi bài blog **bắt buộc có banner** (`bannerUrl`) trước khi xuất bản
- Nếu user chỉ muốn setup web, không gửi bài FB → `publishToFanpage: false`
