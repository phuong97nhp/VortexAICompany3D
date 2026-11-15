import {
  AgentProfile,
  DepartmentConfig,
  OfficeLayoutPreset,
  OfficeLayoutValidationReport,
  OfficePropKind,
  OfficePropLayoutItem,
  OfficeRoomLayoutItem,
} from '../types';
import { yFromFloor } from './waypoints';

export function snapToGrid(value: number, gridSize = 0.5): number {
  return Math.round(value / gridSize) * gridSize;
}

export function buildPropsFromAgents(agents: AgentProfile[], rooms: OfficeRoomLayoutItem[]): OfficePropLayoutItem[] {
  const props: OfficePropLayoutItem[] = [];
  for (const ag of agents) {
    if (ag.employmentStatus === 'archived') continue;
    props.push({
      id: `prop_desk_${ag.id}`,
      roomId: ag.roomId,
      floor: ag.floor,
      kind: 'desk',
      label: `Bàn ${ag.nickname || ag.name.split(' ').slice(-2).join(' ')}`,
      position: [...ag.deskPosition],
      rotationY: ag.deskRotationY || 0,
      assignedAgentId: ag.id,
    });
  }
  // Essential decorative room props on each room corner
  for (const r of rooms) {
    props.push({
      id: `prop_plant_${r.id}`,
      roomId: r.id,
      floor: r.floor,
      kind: 'plant',
      label: `Cây xanh ${r.shortName}`,
      position: [
        snapToGrid(r.center[0] + r.size[0] / 2 - 0.75),
        r.center[1],
        snapToGrid(r.center[2] + r.size[1] / 2 - 0.75),
      ],
      rotationY: 0,
    });
  }
  return props;
}

