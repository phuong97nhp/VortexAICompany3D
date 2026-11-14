import { getLiveDepartments } from './liveRegistry';

/**
 * Waypoint pathfinding graph for the dynamic 3-floor 3D virtual office.
 * Floor 1 (y = 0), Floor 2 (y = 3.8), Floor 3 (y = 7.6)
 * Connected by central staircase & elevator core at x = [-3.8, -1.2], z = [-1.1, 1.1].
 */

export type Vec3 = [number, number, number];

const STAIR_F1: Vec3 = [-2.8, 0, 0];
const STAIR_F1_F2_MID: Vec3 = [-2.8, 1.9, 0];
const STAIR_F2: Vec3 = [-2.8, 3.8, 0];
const STAIR_F2_F3_MID: Vec3 = [-2.8, 5.7, 0];
const STAIR_F3: Vec3 = [-2.8, 7.6, 0];

const CORRIDOR_F1: Record<string, Vec3> = {
  'room-reception': [-9.0, 0, 1.2],
  'room-sales': [4.0, 0, 1.2],
  'room-cs': [-7.25, 0, -1.2],
  'room-meeting': [5.75, 0, -1.2],
};

const CORRIDOR_F2: Record<string, Vec3> = {
  'room-exec': [-8.5, 3.8, -1.2],
  'room-marketing': [4.5, 3.8, -1.2],
  'room-product': [-8.5, 3.8, 1.2],
  'room-data': [-0.8, 3.8, 1.2],
  'room-backoffice': [5.5, 3.8, 1.2],
  'room-legal': [10.8, 3.8, 1.2],
};

const CORRIDOR_F3: Record<string, Vec3> = {
  'room-aff-exec': [-9.0, 7.6, -1.2],
  'room-aff-research': [-0.5, 7.6, -1.2],
  'room-aff-analytics': [8.5, 7.6, -1.2],
  'room-aff-creative': [-6.5, 7.6, 1.2],
  'room-aff-channel': [6.5, 7.6, 1.2],
};

export const MEETING_SEATS: Vec3[] = [
  [3.55, 0, -5.1],
  [4.2, 0, -6.65],
  [5.75, 0, -7.3],
  [7.3, 0, -6.65],
  [7.95, 0, -5.1],
  [7.3, 0, -3.55],
  [5.75, 0, -2.9],
  [4.2, 0, -3.55],
];

// Floor 3 "Chọn hàng" morning meeting seats inside room-aff-analytics
export const MEETING_SEATS_F3: Vec3[] = [
  [7.2, 7.6, -5.8],
  [8.5, 7.6, -6.7],
  [9.8, 7.6, -5.8],
  [9.8, 7.6, -4.3],
  [8.5, 7.6, -3.5],
  [7.2, 7.6, -4.3],
];

export function floorFromY(y: number): 1 | 2 | 3 {
  if (y >= 5.7) return 3;
  if (y >= 1.9) return 2;
  return 1;
}

export function yFromFloor(floor: 1 | 2 | 3): number {
  if (floor === 3) return 7.6;
  if (floor === 2) return 3.8;
  return 0;
}

function getDynamicCorridorPoint(roomId: string, floor: 1 | 2 | 3): Vec3 | undefined {
  const staticMap = floor === 3 ? CORRIDOR_F3 : floor === 2 ? CORRIDOR_F2 : CORRIDOR_F1;
  if (staticMap[roomId]) return staticMap[roomId];
  const dept = getLiveDepartments().find((d) => d.roomId === roomId);
  if (!dept) return undefined;
  const y = yFromFloor(dept.floor);
  const zDoor =
    dept.roomCenter[2] < 0
      ? dept.roomCenter[2] + dept.roomSize[1] / 2 - 0.5
      : dept.roomCenter[2] - dept.roomSize[1] / 2 + 0.5;
  return [dept.roomCenter[0], y, Math.max(-1.2, Math.min(1.2, zDoor))];
}

export function buildWalkWaypoints(
  fromPos: Vec3,
  fromRoomId: string,
  toPos: Vec3,
  toRoomId: string
): Vec3[] {
  const fromFloor = floorFromY(fromPos[1]);
  const toFloor = floorFromY(toPos[1]);

  if (fromRoomId === toRoomId && fromFloor === toFloor) {
    return [toPos];
  }

  const points: Vec3[] = [];
  const exit = getDynamicCorridorPoint(fromRoomId, fromFloor);
  if (exit) points.push(exit);

  if (fromFloor !== toFloor) {
    // Route cleanly across F1 <-> F2 <-> F3 staircase/elevator shaft
    if (fromFloor === 1 && toFloor === 2) {
      points.push(STAIR_F1, STAIR_F1_F2_MID, STAIR_F2);
    } else if (fromFloor === 1 && toFloor === 3) {
      points.push(STAIR_F1, STAIR_F1_F2_MID, STAIR_F2, STAIR_F2_F3_MID, STAIR_F3);
    } else if (fromFloor === 2 && toFloor === 1) {
      points.push(STAIR_F2, STAIR_F1_F2_MID, STAIR_F1);
    } else if (fromFloor === 2 && toFloor === 3) {
      points.push(STAIR_F2, STAIR_F2_F3_MID, STAIR_F3);
    } else if (fromFloor === 3 && toFloor === 2) {
      points.push(STAIR_F3, STAIR_F2_F3_MID, STAIR_F2);
    } else if (fromFloor === 3 && toFloor === 1) {
      points.push(STAIR_F3, STAIR_F2_F3_MID, STAIR_F2, STAIR_F1_F2_MID, STAIR_F1);
    }
  } else {
    points.push([0, yFromFloor(fromFloor), 0]);
  }

  const enter = getDynamicCorridorPoint(toRoomId, toFloor);
  if (enter) points.push(enter);

  points.push(toPos);
  return points;
}
