import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bounds, OrbitControls, useBounds } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Activity, Eye, Focus } from 'lucide-react';
import { AGENTS } from '../../agents';
import { ROOMS } from '../../config/departments';
import { useCompanyStore } from '../../store/useCompanyStore';
import { AgentCharacter } from './AgentCharacter';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { OfficeArchitecture } from './OfficeArchitecture';
import { SceneDiagnosticsOverlay, SceneDiagnosticsProbe } from './SceneDiagnostics';

const OVERVIEW_CAM_POS: [number, number, number] = [20, 17, 21];
const OVERVIEW_LOOK_AT: [number, number, number] = [0, 1.8, 0];

function SimulationTicker() {
  const advanceAgentPositions = useCompanyStore((s) => s.advanceAgentPositions);
  useFrame((_, delta) => {
    advanceAgentPositions(Math.min(delta, 0.08));
  });
  return null;
}

/**
 * Generates procedural RoomEnvironment PMREM on GPU so Standard/Toon materials
 * have crisp reflections & soft fill without external HDR assets.
 */
function EnvironmentRig() {
  const { gl, scene } = useThree();

  useEffect(() => {
    let pmrem: THREE.PMREMGenerator | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    let roomEnv: RoomEnvironment | null = null;
    try {
      pmrem = new THREE.PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();
      roomEnv = new RoomEnvironment();
      envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
    } catch (err) {
      console.warn('[3D EnvironmentRig] PMREM fallback:', err);
    }

    return () => {
      scene.environment = null;
      envRT?.dispose();
      roomEnv?.dispose();
      pmrem?.dispose();
    };
  }, [gl, scene]);

  return null;
}

/**
 * Fits oblique overview nicely on initial mount using drei <Bounds>,
 * then yields smoothly to OrbitControls & flyCameraTo targets.
 */
function AutoFitOnMount({ buildingRootRef }: { buildingRootRef: React.RefObject<THREE.Group | null> }) {
  const bounds = useBounds();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || !buildingRootRef.current) return;
    fittedRef.current = true;
    // Slight delay ensures InstancedMesh matrices & floor slabs are computed
    const t = window.setTimeout(() => {
      if (!buildingRootRef.current) return;
      bounds.refresh(buildingRootRef.current).clip();
    }, 80);
    return () => window.clearTimeout(t);
  }, [bounds, buildingRootRef]);

  return null;
}

function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraTarget = useCompanyStore((s) => s.cameraTarget);
  const followAgentMode = useCompanyStore((s) => s.followAgentMode);
  const selectedAgentId = useCompanyStore((s) => s.selectedAgentId);
  const runtimes = useCompanyStore((s) => s.runtimes);

  const animating = useRef(false);
  const targetPos = useRef(new THREE.Vector3(...cameraTarget.position));
  const targetLook = useRef(new THREE.Vector3(...cameraTarget.lookAt));
  const lastNonce = useRef(-1);

  useEffect(() => {
    if (cameraTarget.nonce !== lastNonce.current) {
      lastNonce.current = cameraTarget.nonce;
      targetPos.current.set(...cameraTarget.position);
      targetLook.current.set(...cameraTarget.lookAt);
      animating.current = true;
    }
  }, [cameraTarget]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (followAgentMode && selectedAgentId && runtimes[selectedAgentId]) {
      const p = runtimes[selectedAgentId].currentPosition;
      const desiredLook = new THREE.Vector3(p[0], p[1] + 0.9, p[2]);
      const desiredCam = new THREE.Vector3(p[0] + 4.0, p[1] + 4.4, p[2] + 5.2);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCam.x, 5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCam.y, 5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCam.z, 5, delta);

      controlsRef.current.target.x = THREE.MathUtils.damp(controlsRef.current.target.x, desiredLook.x, 6, delta);
      controlsRef.current.target.y = THREE.MathUtils.damp(controlsRef.current.target.y, desiredLook.y, 6, delta);
      controlsRef.current.target.z = THREE.MathUtils.damp(controlsRef.current.target.z, desiredLook.z, 6, delta);
      controlsRef.current.update();
      return;
    }

    if (!animating.current) return;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, 6, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, 6, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, 6, delta);

    controlsRef.current.target.x = THREE.MathUtils.damp(controlsRef.current.target.x, targetLook.current.x, 6, delta);
    controlsRef.current.target.y = THREE.MathUtils.damp(controlsRef.current.target.y, targetLook.current.y, 6, delta);
    controlsRef.current.target.z = THREE.MathUtils.damp(controlsRef.current.target.z, targetLook.current.z, 6, delta);
    controlsRef.current.update();

    if (camera.position.distanceTo(targetPos.current) < 0.12) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={OVERVIEW_LOOK_AT}
      enableDamping
      dampingFactor={0.07}
      minDistance={5}
      maxDistance={54}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI / 2.12}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
}

