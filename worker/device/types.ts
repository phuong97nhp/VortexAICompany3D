export type DeviceDriverType = 'adb_usb' | 'adb_wifi' | 'emulator' | 'mock';
export type DeviceConnectionStatus = 'unauthorized' | 'device' | 'offline' | 'controlled' | 'error';
export type DeviceControlMode = 'view_only' | 'approved_actions' | 'policy_auto';

export interface DeviceDescriptor {
  id: string;
  serial: string;
  modelName: string;
  androidVersion: string;
  driverType: DeviceDriverType;
  status: DeviceConnectionStatus;
  controlMode: DeviceControlMode;
  assignedAgentId?: string;
  assignedDepartment?: string;
  batteryPercent: number;
  temperatureC: number;
  screenWidth: number;
  screenHeight: number;
  foregroundPackage: string;
  isStreaming: boolean;
  lastScreenshotDataUrl?: string;
  lastOcrTextMasked?: string;
  blockedReason?: string;
  lastSeenAt: number;
}

export interface DevicePolicy {
  allowedPackages: string[];
  blockedPackages: string[];
  maxActionsPerMinute: number;
  maxContinuousMinutes: number;
  maskPasswordAndOtpRegions: boolean;
  requireCeoForInstallApk: boolean;
  stopBatteryBelowPercent: number;
  stopTempAboveC: number;
}

export type DeviceCommandAction =
  | 'tap'
  | 'swipe'
  | 'input_text'
  | 'back'
  | 'home'
  | 'open_app'
  | 'screenshot'
  | 'ocr_read';

export interface DeviceCommandRequest {
  deviceId: string;
  agentId: string;
  action: DeviceCommandAction;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  text?: string;
  packageName?: string;
  ceoConfirmed?: boolean;
  policy?: DevicePolicy;
}

export interface DeviceActionAudit {
  id: string;
  deviceId: string;
  serial: string;
  agentId: string;
  action: string;
  foregroundPackage: string;
  result: 'ok' | 'blocked_policy' | 'blocked_killswitch' | 'blocked_mode' | 'ask_ceo_otp' | 'error';
  reason?: string;
  timestamp: number;
}

export interface DeviceCommandResult {
  ok: boolean;
  error?: string;
  askCeoOtp?: boolean;
  screenshotDataUrl?: string;
  ocrText?: string;
  device?: DeviceDescriptor;
  log?: DeviceActionAudit;
}

export interface DeviceDriver {
  readonly driverType: DeviceDriverType;
  listDevices(): Promise<DeviceDescriptor[]>;
  getForegroundPackage(serial: string): Promise<string>;
  getTelemetry(serial: string): Promise<{ batteryPercent: number; temperatureC: number }>;
  screenshot(serial: string): Promise<string | undefined>;
  readOcrText(serial: string): Promise<string>;
  tap(serial: string, x: number, y: number): Promise<void>;
  swipe(serial: string, x1: number, y1: number, x2: number, y2: number, durationMs?: number): Promise<void>;
  inputText(serial: string, text: string): Promise<void>;
  keyEvent(serial: string, keyCode: number): Promise<void>;
  openApp(serial: string, packageName: string): Promise<void>;
}
