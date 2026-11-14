# VĂN PHÒNG ẢO 3D – AI COMPANY

Ứng dụng mô phỏng và vận hành **Công ty Phần mềm Đa Tác Tử (Multi-Agent AI Company)** trong không gian văn phòng 3D hai tầng trực quan. Bạn là **Chủ tịch/CEO**, giao việc qua chat để 30 AI Agent Chibi phối hợp tự chủ từ Nghiên cứu thị trường → Marketing → Bán hàng (Lead Hunter, Account Provisioning, SDR, AE, Pricing) → Customer Success → Product → Data → Tài chính – Pháp chế – Nhân sự.

---

## 1. Tính năng nổi bật

- **Văn phòng 3D Hai Tầng & Nhân vật Chibi Toy (`@react-three/fiber` + `Three.js`)**:
  - **Tầng 1**: Sảnh & Lễ tân, Phòng Sales (Chuông & Bảng chốt Deal rung sáng khi chốt đơn), Phòng Customer Success (đèn tổng đài PBX), Phòng Họp Lớn, Pantry, Cầu thang.
  - **Tầng 2**: Phòng Giám đốc, Marketing (Bảng ý tưởng), Product & Engineering, Data & Analytics (**Màn hình KPI lớn 3D cập nhật trực tiếp từ DB**), Tài chính – Pháp chế – Nhân sự.
  - **Nhân vật Chibi/Toy dựng hoàn toàn bằng code**: 10 kiểu tóc, mắt chớp tự nhiên, miệng biểu cảm, tay/chân có khớp, phụ kiện theo vai trò (kính, tai nghe tổng đài, cà vạt, hoodie, mũ beret, ba lô), viền outline inverted-hull, bóng chạm sàn, 9 hoạt ảnh theo trạng thái (`idle`, `walking`, `typing`, `thinking` có `...` xoay, `talking`, `in_meeting`, `blocked` có `?`, `done` ăn mừng + confetti, `error`).
  - **Tab "Tùy chỉnh 3D"**: Xoay 360° từng nhân vật, đổi kiểu tóc/màu da/trang phục/phụ kiện hoặc bấm **Ngẫu nhiên**, lưu thẳng vào IndexedDB.
  - **Camera điện ảnh & LOD**: Nút **Xem tổng**, chế độ **Theo dõi nhân vật (Follow Cam)**, Ngày/Đêm 3D, tùy chọn chất lượng `Thấp / Vừa / Cao` (tự giảm tải trên Software WebGL và tạm dừng khi ẩn tab).
- **30 AI Agent chuyên biệt (`src/agents/*.ts`)** với System Prompt tiếng Việt, bộ nhớ ngắn/dài hạn tự tóm tắt, phân quyền **RBAC (`resource:action`)** và kiểm tra quyền qua `authorize()`.
- **Bộ não AI Đa Nhà Cung Cấp (`src/engine/llm/`)**:
  - **Google Gemini (`gemini` — mặc định trong AI Studio)**: Gọi qua server proxy `/api/llm/gemini` bằng `@google/genai` (tự nhận `GEMINI_API_KEY` của AI Studio). Dùng `gemini-2.5-flash` cho agent thường và `gemini-2.5-pro` cho Thư ký, CMO, Sales Director, Tech Lead.
  - **DeepSeek (`deepseek`)**: Hỗ trợ `deepseek-chat` (native tool calling) và `deepseek-reasoner` (chỉ lập kế hoạch).
  - **Local AI (`local`)**: Kết nối Ollama (`http://localhost:11434/v1`), LM Studio (`http://localhost:1234/v1`), llama.cpp. Có nút **Kiểm tra kết nối**, **Liệt kê model (`/models`)**, và **chế độ JSON-tool** ép model trả `{tool, args}` hoặc `{reply}` với kiểm tra schema và tự sửa tối đa 2 lần.
  - **Định tuyến theo vai trò & Dự phòng tự động**: 4 preset (*Cân bằng*, *Tiết kiệm*, *Chất lượng cao*, *Chạy offline hoàn toàn*), tự retry backoff và chuyển sang provider dự phòng kèm thông báo rõ ràng trên UI.
  - **Chế độ Mô phỏng (`mock`)**: Hoạt động đầy đủ khi chưa có API key.
