# Hướng dẫn Cắm là Chạy Thiết bị Android (Plug & Play Device Farm)

## 1. Bật Gỡ lỗi USB trên điện thoại Android (làm 1 lần duy nhất)
1. Mở **Cài đặt (Settings)** -> **Giới thiệu điện thoại (About phone)** -> **Thông tin phần mềm (Software information)**.
2. Bấm liên tiếp **7 lần** vào **Số hiệu bản tạo (Build number)** cho đến khi thấy thông báo *"Bạn đã là nhà phát triển"*.
3. Quay lại **Cài đặt** -> **Tùy chọn nhà phát triển (Developer options)**.
4. Bật **Gỡ lỗi USB (USB debugging)**. (Trên Xiaomi/OPPO/Vivo bật thêm *Cài đặt qua USB* và *Gỡ lỗi USB (Cài đặt bảo mật)* nếu muốn nhập liệu/nhấn nút tự động).

## 2. Kết nối dây USB hoặc Wi-Fi không dây
- **Cắm dây USB:** Dùng cáp truyền dữ liệu (không phải cáp chỉ sạc) cắm vào máy tính. Trên màn hình điện thoại bấm **"Luôn cho phép từ máy tính này (Always allow)" -> Cho phép**.
- **Kết nối Wi-Fi (Android 11+):** Bật **Gỡ lỗi không dây (Wireless debugging)** trên điện thoại, vào mục *Ghép nối bằng mã*, nhập `IP:PORT` và mã 6 số vào tab **Thiết bị Android** trên web.

## 3. Kiểm tra nhanh bằng Device Doctor
Chạy lệnh sau tại thư mục gốc dự án:
```bash
npm run --prefix worker device:doctor
```

## 4. Cài ADBKeyboard (khuyến nghị để Agent gõ tiếng Việt có dấu)
Tải APK **ADBKeyboard** (mã nguồn mở) cài vào máy phụ, chọn làm bàn phím mặc định khi chạy tự động.

## 5. Hàng rào An toàn Bắt buộc
- Mặc định máy mới cắm luôn ở chế độ **CHỈ XEM**.
- Hệ thống **CHẶN TUYỆT ĐỐI** mọi app Ngân hàng, Ví điện tử (MoMo, ZaloPay), Google Authenticator, Cài đặt hệ thống, Ảnh và Danh bạ.
- Mọi màn hình hỏi **OTP / CAPTCHA** tự dừng ngay và gửi về CEO (`ask_ceo`).
- Bấm **KILL SWITCH** để ngắt toàn bộ hàng đợi điều khiển lập tức.
