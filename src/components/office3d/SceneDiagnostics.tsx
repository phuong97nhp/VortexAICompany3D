import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { X } from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { RoomMeshStat } from '../../types';

interface ProbeProps {
  visibleFloor: 'all' | 1 | 2 | 3;
  rendererInfo: string;
  isSoftwareGl: boolean;
  webglError: string | null;
  buildingRootRef: React.RefObject<THREE.Group | null>;
}

const STATIC_ROOM_NAMES: Record<string, string> = {
  'room-meeting': 'Phòng Họp',
  'shared-structure': 'Kết cấu tòa nhà, Sảnh & Cầu thang',
  'shared-furniture': 'Bàn ghế, Màn hình & Tiện ích (Instanced)',
  unassigned: 'Khác / Ngoài phòng',
};

function resolveRoomId(obj: THREE.Object3D): string {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData && typeof cur.userData.roomId === 'string') {
      return cur.userData.roomId;
    }
    cur = cur.parent;
  }
  return 'unassigned';
}

export function SceneDiagnosticsProbe({
  visibleFloor,
  rendererInfo,
  isSoftwareGl,
  webglError,
  buildingRootRef,
}: ProbeProps) {
  const { scene, camera, controls } = useThree();
  const setScene3dStats = useCompanyStore((s) => s.setScene3dStats);
  const graphicsQuality = useCompanyStore((s) => s.settings.graphicsQuality);
  const updateSettings = useCompanyStore((s) => s.updateSettings);
  const departments = useCompanyStore((s) => s.departments);

  const frameCountRef = useRef(0);
  const fpsWindowStartRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const lastSampleAtRef = useRef(0);
  const lowFpsStreakRef = useRef(0);
  const mountedAtRef = useRef(performance.now());
  const loggedFloorRef = useRef<string>('');

  const collectStats = (forceConsoleLog: boolean) => {
    const liveDepts = useCompanyStore.getState().departments;
    const roomNameMap: Record<string, string> = {
      ...STATIC_ROOM_NAMES,
      ...Object.fromEntries(liveDepts.map((d) => [d.roomId, d.name])),
    };

    const roomMap = new Map<string, RoomMeshStat>();
    const ensureRoom = (roomId: string) => {
      let entry = roomMap.get(roomId);
      if (!entry) {
        entry = {
          roomId,
          roomName: roomNameMap[roomId] || roomId,
          meshCount: 0,
          instanceCount: 0,
          characterCount: 0,
        };
        roomMap.set(roomId, entry);
      }
      return entry;
    };

    for (const d of liveDepts) {
      if (visibleFloor === 'all' || d.floor === visibleFloor) {
        ensureRoom(d.roomId);
      }
    }
    if (visibleFloor === 'all' || visibleFloor === 1) {
      ensureRoom('room-meeting');
    }
    ensureRoom('shared-structure');
    ensureRoom('shared-furniture');

    let totalMeshes = 0;
    let totalInstancedMeshes = 0;
    let totalInstances = 0;
    let characterCount = 0;

    scene.traverse((obj) => {
      if (obj.userData?.agentId) {
        characterCount += 1;
        const rId = typeof obj.userData.roomId === 'string' ? obj.userData.roomId : 'unassigned';
        ensureRoom(rId).characterCount += 1;
      }

      if ((obj as THREE.InstancedMesh).isInstancedMesh) {
        const im = obj as THREE.InstancedMesh;
        totalInstancedMeshes += 1;
        totalMeshes += 1;
        totalInstances += im.count;
        const rId = resolveRoomId(im);
        const st = ensureRoom(rId);
        st.meshCount += 1;
        st.instanceCount += im.count;
      } else if ((obj as THREE.Mesh).isMesh) {
        totalMeshes += 1;
        const rId = resolveRoomId(obj);
        ensureRoom(rId).meshCount += 1;
      }
    });

    const box = new THREE.Box3();
    if (buildingRootRef.current) {
      box.setFromObject(buildingRootRef.current);
    } else {
      box.setFromObject(scene);
    }
    const min: [number, number, number] = box.isEmpty()
      ? [0, 0, 0]
      : [Number(box.min.x.toFixed(1)), Number(box.min.y.toFixed(1)), Number(box.min.z.toFixed(1))];
    const max: [number, number, number] = box.isEmpty()
      ? [0, 0, 0]
      : [Number(box.max.x.toFixed(1)), Number(box.max.y.toFixed(1)), Number(box.max.z.toFixed(1))];
    const size: [number, number, number] = box.isEmpty()
      ? [0, 0, 0]
      : [
          Number((box.max.x - box.min.x).toFixed(1)),
          Number((box.max.y - box.min.y).toFixed(1)),
          Number((box.max.z - box.min.z).toFixed(1)),
        ];

    const orbitTarget = (controls as { target?: THREE.Vector3 } | null)?.target;
    const tx = orbitTarget ? orbitTarget.x : 0;
    const ty = orbitTarget ? orbitTarget.y : 1.8;
    const tz = orbitTarget ? orbitTarget.z : 0;
    const camPos: [number, number, number] = [
      Number(camera.position.x.toFixed(1)),
      Number(camera.position.y.toFixed(1)),
      Number(camera.position.z.toFixed(1)),
    ];
    const camTarget: [number, number, number] = [
      Number(tx.toFixed(1)),
      Number(ty.toFixed(1)),
      Number(tz.toFixed(1)),
    ];
    const camDist = Number(
      Math.hypot(camera.position.x - tx, camera.position.y - ty, camera.position.z - tz).toFixed(1)
    );

    const roomStats = Array.from(roomMap.values()).filter(
      (s) => s.meshCount > 0 || s.characterCount > 0 || s.roomId.startsWith('room-')
    );

    const payload = {
      fps: fpsRef.current,
      totalMeshes,
      totalInstancedMeshes,
      totalInstances,
      characterCount,
      roomStats,
      cameraPosition: camPos,
      cameraTarget: camTarget,
      cameraDistance: camDist,
      buildingBounds: { min, max, size },
      rendererInfo,
      isSoftwareGl,
      webglError,
      updatedAt: Date.now(),
    };

    setScene3dStats(payload);

    if (forceConsoleLog) {
      console.info(
        `[3D Scene Diagnostics] floor=${visibleFloor} | totalMeshes=${totalMeshes} | instanced=${totalInstancedMeshes} (${totalInstances} instances) | characters=${characterCount} | bounds=${size.join('x')}m | gpu=${rendererInfo}`
      );
    }
  };

  useEffect(() => {
    const floorKey = String(visibleFloor);
    const t = window.setTimeout(() => {
      const shouldLog = loggedFloorRef.current !== floorKey;
      loggedFloorRef.current = floorKey;
      collectStats(shouldLog);
    }, 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFloor, rendererInfo, webglError, departments.length]);

  useFrame(() => {
    const now = performance.now();
    frameCountRef.current += 1;
    const elapsed = now - fpsWindowStartRef.current;

    if (elapsed >= 600) {
      const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
      fpsRef.current = currentFps;
      frameCountRef.current = 0;
      fpsWindowStartRef.current = now;

      // Auto-downscale quality on sustained low FPS after initial warmup
      if (now - mountedAtRef.current > 4500 && graphicsQuality !== 'low') {
        if (currentFps > 0 && currentFps < 18) {
          lowFpsStreakRef.current += 1;
          if (lowFpsStreakRef.current >= 4) {
            lowFpsStreakRef.current = 0;
            updateSettings({ graphicsQuality: 'low' });
          }
        } else {
          lowFpsStreakRef.current = 0;
        }
      }
    }

    if (now - lastSampleAtRef.current >= 1100) {
      lastSampleAtRef.current = now;
      collectStats(false);
    }
  });

  return null;
}

export function SceneDiagnosticsOverlay() {
  const show = useCompanyStore((s) => s.show3dDiagnostics);
  const toggle = useCompanyStore((s) => s.toggle3dDiagnostics);
  const stats = useCompanyStore((s) => s.scene3dStats);

  if (!show) return null;

  return (
    <div className="absolute top-12 left-3 z-20 w-80 max-h-[75vh] overflow-y-auto rounded-xl bg-slate-950/95 text-slate-100 border border-sky-500/50 shadow-2xl p-3 text-[11px] space-y-2.5 pointer-events-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="font-bold text-sky-400 flex items-center gap-1.5">
          <span>Chẩn đoán Cảnh 3D</span>
          <span className="text-[10px] font-mono text-slate-400">(Alt+D)</span>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          title="Đóng chẩn đoán 3D"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!stats ? (
        <div className="text-slate-400">Đang thu thập thông số WebGL & Scene...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-1.5">
              <div className="text-[9.5px] text-slate-400">FPS</div>
              <div
                className={`font-mono-num font-bold text-sm ${
                  stats.fps >= 45 ? 'text-emerald-400' : stats.fps >= 24 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {stats.fps}
              </div>
            </div>
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-1.5">
              <div className="text-[9.5px] text-slate-400">Tổng Mesh</div>
              <div className="font-mono-num font-bold text-sm text-sky-300">
                {stats.totalMeshes}
                <span className="text-[9px] text-slate-400 font-normal"> (+{stats.totalInstances})</span>
              </div>
            </div>
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-1.5">
              <div className="text-[9.5px] text-slate-400">Nhân vật</div>
              <div className="font-mono-num font-bold text-sm text-emerald-300">{stats.characterCount}</div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 space-y-1 font-mono text-[10px]">
            <div>
              <span className="text-slate-400">Camera:</span> [{stats.cameraPosition.join(', ')}] · dist{' '}
              <span className="text-sky-300">{stats.cameraDistance}m</span>
            </div>
            <div>
              <span className="text-slate-400">Target:</span> [{stats.cameraTarget.join(', ')}]
            </div>
            <div>
              <span className="text-slate-400">Bounds (Box3):</span>{' '}
              <span className="text-amber-300">
                [{stats.buildingBounds.size[0]}×{stats.buildingBounds.size[1]}×{stats.buildingBounds.size[2]}m]
              </span>
            </div>
            <div className="truncate" title={stats.rendererInfo}>
              <span className="text-slate-400">GPU:</span> {stats.rendererInfo}
              {stats.isSoftwareGl ? ' (Software GL)' : ''}
            </div>
            <div className={stats.webglError ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
              WebGL/Shader: {stats.webglError || 'Ổn định (Không có lỗi)'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-300">Mesh & Nhân vật theo phòng</div>
            <div className="rounded-lg border border-slate-800 divide-y divide-slate-800/80 max-h-44 overflow-y-auto">
              {stats.roomStats.map((r) => (
                <div key={r.roomId} className="flex items-center justify-between px-2 py-1 text-[10px]">
                  <span className="truncate pr-2 text-slate-200" title={r.roomName}>
                    {r.roomName}
                  </span>
                  <span className="font-mono-num shrink-0 text-slate-400">
                    {r.meshCount}m{r.instanceCount > 0 ? `/${r.instanceCount}i` : ''} · {r.characterCount}nv
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