- **Đội Sales Tự Chủ & Kênh Hỏi CEO qua Zalo**:
  - Autopilot định kỳ, Lead Hunter chống trùng, Account Provisioning dừng khi gặp CAPTCHA/OTP/2FA (KHÔNG tự vượt), SDR tuân thủ hạn mức ngày/khung giờ/blacklist, KILL SWITCH dừng khẩn cấp, `DRY_RUN` bật mặc định.

---

## 2. Hướng dẫn chạy Web (Local & AI Studio)

```bash
npm install
cp .env.example .env
# (Tuỳ chọn) điền GEMINI_API_KEY hoặc DEEPSEEK_API_KEY vào .env
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.
- Mật khẩu CEO mặc định lần đầu: `admin123` (bấm **Đổi MK CEO** trên thanh công cụ để đổi và lưu dạng PBKDF2 hash).

---

## 3. Cài đặt Ollama / LM Studio để chạy AI Local trên máy

1. **Cài đặt Ollama** (khuyên dùng) tại [ollama.com](https://ollama.com) hoặc **LM Studio** tại [lmstudio.ai](https://lmstudio.ai).
2. **Tải model hỗ trợ tiếng Việt tốt nên thử**:
   - `ollama pull qwen2.5:7b` (hoặc `qwen2.5:14b` nếu đủ VRAM — tiếng Việt rất tốt)
   - `ollama pull llama3.1:8b` hoặc `llama3.2:3b` (nhẹ)
   - `ollama pull gemma2:9b`
   > **Lưu ý:** Các model nhỏ (3B–7B) có chất lượng function/tool calling kém hơn Gemini 2.5 hoặc DeepSeek; ứng dụng đã bật sẵn **chế độ JSON-tool tự kiểm tra schema & sửa lỗi tối đa 2 lần**, tuy nhiên với tác vụ lãnh đạo phức tạp bạn có thể dùng preset **Tiết kiệm** (Gemini cho Lãnh đạo, Local cho SDR & tóm tắt bộ nhớ).
3. **Mở quyền CORS cho Ollama** (bắt buộc khi gọi trực tiếp từ trình duyệt):
   - macOS/Linux: `OLLAMA_ORIGINS="*" ollama serve`
   - Windows (PowerShell): `$env:OLLAMA_ORIGINS="*"; ollama serve`
4. **Lưu ý Mixed Content (HTTPS vs `http://localhost`)**:
   - Nếu bạn đang mở ứng dụng trên **URL HTTPS của AI Studio**, trình duyệt có thể chặn gọi thẳng `http://localhost:11434`. Để chạy Local AI trơn tru nhất, hãy **tải zip mã nguồn về máy** và chạy `npm run dev` tại `http://localhost:3000`, hoặc bật tùy chọn Proxy qua `/worker`.

---

## 4. Hướng dẫn chạy gói `/worker` (Playwright, SMTP, Zalo OA, SQLite/Prisma)

> Gói `/worker` chạy trên máy local sau khi tải code về (không chạy trong sandbox trình duyệt AI Studio).

```bash
cd worker
npm install
cp .env.example .env
# Cài đặt trình duyệt Playwright
npx playwright install chromium

# Khởi tạo database SQLite qua Prisma
npm run prisma:generate
npm run prisma:push

# Chạy worker
npm run dev
```

Gói `/worker` dùng chung cấu hình AI đa nhà cung cấp (`LLM_PROVIDER`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `LOCAL_BASE_URL`, `LOCAL_MODEL`). Mặc định `DRY_RUN=true` và `HEADLESS=true`.

---

## 5. Cấu hình Zalo OA & Test Webhook với `ngrok` / `cloudflared`

