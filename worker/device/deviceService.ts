import express from 'express';
import {
  findAdbBinary,
  getOsDriverTroubleshootingTips,
  getPlatformToolsDownloadInfo,
  installOfficialPlatformTools,
  pairAndConnectWirelessAdb,
} from './adbDiscovery.js';
import { DeviceCommandQueue } from './commandQueue.js';
import { AdbDeviceDriver, EmulatorDeviceDriver, MockDeviceDriver } from './drivers.js';
import { DeviceHotplugMonitor } from './hotplugMonitor.js';
import {
  computeHumanPacingDelayMs,
  DEFAULT_DEVICE_POLICY,
  evaluateDevicePolicyGate,
  maskSensitiveDeviceText,
} from './policyGate.js';
import { DeviceScreenStreamer } from './screenStream.js';
import {
  AdbDoctorReport,
  DeviceActionAudit,
  DeviceCommandRequest,
  DeviceCommandResult,
  DeviceControlMode,
  DeviceDescriptor,
  DeviceDriver,
  DevicePolicy,
  DeviceTaskCheckpoint,
  PlaybookRunResult,
  PlaybookStep,
} from './types.js';

export function suggestAgentForDevice(device: DeviceDescriptor): { agentId: string; department: string } {
  const pkgs = new Set([device.foregroundPackage, ...(device.installedPackages || [])].map((p) => p.toLowerCase()));
  if (pkgs.has('com.zing.zalo')) return { agentId: 'cskh_lead', department: 'cskh' };
  if (pkgs.has('com.ss.android.ugc.trill') || pkgs.has('com.shopee.vn')) return { agentId: 'aff_channel_mgr', department: 'affiliate' };
  if (pkgs.has('com.facebook.katana') || pkgs.has('com.facebook.orca')) return { agentId: 'mkt_social', department: 'marketing' };
  return { agentId: 'mkt_social', department: 'marketing' };
}

export class DeviceFarmService {
  private adbPath: string | null = null;
  private drivers: DeviceDriver[] = [];
  private mockDriver = new MockDeviceDriver();
  private monitor!: DeviceHotplugMonitor;
  private queue = new DeviceCommandQueue();
  private streamer = new DeviceScreenStreamer();
  private deviceOverrides = new Map<string, Partial<DeviceDescriptor>>();
  private activeTaskCheckpoints = new Map<string, DeviceTaskCheckpoint>();
  private pausedCheckpointsOnDisconnect = new Map<string, DeviceTaskCheckpoint>();
  private disconnectedSnapshots = new Map<string, DeviceDescriptor>();
  private auditLogs: DeviceActionAudit[] = [];
  private logRetentionDays = DEFAULT_DEVICE_POLICY.logRetentionDays || 14;
  private broadcastFn: (event: string, data: unknown) => void;

  constructor(broadcastFn: (event: string, data: unknown) => void) {
    this.broadcastFn = broadcastFn;
  }

  private buildDrivers(adbPath: string | null): DeviceDriver[] {
    const next: DeviceDriver[] = [];
    if (adbPath) {
      next.push(new AdbDeviceDriver(adbPath), new EmulatorDeviceDriver(adbPath));
    }
    if (process.env.ENABLE_MOCK_DEVICE !== 'false') {
      next.push(this.mockDriver);
    }
    return next;
  }

  async init() {
    const adb = await findAdbBinary();
    this.adbPath = adb.adbPath;
    this.drivers = this.buildDrivers(this.adbPath);

    this.monitor = new DeviceHotplugMonitor(this.drivers);
    this.monitor.subscribe((evt) => {
      if (evt.type === 'device_disconnected') {
        const ckpt = this.activeTaskCheckpoints.get(evt.device.id);
        const offlineDev: DeviceDescriptor = {
          ...evt.device,
          ...(this.deviceOverrides.get(evt.device.id) || {}),
          status: 'offline',
          isStreaming: false,
          pausedTask: ckpt
            ? {
                ...ckpt,
                pausedReason: 'Rút cáp USB / mất kết nối ADB — tiến độ đã được bảo lưu.',
                pausedAt: Date.now(),
              }
            : null,
        };
        if (ckpt) {
          this.pausedCheckpointsOnDisconnect.set(evt.device.id, offlineDev.pausedTask!);
        }
        this.disconnectedSnapshots.set(evt.device.id, offlineDev);
        this.queue.flushDevice(evt.device.id, 'Thiết bị vừa mất kết nối USB — tạm dừng và giữ nguyên tiến độ.');
        this.broadcastFn('device:disconnected', offlineDev);
        return;
      }

      if (evt.type === 'device_connected') {
        this.disconnectedSnapshots.delete(evt.device.id);
        const suggested = suggestAgentForDevice(evt.device);
        const curOv = this.deviceOverrides.get(evt.device.id) || {};
        this.deviceOverrides.set(evt.device.id, {
          ...curOv,
          suggestedAgentId: curOv.suggestedAgentId || suggested.agentId,
        });
        const pausedCkpt = this.pausedCheckpointsOnDisconnect.get(evt.device.id);
        if (pausedCkpt) {
          this.activeTaskCheckpoints.set(evt.device.id, { ...pausedCkpt, pausedReason: undefined, pausedAt: undefined });
          this.pausedCheckpointsOnDisconnect.delete(evt.device.id);
          this.broadcastFn('device:task_resumed', {
            deviceId: evt.device.id,
            checkpoint: pausedCkpt,
          });
        }
      }
      this.broadcastFn(`device:${evt.type}`, evt.device);
    });
    await this.monitor.scanOnce();
    this.monitor.start(2000, this.adbPath);
  }

