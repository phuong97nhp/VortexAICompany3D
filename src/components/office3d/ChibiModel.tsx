import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AgentAppearance, AgentStatus } from '../../types';

interface ChibiModelProps {
  appearance: AgentAppearance;
  status?: AgentStatus;
  isPostingSocial?: boolean;
  simplifiedLod?: boolean;
  showOutline?: boolean;
  paused?: boolean;
  rotationY?: number;
}

const CONFETTI_OFFSETS: Array<[number, number, number, string]> = [
  [-0.24, 1.48, 0.12, '#F59E0B'],
  [0.24, 1.54, -0.1, '#10B981'],
  [0.08, 1.64, 0.22, '#EC4899'],
  [-0.18, 1.62, -0.2, '#38BDF8'],
  [0.2, 1.42, 0.2, '#A855F7'],
];

export function ChibiModel({
  appearance,
  status = 'idle',
  isPostingSocial = false,
  simplifiedLod = false,
  showOutline = true,
  paused = false,
  rotationY,
}: ChibiModelProps) {
  const bodyRootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const thinkingDotsRef = useRef<THREE.Group>(null);
  const confettiRef = useRef<THREE.Group>(null);
  const blockedMarkRef = useRef<THREE.Group>(null);
  const errorMarkRef = useRef<THREE.Group>(null);
  const socialAuraRef = useRef<THREE.Group>(null);

  const phaseSeed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < appearance.agentId.length; i++) {
      h = (h * 31 + appearance.agentId.charCodeAt(i)) % 1000;
    }
    return (h / 1000) * Math.PI * 2;
  }, [appearance.agentId]);

  useFrame((state, delta) => {
    if (paused) return;
    const t = state.clock.elapsedTime + phaseSeed;
    const d = Math.min(delta, 0.05);

    // 1. Eye Blinking (every ~3.6 seconds)
    const blinkCycle = (t % 3.6);
    const blinkScaleY = blinkCycle > 3.46 ? 0.1 : 1;
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = THREE.MathUtils.damp(leftEyeRef.current.scale.y, blinkScaleY, 28, d);
      rightEyeRef.current.scale.y = THREE.MathUtils.damp(rightEyeRef.current.scale.y, blinkScaleY, 28, d);
    }

    // 2. Mouth Reaction
    if (mouthRef.current) {
      let targetScaleY = 0.7;
      let targetScaleX = 1;
      if (status === 'talking' || status === 'in_meeting') {
        targetScaleY = 0.7 + Math.abs(Math.sin(t * 14)) * 1.4;
        targetScaleX = 0.9 + Math.cos(t * 14) * 0.25;
      } else if (status === 'thinking') {
        targetScaleY = 0.95;
        targetScaleX = 0.55;
      } else if (status === 'done') {
        targetScaleY = 1.35;
        targetScaleX = 1.3;
      } else if (status === 'blocked' || status === 'error') {
        targetScaleY = 0.55;
        targetScaleX = 0.75;
      }
      mouthRef.current.scale.y = THREE.MathUtils.damp(mouthRef.current.scale.y, targetScaleY, 18, d);
      mouthRef.current.scale.x = THREE.MathUtils.damp(mouthRef.current.scale.x, targetScaleX, 18, d);
    }

    // 3. Body bounce & posture
    if (bodyRootRef.current) {
      let targetY = 0;
      let targetLeanX = 0;
      if (status === 'walking') {
        targetY = Math.abs(Math.sin(t * 10)) * 0.065;
        targetLeanX = 0.1;
      } else if (status === 'done') {
        targetY = Math.abs(Math.sin(t * 7)) * 0.12;
      } else if (status === 'typing') {
        targetY = Math.sin(t * 2.5) * 0.01;
        targetLeanX = 0.12;
      } else if (status === 'blocked') {
        targetY = -0.02;
        targetLeanX = 0.08;
      } else {
        targetY = Math.sin(t * 2.2) * 0.014;
      }
      bodyRootRef.current.position.y = THREE.MathUtils.damp(bodyRootRef.current.position.y, targetY, 12, d);
      bodyRootRef.current.rotation.x = THREE.MathUtils.damp(bodyRootRef.current.rotation.x, targetLeanX, 10, d);
      if (typeof rotationY === 'number') {
        bodyRootRef.current.rotation.y = rotationY;
      }
    }

    // 4. Head Animation
    if (headRef.current) {
      let headYaw = Math.sin(t * 0.85) * 0.08;
      let headPitch = 0;
      let headRoll = 0;
      if (status === 'thinking') {
        headYaw = 0.18;
        headPitch = -0.1;
        headRoll = 0.12;
      } else if (status === 'talking') {
        headYaw = Math.sin(t * 4) * 0.16;
        headPitch = Math.sin(t * 7) * 0.08;
      } else if (status === 'in_meeting') {
        headPitch = Math.sin(t * 3.5) * 0.12;
        headYaw = Math.sin(t * 1.4) * 0.2;
      } else if (status === 'blocked') {
        headPitch = 0.14;
        headRoll = Math.sin(t * 2.5) * 0.08;
      } else if (status === 'error') {
        headYaw = Math.sin(t * 18) * 0.12;
      } else if (status === 'done') {
        headPitch = -0.08 + Math.sin(t * 8) * 0.08;
      }
      headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, headYaw, 10, d);
      headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, headPitch, 10, d);
      headRef.current.rotation.z = THREE.MathUtils.damp(headRef.current.rotation.z, headRoll, 10, d);
    }

    // 5. Articulated Arms + Forearms & Legs
    let lArmX = 0;
    let rArmX = 0;
    let lArmZ = 0.12;
    let rArmZ = -0.12;
    let lForeX = -0.1;
    let rForeX = -0.1;
    let lLegX = 0;
    let rLegX = 0;

    if (status === 'walking') {
      const swing = Math.sin(t * 10) * 0.55;
      lArmX = -swing * 0.8;
      rArmX = swing * 0.8;
      lLegX = swing;
      rLegX = -swing;
    } else if (status === 'typing') {
      lArmX = -0.65;
      rArmX = -0.65;
      lForeX = -0.7 + Math.sin(t * 18) * 0.25;
      rForeX = -0.7 + Math.cos(t * 18) * 0.25;
    } else if (status === 'thinking') {
      rArmX = -1.15;
      rArmZ = 0.28;
      rForeX = -1.35;
      lArmX = -0.25;
      lForeX = -0.5;
    } else if (status === 'talking') {
      lArmX = -0.45 + Math.sin(t * 6) * 0.25;
      rArmX = -0.55 + Math.cos(t * 6) * 0.3;
      lArmZ = 0.25;
      rArmZ = -0.25;
      lForeX = -0.6;
      rForeX = -0.75;
    } else if (status === 'done') {
      lArmX = -2.5 + Math.sin(t * 10) * 0.2;
      rArmX = -2.5 + Math.cos(t * 10) * 0.2;
      lArmZ = 0.35;
      rArmZ = -0.35;
    } else if (status === 'blocked') {
      lArmZ = 0.05;
      rArmZ = -0.05;
      lArmX = 0.12;
      rArmX = 0.12;
    } else if (status === 'error') {
      lArmX = -0.9;
      rArmX = -0.9;
      lArmZ = 0.38;
      rArmZ = -0.38;
    }

    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, lArmX, 12, d);
      rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, rArmX, 12, d);
      leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, lArmZ, 12, d);
      rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, rArmZ, 12, d);
    }
    if (leftForearmRef.current && rightForearmRef.current) {
      leftForearmRef.current.rotation.x = THREE.MathUtils.damp(leftForearmRef.current.rotation.x, lForeX, 14, d);
      rightForearmRef.current.rotation.x = THREE.MathUtils.damp(rightForearmRef.current.rotation.x, rForeX, 14, d);
    }
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = THREE.MathUtils.damp(leftLegRef.current.rotation.x, lLegX, 12, d);
      rightLegRef.current.rotation.x = THREE.MathUtils.damp(rightLegRef.current.rotation.x, rLegX, 12, d);
    }

    // 6. Floating status props
    if (thinkingDotsRef.current) {
      thinkingDotsRef.current.rotation.y = t * 2.4;
      thinkingDotsRef.current.position.y = 1.48 + Math.sin(t * 3) * 0.04;
    }
    if (confettiRef.current) {
      confettiRef.current.rotation.y = t * 3.2;
      confettiRef.current.position.y = Math.sin(t * 5) * 0.06;
    }
    if (blockedMarkRef.current) {
      blockedMarkRef.current.position.y = 1.52 + Math.abs(Math.sin(t * 5)) * 0.1;
      blockedMarkRef.current.rotation.y = Math.sin(t * 2) * 0.25;
    }
    if (errorMarkRef.current) {
      errorMarkRef.current.position.y = 1.52 + Math.sin(t * 8) * 0.05;
    }
    if (socialAuraRef.current) {
      socialAuraRef.current.rotation.y = t * 4.2;
      socialAuraRef.current.position.y = 1.52 + Math.sin(t * 4) * 0.05;
    }
  });

  const outlineColor = '#0F172A';
  const showEdges = showOutline && !simplifiedLod;

  return (
    <group scale={1.12}>
      {/* Contact Shadow Disc */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.31, simplifiedLod ? 10 : 18]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <group ref={bodyRootRef}>
        {/* LEGS */}
        <group ref={leftLegRef} position={[-0.1, 0.38, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.068, 0.16, 4, simplifiedLod ? 6 : 10]} />
            <meshStandardMaterial color={appearance.pantsColor} roughness={0.65} />
          </mesh>
          {/* Cute Shoe */}
          <mesh position={[0, -0.3, 0.035]} castShadow>
            <boxGeometry args={[0.14, 0.1, 0.2]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} />
          </mesh>
        </group>

        <group ref={rightLegRef} position={[0.1, 0.38, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.068, 0.16, 4, simplifiedLod ? 6 : 10]} />
            <meshStandardMaterial color={appearance.pantsColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.3, 0.035]} castShadow>
            <boxGeometry args={[0.14, 0.1, 0.2]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} />
          </mesh>
        </group>

        {/* TORSO */}
        <group ref={torsoRef} position={[0, 0.62, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.185, 0.2, 6, simplifiedLod ? 8 : 14]} />
            <meshStandardMaterial color={appearance.outfitColor} roughness={0.48} metalness={0.08} />
          </mesh>

          {/* Inverted-hull outline on Torso */}
          {showEdges && (
            <mesh scale={1.07}>
              <capsuleGeometry args={[0.185, 0.2, 4, 12]} />
              <meshBasicMaterial color={outlineColor} side={THREE.BackSide} />
            </mesh>
          )}

          {/* Outfit Style Details */}
          {appearance.outfitStyle === 'vest' && (
            <>
              <mesh position={[-0.08, 0.02, 0.145]} rotation={[0, 0, -0.15]}>
                <boxGeometry args={[0.08, 0.22, 0.04]} />
                <meshStandardMaterial color="#0F172A" roughness={0.5} />
              </mesh>
              <mesh position={[0.08, 0.02, 0.145]} rotation={[0, 0, 0.15]}>
                <boxGeometry args={[0.08, 0.22, 0.04]} />
                <meshStandardMaterial color="#0F172A" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.04, 0.15]}>
                <boxGeometry args={[0.11, 0.2, 0.03]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
              </mesh>
            </>
          )}

          {appearance.outfitStyle === 'shirt' && (
            <mesh position={[0, 0.15, 0.09]} rotation={[0.3, 0, 0]}>
              <torusGeometry args={[0.11, 0.025, 6, 14]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
            </mesh>
          )}

          {appearance.outfitStyle === 'hoodie' && (
            <>
              <mesh position={[0, 0.14, -0.11]} rotation={[-0.45, 0, 0]}>
                <torusGeometry args={[0.15, 0.055, 6, 14]} />
                <meshStandardMaterial color={appearance.outfitColor} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.07, 0.17]}>
                <boxGeometry args={[0.2, 0.12, 0.04]} />
                <meshStandardMaterial color={appearance.outfitAccent || '#FFFFFF'} roughness={0.6} />
              </mesh>
            </>
          )}

          {/* Torso Accessories */}
          {appearance.accessory === 'tie' && (
            <mesh position={[0, 0.01, 0.18]}>
              <coneGeometry args={[0.045, 0.2, 4]} />
              <meshStandardMaterial color="#DC2626" roughness={0.35} />
            </mesh>
          )}
          {appearance.accessory === 'badge' && (
            <mesh position={[0.1, 0.06, 0.185]}>
              <boxGeometry args={[0.08, 0.06, 0.02]} />
              <meshStandardMaterial color="#F8FAFC" emissive={appearance.outfitAccent || '#38BDF8'} emissiveIntensity={0.4} />
            </mesh>
          )}
          {appearance.accessory === 'backpack' && (
            <mesh position={[0, 0.01, -0.21]} castShadow>
              <boxGeometry args={[0.26, 0.3, 0.14]} />
              <meshStandardMaterial color="#334155" roughness={0.6} />
            </mesh>
          )}

          {/* LEFT ARM (Shoulder -> Upper Arm -> Forearm + Hand) */}
          <group ref={leftArmRef} position={[-0.22, 0.11, 0]}>
            <mesh position={[0, -0.09, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
              <meshStandardMaterial color={appearance.outfitColor} roughness={0.5} />
            </mesh>
            <group ref={leftForearmRef} position={[0, -0.17, 0]}>
              <mesh position={[0, -0.08, 0]} castShadow>
                <capsuleGeometry args={[0.046, 0.1, 4, 8]} />
                <meshStandardMaterial color={appearance.skinTone} roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.16, 0]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={appearance.skinTone} roughness={0.45} />
              </mesh>
            </group>
          </group>

          {/* RIGHT ARM */}
          <group ref={rightArmRef} position={[0.22, 0.11, 0]}>
            <mesh position={[0, -0.09, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
              <meshStandardMaterial color={appearance.outfitColor} roughness={0.5} />
            </mesh>
            <group ref={rightForearmRef} position={[0, -0.17, 0]}>
              <mesh position={[0, -0.08, 0]} castShadow>
                <capsuleGeometry args={[0.046, 0.1, 4, 8]} />
                <meshStandardMaterial color={appearance.skinTone} roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.16, 0]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={appearance.skinTone} roughness={0.45} />
              </mesh>
            </group>
          </group>
        </group>

        {/* CHIBI HEAD (~1/3 total height, cute rounded toy proportions) */}
        <group ref={headRef} position={[0, 1.07, 0]}>
          <mesh scale={[1.05, 0.96, 1.0]} castShadow>
            <sphereGeometry args={[0.235, simplifiedLod ? 12 : 20, simplifiedLod ? 10 : 16]} />
            <meshStandardMaterial color={appearance.skinTone} roughness={0.42} metalness={0.04} />
          </mesh>

          {/* Head Outline */}
          {showEdges && (
            <mesh scale={[1.11, 1.02, 1.06]}>
              <sphereGeometry args={[0.235, 16, 12]} />
              <meshBasicMaterial color={outlineColor} side={THREE.BackSide} />
            </mesh>
          )}

          {/* Left & Right Eyes with Iris + Catchlight */}
          <mesh ref={leftEyeRef} position={[-0.085, 0.015, 0.215]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshStandardMaterial color="#0F172A" roughness={0.15} />
            {!simplifiedLod && (
              <mesh position={[0.011, 0.012, 0.028]}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            )}
          </mesh>
          <mesh ref={rightEyeRef} position={[0.085, 0.015, 0.215]}>
            <sphereGeometry args={[0.036, 10, 10]} />
            <meshStandardMaterial color="#0F172A" roughness={0.15} />
            {!simplifiedLod && (
              <mesh position={[0.011, 0.012, 0.028]}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            )}
          </mesh>

          {/* Cute Rosy Cheeks */}
          {!simplifiedLod && (
            <>
              <mesh position={[-0.145, -0.045, 0.185]} rotation={[0, -0.45, 0]}>
                <circleGeometry args={[0.032, 10]} />
                <meshBasicMaterial color="#FB7185" transparent opacity={0.45} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0.145, -0.045, 0.185]} rotation={[0, 0.45, 0]}>
                <circleGeometry args={[0.032, 10]} />
                <meshBasicMaterial color="#FB7185" transparent opacity={0.45} side={THREE.DoubleSide} />
              </mesh>
            </>
          )}

          {/* Emotion-Reactive Mouth */}
          <mesh ref={mouthRef} position={[0, -0.075, 0.218]}>
            <capsuleGeometry args={[0.016, 0.028, 4, 6]} />
            <meshStandardMaterial color={status === 'blocked' || status === 'error' ? '#9F1239' : '#BE123C'} roughness={0.4} />
          </mesh>

          {/* 10 DISTINCT HAIRSTYLES */}
          {/* Top hair cap shared base */}
          {appearance.hairStyle === 'short_neat' && (
            <mesh position={[0, 0.08, -0.02]} scale={[1.08, 0.88, 1.05]} castShadow>
              <sphereGeometry args={[0.23, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshStandardMaterial color={appearance.hairColor} roughness={0.55} />
            </mesh>
          )}

          {appearance.hairStyle === 'side_part' && (
            <group>
              <mesh position={[0, 0.07, -0.02]} scale={[1.09, 0.9, 1.06]} castShadow>
                <sphereGeometry args={[0.232, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              <mesh position={[-0.08, 0.18, 0.12]} rotation={[0.2, 0.3, 0.4]}>
                <capsuleGeometry args={[0.055, 0.12, 4, 8]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
            </group>
          )}

          {appearance.hairStyle === 'bob' && (
            <group>
              <mesh position={[0, 0.05, -0.03]} scale={[1.12, 1.0, 1.1]} castShadow>
                <sphereGeometry args={[0.235, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              <mesh position={[-0.19, -0.04, 0.02]} castShadow>
                <capsuleGeometry args={[0.075, 0.16, 4, 8]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              <mesh position={[0.19, -0.04, 0.02]} castShadow>
                <capsuleGeometry args={[0.075, 0.16, 4, 8]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
            </group>
          )}

          {appearance.hairStyle === 'ponytail' && (
            <group>
              <mesh position={[0, 0.07, -0.01]} scale={[1.08, 0.9, 1.05]} castShadow>
                <sphereGeometry args={[0.232, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.04, -0.27]} rotation={[0.55, 0, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.22, 4, 8]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
            </group>
          )}

          {appearance.hairStyle === 'curly' && (
            <group>
              {[
                [0, 0.2, 0],
                [-0.16, 0.14, 0.04],
                [0.16, 0.14, 0.04],
                [-0.12, 0.15, -0.14],
                [0.12, 0.15, -0.14],
                [0, 0.12, -0.2],
              ].map(([x, y, z], i) => (
                <mesh key={i} position={[x, y, z]} castShadow>
                  <sphereGeometry args={[0.12, 10, 10]} />
                  <meshStandardMaterial color={appearance.hairColor} roughness={0.65} />
                </mesh>
              ))}
            </group>
          )}

          {appearance.hairStyle === 'spiky' && (
            <group>
              <mesh position={[0, 0.07, -0.02]} scale={[1.06, 0.85, 1.04]}>
                <sphereGeometry args={[0.228, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              {[
                [0, 0.28, 0.06, 0.2, 0],
                [-0.1, 0.25, 0.02, 0.1, 0.45],
                [0.1, 0.25, 0.02, 0.1, -0.45],
                [0, 0.24, -0.1, -0.35, 0],
              ].map(([x, y, z, rx, rz], i) => (
                <mesh key={i} position={[x, y, z]} rotation={[rx, 0, rz]} castShadow>
                  <coneGeometry args={[0.07, 0.16, 6]} />
                  <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
                </mesh>
              ))}
            </group>
          )}

          {appearance.hairStyle === 'bun' && (
            <group>
              <mesh position={[0, 0.07, -0.02]} scale={[1.08, 0.9, 1.05]}>
                <sphereGeometry args={[0.23, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.27, -0.08]} castShadow>
                <sphereGeometry args={[0.11, 12, 12]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
            </group>
          )}

          {appearance.hairStyle === 'long_wave' && (
            <group>
              <mesh position={[0, 0.06, -0.02]} scale={[1.12, 0.96, 1.08]} castShadow>
                <sphereGeometry args={[0.234, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.12, -0.17]} castShadow>
                <boxGeometry args={[0.38, 0.34, 0.14]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.5} />
              </mesh>
            </group>
          )}

          {appearance.hairStyle === 'undercut' && (
            <group>
              <mesh position={[0, 0.19, 0.02]} scale={[0.92, 0.55, 1.08]} castShadow>
                <capsuleGeometry args={[0.14, 0.1, 4, 10]} />
                <meshStandardMaterial color={appearance.hairColor} roughness={0.45} />
              </mesh>
              <mesh position={[0, 0.06, -0.04]} scale={[1.03, 0.78, 1.02]}>
                <sphereGeometry args={[0.228, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <meshStandardMaterial color="#1E293B" roughness={0.7} />
              </mesh>
            </group>
          )}

          {appearance.hairStyle === 'cap_hat' && (
            <group>
              <mesh position={[0, 0.1, 0]} scale={[1.1, 0.85, 1.1]} castShadow>
                <sphereGeometry args={[0.235, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={appearance.outfitColor} roughness={0.45} />
              </mesh>
              {/* Cap Brim */}
              <mesh position={[0, 0.1, 0.2]} rotation={[0.18, 0, 0]} castShadow>
                <boxGeometry args={[0.32, 0.03, 0.2]} />
                <meshStandardMaterial color="#0F172A" roughness={0.45} />
              </mesh>
            </group>
          )}

          {/* HEAD ACCESSORIES */}
          {appearance.accessory === 'glasses' && (
            <group position={[0, 0.015, 0.235]}>
              <mesh position={[-0.085, 0, 0]}>
                <torusGeometry args={[0.052, 0.01, 6, 14]} />
                <meshStandardMaterial color="#0F172A" metalness={0.6} roughness={0.2} />
              </mesh>
              <mesh position={[0.085, 0, 0]}>
                <torusGeometry args={[0.052, 0.01, 6, 14]} />
                <meshStandardMaterial color="#0F172A" metalness={0.6} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.055, 0.012, 0.012]} />
                <meshStandardMaterial color="#0F172A" metalness={0.6} roughness={0.2} />
              </mesh>
            </group>
          )}

          {appearance.accessory === 'headset' && (
            <group>
              <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.255, 0.016, 6, 18, Math.PI]} />
                <meshStandardMaterial color="#0EA5E9" roughness={0.3} metalness={0.5} />
              </mesh>
              <mesh position={[-0.25, 0, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
                <meshStandardMaterial color="#0F172A" roughness={0.4} />
              </mesh>
              <mesh position={[0.25, 0, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.04, 12]} />
                <meshStandardMaterial color="#0F172A" roughness={0.4} />
              </mesh>
              {/* Mic boom */}
              <mesh position={[0.17, -0.08, 0.16]} rotation={[0.4, -0.6, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.18, 6]} />
                <meshStandardMaterial color="#38BDF8" />
              </mesh>
            </group>
          )}

          {appearance.accessory === 'beret' && (
            <mesh position={[0.05, 0.22, -0.02]} rotation={[0.1, 0, -0.22]} scale={[1.25, 0.42, 1.2]} castShadow>
              <sphereGeometry args={[0.21, 14, 10]} />
              <meshStandardMaterial color="#EC4899" roughness={0.65} />
            </mesh>
          )}
        </group>
      </group>

      {/* FLOATING 3D STATUS PROPS */}
      {status === 'thinking' && (
        <group ref={thinkingDotsRef} position={[0, 1.48, 0]}>
          {[-0.12, 0, 0.12].map((x, idx) => (
            <mesh key={idx} position={[x, idx === 1 ? 0.04 : 0, 0]}>
              <sphereGeometry args={[0.036, 8, 8]} />
              <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      )}

      {status === 'done' && (
        <group ref={confettiRef}>
          {CONFETTI_OFFSETS.map(([x, y, z, col], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[i, i * 0.7, 0]}>
              <boxGeometry args={[0.045, 0.045, 0.015]} />
              <meshBasicMaterial color={col} />
            </mesh>
          ))}
        </group>
      )}

      {status === 'blocked' && (
        <group ref={blockedMarkRef} position={[0, 1.52, 0]}>
          <mesh>
            <octahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.75} />
          </mesh>
        </group>
      )}

      {status === 'error' && (
        <group ref={errorMarkRef} position={[0, 1.52, 0]}>
          <mesh>
            <coneGeometry args={[0.09, 0.16, 3]} />
            <meshStandardMaterial color="#DC2626" emissive="#EF4444" emissiveIntensity={0.9} />
          </mesh>
        </group>
      )}

      {/* SOCIAL BROADCAST / POSTING AURA EFFECT */}
      {isPostingSocial && (
        <group ref={socialAuraRef} position={[0, 1.52, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.014, 8, 24]} />
            <meshStandardMaterial color="#EC4899" emissive="#F472B6" emissiveIntensity={0.95} />
          </mesh>
          {[
            [0.3, 0.05, 0, '#1877F2'],
            [-0.22, 0.08, 0.2, '#0068FF'],
            [-0.22, 0.08, -0.2, '#EC4899'],
          ].map(([x, y, z, col], i) => (
            <mesh key={i} position={[x as number, y as number, z as number]}>
              <octahedronGeometry args={[0.045, 0]} />
              <meshStandardMaterial color={col as string} emissive={col as string} emissiveIntensity={0.85} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
