import assert from 'node:assert/strict';
import { DeviceCommandQueue } from './commandQueue.js';
import { MockDeviceDriver } from './drivers.js';
import { DeviceHotplugMonitor } from './hotplugMonitor.js';
import { DEFAULT_DEVICE_POLICY, evaluateDevicePolicyGate, maskSensitiveDeviceText, resetDeviceRateLimits } from './policyGate.js';

async function runTests() {
  console.log('Running /worker/device tests...');
  resetDeviceRateLimits();

  // 1. MockDeviceDriver isolation & screenshot
  const mock = new MockDeviceDriver();
  const list = await mock.listDevices();
  assert.equal(list.length, 1);
  const dev = list[0];
  assert.equal(dev.controlMode, 'view_only');

  const shot = await mock.screenshot(dev.serial);
  assert.ok(shot && shot.startsWith('data:image/svg+xml;base64,'), 'Mock screenshot must return data URL');

  // 2. PolicyGate: default view_only blocks control commands, allows screenshot
  const viewGateShot = evaluateDevicePolicyGate({
    device: dev,
    req: { deviceId: dev.id, agentId: 'aff_channel_mgr', action: 'screenshot', policy: DEFAULT_DEVICE_POLICY },
    foregroundPackage: 'com.zing.zalo',
    killSwitchActive: false,
  });
  assert.equal(viewGateShot.allowed, true, 'Screenshot should be allowed in view_only mode');

  const viewGateTap = evaluateDevicePolicyGate({
    device: dev,
    req: { deviceId: dev.id, agentId: 'aff_channel_mgr', action: 'tap', x: 100, y: 200, policy: DEFAULT_DEVICE_POLICY },
    foregroundPackage: 'com.zing.zalo',
    killSwitchActive: false,
  });
  assert.equal(viewGateTap.allowed, false);
  assert.equal(viewGateTap.resultCode, 'blocked_mode');

  // 3. PolicyGate: blocks banking/wallet/settings packages even in policy_auto mode
  const autoDev = { ...dev, controlMode: 'policy_auto' as const };
  const bankBlocked = evaluateDevicePolicyGate({
    device: autoDev,
    req: {
      deviceId: dev.id,
      agentId: 'cfo',
      action: 'open_app',
      packageName: 'com.vietcombank',
      policy: DEFAULT_DEVICE_POLICY,
    },
    foregroundPackage: 'com.vietcombank',
    killSwitchActive: false,
  });
  assert.equal(bankBlocked.allowed, false);
  assert.equal(bankBlocked.resultCode, 'blocked_policy');

  const settingsBlocked = evaluateDevicePolicyGate({
    device: autoDev,
    req: {
      deviceId: dev.id,
      agentId: 'cfo',
      action: 'tap',
      x: 50,
      y: 50,
      policy: DEFAULT_DEVICE_POLICY,
    },
    foregroundPackage: 'com.android.settings',
    killSwitchActive: false,
  });
  assert.equal(settingsBlocked.allowed, false);
  assert.equal(settingsBlocked.resultCode, 'blocked_policy');

  // 4. PolicyGate: OTP / CAPTCHA detection -> ask_ceo_otp
  const otpGate = evaluateDevicePolicyGate({
    device: autoDev,
    req: { deviceId: dev.id, agentId: 'account_provisioning', action: 'tap', x: 10, y: 10, policy: DEFAULT_DEVICE_POLICY },
    foregroundPackage: 'com.zing.zalo',
    ocrText: 'Vui lòng nhập mã OTP 6 số được gửi tới SĐT của bạn',
    killSwitchActive: false,
  });
  assert.equal(otpGate.allowed, false);
  assert.equal(otpGate.resultCode, 'ask_ceo_otp');

  // 5. Sensitive masking on OCR / text
  const masked = maskSensitiveDeviceText('Mã xác thực OTP: 482910 | STK: 102938475612 | password=secret123');
  assert.ok(!masked.includes('482910'), 'OTP must be masked');
  assert.ok(!masked.includes('secret123'), 'Password must be masked');

  // 6. Hotplug Monitor event detection
  const monitor = new DeviceHotplugMonitor([mock]);
  const events: string[] = [];
  monitor.subscribe((e) => events.push(e.type));
  await monitor.scanOnce();
  assert.ok(events.includes('device_connected'), 'Initial scan must emit device_connected');

  // 7. Sequential FIFO CommandQueue + Kill Switch flush
  const queue = new DeviceCommandQueue();
  const order: number[] = [];
  await Promise.all([
    queue.enqueue(dev.id, async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    }),
    queue.enqueue(dev.id, async () => {
      order.push(2);
    }),
  ]);
  assert.deepEqual(order, [1, 2], 'Commands on same device must run strictly FIFO');

  queue.setKillSwitch(true);
  await assert.rejects(
    queue.enqueue(dev.id, async () => 1),
    /Kill Switch/
  );

  console.log('✅ All /worker/device tests passed!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
