import express from 'express';
import { findAdbBinary, getPlatformToolsDownloadInfo, pairAndConnectWirelessAdb } from './adbDiscovery.js';
import { DeviceCommandQueue } from './commandQueue.js';
import { AdbDeviceDriver, EmulatorDeviceDriver, MockDeviceDriver } from './drivers.js';
import { DeviceHotplugMonitor } from './hotplugMonitor.js';
import { evaluateDevicePolicyGate, maskSensitiveDeviceText } from './policyGate.js';
import { DeviceScreenStreamer } from './screenStream.js';
import {
  DeviceActionAudit,
  DeviceCommandRequest,
  DeviceCommandResult,
  DeviceControlMode,
  DeviceDescriptor,
  DeviceDriver,
} from './types.js';

export class DeviceFarmService {
  private adbPath: string | null = null;
  private drivers: DeviceDriver[] = [];
  private mockDriver = new MockDeviceDriver();
  private monitor!: DeviceHotplugMonitor;
  private queue = new DeviceCommandQueue();
  private streamer = new DeviceScreenStreamer();
  private deviceOverrides = new Map<string, Partial<DeviceDescriptor>>();
  private broadcastFn: (event: string, data: unknown) => void;

  constructor(broadcastFn: (event: string, data: unknown) => void) {
    this.broadcastFn = broadcastFn;
  }

  async init() {
    const adb = await findAdbBinary();
    this.adbPath = adb.adbPath;
    if (adb.found && adb.adbPath) {
      this.drivers = [new AdbDeviceDriver(adb.adbPath), new EmulatorDeviceDriver(adb.adbPath)];
    } else {
      this.drivers = [];
    }
    if (process.env.ENABLE_MOCK_DEVICE !== 'false') {
      this.drivers.push(this.mockDriver);
    }

    this.monitor = new DeviceHotplugMonitor(this.drivers);
    this.monitor.subscribe((evt) => {
      this.broadcastFn(`device:${evt.type}`, evt.device);
    });
    await this.monitor.scanOnce();
    this.monitor.start(2500);
  }

  private getDriverForDevice(dev: DeviceDescriptor): DeviceDriver {
    if (dev.driverType === 'mock') return this.mockDriver;
    return this.drivers.find((d) => d.driverType === dev.driverType) || this.drivers[0] || this.mockDriver;
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const raw = await this.monitor.scanOnce();
    return raw.map((d) => ({
      ...d,
      ...(this.deviceOverrides.get(d.id) || {}),
    }));
  }

  setDeviceMode(deviceId: string, controlMode: DeviceControlMode) {
    const cur = this.deviceOverrides.get(deviceId) || {};
    this.deviceOverrides.set(deviceId, { ...cur, controlMode });
  }

  assignAgent(deviceId: string, assignedAgentId?: string, assignedDepartment?: string) {
    const cur = this.deviceOverrides.get(deviceId) || {};
    this.deviceOverrides.set(deviceId, { ...cur, assignedAgentId, assignedDepartment });
  }

  async grabStopDevice(deviceId: string) {
    this.setDeviceMode(deviceId, 'view_only');
    this.streamer.stopStreaming(deviceId);
    this.queue.flushDevice(deviceId, 'CEO đã bấm Giành quyền — dừng ngay hàng đợi.');
  }

  triggerKillSwitch() {
    this.queue.setKillSwitch(true);
    this.streamer.stopAll();
    for (const id of this.deviceOverrides.keys()) {
      this.setDeviceMode(id, 'view_only');
    }
  }

  releaseKillSwitch() {
    this.queue.setKillSwitch(false);
  }

