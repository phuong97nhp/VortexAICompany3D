import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Layers,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  Upload,
  Users,
} from 'lucide-react';
import {
  exportOfficeLayoutJson,
  parseOfficeLayoutJson,
  snapToGrid,
  validateOfficeLayout,
} from '../../engine/officeEditorEngine';
import { yFromFloor } from '../../engine/waypoints';
import { useCompanyStore } from '../../store/useCompanyStore';
import { OfficeLayoutPreset, OfficePropKind, OfficePropLayoutItem, OfficeRoomLayoutItem } from '../../types';

const PROP_KIND_LABELS: Record<OfficePropKind, string> = {
  desk: 'Bàn làm việc',
  sofa: 'Sofa tiếp khách',
  plant: 'Cây xanh',
  cabinet: 'Tủ hồ sơ',
  whiteboard: 'Bảng trắng',
  server_rack: 'Tủ Server',
  meeting_table: 'Bàn họp',
  coffee_station: 'Quầy Cà phê',
  safe_vault: 'Két sắt',
  studio_light: 'Đèn Studio',
  reception_counter: 'Quầy Lễ tân',
  door: 'Cửa phòng',
};

export function OfficeEditorPanel() {
  const officeLayouts = useCompanyStore((s) => s.officeLayouts);
  const undoStack = useCompanyStore((s) => s.officeLayoutUndoStack);
  const redoStack = useCompanyStore((s) => s.officeLayoutRedoStack);
  const settings = useCompanyStore((s) => s.settings);
  const agents = useCompanyStore((s) => s.agents);
  const saveOfficeLayoutPreset = useCompanyStore((s) => s.saveOfficeLayoutPreset);
  const switchOfficeLayoutPreset = useCompanyStore((s) => s.switchOfficeLayoutPreset);
  const undoOfficeLayout = useCompanyStore((s) => s.undoOfficeLayout);
  const redoOfficeLayout = useCompanyStore((s) => s.redoOfficeLayout);
  const autoSeatUnseatedAgents = useCompanyStore((s) => s.autoSeatUnseatedAgents);
  const deleteOfficeLayoutPreset = useCompanyStore((s) => s.deleteOfficeLayoutPreset);
  const setVisibleFloor = useCompanyStore((s) => s.setVisibleFloor);

  const activePreset = useMemo(
    () =>
      officeLayouts.find((p) => p.id === settings.activeOfficeLayoutId) ||
      officeLayouts[0],
    [officeLayouts, settings.activeOfficeLayoutId]
  );

  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [saveAsName, setSaveAsName] = useState('');
  const [newPropKind, setNewPropKind] = useState<OfficePropKind>('desk');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragState, setDragState] = useState<{
    kind: 'room' | 'prop';
    id: string;
    offsetX: number;
    offsetZ: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const validation = useMemo(() => {
    if (!activePreset) return null;
    return validateOfficeLayout(activePreset, activeAgents);
  }, [activePreset, activeAgents]);

  if (!activePreset) {
    return (
      <div className="p-4 text-xs text-slate-400">
        Đang tải bố cục văn phòng 3D...
      </div>
    );
  }

  const floorRooms = activePreset.rooms.filter((r) => r.floor === selectedFloor);
  const floorProps = activePreset.props.filter((p) => p.floor === selectedFloor);
  const selectedRoom = floorRooms.find((r) => r.id === selectedRoomId) || activePreset.rooms.find((r) => r.id === selectedRoomId);
  const selectedProp = floorProps.find((p) => p.id === selectedPropId) || activePreset.props.find((p) => p.id === selectedPropId);

  const commitPreset = async (next: OfficeLayoutPreset, pushUndo = true) => {
    await saveOfficeLayoutPreset(next, pushUndo);
  };

  const clientToWorldXZ = (clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    // viewBox="-16 -12 32 24"
    const nx = (clientX - rect.left) / Math.max(1, rect.width);
    const nz = (clientY - rect.top) / Math.max(1, rect.height);
    const x = -16 + nx * 32;
    const z = -12 + nz * 24;
    return [x, z];
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) return;
    const [wx, wz] = clientToWorldXZ(e.clientX, e.clientY);
    const nextX = snapToGrid(Math.max(-14, Math.min(14, wx - dragState.offsetX)), 0.5);
    const nextZ = snapToGrid(Math.max(-10, Math.min(10, wz - dragState.offsetZ)), 0.5);

    if (dragState.kind === 'room') {
      const nextRooms = activePreset.rooms.map((r) =>
        r.id === dragState.id ? { ...r, center: [nextX, r.center[1], nextZ] as [number, number, number] } : r
      );
      void commitPreset({ ...activePreset, rooms: nextRooms }, false);
    } else {
      const nextProps = activePreset.props.map((p) =>
        p.id === dragState.id ? { ...p, position: [nextX, p.position[1], nextZ] as [number, number, number] } : p
      );
      void commitPreset({ ...activePreset, props: nextProps }, false);
    }
  };

  const handleSvgPointerUp = () => {
    if (dragState) {
      // Final push with undo checkpoint
      void commitPreset(activePreset, true);
      setDragState(null);
    }
  };

  const handleAddFloor = async () => {
    const nextFloor = Math.max(1, ...activePreset.floors) + 1;
    const y = (nextFloor - 1) * 3.8;
    const newRoom: OfficeRoomLayoutItem = {
      id: `room-floor-${nextFloor}-${Date.now()}`,
      name: `Phòng Mở rộng Tầng ${nextFloor}`,
      shortName: `Mở rộng T${nextFloor}`,
      floor: nextFloor,
      center: [0, y, -4.5],
      size: [10, 6],
      color: '#6366F1',
      doorSide: 'south',
    };
    await commitPreset({
      ...activePreset,
      floors: [...activePreset.floors, nextFloor],
      rooms: [...activePreset.rooms, newRoom],
    });
    setSelectedFloor(nextFloor);
    setSelectedRoomId(newRoom.id);
    setNotice({ ok: true, text: `Đã thêm Tầng ${nextFloor} và phòng mới.` });
  };

  const handleAddRoom = async () => {
    const y = selectedFloor <= 3 ? yFromFloor(selectedFloor as 1 | 2 | 3) : (selectedFloor - 1) * 3.8;
    const newRoom: OfficeRoomLayoutItem = {
      id: `room-custom-${Date.now()}`,
      name: `Phòng Mới T${selectedFloor}`,
      shortName: `Phòng T${selectedFloor}`,
      floor: selectedFloor,
      center: [0, y, 4.5],
      size: [6, 5],
      color: '#0EA5E9',
      doorSide: 'north',
    };
    await commitPreset({
      ...activePreset,
      rooms: [...activePreset.rooms, newRoom],
    });
    setSelectedRoomId(newRoom.id);
    setSelectedPropId(null);
    setNotice({ ok: true, text: 'Đã thêm phòng mới trên bản đồ.' });
  };

  const handleAddProp = async () => {
    const y = selectedFloor <= 3 ? yFromFloor(selectedFloor as 1 | 2 | 3) : (selectedFloor - 1) * 3.8;
    const roomId = selectedRoom?.id || floorRooms[0]?.id || 'shared';
    const basePos = selectedRoom ? selectedRoom.center : [0, y, 0];
    const newProp: OfficePropLayoutItem = {
      id: `prop-${newPropKind}-${Date.now()}`,
      roomId,
      floor: selectedFloor,
      kind: newPropKind,
      label: PROP_KIND_LABELS[newPropKind],
      position: [snapToGrid(basePos[0], 0.5), y, snapToGrid(basePos[2], 0.5)],
      rotationY: 0,
    };
    await commitPreset({
      ...activePreset,
      props: [...activePreset.props, newProp],
    });
    setSelectedPropId(newProp.id);
    setSelectedRoomId(null);
    setNotice({ ok: true, text: `Đã thêm ${PROP_KIND_LABELS[newPropKind]} (Snap 0.5m).` });
  };

  const handleSaveAs = async () => {
    const clean = saveAsName.trim();
    if (!clean) return;
    const clone: OfficeLayoutPreset = {
      ...activePreset,
      id: `preset_custom_${Date.now()}`,
      name: clean,
      description: 'Bố cục tùy chỉnh bởi CEO',
      isBuiltIn: false,
      updatedAt: Date.now(),
    };
    await saveOfficeLayoutPreset(clone, false);
    await switchOfficeLayoutPreset(clone.id);
    setSaveAsName('');
    setNotice({ ok: true, text: `Đã lưu mẫu mới "${clean}" và kích hoạt.` });
  };

  const handleExportJson = () => {
    const json = exportOfficeLayoutJson(activePreset);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePreset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto text-xs">
      {/* Header & Preset Selector */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Trình Chỉnh sửa Văn phòng 3D / 2D
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kéo thả phòng & bàn ghế trên mặt bằng 2D (snap 0.5m) · Cập nhật tức thì sang cảnh 3D.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={() => undoOfficeLayout()}
              title="Hoàn tác (Undo)"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={() => redoOfficeLayout()}
              title="Làm lại (Redo)"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={activePreset.id}
            onChange={async (e) => {
              const res = await switchOfficeLayoutPreset(e.target.value);
              setSelectedRoomId(null);
              setSelectedPropId(null);
              setNotice({ ok: res.ok, text: res.ok ? 'Đã chuyển sang bố cục đã chọn.' : res.error || 'Lỗi chuyển mẫu' });
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-semibold"
          >
            {officeLayouts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.rooms.length} phòng · {p.floors.length} tầng)
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="Tên bản lưu mới..."
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5"
            />
            <button
              type="button"
              onClick={handleSaveAs}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu mới</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={async () => {
              const moved = await autoSeatUnseatedAgents(activePreset.id);
              setNotice({
                ok: true,
                text: moved > 0 ? `Đã tự xếp chỗ ngồi cho ${moved} nhân sự chưa có bàn.` : 'Tất cả nhân sự đang hoạt động đã có bàn.',
              });
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tự xếp chỗ NV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất JSON</span>
          </button>

          <label className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-medium cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập JSON</span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const parsed = parseOfficeLayoutJson(String(reader.result || ''));
                  if (!parsed.ok) {
                    setNotice({ ok: false, text: parsed.error });
                    return;
                  }
                  await saveOfficeLayoutPreset(parsed.preset, false);
                  await switchOfficeLayoutPreset(parsed.preset.id);
                  setNotice({ ok: true, text: `Đã nhập và kích hoạt "${parsed.preset.name}".` });
                };
                reader.readAsText(file);
              }}
            />
          </label>

          {!activePreset.isBuiltIn && (
            <button
              type="button"
              onClick={async () => {
                await deleteOfficeLayoutPreset(activePreset.id);
                setNotice({ ok: true, text: 'Đã xóa mẫu bố cục tùy chỉnh.' });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-500 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa mẫu</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Alert Strip */}
      {validation && (
        <div
          className={`rounded-xl border p-2.5 space-y-1 text-[11px] ${
            validation.valid && validation.aisleWarnings.length === 0
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            {validation.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>
              Kiểm tra bố cục: {validation.overlapErrors.length} chồng lấn · {validation.unseatedAgents.length} NV chưa có bàn · {validation.aisleWarnings.length} cảnh báo lối đi
            </span>
          </div>
          {validation.overlapErrors.map((err, idx) => (
            <div key={idx} className="text-rose-500">• {err}</div>
          ))}
          {validation.unseatedAgents.slice(0, 4).map((name, idx) => (
            <div key={idx}>• Chưa có bàn: {name}</div>
          ))}
          {validation.aisleWarnings.slice(0, 2).map((w, idx) => (
            <div key={idx}>• {w}</div>
          ))}
        </div>
      )}

      {notice && (
        <div className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${notice.ok ? 'bg-sky-500/15 text-sky-500' : 'bg-rose-500/15 text-rose-500'}`}>
          {notice.text}
        </div>
      )}

      {/* Floor Toolbar + Add Room/Prop */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {activePreset.floors.map((fl) => (
            <button
              key={fl}
              type="button"
              onClick={() => {
                setSelectedFloor(fl);
                if (fl === 1 || fl === 2 || fl === 3) {
                  setVisibleFloor(fl);
                }
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                selectedFloor === fl
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Tầng {fl}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddFloor}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            <span>+ Tầng</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddRoom}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ Phòng</span>
          </button>
          <select
            value={newPropKind}
            onChange={(e) => setNewPropKind(e.target.value as OfficePropKind)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1 text-[11px]"
          >
            {(Object.keys(PROP_KIND_LABELS) as OfficePropKind[]).map((k) => (
              <option key={k} value={k}>
                {PROP_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddProp}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 dark:bg-slate-700 text-white font-semibold cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Đặt đồ</span>
          </button>
        </div>
      </div>

      {/* Interactive 2D SVG Blueprint */}
      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 p-2">
        <svg
          ref={svgRef}
          viewBox="-16 -12 32 24"
          className="w-full h-64 select-none touch-none cursor-crosshair"
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
        >
          {/* 1m Gridlines */}
          {Array.from({ length: 33 }).map((_, idx) => {
            const x = -16 + idx;
            return (
              <line
                key={`gx-${x}`}
                x1={x}
                y1={-12}
                x2={x}
                y2={12}
                stroke={x === 0 ? 'rgba(56,189,248,0.28)' : 'rgba(148,163,184,0.1)'}
                strokeWidth={0.04}
              />
            );
          })}
          {Array.from({ length: 25 }).map((_, idx) => {
            const z = -12 + idx;
            return (
              <line
                key={`gz-${z}`}
                x1={-16}
                y1={z}
                x2={16}
                y2={z}
                stroke={z === 0 ? 'rgba(56,189,248,0.28)' : 'rgba(148,163,184,0.1)'}
                strokeWidth={0.04}
              />
            );
          })}

          {/* Central Corridor & Elevator Shaft Marker */}
          <rect x={-13} y={-1.1} width={26} height={2.2} fill="rgba(148,163,184,0.08)" />
          <rect x={-5.1} y={-0.7} width={1.4} height={1.4} fill="rgba(56,189,248,0.25)" stroke="#38BDF8" strokeWidth={0.08} />

          {/* Rooms */}
          {floorRooms.map((r) => {
            const isSel = selectedRoomId === r.id;
            const rx = r.center[0] - r.size[0] / 2;
            const rz = r.center[2] - r.size[1] / 2;
            return (
              <g
                key={r.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedRoomId(r.id);
                  setSelectedPropId(null);
                  const [wx, wz] = clientToWorldXZ(e.clientX, e.clientY);
                  setDragState({ kind: 'room', id: r.id, offsetX: wx - r.center[0], offsetZ: wz - r.center[2] });
                }}
                style={{ cursor: 'grab' }}
              >
                <rect
                  x={rx}
                  y={rz}
                  width={r.size[0]}
                  height={r.size[1]}
                  rx={0.25}
                  fill={`${r.color}28`}
                  stroke={isSel ? '#FFFFFF' : r.color}
                  strokeWidth={isSel ? 0.16 : 0.08}
                />
                <text
                  x={r.center[0]}
                  y={rz + 0.85}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize={0.62}
                  fontWeight={700}
                >
                  {r.shortName}
                </text>
              </g>
            );
          })}

          {/* Props (Desks, Plants, Sofas...) */}
          {floorProps.map((p) => {
            const isSel = selectedPropId === p.id;
            const isDesk = p.kind === 'desk';
            return (
              <g
                key={p.id}
                transform={`translate(${p.position[0]}, ${p.position[2]}) rotate(${(p.rotationY * 180) / Math.PI})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedPropId(p.id);
                  setSelectedRoomId(null);
                  const [wx, wz] = clientToWorldXZ(e.clientX, e.clientY);
                  setDragState({ kind: 'prop', id: p.id, offsetX: wx - p.position[0], offsetZ: wz - p.position[2] });
                }}
                style={{ cursor: 'grab' }}
              >
                {isDesk ? (
                  <rect
                    x={-0.65}
                    y={-0.35}
                    width={1.3}
                    height={0.7}
                    rx={0.1}
                    fill={p.assignedAgentId ? '#0EA5E9' : '#64748B'}
                    stroke={isSel ? '#FBBF24' : '#E2E8F0'}
                    strokeWidth={isSel ? 0.12 : 0.05}
                  />
                ) : (
                  <circle
                    cx={0}
                    cy={0}
                    r={0.36}
                    fill={p.kind === 'plant' ? '#10B981' : '#A855F7'}
                    stroke={isSel ? '#FBBF24' : '#F8FAFC'}
                    strokeWidth={isSel ? 0.12 : 0.05}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Inspector for Selected Room or Selected Prop */}
      {selectedRoom && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold">Chỉnh phòng: {selectedRoom.name}</span>
            <button
              type="button"
              onClick={async () => {
                await commitPreset({
                  ...activePreset,
                  rooms: activePreset.rooms.filter((r) => r.id !== selectedRoom.id),
                });
                setSelectedRoomId(null);
              }}
              className="px-2 py-0.5 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
            >
              Xóa phòng
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={selectedRoom.name}
              onChange={(e) =>
                void commitPreset({
                  ...activePreset,
                  rooms: activePreset.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, name: e.target.value } : r)),
                }, false)
              }
              placeholder="Tên phòng"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1"
            />
            <input
              type="text"
              value={selectedRoom.shortName}
              onChange={(e) =>
                void commitPreset({
                  ...activePreset,
                  rooms: activePreset.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, shortName: e.target.value } : r)),
                }, false)
              }
              placeholder="Tên viết tắt"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400">Rộng X (m)</label>
              <input
                type="number"
                step={0.5}
                min={2.5}
                max={26}
                value={selectedRoom.size[0]}
                onChange={(e) =>
                  void commitPreset({
                    ...activePreset,
                    rooms: activePreset.rooms.map((r) =>
                      r.id === selectedRoom.id ? { ...r, size: [Math.max(2.5, Number(e.target.value) || 4), r.size[1]] } : r
                    ),
                  })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400">Sâu Z (m)</label>
              <input
                type="number"
                step={0.5}
                min={2.5}
                max={18}
                value={selectedRoom.size[1]}
                onChange={(e) =>
                  void commitPreset({
                    ...activePreset,
                    rooms: activePreset.rooms.map((r) =>
                      r.id === selectedRoom.id ? { ...r, size: [r.size[0], Math.max(2.5, Number(e.target.value) || 4)] } : r
                    ),
                  })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400">Màu vùng</label>
              <input
                type="color"
                value={selectedRoom.color}
                onChange={(e) =>
                  void commitPreset({
                    ...activePreset,
                    rooms: activePreset.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, color: e.target.value } : r)),
                  })
                }
                className="w-full h-7 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400">Hướng cửa</label>
              <select
                value={selectedRoom.doorSide || 'south'}
                onChange={(e) =>
                  void commitPreset({
                    ...activePreset,
                    rooms: activePreset.rooms.map((r) =>
                      r.id === selectedRoom.id
                        ? { ...r, doorSide: e.target.value as 'north' | 'south' | 'east' | 'west' }
                        : r
                    ),
                  })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1"
              >
                <option value="north">Bắc</option>
                <option value="south">Nam</option>
                <option value="east">Đông</option>
                <option value="west">Tây</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {selectedProp && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold">
              Chỉnh đồ vật: {PROP_KIND_LABELS[selectedProp.kind]} ({selectedProp.position[0]}m, {selectedProp.position[2]}m)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  void commitPreset({
                    ...activePreset,
                    props: activePreset.props.map((p) =>
                      p.id === selectedProp.id ? { ...p, rotationY: p.rotationY + Math.PI / 2 } : p
                    ),
                  })
                }
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-white text-[11px] cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>Xoay 90°</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await commitPreset({
                    ...activePreset,
                    props: activePreset.props.filter((p) => p.id !== selectedProp.id),
                  });
                  setSelectedPropId(null);
                }}
                className="px-2 py-0.5 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
          {selectedProp.kind === 'desk' && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 shrink-0">Gán nhân sự:</label>
              <select
                value={selectedProp.assignedAgentId || ''}
                onChange={(e) =>
                  void commitPreset({
                    ...activePreset,
                    props: activePreset.props.map((p) =>
                      p.id === selectedProp.id ? { ...p, assignedAgentId: e.target.value || undefined } : p
                    ),
                  })
                }
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1"
              >
                <option value="">-- Chưa gán --</option>
                {activeAgents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.title})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