  private appendAuditLog(log: DeviceActionAudit, retentionDays?: number) {
    if (retentionDays && retentionDays >= 7 && retentionDays <= 30) {
      this.logRetentionDays = retentionDays;
    }
    const cutoff = Date.now() - this.logRetentionDays * 24 * 60 * 60 * 1000;
    this.auditLogs = [log, ...this.auditLogs.filter((l) => l.timestamp >= cutoff)].slice(0, 400);
  }

  getAuditLogs(deviceId?: string): DeviceActionAudit[] {
    const cutoff = Date.now() - this.logRetentionDays * 24 * 60 * 60 * 1000;
    this.auditLogs = this.auditLogs.filter((l) => l.timestamp >= cutoff);
    return deviceId ? this.auditLogs.filter((l) => l.deviceId === deviceId) : this.auditLogs;
  }

  private getDriverForDevice(dev: DeviceDescriptor): DeviceDriver {
    if (dev.driverType === 'mock') return this.mockDriver;
    return this.drivers.find((d) => d.driverType === dev.driverType) || this.drivers[0] || this.mockDriver;
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const raw = await this.monitor.scanOnce();
    const onlineIds = new Set(raw.map((d) => d.id));
    const list = raw.map((d) => {
      const ov = this.deviceOverrides.get(d.id) || {};
      const suggested = d.suggestedAgentId || ov.suggestedAgentId || suggestAgentForDevice(d).agentId;
      return {
        ...d,
        ...ov,
        suggestedAgentId: suggested,
        pausedTask: this.activeTaskCheckpoints.get(d.id) || null,
      };
    });
    for (const [id, off] of this.disconnectedSnapshots.entries()) {
      if (!onlineIds.has(id)) {
        list.push(off);
      }
    }
    return list;
  }

  async runDoctor(): Promise<AdbDoctorReport> {
    const adb = await findAdbBinary();
    const devices = await this.listDevices();
    return {
      nodeVersion: process.version,
      os: process.platform,
      arch: process.arch,
      adbFound: adb.found,
      adbPath: adb.adbPath,
      adbVersion: adb.version || null,
      adbSource: adb.source,
      deviceCount: devices.length,
      devices: devices.map((d) => ({
        id: d.id,
        serial: d.serial,
        modelName: d.modelName,
        status: d.status,
        batteryPercent: d.batteryPercent,
        temperatureC: d.temperatureC,
        adbKeyboardInstalled: Boolean(d.adbKeyboardInstalled),
      })),
      troubleshootingTips: getOsDriverTroubleshootingTips(),
      platformToolsDownload: getPlatformToolsDownloadInfo(),
    };
  }

  setDeviceMode(deviceId: string, controlMode: DeviceControlMode) {
    const cur = this.deviceOverrides.get(deviceId) || {};
    this.deviceOverrides.set(deviceId, { ...cur, controlMode });
  }

  assignAgent(deviceId: string, assignedAgentId?: string, assignedDepartment?: string) {
    const cur = this.deviceOverrides.get(deviceId) || {};
    this.deviceOverrides.set(deviceId, { ...cur, assignedAgentId, assignedDepartment });
  }

