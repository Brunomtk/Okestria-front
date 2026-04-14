"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";

/* ────────────────────────────────────────────────────────────────────────────
 *  PreviewFigure – full-featured 3-D avatar preview with ALL customisation
 * ──────────────────────────────────────────────────────────────────────────── */

const PreviewFigure = ({
  profile,
  onFirstFrame,
}: {
  profile: AgentAvatarProfile;
  onFirstFrame: () => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const reportedReadyRef = useRef(false);

  useEffect(() => {
    reportedReadyRef.current = false;
  }, [profile]);

  useFrame((state) => {
    if (!reportedReadyRef.current) {
      reportedReadyRef.current = true;
      onFirstFrame();
    }
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.45) * 0.35 + 0.25;
  });

  /* ── derive colours / flags from profile ── */
  const skin = profile.body.skinTone;
  const topColor = profile.clothing.topColor;
  const bottomColor = profile.clothing.bottomColor;
  const shoeColor = profile.clothing.shoesColor;
  const hairColor = profile.hair.color;
  const accessoryColor = topColor;
  const topStyle = profile.clothing.topStyle;
  const bottomStyle = profile.clothing.bottomStyle;
  const hairStyle = profile.hair.style;
  const hatStyle = profile.accessories.hatStyle;

  const sleeveColor =
    topStyle === "jacket" || topStyle === "suit" || topStyle === "dress_shirt"
      ? "#dbe4ff"
      : topColor;
  const cuffColor = topStyle === "hoodie" ? "#d1d5db" : sleeveColor;

  const isSleeveless = topStyle === "tank_top" || topStyle === "vest";
  const armSleeveColor = isSleeveless ? skin : sleeveColor;

  /* new fields (safe defaults for old profiles) */
  const facialHair = profile.face?.facialHair ?? "none";
  const facialHairColor = profile.face?.facialHairColor ?? hairColor;
  const glassesStyle =
    typeof profile.accessories.glasses === "string"
      ? profile.accessories.glasses
      : profile.accessories.glasses
        ? "square"
        : "none";
  const earringStyle = profile.accessories.earrings ?? "none";
  const watchStyle = profile.accessories.watch ?? "none";
  const neckwearStyle = profile.accessories.neckwear ?? "none";
  const bodyBuild = profile.body.build ?? "average";

  /* body build scale */
  const bs = {
    average: { tw: 1, th: 1, lw: 1 },
    slim: { tw: 0.85, th: 1.02, lw: 0.88 },
    athletic: { tw: 1.06, th: 1, lw: 1.05 },
    stocky: { tw: 1.16, th: 0.95, lw: 1.12 },
  }[bodyBuild];

  /* ── helper: pill for enum options needs no JSX – tiny inline Pill ── */
  const showGlasses = glassesStyle !== "none";

  return (
    <group ref={groupRef} position={[0, -0.72, 0]} scale={[1.45, 1.45, 1.45]}>
      {/* ── shadow ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>

      {/* ── backpack ── */}
      {profile.accessories.backpack ? (
        <group position={[0, 0.31, -0.08]}>
          <mesh>
            <boxGeometry args={[0.16, 0.2, 0.06]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[-0.06, 0.02, 0.02]}>
            <boxGeometry args={[0.018, 0.16, 0.018]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0.06, 0.02, 0.02]}>
            <boxGeometry args={[0.018, 0.16, 0.018]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </group>
      ) : null}

      {/* ══════════════════  LEGS  ══════════════════ */}
      {/* ── right leg ── */}
      <group position={[-0.05, 0.12, 0]}>
        {bottomStyle === "shorts" ? (
          <>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.07 * bs.lw, 0.08, 0.08 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0, -0.045, 0]}>
              <boxGeometry args={[0.05 * bs.lw, 0.06, 0.05 * bs.lw]} />
              <meshLambertMaterial color={skin} />
            </mesh>
          </>
        ) : bottomStyle === "skirt" ? (
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.07 * bs.lw, 0.1, 0.08 * bs.lw]} />
            <meshLambertMaterial color={bottomColor} />
          </mesh>
        ) : bottomStyle === "cargo" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * bs.lw, 0.14, 0.08 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[-0.038 * bs.lw, -0.01, 0]}>
              <boxGeometry args={[0.022, 0.04, 0.035]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
          </>
        ) : bottomStyle === "joggers" ? (
          <>
            <mesh>
              <boxGeometry args={[0.072 * bs.lw, 0.14, 0.082 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0, -0.065, 0]}>
              <boxGeometry args={[0.076 * bs.lw, 0.022, 0.086 * bs.lw]} />
              <meshLambertMaterial color="#d1d5db" />
            </mesh>
          </>
        ) : bottomStyle === "formal" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * bs.lw, 0.14, 0.08 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0, 0, 0.041 * bs.lw]}>
              <boxGeometry args={[0.008, 0.13, 0.004]} />
              <meshLambertMaterial color="#1f2937" />
            </mesh>
          </>
        ) : (
          <mesh>
            <boxGeometry args={[0.07 * bs.lw, 0.14, 0.08 * bs.lw]} />
            <meshLambertMaterial color={bottomColor} />
          </mesh>
        )}
        {bottomStyle === "cuffed" ? (
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.074 * bs.lw, 0.022, 0.084 * bs.lw]} />
            <meshLambertMaterial color="#d1d5db" />
          </mesh>
        ) : null}
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[0.07, 0.05, 0.12]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>
      {/* ── left leg ── */}
      <group position={[0.05, 0.12, 0]}>
        {bottomStyle === "shorts" ? (
          <>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.07 * bs.lw, 0.08, 0.08 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0, -0.045, 0]}>
              <boxGeometry args={[0.05 * bs.lw, 0.06, 0.05 * bs.lw]} />
              <meshLambertMaterial color={skin} />
            </mesh>
          </>
        ) : bottomStyle === "skirt" ? (
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.07 * bs.lw, 0.1, 0.08 * bs.lw]} />
            <meshLambertMaterial color={bottomColor} />
          </mesh>
        ) : bottomStyle === "cargo" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * bs.lw, 0.14, 0.08 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0.038 * bs.lw, -0.01, 0]}>
              <boxGeometry args={[0.022, 0.04, 0.035]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
          </>
        ) : bottomStyle === "joggers" ? (
          <>
            <mesh>
              <boxGeometry args={[0.072 * bs.lw, 0.14, 0.082 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0, -0.065, 0]}>
              <boxGeometry args={[0.076 * bs.lw, 0.022, 0.086 * bs.lw]} />
              <meshLambertMaterial color="#d1d5db" />
            </mesh>
          </>
        ) : bottomStyle === "formal" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * bs.lw, 0.14, 0.08 * bs.lw]} />
              <meshLambertMaterial color={bottomColor} />
            </mesh>
            <mesh position={[0, 0, 0.041 * bs.lw]}>
              <boxGeometry args={[0.008, 0.13, 0.004]} />
              <meshLambertMaterial color="#1f2937" />
            </mesh>
          </>
        ) : (
          <mesh>
            <boxGeometry args={[0.07 * bs.lw, 0.14, 0.08 * bs.lw]} />
            <meshLambertMaterial color={bottomColor} />
          </mesh>
        )}
        {bottomStyle === "cuffed" ? (
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.074 * bs.lw, 0.022, 0.084 * bs.lw]} />
            <meshLambertMaterial color="#d1d5db" />
          </mesh>
        ) : null}
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[0.07, 0.05, 0.12]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>

      {/* ── overalls straps ── */}
      {bottomStyle === "overalls" ? (
        <>
          <mesh position={[-0.04, 0.3, 0.048]}>
            <boxGeometry args={[0.025, 0.18, 0.012]} />
            <meshLambertMaterial color={bottomColor} />
          </mesh>
          <mesh position={[0.04, 0.3, 0.048]}>
            <boxGeometry args={[0.025, 0.18, 0.012]} />
            <meshLambertMaterial color={bottomColor} />
          </mesh>
        </>
      ) : null}

      {/* ══════════════════  TORSO  ══════════════════ */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.2 * bs.tw, 0.22 * bs.th, 0.1]} />
        <meshLambertMaterial color={topStyle === "lab_coat" ? "#f0f0f0" : topColor} />
      </mesh>

      {/* top variations */}
      {topStyle === "hoodie" ? (
        <>
          <mesh position={[0, 0.37, -0.045]}>
            <boxGeometry args={[0.18, 0.1, 0.03]} />
            <meshLambertMaterial color={topColor} />
          </mesh>
          <mesh position={[0, 0.23, 0.056]}>
            <boxGeometry args={[0.11, 0.03, 0.012]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        </>
      ) : null}
      {topStyle === "jacket" ? (
        <>
          <mesh position={[0, 0.3, 0.056]}>
            <boxGeometry args={[0.202 * bs.tw, 0.23 * bs.th, 0.012]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 0.3, 0.063]}>
            <boxGeometry args={[0.038, 0.21 * bs.th, 0.01]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
        </>
      ) : null}
      {topStyle === "polo" ? (
        <mesh position={[0, 0.395, 0.04]}>
          <boxGeometry args={[0.1, 0.025, 0.03]} />
          <meshLambertMaterial color={topColor} />
        </mesh>
      ) : null}
      {topStyle === "suit" ? (
        <>
          <mesh position={[-0.04, 0.35, 0.054]} rotation={[0, 0, 0.25]}>
            <boxGeometry args={[0.05, 0.1, 0.01]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0.04, 0.35, 0.054]} rotation={[0, 0, -0.25]}>
            <boxGeometry args={[0.05, 0.1, 0.01]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
        </>
      ) : null}
      {topStyle === "dress_shirt" ? (
        <>
          <mesh position={[0, 0.4, 0.04]}>
            <boxGeometry args={[0.12, 0.028, 0.035]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 0.3, 0.053]}>
            <boxGeometry args={[0.012, 0.2, 0.006]} />
            <meshLambertMaterial color="#e2e8f0" />
          </mesh>
        </>
      ) : null}
      {topStyle === "sweater" ? (
        <mesh position={[0, 0.21, 0]}>
          <boxGeometry args={[0.21 * bs.tw, 0.025, 0.11]} />
          <meshLambertMaterial color={topColor} />
        </mesh>
      ) : null}
      {topStyle === "lab_coat" ? (
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.2 * bs.tw, 0.06, 0.1]} />
          <meshLambertMaterial color="#f0f0f0" />
        </mesh>
      ) : null}

      {/* ══════════════════  ARMS  ══════════════════ */}
      {/* right arm */}
      <group position={[-0.13 * bs.tw, 0.3, 0]}>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.06 * bs.lw, 0.16, 0.06 * bs.lw]} />
          <meshLambertMaterial color={armSleeveColor} />
        </mesh>
        {topStyle === "hoodie" ? (
          <mesh position={[0, -0.145, 0]}>
            <boxGeometry args={[0.064 * bs.lw, 0.03, 0.064 * bs.lw]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        ) : null}
        <mesh position={[0, -0.17, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshLambertMaterial color={skin} />
        </mesh>
        {/* watch on left wrist */}
        {watchStyle === "digital" ? (
          <mesh position={[0, -0.15, 0.035]}>
            <boxGeometry args={[0.035, 0.02, 0.015]} />
            <meshLambertMaterial color="#1a1a2e" />
          </mesh>
        ) : null}
        {watchStyle === "analog" ? (
          <mesh position={[0, -0.15, 0.035]}>
            <cylinderGeometry args={[0.016, 0.016, 0.012, 12]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
        ) : null}
        {watchStyle === "smart" ? (
          <mesh position={[0, -0.15, 0.035]}>
            <boxGeometry args={[0.03, 0.022, 0.014]} />
            <meshLambertMaterial color="#1e40af" />
          </mesh>
        ) : null}
      </group>
      {/* left arm */}
      <group position={[0.13 * bs.tw, 0.3, 0]}>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.06 * bs.lw, 0.16, 0.06 * bs.lw]} />
          <meshLambertMaterial color={armSleeveColor} />
        </mesh>
        {topStyle === "hoodie" ? (
          <mesh position={[0, -0.145, 0]}>
            <boxGeometry args={[0.064 * bs.lw, 0.03, 0.064 * bs.lw]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        ) : null}
        <mesh position={[0, -0.17, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshLambertMaterial color={skin} />
        </mesh>
      </group>

      {/* ══════════════════  NECKWEAR  ══════════════════ */}
      {neckwearStyle === "tie" ? (
        <>
          <mesh position={[0, 0.38, 0.055]}>
            <boxGeometry args={[0.025, 0.04, 0.008]} />
            <meshLambertMaterial color="#b91c1c" />
          </mesh>
          <mesh position={[0, 0.32, 0.055]}>
            <boxGeometry args={[0.03, 0.1, 0.008]} />
            <meshLambertMaterial color="#b91c1c" />
          </mesh>
        </>
      ) : null}
      {neckwearStyle === "bowtie" ? (
        <>
          <mesh position={[-0.02, 0.395, 0.055]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.03, 0.015, 0.01]} />
            <meshLambertMaterial color="#b91c1c" />
          </mesh>
          <mesh position={[0.02, 0.395, 0.055]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[0.03, 0.015, 0.01]} />
            <meshLambertMaterial color="#b91c1c" />
          </mesh>
          <mesh position={[0, 0.395, 0.058]}>
            <boxGeometry args={[0.01, 0.01, 0.008]} />
            <meshLambertMaterial color="#7f1d1d" />
          </mesh>
        </>
      ) : null}
      {neckwearStyle === "scarf" ? (
        <>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.2, 0.04, 0.12]} />
            <meshLambertMaterial color="#e11d48" />
          </mesh>
          <mesh position={[0.04, 0.36, 0.05]}>
            <boxGeometry args={[0.03, 0.08, 0.015]} />
            <meshLambertMaterial color="#e11d48" />
          </mesh>
        </>
      ) : null}
      {neckwearStyle === "necklace" ? (
        <mesh position={[0, 0.4, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.06, 0.005, 8, 24]} />
          <meshLambertMaterial color="#d4af37" />
        </mesh>
      ) : null}
      {neckwearStyle === "lanyard" ? (
        <>
          <mesh position={[0, 0.35, 0.052]}>
            <boxGeometry args={[0.012, 0.12, 0.006]} />
            <meshLambertMaterial color="#2563eb" />
          </mesh>
          <mesh position={[0, 0.28, 0.055]}>
            <boxGeometry args={[0.03, 0.035, 0.008]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
        </>
      ) : null}

      {/* ══════════════════  NECK & HEAD  ══════════════════ */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.07, 0.05, 0.07]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.17, 0.17, 0.15]} />
        <meshLambertMaterial color={skin} />
      </mesh>

      {/* ── eyes ── */}
      <mesh position={[-0.04, 0.505, 0.078]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
      <mesh position={[0.04, 0.505, 0.078]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
      {/* eye highlights */}
      <mesh position={[-0.032, 0.512, 0.08]}>
        <boxGeometry args={[0.008, 0.008, 0.01]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.048, 0.512, 0.08]}>
        <boxGeometry args={[0.008, 0.008, 0.01]} />
        <meshBasicMaterial color="#fff" />
      </mesh>

      {/* ── eyebrows ── */}
      <mesh position={[-0.04, 0.53, 0.078]}>
        <boxGeometry args={[0.04, 0.01, 0.01]} />
        <meshLambertMaterial color={hairColor} />
      </mesh>
      <mesh position={[0.04, 0.53, 0.078]}>
        <boxGeometry args={[0.04, 0.01, 0.01]} />
        <meshLambertMaterial color={hairColor} />
      </mesh>

      {/* ── mouth ── */}
      <mesh position={[0, 0.46, 0.079]}>
        <boxGeometry args={[0.05, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>

      {/* ══════════════════  FACIAL HAIR  ══════════════════ */}
      {facialHair === "stubble" ? (
        <>
          <mesh position={[-0.02, 0.44, 0.076]}>
            <boxGeometry args={[0.008, 0.008, 0.006]} />
            <meshLambertMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[0.02, 0.44, 0.076]}>
            <boxGeometry args={[0.008, 0.008, 0.006]} />
            <meshLambertMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[0, 0.435, 0.076]}>
            <boxGeometry args={[0.008, 0.008, 0.006]} />
            <meshLambertMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[-0.03, 0.45, 0.076]}>
            <boxGeometry args={[0.008, 0.008, 0.006]} />
            <meshLambertMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[0.03, 0.45, 0.076]}>
            <boxGeometry args={[0.008, 0.008, 0.006]} />
            <meshLambertMaterial color={facialHairColor} />
          </mesh>
        </>
      ) : null}
      {facialHair === "full_beard" ? (
        <mesh position={[0, 0.43, 0.072]}>
          <boxGeometry args={[0.12, 0.06, 0.025]} />
          <meshLambertMaterial color={facialHairColor} />
        </mesh>
      ) : null}
      {facialHair === "goatee" ? (
        <mesh position={[0, 0.43, 0.075]}>
          <boxGeometry args={[0.04, 0.04, 0.015]} />
          <meshLambertMaterial color={facialHairColor} />
        </mesh>
      ) : null}
      {facialHair === "mustache" ? (
        <mesh position={[0, 0.465, 0.08]}>
          <boxGeometry args={[0.06, 0.012, 0.008]} />
          <meshLambertMaterial color={facialHairColor} />
        </mesh>
      ) : null}
      {facialHair === "soul_patch" ? (
        <mesh position={[0, 0.44, 0.08]}>
          <boxGeometry args={[0.015, 0.015, 0.008]} />
          <meshLambertMaterial color={facialHairColor} />
        </mesh>
      ) : null}

      {/* ══════════════════  GLASSES  ══════════════════ */}
      {glassesStyle === "square" ? (
        <>
          <mesh position={[-0.04, 0.505, 0.084]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0.04, 0.505, 0.084]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0, 0.505, 0.084]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#111827" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "round" ? (
        <>
          <mesh position={[-0.04, 0.505, 0.084]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.01, 16]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0.04, 0.505, 0.084]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.01, 16]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0, 0.505, 0.084]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#111827" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "aviator" ? (
        <>
          <mesh position={[-0.04, 0.5, 0.084]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.056, 0.042, 0.01]} />
            <meshBasicMaterial color="#4b5563" />
          </mesh>
          <mesh position={[0.04, 0.5, 0.084]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.056, 0.042, 0.01]} />
            <meshBasicMaterial color="#4b5563" />
          </mesh>
          <mesh position={[0, 0.51, 0.084]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#d4af37" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "monocle" ? (
        <>
          <mesh position={[0.04, 0.505, 0.084]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.008, 16]} />
            <meshBasicMaterial color="#d4af37" wireframe />
          </mesh>
          <mesh position={[0.04, 0.48, 0.084]}>
            <boxGeometry args={[0.003, 0.06, 0.003]} />
            <meshBasicMaterial color="#d4af37" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "sunglasses" ? (
        <>
          <mesh position={[-0.04, 0.505, 0.084]}>
            <boxGeometry args={[0.055, 0.04, 0.01]} />
            <meshBasicMaterial color="#1a1a2e" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.04, 0.505, 0.084]}>
            <boxGeometry args={[0.055, 0.04, 0.01]} />
            <meshBasicMaterial color="#1a1a2e" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.512, 0.084]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#1a1a2e" />
          </mesh>
        </>
      ) : null}

      {/* ══════════════════  EARRINGS  ══════════════════ */}
      {earringStyle === "stud" ? (
        <>
          <mesh position={[-0.088, 0.5, 0.01]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[0.088, 0.5, 0.01]}>
            <sphereGeometry args={[0.008, 8, 8]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
        </>
      ) : null}
      {earringStyle === "hoop" ? (
        <>
          <mesh position={[-0.09, 0.49, 0.01]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.018, 0.003, 8, 16]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[0.09, 0.49, 0.01]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.018, 0.003, 8, 16]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
        </>
      ) : null}
      {earringStyle === "drop" ? (
        <>
          <mesh position={[-0.088, 0.48, 0.01]}>
            <boxGeometry args={[0.006, 0.03, 0.006]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[-0.088, 0.462, 0.01]}>
            <sphereGeometry args={[0.007, 8, 8]} />
            <meshLambertMaterial color="#c084fc" />
          </mesh>
          <mesh position={[0.088, 0.48, 0.01]}>
            <boxGeometry args={[0.006, 0.03, 0.006]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[0.088, 0.462, 0.01]}>
            <sphereGeometry args={[0.007, 8, 8]} />
            <meshLambertMaterial color="#c084fc" />
          </mesh>
        </>
      ) : null}

      {/* ══════════════════  HAIR  ══════════════════ */}
      {hairStyle === "short" ? (
        <mesh position={[0, 0.59, 0]}>
          <boxGeometry args={[0.18, 0.05, 0.15]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {hairStyle === "parted" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.18, 0.045, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.03, 0.62, 0.01]} rotation={[0.1, 0, -0.2]}>
            <boxGeometry args={[0.12, 0.03, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "spiky" ? (
        <>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.17, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.05, 0.62, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.04, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.635, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.05, 0.62, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.04, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "bun" ? (
        <>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.63, -0.03]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "mohawk" ? (
        <>
          <mesh position={[0, 0.575, 0]}>
            <boxGeometry args={[0.17, 0.025, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[0.04, 0.07, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.66, 0]}>
            <boxGeometry args={[0.03, 0.04, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "afro" ? (
        <>
          <mesh position={[0, 0.575, 0]}>
            <boxGeometry args={[0.17, 0.025, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "ponytail" ? (
        <>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.53, -0.08]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "braids" ? (
        <>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.07, 0.5, -0.02]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.07, 0.5, -0.02]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "buzz" ? (
        <mesh position={[0, 0.575, 0]}>
          <boxGeometry args={[0.17, 0.018, 0.14]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {hairStyle === "curly" ? (
        <>
          <mesh position={[0, 0.575, 0]}>
            <boxGeometry args={[0.17, 0.03, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          {[[-0.04, 0.61, 0.02], [0.04, 0.615, -0.01], [0, 0.62, 0.03], [-0.02, 0.615, -0.03], [0.03, 0.61, -0.04]].map(
            ([px, py, pz], i) => (
              <mesh key={i} position={[px!, py!, pz!]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshLambertMaterial color={hairColor} />
              </mesh>
            ),
          )}
        </>
      ) : null}
      {hairStyle === "long_straight" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.08, 0.48, 0]}>
            <boxGeometry args={[0.03, 0.18, 0.06]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.08, 0.48, 0]}>
            <boxGeometry args={[0.03, 0.18, 0.06]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "side_shave" ? (
        <>
          <mesh position={[-0.03, 0.585, 0]}>
            <boxGeometry args={[0.11, 0.05, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.06, 0.575, 0]}>
            <boxGeometry args={[0.06, 0.015, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "messy" ? (
        <>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.17, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.04, 0.61, 0.02]} rotation={[0.2, 0.1, -0.3]}>
            <boxGeometry args={[0.04, 0.04, 0.03]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.03, 0.615, -0.02]} rotation={[-0.15, -0.2, 0.25]}>
            <boxGeometry args={[0.035, 0.045, 0.03]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.62, 0.01]} rotation={[0.1, 0, 0.15]}>
            <boxGeometry args={[0.03, 0.05, 0.025]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "slicked_back" ? (
        <>
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.17, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.56, -0.06]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.15, 0.06, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "pigtails" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.15]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.09, 0.56, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.09, 0.56, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {hairStyle === "fade" ? (
        <>
          <mesh position={[0, 0.59, 0]}>
            <boxGeometry args={[0.12, 0.05, 0.1]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.575, 0]}>
            <boxGeometry args={[0.17, 0.015, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}

      {/* ══════════════════  HATS  ══════════════════ */}
      {hatStyle === "cap" ? (
        <>
          <mesh position={[0, 0.63, 0]}>
            <boxGeometry args={[0.18, 0.03, 0.16]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.615, 0.07]}>
            <boxGeometry args={[0.09, 0.012, 0.05]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {hatStyle === "beanie" ? (
        <mesh position={[0, 0.63, 0]}>
          <boxGeometry args={[0.19, 0.06, 0.17]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {hatStyle === "fedora" ? (
        <>
          <mesh position={[0, 0.63, 0]}>
            <boxGeometry args={[0.24, 0.012, 0.2]} />
            <meshLambertMaterial color="#3f3f46" />
          </mesh>
          <mesh position={[0, 0.66, 0]}>
            <boxGeometry args={[0.16, 0.06, 0.14]} />
            <meshLambertMaterial color="#3f3f46" />
          </mesh>
          <mesh position={[0, 0.645, 0.001]}>
            <boxGeometry args={[0.17, 0.012, 0.15]} />
            <meshLambertMaterial color="#78716c" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "top_hat" ? (
        <>
          <mesh position={[0, 0.63, 0]}>
            <boxGeometry args={[0.2, 0.012, 0.18]} />
            <meshLambertMaterial color="#18181b" />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.14, 0.14, 0.12]} />
            <meshLambertMaterial color="#18181b" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "cowboy" ? (
        <>
          <mesh position={[0, 0.63, 0]}>
            <boxGeometry args={[0.28, 0.012, 0.22]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
          <mesh position={[0, 0.66, 0]}>
            <boxGeometry args={[0.15, 0.05, 0.13]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "beret" ? (
        <mesh position={[-0.02, 0.61, 0.01]}>
          <sphereGeometry args={[0.085, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#7f1d1d" />
        </mesh>
      ) : null}
      {hatStyle === "headband" ? (
        <mesh position={[0, 0.575, 0]}>
          <boxGeometry args={[0.18, 0.02, 0.16]} />
          <meshLambertMaterial color="#e11d48" />
        </mesh>
      ) : null}
      {hatStyle === "crown" ? (
        <>
          <mesh position={[0, 0.61, 0]}>
            <boxGeometry args={[0.18, 0.03, 0.16]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[-0.06, 0.64, 0]}>
            <boxGeometry args={[0.02, 0.03, 0.02]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[0, 0.645, 0]}>
            <boxGeometry args={[0.02, 0.04, 0.02]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
          <mesh position={[0.06, 0.64, 0]}>
            <boxGeometry args={[0.02, 0.03, 0.02]} />
            <meshLambertMaterial color="#d4af37" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "santa" ? (
        <>
          <mesh position={[0, 0.63, 0]}>
            <boxGeometry args={[0.19, 0.06, 0.17]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 0.605, 0]}>
            <boxGeometry args={[0.2, 0.02, 0.18]} />
            <meshLambertMaterial color="#f5f5f4" />
          </mesh>
          <mesh position={[0.06, 0.68, -0.02]}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshLambertMaterial color="#f5f5f4" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "wizard" ? (
        <>
          <mesh position={[0, 0.63, 0]}>
            <boxGeometry args={[0.22, 0.012, 0.2]} />
            <meshLambertMaterial color="#4c1d95" />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <coneGeometry args={[0.07, 0.18, 6]} />
            <meshLambertMaterial color="#4c1d95" />
          </mesh>
        </>
      ) : null}
      {hatStyle === "hard_hat" ? (
        <>
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color="#eab308" />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[0.22, 0.012, 0.2]} />
            <meshLambertMaterial color="#eab308" />
          </mesh>
        </>
      ) : null}

      {/* ══════════════════  HEADSET  ══════════════════ */}
      {profile.accessories.headset ? (
        <>
          <mesh position={[0, 0.62, -0.022]}>
            <boxGeometry args={[0.166, 0.014, 0.02]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[-0.088, 0.585, -0.018]}>
            <boxGeometry args={[0.014, 0.056, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.088, 0.585, -0.018]}>
            <boxGeometry args={[0.014, 0.056, 0.018]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[-0.094, 0.525, 0.004]}>
            <boxGeometry args={[0.026, 0.072, 0.042]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <mesh position={[0.094, 0.525, 0.004]}>
            <boxGeometry args={[0.026, 0.072, 0.042]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <mesh position={[0.086, 0.49, 0.052]} rotation={[0.16, 0.18, -0.9]}>
            <boxGeometry args={[0.012, 0.068, 0.012]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.072, 0.46, 0.082]}>
            <boxGeometry args={[0.028, 0.014, 0.018]} />
            <meshLambertMaterial color="#94a3b8" />
          </mesh>
        </>
      ) : null}
    </group>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 *  Exported wrapper
 * ──────────────────────────────────────────────────────────────────────────── */

export const AgentAvatarPreview3D = ({
  profile,
  className = "",
}: {
  profile: AgentAvatarProfile | null | undefined;
  className?: string;
}) => {
  const resolvedProfile = useMemo(
    () => profile ?? createDefaultAgentAvatarProfile("preview"),
    [profile],
  );
  const profileKey = useMemo(
    () => JSON.stringify(resolvedProfile),
    [resolvedProfile],
  );
  const [readyProfileKey, setReadyProfileKey] = useState<string | null>(null);
  const isReady = readyProfileKey === profileKey;

  return (
    <div className={`relative ${className}`}>
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#070b16] text-white/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
          <div className="font-mono text-[11px] tracking-[0.08em] text-white/55">
            Loading avatar...
          </div>
        </div>
      ) : null}
      <Canvas key={profileKey} camera={{ position: [0, 0.7, 2.5], fov: 34 }}>
        <color attach="background" args={["#070b16"]} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 5]} intensity={2.4} />
        <directionalLight position={[-4, 2, 3]} intensity={0.9} color="#89a6ff" />
        <PreviewFigure
          profile={resolvedProfile}
          onFirstFrame={() => {
            setReadyProfileKey(profileKey);
          }}
        />
        <Environment preset="city" />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={1.8}
          minPolarAngle={1.1}
        />
      </Canvas>
    </div>
  );
};
