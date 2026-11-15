import { useEffect, useState } from 'react';
import {
  Battery,
  ChevronDown,
  ChevronUp,
  Hand,
  Home,
  Lock,
  MonitorSmartphone,
  OctagonAlert,
  Play,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Square,
  Thermometer,
  Wifi,
} from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { DeviceControlMode } from '../../types';

interface AdbStatusPayload {
  adbFound: boolean;
  adbVersion: string | null;
  adbPath: string | null;
  platformToolsDownload?: { url: string; hint: string };
}

export function DeviceFarmPanel() {
  const managedDevices = useCompanyStore((s) => s.managedDevices);
  const devicePolicy = useCompanyStore((s) => s.devicePolicy);
  const deviceLogs = useCompanyStore((s) => s.deviceLogs);
  const agents = useCompanyStore((s) => s.agents);

  const refreshDevices = useCompanyStore((s) => s.refreshDevices);
  const connectWirelessDevice = useCompanyStore((s) => s.connectWirelessDevice);
  const setDeviceControlMode = useCompanyStore((s) => s.setDeviceControlMode);
  const assignDeviceToAgent = useCompanyStore((s) => s.assignDeviceToAgent);
  const toggleDeviceStream = useCompanyStore((s) => s.toggleDeviceStream);
  const executeDeviceCommand = useCompanyStore((s) => s.executeDeviceCommand);
  const grabDeviceControlStop = useCompanyStore((s) => s.grabDeviceControlStop);
  const updateDevicePolicy = useCompanyStore((s) => s.updateDevicePolicy);

  const [adbStatus, setAdbStatus] = useState<AdbStatusPayload | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(managedDevices[0]?.id || 'dev_mock_pixel7');
  const [showGuide, setShowGuide] = useState(false);

  // Wireless ADB form
  const [wifiIpPort, setWifiIpPort] = useState('');
  const [wifiPairCode, setWifiPairCode] = useState('');
  const [wifiMsg, setWifiMsg] = useState<string | null>(null);

  // Command test bar
  const [cmdText, setCmdText] = useState('');
  const [cmdPkg, setCmdPkg] = useState('com.zing.zalo');
  const [cmdResult, setCmdResult] = useState<string | null>(null);
  const [newAllowedPkg, setNewAllowedPkg] = useState('');

  const loadStatus = async () => {
    try {
      const r = await fetch('/api/devices/status');
      if (r.ok) {
        const d = (await r.json()) as AdbStatusPayload;
        setAdbStatus(d);
      }
    } catch {
      // keep silent fallback
    }
    await refreshDevices();
  };

  useEffect(() => {
    loadStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeDevice =
    managedDevices.find((d) => d.id === selectedDeviceId) || managedDevices[0];

  const activeAgents = agents.filter((a) => a.employmentStatus === 'active');

  const handleWifiPair = async () => {
    if (!wifiIpPort.trim()) return;
    const res = await connectWirelessDevice(wifiIpPort.trim(), wifiPairCode.trim() || undefined);
    setWifiMsg(res.message);
  };

  const runCmd = async (
    action: 'tap' | 'swipe' | 'input_text' | 'back' | 'home' | 'open_app' | 'screenshot' | 'ocr_read'
  ) => {
    if (!activeDevice) return;
    const res = await executeDeviceCommand({
      deviceId: activeDevice.id,
      agentId: activeDevice.assignedAgentId || 'ceo',
      action,
      x: 540,
      y: 1200,
      text: action === 'input_text' ? cmdText || 'Xin chào quý khách' : undefined,
      packageName: action === 'open_app' ? cmdPkg : undefined,
      ceoConfirmed: true,
    });
    setCmdResult(res.ok ? `Thành công (${action})` : res.error || 'Bị chặn bởi chính sách');
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto text-xs">
      {/* 1. ADB Status & Discovery */}
      <section className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-bold text-sm flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-500" />
            <span>Thiết bị Android (Cắm là chạy · ADB Farm)</span>
          </div>
          <button
            type="button"
            onClick={loadStatus}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Quét thiết bị</span>
          </button>
        </div>

        <div
          className={`p-2 rounded-lg border text-[11px] ${
            adbStatus?.adbFound
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          {adbStatus?.adbFound ? (
            <span>
              ADB Sẵn sàng: <strong className="font-mono-num">{adbStatus.adbVersion}</strong> ({adbStatus.adbPath})
            </span>
          ) : (
            <span>
              {adbStatus?.platformToolsDownload?.hint ||
                'Chưa phát hiện ADB trên máy chủ Preview — đang dùng MockDeviceDriver (chế độ an toàn) để kiểm thử toàn bộ quy trình.'}
            </span>
          )}
        </div>

        {/* Device List */}
        <div className="space-y-1.5">
          {managedDevices.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDeviceId(d.id)}
              className={`w-full text-left p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer ${
                activeDevice?.id === d.id
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold truncate">
                  {d.modelName} <span className="font-normal text-slate-500">· {d.driverType}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono-num truncate">
                  {d.serial} · {d.androidVersion} · {d.screenWidth}x{d.screenHeight} · App: {d.foregroundPackage}
                </div>
              </div>
              <div className="text-right font-mono-num text-[11px] shrink-0">
                <div className="flex items-center gap-2 justify-end">
                  <span className="flex items-center gap-0.5">
                    <Battery className="w-3 h-3 text-emerald-500" />
                    {d.batteryPercent}%
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Thermometer className="w-3 h-3 text-amber-500" />
                    {d.temperatureC}°C
                  </span>
                </div>
                <div className={d.status === 'unauthorized' ? 'text-amber-500 font-semibold' : 'text-emerald-500'}>
                  {d.status === 'unauthorized' ? 'Chờ bấm Cho phép trên ĐT' : d.controlMode}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Wireless ADB Pair */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-sky-500" />
            <span>Ghép đôi Không dây Wi-Fi (Android 11+)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <input
              value={wifiIpPort}
              onChange={(e) => setWifiIpPort(e.target.value)}
              placeholder="IP:Port (vd: 192.168.1.25:37891)"
              className="flex-1 min-w-[140px] px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
            />
            <input
              value={wifiPairCode}
              onChange={(e) => setWifiPairCode(e.target.value)}
              placeholder="Mã ghép đôi 6 số"
              className="w-32 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
            />
            <button
              type="button"
              onClick={handleWifiPair}
              className="px-3 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer"
            >
              Kết nối Wi-Fi
            </button>
          </div>
          {wifiMsg && <div className="text-[11px] text-amber-500">{wifiMsg}</div>}
        </div>

        {/* Collapsible Android Phone Setup Guide */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 cursor-pointer"
          >
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>Hướng dẫn bật USB Debugging trên điện thoại Android (5 bước)</span>
          </button>
          {showGuide && (
            <ol className="mt-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-decimal list-inside">
              <li>Mở <strong>Cài đặt → Giới thiệu điện thoại</strong>, chạm 7 lần vào <strong>Số bản dựng (Build number)</strong> để bật Tùy chọn nhà phát triển.</li>
              <li>Vào <strong>Tùy chọn nhà phát triển</strong> → bật <strong>Gỡ lỗi USB (USB Debugging)</strong> (và <em>USB Debugging (Security settings)</em> nếu máy Xiaomi/OPPO/Realme).</li>
              <li>Cắm cáp USB dữ liệu vào máy tính chạy <code className="font-mono">/worker</code> (hoặc bật <strong>Gỡ lỗi không dây</strong> trên Android 11+).</li>
              <li>Mở khóa màn hình điện thoại và bấm <strong>"Luôn cho phép từ máy tính này" (Always allow)</strong> khi popup RSA hiện lên.</li>
              <li>Chạy <code className="font-mono">npm run device:doctor</code> trong thư mục <code className="font-mono">/worker</code> để kiểm tra (khuyên dùng thêm ADBKeyboard nếu nhập tiếng Việt có dấu).</li>
            </ol>
          )}
        </div>
      </section>

      {/* 2. Control Mode, Live Screen & Emergency Stop */}
      {activeDevice && (
        <section className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold flex items-center gap-1.5">
              <MonitorSmartphone className="w-4 h-4 text-emerald-500" />
              <span>Điều khiển & Màn hình Trực tiếp · {activeDevice.modelName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  const nextConn = activeDevice.status === 'offline';
                  await fetch(`/api/devices/${encodeURIComponent(activeDevice.id)}/simulate-connection`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ connected: nextConn }),
                  });
                  await refreshDevices();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium cursor-pointer"
                title="Kiểm thử kịch bản rút cáp USB giữa chừng & cắm lại"
              >
                {activeDevice.status === 'offline' ? 'Cắm lại cáp USB' : 'Test rút cáp USB'}
              </button>
              <button
                type="button"
                onClick={() => grabDeviceControlStop(activeDevice.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold whitespace-nowrap cursor-pointer"
              >
                <OctagonAlert className="w-3.5 h-3.5" />
                <span>Giành quyền / DỪNG</span>
              </button>
            </div>
          </div>

          {activeDevice.pausedTask && (
            <div
              className={`p-2 rounded-lg border text-[11px] ${
                activeDevice.status === 'offline'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <div className="font-semibold">
                {activeDevice.status === 'offline'
                  ? 'Mất kết nối USB — Đang bảo lưu tiến độ chờ cắm lại'
                  : 'Đã kết nối lại — Tự động khôi phục tác vụ'}
                : {activeDevice.pausedTask.taskTitle} ({activeDevice.pausedTask.progressPercent}%)
              </div>
              <div>
                Bước {activeDevice.pausedTask.stepIndex}/{activeDevice.pausedTask.totalSteps}:{' '}
                {activeDevice.pausedTask.stepLabel}
                {activeDevice.pausedTask.pausedReason ? ` · ${activeDevice.pausedTask.pausedReason}` : ''}
              </div>
            </div>
          )}

          {/* 3-Tier Control Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {(
              [
                { id: 'view_only', label: '1. CHỈ XEM (Mặc định)', desc: 'Cấm AI chạm/nhập' },
                { id: 'approved_actions', label: '2. CÓ DUYỆT CEO', desc: 'Từng thao tác xin CEO' },
                { id: 'policy_auto', label: '3. TỰ CHỦ THEO LUẬT', desc: 'Chỉ app Allowlist' },
              ] as Array<{ id: DeviceControlMode; label: string; desc: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setDeviceControlMode(activeDevice.id, m.id)}
                className={`p-2 rounded-lg border text-left cursor-pointer ${
                  activeDevice.controlMode === m.id
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                }`}
              >
                <div className="font-semibold text-[11px]">{m.label}</div>
                <div className="text-[10px] text-slate-500">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Assign to Agent & Stream Toggle */}
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <label className="block text-[10.5px] text-slate-500 mb-0.5">Giao máy cho Agent</label>
              <select
                value={activeDevice.assignedAgentId || ''}
                onChange={(e) => assignDeviceToAgent(activeDevice.id, e.target.value || undefined)}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <option value="">-- Chưa giao cho ai --</option>
                {activeAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.department})
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-4 flex gap-1.5">
              <button
                type="button"
                onClick={() => toggleDeviceStream(activeDevice.id, !activeDevice.isStreaming)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  activeDevice.isStreaming ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'
                }`}
              >
                {activeDevice.isStreaming ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{activeDevice.isStreaming ? 'Tắt luồng' : 'Xem màn hình'}</span>
              </button>
            </div>
          </div>

          {/* Live Screen Preview + Interactive Command Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            <div className="sm:col-span-5 flex flex-col items-center">
              {activeDevice.lastScreenshotDataUrl ? (
                <img
                  src={activeDevice.lastScreenshotDataUrl}
                  alt="Màn hình điện thoại Android"
                  className="w-44 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 shadow"
                />
              ) : (
                <div className="w-44 h-72 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 text-center p-3">
                  Bấm "Xem màn hình" để chụp khung hình
                </div>
              )}
            </div>

            <div className="sm:col-span-7 space-y-2">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                <div className="text-slate-500 mb-0.5">OCR Đọc màn hình (đã che OTP/Mật khẩu):</div>
                <div className="font-mono-num">{activeDevice.lastOcrTextMasked || 'Chưa đọc OCR'}</div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => runCmd('screenshot')}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Chụp ảnh
                </button>
                <button
                  type="button"
                  onClick={() => runCmd('tap')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Hand className="w-3 h-3" />
                  <span>Chạm giữa</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCmd('home')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Home className="w-3 h-3" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCmd('back')}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Back
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  value={cmdText}
                  onChange={(e) => setCmdText(e.target.value)}
                  placeholder="Nhập chữ gửi xuống điện thoại..."
                  className="flex-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={() => runCmd('input_text')}
                  className="px-2.5 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Gửi chữ
                </button>
              </div>

              <div className="flex gap-1.5">
                <select
                  value={cmdPkg}
                  onChange={(e) => setCmdPkg(e.target.value)}
                  className="flex-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                >
                  {devicePolicy.allowedPackages.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="com.vietcombank">com.vietcombank (Test chặn ngân hàng)</option>
                  <option value="com.x8bit.bitwarden">com.x8bit.bitwarden (Test chặn Password Manager)</option>
                </select>
                <button
                  type="button"
                  onClick={() => runCmd('open_app')}
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
                >
                  Mở App
                </button>
              </div>

              {cmdResult && <div className="text-[11px] font-medium text-sky-500">{cmdResult}</div>}
            </div>
          </div>
        </section>
      )}

      {/* 3. Policy Allowlist/Blocklist & Before/After Audit Logs */}
      <section className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="font-semibold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-rose-500" />
          <span>Chính sách App & Nhật ký Thao tác (Ảnh Trước / Sau)</span>
        </div>
        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Cấm cứng: Ngân hàng (VCB/TCB/MB), Ví (MoMo/ZaloPay), Trình quản lý mật khẩu (Bitwarden/1Password), 2FA Authenticator, Cài đặt hệ thống, Ảnh & Danh bạ.
          </span>
        </div>

        <div className="flex gap-1.5">
          <input
            value={newAllowedPkg}
            onChange={(e) => setNewAllowedPkg(e.target.value)}
            placeholder="Thêm package ID vào Allowlist..."
            className="flex-1 px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
          />
          <button
            type="button"
            onClick={() => {
              const p = newAllowedPkg.trim();
              if (!p || devicePolicy.blockedPackages.includes(p)) return;
              updateDevicePolicy({ allowedPackages: Array.from(new Set([...devicePolicy.allowedPackages, p])) });
              setNewAllowedPkg('');
            }}
            className="px-2.5 py-1 rounded bg-sky-600 text-white font-semibold cursor-pointer"
          >
            Thêm Allowlist
          </button>
        </div>

        <div className="max-h-52 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
          {deviceLogs.length === 0 ? (
            <div className="py-2 text-slate-500">Chưa có nhật ký thao tác thiết bị.</div>
          ) : (
            deviceLogs.slice(0, 15).map((l) => (
              <div key={l.id} className="py-1.5 space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono-num">
                    [{l.agentId}] {l.action} ({l.foregroundPackage})
                  </span>
                  <span
                    className={`font-mono-num shrink-0 ${
                      l.result === 'ok' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {l.result}
                  </span>
                </div>
                {(l.beforeScreenshotDataUrl || l.afterScreenshotDataUrl) && (
                  <div className="flex items-center gap-2 pl-2">
                    {l.beforeScreenshotDataUrl && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>Trước:</span>
                        <img
                          src={l.beforeScreenshotDataUrl}
                          alt="Trước"
                          className="w-7 h-12 rounded border border-slate-300 dark:border-slate-700 object-cover"
                        />
                      </div>
                    )}
                    {l.afterScreenshotDataUrl && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>Sau:</span>
                        <img
                          src={l.afterScreenshotDataUrl}
                          alt="Sau"
                          className="w-7 h-12 rounded border border-slate-300 dark:border-slate-700 object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
