import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface SafeHtml3DProps {
  position?: [number, number, number];
  center?: boolean;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  style?: CSSProperties;
  className?: string;
  eps?: number;
  children: ReactNode;
}

const _objPos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _proj = new THREE.Vector3();

function computeObjectScale(
  camera: THREE.Camera,
  dist: number,
  distanceFactor?: number
): number {
  if (distanceFactor === undefined) return 1;
  if (camera instanceof THREE.OrthographicCamera) {
    return camera.zoom * distanceFactor;
  }
  if (camera instanceof THREE.PerspectiveCamera) {
    const vFOV = (camera.fov * Math.PI) / 180;
    const scaleFOV = 2 * Math.tan(vFOV / 2) * Math.max(dist, 0.01);
    return (1 / scaleFOV) * distanceFactor;
  }
  return 1;
}

function computeZIndex(
  camera: THREE.Camera,
  dist: number,
  zIndexRange: [number, number]
): number {
  if (
    camera instanceof THREE.PerspectiveCamera ||
    camera instanceof THREE.OrthographicCamera
  ) {
    const span = Math.max(camera.far - camera.near, 0.001);
    const A = (zIndexRange[1] - zIndexRange[0]) / span;
    const B = zIndexRange[1] - A * camera.far;
    return Math.max(0, Math.round(A * dist + B));
  }
  return zIndexRange[0];
}

/**
 * React 19-safe 3D HTML overlay replacement for `@react-three/drei`'s `<Html>`.
 * Avoids synchronous `createRoot` / `render` / `unmount` inside `useLayoutEffect`,
 * deferring root unmounts to a macrotask so React never encounters a synchronous
 * root-unmount race while already rendering.
 */
export function SafeHtml3D({
  position = [0, 0, 0],
  center = false,
  distanceFactor,
  zIndexRange = [16777271, 0],
  style,
  className,
  eps = 0.001,
  children,
}: SafeHtml3DProps) {
  const { gl, camera, scene, size, events } = useThree();
  const [el] = useState<HTMLDivElement>(() => document.createElement('div'));
  const groupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<Root | null>(null);
  const disposedRef = useRef(false);
  const pendingRenderRef = useRef(false);
  const latestNodeRef = useRef<ReactNode>(null);
  const prevRef = useRef({
    x: NaN,
    y: NaN,
    scale: NaN,
    zIndex: -1,
    visible: false,
  });

  const target =
    (events.connected as HTMLElement | undefined) ||
    (gl.domElement.parentNode as HTMLElement | null);

  latestNodeRef.current = (
    <div
      className={className}
      style={{
        position: 'absolute',
        transform: center ? 'translate3d(-50%, -50%, 0)' : 'none',
        pointerEvents: 'auto',
        ...style,
      }}
    >
      {children}
    </div>
  );

  const syncDomPosition = () => {
    const group = groupRef.current;
    if (!group) return;

    camera.updateMatrixWorld();
    group.updateWorldMatrix(true, false);

    _objPos.setFromMatrixPosition(group.matrixWorld);
    _camPos.setFromMatrixPosition(camera.matrixWorld);
    _delta.copy(_objPos).sub(_camPos);
    camera.getWorldDirection(_camDir);

    const isBehind = _delta.angleTo(_camDir) > Math.PI / 2;
    _proj.copy(_objPos).project(camera);

    const x = _proj.x * (size.width / 2) + size.width / 2;
    const y = -(_proj.y * (size.height / 2)) + size.height / 2;
    const dist = _objPos.distanceTo(_camPos);
    const scale = computeObjectScale(camera, dist, distanceFactor);
    const zIndex = computeZIndex(camera, dist, zIndexRange);

    const visible =
      !isBehind &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(scale) &&
      x > -240 &&
      x < size.width + 240 &&
      y > -240 &&
      y < size.height + 240;

    const prev = prevRef.current;
    if (prev.visible !== visible) {
      el.style.display = visible ? 'block' : 'none';
      prev.visible = visible;
    }

    if (!visible) return;

    if (prev.zIndex !== zIndex) {
      el.style.zIndex = `${zIndex}`;
      prev.zIndex = zIndex;
    }

    if (
      Number.isNaN(prev.x) ||
      Math.abs(prev.x - x) > eps ||
      Math.abs(prev.y - y) > eps ||
      Math.abs(prev.scale - scale) > eps
    ) {
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      prev.x = x;
      prev.y = y;
      prev.scale = scale;
    }
  };

  useEffect(() => {
    if (!target || !groupRef.current) return;

    disposedRef.current = false;
    prevRef.current = {
      x: NaN,
      y: NaN,
      scale: NaN,
      zIndex: -1,
      visible: false,
    };

    el.style.position = 'absolute';
    el.style.top = '0px';
    el.style.left = '0px';
    el.style.transformOrigin = '0 0';
    el.style.pointerEvents = 'none';
    el.style.display = 'none';

    scene.updateMatrixWorld();
    syncDomPosition();
    target.appendChild(el);

    const root = createRoot(el);
    rootRef.current = root;

    return () => {
      disposedRef.current = true;
      if (rootRef.current === root) {
        rootRef.current = null;
      }
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      window.setTimeout(() => {
        try {
          root.unmount();
        } catch {
          // Ignore already-unmounted root errors
        }
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, el]);

  useEffect(() => {
    if (disposedRef.current || !rootRef.current || pendingRenderRef.current) return;
    pendingRenderRef.current = true;
    queueMicrotask(() => {
      pendingRenderRef.current = false;
      if (!disposedRef.current && rootRef.current && latestNodeRef.current !== null) {
        rootRef.current.render(latestNodeRef.current);
      }
    });
  });

  useFrame(() => {
    if (!disposedRef.current) {
      syncDomPosition();
    }
  });

  return <group ref={groupRef} position={position} />;
}
