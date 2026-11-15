import { findAdbBinary, getPlatformToolsDownloadInfo, runAdbCommand } from './adbDiscovery.js';
import { AdbDeviceDriver, MockDeviceDriver } from './drivers.js';

async function main() {
  console.log('=== AI COMPANY - ANDROID DEVICE DOCTOR ===');
  console.log(`Node.js: ${process.version} | OS: ${process.platform} (${process.arch})`);

  const adb = await findAdbBinary();
  if (!adb.found || !adb.adbPath) {
    const dl = getPlatformToolsDownloadInfo();
    console.log('❌ Chưa tìm thấy ADB (Android Debug Bridge) trong PATH hoặc thư mục mặc định.');
    console.log(`   Link tải Google Platform-Tools chính thức: ${dl.url}`);
    console.log(`   Hướng dẫn: ${dl.hint}`);
    console.log('ℹ️ Trong chế độ Sandbox / Preview không có máy thật, MockDeviceDriver vẫn hoạt động an toàn.');
    const mock = new MockDeviceDriver();
    const list = await mock.listDevices();
    console.log(`   Mock Devices sẵn sàng: ${list.map((d) => `${d.modelName} [${d.serial}]`).join(', ')}`);
    process.exit(0);
  }

  console.log(`✅ Đã tìm thấy ADB: ${adb.adbPath}`);
  console.log(`   Phiên bản: ${adb.version}`);

  const driver = new AdbDeviceDriver(adb.adbPath);
  const devices = await driver.listDevices();
  console.log(`📱 Thiết bị phát hiện qua ADB (${devices.length}):`);
  if (devices.length === 0) {
    console.log('   Chưa có điện thoại nào cắm cáp USB hoặc kết nối Wi-Fi.');
    console.log('   Kiểm tra: Bật Tùy chọn nhà phát triển -> Gỡ lỗi USB (USB Debugging) -> Cắm cáp truyền dữ liệu.');
  } else {
    for (const d of devices) {
      console.log(`   - ${d.modelName} [${d.serial}] | Trạng thái: ${d.status} | Pin: ${d.batteryPercent}% | ${d.temperatureC ?? '?'}°C`);
      if (d.status === 'unauthorized') {
        console.log('     ⚠️ Mở khóa màn hình điện thoại và bấm "Cho phép (Always allow from this computer)".');
      }
      if (d.status === 'device') {
        try {
          const imeOut = await runAdbCommand(adb.adbPath, ['-s', d.serial, 'shell', 'ime', 'list', '-a']);
          const hasAdbKeyboard = imeOut.includes('ADBKeyboard');
          console.log(
            hasAdbKeyboard
              ? '     ✅ ADBKeyboard đã cài (hỗ trợ gõ tiếng Việt có dấu mượt mà).'
              : '     ℹ️ Chưa có ADBKeyboard (vẫn thao tác chạm/vuốt bình thường; nên cài ADBKeyboard để gõ tiếng Việt đầy đủ).'
          );
        } catch {
          // ignore
        }
      }
    }
  }
}

main().catch((err) => {
  console.error('Lỗi Device Doctor:', err);
  process.exit(1);
});