  async executeCommand(deviceId: string, req: Omit<DeviceCommandRequest, 'deviceId'>): Promise<DeviceCommandResult> {
    const devices = await this.listDevices();
    const device = devices.find((d) => d.id === deviceId);
    if (!device) {
      return { ok: false, error: 'Không tìm thấy thiết bị.' };
    }
    const driver = this.getDriverForDevice(device);

    return this.queue.enqueue(deviceId, async () => {
      const fg = await driver.getForegroundPackage(device.serial);
      const ocrRaw = await driver.readOcrText(device.serial);
      const ocrMasked = maskSensitiveDeviceText(ocrRaw);

      const gate = evaluateDevicePolicyGate({
        device,
        req: { ...req, deviceId },
        foregroundPackage: fg,
        ocrText: ocrRaw,
        killSwitchActive: this.queue.isKillSwitched(),
      });

      const now = Date.now();
      if (!gate.allowed) {
        const log: DeviceActionAudit = {
          id: `dlog_${now.toString(36)}`,
          deviceId,
          serial: device.serial,
          agentId: req.agentId,
          action: req.action,
          foregroundPackage: fg,
          result: gate.resultCode,
          reason: gate.reason,
          timestamp: now,
        };
        if (gate.resultCode === 'ask_ceo_otp') {
          this.broadcastFn('ask_ceo', {
            agentId: req.agentId,
            deviceId,
            question: `Thiết bị ${device.modelName} đang hiển thị yêu cầu OTP / CAPTCHA tại ${fg}. CEO vui lòng xác nhận trực tiếp trên máy.`,
          });
        }
        return { ok: false, error: gate.reason, askCeoOtp: gate.resultCode === 'ask_ceo_otp', log };
      }

      if (req.action === 'tap' && typeof req.x === 'number' && typeof req.y === 'number') {
        await driver.tap(device.serial, req.x, req.y);
      } else if (
        req.action === 'swipe' &&
        typeof req.x === 'number' &&
        typeof req.y === 'number' &&
        typeof req.x2 === 'number' &&
        typeof req.y2 === 'number'
      ) {
        await driver.swipe(device.serial, req.x, req.y, req.x2, req.y2);
      } else if (req.action === 'input_text' && req.text) {
        await driver.inputText(device.serial, req.text);
      } else if (req.action === 'back') {
        await driver.keyEvent(device.serial, 4);
      } else if (req.action === 'home') {
        await driver.keyEvent(device.serial, 3);
      } else if (req.action === 'open_app' && req.packageName) {
        await driver.openApp(device.serial, req.packageName);
      }

      const shot = await driver.screenshot(device.serial);
      const nextFg = await driver.getForegroundPackage(device.serial);
      const nextOcr = maskSensitiveDeviceText(await driver.readOcrText(device.serial));

      const updated: DeviceDescriptor = {
        ...device,
        foregroundPackage: nextFg,
        lastScreenshotDataUrl: shot || device.lastScreenshotDataUrl,
        lastOcrTextMasked: nextOcr || ocrMasked,
        lastSeenAt: Date.now(),
      };
      this.deviceOverrides.set(deviceId, {
        ...(this.deviceOverrides.get(deviceId) || {}),
        foregroundPackage: nextFg,
        lastScreenshotDataUrl: updated.lastScreenshotDataUrl,
        lastOcrTextMasked: updated.lastOcrTextMasked,
      });

      const log: DeviceActionAudit = {
        id: `dlog_${Date.now().toString(36)}`,
        deviceId,
        serial: device.serial,
        agentId: req.agentId,
        action: req.action,
        foregroundPackage: nextFg,
        result: 'ok',
        timestamp: Date.now(),
      };

      return {
        ok: true,
        screenshotDataUrl: updated.lastScreenshotDataUrl,
        ocrText: updated.lastOcrTextMasked,
        device: updated,
        log,
      };
    });
  }

  createRouter(): express.Router {
    const router = express.Router();

    router.get('/status', async (_req, res) => {
      const adb = await findAdbBinary();
      const devices = await this.listDevices();
      res.json({
        adbFound: adb.found,
        adbVersion: adb.version || null,
        adbPath: adb.adbPath,
        platformToolsDownload: getPlatformToolsDownloadInfo(),
        devices,
      });
    });

    router.get('/', async (_req, res) => {
      const devices = await this.listDevices();
      res.json({ devices });
    });

    router.post('/pair-wifi', async (req, res) => {
      if (!this.adbPath) {
        return res.json({
          ok: false,
          message: `Chưa cài ADB trên máy. ${getPlatformToolsDownloadInfo().hint}`,
        });
      }
      const { ipPort, pairingCode } = req.body as { ipPort: string; pairingCode?: string };
      const out = await pairAndConnectWirelessAdb(this.adbPath, ipPort || '', pairingCode);
      res.json(out);
    });

    router.post('/:id/mode', (req, res) => {
      const { mode } = req.body as { mode: DeviceControlMode };
      this.setDeviceMode(req.params.id, mode);
      res.json({ ok: true });
    });

    router.post('/:id/assign', (req, res) => {
      const { agentId, department } = req.body as { agentId?: string; department?: string };
      this.assignAgent(req.params.id, agentId, department);
      res.json({ ok: true });
    });

    router.post('/:id/stop', async (req, res) => {
      await this.grabStopDevice(req.params.id);
      res.json({ ok: true });
    });

    router.post('/killswitch', (_req, res) => {
      this.triggerKillSwitch();
      res.json({ ok: true });
    });

    router.post('/:id/command', async (req, res) => {
      try {
        const result = await this.executeCommand(req.params.id, req.body);
        res.json(result);
      } catch (err) {
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Device command failed' });
      }
    });

    return router;
  }
}
