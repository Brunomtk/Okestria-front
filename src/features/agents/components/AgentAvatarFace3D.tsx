"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import {
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";

const FaceOnly = ({
  profile,
  onReady,
}: {
  profile: AgentAvatarProfile;
  onReady: () => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
  }, [profile]);

  useFrame((state) => {
    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.5) * 0.18;
  });

  const skin = profile.body.skinTone;
  const hairColor = profile.hair.color;
  const topColor = profile.clothing.topColor;
  const accessoryColor = topColor;

  return (
    <group ref={groupRef} position={[0, -0.02, 0]} scale={[3.4, 3.4, 3.4]}>
      {/* Neck hint */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.07, 0.04, 0.07]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.17, 0.17, 0.15]} />
        <meshLambertMaterial color={skin} />
      </mesh>

      {/* ── Hair ── */}
      {profile.hair.style === "short" ? (
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.18, 0.05, 0.15]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {profile.hair.style === "parted" ? (
        <>
          <mesh position={[0, 0.085, 0]}>
            <boxGeometry args={[0.18, 0.045, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.03, 0.12, 0.01]} rotation={[0.1, 0, -0.2]}>
            <boxGeometry args={[0.12, 0.03, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {profile.hair.style === "spiky" ? (
        <>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.17, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.05, 0.12, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.04, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.135, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.04, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {profile.hair.style === "bun" ? (
        <>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.13, -0.03]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {profile.hair.style === "buzz" ? (
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[0.175, 0.02, 0.155]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {profile.hair.style === "long" ? (
        <>
          <mesh position={[0, 0.085, 0]}>
            <boxGeometry args={[0.19, 0.045, 0.16]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.09, -0.01, -0.01]}>
            <boxGeometry args={[0.04, 0.14, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.09, -0.01, -0.01]}>
            <boxGeometry args={[0.04, 0.14, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, -0.03, -0.07]}>
            <boxGeometry args={[0.16, 0.16, 0.03]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {profile.hair.style === "curly" ? (
        <>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.22, 0.08, 0.2]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.21, 0.04, 0.19]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {profile.hair.style === "mohawk" ? (
        <>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.17, 0.03, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.14, 0.01]}>
            <boxGeometry args={[0.04, 0.1, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.18, 0.01]}>
            <boxGeometry args={[0.035, 0.04, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {profile.hair.style === "ponytail" ? (
        <>
          <mesh position={[0, 0.085, 0]}>
            <boxGeometry args={[0.18, 0.045, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.05, -0.09]}>
            <boxGeometry args={[0.06, 0.04, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, -0.02, -0.1]}>
            <boxGeometry args={[0.05, 0.1, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}

      {/* ── Hats ── */}
      {profile.accessories.hatStyle === "cap" ? (
        <>
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.18, 0.03, 0.16]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.115, 0.07]}>
            <boxGeometry args={[0.09, 0.012, 0.05]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {profile.accessories.hatStyle === "beanie" ? (
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.19, 0.06, 0.17]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {profile.accessories.hatStyle === "fedora" ? (
        <>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.26, 0.015, 0.22]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.17, 0.06, 0.14]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.13, 0.001]}>
            <boxGeometry args={[0.172, 0.015, 0.142]} />
            <meshLambertMaterial color="#1a1a1a" />
          </mesh>
        </>
      ) : null}
      {profile.accessories.hatStyle === "headband" ? (
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.185, 0.025, 0.165]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {profile.accessories.hatStyle === "tophat" ? (
        <>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.22, 0.015, 0.19]} />
            <meshLambertMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[0.15, 0.12, 0.13]} />
            <meshLambertMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0, 0.135, 0.001]}>
            <boxGeometry args={[0.152, 0.015, 0.132]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}

      {/* ── Headset ── */}
      {profile.accessories.headset ? (
        <>
          <mesh position={[0, 0.12, -0.022]}>
            <boxGeometry args={[0.166, 0.014, 0.02]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[-0.088, 0.085, -0.018]}>
            <boxGeometry args={[0.014, 0.056, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.088, 0.085, -0.018]}>
            <boxGeometry args={[0.014, 0.056, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[-0.094, 0.025, 0.004]}>
            <boxGeometry args={[0.026, 0.072, 0.042]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <mesh position={[0.094, 0.025, 0.004]}>
            <boxGeometry args={[0.026, 0.072, 0.042]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
        </>
      ) : null}

      {/* ── Eyes ── */}
      <mesh position={[-0.04, 0.005, 0.078]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
      <mesh position={[0.04, 0.005, 0.078]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
      {/* Eye highlights */}
      <mesh position={[-0.032, 0.012, 0.08]}>
        <boxGeometry args={[0.008, 0.008, 0.006]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.048, 0.012, 0.08]}>
        <boxGeometry args={[0.008, 0.008, 0.006]} />
        <meshBasicMaterial color="#fff" />
      </mesh>

      {/* ── Glasses ── */}
      {profile.accessories.glasses ? (
        <>
          <mesh position={[-0.04, 0.005, 0.084]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0.04, 0.005, 0.084]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0, 0.005, 0.084]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#111827" />
          </mesh>
        </>
      ) : null}

      {/* ── Mouth (smile) ── */}
      <mesh position={[0, -0.04, 0.079]}>
        <boxGeometry args={[0.05, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>
      {/* Smile corners */}
      <mesh position={[-0.031, -0.032, 0.079]} rotation={[0, 0, 0.62]}>
        <boxGeometry args={[0.014, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>
      <mesh position={[0.031, -0.032, 0.079]} rotation={[0, 0, -0.62]}>
        <boxGeometry args={[0.014, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>

      {/* ── Scarf ── */}
      {profile.accessories.scarf ? (
        <mesh position={[0, -0.12, 0.02]}>
          <boxGeometry args={[0.14, 0.03, 0.09]} />
          <meshLambertMaterial color="#dc2626" />
        </mesh>
      ) : null}
    </group>
  );
};

export const AgentAvatarFace3D = ({
  profile,
  size = 52,
  className = "",
}: {
  profile: AgentAvatarProfile | null | undefined;
  size?: number;
  className?: string;
}) => {
  const resolved = useMemo(
    () => profile ?? createDefaultAgentAvatarProfile("face"),
    [profile],
  );
  const profileKey = useMemo(() => JSON.stringify(resolved), [resolved]);
  const [ready, setReady] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-border/60 bg-[#0a0e1a] ${className}`}
      style={{ width: size, height: size }}
    >
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0e1a]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
        </div>
      ) : null}
      <Canvas
        key={profileKey}
        camera={{ position: [0, 0, 0.7], fov: 36 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: size, height: size }}
      >
        <color attach="background" args={["#0a0e1a"]} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} />
        <directionalLight position={[-3, 1, 2]} intensity={0.7} color="#89a6ff" />
        <FaceOnly profile={resolved} onReady={() => setReady(true)} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
