# DAISY Library — Backend API

Node.js / Express API server phục vụ danh mục sách và streaming sách nói DAISY có xác thực.

---

## Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Biến môi trường](#biến-môi-trường)
- [Khởi chạy](#khởi-chạy)
- [Các lệnh có sẵn](#các-lệnh-có-sẵn)
- [API Reference](#api-reference)
- [Kiến trúc](#kiến-trúc)
- [Nạp dữ liệu sách nói (Ingest)](#nạp-dữ-liệu-sách-nói-ingest)
- [Chạy Tests](#chạy-tests)

---

## Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu |
|---|---|
| Node.js | 18.x |
| MySQL | 8.x |
| Cloudflare R2 | — (để streaming audio) |

---

## Cài đặt

```bash
# 1. Cài dependencies
cd backend
npm install

# 2. Tạo file .env từ template
cp .env.example .env
# Chỉnh sửa .env với thông tin thực tế

# 3. Chạy migration tạo schema
npm run db:migrate

# 4. (Tùy chọn) Nạp dữ liệu sách mẫu
npm run db:seed
```

---

## Biến môi trường

Sao chép `.env.example` thành `.env` rồi điền các giá trị:

```env
# ── Server ────────────────────────────────────────────────────────────
PORT=5000

# ── Database (MySQL) ──────────────────────────────────────────────────
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=daisy_library

# ── Cloudflare R2 (Audio Streaming) ──────────────────────────────────
# Bỏ trống nếu chưa có R2; audio đã xác thực sẽ trả lỗi dịch vụ.
CLOUDFLARE_S3_API=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_S3_ACCESS_KEY_ID=
CLOUDFLARE_S3_SECRET_ACCESS_KEY=
CLOUDFLARE_S3_BUCKET_NAME=
CLOUDFLARE_S3_FOLDER_NAME=audio-books
CLOUDFLARE_S3_REGION=auto

# ── Xác thực API và phiên nghe nhạc ───────────────────────────────────
# Bắt buộc để đăng nhập và xác minh cookie HttpOnly dùng bởi <audio>.
JWT_SECRET=
AUDIO_SESSION_COOKIE_NAME=daisy_session

# Chỉ dùng để tích hợp player ở local khi Auth chưa hoàn thành.
# Backend từ chối bypass nếu NODE_ENV khác development.
NODE_ENV=
AUDIO_DEV_BYPASS_AUTH=false

# ── CORS ──────────────────────────────────────────────────────────────
# Danh sách origin frontend, cách nhau dấu phẩy. KHÔNG dùng * với audio.
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# ── Giới hạn tốc độ streaming ─────────────────────────────────────────
AUDIO_MAX_CONCURRENT_STREAMS_PER_USER=2
AUDIO_STREAM_RATE_LIMIT_MAX=30
AUDIO_STREAM_RATE_LIMIT_WINDOW_MS=60000
```

> **Lưu ý:** Nếu `JWT_SECRET` bị trống, các route catalog sách (`/api/books`,
> `/api/categories`) vẫn hoạt động bình thường, nhưng đăng nhập không thể phát hành
> phiên và mọi route audio (`/api/books/:id/audio*`) trả `401 Unauthorized` trước
> khi truy cập database audio hoặc R2.

Để UI tích hợp với dữ liệu và luồng R2 thật trước khi Auth hoàn thành:

```bash
NODE_ENV=development AUDIO_DEV_BYPASS_AUTH=true npm run dev
```

Xem hợp đồng và checklist bàn giao tại
[`docs/audiobook-ui-handoff.md`](./docs/audiobook-ui-handoff.md).

---

## Khởi chạy

```bash
# Chế độ development (tự restart khi thay đổi file)
npm run dev

# Chế độ production
npm start
```

Server khởi động tại `http://localhost:<PORT>` (mặc định: `http://localhost:5000`).

---

## Các lệnh có sẵn

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server với nodemon (auto-reload) |
| `npm start` | Production server |
| `npm run db:migrate` | Chạy tất cả migration SQL còn pending |
| `npm run db:migrate:status` | Xem trạng thái từng migration |
| `npm run db:seed` | Nạp dữ liệu sách mẫu vào database |
| `npm test` | Chạy toàn bộ test suite |
| `npm run db:audiobooks:publish` | Xác minh R2 read-only và ghi metadata vào DB |

---

## API Reference

### Sách

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/books` | Danh sách tất cả sách |
| `GET` | `/api/books/:id` | Chi tiết một cuốn sách |

**Query params cho `GET /api/books`:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `q` | string | Từ khóa tìm kiếm (tiêu đề / tác giả) |
| `category` | string | Lọc theo thể loại |
| `page` | number | Số trang (mặc định: 1) |
| `limit` | number | Số kết quả/trang (mặc định: 20) |

### Thể loại

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/categories` | Danh sách thể loại sách |

### Sách nói ⚠️ Yêu cầu cookie HttpOnly `daisy_session` hợp lệ

Cookie được phát hành bởi `POST /api/auth/login` hoặc `POST /api/auth/register`
và bị xóa bởi `POST /api/auth/logout`. Backend xác thực cookie trước khi truy vấn
metadata sách nói hoặc gọi Cloudflare R2.

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/books/:bookId/audio` | Catalog sách nói (parts + chapters + streamUrl) |
| `GET` | `/api/books/:bookId/audio/:audioId/stream` | Stream audio (hỗ trợ HTTP Range) |
| `HEAD` | `/api/books/:bookId/audio/:audioId/stream` | Metadata stream |
| `GET` | `/api/books/:bookId/audio/:audioId/transcript` | Transcript có dấu thời gian |

**Response mẫu `GET /api/books/:bookId/audio`:**

```json
{
  "bookId": 1,
  "parts": [
    {
      "id": 10,
      "partNumber": 1,
      "title": "Phần 1",
      "durationMs": 3600000,
      "language": "vi-VN",
      "narrator": "Trọng Trí",
      "streamUrl": "/api/books/1/audio/10/stream",
      "transcriptUrl": "/api/books/1/audio/10/transcript",
      "chapters": [
        {
          "id": 100,
          "sequence": 1,
          "title": "Chương 1: Lá thư",
          "startMs": 0,
          "endMs": 900000
        }
      ]
    }
  ]
}
```

---

## Kiến trúc

```
backend/
├── index.js                    # Entry point
├── .env.example                # Template biến môi trường
├── docs/
│   ├── audiobook-ingestion.md  # Hướng dẫn metadata publication & security
│   └── audiobook-ui-handoff.md # Hợp đồng bàn giao cho UI
├── scripts/
│   ├── migrate.js              # CLI migration runner
│   ├── seed.js                 # Nạp sách mẫu (books.json)
│   └── publish-audiobook-metadata.js
└── src/
    ├── server.js               # HTTP server
    ├── app.js                  # Express app factory
    ├── config/
    │   ├── database.js         # MySQL pool (DB_*)
    │   ├── r2.js               # R2 S3 client (CLOUDFLARE_S3_*)
    │   └── auth.js             # HMAC cookie authenticator
    ├── controllers/            # Request handlers
    ├── repositories/           # Truy vấn database
    ├── routes/                 # Định nghĩa endpoint
    ├── services/
    │   ├── audio-rate-limiter.js       # Rate limit theo user + IP
    │   ├── audiobook-access-policy.js  # Kiểm tra quyền truy cập
    │   └── r2-audio-storage.js         # Đọc từ Cloudflare R2
    ├── middleware/
    │   ├── error-handler.js
    │   └── require-authenticated-user.js
    └── utils/
        └── byte-range.js       # Phân tích HTTP Range header
```

### Luồng xác thực audio

```
Browser  ─── Cookie: daisy_session=<payload>.<hmac> ──▶
  createRequireAuthenticatedUser  (auth.js: xác minh HMAC, sub, exp)
    ↓ 401 nếu thiếu / hết hạn
  audioAccessPolicy.canAccess()   (kiểm tra quyền user với sách)
    ↓ 403 nếu không có quyền
  audioRateLimiter.acquire()      (giới hạn luồng đồng thời)
    ↓ 429 nếu vượt giới hạn
  r2AudioStorage.get(key, range)  (stream từ Cloudflare R2)
    ↓
  206 Partial Content
```

---

## Nạp dữ liệu sách nói (Ingest)

> Xem chi tiết tại [`docs/audiobook-ingestion.md`](./docs/audiobook-ingestion.md)

Repository chỉ nhận artifact đã kiểm duyệt
`database/audiobook-metadata.v1.json`. Production xác minh digest, exact catalog
ID/title và metadata của 7.977 object R2 bằng credential read-only, rồi publish
2.926 parts và 1.822 chapters vào DB sau migration.

```bash
# Local hoặc production, sau npm run db:migrate
npm run db:audiobooks:publish -- \
  --artifact ../database/audiobook-metadata.v1.json \
  --report .metadata-reports/audiobook-publication.json
```

Application restart không tự động ingest metadata. Có thể chạy lại cùng artifact
an toàn; publication fence và snapshot bảo vệ rollback.

---

## Chạy Tests

```bash
npm test
```

Dùng Node.js built-in test runner (`node:test`). Không cần database hay R2 thực — tất cả external deps được mock trong test.

---

## Lưu ý khi dev không có R2 / Session

- API catalog sách (`/api/books`, `/api/categories`) hoạt động bình thường.
- Các route audio trả về `401` — frontend hiển thị thông báo "Sách nói chưa khả dụng".
- Để test đầy đủ, cần cấu hình R2 credentials và tạo cookie `daisy_session` hợp lệ.
