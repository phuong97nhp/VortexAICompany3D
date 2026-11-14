import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  KeyRound,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
} from 'lucide-react';
import { PRODUCTS } from '../../config/products';
import { listLocalModels, ROUTING_PRESET_LABELS, testLocalConnection } from '../../engine/llm';
import { useCompanyStore } from '../../store/useCompanyStore';
import { GraphicsQuality, ProviderId, RoutingPresetId } from '../../types';

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: 'Google Gemini (Mặc định AI Studio)',
  deepseek: 'DeepSeek (Chat + Reasoner)',
  local: 'Local Server (Ollama / LM Studio)',
  mock: 'Chế độ Mô phỏng (Không cần key)',
};

export function SettingsPanel() {
  const settings = useCompanyStore((s) => s.settings);
  const updateSettings = useCompanyStore((s) => s.updateSettings);
  const applyRoutingPreset = useCompanyStore((s) => s.applyRoutingPreset);
  const updateRoleRoute = useCompanyStore((s) => s.updateRoleRoute);
  const serverHealth = useCompanyStore((s) => s.serverHealth);
  const zaloSimulatorLog = useCompanyStore((s) => s.zaloSimulatorLog);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const answerAskCeo = useCompanyStore((s) => s.answerAskCeo);
  const changeCeoPassword = useCompanyStore((s) => s.changeCeoPassword);
  const resetDatabase = useCompanyStore((s) => s.resetDatabase);
  const show3dDiagnostics = useCompanyStore((s) => s.show3dDiagnostics);
  const toggle3dDiagnostics = useCompanyStore((s) => s.toggle3dDiagnostics);

  const [geminiKeyDraft, setGeminiKeyDraft] = useState(settings.geminiApiKey);
  const [deepseekKeyDraft, setDeepseekKeyDraft] = useState(settings.deepseekApiKey);
  const [localTestStatus, setLocalTestStatus] = useState<{
    loading: boolean;
    ok?: boolean;
    message?: string;
    corsHint?: string;
    models?: string[];
  }>({ loading: false });

  const [zaloReplyInput, setZaloReplyInput] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const pendingQ = askCeoQuestions.find((q) => q.status === 'pending' || q.status === 'reminded');

  const handleSaveKeys = async () => {
    await updateSettings({
      geminiApiKey: geminiKeyDraft.trim(),
      deepseekApiKey: deepseekKeyDraft.trim(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const runLocalDiagnostic = async (mode: 'test' | 'list') => {
    setLocalTestStatus({ loading: true });
    const cfg = {
      baseUrl: settings.localBaseUrl,
      model: settings.localModel,
      apiKey: settings.localApiKey,
      useWorkerProxy: settings.localUseWorkerProxy,
      hasExpressProxy: serverHealth?.mode === 'proxy',
    };
    const res = mode === 'test' ? await testLocalConnection(cfg) : await listLocalModels(cfg);
    setLocalTestStatus({
      loading: false,
      ok: res.ok,
      message: res.message,
      corsHint: res.corsHint,
      models: res.models,
    });
  };

  const handleZaloSimReply = async () => {
    const raw = zaloReplyInput.trim();
    if (!raw) return;
    setZaloReplyInput('');

    const match = raw.match(/#(CEO-\d+)/i);
    const targetId = match ? match[1].toUpperCase() : pendingQ?.id;
    const cleanText = raw.replace(/#CEO-\d+/i, '').trim() || raw;

    if (targetId) {
      await answerAskCeo(targetId, cleanText, 'zalo_sim');
    } else {
      useCompanyStore.getState().pushZaloSimMessage('out', raw);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto text-xs">
      {/* 1. Multi-Provider AI Brain */}
      <section className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 font-bold text-sm">
          <Cpu className="w-4 h-4 text-sky-500" />
          <span>1. Bộ não AI (Đa nhà cung cấp)</span>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-[11px] space-y-1">
          <div>
            Trạng thái môi trường:{' '}
            <strong className="text-sky-500">
              {serverHealth?.mode === 'proxy' ? 'Express Server Proxy (An toàn)' : 'Trình duyệt thuần'}
            </strong>
          </div>
          <div className="flex flex-wrap gap-2 text-[10.5px]">
            <span className={serverHealth?.hasGeminiEnvKey ? 'text-emerald-500' : 'text-slate-400'}>
              ● GEMINI_API_KEY env: {serverHealth?.hasGeminiEnvKey ? 'Có sẵn từ AI Studio' : 'Chưa đặt'}
            </span>
            <span className={serverHealth?.hasDeepSeekEnvKey ? 'text-emerald-500' : 'text-slate-400'}>
              ● DEEPSEEK_API_KEY env: {serverHealth?.hasDeepSeekEnvKey ? 'Có sẵn' : 'Chưa đặt'}
            </span>
          </div>
        </div>

        {/* Primary & Fallback Provider */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Provider chính</label>
            <select
              value={settings.primaryProvider}
              onChange={(e) => updateSettings({ primaryProvider: e.target.value as ProviderId })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Dự phòng tự động (Failover)</label>
            <select
              value={settings.fallbackProvider}
              onChange={(e) => updateSettings({ fallbackProvider: e.target.value as ProviderId })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gemini & DeepSeek Keys */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Gemini API Key thủ công (chỉ cần nhập nếu server chưa có GEMINI_API_KEY)
            </label>
            <input
              type="password"
              value={geminiKeyDraft}
              onChange={(e) => setGeminiKeyDraft(e.target.value)}
              placeholder={serverHealth?.hasGeminiEnvKey ? 'Đã có GEMINI_API_KEY từ hệ thống' : 'AIza...'}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 font-mono-num"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">DeepSeek API Key</label>
              <input
                type="password"
                value={deepseekKeyDraft}
                onChange={(e) => setDeepseekKeyDraft(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Chế độ DeepSeek</label>
              <select
                value={settings.deepseekMode}
                onChange={(e) => updateSettings({ deepseekMode: e.target.value as 'proxy' | 'direct' })}
                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
              >
                <option value="proxy">Server Proxy</option>
                <option value="direct">Trực tiếp</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[10.5px] text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Key nhập tay lưu localStorage chỉ dùng cá nhân.</span>
            </span>
            <button
              type="button"
              onClick={handleSaveKeys}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedNotice ? 'Đã lưu' : 'Lưu Key'}</span>
            </button>
          </div>
        </div>

        {/* Local OpenAI-Compatible Server (Ollama / LM Studio / llama.cpp) */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              <span>Local AI Server (Ollama / LM Studio / llama.cpp)</span>
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => updateSettings({ localBaseUrl: 'http://localhost:11434/v1' })}
                className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] cursor-pointer"
              >
                Ollama
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ localBaseUrl: 'http://localhost:1234/v1' })}
                className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] cursor-pointer"
              >
                LM Studio
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-0.5">Base URL (OpenAI v1)</label>
              <input
                type="text"
                value={settings.localBaseUrl}
                onChange={(e) => updateSettings({ localBaseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-0.5">Tên Model</label>
              <input
                type="text"
                value={settings.localModel}
                onChange={(e) => updateSettings({ localModel: e.target.value })}
                placeholder="qwen2.5:7b"
                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 items-center">
            <input
              type="password"
              value={settings.localApiKey}
              onChange={(e) => updateSettings({ localApiKey: e.target.value })}
              placeholder="API Key (tuỳ chọn)"
              className="rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
            />
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.localUseWorkerProxy}
                onChange={(e) => updateSettings({ localUseWorkerProxy: e.target.checked })}
                className="accent-sky-600"
              />
              <span>Đi qua Proxy Express (/worker)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={localTestStatus.loading}
              onClick={() => runLocalDiagnostic('test')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{localTestStatus.loading ? 'Đang thử...' : 'Kiểm tra kết nối'}</span>
            </button>
            <button
              type="button"
              disabled={localTestStatus.loading}
              onClick={() => runLocalDiagnostic('list')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Liệt kê model (/models)</span>
            </button>
          </div>

          {localTestStatus.message && (
            <div
              className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                localTestStatus.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="font-semibold">{localTestStatus.message}</div>
              {localTestStatus.corsHint && <div className="text-amber-300">{localTestStatus.corsHint}</div>}
              {localTestStatus.models && localTestStatus.models.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {localTestStatus.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateSettings({ localModel: m })}
                      className="px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-sky-500/30 text-[10px] cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10.5px] text-amber-600 dark:text-amber-300 space-y-0.5">
            <div>
              • <strong>Lỗi CORS với Ollama:</strong> đặt <code className="font-mono">OLLAMA_ORIGINS=*</code> trước khi mở Ollama.
            </div>
            <div>
              • <strong>Trang HTTPS gọi http://localhost:</strong> Trình duyệt có thể chặn Mixed Content khi xem trên AI Studio. Hãy tải zip về chạy <code className="font-mono">npm run dev</code> hoặc bật Proxy qua <code className="font-mono">/worker</code>.
            </div>
          </div>
        </div>

        {/* Role Routing Table + 4 Presets */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Định tuyến theo vai trò & Preset</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(ROUTING_PRESET_LABELS) as RoutingPresetId[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyRoutingPreset(preset)}
                className={`px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium cursor-pointer ${
                  settings.routingPreset === preset
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {ROUTING_PRESET_LABELS[preset]}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {settings.roleRoutes.map((route) => (
              <div
                key={route.group}
                className="grid grid-cols-12 gap-1.5 items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5"
              >
                <div className="col-span-5 text-[10.5px] font-medium truncate" title={route.label}>
                  {route.label}
                </div>
                <select
                  value={route.provider}
                  onChange={(e) => {
                    const prov = e.target.value as ProviderId;
                    const defaultModel =
                      prov === 'gemini'
                        ? route.group === 'leadership'
                          ? 'gemini-2.5-pro'
                          : 'gemini-2.5-flash'
                        : prov === 'deepseek'
                        ? 'deepseek-chat'
                        : prov === 'local'
                        ? settings.localModel || 'qwen2.5:7b'
                        : 'mock-vn';
                    updateRoleRoute(route.group, { provider: prov, model: defaultModel });
                  }}
                  className="col-span-3 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1 py-0.5 text-[10.5px]"
                >
                  <option value="gemini">Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="local">Local</option>
                  <option value="mock">Mock</option>
                </select>
                <input
                  type="text"
                  value={route.model}
                  onChange={(e) => updateRoleRoute(route.group, { model: e.target.value })}
                  className="col-span-4 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-[10.5px] font-mono-num"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Per-Provider Daily Token Budgets */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {(['gemini', 'deepseek', 'local'] as const).map((p) => (
            <div key={p}>
              <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Budget {p}/ngày</label>
              <input
                type="number"
                value={settings.providerBudgets?.[p] ?? 500000}
                onChange={(e) =>
                  updateSettings({
                    providerBudgets: {
                      ...settings.providerBudgets,
                      [p]: Number(e.target.value) || 100000,
                    },
                  })
                }
                className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
              />
            </div>
          ))}
        </div>

        <label className="flex items-center justify-between pt-1 cursor-pointer">
          <span>
            <strong>Chế độ DRY_RUN (Mô phỏng gửi tin & Playwright)</strong>
            <span className="block text-[11px] text-slate-400">Bật mặc định để an toàn khi thử nghiệm.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.dryRun}
            onChange={(e) => updateSettings({ dryRun: e.target.checked })}
            className="w-4 h-4 accent-sky-600"
          />
        </label>
      </section>

      {/* Zalo Giả lập Simulator */}
      <section className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-sky-500/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-1.5 text-sky-500">
            <MessageCircle className="w-4 h-4" />
            <span>Khung Zalo Giả lập (Thử luồng Hỏi CEO)</span>
          </div>
          {pendingQ && (
            <span className="text-[11px] text-rose-500 font-semibold">Đang chờ trả lời #{pendingQ.id}</span>
          )}
        </div>

        <div className="h-36 overflow-y-auto rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 space-y-1.5">
          {zaloSimulatorLog.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded-lg text-[11px] whitespace-pre-wrap ${
                item.direction === 'out'
                  ? 'bg-sky-600 text-white ml-8'
                  : 'bg-slate-100 dark:bg-slate-900 mr-8 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={zaloReplyInput}
            onChange={(e) => setZaloReplyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleZaloSimReply()}
            placeholder={
              pendingQ ? `Gõ trả lời cho #${pendingQ.id} (vd: 1 hoặc Đồng ý)...` : 'Nhắn thử tin từ Zalo CEO...'
            }
            className="flex-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
          />
          <button
            type="button"
            onClick={handleZaloSimReply}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
          >
            Gửi từ Zalo
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <label className="block text-[10px] text-slate-400">Giới hạn tin/giờ</label>
            <input
              type="number"
              value={settings.zaloMaxMessagesPerHour}
              onChange={(e) => updateSettings({ zaloMaxMessagesPerHour: Number(e.target.value) || 6 })}
              className="w-full rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400">DND từ giờ</label>
            <input
              type="number"
              value={settings.zaloDndStartHour}
              onChange={(e) => updateSettings({ zaloDndStartHour: Number(e.target.value) || 22 })}
              className="w-full rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400">Nhắc quá hạn (giờ)</label>
            <input
              type="number"
              value={settings.zaloOverdueHours}
              onChange={(e) => updateSettings({ zaloOverdueHours: Number(e.target.value) || 2 })}
              className="w-full rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
            />
          </div>
        </div>
      </section>

      {/* Autopilot & SDR Guardrails */}
      <section className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="font-bold text-sm">2. Cấu hình Sales Autopilot & Hạn mức SDR</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Sản phẩm ưu tiên #1</label>
            <select
              value={settings.priorityProductId}
              onChange={(e) => updateSettings({ priorityProductId: e.target.value })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Chu kỳ Autopilot (phút)</label>
            <input
              type="number"
              value={settings.autopilotIntervalMinutes}
              onChange={(e) => updateSettings({ autopilotIntervalMinutes: Number(e.target.value) || 30 })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Hạn mức Email / ngày</label>
            <input
              type="number"
              value={settings.sdrDailyLimitEmail}
              onChange={(e) => updateSettings({ sdrDailyLimitEmail: Number(e.target.value) || 30 })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Hạn mức Zalo/FB / ngày</label>
            <input
              type="number"
              value={settings.sdrDailyLimitOther}
              onChange={(e) => updateSettings({ sdrDailyLimitOther: Number(e.target.value) || 20 })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Nhịp bài MXH / tuần (Tuần 1: 3)</label>
            <input
              type="number"
              value={settings.marketingPostsPerWeek}
              onChange={(e) => updateSettings({ marketingPostsPerWeek: Math.max(1, Number(e.target.value) || 3) })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono-num"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Trần bài MXH / ngày</label>
            <input
              type="number"
              value={settings.marketingDailyPostCap}
              onChange={(e) => updateSettings({ marketingDailyPostCap: Math.max(1, Number(e.target.value) || 2) })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono-num"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1">Ngân sách Ads tối đa / ngày (VNĐ)</label>
            <input
              type="number"
              value={settings.marketingDailyAdBudgetVnd}
              onChange={(e) => updateSettings({ marketingDailyAdBudgetVnd: Number(e.target.value) || 500000 })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 font-mono-num"
            />
          </div>
        </div>
      </section>

      {/* Graphics & CEO Password Security */}
      <section className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="font-bold text-sm">3. Đồ họa 3D & Bảo mật tài khoản CEO</div>
        <div className="flex items-center justify-between">
          <span>Chất lượng render 3D</span>
          <select
            value={settings.graphicsQuality}
            onChange={(e) => updateSettings({ graphicsQuality: e.target.value as GraphicsQuality })}
            className="rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1"
          >
            <option value="high">Cao (Bóng đổ + Outline + Khử răng cưa)</option>
            <option value="medium">Vừa (Khuyên dùng · Outline + Bóng đổ)</option>
            <option value="low">Thấp (Tắt Outline & Bóng đổ cho máy yếu)</option>
          </select>
        </div>

        <label className="flex items-center justify-between pt-1 cursor-pointer">
          <span>
            <strong>Chế độ Chẩn đoán 3D (Alt+D)</strong>
            <span className="block text-[11px] text-slate-400">
              Hiển thị FPS, số mesh từng phòng, camera, Box3 & lỗi WebGL.
            </span>
          </span>
          <input
            type="checkbox"
            checked={show3dDiagnostics}
            onChange={() => toggle3dDiagnostics()}
            className="w-4 h-4 accent-sky-600"
          />
        </label>

        <div className="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold">
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Đổi mật khẩu CEO (băm PBKDF2 WebCrypto)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nhập mật khẩu CEO mới..."
              className="flex-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
            />
            <button
              type="button"
              onClick={async () => {
                if (newPwd.length < 6) {
                  setPwdMsg('Mật khẩu cần tối thiểu 6 ký tự.');
                  return;
                }
                await changeCeoPassword(newPwd);
                setNewPwd('');
                setPwdMsg('Đã cập nhật mật khẩu CEO mới (lưu dạng PBKDF2 hash).');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer"
            >
              Đổi MK
            </button>
          </div>
          {pwdMsg && <div className="text-[11px] text-emerald-500">{pwdMsg}</div>}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => resetDatabase()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khởi tạo lại dữ liệu mẫu</span>
          </button>
        </div>
      </section>
    </div>
  );
}