  setTaskCheckpoint(deviceId: string, checkpoint: DeviceTaskCheckpoint | null) {
    if (checkpoint) {
      this.activeTaskCheckpoints.set(deviceId, checkpoint);
    } else {
      this.activeTaskCheckpoints.delete(deviceId);
      this.pausedCheckpointsOnDisconnect.delete(deviceId);
    }
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
      const beforeShot = (await driver.screenshot(device.serial)) || device.lastScreenshotDataUrl;
      const fg = await driver.getForegroundPackage(device.serial);
      const ocrRaw = await driver.readOcrText(device.serial);
      const ocrMasked = maskSensitiveDeviceText(ocrRaw);
      const screenLocked = driver.isScreenLocked ? await driver.isScreenLocked(device.serial) : false;

      const gate = evaluateDevicePolicyGate({
        device,
        req: { ...req, deviceId },
        foregroundPackage: fg,
        ocrText: ocrRaw,
        screenLocked,
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
          beforeScreenshotDataUrl: beforeShot,
          afterScreenshotDataUrl: beforeShot,
          timestamp: now,
        };
        this.appendAuditLog(log, req.policy?.logRetentionDays);
        if (gate.resultCode === 'ask_ceo_otp') {
          this.broadcastFn('ask_ceo', {
            agentId: req.agentId,
            deviceId,
            question: `Thiết bị ${device.modelName} tạm dừng tại ${fg}: ${gate.reason}`,
          });
        }
        return { ok: false, error: gate.reason, askCeoOtp: gate.resultCode === 'ask_ceo_otp', log };
      }

      const isReadOnly =
        req.action === 'screenshot' ||
        req.action === 'ocr_read' ||
        req.action === 'find_element' ||
        req.action === 'wait_for';

      if (!isReadOnly) {
        if ((req.policy?.keepAwakeWhileActive ?? DEFAULT_DEVICE_POLICY.keepAwakeWhileActive) && driver.keepAwake) {
          await driver.keepAwake(device.serial, true).catch(() => {});
        }
        const pacingMs = computeHumanPacingDelayMs(
          req.policy?.minActionDelayMs ?? DEFAULT_DEVICE_POLICY.minActionDelayMs ?? 650
        );
        if (pacingMs > 0) {
          await new Promise((r) => setTimeout(r, pacingMs));
        }
      }

      let matchedElement = null;
      let elements = undefined;
      let filePath = undefined;

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
      } else if (req.action === 'find_element' && driver.findElement) {
        elements = await driver.findElement(device.serial, req.query || '');
        matchedElement = elements[0] || null;
      } else if (req.action === 'wait_for' && driver.waitForElement) {
        matchedElement = await driver.waitForElement(device.serial, req.query || '', req.timeoutMs || 8000);
        if (!matchedElement) {
          return {
            ok: false,
            error: `Hết thời gian chờ phần tử "${req.query}" trên màn hình.`,
            matchedElement: null,
          };
        }
      } else if (req.action === 'install_apk' && driver.installApk && req.localPath) {
        await driver.installApk(device.serial, req.localPath);
      } else if (req.action === 'push_file' && driver.pushFile && req.localPath && req.remoteSubpath) {
        filePath = await driver.pushFile(device.serial, req.localPath, req.remoteSubpath);
      } else if (req.action === 'pull_file' && driver.pullFile && req.remoteSubpath && req.localPath) {
        filePath = await driver.pullFile(device.serial, req.remoteSubpath, req.localPath);
      }

      const afterShot = await driver.screenshot(device.serial);
      const nextFg = await driver.getForegroundPackage(device.serial);
      const nextOcr = maskSensitiveDeviceText(await driver.readOcrText(device.serial));

      const updated: DeviceDescriptor = {
        ...device,
        foregroundPackage: nextFg,
        lastScreenshotDataUrl: afterShot || beforeShot,
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
        beforeScreenshotDataUrl: beforeShot,
        afterScreenshotDataUrl: afterShot || beforeShot,
        timestamp: Date.now(),
      };
      this.appendAuditLog(log, req.policy?.logRetentionDays);