1. Truy cập [Zalo Developers](https://developers.zalo.me/), tạo ứng dụng và liên kết với **Zalo Official Account (OA)** của doanh nghiệp.
2. Điền `ZALO_OA_APP_ID`, `ZALO_OA_SECRET_KEY`, `ZALO_OA_REFRESH_TOKEN`, `ZALO_OA_CEO_USER_ID` vào `worker/.env`.
3. Mở tunnel công khai tới cổng `4100` của `/worker`:
   ```bash
   cloudflared tunnel --url http://localhost:4100
   # hoặc: ngrok http 4100
   ```
4. Dán URL HTTPS (`/webhooks/zalo`) vào trang quản trị Zalo Developers (bật sự kiện `user_send_text`).

---

## 6. Hướng dẫn mở rộng & Pháp lý (Nghị định 91/2020/NĐ-CP)

- **Thêm sản phẩm:** chỉnh sửa `src/config/products.ts`.
- **Thêm Agent mới:** tạo file trong `src/agents/ten_agent.ts` và đăng ký vào `src/agents/index.ts`.
- **Tuân thủ Nghị định 91/2020/NĐ-CP:** Mọi tin nhắn SDR tự động gắn `"Nhắn 'DỪNG' để không nhận thêm"`, tôn trọng Blacklist tuyệt đối, chỉ gửi trong khung `08:00–20:00`, giới hạn tin/ngày và tối đa 3 follow-up.

---

## 7. Lưu ý chính sách Facebook/TikTok/Zalo và quy định quảng cáo tại Việt Nam

1. **Nguyên tắc xác thực người thật (Không né kiểm duyệt):**
   - Các Agent **TUYỆT ĐỐI KHÔNG** sử dụng dịch vụ giải CAPTCHA, SIM/OTP ảo, proxy xoay hay kỹ thuật anti-detect để tạo tài khoản; không tạo nhiều tài khoản trùng lặp cho cùng 1 thương hiệu trên cùng một nền tảng; không mua follower, like hay bình luận ảo.
   - Khi Playwright gặp OTP SMS, CAPTCHA, 2FA, xác minh danh tính/giấy phép kinh doanh hoặc thanh toán, Agent **dừng ngay ở trạng thái `blocked`**, gửi thẻ **"Cần anh làm 1 bước"** lên Web/Zalo để CEO tự xác thực và tiếp tục đúng bước đang dở.
2. **Chính sách API & Tần suất nền tảng:**
   - **Facebook Page / Meta Graph API**: Ưu tiên sử dụng API chính thức đã duyệt quyền (`pages_manage_posts`, `pages_read_engagement`, `pages_messaging`). Không spam bài trùng nội dung, không nhắn tin hàng loạt cho người lạ chưa tương tác.
   - **TikTok Business & Content Posting API**: Nếu ứng dụng chưa qua kiểm duyệt Posting API, hệ thống xuất sẵn video script + caption để đăng qua quy trình chuẩn hoặc nhắc CEO bấm xuất bản.
   - **Zalo Official Account (ZOA)**: Tin nhắn chăm sóc/ZNS tuân thủ đúng mẫu đã được Zalo phê duyệt; tôn trọng giờ DND và tần suất phản hồi.
   - **Nhịp tăng dần an toàn**: Tuần 1 giới hạn mặc định `3 bài/tuần`, tuần 2+ tăng lên `5–7 bài/tuần`, có trần số bài/ngày trong phần Cài đặt.
3. **Quy định quảng cáo & Luật Quảng cáo Việt Nam:**
   - Mọi nội dung trả lời bình luận/inbox **luôn nêu rõ danh nghĩa tài khoản chính thức của công ty**, không mạo danh người dùng thật để viết đánh giá giả.
   - Mọi chiến dịch **Paid Ads** (Facebook Lead Ads, TikTok Ads, Zalo Ads), bài đầu tiên trên mỗi nền tảng mới, và nội dung chứa **giá/cam kết hiệu quả/so sánh đối thủ** đều phải qua hàng đợi **Phê duyệt CEO** (Mức tự chủ 2) và bị chặn ngay lập tức khi bật **KILL SWITCH**.
   - Không sử dụng từ ngữ khẳng định tuyệt đối vi phạm Luật Quảng cáo Việt Nam ("số 1", "tốt nhất tuyệt đối", "cam kết hoàn hảo 100%") khi chưa có tài liệu kiểm chứng hợp pháp.

