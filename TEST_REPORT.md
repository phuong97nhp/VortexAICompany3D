# BÁO CÁO KIỂM THỬ HỆ THỐNG — VĂN PHÒNG ẢO 3D AI COMPANY

## 1. Tổng quan phạm vi kiểm thử
Báo cáo ghi nhận kết quả kiểm thử tự động thực tế sau khi hoàn thiện:
1. **Sửa lỗi crash khởi động (`Cannot read properties of undefined (reading 'departments')`)**: Cổng `bootStatus` (`booting | ready | error`), đăng ký `liveRegistry` sau khi Zustand store khởi tạo xong, `AppErrorBoundary` toàn cục, di trú schema v5→v6 + bảo lưu dữ liệu hỏng vào `localStorage`.
2. **BỔ SUNG G & H**: Kết nối `hub.chuyenweb.com`, Tài khoản 1-1 & Vault AES-256-GCM, Cổng kiểm soát dữ liệu thật (`Write Gate`), Đồng phục Logo 3D.
3. **BỔ SUNG I — Tầng 3 Khối Affiliate (Tiếp thị liên kết)**: Tòa nhà 3 tầng (`y=0, 3.8, 7.6`), thang bộ & thang máy kính chuyển động thực, 5 phòng ban & 15 agent Affiliate, khóa Aff ID CEO, chấm điểm Win 0–100 (`chưa có` khi `null`), Compliance Agent, parse CSV hoa hồng thật (`—` khi rỗng) & tự cắt chiến dịch ROI âm.
4. **BỔ SUNG J — Ổn định 24/7 & Sẵn sàng thực tế**: Durable Jobs queue + recovery khi reload, Circuit Breaker + Backoff+Jitter, Sanitizer chống Prompt Injection, Go-Live Checklist 10 mục chặn bật `LIVE`, Onboarding Wizard 9 bước, Sao lưu/Khôi phục JSON & Soak test mô phỏng 2 giờ × 60 agent.
5. **BỔ SUNG K — Phòng Pháp chế (Tầng 2)**: 5 agent Pháp chế, Kho 16 văn bản luật VN, 11 mẫu hợp đồng × 3 biến thể, chống bịa đặt `[CẦN BỔ SUNG]`, xác minh trích dẫn 6 trường (`CHƯA XÁC MINH - CẦN LUẬT SƯ XÁC NHẬN` và loại khỏi kết luận), xuất `.docx` & `.pdf` UTF-8 thật, Redline diff, và khóa gửi chỉ CEO (`contract:send`).

---

## 2. Kết quả Unit Test & Soak Test Toàn Hệ Thống (`src/tests/fullSystem.test.ts`)

- **Lệnh thực thi:** `npx tsx src/tests/fullSystem.test.ts`
- **Mã thoát (Exit code):** `0`
- **Kết quả:** **5/5 nhóm kiểm thử ĐẠT (100%)**