      return {
        ok: true,
        screenshotDataUrl: updated.lastScreenshotDataUrl,
        ocrText: updated.lastOcrTextMasked,
        elements,
        matchedElement,
        filePath,
        device: updated,
        log,
      };
    });
  }

  async executePlaybook(params: {
    deviceId: string;
    agentId: string;
    title: string;
    steps: PlaybookStep[];
    ceoConfirmed?: boolean;
    policy?: DevicePolicy;
  }): Promise<PlaybookRunResult> {
    const { deviceId, agentId, title, steps, ceoConfirmed, policy } = params;
    const stepResults: PlaybookRunResult['stepResults'] = [];
    const totalSteps = steps.length;

    for (let i = 0; i < totalSteps; i++) {
      const step = steps[i];
      const label = step.label || `${step.action}${step.packageName ? ` (${step.packageName})` : ''}`;
      this.setTaskCheckpoint(deviceId, {
        taskId: `pb_${Date.now().toString(36)}`,
        taskTitle: title,
        stepIndex: i + 1,
        totalSteps,
        stepLabel: label,
        progressPercent: Math.round(((i + 1) / Math.max(1, totalSteps)) * 100),
      });

      const res = await this.executeCommand(deviceId, {
        agentId,
        action: step.action,
        packageName: step.packageName,
        x: step.x,
        y: step.y,
        x2: step.x2,
        y2: step.y2,
        text: step.text,
        query: step.query,
        timeoutMs: step.timeoutMs,
        ceoConfirmed,
        policy,
      });

      if (!res.ok) {
        stepResults.push({ stepIndex: i + 1, label, ok: false, error: res.error });
        const isDisconnect = /offline|mất kết nối/i.test(res.error || '');
        if (!isDisconnect) {
          this.setTaskCheckpoint(deviceId, null);
        }
        return {
          ok: false,
          completedSteps: i,
          totalSteps,
          pausedForDisconnect: isDisconnect,
          askCeoOtp: res.askCeoOtp,
          error: res.error,
          stepResults,
        };
      }

      if (step.verifyText && res.ocrText && !res.ocrText.toLowerCase().includes(step.verifyText.toLowerCase())) {
        const err = `Bước ${i + 1} (${label}) không xác nhận được nội dung "${step.verifyText}" sau khi thao tác.`;
        stepResults.push({ stepIndex: i + 1, label, ok: false, error: err });
        return { ok: false, completedSteps: i, totalSteps, error: err, stepResults };
      }

      stepResults.push({ stepIndex: i + 1, label, ok: true });
    }

    this.setTaskCheckpoint(deviceId, null);
    return {
      ok: true,
      completedSteps: totalSteps,
      totalSteps,
      stepResults,
    };
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
        adbSource: adb.source || null,
        platformToolsDownload: getPlatformToolsDownloadInfo(),
        troubleshootingTips: getOsDriverTroubleshootingTips(),
        devices,
      });
    });

    router.get('/doctor', async (_req, res) => {
      res.json(await this.runDoctor());
    });

    router.post('/install-adb', async (req, res) => {
      const confirmDownload = Boolean(req.body?.confirmDownload);
      const out = await installOfficialPlatformTools({ confirmDownload });
      if (out.ok && out.adbPath) {
        this.adbPath = out.adbPath;
        this.drivers = this.buildDrivers(out.adbPath);
        this.monitor.updateDrivers(this.drivers);
        this.monitor.stop();
        this.monitor.start(2000, out.adbPath);
        await this.monitor.scanOnce();
      }
      res.json(out);
    });

    router.get('/logs', (req, res) => {
      const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
      res.json({ logs: this.getAuditLogs(deviceId) });
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

    router.post('/:id/task-checkpoint', (req, res) => {
      const { checkpoint } = req.body as { checkpoint: DeviceTaskCheckpoint | null };
      this.setTaskCheckpoint(req.params.id, checkpoint ?? null);
      res.json({ ok: true });
    });

    router.post('/:id/simulate-connection', async (req, res) => {
      const { connected } = req.body as { connected: boolean };
      const devices = await this.listDevices();
      const target = devices.find((d) => d.id === req.params.id);
      if (target?.driverType === 'mock') {
        this.mockDriver.setDisconnected(target.serial, !connected);
        await this.monitor.scanOnce();
      }
      res.json({ ok: true, devices: await this.listDevices() });
    });

    router.post('/:id/stop', async (req, res) => {
      await this.grabStopDevice(req.params.id);
      res.json({ ok: true });
    });

    router.post('/killswitch', (_req, res) => {
      this.triggerKillSwitch();
      res.json({ ok: true });
    });

    router.post('/:id/find-element', async (req, res) => {
      const { agentId = 'ceo', query = '' } = req.body || {};
      res.json(await this.executeCommand(req.params.id, { agentId, action: 'find_element', query }));
    });

    router.post('/:id/wait-for', async (req, res) => {
      const { agentId = 'ceo', query = '', timeoutMs = 8000 } = req.body || {};
      res.json(await this.executeCommand(req.params.id, { agentId, action: 'wait_for', query, timeoutMs }));
    });

    router.post('/:id/file', async (req, res) => {
      const { agentId = 'ceo', direction = 'push', localPath = '', remoteSubpath = '' } = req.body || {};
      const action = direction === 'pull' ? 'pull_file' : 'push_file';
      res.json(await this.executeCommand(req.params.id, { agentId, action, localPath, remoteSubpath }));
    });

    router.post('/:id/install-apk', async (req, res) => {
      const { agentId = 'ceo', localPath = '', ceoConfirmed = false } = req.body || {};
      res.json(await this.executeCommand(req.params.id, { agentId, action: 'install_apk', localPath, ceoConfirmed }));
    });

    router.post('/:id/playbook', async (req, res) => {
      const { agentId = 'ceo', title = 'Playbook Mobile', steps = [], ceoConfirmed = false, policy } = req.body || {};
      res.json(await this.executePlaybook({ deviceId: req.params.id, agentId, title, steps, ceoConfirmed, policy }));
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
