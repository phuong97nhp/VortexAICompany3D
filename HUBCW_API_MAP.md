# HUBCW_API_MAP.md — Bản đồ tích hợp `hub.chuyenweb.com`

Tài liệu này liệt kê toàn bộ giả định endpoint, chuẩn xác thực và payload cho 19 module trong `src/integrations/hubcw/hubcw.config.ts`.
CEO cần đối chiếu với tài liệu API thực tế của `hub.chuyenweb.com` trước khi chuyển từ **READ-ONLY** sang **LIVE**.

---

## 1. Cấu hình cơ sở & Header giả định

- **Base URL mặc định**: `https://hub.chuyenweb.com` (đổi được ngay trong tab **Kết nối phần mềm** hoặc `hubcw.config.ts`).
- **Xác thực giả định**: `Authorization: Bearer <agent_personal_token>` (mỗi agent dùng token/tài khoản **riêng**, giải mã từ WebCrypto Vault — không dùng chung tài khoản Admin).
- **Header truy vết & chống ghi trùng**:
  - `X-Agent-Id`: ID nhân viên AI thực hiện lệnh.
  - `X-External-User-Id`: User ID thật của nhân viên trên HubCW.
  - `X-Agent-Request-Id`: Mã truy vết duy nhất từng request.
  - `Idempotency-Key`: Khóa chống ghi trùng khi mạng lỗi/retry.
- **Kiểm tra phiên đăng nhập**: `GET /api/v1/auth/me` (kỳ vọng HTTP 200 + `{ data: { id, username, role } }`).

---

## 2. Bảng ánh xạ 19 Module

| # | Module (Tiếng Việt) | Module ID | Read Endpoint (Giả định) | Write Endpoint (Giả định) | Trạng thái mặc định |
|---|---|---|---|---|---|
| 1 | Bảng điều khiển | `dashboard` | `GET /api/v1/dashboard/summary` | *(Chỉ đọc)* | Cho phép đọc theo phân quyền |
| 2 | Khách hàng | `customers` | `GET /api/v1/customers` | `POST /api/v1/customers`, `PUT /api/v1/customers/:id` | Chống trùng, che SĐT/Email khi đưa vào LLM |
| 3 | Đơn hàng | `orders` | `GET /api/v1/orders` | `POST /api/v1/orders`, `PUT /api/v1/orders/:id` | **Tài chính**: bắt buộc phiếu chi `#CP-xxx` khớp số tiền |
| 4 | Ví | `wallet` | `GET /api/v1/wallet` | `POST /api/v1/wallet/transactions` | **CEO Critical**: mặc định khóa ghi |
| 5 | **Heo vàng** ⚠️ | `golden_pig` | `GET /api/v1/golden-pig` | `POST /api/v1/golden-pig/entries` | **KHÓA GHI** cho tới khi CEO xác nhận nghiệp vụ |
| 6 | **Tài nguyên** ⚠️ | `resources` | `GET /api/v1/resources` | `POST /api/v1/resources`, `PUT /api/v1/resources/:id` | **KHÓA GHI** cho tới khi CEO xác nhận nghiệp vụ |
| 7 | **Tự động** ⚠️ | `automation` | `GET /api/v1/automation/workflows` | `POST /api/v1/automation/workflows` | **KHÓA GHI** (tránh kích hoạt webhook/tin hàng loạt) |
| 8 | Tài khoản | `accounts` | `GET /api/v1/accounts` | `POST /api/v1/accounts`, `PUT /api/v1/accounts/:id` | CEO Critical |
| 9 | License | `licenses` | `GET /api/v1/licenses` | `POST /api/v1/licenses`, `PUT /api/v1/licenses/:id` | Yêu cầu `productId`, `customerId` |
| 10 | Sản phẩm | `products` | `GET /api/v1/products` | `POST /api/v1/products`, `PUT /api/v1/products/:id` | Đồng bộ danh mục sản phẩm |
| 11 | Thu Chi | `cashflow` | `GET /api/v1/cashflow` | `POST /api/v1/cashflow`, `PUT /api/v1/cashflow/:id` | **Tài chính**: bắt buộc `#CP-xxx` đã duyệt/đã chi |
| 12 | Báo cáo | `reports` | `GET /api/v1/reports` | *(Chỉ đọc)* | Nguồn số liệu chính cho KPI Screen 3D |
| 13 | Người dùng | `users` | `GET /api/v1/users` | `POST /api/v1/users`, `PUT /api/v1/users/:id` | Tạo/đổi role cần CEO phê duyệt |
| 14 | Công việc | `tasks` | `GET /api/v1/tasks` | `POST /api/v1/tasks`, `PUT /api/v1/tasks/:id` | Đồng bộ 2 chiều |
| 15 | Hỗ trợ | `support` | `GET /api/v1/support/tickets` | `POST /api/v1/support/tickets`, `PUT /api/v1/support/tickets/:id` | Đồng bộ ticket CS |
| 16 | Tài liệu | `documents` | `GET /api/v1/documents` | `POST /api/v1/documents`, `PUT /api/v1/documents/:id` | Kho tri thức |
| 17 | Phân quyền | `permissions` | `GET /api/v1/permissions` | *(Khóa cứng với Agent)* | Chỉ CEO chỉnh |
| 18 | Thông báo | `notifications` | `GET /api/v1/notifications` | `POST /api/v1/notifications`, `PUT /api/v1/notifications/:id/read` | Đọc & đánh dấu đã đọc |
| 19 | Cài đặt | `settings` | `GET /api/v1/settings` | *(Khóa cứng với Agent)* | Chỉ CEO chỉnh |

---

## 3. Những điểm CEO CẦN XÁC NHẬN trước khi bật LIVE

1. **Cơ chế đăng nhập & Header API thật của `hub.chuyenweb.com`**:
   - Dùng JWT `Authorization: Bearer ...`, `X-API-Key`, hay Laravel Sanctum / Session Cookie?
   - Đường dẫn gốc có phải `/api/v1/...` hay `/api/...` (hoặc cấu trúc response bọc trong `{ data: ... }` hay trả thẳng mảng)?
2. **Endpoint tạo tài khoản nhân viên mới (`/users`)**:
   - HubCW có cho phép tạo user qua API với trường `{ username, email, role, password }` không, hay CEO phải tạo thủ công trong trang quản trị rồi dán tài khoản vào bảng Nhân sự?
3. **Ba module nghiệp vụ chưa rõ (đang KHÓA GHI mặc định)**:
   - **Heo vàng (`golden_pig`)**: Đây là ví thưởng nội bộ / điểm tích lũy khách hàng / quỹ hoa hồng? Ai được cộng/trừ?
   - **Tự động (`automation`)**: Workflow gửi email/Zalo hay cron webhook? Cần xác nhận trước khi cho phép Agent sửa/kích hoạt.
   - **Tài nguyên (`resources`)**: Chứa VPS/Domain/Hosting hay File đính kèm? Schema tạo mới gồm những trường nào?
4. **Môi trường Staging/Test**: Khuyến nghị tạo 1 subdomain thử nghiệm (ví dụ `https://staging-hub.chuyenweb.com`) để chạy `Kiểm tra kết nối` và `Preflight LIVE` trước khi trỏ vào dữ liệu sản xuất thật.
