import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RotateCcw, Save, Shuffle } from 'lucide-react';
import {
  ACCESSORIES,
  generateRandomAppearance,
  getDefaultAppearance,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_STYLES,
  SKIN_TONES,
} from '../../engine/characterAppearance';
import { useCompanyStore } from '../../store/useCompanyStore';
import { AgentAppearance, AgentStatus } from '../../types';
import { ChibiModel } from '../office3d/ChibiModel';

const OUTFIT_COLORS = [
  '#0EA5E9',
  '#F59E0B',
  '#EC4899',
  '#10B981',
  '#8B5CF6',
  '#6366F1',
  '#F97316',
  '#14B8A6',
  '#334155',
];

const PANTS_COLORS = ['#1E293B', '#334155', '#0F172A', '#312E81', '#3F3F46'];

const PREVIEW_STATUSES: Array<{ id: AgentStatus; label: string }> = [
  { id: 'idle', label: 'Đứng thở' },
  { id: 'walking', label: 'Đi bộ' },
  { id: 'typing', label: 'Gõ phím' },
  { id: 'thinking', label: 'Suy nghĩ' },
  { id: 'talking', label: 'Trao đổi' },
  { id: 'done', label: 'Ăn mừng' },
  { id: 'blocked', label: 'Chờ CEO' },
];

export function CharacterCustomizerPanel() {
  const agents = useCompanyStore((s) => s.agents);
  const selectedAgentId = useCompanyStore((s) => s.selectedAgentId);
  const agentAppearances = useCompanyStore((s) => s.agentAppearances);
  const saveAgentAppearance = useCompanyStore((s) => s.saveAgentAppearance);
  const resetAgentAppearance = useCompanyStore((s) => s.resetAgentAppearance);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const [targetId, setTargetId] = useState<string>(selectedAgentId || activeAgents[0]?.id || 'secretary');
  const [previewStatus, setPreviewStatus] = useState<AgentStatus>('idle');
  const [savedFlag, setSavedFlag] = useState(false);

  const targetAgent = activeAgents.find((a) => a.id === targetId) || activeAgents[0];
  const storedAppearance = targetAgent
    ? agentAppearances[targetAgent.id] || getDefaultAppearance(targetAgent)
    : undefined;
  const [draft, setDraft] = useState<AgentAppearance | undefined>(storedAppearance);

  useEffect(() => {
    if (selectedAgentId && activeAgents.some((a) => a.id === selectedAgentId)) {
      setTargetId(selectedAgentId);
    }
  }, [selectedAgentId, activeAgents]);

  useEffect(() => {
    if (targetAgent) {
      setDraft(agentAppearances[targetAgent.id] || getDefaultAppearance(targetAgent));
    }
  }, [targetAgent?.id, agentAppearances]);

  if (!targetAgent || !draft) {
    return (
      <div className="p-4 text-xs text-slate-400">
        Chưa có nhân sự hoạt động để tùy chỉnh ngoại hình 3D.
      </div>
    );
  }

  const handleSave = async () => {
    await saveAgentAppearance(draft);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1800);
  };

  const handleRandom = () => {
    const rnd = generateRandomAppearance(targetAgent.id, draft.outfitColor);
    setDraft(rnd);
  };

  const handleReset = async () => {
    await resetAgentAppearance(targetAgent.id);
    setDraft(getDefaultAppearance(targetAgent));
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto text-xs">
      {/* Agent Picker */}
      <div className="flex items-center gap-2">
        <select
          value={targetAgent.id}
          onChange={(e) => setTargetId(e.target.value)}
          className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 font-semibold"
        >
          {activeAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRandom}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Ngẫu nhiên</span>
        </button>
      </div>

      {/* 360° Interactive 3D Preview Canvas */}
      <div className="relative h-60 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shrink-0">
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.35, 2.55], fov: 36 }}>
          <color attach="background" args={['#0F172A']} />
          <hemisphereLight args={['#FFFBEB', '#1E293B', 0.95]} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} color="#FFF7ED" />
          <directionalLight position={[-3, 2, -3]} intensity={0.65} color="#BAE6FD" />
          <Suspense fallback={null}>
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.05, 32]} />
              <meshStandardMaterial color="#1E293B" roughness={0.7} />
            </mesh>
            <ChibiModel appearance={draft} status={previewStatus} showOutline />
          </Suspense>
          <OrbitControls enablePan={false} minDistance={1.7} maxDistance={4.2} target={[0, 0.72, 0]} />
        </Canvas>

        {/* Animation test switcher */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {PREVIEW_STATUSES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setPreviewStatus(st.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap cursor-pointer ${
                previewStatus === st.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-900/85 text-slate-300 border border-slate-700'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
        <div className="absolute top-2 left-2.5 text-[10px] text-slate-400 pointer-events-none">
          Kéo chuột để xoay 360°
        </div>
      </div>

      {/* Appearance Controls */}
      <div className="space-y-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Hair Style & Accessory */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Kiểu tóc (10 mẫu)</label>
            <select
              value={draft.hairStyle}
              onChange={(e) => setDraft({ ...draft, hairStyle: e.target.value as AgentAppearance['hairStyle'] })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {HAIR_STYLES.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Phụ kiện vai trò</label>
            <select
              value={draft.accessory}
              onChange={(e) => setDraft({ ...draft, accessory: e.target.value as AgentAppearance['accessory'] })}
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
            >
              {ACCESSORIES.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hair Color */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Màu tóc</label>
          <div className="flex flex-wrap gap-1.5">
            {HAIR_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setDraft({ ...draft, hairColor: col })}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                  draft.hairColor === col ? 'border-sky-400 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        {/* Skin Tone */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Tông da</label>
          <div className="flex flex-wrap gap-1.5">
            {SKIN_TONES.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setDraft({ ...draft, skinTone: col })}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                  draft.skinTone === col ? 'border-sky-400 scale-110' : 'border-slate-600/40'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        {/* Outfit Style */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Trang phục</label>
          <div className="grid grid-cols-2 gap-1.5">
            {OUTFIT_STYLES.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setDraft({ ...draft, outfitStyle: o.id })}
                className={`px-2.5 py-1.5 rounded-lg border text-left font-medium cursor-pointer ${
                  draft.outfitStyle === o.id
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outfit & Pants Colors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Màu áo</label>
            <div className="flex flex-wrap gap-1.5">
              {OUTFIT_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setDraft({ ...draft, outfitColor: col })}
                  className={`w-5 h-5 rounded-md border-2 cursor-pointer ${
                    draft.outfitColor === col ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Màu quần</label>
            <div className="flex flex-wrap gap-1.5">
              {PANTS_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setDraft({ ...draft, pantsColor: col })}
                  className={`w-5 h-5 rounded-md border-2 cursor-pointer ${
                    draft.pantsColor === col ? 'border-sky-400 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savedFlag ? 'Đã lưu 3D!' : 'Lưu vào văn phòng 3D'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
