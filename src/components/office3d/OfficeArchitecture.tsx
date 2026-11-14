import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AGENTS } from '../../agents';
import { DEPARTMENTS, ROOMS } from '../../config/departments';
import { MEETING_SEATS } from '../../engine/waypoints';
import { useCompanyStore } from '../../store/useCompanyStore';
import { KpiScreen3D } from './KpiScreen3D';

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
      {/* Sales Leaderboard Board */}
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

      {/* Deal Bell Stand */}
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
            🔔 CHỐT DEAL MỚI!
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

export function OfficeArchitecture({ visibleFloor }: { visibleFloor: 'all' | 1 | 2 }) {
  const selectRoom = useCompanyStore((s) => s.selectRoom);
  const selectedRoomId = useCompanyStore((s) => s.selectedRoomId);
  const dayNightMode = useCompanyStore((s) => s.settings.dayNightMode);
  const dealCelebrationNonce = useCompanyStore((s) => s.dealCelebrationNonce);
  const isNight = dayNightMode === 'night';

  const showF1 = visibleFloor === 'all' || visibleFloor === 1;
  const showF2 = visibleFloor === 'all' || visibleFloor === 2;

  const filteredDesks = useMemo(() => {
    const all = [
      ...AGENTS.map((a) => ({
        floor: a.floor,
        pos: a.deskPosition,
        rotY: a.deskRotationY || 0,
        color: DEPARTMENTS[a.department]?.color || a.avatarColor,
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
  }, [visibleFloor]);

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

      // Desk surface (0.74m height)
      dummy.position.set(d.pos[0] + forwardX * 0.78, d.pos[1] + 0.74, d.pos[2] + forwardZ * 0.78);
      dummy.rotation.set(0, d.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      deskMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      // Desk frame / legs base
      dummy.position.set(d.pos[0] + forwardX * 0.78, d.pos[1] + 0.36, d.pos[2] + forwardZ * 0.78);
      dummy.updateMatrix();
      deskLegMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      // Monitor on desk
      dummy.position.set(d.pos[0] + forwardX * 0.88, d.pos[1] + 1.04, d.pos[2] + forwardZ * 0.88);
      dummy.updateMatrix();
      monitorMeshRef.current?.setMatrixAt(idx, dummy.matrix);
      color.set(d.color);
      monitorMeshRef.current?.setColorAt(idx, color);

      // Swivel Chair behind agent
      dummy.position.set(d.pos[0] - forwardX * 0.28, d.pos[1] + 0.32, d.pos[2] - forwardZ * 0.28);
      dummy.updateMatrix();
      chairMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      // Coffee Mug on corner of desk
      dummy.position.set(
        d.pos[0] + forwardX * 0.72 + rightX * 0.48,
        d.pos[1] + 0.84,
        d.pos[2] + forwardZ * 0.72 + rightZ * 0.48
      );
      dummy.updateMatrix();
      mugMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      // Desk Nameplate
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
  const wallColor = isNight ? '#475569' : '#CBD5E1';
  const wallTrimColor = isNight ? '#64748B' : '#64748B';
  const corridorColor = isNight ? '#283548' : '#CBD5E1';

  const renderFloorPartitions = (baseY: number, floorNum: 1 | 2) => {
    const h = 2.4;
    const cy = baseY + h / 2;
    const isF2 = floorNum === 2;

    return (
      <group>
        {/* Outer North Wall (Z = -9.05) */}
        <PartitionWall position={[0, cy, -9.05]} args={[26.2, h, 0.14]} color={wallColor} />
        {/* Outer West Wall (X = -13.05) */}
        <PartitionWall position={[-13.05, cy, 0]} args={[0.14, h, 18.2]} color={wallColor} />
        {/* Outer East Wall (X = 13.05) */}
        <PartitionWall position={[13.05, cy, 0]} args={[0.14, h, 18.2]} color={wallColor} />
        {/* Front South Low Cutaway Railing (Z = +9.05, low height so camera never occluded) */}
        <PartitionWall position={[0, baseY + 0.3, 9.05]} args={[26.2, 0.6, 0.14]} color={wallTrimColor} />
        <mesh position={[0, baseY + 0.78, 9.05]}>
          <boxGeometry args={[26.0, 0.36, 0.05]} />
          <meshStandardMaterial color="#7DD3FC" transparent opacity={0.35} roughness={0.15} metalness={0.2} />
        </mesh>

        {/* Central Corridor Floor Runner */}
        <mesh position={[0, baseY + 0.015, 0]} receiveShadow>
          <boxGeometry args={[25.8, 0.02, 2.25]} />
          <meshStandardMaterial color={corridorColor} roughness={0.75} />
        </mesh>

        {!isF2 ? (
          <>
            {/* F1 Corridor North Partitions (Z = -1.2) with doorways at -7.25 & +5.75 */}
            <PartitionWall position={[-10.575, cy, -1.2]} args={[4.85, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-0.75, cy, -1.2]} args={[11.2, h, 0.12]} color={wallColor} />
            <PartitionWall position={[9.825, cy, -1.2]} args={[6.35, h, 0.12]} color={wallColor} />
            {/* F1 Divider CSKH / Meeting (X = -1.5, Z in [-9, -1.2]) */}
            <PartitionWall position={[-1.5, cy, -5.1]} args={[0.12, h, 7.8]} color={wallColor} />

            {/* F1 Corridor South Partitions (Z = +1.2) with doorways at -9.0 & +4.0 */}
            <PartitionWall position={[-11.45, cy, 1.2]} args={[3.1, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-2.5, cy, 1.2]} args={[11.2, h, 0.12]} color={wallColor} />
            <PartitionWall position={[8.95, cy, 1.2]} args={[8.1, h, 0.12]} color={wallColor} />
            {/* F1 Divider Reception / Sales (X = -5.0, Z in [1.2, 9]) */}
            <PartitionWall position={[-5.0, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
          </>
        ) : (
          <>
            {/* F2 Corridor North Partitions (Z = -1.2) with doorways at -8.5 & +4.5 */}
            <PartitionWall position={[-11.2, cy, -1.2]} args={[3.6, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-2.0, cy, -1.2]} args={[11.2, h, 0.12]} color={wallColor} />
            <PartitionWall position={[9.2, cy, -1.2]} args={[7.6, h, 0.12]} color={wallColor} />
            {/* F2 Divider Exec / Marketing (X = -4.0, Z in [-9, -1.2]) */}
            <PartitionWall position={[-4.0, cy, -5.1]} args={[0.12, h, 7.8]} color={wallColor} />

            {/* F2 Corridor South Partitions (Z = +1.2) with doorways at -8.5, -0.25, +8.25 */}
            <PartitionWall position={[-11.2, cy, 1.2]} args={[3.6, h, 0.12]} color={wallColor} />
            <PartitionWall position={[-4.375, cy, 1.2]} args={[6.45, h, 0.12]} color={wallColor} />
            <PartitionWall position={[4.0, cy, 1.2]} args={[6.7, h, 0.12]} color={wallColor} />
            <PartitionWall position={[11.075, cy, 1.2]} args={[3.85, h, 0.12]} color={wallColor} />
            {/* F2 Dividers Product / Data / Backoffice */}
            <PartitionWall position={[-4.0, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
            <PartitionWall position={[3.5, cy, 5.1]} args={[0.12, h, 7.8]} color={wallColor} />
          </>
        )}
      </group>
    );
  };

  return (
    <group name="office-building-wrapper">
      {/* SHARED STRUCTURAL BUILDING (Plaza, Slabs, Partitions, Staircase, Pantry) */}
      <group name="shared-structure" userData={{ roomId: 'shared-structure' }}>
        {/* Exterior Ground Plaza */}
        <mesh position={[0, -0.24, 0]} receiveShadow>
          <boxGeometry args={[38, 0.24, 28]} />
          <meshStandardMaterial color={groundColor} roughness={0.85} />
        </mesh>

        {/* FLOOR 1 STRUCTURE */}
        {showF1 && (
          <group>
            <mesh position={[0, -0.08, 0]} receiveShadow>
              <boxGeometry args={[26.4, 0.16, 18.4]} />
              <meshStandardMaterial color={floor1Color} roughness={0.7} metalness={0.08} />
            </mesh>

            {renderFloorPartitions(0, 1)}

            {/* Central Staircase (12 steps connecting y=0 to y=3.8 inside corridor) */}
            <group position={[-2.8, 0, 0]}>
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
              {/* Stair handrails */}
              <mesh position={[0, 2.05, -0.78]} rotation={[0, 0, 1.02]}>
                <boxGeometry args={[4.4, 0.06, 0.06]} />
                <meshStandardMaterial color="#38BDF8" roughness={0.3} metalness={0.5} />
              </mesh>
              <mesh position={[0, 2.05, 0.78]} rotation={[0, 0, 1.02]}>
                <boxGeometry args={[4.4, 0.06, 0.06]} />
                <meshStandardMaterial color="#38BDF8" roughness={0.3} metalness={0.5} />
              </mesh>
            </group>

            {/* Pantry / Coffee Corner (West Corridor) */}
            <group position={[-11.8, 0, 0]}>
              <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.6, 0.96, 1.4]} />
                <meshStandardMaterial color="#92400E" roughness={0.55} />
              </mesh>
              {/* Espresso Machine */}
              <mesh position={[0.2, 1.18, -0.25]} castShadow>
                <boxGeometry args={[0.45, 0.45, 0.45]} />
                <meshStandardMaterial color="#DC2626" roughness={0.3} metalness={0.4} />
              </mesh>
              {/* Refrigerator */}
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
            <mesh position={[0, 3.72, 0]} receiveShadow>
              <boxGeometry args={[26.4, 0.16, 18.4]} />
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
          </group>
        )}
      </group>

      {/* FLOOR 1 ROOMS & DEDICATED FURNITURE */}
      {showF1 && (
        <>
          {/* 1. Reception Room */}
          <group name="room-reception" userData={{ roomId: 'room-reception' }}>
            {/* Curved-style Reception Counter */}
            <mesh position={[-8.1, 0.55, 5.1]} castShadow receiveShadow>
              <boxGeometry args={[0.85, 1.1, 3.4]} />
              <meshStandardMaterial color="#F97316" roughness={0.38} metalness={0.18} />
            </mesh>
            {/* Visitor Lounge Sofa + Coffee Table */}
            <mesh position={[-11.8, 0.35, 6.8]} castShadow>
              <boxGeometry args={[1.0, 0.7, 2.4]} />
              <meshStandardMaterial color="#334155" roughness={0.65} />
            </mesh>
            <mesh position={[-10.4, 0.25, 6.8]} castShadow>
              <boxGeometry args={[0.7, 0.45, 1.2]} />
              <meshStandardMaterial color="#78350F" roughness={0.5} />
            </mesh>
            {/* Lobby Brand Board */}
            <mesh position={[-12.88, 1.65, 5.1]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[2.8, 1.1, 0.08]} />
              <meshStandardMaterial color="#0F172A" emissive="#F97316" emissiveIntensity={0.22} />
            </mesh>
            <PottedPlant position={[-12.3, 0, 8.3]} />
            <PottedPlant position={[-5.7, 0, 8.3]} />
          </group>

          {/* 2. Sales Room */}
          <group name="room-sales" userData={{ roomId: 'room-sales' }}>
            <SalesDealBell celebrationNonce={dealCelebrationNonce} />
            <PottedPlant position={[-4.2, 0, 8.3]} />
            <PottedPlant position={[12.3, 0, 8.3]} />
          </group>

          {/* 3. Customer Success Room */}
          <group name="room-cs" userData={{ roomId: 'room-cs' }}>
            {/* PBX Call Console Rack */}
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

          {/* 4. Meeting Room */}
          <group name="room-meeting" userData={{ roomId: 'room-meeting' }}>
            <group position={[5.75, 0, -5.1]}>
              {/* Round Table */}
              <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[2.0, 2.0, 0.12, 28]} />
                <meshStandardMaterial color="#92400E" roughness={0.42} metalness={0.1} />
              </mesh>
              <mesh position={[0, 0.36, 0]} castShadow>
                <cylinderGeometry args={[0.38, 0.52, 0.72, 16]} />
                <meshStandardMaterial color="#1E293B" roughness={0.45} metalness={0.45} />
              </mesh>
              {/* Projection Screen on North Wall */}
              <mesh position={[0, 1.75, -3.75]} castShadow>
                <boxGeometry args={[4.4, 2.1, 0.12]} />
                <meshStandardMaterial color="#0F172A" roughness={0.3} />
              </mesh>
              <mesh position={[0, 1.75, -3.67]}>
                <planeGeometry args={[4.1, 1.82]} />
                <meshStandardMaterial color="#1E3A8A" emissive="#0EA5E9" emissiveIntensity={0.22} side={THREE.DoubleSide} />
              </mesh>
            </group>
            {/* 8 Meeting Chairs */}
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
          {/* 5. Exec Room */}
          <group name="room-exec" userData={{ roomId: 'room-exec' }}>
            {/* Executive Lounge Sofa */}
            <mesh position={[-12.2, 4.15, -5.1]} castShadow>
              <boxGeometry args={[0.95, 0.68, 2.4]} />
              <meshStandardMaterial color="#78350F" roughness={0.55} />
            </mesh>
            {/* Bookshelf */}
            <mesh position={[-12.35, 4.7, -8.1]} castShadow>
              <boxGeometry args={[0.55, 1.8, 1.4]} />
              <meshStandardMaterial color="#451A03" roughness={0.6} />
            </mesh>
            <PottedPlant position={[-4.6, 3.8, -8.3]} />
          </group>

          {/* 6. Marketing Room */}
          <group name="room-marketing" userData={{ roomId: 'room-marketing' }}>
            {/* Marketing Idea Whiteboard + Sticky Notes */}
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
            {/* Video Studio Ring-Light Stand */}
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

          {/* 7. Product & Engineering Room */}
          <group name="room-product" userData={{ roomId: 'room-product' }}>
            {/* Kanban Sprint Board on West Wall */}
            <mesh position={[-12.88, 5.35, 5.1]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <boxGeometry args={[3.2, 1.6, 0.08]} />
              <meshStandardMaterial color="#1E1B4B" roughness={0.35} />
            </mesh>
            {/* Dev Sandbox Server Rack */}
            <mesh position={[-4.55, 4.75, 7.9]} castShadow>
              <boxGeometry args={[0.75, 1.9, 0.85]} />
              <meshStandardMaterial color="#0F172A" roughness={0.35} metalness={0.6} />
            </mesh>
            <PottedPlant position={[-12.3, 3.8, 8.3]} />
          </group>

          {/* 8. Data & Analytics Room */}
          <group name="room-data" userData={{ roomId: 'room-data' }}>
            <KpiScreen3D position={[-0.25, 3.8, 2.25]} />
            <PottedPlant position={[2.8, 3.8, 8.3]} />
          </group>

          {/* 9. Back Office Room */}
          <group name="room-backoffice" userData={{ roomId: 'room-backoffice' }}>
            {/* High-Security Vault Safe */}
            <mesh position={[11.8, 4.55, 7.6]} castShadow>
              <boxGeometry args={[1.15, 1.5, 0.95]} />
              <meshStandardMaterial color="#312E81" roughness={0.28} metalness={0.75} />
            </mesh>
            {/* Legal Filing Cabinet */}
            <mesh position={[11.9, 4.45, 2.8]} castShadow>
              <boxGeometry args={[0.75, 1.3, 1.2]} />
              <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.35} />
            </mesh>
            <PottedPlant position={[4.2, 3.8, 8.3]} />
          </group>
        </>
      )}

      {/* ROOM ZONE FLOOR PLATES & CLICKABLE LABELS */}
      {ROOMS.filter((r) => (visibleFloor === 'all' ? true : r.floor === visibleFloor)).map((room) => {
        const isRoomSelected = selectedRoomId === room.id;
        return (
          <group
            key={room.id}
            userData={{ roomId: room.id }}
            position={[room.center[0], room.center[1] + 0.02, room.center[2]]}
          >
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
              position={[0, 2.65, -room.size[1] / 2 + 0.6]}
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

      {/* INSTANCED WORKSTATIONS (Filtered by visibleFloor & keyed cleanly) */}
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
        >
          <boxGeometry args={[0.7, 0.44, 0.06]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#38BDF8" emissiveIntensity={0.22} roughness={0.25} />
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
      </group>
    </group>
  );
}