export function OfficeScene3D() {
  const visibleFloor = useCompanyStore((s) => s.visibleFloor);
  const setVisibleFloor = useCompanyStore((s) => s.setVisibleFloor);
  const dayNightMode = useCompanyStore((s) => s.settings.dayNightMode);
  const graphicsQuality = useCompanyStore((s) => s.settings.graphicsQuality);
  const updateSettings = useCompanyStore((s) => s.updateSettings);
  const runtimes = useCompanyStore((s) => s.runtimes);
  const selectedAgentId = useCompanyStore((s) => s.selectedAgentId);
  const followAgentMode = useCompanyStore((s) => s.followAgentMode);
  const setFollowAgentMode = useCompanyStore((s) => s.setFollowAgentMode);
  const selectRoom = useCompanyStore((s) => s.selectRoom);
  const selectAgent = useCompanyStore((s) => s.selectAgent);
  const flyCameraTo = useCompanyStore((s) => s.flyCameraTo);
  const show3dDiagnostics = useCompanyStore((s) => s.show3dDiagnostics);
  const toggle3dDiagnostics = useCompanyStore((s) => s.toggle3dDiagnostics);

  const buildingRootRef = useRef<THREE.Group | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [webglLost, setWebglLost] = useState(false);
  const [rendererInfo, setRendererInfo] = useState('WebGL2');
  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  const effectiveQuality = isSoftwareGl ? 'low' : graphicsQuality;
  const isNight = dayNightMode === 'night';

  const dpr: [number, number] =
    effectiveQuality === 'low'
      ? [1, 1]
      : effectiveQuality === 'medium'
      ? [1, 1.35]
      : [1, 1.75];

  const enableShadows = effectiveQuality !== 'low';

  const filteredAgents = AGENTS.filter((a) => {
    if (visibleFloor === 'all') return true;
    const rt = runtimes[a.id];
    const y = rt ? rt.currentPosition[1] : a.deskPosition[1];
    const currentFloor = y > 1.9 ? 2 : 1;
    return currentFloor === visibleFloor;
  });

  const isFocused = Boolean(selectedAgentId || followAgentMode);
  const bgHex = isNight ? '#162033' : '#D8E4F0';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {webglLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 text-slate-200 p-6">
          <div className="max-w-md text-center space-y-2">
            <p className="text-base font-semibold">Bối cảnh WebGL 3D tạm gián đoạn</p>
            <p className="text-sm text-slate-400">Đang tự động khôi phục đồ họa 3D hoặc hạ chất lượng sang Thấp.</p>
          </div>
        </div>
      )}

      {/* Subtle Cinema Focus Vignette when following/focusing an agent */}
      {isFocused && (
        <div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background: 'radial-gradient(circle at center, transparent 55%, rgba(2, 6, 23, 0.3) 100%)',
          }}
        />
      )}

      <CanvasErrorBoundary onResetQuality={() => updateSettings({ graphicsQuality: 'low' })}>
        <Canvas
          frameloop="always"
          shadows={enableShadows}
          dpr={dpr}
          camera={{ position: OVERVIEW_CAM_POS, fov: 42, near: 0.4, far: 160 }}
          gl={{
            antialias: effectiveQuality !== 'low',
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: isNight ? 1.08 : 1.12,
          }}
          onCreated={({ gl }) => {
            try {
              const ctx = gl.getContext();
              const ext = ctx.getExtension('WEBGL_debug_renderer_info');
              const gpu = String(ctx.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : ctx.RENDERER) || 'WebGL');
              setRendererInfo(gpu);
              const soft = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
              setIsSoftwareGl(soft);
            } catch (err) {
              setWebglError(err instanceof Error ? err.message : 'Không đọc được thông tin GPU WebGL');
            }

            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setWebglLost(true);
              setWebglError('webglcontextlost: Bối cảnh WebGL bị mất.');
            });
            gl.domElement.addEventListener('webglcontextrestored', () => {
              setWebglLost(false);
              setWebglError(null);
            });
          }}
        >
          <color attach="background" args={[bgHex]} />
          <fog attach="fog" args={[bgHex, 44, 110]} />

          <EnvironmentRig />

          {/* Guaranteed Multi-Layer Studio & Warm Room Lighting */}
          <ambientLight intensity={isNight ? 0.55 : 0.72} color={isNight ? '#CBD5E1' : '#FFFFFF'} />
          <hemisphereLight
            args={[isNight ? '#93C5FD' : '#FFFBEB', isNight ? '#1E293B' : '#94A3B8', isNight ? 0.65 : 0.85]}
          />
          <directionalLight
            position={[18, 28, 16]}
            intensity={isNight ? 0.85 : 1.45}
            color={isNight ? '#FDE68A' : '#FFFDF5'}
            castShadow={enableShadows}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-bias={-0.0005}
          />
          {/* Cool Rim Light */}
          <directionalLight position={[-18, 14, -14]} intensity={isNight ? 0.5 : 0.45} color="#BAE6FD" />

          {/* Warm Interior Room Lights */}
          <pointLight
            position={[-7.5, 3.0, 4.5]}
            intensity={isNight ? 11 : 4}
            distance={18}
            color="#FDE68A"
          />
          <pointLight
            position={[5.0, 3.0, -4.5]}
            intensity={isNight ? 11 : 4}
            distance={18}
            color="#FDBA74"
          />
          <pointLight
            position={[3.5, 6.8, 3.5]}
            intensity={isNight ? 11 : 4}
            distance={20}
            color="#FDE68A"
          />
          <pointLight
            position={[-8.0, 6.8, -4.5]}
            intensity={isNight ? 10 : 4}
            distance={18}
            color="#F9A8D4"
          />

          <Suspense fallback={null}>
            <Bounds clip margin={1.15}>
              <group ref={buildingRootRef} name="office-building-root">
                <OfficeArchitecture visibleFloor={visibleFloor} />
                {filteredAgents.map((agent) => (
                  <AgentCharacter key={agent.id} agent={agent} showLabels={showLabels} />
                ))}
              </group>
              <AutoFitOnMount buildingRootRef={buildingRootRef} />
            </Bounds>
          </Suspense>

          <SimulationTicker />
          <CameraRig />
          <SceneDiagnosticsProbe
            visibleFloor={visibleFloor}
            rendererInfo={rendererInfo}
            isSoftwareGl={isSoftwareGl}
            webglError={webglError}
            buildingRootRef={buildingRootRef}
          />
        </Canvas>
      </CanvasErrorBoundary>

      <SceneDiagnosticsOverlay />

      {/* Top-Left Cinema Camera & Diagnostics Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            setFollowAgentMode(false);
            flyCameraTo(OVERVIEW_CAM_POS, OVERVIEW_LOOK_AT);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/95 hover:bg-slate-900 text-slate-100 border border-slate-700/80 text-xs font-medium shadow-lg cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <span>Xem tổng</span>
        </button>

        <button
          type="button"
          onClick={toggle3dDiagnostics}
          title="Bật/tắt bảng Chẩn đoán 3D (Alt+D)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium shadow-lg cursor-pointer transition-colors ${
            show3dDiagnostics
              ? 'bg-amber-600 text-white border-amber-400'
              : 'bg-slate-950/95 hover:bg-slate-900 text-slate-100 border-slate-700/80'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Chẩn đoán 3D</span>
        </button>

        {selectedAgentId && (
          <button
            type="button"
            onClick={() => setFollowAgentMode(!followAgentMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium shadow-lg cursor-pointer transition-colors ${
              followAgentMode
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-slate-950/95 text-slate-100 border-slate-700/80 hover:bg-slate-900'
            }`}
          >
            <Focus className="w-3.5 h-3.5" />
            <span>{followAgentMode ? 'Đang theo dõi' : 'Theo dõi nhân vật'}</span>
          </button>
        )}
      </div>

      {/* Bottom-Left 3D Controls & Mini-map */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2 pointer-events-auto">
        {showMinimap && (
          <div className="w-60 rounded-xl bg-slate-950/95 border border-slate-700/80 p-2.5 shadow-xl text-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-300">
                Mini-map · {visibleFloor === 'all' ? 'Cả 2 tầng' : `Tầng ${visibleFloor}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFollowAgentMode(false);
                  flyCameraTo(OVERVIEW_CAM_POS, OVERVIEW_LOOK_AT);
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                Toàn cảnh
              </button>
            </div>
            <div className="relative w-full h-36 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
              {ROOMS.filter((r) => (visibleFloor === 'all' ? r.floor === 1 : r.floor === visibleFloor)).map((room) => {
                const leftPct = ((room.center[0] + 13.2) / 26.4) * 100;
                const topPct = ((room.center[2] + 9.2) / 18.4) * 100;
                const wPct = (room.size[0] / 26.4) * 100;
                const hPct = (room.size[1] / 18.4) * 100;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => selectRoom(room.id)}
                    title={room.name}
                    className="absolute rounded border text-[8.5px] font-medium flex items-center justify-center truncate px-1 cursor-pointer hover:brightness-125"
                    style={{
                      left: `${leftPct - wPct / 2}%`,
                      top: `${topPct - hPct / 2}%`,
                      width: `${wPct}%`,
                      height: `${hPct}%`,
                      backgroundColor: `${room.color}28`,
                      borderColor: `${room.color}88`,
                      color: '#F1F5F9',
                    }}
                  >
                    <span className="truncate">{room.shortName}</span>
                  </button>
                );
              })}
              {filteredAgents.map((a) => {
                const pos = runtimes[a.id]?.currentPosition || a.deskPosition;
                const leftPct = ((pos[0] + 13.2) / 26.4) * 100;
                const topPct = ((pos[2] + 9.2) / 18.4) * 100;
                const isBlocked = runtimes[a.id]?.status === 'blocked';
                return (
                  <button
                    key={a.id}
                    type="button"
                    title={`${a.name} (${a.title})`}
                    onClick={() => selectAgent(a.id, true)}
                    className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full cursor-pointer border border-white/70"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      backgroundColor: isBlocked ? '#EF4444' : a.avatarColor,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/95 border border-slate-700/80 p-1 shadow-lg">
          {(['all', 1, 2] as const).map((fl) => (
            <button
              key={String(fl)}
              type="button"
              onClick={() => setVisibleFloor(fl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                visibleFloor === fl ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {fl === 'all' ? '2 Tầng' : `Tầng ${fl}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowLabels((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              showLabels ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Nhãn 3D
          </button>
          <button
            type="button"
            onClick={() => setShowMinimap((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              showMinimap ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Bản đồ
          </button>
        </div>
      </div>
    </div>
  );
}
