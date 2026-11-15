import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { MEETING_SEATS } from '../../engine/waypoints';
import { useCompanyStore } from '../../store/useCompanyStore';
import { KpiScreen3D } from './KpiScreen3D';
import { DEFAULT_BRAND_PALETTE, getSharedLogoTexture } from '../../brand/logoBrand';

const MEETING_ROOM_RENDER = {
  id: 'room-meeting',
  name: 'Phòng Họp Lớn',
  shortName: 'Phòng Họp',
  floor: 1 as const,
  center: [5.75, 0, -5.1] as [number, number, number],
  size: [14.5, 7.8] as [number, number],
  color: '#EAB308',
};

function SalesDealBell({ celebrationNonce }: { celebrationNonce: number }) {
  const bellRef = useRef<THREE.Group>(null);
  const ringUntilRef = useRef(0);
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    if (celebrationNonce > 0) {
      ringUntilRef.current = Date.now() + 3600;
      setRinging(true);
      const timer = setTimeout(() => setRinging(false), 3600);
      return () => clearTimeout(timer);
    }
  }, [celebrationNonce]);

  useFrame((state) => {
    if (!bellRef.current) return;
    if (Date.now() < ringUntilRef.current) {
      bellRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 28) * 0.25;
    } else {
      bellRef.current.rotation.z = THREE.MathUtils.damp(bellRef.current.rotation.z, 0, 8, 0.05);
    }
  });

  return (
    <group position={[11.6, 0, 5.1]}>
      <mesh position={[0.45, 1.45, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[2.6, 1.35, 0.1]} />
        <meshStandardMaterial color="#0F172A" roughness={0.35} />
      </mesh>
      <mesh position={[0.38, 1.45, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.35, 1.1]} />
        <meshStandardMaterial
          color="#047857"
          emissive={ringing ? '#F59E0B' : '#10B981'}
          emissiveIntensity={ringing ? 0.65 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[-0.35, 0.55, 1.55]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 1.1, 12]} />
        <meshStandardMaterial color="#78350F" roughness={0.5} />
      </mesh>
      <group ref={bellRef} position={[-0.35, 1.22, 1.55]}>
        <mesh castShadow>
          <coneGeometry args={[0.2, 0.26, 16]} />
          <meshStandardMaterial
            color="#FBBF24"
            metalness={0.75}
            roughness={0.22}
            emissive={ringing ? '#F59E0B' : '#92400E'}
            emissiveIntensity={ringing ? 0.8 : 0.15}
          />
        </mesh>
      </group>
      {ringing && (
        <Html position={[-0.35, 1.9, 1.55]} center distanceFactor={16}>
          <div className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] shadow-lg whitespace-nowrap">
            CHỐT DEAL MỚI!
          </div>
        </Html>
      )}
    </group>
  );
}

function PottedPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.17, 0.48, 10]} />
        <meshStandardMaterial color="#9A3412" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <dodecahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial color="#16A34A" roughness={0.65} />
      </mesh>
    </group>
  );
}

function PartitionWall({
  position,
  args,
  color,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
    </mesh>
  );
}

