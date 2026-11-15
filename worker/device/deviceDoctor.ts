import { findAdbBinary, getOsDriverTroubleshootingTips, getPlatformToolsDownloadInfo, runAdbCommand } from './adbDiscovery.js';
import { AdbDeviceDriver, EmulatorDeviceDriver, MockDeviceDriver } from './drivers.js';

async function main() {
  console.log('=== AI COMPANY - ANDROID DEVICE DOCTOR ===');
  console.log(`Node.js: ${process.version} | OS: ${process.platform} (${process.arch})`);

  const adb = await findAdbBinary();
  if (!adb.found || !adb.adbPath) {
    const dl = getPlatformToolsDownloadInfo();
    console.log('❌ Chưa tìm thấy ADB (Android Debug Bridge) trong ADB_PATH / PATH / worker/vendor/platform-tools.');
    console.log(`   Link tải Google Platform-Tools chính thức: ${dl.url}`);
    console.log(`   Hướng dẫn: ${dl.hint}`);
    for (const tip of getOsDriverTroubleshootingTips()) {
      console.log(`   • ${tip}`);
    }
    console.log('ℹ️ Trong chế độ Sandbox / Preview không có máy thật, MockDeviceDriver vẫn hoạt động an toàn.');
    const mock = new MockDeviceDriver();
    const list = await mock.listDevices();
    console.log(`   Mock Devices sẵn sàng: ${list.map((d) => `${d.modelName} [${d.serial}]`).join(', ')}`);
    process.exit(0);
  }

  console.log(`✅ Đã tìm thấy ADB: ${adb.adbPath} (nguồn: ${adb.source})`);
  console.log(`   Phiên bản: ${adb.version}`);

  const usbDriver = new AdbDeviceDriver(adb.adbPath);
  const emuDriver = new EmulatorDeviceDriver(adb.adbPath);
  const devices = [...(await usbDriver.listDevices()), ...(await emuDriver.listDevices())];
  console.log(`📱 Thiết bị phát hiện qua ADB (${devices.length}):`);
  if (devices.length === 0) {
    console.log('   Chưa có điện thoại nào cắm cáp USB, Wi-Fi hoặc Android Emulator đang chạy.');
    for (const tip of getOsDriverTroubleshootingTips()) {
      console.log(`   • ${tip}`);
    }
  } else {
    for (const d of devices) {
      console.log(
        `   - ${d.manufacturer ? `${d.manufacturer} ` : ''}${d.modelName} [${d.serial}] | ${d.androidVersion} | Trạng thái: ${d.status} | Pin: ${d.batteryPercent}% | ${d.temperatureC ?? '?'}°C | Trống: ${d.storageFreeMb ?? '?'}MB`
      );
      if (d.status === 'unauthorized') {
        console.log('     ⚠️ Mở khóa màn hình điện thoại và bấm "Luôn cho phép từ máy tính này (Always allow)".');
      }
      if (d.status === 'device') {
        try {
          const imeOut = await runAdbCommand(adb.adbPath, ['-s', d.serial, 'shell', 'ime', 'list', '-a']);
          const hasAdbKeyboard = imeOut.includes('ADBKeyboard');
          console.log(
            hasAdbKeyboard
              ? '     ✅ ADBKeyboard đã cài (hỗ trợ gõ tiếng Việt có dấu mượt mà).'
              : '     ℹ️ Chưa có ADBKeyboard (hệ thống sẽ tự dùng Clipboard Paste fallback; khuyến nghị cài ADBKeyboard).'
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