export function buildBuiltinOfficePresets(
  departments: DepartmentConfig[],
  agents: AgentProfile[]
): OfficeLayoutPreset[] {
  const now = Date.now();
  const standardRooms: OfficeRoomLayoutItem[] = [
    ...departments.map((d) => ({
      id: d.roomId,
      departmentId: d.id,
      name: d.name,
      shortName: d.shortName,
      floor: d.floor,
      center: [...d.roomCenter] as [number, number, number],
      size: [...d.roomSize] as [number, number],
      color: d.color,
      doorSide: (d.roomCenter[2] < 0 ? 'south' : 'north') as 'north' | 'south',
    })),
    {
      id: 'room-meeting',
      name: 'Phòng Họp Lớn',
      shortName: 'Phòng Họp',
      floor: 1,
      center: [5.75, 0, -5.1],
      size: [14.5, 7.8],
      color: '#EAB308',
      doorSide: 'south',
    },
  ];

  const standardPreset: OfficeLayoutPreset = {
    id: 'preset_standard_3f',
    name: 'Công ty Chuẩn 3 Tầng (Mặc định)',
    description: 'Bố cục đầy đủ 3 tầng: Sales/CS (T1), Exec/Marketing/Tech/Legal (T2), Affiliate (T3).',
    floors: [1, 2, 3],
    rooms: standardRooms,
    props: buildPropsFromAgents(agents, standardRooms),
    isBuiltIn: true,
    updatedAt: now,
  };

  const smallStartupRooms: OfficeRoomLayoutItem[] = [
    {
      id: 'room-exec',
      departmentId: 'exec',
      name: 'Điều hành & Tiếp khách',
      shortName: 'Điều hành',
      floor: 1,
      center: [-6.5, 0, -4.5],
      size: [11, 7],
      color: '#F59E0B',
      doorSide: 'south',
    },
    {
      id: 'room-sales',
      departmentId: 'sales',
      name: 'Kinh doanh & Marketing',
      shortName: 'Sales & MKT',
      floor: 1,
      center: [6.5, 0, -4.5],
      size: [12, 7],
      color: '#10B981',
      doorSide: 'south',
    },
    {
      id: 'room-product',
      departmentId: 'product',
      name: 'Sản phẩm & CSKH',
      shortName: 'Tech & CS',
      floor: 1,
      center: [0, 0, 4.8],
      size: [22, 7],
      color: '#6366F1',
      doorSide: 'north',
    },
  ];

  const smallStartupPreset: OfficeLayoutPreset = {
    id: 'preset_small_1f',
    name: 'Văn phòng Nhỏ (Khởi nghiệp 1 Tầng)',
    description: 'Gọn nhẹ trên 1 mặt sàn, tối ưu cho đội 6–15 nhân sự tập trung.',
    floors: [1],
    rooms: smallStartupRooms,
    props: smallStartupRooms.map((r) => ({
      id: `prop_plant_${r.id}`,
      roomId: r.id,
      floor: 1,
      kind: 'plant' as OfficePropKind,
      label: `Cây ${r.shortName}`,
      position: [r.center[0] + r.size[0] / 2 - 0.8, 0, r.center[2] + r.size[1] / 2 - 0.8],
      rotationY: 0,
    })),
    isBuiltIn: true,
    updatedAt: now,
  };

  const affiliateRooms = standardRooms.map((r) =>
    r.floor === 3
      ? {
          ...r,
          size: [r.size[0] + 0.5, r.size[1]] as [number, number],
        }
      : r
  );
  const affiliateFocusedPreset: OfficeLayoutPreset = {
    id: 'preset_affiliate_focus',
    name: 'Khối Affiliate Mở rộng',
    description: 'Tối ưu diện tích Studio & CRO Tầng 3 phục vụ săn hàng Win và livestream.',
    floors: [1, 2, 3],
    rooms: affiliateRooms,
    props: buildPropsFromAgents(agents, affiliateRooms),
    isBuiltIn: true,
    updatedAt: now,
  };

  const openStudioRooms: OfficeRoomLayoutItem[] = [
    {
      id: 'room-sales',
      departmentId: 'sales',
      name: 'Khu Mở Tầng 1 · Giao dịch & CSKH',
      shortName: 'Open Tầng 1',
      floor: 1,
      center: [0, 0, 0],
      size: [24, 16],
      color: '#0EA5E9',
      doorSide: 'south',
    },
    {
      id: 'room-marketing',
      departmentId: 'marketing',
      name: 'Khu Mở Tầng 2 · Studio & Tech',
      shortName: 'Open Tầng 2',
      floor: 2,
      center: [0, 3.8, 0],
      size: [24, 16],
      color: '#EC4899',
      doorSide: 'south',
    },
  ];
  const openStudioPreset: OfficeLayoutPreset = {
    id: 'preset_open_studio',
    name: 'Open Space Studio (Không vách ngăn)',
    description: 'Không gian mở tăng tương tác liên phòng ban, phù hợp Sprint Hackathon.',
    floors: [1, 2],
    rooms: openStudioRooms,
    props: [],
    isBuiltIn: true,
    updatedAt: now,
  };

  return [standardPreset, smallStartupPreset, affiliateFocusedPreset, openStudioPreset];
}

export function validateOfficeLayout(
  preset: OfficeLayoutPreset,
  activeAgents: AgentProfile[]
): OfficeLayoutValidationReport {
  const overlapErrors: string[] = [];
  const aisleWarnings: string[] = [];
  const unseatedAgents: string[] = [];

  // 1. Check room overlaps on same floor (ignore small tolerance 0.15m)
  for (let i = 0; i < preset.rooms.length; i++) {
    for (let j = i + 1; j < preset.rooms.length; j++) {
      const a = preset.rooms[i];
      const b = preset.rooms[j];
      if (a.floor !== b.floor) continue;
      const dx = Math.abs(a.center[0] - b.center[0]);
      const dz = Math.abs(a.center[2] - b.center[2]);
      const minW = (a.size[0] + b.size[0]) / 2 - 0.15;
      const minD = (a.size[1] + b.size[1]) / 2 - 0.15;
      if (dx < minW && dz < minD) {
        overlapErrors.push(`Phòng "${a.shortName}" chồng lấn "${b.shortName}" (Tầng ${a.floor})`);
      }
    }
  }

  // 2. Check corridor / staircase clearance [-3.8..-1.8, -1.1..1.1] unless intentional Open Studio room
  for (const r of preset.rooms) {
    if (r.size[0] >= 20 && r.size[1] >= 14) continue; // Open space room covers floor intentionally
    const minZ = r.center[2] - r.size[1] / 2;
    const maxZ = r.center[2] + r.size[1] / 2;
    if (minZ < 0.8 && maxZ > -0.8) {
      aisleWarnings.push(
        `Phòng "${r.shortName}" (Tầng ${r.floor}) lấn hành lang đi lại trung tâm (z = -0.8..0.8)`
      );
    }
  }

  // 3. Check active agents seated
  const seatedByProp = new Set(
    preset.props.filter((p) => p.kind === 'desk' && p.assignedAgentId).map((p) => p.assignedAgentId!)
  );
  const roomIds = new Set(preset.rooms.map((r) => r.id));
  for (const ag of activeAgents) {
    if (ag.employmentStatus === 'archived') continue;
    const hasSeat = seatedByProp.has(ag.id) || (roomIds.has(ag.roomId) && preset.floors.includes(ag.floor));
    if (!hasSeat) {
      unseatedAgents.push(`${ag.name} (${ag.title})`);
    }
  }

  return {
    valid: overlapErrors.length === 0 && unseatedAgents.length === 0,
    overlapErrors,
    unseatedAgents,
    aisleWarnings,
  };
}

