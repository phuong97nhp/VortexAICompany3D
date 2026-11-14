import { getLiveDepartments } from './liveRegistry';

/**
 * Waypoint pathfinding graph for the dynamic 2-floor 3D virtual office.
 * Floor 1 (y = 0) & Floor 2 (y = 3.8) connected by central staircase at x = [-3.8, -1.8], z = [-1.1, 1.1].
 */

export type Vec3 = [number, number, number];

const STAIR_BOTTOM: Vec3 = [-2.8, 0, 0];
const STAIR_MID: Vec3 = [-2.8, 1.9, 0];
const STAIR_TOP: Vec3 = [-2.8, 3.8, 0];

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
  'room-data': [-0.25, 3.8, 1.2],
  'room-backoffice': [8.25, 3.8, 1.2],
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

function getDynamicCorridorPoint(roomId: string, floor: 1 | 2): Vec3 | undefined {
  const staticMap = floor === 1 ? CORRIDOR_F1 : CORRIDOR_F2;
  if (staticMap[roomId]) return staticMap[roomId];
  const dept = getLiveDepartments().find((d) => d.roomId === roomId);
  if (!dept) return undefined;
  const y = dept.floor === 2 ? 3.8 : 0;
  const zDoor = dept.roomCenter[2] < 0 ? dept.roomCenter[2] + dept.roomSize[1] / 2 - 0.5 : dept.roomCenter[2] - dept.roomSize[1] / 2 + 0.5;
  return [dept.roomCenter[0], y, Math.max(-1.2, Math.min(1.2, zDoor))];
}

export function buildWalkWaypoints(
  fromPos: Vec3,
  fromRoomId: string,
  toPos: Vec3,
  toRoomId: string
): Vec3[] {
  const fromFloor: 1 | 2 = fromPos[1] > 1.9 ? 2 : 1;
  const toFloor: 1 | 2 = toPos[1] > 1.9 ? 2 : 1;

  if (fromRoomId === toRoomId && fromFloor === toFloor) {
    return [toPos];
  }

  const points: Vec3[] = [];

  const exit = getDynamicCorridorPoint(fromRoomId, fromFloor);
  if (exit) points.push(exit);

  if (fromFloor !== toFloor) {
    if (fromFloor === 2 && toFloor === 1) {
      points.push(STAIR_TOP, STAIR_MID, STAIR_BOTTOM);
    } else {
      points.push(STAIR_BOTTOM, STAIR_MID, STAIR_TOP);
    }
  } else {
    points.push(fromFloor === 1 ? [0, 0, 0] : [0, 3.8, 0]);
  }

  const enter = getDynamicCorridorPoint(toRoomId, toFloor);
  if (enter) points.push(enter);

  points.push(toPos);
  return points;
}
