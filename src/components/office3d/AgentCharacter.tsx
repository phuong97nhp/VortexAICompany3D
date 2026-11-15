import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SafeHtml3D } from './SafeHtml3D';
import { AgentProfile } from '../../types';
import { useCompanyStore } from '../../store/useCompanyStore';
import { getDefaultAppearance } from '../../engine/characterAppearance';
import { ChibiModel } from './ChibiModel';
import { DEFAULT_BRAND_PALETTE, DEFAULT_LOGO_PUBLIC_PATH } from '../../brand/logoBrand';

// Module-scope reusable vector helpers (zero GC allocations inside useFrame)
const _sepAccum = new THREE.Vector3();
const _deltaVec = new THREE.Vector3();

const STATUS_VI: Record<string, { label: string; color: string }> = {
  idle: { label: 'Sẵn sàng', color: '#94A3B8' },
  sleeping: { label: 'Nghỉ tiết kiệm', color: '#64748B' },
  thinking: { label: 'Đang suy nghĩ', color: '#F59E0B' },
  typing: { label: 'Đang gõ...', color: '#38BDF8' },
  talking: { label: 'Đang trao đổi', color: '#10B981' },
  in_meeting: { label: 'Đang họp', color: '#EAB308' },
  walking: { label: 'Di chuyển', color: '#818CF8' },
  blocked: { label: 'Chờ CEO (!)', color: '#EF4444' },
  done: { label: 'Hoàn tất', color: '#22C55E' },
  error: { label: 'Lỗi xử lý', color: '#F43F5E' },
};