| STT | Nhóm kiểm thử | Nội dung đã kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- |
| 1 | Khởi tạo Store & `liveRegistry` (Crash Fix) | Import `useCompanyStore` không ném `TypeError`; `bootStatus === 'booting'`; `getLiveDepartments()` & `getLiveAgents()` có đủ 3 tầng, `legal` Tầng 2 (5 agent) & `aff_*` Tầng 3 (≥14 agent) | **PASS** |
| 2 | Di trú Schema v5→v6 & Zod Recovery | `migrateSettingsRecord` nâng cấp schema v6, chuẩn hóa `eco`→`low`; `safeParseJsonWithRecovery` & `validateBackupBundleJson` lưu bản JSON hỏng vào `localStorage` (`aicompany_corrupted_backup_*`) và xác thực bundle hợp lệ | **PASS** |
| 3 | Affiliate Tầng 3 | Chặn tạo link khi thiếu Aff ID CEO; khóa RBAC không cho AI `settings:write`; nhúng đúng `affId` + `sub_id` vào URL; `scoreAffiliateProduct` giữ `null`/`"chưa có"`; `runAffiliateComplianceCheck` chặn ngôn từ chữa bệnh/trải nghiệm giả/thiếu nhãn công khai; `parseAffiliateCsvReport` & `computeRealAffiliateMetrics` trả `null` (`"—"`) khi rỗng và tính đúng Approved/Pending/Paid/Cancelled + tự cắt ROI âm | **PASS** |
| 4 | Vận hành 24/7 & Soak Test 2h/60 agent | `recoverOrphanedDurableJobs` phục hồi job `leased` về `queued` & gắn `dead` khi hết `maxAttempts`; `CircuitBreakerRegistry` chuyển `open`→`half_open`→`closed`; `retryWithBackoff`; `sanitizeExternalUntrustedContent`; `evaluateGoLiveChecklist` kiểm tra đủ 10/10 mục chặn `LIVE`; Soak test 120 phút ảo × 60 agent giữ hàng đợi bounded (≤200 jobs, ≤400 logs) và hoàn tất 100% | **PASS** |
| 5 | Phòng Pháp chế & Hợp đồng VN | `draftContractFromVerifiedData` gắn `[CẦN BỔ SUNG]` cho mọi trường Bên A/B thiếu, kèm disclaimer bắt buộc; `evaluateLawyerEscalation` bật cờ Luật sư thật khi có dữ liệu trẻ em hoặc vượt ngưỡng; `verifyCitationsStrict` gắn `"CHƯA XÁC MINH - CẦN LUẬT SƯ XÁC NHẬN"` & loại khỏi kết luận trong `buildLegalReport`; `checkLawChangeImpact` gắn cờ mẫu & HĐ bị ảnh hưởng; `computeRedlineDiff`; xuất `.docx` (header `PK`) & `.pdf` (header `%PDF-`); `authorize(..., 'contract:send')` từ chối Agent AI | **PASS** |

---

## 3. Kết quả Unit Test Cổng Kiểm Soát Dữ Liệu Thật (`src/integrations/hubcw/writeGate.test.ts`)

- **Lệnh thực thi:** `npx tsx src/integrations/hubcw/writeGate.test.ts`
- **Mã thoát (Exit code):** `0`
- **Kết quả:** **8/8 nhóm kiểm thử ĐẠT (100%)**

| STT | Nhóm kiểm thử | Nội dung kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :--- |
| 1 | Chặn dữ liệu mô phỏng (`origin="simulated"`) | Từ chối cứng bản ghi gắn cờ `simulated` và phiếu chi mô phỏng | **PASS** |
| 2 | Kiểm tra nguồn gốc (`provenance`) | Từ chối bản ghi thiếu `provenance`, hoặc có nguồn `llm_generated`, `estimated`, `unknown` | **PASS** |
| 3 | Bộ lọc Anti-Hallucination | Chặn SĐT/email/tên giả, ngày sai định dạng & tổng tiền lệch đơn giá × số lượng | **PASS** |
| 4 | Ràng buộc tài chính `#CP-xxx` | Chặn ghi vào `cashflow`, `wallet`, `orders`, `golden_pig` nếu thiếu phiếu `#CP-xxx` đã duyệt | **PASS** |
| 5 | Đối chiếu chéo (Cross-Verification) | Chặn thao tác `update` thiếu `recordId` hoặc `refId` không tồn tại trên HubCW | **PASS** |
| 6 | Kiểm soát môi trường & quyền | Chặn khi `sandbox` / `read_only`, `Kill Switch`, tài khoản chưa gắn, module khóa hoặc lệnh xóa cứng | **PASS** |
| 7 | Ghi `LIVE` hợp lệ & truy xuất nguồn gốc | Trả về `externalRecordId`, ghi `AuditLog`, `HubCwApiLog` và sinh `HubCwUndoSnapshot` | **PASS** |
| 8 | Hoàn tác (`Undo Snapshot`) | Khôi phục trạng thái bản ghi trước khi ghi thông qua `revertHubCwSnapshot` | **PASS** |