function AnimatedElevator({ showF1, showF2, showF3 }: { showF1: boolean; showF2: boolean; showF3: boolean }) {
  const cabinRef = useRef<THREE.Group>(null);
  const targetYRef = useRef(0.1);

  useFrame((state, delta) => {
    if (!cabinRef.current) return;
    const runtimes = useCompanyStore.getState().runtimes;
    let activeElevY: number | null = null;
    for (const rt of Object.values(runtimes)) {
      if (rt.status === 'walking' && Math.abs(rt.currentPosition[0] + 2.8) < 2.2 && Math.abs(rt.currentPosition[2]) < 1.8) {
        activeElevY = rt.currentPosition[1];
        break;
      }
    }
    if (activeElevY !== null) {
      targetYRef.current = activeElevY;
    } else {
      const cycle = Math.floor((state.clock.elapsedTime / 7) % 3);
      targetYRef.current = cycle === 0 ? 0 : cycle === 1 ? 3.8 : 7.6;
    }
    cabinRef.current.position.y = THREE.MathUtils.damp(cabinRef.current.position.y, targetYRef.current, 4.5, Math.min(delta, 0.08));
  });

  if (!showF1 && !showF2 && !showF3) return null;
  const maxShaftH = showF3 ? 10.6 : showF2 ? 6.8 : 3.2;

  return (
    <group position={[-4.45, 0, 0]}>
      {/* Glass Elevator Shaft Frame */}
      <mesh position={[0, maxShaftH / 2, 0]}>
        <boxGeometry args={[1.35, maxShaftH, 1.35]} />
        <meshStandardMaterial color="#38BDF8" transparent opacity={0.14} roughness={0.1} metalness={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[-0.65, maxShaftH / 2, -0.65]}>
        <boxGeometry args={[0.07, maxShaftH, 0.07]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.65, maxShaftH / 2, -0.65]}>
        <boxGeometry args={[0.07, maxShaftH, 0.07]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
      </mesh>

      {/* Moving Cabin */}
      <group ref={cabinRef} position={[0, 0, 0]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[1.18, 0.12, 1.18]} />
          <meshStandardMaterial color="#0F172A" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[1.14, 1.88, 1.14]} />
          <meshStandardMaterial color="#0EA5E9" emissive="#0EA5E9" emissiveIntensity={0.22} transparent opacity={0.34} />
        </mesh>
        <mesh position={[0, 2.02, 0]}>
          <boxGeometry args={[1.18, 0.08, 1.18]} />
          <meshStandardMaterial color="#1E293B" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export function OfficeArchitecture({ visibleFloor }: { visibleFloor: 'all' | 1 | 2 | 3 }) {
  const selectRoom = useCompanyStore((s) => s.selectRoom);
  const selectedRoomId = useCompanyStore((s) => s.selectedRoomId);
  const openSpotCheck = useCompanyStore((s) => s.openSpotCheck);
  const setMonitorWallOpen = useCompanyStore((s) => s.setMonitorWallOpen);
  const handoverTickets = useCompanyStore((s) => s.handoverTickets);
  const dayNightMode = useCompanyStore((s) => s.settings.dayNightMode);
  const dealCelebrationNonce = useCompanyStore((s) => s.dealCelebrationNonce);
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const expenses = useCompanyStore((s) => s.expenses);
  const brand = useCompanyStore((s) => s.settings.brand) || DEFAULT_BRAND_PALETTE;
  const isNight = dayNightMode === 'night';

  const sharedOfficeLogoTex = useMemo(
    () => getSharedLogoTexture(brand.logoDataUrl, brand.primaryColor, brand.secondaryColor),
    [brand.logoDataUrl, brand.primaryColor, brand.secondaryColor]
  );

  const showF1 = visibleFloor === 'all' || visibleFloor === 1;
  const showF2 = visibleFloor === 'all' || visibleFloor === 2;
  const showF3 = visibleFloor === 'all' || visibleFloor === 3;

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const deptColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of departments) map[d.id] = d.color;
    return map;
  }, [departments]);

  const cfoPendingExpenses = useMemo(
    () => expenses.filter((e) => e.status === 'pending_accountant').length,
    [expenses]
  );
  const cfoAgent = useMemo(
    () =>
      activeAgents.find((a) => a.id === 'cfo') ||
      activeAgents.find((a) => a.defaultPermissions.includes('expense:review')),
    [activeAgents]
  );

  const filteredDesks = useMemo(() => {
    const all: Array<{
      agentId?: string;
      floor: 1 | 2 | 3;
      pos: [number, number, number];
      rotY: number;
      color: string;
    }> = [
      ...activeAgents.map((a) => ({
        agentId: a.id,
        floor: a.floor,
        pos: a.deskPosition,
        rotY: a.deskRotationY || 0,
        color: deptColorMap[a.department] || a.avatarColor,
      })),
      // Dedicated CEO Executive Desk inside room-exec (Floor 2)
      {
        floor: 2 as const,
        pos: [-9.0, 3.8, -7.2] as [number, number, number],
        rotY: 0,
        color: '#F59E0B',
      },
    ];
    return all.filter((d) => (visibleFloor === 'all' ? true : d.floor === visibleFloor));
  }, [activeAgents, deptColorMap, visibleFloor]);

  // Compute dynamic horizontal slab bounds to seamlessly support custom depts & annex desks
  const wingBounds = useMemo(() => {
    let minX = -13.2;
    let maxX = 13.2;
    let minZ = -9.2;
    let maxZ = 9.2;

    for (const d of departments) {
      const hw = (d.roomSize?.[0] || 8) / 2 + 0.5;
      const hd = (d.roomSize?.[1] || 8) / 2 + 0.5;
      minX = Math.min(minX, d.roomCenter[0] - hw);
      maxX = Math.max(maxX, d.roomCenter[0] + hw);
      minZ = Math.min(minZ, d.roomCenter[2] - hd);
      maxZ = Math.max(maxZ, d.roomCenter[2] + hd);
    }

    for (const a of activeAgents) {
      minX = Math.min(minX, a.deskPosition[0] - 1.8);
      maxX = Math.max(maxX, a.deskPosition[0] + 1.8);
      minZ = Math.min(minZ, a.deskPosition[2] - 1.8);
      maxZ = Math.max(maxZ, a.deskPosition[2] + 1.8);
    }

    const width = maxX - minX;
    const depth = maxZ - minZ;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    return { minX, maxX, minZ, maxZ, width, depth, cx, cz };
  }, [departments, activeAgents]);

  const allRooms = useMemo(() => {
    const deptRooms = departments.map((d) => ({
      id: d.roomId,
      name: d.name,
      shortName: d.shortName,
      floor: d.floor,
      center: d.roomCenter,
      size: d.roomSize,
      color: d.color,
      isCustom: Boolean(d.isCustom),
    }));
    return [...deptRooms, { ...MEETING_ROOM_RENDER, isCustom: false }];
  }, [departments]);

  const deskMeshRef = useRef<THREE.InstancedMesh>(null);
  const deskLegMeshRef = useRef<THREE.InstancedMesh>(null);
  const monitorMeshRef = useRef<THREE.InstancedMesh>(null);
  const chairMeshRef = useRef<THREE.InstancedMesh>(null);
  const mugMeshRef = useRef<THREE.InstancedMesh>(null);
  const nameplateMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    filteredDesks.forEach((d, idx) => {
      const forwardX = Math.sin(d.rotY);
      const forwardZ = Math.cos(d.rotY);
      const rightX = Math.cos(d.rotY);
      const rightZ = -Math.sin(d.rotY);

      dummy.position.set(d.pos[0] + forwardX * 0.78, d.pos[1] + 0.74, d.pos[2] + forwardZ * 0.78);
      dummy.rotation.set(0, d.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      deskMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(d.pos[0] + forwardX * 0.78, d.pos[1] + 0.36, d.pos[2] + forwardZ * 0.78);
      dummy.updateMatrix();
      deskLegMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(d.pos[0] + forwardX * 0.88, d.pos[1] + 1.04, d.pos[2] + forwardZ * 0.88);
      dummy.updateMatrix();
      monitorMeshRef.current?.setMatrixAt(idx, dummy.matrix);
      color.set(d.color);
      monitorMeshRef.current?.setColorAt(idx, color);

      dummy.position.set(d.pos[0] - forwardX * 0.28, d.pos[1] + 0.32, d.pos[2] - forwardZ * 0.28);
      dummy.updateMatrix();
      chairMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(
        d.pos[0] + forwardX * 0.72 + rightX * 0.48,
        d.pos[1] + 0.84,
        d.pos[2] + forwardZ * 0.72 + rightZ * 0.48
      );
      dummy.updateMatrix();
      mugMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(
        d.pos[0] + forwardX * 0.68 - rightX * 0.46,
        d.pos[1] + 0.82,
        d.pos[2] + forwardZ * 0.68 - rightZ * 0.46
      );
      dummy.updateMatrix();
      nameplateMeshRef.current?.setMatrixAt(idx, dummy.matrix);
      nameplateMeshRef.current?.setColorAt(idx, color);
    });

    [deskMeshRef, deskLegMeshRef, monitorMeshRef, chairMeshRef, mugMeshRef, nameplateMeshRef].forEach((ref) => {
      if (ref.current) {
        ref.current.count = filteredDesks.length;
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
        ref.current.computeBoundingSphere();
      }
    });
  }, [filteredDesks]);

  const groundColor = isNight ? '#1E293B' : '#94A3B8';
  const floor1Color = isNight ? '#334155' : '#E2E8F0';
  const floor2Color = isNight ? '#3B4963' : '#F1F5F9';
  const floor3Color = isNight ? '#312E59' : '#EEF2FF';
  const wallColor = isNight ? '#475569' : '#CBD5E1';
  const wallTrimColor = isNight ? '#64748B' : '#64748B';
  const corridorColor = isNight ? '#283548' : '#CBD5E1';

  const renderFloorPartitions = (baseY: number, floorNum: 1 | 2 | 3) => {
    const h = 2.4;
    const cy = baseY + h / 2;

    return (
      <group>
        <PartitionWall position={[0, cy, -9.05]} args={[26.2, h, 0.14]} color={wallColor} />
        <PartitionWall position={[-13.05, cy, 0]} args={[0.14, h, 18.2]} color={wallColor} />
        <PartitionWall position={[13.05, cy, 0]} args={[0.14, h, 18.2]} color={wallColor} />
        <PartitionWall position={[0, baseY + 0.3, 9.05]} args={[26.2, 0.6, 0.14]} color={wallTrimColor} />
        <mesh position={[0, baseY + 0.78, 9.05]}>
          <boxGeometry args={[26.0, 0.36, 0.05]} />
          <meshStandardMaterial color="#7DD3FC" transparent opacity={0.35} roughness={0.15} metalness={0.2} />
        </mesh>

        <mesh position={[0, baseY + 0.015, 0]} receiveShadow>
          <boxGeometry args={[25.8, 0.02, 2.25]} />
          <meshStandardMaterial color={corridorColor} roughness={0.75} />
        </mesh>

        {floorNum === 1 && (
          <>
            <PartitionWall position={[-10.575, cy, -1.2]} args={[4.85, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-0.75, cy, -1.2]} args={[11.2, h, 0.12]} color={wallColor} />
            <PartitionWall position={[9.825, cy, -1.2]} args={[6.35, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-1.5, cy, -5.1]} args={[0.12, h, 7.8]} color={wallColor} />

            <PartitionWall position={[-11.45, cy, 1.2]} args={[3.1, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-2.5, cy, 1.2]} args={[11.2, h, 0.12]} color={wallColor} />
            <PartitionWall position={[8.95, cy, 1.2]} args={[8.1, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-5.0, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
          </>
        )}

        {floorNum === 2 && (
          <>
            {/* North corridor z=-1.2 */}
            <PartitionWall position={[-11.2, cy, -1.2]} args={[3.6, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-2.0, cy, -1.2]} args={[11.2, h, 0.12]} color={wallColor} />
            <PartitionWall position={[9.2, cy, -1.2]} args={[7.6, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-4.0, cy, -5.1]} args={[0.12, h, 7.8]} color={wallColor} />

            {/* South corridor z=1.2 with doorway gaps for Product, Data, Backoffice, Legal */}
            <PartitionWall position={[-11.1, cy, 1.2]} args={[3.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-5.9, cy, 1.2]} args={[3.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-2.75, cy, 1.2]} args={[2.5, h, 0.12]} color={wallColor} />
            <PartitionWall position={[1.15, cy, 1.2]} args={[2.5, h, 0.12]} color={wallColor} />
            <PartitionWall position={[3.6, cy, 1.2]} args={[2.4, h, 0.12]} color={wallColor} />
            <PartitionWall position={[7.4, cy, 1.2]} args={[2.4, h, 0.12]} color={wallColor} />
            <PartitionWall position={[9.35, cy, 1.2]} args={[1.5, h, 0.12]} color={wallColor} />
            <PartitionWall position={[12.25, cy, 1.2]} args={[1.5, h, 0.12]} color={wallColor} />
            {/* South room dividers */}
            <PartitionWall position={[-4.0, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
            <PartitionWall position={[2.4, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
            <PartitionWall position={[8.6, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
          </>
        )}

        {floorNum === 3 && (
          <>
            {/* North corridor z=-1.2 for Exec, Research, Analytics */}
            <PartitionWall position={[-11.35, cy, -1.2]} args={[3.3, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-6.65, cy, -1.2]} args={[3.3, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-3.1, cy, -1.2]} args={[3.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[2.1, cy, -1.2]} args={[3.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[5.9, cy, -1.2]} args={[3.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[11.1, cy, -1.2]} args={[3.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-5.0, cy, -5.1]} args={[0.12, h, 7.8]} color={wallColor} />
            <PartitionWall position={[4.0, cy, -5.1]} args={[0.12, h, 7.8]} color={wallColor} />

            {/* South corridor z=1.2 for Creative Studio & Channel/CRO */}
            <PartitionWall position={[-10.1, cy, 1.2]} args={[5.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-2.9, cy, 1.2]} args={[5.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[2.9, cy, 1.2]} args={[5.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[10.1, cy, 1.2]} args={[5.8, h, 0.12]} color={wallColor} />
            <PartitionWall position={[0, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
          </>
        )}
      </group>
    );
  };

  const renderStairFlight = (baseY: number) => (
    <group position={[-2.8, baseY, 0]}>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          position={[-1.0 + i * 0.18, 0.16 + i * 0.31, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.24, 0.14, 1.55]} />
          <meshStandardMaterial color="#64748B" roughness={0.45} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, -0.78]} rotation={[0, 0, 1.02]}>
        <boxGeometry args={[4.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 2.05, 0.78]} rotation={[0, 0, 1.02]}>
        <boxGeometry args={[4.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );

  return (
    <group name="office-building-wrapper">
      <group name="shared-structure" userData={{ roomId: 'shared-structure' }}>
        {/* Exterior Ground Plaza */}
        <mesh position={[wingBounds.cx, -0.24, wingBounds.cz]} receiveShadow>
          <boxGeometry args={[Math.max(38, wingBounds.width + 11.6), 0.24, Math.max(28, wingBounds.depth + 9.6)]} />
          <meshStandardMaterial color={groundColor} roughness={0.85} />
        </mesh>

        {/* Animated 3-Floor Glass Elevator */}
        <AnimatedElevator showF1={showF1} showF2={showF2} showF3={showF3} />

        {/* FLOOR 1 STRUCTURE */}
        {showF1 && (
          <group>
            <mesh position={[wingBounds.cx, -0.08, wingBounds.cz]} receiveShadow>
              <boxGeometry args={[wingBounds.width, 0.16, wingBounds.depth]} />
              <meshStandardMaterial color={floor1Color} roughness={0.7} metalness={0.08} />
            </mesh>

            {renderFloorPartitions(0, 1)}
            {renderStairFlight(0)}

            {/* Pantry / Coffee Corner */}
            <group position={[-11.8, 0, 0]}>
              <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.6, 0.96, 1.4]} />
                <meshStandardMaterial color="#92400E" roughness={0.55} />
              </mesh>
              <mesh position={[0.2, 1.18, -0.25]} castShadow>
                <boxGeometry args={[0.45, 0.45, 0.45]} />
                <meshStandardMaterial color="#DC2626" roughness={0.3} metalness={0.4} />
              </mesh>
              <mesh position={[-0.75, 0.95, 0.2]} castShadow>
                <boxGeometry args={[0.72, 1.9, 0.75]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.25} metalness={0.55} />
              </mesh>
            </group>
          </group>
        )}

        {/* FLOOR 2 STRUCTURE */}
        {showF2 && (
          <group>
            <mesh position={[wingBounds.cx, 3.72, wingBounds.cz]} receiveShadow>
              <boxGeometry args={[wingBounds.width, 0.16, wingBounds.depth]} />
              <meshStandardMaterial
                color={floor2Color}
                roughness={0.62}
                metalness={0.1}
                transparent={visibleFloor === 'all'}
                opacity={visibleFloor === 'all' ? 0.34 : 1}
                depthWrite={visibleFloor !== 'all'}
              />
            </mesh>
            {renderFloorPartitions(3.8, 2)}
            {renderStairFlight(3.8)}
          </group>
        )}

        {/* FLOOR 3 STRUCTURE (Khối Affiliate) */}
        {showF3 && (
          <group>
            <mesh position={[wingBounds.cx, 7.52, wingBounds.cz]} receiveShadow>
              <boxGeometry args={[wingBounds.width, 0.16, wingBounds.depth]} />
              <meshStandardMaterial
                color={floor3Color}
                roughness={0.58}
                metalness={0.12}
                transparent={visibleFloor === 'all'}
                opacity={visibleFloor === 'all' ? 0.32 : 1}
                depthWrite={visibleFloor !== 'all'}
              />
            </mesh>
            {renderFloorPartitions(7.6, 3)}
          </group>
        )}
      </group>

      {/* FLOOR 1 ROOMS & DEDICATED FURNITURE */}
      {showF1 && (
        <>
          <group name="room-reception" userData={{ roomId: 'room-reception' }}>
            <mesh position={[-8.1, 0.55, 5.1]} castShadow receiveShadow>
              <boxGeometry args={[0.85, 1.1, 3.4]} />
              <meshStandardMaterial color="#F97316" roughness={0.38} metalness={0.18} />
            </mesh>
            <mesh position={[-11.8, 0.35, 6.8]} castShadow>
              <boxGeometry args={[1.0, 0.7, 2.4]} />
              <meshStandardMaterial color="#334155" roughness={0.65} />
            </mesh>
            <mesh position={[-10.4, 0.25, 6.8]} castShadow>
              <boxGeometry args={[0.7, 0.45, 1.2]} />
              <meshStandardMaterial color="#78350F" roughness={0.5} />
            </mesh>
            <mesh position={[-12.88, 1.65, 5.1]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[2.8, 1.1, 0.08]} />
              <meshStandardMaterial color="#0F172A" emissive={brand.primaryColor} emissiveIntensity={0.22} />
            </mesh>
            {sharedOfficeLogoTex && (
              <>
                <mesh position={[-12.82, 1.65, 5.1]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[0.85, 0.85]} />
                  <meshBasicMaterial map={sharedOfficeLogoTex} transparent polygonOffset polygonOffsetFactor={-2} />
                </mesh>
                <mesh position={[-7.65, 0.62, 5.1]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[0.62, 0.62]} />
                  <meshBasicMaterial map={sharedOfficeLogoTex} transparent polygonOffset polygonOffsetFactor={-2} />
                </mesh>
              </>
            )}
            <PottedPlant position={[-12.3, 0, 8.3]} />
            <PottedPlant position={[-5.7, 0, 8.3]} />
          </group>

          <group name="room-sales" userData={{ roomId: 'room-sales' }}>
            <SalesDealBell celebrationNonce={dealCelebrationNonce} />
            <PottedPlant position={[-4.2, 0, 8.3]} />
            <PottedPlant position={[12.3, 0, 8.3]} />
          </group>

          <group name="room-cs" userData={{ roomId: 'room-cs' }}>
            <group position={[-12.55, 0.95, -5.1]}>
              <mesh castShadow>
                <boxGeometry args={[0.45, 1.75, 1.5]} />
                <meshStandardMaterial color="#0F172A" roughness={0.4} metalness={0.35} />
              </mesh>
              {[-0.45, -0.15, 0.15, 0.45].map((z, idx) => (
                <mesh key={idx} position={[0.25, 0.35, z]}>
                  <sphereGeometry args={[0.065, 10, 10]} />
                  <meshStandardMaterial
                    color={idx % 2 === 0 ? '#06B6D4' : '#10B981'}
                    emissive={idx % 2 === 0 ? '#06B6D4' : '#10B981'}
                    emissiveIntensity={0.85}
                  />
                </mesh>
              ))}
            </group>
            <PottedPlant position={[-12.3, 0, -8.3]} />
          </group>

          <group name="room-meeting" userData={{ roomId: 'room-meeting' }}>
            <group position={[5.75, 0, -5.1]}>
              <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[2.0, 2.0, 0.12, 28]} />
                <meshStandardMaterial color="#92400E" roughness={0.42} metalness={0.1} />
              </mesh>
              <mesh position={[0, 0.36, 0]} castShadow>
                <cylinderGeometry args={[0.38, 0.52, 0.72, 16]} />
                <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.45} />
              </mesh>
              <mesh position={[0, 1.75, -3.75]} castShadow>
                <boxGeometry args={[4.4, 2.1, 0.12]} />
                <meshStandardMaterial color="#0F172A" roughness={0.3} />
              </mesh>
              <mesh position={[0, 1.75, -3.67]}>
                <planeGeometry args={[4.1, 1.82]} />
                <meshStandardMaterial color="#1E3A8A" emissive="#0EA5E9" emissiveIntensity={0.22} side={THREE.DoubleSide} />
              </mesh>
              {sharedOfficeLogoTex && (
                <mesh position={[0, 1.75, -3.65]}>
                  <planeGeometry args={[0.92, 0.92]} />
                  <meshBasicMaterial map={sharedOfficeLogoTex} transparent polygonOffset polygonOffsetFactor={-2} />
                </mesh>
              )}
            </group>
            {MEETING_SEATS.map((seat, i) => (
              <mesh key={i} position={[seat[0], 0.32, seat[2]]} castShadow>
                <cylinderGeometry args={[0.24, 0.24, 0.48, 12]} />
                <meshStandardMaterial color="#334155" roughness={0.6} />
              </mesh>
            ))}
            <PottedPlant position={[-0.8, 0, -8.3]} />
            <PottedPlant position={[12.3, 0, -8.3]} />
          </group>
        </>
      )}

      {/* FLOOR 2 ROOMS & DEDICATED FURNITURE */}
      {showF2 && (
        <>
          <group name="room-exec" userData={{ roomId: 'room-exec' }}>
            <mesh position={[-12.2, 4.15, -5.1]} castShadow>
              <boxGeometry args={[0.95, 0.68, 2.4]} />
              <meshStandardMaterial color="#78350F" roughness={0.55} />
            </mesh>
            <mesh position={[-12.35, 4.7, -8.1]} castShadow>
              <boxGeometry args={[0.55, 1.8, 1.4]} />
              <meshStandardMaterial color="#451A03" roughness={0.6} />
            </mesh>
            {/* Clickable 24/7 Monitor Wall in Exec Room */}
            <group
              position={[-8.5, 5.25, -8.86]}
              onClick={(e) => {
                e.stopPropagation();
                setMonitorWallOpen(true);
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <mesh castShadow>
                <boxGeometry args={[3.4, 1.6, 0.1]} />
                <meshStandardMaterial color="#0F172A" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0, 0.06]}>
                <planeGeometry args={[3.15, 1.35]} />
                <meshStandardMaterial color="#0284C7" emissive="#38BDF8" emissiveIntensity={0.45} side={THREE.DoubleSide} />
              </mesh>
            </group>
            <PottedPlant position={[-4.6, 3.8, -8.3]} />
          </group>

          <group name="room-marketing" userData={{ roomId: 'room-marketing' }}>
            <group position={[4.5, 3.8, -8.85]}>
              <mesh position={[0, 1.55, 0]} castShadow>
                <boxGeometry args={[5.2, 1.9, 0.12]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
              </mesh>
              {['#EC4899', '#F59E0B', '#38BDF8', '#10B981', '#A855F7'].map((col, idx) => (
                <mesh key={col} position={[-1.8 + idx * 0.9, 1.6, 0.08]}>
                  <boxGeometry args={[0.56, 0.56, 0.03]} />
                  <meshStandardMaterial color={col} roughness={0.45} />
                </mesh>
              ))}
            </group>
            <group position={[11.8, 3.8, -5.1]}>
              <mesh position={[0, 0.75, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.18, 1.5, 10]} />
                <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.5} />
              </mesh>
              <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.28, 0.035, 8, 20]} />
                <meshStandardMaterial color="#F8FAFC" emissive="#F472B6" emissiveIntensity={0.65} />
              </mesh>
            </group>
            <PottedPlant position={[12.3, 3.8, -8.3]} />
          </group>

          <group name="room-product" userData={{ roomId: 'room-product' }}>
            <mesh position={[-12.88, 5.35, 5.1]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <boxGeometry args={[3.2, 1.6, 0.08]} />
              <meshStandardMaterial color="#1E1B4B" roughness={0.35} />
            </mesh>
            <mesh position={[-4.55, 4.75, 7.9]} castShadow>
              <boxGeometry args={[0.75, 1.9, 0.85]} />
              <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.6} />
            </mesh>
            <PottedPlant position={[-12.3, 3.8, 8.3]} />
          </group>

          <group name="room-data" userData={{ roomId: 'room-data' }}>
            <KpiScreen3D position={[-0.8, 3.8, 2.25]} />
            <PottedPlant position={[1.8, 3.8, 8.3]} />
          </group>

          <group name="room-backoffice" userData={{ roomId: 'room-backoffice' }}>
            <mesh position={[7.7, 4.55, 7.8]} castShadow>
              <boxGeometry args={[1.05, 1.5, 0.9]} />
              <meshStandardMaterial color="#312E81" roughness={0.28} metalness={0.75} />
            </mesh>
            <mesh position={[7.8, 4.45, 2.8]} castShadow>
              <boxGeometry args={[0.7, 1.3, 1.1]} />
              <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.35} />
            </mesh>
            <PottedPlant position={[3.2, 3.8, 8.3]} />
            {cfoPendingExpenses > 0 && cfoAgent && (
              <mesh position={[cfoAgent.deskPosition[0], cfoAgent.deskPosition[1] + 1.5, cfoAgent.deskPosition[2]]}>
                <cylinderGeometry args={[0.08, 0.08, 0.14, 12]} />
                <meshStandardMaterial color="#6366F1" emissive="#6366F1" emissiveIntensity={0.85} />
              </mesh>
            )}
          </group>

          {/* ROOM LEGAL (Tầng 2, x=8.6..13.0) */}
          <group name="room-legal" userData={{ roomId: 'room-legal' }}>
            {/* Vietnamese Legal Library Bookshelf */}
            <mesh position={[12.55, 4.75, 5.1]} castShadow>
              <boxGeometry args={[0.5, 1.85, 2.6]} />
              <meshStandardMaterial color="#4C1D95" roughness={0.5} />
            </mesh>
            {/* Scales of Justice Emblem on Pedestal */}
            <group position={[9.2, 3.8, 8.2]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.24, 0.9, 12]} />
                <meshStandardMaterial color="#1E1B4B" roughness={0.4} metalness={0.5} />
              </mesh>
              <mesh position={[0, 1.05, 0]} castShadow>
                <boxGeometry args={[0.52, 0.05, 0.05]} />
                <meshStandardMaterial color="#FBBF24" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
            <PottedPlant position={[12.3, 3.8, 8.3]} />
          </group>
        </>
      )}

      {/* FLOOR 3 ROOMS & DEDICATED AFFILIATE FURNITURE */}
      {showF3 && (
        <>
          <group name="room-aff-exec" userData={{ roomId: 'room-aff-exec' }}>
            <mesh position={[-12.4, 9.25, -5.1]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <boxGeometry args={[2.8, 1.3, 0.1]} />
              <meshStandardMaterial color="#0F172A" emissive="#F43F5E" emissiveIntensity={0.25} />
            </mesh>
            <PottedPlant position={[-12.3, 7.6, -8.3]} />
          </group>

          <group name="room-aff-research" userData={{ roomId: 'room-aff-research' }}>
            {/* Trend Radar & Winning Product Board */}
            <mesh position={[-0.5, 9.15, -8.85]} castShadow>
              <boxGeometry args={[4.2, 1.75, 0.12]} />
              <meshStandardMaterial color="#0F172A" emissive="#14B8A6" emissiveIntensity={0.28} />
            </mesh>
            <PottedPlant position={[3.3, 7.6, -8.3]} />
          </group>

          <group name="room-aff-analytics" userData={{ roomId: 'room-aff-analytics' }}>
            {/* Morning Product Selection Table + EPC Monitor */}
            <mesh position={[8.5, 8.32, -5.1]} castShadow receiveShadow>
              <cylinderGeometry args={[1.35, 1.35, 0.1, 20]} />
              <meshStandardMaterial color="#065F46" roughness={0.45} />
            </mesh>
            <mesh position={[8.5, 7.96, -5.1]} castShadow>
              <cylinderGeometry args={[0.25, 0.35, 0.72, 12]} />
              <meshStandardMaterial color="#1E293B" />
            </mesh>
            <mesh position={[8.5, 9.15, -8.85]} castShadow>
              <boxGeometry args={[3.8, 1.65, 0.12]} />
              <meshStandardMaterial color="#052E16" emissive="#22C55E" emissiveIntensity={0.3} />
            </mesh>
            <PottedPlant position={[12.3, 7.6, -8.3]} />
          </group>

          <group name="room-aff-creative" userData={{ roomId: 'room-aff-creative' }}>
            {/* Creator Studio Ring Light & Video Backdrop */}
            <mesh position={[-12.6, 9.1, 5.1]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <boxGeometry args={[3.6, 1.9, 0.1]} />
              <meshStandardMaterial color="#431407" emissive="#FB923C" emissiveIntensity={0.25} />
            </mesh>
            <group position={[-10.6, 7.6, 7.8]}>
              <mesh position={[0, 0.78, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.18, 1.56, 10]} />
                <meshStandardMaterial color="#1E293B" metalness={0.5} />
              </mesh>
              <mesh position={[0, 1.7, 0]}>
                <torusGeometry args={[0.3, 0.04, 8, 22]} />
                <meshStandardMaterial color="#FFF7ED" emissive="#FB923C" emissiveIntensity={0.75} />
              </mesh>
            </group>
            <PottedPlant position={[-12.3, 7.6, 8.3]} />
          </group>

          <group name="room-aff-channel" userData={{ roomId: 'room-aff-channel' }}>
            {/* Multi-channel Livestream & CRO Board */}
            <mesh position={[12.6, 9.15, 5.1]} rotation={[0, -Math.PI / 2, 0]} castShadow>
              <boxGeometry args={[3.6, 1.75, 0.1]} />
              <meshStandardMaterial color="#0C4A6E" emissive="#0EA5E9" emissiveIntensity={0.28} />
            </mesh>
            <PottedPlant position={[12.3, 7.6, 8.3]} />
          </group>
        </>
      )}

      {/* CUSTOM DEPARTMENT WINGS + ALL ROOM FLOOR PLATES & CLICKABLE LABELS */}
      {allRooms
        .filter((r) => (visibleFloor === 'all' ? true : r.floor === visibleFloor))
        .map((room) => {
          const isRoomSelected = selectedRoomId === room.id;
          const halfW = room.size[0] / 2;
          const halfD = room.size[1] / 2;
          return (
            <group
              key={room.id}
              userData={{ roomId: room.id }}
              position={[room.center[0], room.center[1] + 0.02, room.center[2]]}
            >
              {/* Modular Wing Glass Walls for CEO-created Custom Departments */}
              {room.isCustom && (
                <group>
                  <PartitionWall position={[0, 1.2, -halfD]} args={[room.size[0], 2.4, 0.12]} color={wallColor} />
                  <PartitionWall position={[-halfW, 1.2, 0]} args={[0.12, 2.4, room.size[1]]} color={wallColor} />
                  <PartitionWall position={[halfW, 1.2, 0]} args={[0.12, 2.4, room.size[1]]} color={wallColor} />
                  <PartitionWall position={[0, 0.3, halfD]} args={[room.size[0], 0.6, 0.12]} color={wallTrimColor} />
                </group>
              )}

              <mesh
                receiveShadow
                onClick={(e) => {
                  e.stopPropagation();
                  selectRoom(room.id);
                }}
              >
                <boxGeometry args={[room.size[0] - 0.35, 0.03, room.size[1] - 0.35]} />
                <meshStandardMaterial
                  color={room.color}
                  transparent
                  opacity={isRoomSelected ? 0.32 : 0.16}
                  roughness={0.78}
                />
              </mesh>

              <Html
                position={[0, 2.65, -halfD + 0.6]}
                center
                distanceFactor={22}
                zIndexRange={[5, 0]}
              >
                <button
                  type="button"
                  onClick={() => selectRoom(room.id)}
                  title={room.name}
                  className="max-w-[165px] truncate px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-tight shadow-md border transition-transform hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: isRoomSelected ? room.color : 'rgba(15, 23, 42, 0.92)',
                    color: '#F8FAFC',
                    borderColor: room.color,
                  }}
                >
                  {room.name}
                </button>
              </Html>
            </group>
          );
        })}

      {/* INSTANCED WORKSTATIONS */}
      <group name="shared-furniture" userData={{ roomId: 'shared-furniture' }}>
        <instancedMesh
          key={`desks-${visibleFloor}-${filteredDesks.length}`}
          ref={deskMeshRef}
          args={[undefined, undefined, filteredDesks.length]}
          frustumCulled={false}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.48, 0.08, 0.72]} />
          <meshStandardMaterial color={isNight ? '#475569' : '#F8FAFC'} roughness={0.42} metalness={0.12} />
        </instancedMesh>

        <instancedMesh
          key={`desk-legs-${visibleFloor}-${filteredDesks.length}`}
          ref={deskLegMeshRef}
          args={[undefined, undefined, filteredDesks.length]}
          frustumCulled={false}
          castShadow
        >
          <boxGeometry args={[1.34, 0.7, 0.56]} />
          <meshStandardMaterial color={isNight ? '#1E293B' : '#94A3B8'} roughness={0.55} metalness={0.35} />
        </instancedMesh>

        <instancedMesh
          key={`monitors-${visibleFloor}-${filteredDesks.length}`}
          ref={monitorMeshRef}
          args={[undefined, undefined, filteredDesks.length]}
          frustumCulled={false}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            if (typeof e.instanceId === 'number') {
              const targetDesk = filteredDesks[e.instanceId];
              if (targetDesk?.agentId) {
                openSpotCheck(targetDesk.agentId);
              }
            }
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        >
          <boxGeometry args={[0.7, 0.44, 0.06]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#38BDF8" emissiveIntensity={0.28} roughness={0.25} />
        </instancedMesh>

        <instancedMesh
          key={`chairs-${visibleFloor}-${filteredDesks.length}`}
          ref={chairMeshRef}
          args={[undefined, undefined, filteredDesks.length]}
          frustumCulled={false}
          castShadow
        >
          <boxGeometry args={[0.48, 0.56, 0.48]} />
          <meshStandardMaterial color="#1E293B" roughness={0.62} />
        </instancedMesh>

        <instancedMesh
          key={`mugs-${visibleFloor}-${filteredDesks.length}`}
          ref={mugMeshRef}
          args={[undefined, undefined, filteredDesks.length]}
          frustumCulled={false}
          castShadow
        >
          <cylinderGeometry args={[0.055, 0.048, 0.12, 8]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </instancedMesh>

        <instancedMesh
          key={`nameplates-${visibleFloor}-${filteredDesks.length}`}
          ref={nameplateMeshRef}
          args={[undefined, undefined, filteredDesks.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[0.26, 0.09, 0.07]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.35} />
        </instancedMesh>
      {/* 3D Cross-Dept Handover Flow Arcs (BỔ SUNG S) */}
      {handoverTickets
        .filter((t) => t.status === 'pending_accept' || t.status === 'accepted' || t.status === 'escalated_overdue')
        .slice(0, 6)
        .map((t) => {
          const fromDept = departments.find((d) => d.id === t.fromDepartment);
          const toDept = departments.find((d) => d.id === t.toDepartment);
          if (!fromDept || !toDept) return null;
          if (visibleFloor !== 'all' && fromDept.floor !== visibleFloor && toDept.floor !== visibleFloor) return null;
          const p0 = new THREE.Vector3(fromDept.roomCenter[0], fromDept.roomCenter[1] + 2.1, fromDept.roomCenter[2]);
          const p2 = new THREE.Vector3(toDept.roomCenter[0], toDept.roomCenter[1] + 2.1, toDept.roomCenter[2]);
          const mid = p0.clone().lerp(p2, 0.5);
          mid.y += 1.65;
          const colorHex = t.status === 'escalated_overdue' ? '#EF4444' : '#38BDF8';
          return (
            <group key={t.id}>
              {[0.25, 0.5, 0.75].map((u) => {
                const pt = new THREE.Vector3(
                  (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * mid.x + u * u * p2.x,
                  (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * mid.y + u * u * p2.y,
                  (1 - u) * (1 - u) * p0.z + 2 * (1 - u) * u * mid.z + u * u * p2.z
                );
                return (
                  <mesh key={u} position={[pt.x, pt.y, pt.z]}>
                    <sphereGeometry args={[u === 0.5 ? 0.14 : 0.09, 8, 8]} />
                    <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.9} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
      </group>
    </group>
  );
}