export function autoSeatAgentsInPreset(
  preset: OfficeLayoutPreset,
  activeAgents: AgentProfile[]
): { preset: OfficeLayoutPreset; updatedAgentPositions: Record<string, { deskPosition: [number, number, number]; floor: 1 | 2 | 3; roomId: string }> } {
  const nextProps = [...preset.props];
  const updatedAgentPositions: Record<string, { deskPosition: [number, number, number]; floor: 1 | 2 | 3; roomId: string }> = {};
  const seatedIds = new Set(
    nextProps.filter((p) => p.kind === 'desk' && p.assignedAgentId).map((p) => p.assignedAgentId!)
  );

  for (const ag of activeAgents) {
    if (ag.employmentStatus === 'archived') continue;
    if (seatedIds.has(ag.id)) continue;

    const targetRoom =
      preset.rooms.find((r) => r.id === ag.roomId || r.departmentId === ag.department) ||
      preset.rooms[0];
    if (!targetRoom) continue;

    const existingInRoom = nextProps.filter((p) => p.roomId === targetRoom.id && p.kind === 'desk').length;
    const cols = Math.max(1, Math.floor((targetRoom.size[0] - 1.5) / 2.2));
    const col = existingInRoom % cols;
    const row = Math.floor(existingInRoom / cols);
    const x = snapToGrid(targetRoom.center[0] - targetRoom.size[0] / 2 + 1.5 + col * 2.1);
    const z = snapToGrid(targetRoom.center[2] - targetRoom.size[1] / 2 + 1.6 + row * 2.1);
    const clampedFloor = (targetRoom.floor === 3 ? 3 : targetRoom.floor === 2 ? 2 : 1) as 1 | 2 | 3;
    const y = yFromFloor(clampedFloor);

    const pos: [number, number, number] = [x, y, z];
    nextProps.push({
      id: `prop_desk_${ag.id}`,
      roomId: targetRoom.id,
      floor: targetRoom.floor,
      kind: 'desk',
      label: `Bàn ${ag.nickname || ag.name.split(' ').slice(-2).join(' ')}`,
      position: pos,
      rotationY: 0,
      assignedAgentId: ag.id,
    });
    updatedAgentPositions[ag.id] = {
      deskPosition: pos,
      floor: clampedFloor,
      roomId: targetRoom.id,
    };
  }

  return {
    preset: { ...preset, props: nextProps, updatedAt: Date.now() },
    updatedAgentPositions,
  };
}

export function exportOfficeLayoutJson(preset: OfficeLayoutPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function parseOfficeLayoutJson(rawJson: string): { ok: true; preset: OfficeLayoutPreset } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<OfficeLayoutPreset>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.props)) {
      return { ok: false, error: 'JSON bố cục văn phòng thiếu trường rooms hoặc props.' };
    }
    return {
      ok: true,
      preset: {
        id: parsed.id || `preset_import_${Date.now()}`,
        name: parsed.name || 'Bố cục Nhập khẩu',
        description: parsed.description || 'Nhập từ file JSON',
        floors: Array.isArray(parsed.floors) && parsed.floors.length > 0 ? parsed.floors : [1, 2, 3],
        rooms: parsed.rooms,
        props: parsed.props,
        isBuiltIn: false,
        updatedAt: Date.now(),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'JSON không hợp lệ' };
  }
}