export function AgentCharacter({
  agent,
  showLabels,
}: {
  agent: AgentProfile;
  showLabels: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const prevPos = useRef(new THREE.Vector3(...agent.deskPosition));
  const facingYawRef = useRef(agent.deskRotationY || 0);
  const [hovered, setHovered] = useState(false);
  const [isFarLod, setIsFarLod] = useState(false);
  const [isVeryFarHud, setIsVeryFarHud] = useState(false);

  const { camera } = useThree();
  const runtime = useCompanyStore((s) => s.runtimes[agent.id]);
  const appearance = useCompanyStore((s) => s.agentAppearances[agent.id]) || getDefaultAppearance(agent);
  const selectedAgentId = useCompanyStore((s) => s.selectedAgentId);
  const selectAgent = useCompanyStore((s) => s.selectAgent);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const pendingAccountantCount = useCompanyStore(
    (s) => s.expenses.filter((e) => e.status === 'pending_accountant').length
  );
  const graphicsQuality = useCompanyStore((s) => s.settings.graphicsQuality);
  const paused = useCompanyStore((s) => s.settings.paused || s.settings.killSwitchActive);
  const brand = useCompanyStore((s) => s.settings.brand) || DEFAULT_BRAND_PALETTE;
  const envMode = useCompanyStore((s) => s.settings.envMode);
  const externalAccount = useCompanyStore((s) =>
    s.externalAccounts.find((e) => e.agentId === agent.id)
  );
  const isSpeaking = useCompanyStore((s) => s.voiceSpeakingAgentId === agent.id);
  const assignedDevice = useCompanyStore((s) =>
    s.managedDevices.find((d) => d.assignedAgentId === agent.id)
  );
  const deviceStatus = assignedDevice?.status;
  const isDeviceControlling =
    Boolean(assignedDevice) &&
    deviceStatus !== 'offline' &&
    deviceStatus !== 'unauthorized' &&
    (assignedDevice!.controlMode !== 'view_only' || assignedDevice!.isStreaming);
  const isDeviceDisconnected = Boolean(assignedDevice) && deviceStatus === 'offline';

  const isSelected = selectedAgentId === agent.id;
  const status = runtime?.status || 'idle';
  const statusInfo = STATUS_VI[status] || STATUS_VI.idle;
  const bubbleText = runtime?.bubbleText;
  const progressPct = runtime?.progressPercent ?? 0;
  const isDelayed = Boolean(runtime?.isDelayed);
  const isExiting = Boolean(runtime?.exiting);
  const isAccountantRole =
    agent.id === 'cfo' || agent.defaultPermissions.includes('expense:review');
  const pendingReviewCount =
    runtime?.pendingReviewCount ?? (isAccountantRole ? pendingAccountantCount : 0);

  useFrame((_, delta) => {
    if (!groupRef.current || !runtime) return;
    const target = runtime.currentPosition;
    const pos = groupRef.current.position;
    const d = Math.min(delta, 0.06);

    // Gentle social-separation steering when walking near peers on the same floor
    _sepAccum.set(0, 0, 0);
    if (status === 'walking') {
      const allRuntimes = useCompanyStore.getState().runtimes;
      for (const otherId of Object.keys(allRuntimes)) {
        if (otherId === agent.id) continue;
        const other = allRuntimes[otherId];
        if (!other || other.status === 'sleeping') continue;
        const dy = Math.abs(other.currentPosition[1] - target[1]);
        if (dy > 1.2) continue;
        const ox = target[0] - other.currentPosition[0];
        const oz = target[2] - other.currentPosition[2];
        const distSq = ox * ox + oz * oz;
        if (distSq > 0.0001 && distSq < 1.1) {
          const dist = Math.sqrt(distSq);
          const push = (1.05 - dist) * 0.42;
          _sepAccum.x += (ox / dist) * push;
          _sepAccum.z += (oz / dist) * push;
        }
      }
    }

    pos.x = THREE.MathUtils.damp(pos.x, target[0] + _sepAccum.x, 10, d);
    pos.y = THREE.MathUtils.damp(pos.y, target[1], 10, d);
    pos.z = THREE.MathUtils.damp(pos.z, target[2] + _sepAccum.z, 10, d);

    _deltaVec.set(target[0] - prevPos.current.x, 0, target[2] - prevPos.current.z);
    const dx = _deltaVec.x;
    const dz = _deltaVec.z;
    const moved = Math.hypot(dx, dz);

    if (status === 'walking' && moved > 0.002) {
      facingYawRef.current = Math.atan2(dx, dz);
      groupRef.current.rotation.y = facingYawRef.current;
    } else if (status === 'in_meeting') {
      // Face toward center of meeting table at [5.75, 0, -5.1]
      const lookYaw = Math.atan2(5.75 - pos.x, -5.1 - pos.z);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, lookYaw, 8, delta);
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        agent.deskRotationY || 0,
        8,
        delta
      );
    }

    prevPos.current.set(target[0], target[1], target[2]);

    // Distance-based LOD check with hysteresis
    const dist = camera.position.distanceTo(pos);
    if (!isFarLod && dist > 27) setIsFarLod(true);
    else if (isFarLod && dist < 25) setIsFarLod(false);
    if (!isVeryFarHud && dist > 53) setIsVeryFarHud(true);
    else if (isVeryFarHud && dist < 51) setIsVeryFarHud(false);
  });

  const shouldRenderHud =
    isSelected ||
    hovered ||
    status === 'blocked' ||
    status === 'error' ||
    isDelayed ||
    isExiting ||
    pendingReviewCount > 0 ||
    Boolean(bubbleText) ||
    (showLabels && !isVeryFarHud);

  const showDetailedHud = isSelected || hovered || !isFarLod;
  const shortName = agent.nickname || agent.name.split(' ').slice(-2).join(' ');

  return (
    <group
      ref={groupRef}
      name={`agent-${agent.id}`}
      userData={{ agentId: agent.id, roomId: agent.roomId }}
      position={agent.deskPosition}
      onClick={(e) => {
        e.stopPropagation();
        selectAgent(agent.id, true);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Selection / Status Glow Ring at Feet */}
      <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            0.36,
            isSelected || runtime?.isPostingSocial || isDelayed ? 0.56 : hovered ? 0.48 : 0.43,
            24,
          ]}
        />
        <meshBasicMaterial
          color={
            isDelayed
              ? '#F59E0B'
              : runtime?.isPostingSocial
              ? '#EC4899'
              : isSelected
              ? '#38BDF8'
              : status === 'blocked' || status === 'error'
              ? '#EF4444'
              : status === 'sleeping'
              ? '#64748B'
              : agent.avatarColor
          }
          transparent
          opacity={
            runtime?.isPostingSocial || isSelected || isDelayed
              ? 0.95
              : hovered
              ? 0.85
              : status === 'sleeping'
              ? 0.35
              : 0.6
          }
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Humanized Stylized Character */}
      <ChibiModel
        appearance={appearance}
        status={status}
        isSpeaking={isSpeaking}
        isPostingSocial={Boolean(runtime?.isPostingSocial)}
        isControllingDevice={isDeviceControlling}
        simplifiedLod={graphicsQuality === 'low' || isFarLod}
        showOutline={graphicsQuality !== 'low'}
        paused={paused}
        brandLogoDataUrl={brand.logoDataUrl}
        brandPrimary={brand.primaryColor}
        brandSecondary={brand.secondaryColor}
      />

      {/* Glowing Android Smartphone Indicator when device assigned to agent */}
      {assignedDevice && (
        <group
          position={[0.42, 0.84, 0.48]}
          rotation={[-0.35, 0.25, 0]}
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('devices');
          }}
        >
          <mesh>
            <boxGeometry args={[0.11, 0.19, 0.022]} />
            <meshStandardMaterial
              color={isDeviceDisconnected ? '#475569' : '#0F172A'}
              roughness={0.35}
              metalness={0.45}
            />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <planeGeometry args={[0.092, 0.165]} />
            <meshStandardMaterial
              color={isDeviceDisconnected ? '#F59E0B' : isDeviceControlling ? '#10B981' : '#0EA5E9'}
              emissive={isDeviceDisconnected ? '#F59E0B' : isDeviceControlling ? '#22C55E' : '#38BDF8'}
              emissiveIntensity={isDeviceDisconnected ? 0.5 : isDeviceControlling ? 1.35 : 0.7}
            />
          </mesh>
        </group>
      )}

      {/* Rounded Head HUD & Speech Bubble */}
      {shouldRenderHud && (
        <SafeHtml3D
          position={[0, 1.88, 0]}
          center
          distanceFactor={16}
          zIndexRange={[8, 0]}
          style={{ pointerEvents: pendingReviewCount > 0 ? 'auto' : 'none' }}
        >
          <div className="flex flex-col items-center gap-1 select-none whitespace-nowrap">
            {isExiting && (
              <div className="px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300 text-[10px] font-semibold border border-amber-500/60 shadow">
                Bàn giao & rời văn phòng
              </div>
            )}
            {status === 'sleeping' && !isExiting && (
              <div className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-slate-400 text-[9.5px] font-mono border border-slate-700 shadow">
                Zzz · Chế độ nghỉ
              </div>
            )}
            {isDelayed && (
              <div className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold shadow border border-amber-300">
                TRỄ HẠN · Đang kiểm tra
              </div>
            )}
            {pendingReviewCount > 0 && isAccountantRole && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('finance');
                }}
                className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold shadow border border-indigo-300/70 cursor-pointer"
              >
                {pendingReviewCount} phiếu chi chờ kiểm tra
              </button>
            )}
            {/* Speech Bubble / Blocked Alert with tail */}
            {status === 'blocked' && (
              <div className="relative px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold shadow-lg border border-rose-300/70">
                ! CẦN CEO TRẢ LỜI
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-rose-600 border-r border-b border-rose-300/70" />
              </div>
            )}
            {bubbleText && status !== 'blocked' && (
              <div className="relative max-w-[180px] truncate px-2 py-0.5 rounded-lg bg-slate-900 text-slate-100 text-[10px] border border-sky-400/60 shadow-lg">
                {bubbleText}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-sky-400/60" />
              </div>
            )}

            {/* Hover Tooltip */}
            {hovered && !isSelected && (
              <div className="px-2 py-0.5 rounded-md bg-slate-900 text-sky-300 text-[9px] border border-sky-500/40 shadow">
                Bấm để xem hồ sơ · {agent.title}
              </div>
            )}

            {/* Rounded Head HUD Card */}
            <div
              className={`flex items-center gap-1 rounded-lg shadow-md border transition-colors ${
                isSelected
                  ? 'px-2 py-0.5 bg-sky-700 text-white border-sky-300'
                  : 'px-1.5 py-0.5 bg-slate-950/95 text-slate-100 border-slate-700'
              }`}
            >
              <img
                src={brand.logoDataUrl || DEFAULT_LOGO_PUBLIC_PATH}
                alt="Logo"
                className="w-3.5 h-3.5 rounded-sm bg-white p-[1px] object-contain shrink-0"
              />
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1 text-[10px] font-semibold">
                  <span className="max-w-[90px] truncate">{shortName}</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: statusInfo.color }}
                  />
                  {envMode !== 'sandbox' && (!externalAccount || externalAccount.status !== 'active') && (
                    <span className="px-1 py-0 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[8px] font-mono">
                      Chưa có TK
                    </span>
                  )}
                </div>
                {showDetailedHud && (
                  <div className="flex items-center gap-1 text-[8.5px] text-slate-300 max-w-[130px] truncate">
                    <span className="truncate">{agent.title}</span>
                    <span>·</span>
                    <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                  </div>
                )}
                {showDetailedHud && progressPct > 0 && progressPct < 100 && (
                  <div className="w-full h-1 mt-0.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </SafeHtml3D>
      )}
    </group>
  );
}
