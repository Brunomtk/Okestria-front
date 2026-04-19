"use client";

// AgentOfficeFigure3D — a reusable compact 3D preview that renders EXACTLY the
// same geometry as the office <AgentModel> (v42 polish), but driven by a plain
// AgentAvatarProfile. Used by FleetSidebar rows and the AgentChatPanel header
// so the preview always matches the figure running in the office scene.

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";

// ──────────────────────────────────────────────────────────────────────────
// Shared face texture (same warm gradient + nose highlights as AgentModel).
// ──────────────────────────────────────────────────────────────────────────
const buildFaceTexture = (skin: string) => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 128, 128);

  const topGradient = ctx.createLinearGradient(0, 0, 0, 128);
  topGradient.addColorStop(0, "rgba(255,240,220,0.22)");
  topGradient.addColorStop(0.45, "rgba(255,255,255,0)");
  topGradient.addColorStop(1, "rgba(196,122,84,0.14)");
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, 128, 128);

  const sideGradient = ctx.createLinearGradient(0, 0, 128, 0);
  sideGradient.addColorStop(0, "rgba(90,60,40,0.18)");
  sideGradient.addColorStop(0.18, "rgba(90,60,40,0)");
  sideGradient.addColorStop(0.82, "rgba(90,60,40,0)");
  sideGradient.addColorStop(1, "rgba(90,60,40,0.18)");
  ctx.fillStyle = sideGradient;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = "rgba(224,124,108,0.28)";
  ctx.beginPath();
  ctx.ellipse(36, 78, 11, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(92, 78, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,245,225,0.16)";
  ctx.beginPath();
  ctx.ellipse(64, 28, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(180,110,80,0.12)";
  ctx.beginPath();
  ctx.ellipse(64, 108, 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(170,100,70,0.25)";
  ctx.fillRect(66, 58, 4, 18);
  ctx.fillStyle = "rgba(255,235,210,0.28)";
  ctx.fillRect(60, 58, 4, 18);
  ctx.fillStyle = "rgba(170,100,70,0.32)";
  ctx.beginPath();
  ctx.ellipse(64, 78, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

// ──────────────────────────────────────────────────────────────────────────
// Full-body figure — mirror of AgentModel geometry (v42 polish).
// A gentle rotate + breathe gives it life without needing an agent tick loop.
// ──────────────────────────────────────────────────────────────────────────
export const OfficeFigure = ({
  profile,
  onReady,
}: {
  profile: AgentAvatarProfile;
  onReady?: () => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
  }, [profile]);

  useFrame((state) => {
    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.();
    }
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Showcase sway — wider arc so the rounded shoulders, ears and chin
    // catch the side light and read clearly at small sizes.
    groupRef.current.rotation.y = Math.sin(t * 0.55) * 0.65 + 0.2;
    // Subtle breathing on torso scale via micro-position.
    groupRef.current.position.y = -0.78 + Math.sin(t * 0.9) * 0.006;
    // Idle arm breathing — keep arms slightly away from torso so the
    // shoulder sphere cap is visible (not hidden behind sleeve).
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -0.05 + Math.sin(t * 0.9) * 0.05;
      leftArmRef.current.rotation.z = -0.14;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -0.05 + Math.sin(t * 0.9 + Math.PI) * 0.05;
      rightArmRef.current.rotation.z = 0.14;
    }
  });

  const skin = profile.body.skinTone;
  const topColor = profile.clothing.topColor;
  const trouserColor = profile.clothing.bottomColor;
  const shoeColor = profile.clothing.shoesColor;
  const hairColor = profile.hair.color;
  const hairStyle = profile.hair.style;
  const topStyle = profile.clothing.topStyle;
  const bottomStyle = profile.clothing.bottomStyle;
  const hatStyle = profile.accessories.hatStyle;
  const showGlasses = profile.accessories.glasses;
  const showHeadset = profile.accessories.headset;
  const showBackpack = profile.accessories.backpack;
  const showScarf = profile.accessories.scarf;
  const showWatch = profile.accessories.watch;
  const accessoryColor = topColor;
  const sleeveColor = topStyle === "jacket" || topStyle === "vest" ? "#dbe4ff" : topColor;
  const cuffColor = topStyle === "hoodie" || topStyle === "sweater" ? "#d1d5db" : sleeveColor;
  const topAccentColor = topStyle === "jacket" ? "#1f2937" : cuffColor;
  const hasSleeves = topStyle !== "tank" && topStyle !== "vest";

  const faceTexture = useMemo(() => buildFaceTexture(skin), [skin]);

  // We reproduce the exact sizes from AgentModel so the silhouette matches
  // 1:1 when scaled. AgentModel uses AGENT_SCALE * (1, 1.1, 1) world-space —
  // here we lift by -0.78 to center it vertically in a 1x1x1 preview canvas.
  return (
    <group ref={groupRef} position={[0, -0.78, 0]} scale={[2.6, 2.6 * 1.1, 2.6]}>
      {/* Floor shadow (layered, soft) */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 18]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* ── Legs / Skirt ── */}
      {bottomStyle === "skirt" ? (
        <group>
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.21, 0.1, 0.105]} />
            <meshLambertMaterial color={trouserColor} />
          </mesh>
          <mesh position={[0, 0.082, 0]}>
            <boxGeometry args={[0.215, 0.015, 0.108]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
          <group position={[-0.045, 0.04, 0]}>
            <mesh>
              <cylinderGeometry args={[0.023, 0.022, 0.08, 12]} />
              <meshLambertMaterial color={skin} />
            </mesh>
            <mesh position={[0, -0.075, 0.008]}>
              <boxGeometry args={[0.07, 0.025, 0.12]} />
              <meshLambertMaterial color="#17191d" />
            </mesh>
            <mesh position={[0, -0.055, 0.008]}>
              <boxGeometry args={[0.068, 0.035, 0.115]} />
              <meshLambertMaterial color={shoeColor} />
            </mesh>
          </group>
          <group position={[0.045, 0.04, 0]}>
            <mesh>
              <cylinderGeometry args={[0.023, 0.022, 0.08, 12]} />
              <meshLambertMaterial color={skin} />
            </mesh>
            <mesh position={[0, -0.075, 0.008]}>
              <boxGeometry args={[0.07, 0.025, 0.12]} />
              <meshLambertMaterial color="#17191d" />
            </mesh>
            <mesh position={[0, -0.055, 0.008]}>
              <boxGeometry args={[0.068, 0.035, 0.115]} />
              <meshLambertMaterial color={shoeColor} />
            </mesh>
          </group>
        </group>
      ) : (
        <>
          <group position={[-0.045, 0.1, 0]}>
            {bottomStyle === "shorts" ? (
              <>
                <mesh position={[0, 0.03, 0]}>
                  <boxGeometry args={[0.075, 0.085, 0.085]} />
                  <meshLambertMaterial color={trouserColor} />
                </mesh>
                <mesh position={[0, -0.045, 0]}>
                  <cylinderGeometry args={[0.024, 0.023, 0.06, 12]} />
                  <meshLambertMaterial color={skin} />
                </mesh>
              </>
            ) : bottomStyle === "joggers" ? (
              <>
                <mesh>
                  <cylinderGeometry args={[0.038, 0.036, 0.14, 14]} />
                  <meshLambertMaterial color={trouserColor} />
                </mesh>
                <mesh position={[0, -0.055, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.025, 14]} />
                  <meshLambertMaterial color={cuffColor} />
                </mesh>
              </>
            ) : (
              <>
                <mesh>
                  <cylinderGeometry args={[0.035, 0.032, 0.14, 14]} />
                  <meshLambertMaterial color={trouserColor} />
                </mesh>
                {bottomStyle === "cuffed" ? (
                  <mesh position={[0, -0.05, 0]}>
                    <cylinderGeometry args={[0.038, 0.038, 0.022, 14]} />
                    <meshLambertMaterial color="#d1d5db" />
                  </mesh>
                ) : null}
              </>
            )}
            <mesh position={[0, -0.11, 0.008]}>
              <boxGeometry args={[0.072, 0.022, 0.122]} />
              <meshLambertMaterial color="#17191d" />
            </mesh>
            <mesh position={[0, -0.09, 0.008]}>
              <boxGeometry args={[0.07, 0.032, 0.118]} />
              <meshLambertMaterial color={shoeColor} />
            </mesh>
            <mesh position={[0, -0.085, 0.05]}>
              <boxGeometry args={[0.068, 0.03, 0.022]} />
              <meshLambertMaterial color="#1f2937" />
            </mesh>
          </group>
          <group position={[0.045, 0.1, 0]}>
            {bottomStyle === "shorts" ? (
              <>
                <mesh position={[0, 0.03, 0]}>
                  <boxGeometry args={[0.075, 0.085, 0.085]} />
                  <meshLambertMaterial color={trouserColor} />
                </mesh>
                <mesh position={[0, -0.045, 0]}>
                  <cylinderGeometry args={[0.024, 0.023, 0.06, 12]} />
                  <meshLambertMaterial color={skin} />
                </mesh>
              </>
            ) : bottomStyle === "joggers" ? (
              <>
                <mesh>
                  <cylinderGeometry args={[0.038, 0.036, 0.14, 14]} />
                  <meshLambertMaterial color={trouserColor} />
                </mesh>
                <mesh position={[0, -0.055, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.025, 14]} />
                  <meshLambertMaterial color={cuffColor} />
                </mesh>
              </>
            ) : (
              <>
                <mesh>
                  <cylinderGeometry args={[0.035, 0.032, 0.14, 14]} />
                  <meshLambertMaterial color={trouserColor} />
                </mesh>
                {bottomStyle === "cuffed" ? (
                  <mesh position={[0, -0.05, 0]}>
                    <cylinderGeometry args={[0.038, 0.038, 0.022, 14]} />
                    <meshLambertMaterial color="#d1d5db" />
                  </mesh>
                ) : null}
              </>
            )}
            <mesh position={[0, -0.11, 0.008]}>
              <boxGeometry args={[0.072, 0.022, 0.122]} />
              <meshLambertMaterial color="#17191d" />
            </mesh>
            <mesh position={[0, -0.09, 0.008]}>
              <boxGeometry args={[0.07, 0.032, 0.118]} />
              <meshLambertMaterial color={shoeColor} />
            </mesh>
            <mesh position={[0, -0.085, 0.05]}>
              <boxGeometry args={[0.068, 0.03, 0.022]} />
              <meshLambertMaterial color="#1f2937" />
            </mesh>
          </group>
        </>
      )}

      {/* Backpack */}
      {showBackpack ? (
        <group position={[0, 0.28, -0.08]}>
          <mesh>
            <boxGeometry args={[0.15, 0.18, 0.06]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[-0.06, 0.02, 0.02]}>
            <boxGeometry args={[0.018, 0.16, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.06, 0.02, 0.02]}>
            <boxGeometry args={[0.018, 0.16, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
        </group>
      ) : null}

      {/* ── Torso ── */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.185, 0.16, 0.105]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.1]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      {/* Shoulder rounding */}
      <mesh position={[-0.095, 0.355, 0]}>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      <mesh position={[0.095, 0.355, 0]}>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      {/* Neckline */}
      <mesh position={[0, 0.385, 0.03]}>
        <boxGeometry args={[0.078, 0.022, 0.042]} />
        <meshLambertMaterial color={topAccentColor} />
      </mesh>

      {topStyle === "hoodie" ? (
        <>
          <mesh position={[0, 0.35, -0.045]}>
            <boxGeometry args={[0.17, 0.1, 0.03]} />
            <meshLambertMaterial color={topColor} />
          </mesh>
          <mesh position={[0, 0.22, 0.056]}>
            <boxGeometry args={[0.11, 0.03, 0.012]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        </>
      ) : null}
      {topStyle === "jacket" ? (
        <>
          <mesh position={[0, 0.28, 0.056]}>
            <boxGeometry args={[0.182, 0.21, 0.012]} />
            <meshLambertMaterial color={topAccentColor} />
          </mesh>
          <mesh position={[0, 0.28, 0.063]}>
            <boxGeometry args={[0.034, 0.2, 0.01]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
        </>
      ) : null}
      {topStyle === "vest" ? (
        <mesh position={[0, 0.28, 0.056]}>
          <boxGeometry args={[0.182, 0.21, 0.012]} />
          <meshLambertMaterial color="#374151" />
        </mesh>
      ) : null}
      {topStyle === "polo" ? (
        <>
          <mesh position={[-0.055, 0.38, 0.035]} rotation={[0.3, 0, -0.15]}>
            <boxGeometry args={[0.045, 0.022, 0.035]} />
            <meshLambertMaterial color={topColor} />
          </mesh>
          <mesh position={[0.055, 0.38, 0.035]} rotation={[0.3, 0, 0.15]}>
            <boxGeometry args={[0.045, 0.022, 0.035]} />
            <meshLambertMaterial color={topColor} />
          </mesh>
        </>
      ) : null}
      {topStyle === "sweater" ? (
        <>
          <mesh position={[0, 0.35, -0.045]}>
            <boxGeometry args={[0.17, 0.1, 0.03]} />
            <meshLambertMaterial color={topColor} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[0.09, 0.025, 0.08]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
          <mesh position={[0, 0.22, 0.056]}>
            <boxGeometry args={[0.11, 0.03, 0.012]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        </>
      ) : null}

      {/* Watch */}
      {showWatch ? (
        <mesh position={[0.12, 0.12, 0.018]}>
          <boxGeometry args={[0.035, 0.015, 0.035]} />
          <meshLambertMaterial color="#334155" />
        </mesh>
      ) : null}

      {/* Scarf */}
      {showScarf ? (
        <>
          <mesh position={[0, 0.38, 0.025]}>
            <boxGeometry args={[0.15, 0.035, 0.09]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0.035, 0.34, 0.055]}>
            <boxGeometry args={[0.035, 0.07, 0.025]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
        </>
      ) : null}

      {/* ── Arms ── */}
      <group ref={rightArmRef} position={[-0.12, 0.28, 0]}>
        <mesh position={[0, 0.005, 0]}>
          <sphereGeometry args={[0.035, 14, 12]} />
          <meshLambertMaterial color={sleeveColor} />
        </mesh>
        {hasSleeves ? (
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.032, 0.03, 0.16, 14]} />
            <meshLambertMaterial color={sleeveColor} />
          </mesh>
        ) : (
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.029, 0.027, 0.16, 14]} />
            <meshLambertMaterial color={skin} />
          </mesh>
        )}
        {(topStyle === "hoodie" || topStyle === "sweater") ? (
          <mesh position={[0, -0.145, 0]}>
            <cylinderGeometry args={[0.034, 0.034, 0.03, 14]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        ) : null}
        <mesh position={[0, -0.175, 0]}>
          <sphereGeometry args={[0.03, 14, 12]} />
          <meshLambertMaterial color={skin} />
        </mesh>
      </group>
      <group ref={leftArmRef} position={[0.12, 0.28, 0]}>
        <mesh position={[0, 0.005, 0]}>
          <sphereGeometry args={[0.035, 14, 12]} />
          <meshLambertMaterial color={sleeveColor} />
        </mesh>
        {hasSleeves ? (
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.032, 0.03, 0.16, 14]} />
            <meshLambertMaterial color={sleeveColor} />
          </mesh>
        ) : (
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.029, 0.027, 0.16, 14]} />
            <meshLambertMaterial color={skin} />
          </mesh>
        )}
        {(topStyle === "hoodie" || topStyle === "sweater") ? (
          <mesh position={[0, -0.145, 0]}>
            <cylinderGeometry args={[0.034, 0.034, 0.03, 14]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        ) : null}
        <mesh position={[0, -0.175, 0]}>
          <sphereGeometry args={[0.03, 14, 12]} />
          <meshLambertMaterial color={skin} />
        </mesh>
      </group>

      {/* ── Neck ── */}
      <mesh position={[0, 0.405, 0]}>
        <cylinderGeometry args={[0.036, 0.04, 0.055, 14]} />
        <meshLambertMaterial color={skin} />
      </mesh>

      {/* ── Head ── */}
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[0.16, 0.16, 0.14]} />
        <meshLambertMaterial attach="material-0" color={skin} />
        <meshLambertMaterial attach="material-1" color={skin} />
        <meshLambertMaterial attach="material-2" color={skin} />
        <meshLambertMaterial attach="material-3" color={skin} />
        <meshLambertMaterial attach="material-4" map={faceTexture ?? undefined} color={faceTexture ? "#ffffff" : skin} />
        <meshLambertMaterial attach="material-5" color={skin} />
      </mesh>
      {/* Chin softening */}
      <mesh position={[0, 0.4, 0.012]}>
        <boxGeometry args={[0.12, 0.04, 0.11]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.082, 0.475, 0]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      <mesh position={[0.082, 0.475, 0]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshLambertMaterial color={skin} />
      </mesh>

      {/* ── Hair styles ── */}
      {hairStyle === "short" ? (
        <mesh position={[0, 0.555, 0]}>
          <boxGeometry args={[0.17, 0.05, 0.15]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {hairStyle === "parted" ? (
        <>
          <mesh position={[0, 0.555, 0]}>
            <boxGeometry args={[0.17, 0.045, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.035, 0.59, 0.01]} rotation={[0.1, 0, -0.2]}>
            <boxGeometry args={[0.12, 0.03, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "spiky" ? (
        <>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.05, 0.59, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.04, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.605, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.05, 0.59, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.04, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "bun" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.17, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.6, -0.035]}>
            <sphereGeometry args={[0.042, 14, 14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "buzz" ? (
        <mesh position={[0, 0.545, 0]}>
          <boxGeometry args={[0.165, 0.018, 0.145]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {hairStyle === "long" ? (
        <>
          <mesh position={[0, 0.555, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.155]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.085, 0.46, -0.01]}>
            <boxGeometry args={[0.035, 0.14, 0.11]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.085, 0.46, -0.01]}>
            <boxGeometry args={[0.035, 0.14, 0.11]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.44, -0.065]}>
            <boxGeometry args={[0.15, 0.16, 0.025]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "curly" ? (
        <>
          <mesh position={[0, 0.57, 0]}>
            <boxGeometry args={[0.2, 0.07, 0.18]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.53, 0]}>
            <boxGeometry args={[0.19, 0.035, 0.17]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "mohawk" ? (
        <>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.16, 0.025, 0.13]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.61, 0.008]}>
            <boxGeometry args={[0.035, 0.09, 0.11]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.645, 0.008]}>
            <boxGeometry args={[0.03, 0.035, 0.07]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "ponytail" ? (
        <>
          <mesh position={[0, 0.555, 0]}>
            <boxGeometry args={[0.17, 0.04, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.52, -0.085]}>
            <boxGeometry args={[0.055, 0.035, 0.035]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.45, -0.095]}>
            <boxGeometry args={[0.045, 0.1, 0.035]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}

      {/* ── Hats ── */}
      {hatStyle === "cap" ? (
        <>
          <mesh position={[0, 0.59, 0]}>
            <boxGeometry args={[0.172, 0.03, 0.152]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.575, 0.07]}>
            <boxGeometry args={[0.09, 0.012, 0.05]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {hatStyle === "beanie" ? (
        <mesh position={[0, 0.59, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.16]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {hatStyle === "fedora" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.24, 0.012, 0.2]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.615, 0]}>
            <boxGeometry args={[0.16, 0.055, 0.13]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.595, 0.001]}>
            <boxGeometry args={[0.162, 0.012, 0.132]} />
            <meshLambertMaterial color="#1a1a1a" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "headband" ? (
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.175, 0.022, 0.155]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {hatStyle === "bandana" ? (
        <>
          <mesh position={[0, 0.56, 0]}>
            <boxGeometry args={[0.175, 0.03, 0.155]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.55, -0.08]}>
            <boxGeometry args={[0.055, 0.025, 0.025]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0.018, 0.53, -0.085]}>
            <boxGeometry args={[0.022, 0.045, 0.018]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {hatStyle === "tophat" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.2, 0.012, 0.18]} />
            <meshLambertMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0, 0.655, 0]}>
            <boxGeometry args={[0.14, 0.11, 0.12]} />
            <meshLambertMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0, 0.6, 0.001]}>
            <boxGeometry args={[0.142, 0.012, 0.122]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}

      {/* Headset */}
      {showHeadset ? (
        <>
          <mesh position={[0, 0.59, -0.022]}>
            <boxGeometry args={[0.162, 0.014, 0.02]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[-0.086, 0.556, -0.018]}>
            <boxGeometry args={[0.014, 0.054, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.086, 0.556, -0.018]}>
            <boxGeometry args={[0.014, 0.054, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[-0.092, 0.498, 0.004]}>
            <boxGeometry args={[0.026, 0.072, 0.042]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <mesh position={[0.092, 0.498, 0.004]}>
            <boxGeometry args={[0.026, 0.072, 0.042]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <mesh position={[0.084, 0.462, 0.052]} rotation={[0.16, 0.18, -0.9]}>
            <boxGeometry args={[0.012, 0.066, 0.012]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.07, 0.434, 0.082]}>
            <boxGeometry args={[0.028, 0.014, 0.018]} />
            <meshLambertMaterial color="#94a3b8" />
          </mesh>
        </>
      ) : null}

      {/* Brows */}
      <mesh position={[-0.04, 0.52, 0.074]}>
        <boxGeometry args={[0.042, 0.012, 0.01]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
      <mesh position={[0.04, 0.52, 0.074]}>
        <boxGeometry args={[0.042, 0.012, 0.01]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
      {/* Eye whites */}
      <mesh position={[-0.04, 0.475, 0.07]}>
        <boxGeometry args={[0.034, 0.034, 0.006]} />
        <meshBasicMaterial color="#f5f1e8" />
      </mesh>
      <mesh position={[0.04, 0.475, 0.07]}>
        <boxGeometry args={[0.034, 0.034, 0.006]} />
        <meshBasicMaterial color="#f5f1e8" />
      </mesh>
      {/* Iris */}
      <mesh position={[-0.04, 0.475, 0.073]}>
        <boxGeometry args={[0.026, 0.026, 0.004]} />
        <meshBasicMaterial color="#6b3e22" />
      </mesh>
      <mesh position={[0.04, 0.475, 0.073]}>
        <boxGeometry args={[0.026, 0.026, 0.004]} />
        <meshBasicMaterial color="#6b3e22" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.04, 0.475, 0.076]}>
        <boxGeometry args={[0.018, 0.022, 0.004]} />
        <meshBasicMaterial color="#10101c" />
      </mesh>
      <mesh position={[0.04, 0.475, 0.076]}>
        <boxGeometry args={[0.018, 0.022, 0.004]} />
        <meshBasicMaterial color="#10101c" />
      </mesh>
      {/* Catchlights */}
      <mesh position={[-0.033, 0.482, 0.078]}>
        <boxGeometry args={[0.008, 0.008, 0.003]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.047, 0.482, 0.078]}>
        <boxGeometry args={[0.008, 0.008, 0.003]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      {/* Glasses */}
      {showGlasses ? (
        <>
          <mesh position={[-0.04, 0.475, 0.078]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0.04, 0.475, 0.078]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0, 0.475, 0.078]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#111827" />
          </mesh>
        </>
      ) : null}
      {/* Mouth */}
      <mesh position={[0, 0.436, 0.074]}>
        <boxGeometry args={[0.044, 0.014, 0.006]} />
        <meshBasicMaterial color="#a85560" />
      </mesh>
      <mesh position={[0, 0.444, 0.073]}>
        <boxGeometry args={[0.036, 0.006, 0.003]} />
        <meshBasicMaterial color="#7c3f45" />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Small inline preview — intended for sidebar rows & chat headers.
// ──────────────────────────────────────────────────────────────────────────
type AgentOfficeFigure3DProps = {
  profile: AgentAvatarProfile | null | undefined;
  size: number;
  className?: string;
  seed?: string;
};

export const AgentOfficeFigure3D = ({
  profile,
  size,
  className = "",
  seed,
}: AgentOfficeFigure3DProps) => {
  const resolvedProfile = useMemo(
    () => profile ?? createDefaultAgentAvatarProfile(seed ?? "preview"),
    [profile, seed],
  );
  const profileKey = useMemo(
    () => JSON.stringify(resolvedProfile),
    [resolvedProfile],
  );
  const [readyProfileKey, setReadyProfileKey] = useState<string | null>(null);
  const isReady = readyProfileKey === profileKey;

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-border bg-[#0a0f1d] ${className}`}
      style={{ width: size, height: size }}
    >
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        </div>
      ) : null}
      <Canvas
        key={profileKey}
        /* Pull the camera back + tilt down a touch so we get a 3/4 view
           that reveals rounded shoulders, ears, and chin silhouette. */
        camera={{ position: [0.35, 0.35, 2.15], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0a0f1d"]} />
        {/* Softer ambient so the rim light can actually define form. */}
        <ambientLight intensity={0.85} />
        {/* Key light — strong, from front-right, catches shoulder caps. */}
        <directionalLight position={[3, 4, 5]} intensity={1.7} />
        {/* Fill — cool blue from the left, gives the round parts a wraparound. */}
        <directionalLight position={[-4, 2, 3]} intensity={0.9} color="#89a6ff" />
        {/* Rim — behind-above, makes ears, shoulder spheres and hand
            spheres pop off the dark background. */}
        <directionalLight position={[0, 4, -5]} intensity={1.1} color="#f0d9b5" />
        <OfficeFigure
          profile={resolvedProfile}
          onReady={() => setReadyProfileKey(profileKey)}
        />
      </Canvas>
    </div>
  );
};
