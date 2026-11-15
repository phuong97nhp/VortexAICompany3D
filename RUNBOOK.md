# RUNBOOK VẬN HÀNH 24/7 — VĂN PHÒNG ẢO 3D AI COMPANY

Tài liệu hướng dẫn CEO & người vận hành thiết lập an toàn, giám sát 24/7, xử lý sự cố và khôi phục dữ liệu khi chạy thực tế.

---

## 1. Quy trình Khởi tạo Sạch & Go-Live (10 Mục Bắt Buộc)

Trước khi chuyển hệ thống từ `SANDBOX` / `READ-ONLY` sang `LIVE (Ghi dữ liệu thật)`, hệ thống tự động kiểm tra **10 điều kiện chặn cứng** trong tab **Sức khỏe 24/7 & Go-Live**:

1. **Đổi mật khẩu CEO mặc định** (`admin123`) tại **Cài đặt → Bảo mật** hoặc nút **Đổi MK CEO**.
2. **Cấu hình ít nhất 1 bộ não AI thật** (`Gemini`, `DeepSeek`, hoặc `Local Ollama/LM Studio`).
3. **Kiểm tra URL Hub.ChuyenWeb.com** và giới hạn ghi/giờ (`hourlyWriteLimit > 0`).
4. **Gắn ít nhất 1 tài khoản HubCW 1-1** cho nhân sự hoặc xác nhận chạy Sandbox.
5. **Nhập Aff ID của CEO** tại **Cài đặt → 5. Affiliate Tầng 3 & Aff ID** (ưu tiên Shopee #1).
6. **Điền thông tin Pháp nhân Bên A** (Tên công ty, MST, Địa chỉ, Người đại diện) tại **Pháp chế → Pháp nhân Bên A**.
7. **Đặt hạn mức Token/ngày & Ngưỡng chi bắt buộc CEO duyệt**.
8. **Gửi cảnh báo kiểm thử 24/7** (`Gửi cảnh báo test` trong Cài đặt hoặc Wizard).
9. **Chạy thử 1 chu kỳ ở chế độ `READ-ONLY`** để xác minh chỉ đọc an toàn không ghi bừa bãi.
10. **Tạo bản sao lưu JSON đầu tiên** trong **Sức khỏe 24/7 → Sao lưu & Khôi phục** (hoặc Wizard Bước 9).

> **Xóa dữ liệu demo để chạy thật:** Mở **Onboarding Wizard** (trong tab **Sức khỏe 24/7**) → bấm **Xóa dữ liệu demo (bắt đầu sạch)** và xác nhận 1 chạm. Hệ thống sẽ xóa sạch Leads, Tasks, Documents, Expenses, và kho Affiliate demo nhưng giữ nguyên cấu hình công ty, nhân sự và mẫu hợp đồng.

---

## 2. Giám sát & Xử lý Sự cố 24/7

### A. Circuit Breaker (Ngắt mạch tự động)
- Mỗi AI Provider (`llm:gemini`, `llm:deepseek`, `llm:local`) và tích hợp (`integration:hubcw`, `integration:zalo`, `integration:affiliate`, `integration:social`) có bộ ngắt mạch riêng.
- Sau **3 lỗi liên tiếp** (429 rate limit, timeout, lỗi mạng), mạch tự động chuyển sang **`OPEN`** trong `45s` và chuyển sang provider dự phòng để tránh treo toàn bộ 3D/chat.
- Sau `45s`, mạch chuyển **`HALF_OPEN`** để thử 1 request; nếu thành công tự đóng lại **`CLOSED`**. Có thể bấm **Reset tất cả Circuit Breakers** trong tab **Sức khỏe 24/7**.

### B. Hàng đợi Durable Jobs (Chống mất việc khi reload/restart)
- Mọi tác vụ nền dài hạn được lưu trong IndexedDB (`durableJobs`) với trạng thái `queued` → `leased` → `completed` (hoặc `dead` sau `maxAttempts = 3`).
- Khi khởi động lại trình duyệt hoặc restart server, hàm `recoverOrphanedDurableJobs()` tự động chuyển các job bị treo `leased` về `queued` để tiếp tục chạy mà không nhân đôi tác dụng phụ nhờ `idempotencyKey`.

### C. Cảnh báo Ngân sách Token & Bộ nhớ Trình duyệt
- **70% / 90% ngân sách token/ngày:** Hệ thống gửi cảnh báo lên log và Zalo/Telegram (nếu cấu hình).
- **100% ngân sách token/ngày:** Khóa gọi LLM ngoài để tránh phát sinh chi phí ngoài kiểm soát; CEO có thể nâng `dailyTokenBudget` trong Cài đặt.
- **Heap Memory & FPS 3D:** Nếu thiết bị yếu hoặc FPS thấp khi vận hành 50–60 agent, chuyển **Chất lượng đồ họa 3D** sang `Thấp` (tắt Outline & Bóng đổ), hoặc lọc xem từng tầng (`Tầng 1`, `Tầng 2`, `Tầng 3`).

---

## 3. Khôi phục Dữ liệu & Crash Recovery

1. **Khi dữ liệu JSON / IndexedDB bị hỏng:**
   - Trình đọc Zod (`src/db/schemaMigration.ts`) tự động trích xuất bản gốc bị lỗi vào `localStorage` dưới key `aicompany_corrupted_backup_<tag>_<timestamp>` và khởi động an toàn bằng cấu hình fallback v6 — tuyệt đối không crash trắng màn hình.
2. **Nút khôi phục khẩn cấp:**
   - Trên màn hình **AppErrorBoundary** (nếu gặp lỗi nghiêm trọng không khôi phục được) hoặc trong **Cài đặt → 6. Đặt lại dữ liệu cục bộ**, bấm **Xác nhận xóa sạch & Tải lại** để dọn `IndexedDB (AICompany3D_DB_v1)` và `localStorage`.
3. **Sao lưu & Khôi phục JSON:**
   - Hệ thống tự tạo bản sao lưu định kỳ mỗi ngày (`lastAutoBackupAt`). CEO có thể tải file `.json` hoặc dán nội dung file sao lưu vào tab **Sức khỏe 24/7 → Khôi phục từ JSON** để phục hồi toàn bộ phòng ban, nhân sự, CRM, task, hợp đồng và chiến dịch Affiliate.

---

## 4. Vận hành An toàn Affiliate (Tầng 3) & Pháp chế (Tầng 2)

- **Affiliate Tầng 3:**
  - **Không bao giờ chia sẻ quyền sửa Aff ID cho Agent:** Chỉ CEO chỉnh tại **Cài đặt → 5. Affiliate Tầng 3 & Aff ID**.
  - **Dữ liệu thật từ CSV:** Xuất file báo cáo Click/Hoa hồng từ Shopee/TikTok Shop/AccessTrade và tải lên tại **Affiliate Tầng 3 → Hoa hồng thật & ROI**. Hệ thống tính `Pending / Approved / Paid / Cancelled / EPC / CR / ROI` từ số liệu thật (trước khi tải CSV, mọi chỉ số đều hiển thị `—`).
- **Phòng Pháp chế Tầng 2:**
  - Dùng lệnh `/soan-hop-dong <tên bên B>` hoặc mở tab **Pháp chế**.
  - Kiểm tra mọi thẻ **`[CẦN BỔ SUNG]`** màu đỏ và mục **`CHƯA XÁC MINH - CẦN LUẬT SƯ XÁC NHẬN`** trước khi xuất `.docx` / `.pdf`.
  - Hợp đồng có giá trị > ngưỡng hoặc liên quan **dữ liệu trẻ em (Trường Mầm non)** / **yếu tố nước ngoài** / **bán mã nguồn** sẽ tự động gắn cờ **Bắt buộc chuyển Luật sư thật**.
  - Phê duyệt nhanh qua Zalo Simulator: gõ `1 #HD-2026-001` (Duyệt gửi), `2 #HD-2026-001 ghi chú` (Sửa lại), hoặc `3 #HD-2026-001` (Chuyển Luật sư thật).

---

## 5. Vận hành BỔ SUNG L → X+ (Giám sát, Zalo Cá nhân, Ngân hàng 2FA & Android Farm)

- **Spot-Check & Tường Giám sát (L):**
  - Mọi dữ liệu nhạy cảm (API key, token, OTP, mật khẩu, STK) đều đi qua `maskSensitiveContent()` trước khi lưu snapshot. Ở `SANDBOX`, màn hình luôn gắn nhãn **Mô phỏng** và không bao giờ tạo ảnh chụp trình duyệt giả.
- **Zalo Cá nhân Có Rào chắn (O):**
  - Chỉ dùng SIM/tài khoản riêng công ty sau khi CEO tích đủ 2 ô xác nhận trong **Cài đặt → 9. Zalo Cá nhân**.
  - Giới hạn cứng `<= 20` tin tiếp cận mới/ngày (tin trả lời khách được miễn), tự dừng ngay khi gặp dấu hiệu bất thường hoặc khi bật **KILL SWITCH**.
- **Tài khoản Ngân hàng Công ty (R):**
  - Chỉ CEO có thể thêm/sửa/xóa qua bước xác thực **Mật khẩu CEO + mã OTP** trong tab **SP & Ngân hàng**. Agent AI bị chặn cứng đổi số tài khoản hoặc gửi STK ngoài danh mục công ty.
- **Thiết bị Android Cắm là Chạy (X+):**
  - Xem hướng dẫn từng bước tại `worker/DEVICE_SETUP.md`. Chạy `cd worker && npm run device:doctor` để kiểm tra ADB trên máy local.
  - Mặc định mọi thiết bị mới gắn vào luôn khởi đầu ở mức **`view_only` (Chỉ xem)**; cần CEO chuyển sang `approved_actions` hoặc `policy_auto`, với nút **Giành quyền / DỪNG** luôn sẵn sàng.