---

## 4. Kết quả Unit Test BỔ SUNG L → W (`src/tests/addonsLtoW.test.ts`)

- **Lệnh thực thi:** `npx tsx src/tests/addonsLtoW.test.ts`
- **Kết quả:** **8/8 nhóm kiểm thử ĐẠT (100%)**

| Nhóm | Nội dung kiểm chứng | Trạng thái |
| :--- | :--- | :--- |
| L (Spot-Check) | `maskSensitiveContent` che key/OTP/STK; `buildHonestAgentScreenSnapshot` gắn `simulated=true` và không dựng ảnh giả; phát hiện `lặp` & `kẹt` | **PASS** |
| M (Voice & Meeting) | `proposeUniqueVoiceForAgent` cấp 6 giọng riêng không trùng chữ ký; `parseCeoVoiceCommand` nhận diện lệnh gọi Thư ký, họp, soi màn hình, Kill Switch | **PASS** |
| N (Quality & Council) | Chặn Maker=Critic; bắt buộc Critic nêu ≥2 điểm yếu thật; Hội đồng bỏ phiếu trọng số & hòa phiếu chuyển CEO | **PASS** |
| O (Zalo Cá nhân) | Bắt buộc xác nhận CEO; chặn DNC & Cold Marketing chưa Legal duyệt; trần ≤20 tin chủ động/ngày; miễn trần cho tin trả lời khách | **PASS** |
| P (OKR Funnel) | Gắn nhãn `"giả định, cần kiểm chứng"` khi thiếu mẫu CRM; tính Low/Mid/High & cảnh báo chậm tiến độ | **PASS** |
| Q (SOP & Exam) | `checkOutputAgainstSop` chặn từ cấm; chấm điểm Onboarding Exam ≥67 đạt / <67 trượt; đề xuất nhân bản khi quá tải | **PASS** |
| R (Product & Bank) | Chặn tuyên bố cấm, giảm giá >10%, STK ngân hàng lạ & lừa đảo đổi STK; cho phép SĐT VN hợp lệ | **PASS** |
| S/V/W (Collab & Playbook) | SLA bàn giao `#BG-xxx`; đánh giá Git repo gắn `"CHƯA KIỂM CHỨNG"` khi chưa Sandbox; chặn Fast-track tác vụ rủi ro cao & tự rollback khi tụt >10 điểm | **PASS** |

---

## 5. Kết quả Unit Test Android Device Farm (`worker/device/device.test.ts`)

- **Lệnh thực thi:** `npx tsx worker/device/device.test.ts`
- **Nội dung kiểm chứng:** Bộ lọc App Allowlist/Blocklist (`com.android.settings`, app ngân hàng bị chặn), che vùng mật khẩu/OTP trên OCR, kiểm soát 3 chế độ (`view_only`, `approved_actions`, `policy_auto`), giới hạn pin thấp & nhiệt độ cao, và dừng khẩn cấp Kill Switch.

---

## 6. Kiểm tra Biên dịch, TypeScript & Giới hạn Môi trường Container

- **TypeScript (`npm run lint` → `tsc --noEmit`):** Đã kiểm tra sau toàn bộ nâng cấp L → X+.
- **Production Build (`compile_applet` / Vite build):** Biên dịch hoàn chỉnh bundle sản xuất.
- **Lưu ý môi trường kiểm thử:** Container sandbox không cài đặt sẵn binary trình duyệt Chromium/Playwright hoặc phần cứng điện thoại Android ADB thật, nên các module trình duyệt & ADB được kiểm chứng thông qua mock/driver độc lập (`device.test.ts`, `deviceDoctor.ts`) và luồng web UI sẵn sàng chạy qua `npm run dev`.
