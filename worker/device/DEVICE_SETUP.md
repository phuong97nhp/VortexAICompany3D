# Hướng dẫn Cắm là Chạy Thiết bị Android (Plug & Play Device Farm)

Hệ thống `/worker/device` đã được viết sẵn hoàn chỉnh: chỉ cần cắm cáp USB (hoặc bật Android Emulator / ghép Wi-Fi) khi chạy `/worker` trên máy tính cá nhân là hệ thống tự nhận thiết bị trong vòng 2 giây. Khi chưa có thiết bị thật, `MockDeviceDriver` chạy ở chế độ chờ an toàn và không chạm vào HubCW.

---

## 1. Bật Gỡ lỗi USB trên từng dòng máy Android (làm 1 lần duy nhất)

1. Mở **Cài đặt (Settings)** -> **Giới thiệu điện thoại (About phone)** -> **Thông tin phần mềm (Software information)**.
2. Bấm liên tiếp **7 lần** vào **Số hiệu bản tạo (Build number)** cho đến khi thấy *"Bạn đã là nhà phát triển"*.
3. Quay lại **Cài đặt** -> **Tùy chọn nhà phát triển (Developer options)** -> bật **Gỡ lỗi USB (USB debugging)**.

### Lưu ý riêng theo hãng:
- **Samsung:** Ở *Tùy chọn nhà phát triển*, bật **Gỡ lỗi USB**. Nếu Windows chưa nhận máy, cài **Samsung Android USB Driver**.
- **Xiaomi / Redmi / POCO (MIUI / HyperOS):** Bắt buộc bật thêm **Cài đặt qua USB (Install via USB)** và **Gỡ lỗi USB (Cài đặt bảo mật) / USB debugging (Security settings)** (cần đăng nhập Mi Account để bật mục này nếu không agent sẽ không bấm/gõ được).
- **OPPO / Realme / ColorOS:** Bật **Gỡ lỗi USB** + **Tắt giám sát quyền (Disable permission monitoring)** ở cuối màn hình Developer options.
- **Vivo / iQOO (FuntouchOS):** Bật **Gỡ lỗi USB** + **USB debugging (Security settings)**.

---

## 2. Kết nối Cáp USB / Wi-Fi / Android Emulator

- **Cắm dây USB:** Dùng cáp truyền dữ liệu (không dùng cáp chỉ sạc). Trên màn hình điện thoại bật sáng, bấm **"Luôn cho phép từ máy tính này (Always allow from this computer)"** -> **Cho phép**.
  - Nếu trạng thái báo **CHƯA ỦY QUYỀN (unauthorized)**: mở khóa màn hình -> rút cáp cắm lại -> bấm Cho phép trên hộp thoại RSA.
- **Kết nối Wi-Fi (Android 11+):** Bật **Gỡ lỗi không dây (Wireless debugging)** -> *Ghép nối bằng mã*, nhập `IP:PORT` và mã 6 số vào tab **Thiết bị Android** trên web.
- **Android Emulator:** Khởi động máy ảo Android Studio AVD (`emulator-5554`) — hệ thống tự nhận qua `EmulatorDeviceDriver`.

---

## 3. Cài đặt ADB (Android Platform-Tools) & Kiểm tra nhanh

Worker tự tìm `adb` theo thứ tự:
1. Biến môi trường `ADB_PATH`
2. Hệ thống `PATH`
3. `worker/vendor/platform-tools/`
4. `.tools/platform-tools/` và thư mục Android SDK

Nếu chưa có ADB, trong tab **Thiết bị Android** bấm nút **"Tải & Cài ADB Tự động"** (có hộp thoại xác nhận) để tự tải gói chính thức từ Google `dl.google.com`, kiểm tra mã SHA-256 và giải nén vào `worker/vendor/platform-tools/`.

### Xử lý sự cố Driver OS:
- **Windows:** Mở Device Manager kiểm tra mục `Android Composite ADB Interface`. Nếu có dấu chấm than vàng, cài Google USB Driver / Samsung Driver và đổi cổng USB.
- **Linux:** Nếu báo lỗi quyền `udev`, chạy:
  ```bash
  echo 'SUBSYSTEM=="usb", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/51-android.rules
  sudo udevadm control --reload-rules && sudo usermod -aG plugdev $USER
  ```
  Sau đó cắm lại cáp USB.

### Lệnh kiểm tra Device Doctor:
```bash
npm run device:doctor
```
(hoặc `npm run --prefix worker device:doctor`)

---

## 4. Cài ADBKeyboard (khuyến nghị để Agent gõ tiếng Việt có dấu)

Tải và cài đặt APK **ADBKeyboard** vào máy phụ, chọn làm bàn phím mặc định trong *Quản lý bàn phím*. Nếu máy chưa có ADBKeyboard, hệ thống tự động fallback sang dán Clipboard tiếng Việt (`cmd clipboard set` + `KEYCODE_PASTE`).

---

## 5. Chính sách An toàn & Kho tệp Sandbox

- Mặc định mọi máy mới cắm đều ở **Chế độ CHỈ XEM** (`view_only`). CEO phải chủ động bật *Điều khiển có duyệt* hoặc *Tự động theo chính sách*.
- **Danh sách Cấm tuyệt đối (kiểm tra cả Package ID lẫn Tên App trên màn hình):** Toàn bộ Ngân hàng (VCB, Techcombank, MB, BIDV...), Ví điện tử (MoMo, ZaloPay, VNPay), 2FA/Authenticator, Trình quản lý mật khẩu, Cài đặt hệ thống, Thư viện ảnh, Danh bạ, Tin nhắn SMS.
- **Hành động nguy hiểm & OTP/CAPTCHA:** Hệ thống tự động dừng và gửi hỏi CEO (`ask_ceo`) khi phát hiện OTP, CAPTCHA, màn hình khóa hoặc nội dung *chuyển khoản / thanh toán / xóa tài khoản / factory reset*.
- **Trao đổi tệp (Push/Pull):** Bị giới hạn nghiêm ngặt trong thư mục `/sdcard/AICompanyWork/` trên điện thoại.
- **Kill Switch & Giành quyền ngay:** Bấm bất kỳ lúc nào để đưa toàn bộ máy về `CHỈ XEM` và xả sạch hàng đợi lệnh.
