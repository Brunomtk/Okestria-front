"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import {
  DOOR_LENGTH,
  DOOR_THICKNESS,
  SCALE,
  WALL_THICKNESS,
} from "@/features/retro-office/core/constants";
import {
  getItemBaseSize,
  getItemRotationRadians,
  toWorld,
} from "@/features/retro-office/core/geometry";
import type { FurnitureItem, RenderAgent } from "@/features/retro-office/core/types";
import type {
  BasicFurnitureModelProps,
  InteractiveFurnitureModelProps,
} from "@/features/retro-office/objects/types";

type DoorModelProps = InteractiveFurnitureModelProps & {
  agentsRef?: RefObject<RenderAgent[]>;
};

export function InstancedWallSegmentsModel({
  items,
}: {
  items: FurnitureItem[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(() => {
    const tempQuaternion = new THREE.Quaternion();
    const tempPosition = new THREE.Vector3();
    const tempScale = new THREE.Vector3();
    return items.map((item) => {
      const [wx, , wz] = toWorld(item.x, item.y);
      const width = (item.w ?? 80) * SCALE;
      const depth = (item.h ?? WALL_THICKNESS) * SCALE;
      const rotY = getItemRotationRadians(item);
      tempPosition.set(wx + width / 2, (item.elevation ?? 0) + 0.5, wz + depth / 2);
      tempQuaternion.setFromEuler(new THREE.Euler(0, rotY, 0));
      tempScale.set(width, 1, depth);
      return new THREE.Matrix4().compose(
        tempPosition.clone(),
        tempQuaternion.clone(),
        tempScale.clone(),
      );
    });
  }, [items]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    for (let index = 0; index < matrices.length; index += 1) {
      meshRef.current.setMatrixAt(index, matrices[index]);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
  }, [matrices]);

  if (items.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, items.length]} receiveShadow castShadow>
      <boxGeometry args={[1, 1, 1]} />
      {/* v38: matte black to match the editor view / interior partitions */}
      <meshStandardMaterial color="#0d0d11" roughness={0.9} metalness={0.08} />
    </instancedMesh>
  );
}

function RoundTableModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const radius = (item.r ?? 60) * SCALE;
  const height = 0.5;
  const topThickness = 0.04;
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#4a90d9"
      : "#000000";
  const highlightIntensity = isSelected ? 0.35 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[radius, 0, radius]}>
        <mesh position={[0, height, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[radius, radius, topThickness, 64]} />
          <meshStandardMaterial
            color="#9a6332"
            roughness={0.6}
            metalness={0.1}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, height, 16]} />
          <meshStandardMaterial color="#5c3520" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[radius * 0.4, radius * 0.45, 0.04, 32]} />
          <meshStandardMaterial color="#5c3520" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function ConferenceTableModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#c084fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Floor shadow disc — softens the silhouette */}
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthWorld * 1.08, depthWorld * 1.04]} />
          <meshStandardMaterial color="#0b0b0e" transparent opacity={0.28} roughness={1} />
        </mesh>

        {/* Twin chrome pedestal columns (executive trestle base) */}
        {([-1, 1] as const).map((sx) => (
          <group key={`ped_${sx}`} position={[widthWorld * 0.32 * sx, 0, 0]}>
            {/* Wide chrome floor plate */}
            <mesh position={[0, 0.012, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 0.022, 24]} />
              <meshStandardMaterial color="#cfd4d9" roughness={0.25} metalness={0.95} />
            </mesh>
            {/* Polished cross-bar foot */}
            <mesh position={[0, 0.025, 0]} castShadow>
              <boxGeometry args={[0.05, 0.04, depthWorld * 0.78]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.18} metalness={0.95} />
            </mesh>
            {/* Tapered chrome column */}
            <mesh position={[0, 0.23, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.048, 0.42, 20]} />
              <meshStandardMaterial color="#dfe3e7" roughness={0.2} metalness={0.95} />
            </mesh>
            {/* Upper flared cap under the top */}
            <mesh position={[0, 0.445, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.04, 0.03, 20]} />
              <meshStandardMaterial color="#c7cbd0" roughness={0.25} metalness={0.95} />
            </mesh>
          </group>
        ))}

        {/* Slim inter-pedestal apron (subtle stretcher) */}
        <mesh position={[0, 0.43, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.64, 0.028, 0.022]} />
          <meshStandardMaterial color="#3a2410" roughness={0.6} metalness={0.15} />
        </mesh>

        {/* TABLE TOP — deep walnut slab with chamfered profile */}
        <mesh position={[0, 0.48, 0]} receiveShadow castShadow>
          <boxGeometry args={[widthWorld * 1.0, 0.055, depthWorld * 0.96]} />
          <meshStandardMaterial
            color="#6d3f1f"
            roughness={0.38}
            metalness={0.18}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Glossy wood-grain gloss layer (very thin film) */}
        <mesh position={[0, 0.5085, 0]}>
          <boxGeometry args={[widthWorld * 0.995, 0.001, depthWorld * 0.955]} />
          <meshStandardMaterial
            color="#8a5a34"
            roughness={0.18}
            metalness={0.45}
            transparent
            opacity={0.55}
          />
        </mesh>
        {/* Chamfered darker band at the edge */}
        <mesh position={[0, 0.462, 0]}>
          <boxGeometry args={[widthWorld * 1.012, 0.02, depthWorld * 0.972]} />
          <meshStandardMaterial color="#3e2010" roughness={0.7} metalness={0.12} />
        </mesh>
        {/* Subtle grain stripes */}
        {[-0.25, 0, 0.25].map((dz) => (
          <mesh key={`grain_${dz}`} position={[0, 0.511, depthWorld * dz]}>
            <boxGeometry args={[widthWorld * 0.95, 0.0008, depthWorld * 0.006]} />
            <meshStandardMaterial color="#4a2a14" roughness={0.8} metalness={0.05} transparent opacity={0.55} />
          </mesh>
        ))}

        {/* Marquetry border — ebony inlay running around the perimeter */}
        {([
          { x: 0, z: -0.455, w: 0.92, d: 0.012 },
          { x: 0, z:  0.455, w: 0.92, d: 0.012 },
          { x: -0.47, z: 0, w: 0.012, d: 0.92 },
          { x:  0.47, z: 0, w: 0.012, d: 0.92 },
        ] as const).map((seg, i) => (
          <mesh key={`inlay_${i}`} position={[widthWorld * seg.x, 0.5112, depthWorld * seg.z]}>
            <boxGeometry args={[widthWorld * seg.w, 0.0006, depthWorld * seg.d]} />
            <meshStandardMaterial color="#120804" roughness={0.55} metalness={0.2} />
          </mesh>
        ))}
        {/* Inner gold pinstripe inside the marquetry border */}
        {([
          { x: 0, z: -0.43, w: 0.88, d: 0.004 },
          { x: 0, z:  0.43, w: 0.88, d: 0.004 },
        ] as const).map((seg, i) => (
          <mesh key={`pinstripe_${i}`} position={[widthWorld * seg.x, 0.5116, depthWorld * seg.z]}>
            <boxGeometry args={[widthWorld * seg.w, 0.0004, depthWorld * seg.d]} />
            <meshStandardMaterial color="#c69c4e" roughness={0.35} metalness={0.8} emissive="#c69c4e" emissiveIntensity={0.1} />
          </mesh>
        ))}

        {/* ====== CLEAN POLISHED TOP — NOTHING PLACED ON SURFACE ====== */}
        {/* Subtle radial shine spot in the center of the wood */}
        <mesh position={[0, 0.5122, 0]}>
          <circleGeometry args={[widthWorld * 0.14, 28]} />
          <meshStandardMaterial
            color="#b08454"
            transparent
            opacity={0.35}
            roughness={0.15}
            metalness={0.55}
          />
        </mesh>

        {/* ====== ENGRAVED PTX MONOGRAM (center of table) ====== */}
        {/* Dark ebony backing circle — gives the brass letters contrast */}
        <mesh position={[0, 0.5124, 0]}>
          <circleGeometry args={[widthWorld * 0.085, 32]} />
          <meshStandardMaterial color="#1a0d06" roughness={0.45} metalness={0.25} />
        </mesh>
        {/* Outer ring of polished brass inlay */}
        <mesh position={[0, 0.5127, 0]}>
          <ringGeometry args={[widthWorld * 0.08, widthWorld * 0.085, 48]} />
          <meshStandardMaterial
            color="#d4a857"
            roughness={0.25}
            metalness={0.95}
            emissive="#d4a857"
            emissiveIntensity={0.22}
          />
        </mesh>
        {/* Inner thin gold pinstripe */}
        <mesh position={[0, 0.5128, 0]}>
          <ringGeometry args={[widthWorld * 0.068, widthWorld * 0.07, 48]} />
          <meshStandardMaterial
            color="#f3d985"
            roughness={0.2}
            metalness={0.95}
            emissive="#f3d985"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* === Letter P (left) — three brass bars forming a stylised P === */}
        <group position={[-widthWorld * 0.042, 0.5131, 0]}>
          {/* vertical stem */}
          <mesh>
            <boxGeometry args={[0.006, 0.0015, 0.052]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
          {/* top horizontal of the bowl */}
          <mesh position={[0.013, 0, -0.019]}>
            <boxGeometry args={[0.026, 0.0015, 0.006]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
          {/* mid horizontal closing the bowl */}
          <mesh position={[0.013, 0, 0.002]}>
            <boxGeometry args={[0.026, 0.0015, 0.006]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
          {/* right vertical of the bowl */}
          <mesh position={[0.023, 0, -0.009]}>
            <boxGeometry args={[0.006, 0.0015, 0.02]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
        </group>
        {/* === Letter T (center) === */}
        <group position={[0, 0.5131, 0]}>
          {/* horizontal top bar */}
          <mesh position={[0, 0, -0.024]}>
            <boxGeometry args={[0.03, 0.0015, 0.006]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
          {/* vertical stem */}
          <mesh>
            <boxGeometry args={[0.006, 0.0015, 0.054]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
        </group>
        {/* === Letter X (right) === */}
        <group position={[widthWorld * 0.042, 0.5131, 0]} rotation={[0, 0, 0]}>
          {/* left diagonal */}
          <mesh rotation={[0, Math.PI / 5.2, 0]}>
            <boxGeometry args={[0.006, 0.0015, 0.055]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
          {/* right diagonal */}
          <mesh rotation={[0, -Math.PI / 5.2, 0]}>
            <boxGeometry args={[0.006, 0.0015, 0.055]} />
            <meshStandardMaterial color="#f3d985" roughness={0.2} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.35} />
          </mesh>
        </group>

        {/* Tiny brass dots under the monogram — "Okestria" subtitle marker */}
        {[-0.022, 0, 0.022].map((dx, i) => (
          <mesh key={`subdot_${i}`} position={[dx, 0.513, 0.035]}>
            <cylinderGeometry args={[0.0016, 0.0016, 0.0008, 10]} />
            <meshStandardMaterial color="#d4a857" roughness={0.25} metalness={0.95} emissive="#d4a857" emissiveIntensity={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function DeskCubicleModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#c084fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.32 : isHovered && editMode ? 0.2 : 0;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Floor shadow plate */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthWorld * 1.05, depthWorld * 1.08]} />
          <meshStandardMaterial color="#0a0a0c" transparent opacity={0.24} roughness={1} />
        </mesh>

        {/* === PEDESTAL (left side, 3 drawer unit) === */}
        <group position={[-widthWorld * 0.36, 0.235, 0]}>
          {/* Body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[widthWorld * 0.22, 0.47, depthWorld * 0.88]} />
            <meshStandardMaterial color="#5a3820" roughness={0.55} metalness={0.15} />
          </mesh>
          {/* Shadow line at base */}
          <mesh position={[0, -0.232, 0]}>
            <boxGeometry args={[widthWorld * 0.22, 0.004, depthWorld * 0.88]} />
            <meshStandardMaterial color="#2a1808" roughness={0.9} />
          </mesh>
          {/* Drawer fronts (3 stacked) */}
          {([-0.14, 0, 0.14] as const).map((dy, i) => (
            <group key={`drw_${i}`} position={[0, dy, depthWorld * 0.445]}>
              <mesh>
                <boxGeometry args={[widthWorld * 0.2, 0.124, 0.014]} />
                <meshStandardMaterial color="#6b4428" roughness={0.42} metalness={0.18} />
              </mesh>
              {/* Drawer edge groove */}
              <mesh position={[0, 0.063, 0.002]}>
                <boxGeometry args={[widthWorld * 0.2, 0.002, 0.002]} />
                <meshStandardMaterial color="#2a1808" roughness={0.8} />
              </mesh>
              {/* Chrome bar pull */}
              <mesh position={[0, 0, 0.008]}>
                <boxGeometry args={[widthWorld * 0.12, 0.014, 0.012]} />
                <meshStandardMaterial color="#c7cbd0" roughness={0.22} metalness={0.95} />
              </mesh>
              {/* Pull ends */}
              <mesh position={[-widthWorld * 0.06, 0, 0.005]}>
                <boxGeometry args={[0.008, 0.018, 0.008]} />
                <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.9} />
              </mesh>
              <mesh position={[widthWorld * 0.06, 0, 0.005]}>
                <boxGeometry args={[0.008, 0.018, 0.008]} />
                <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        {/* === RIGHT LEG (chrome T-trestle) === */}
        <group position={[widthWorld * 0.4, 0.23, 0]}>
          {/* Vertical post */}
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.46, depthWorld * 0.75]} />
            <meshStandardMaterial color="#dfe3e7" roughness={0.22} metalness={0.92} />
          </mesh>
          {/* Base cross-bar */}
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.09, 0.03, depthWorld * 0.9]} />
            <meshStandardMaterial color="#c7cbd0" roughness={0.25} metalness={0.9} />
          </mesh>
          {/* Foot caps */}
          {([-1, 1] as const).map((sz) => (
            <mesh key={`rfoot_${sz}`} position={[0, -0.235, depthWorld * 0.42 * sz]}>
              <boxGeometry args={[0.09, 0.012, 0.05]} />
              <meshStandardMaterial color="#9aa0a6" roughness={0.35} metalness={0.85} />
            </mesh>
          ))}
          {/* Under-top fix bracket */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.07, 0.01, depthWorld * 0.7]} />
            <meshStandardMaterial color="#dfe3e7" roughness={0.22} metalness={0.92} />
          </mesh>
        </group>

        {/* === MODESTY PANEL (back side for privacy + structure) === */}
        <mesh position={[widthWorld * 0.02, 0.18, -depthWorld * 0.46]} castShadow>
          <boxGeometry args={[widthWorld * 0.76, 0.28, 0.02]} />
          <meshStandardMaterial color="#3a2410" roughness={0.72} metalness={0.1} />
        </mesh>

        {/* === WALNUT TOP === */}
        <mesh position={[0, 0.465, 0]} receiveShadow castShadow>
          <boxGeometry args={[widthWorld * 0.99, 0.045, depthWorld * 0.98]} />
          <meshStandardMaterial
            color="#6d4022"
            roughness={0.38}
            metalness={0.2}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Dark bevel profile under top */}
        <mesh position={[0, 0.444, 0]}>
          <boxGeometry args={[widthWorld * 1.0, 0.02, depthWorld * 1.0]} />
          <meshStandardMaterial color="#3e2010" roughness={0.7} metalness={0.12} />
        </mesh>
        {/* Glossy top film */}
        <mesh position={[0, 0.488, 0]}>
          <boxGeometry args={[widthWorld * 0.98, 0.0008, depthWorld * 0.96]} />
          <meshStandardMaterial color="#8a5a34" roughness={0.18} metalness={0.45} transparent opacity={0.48} />
        </mesh>
        {/* Subtle grain stripe */}
        <mesh position={[0, 0.489, 0]}>
          <boxGeometry args={[widthWorld * 0.9, 0.0006, depthWorld * 0.012]} />
          <meshStandardMaterial color="#4a2a14" roughness={0.8} metalness={0.05} transparent opacity={0.5} />
        </mesh>

        {/* === CABLE GROMMET (back-right corner of top) === */}
        <group position={[widthWorld * 0.26, 0.491, -depthWorld * 0.28]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.033, 0.005, 18]} />
            <meshStandardMaterial color="#2b2f36" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.002, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.003, 14]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>

        {/* === MONITOR RISER (thin black shelf at the back) === */}
        <group position={[widthWorld * 0.08, 0.52, -depthWorld * 0.35]}>
          <mesh castShadow>
            <boxGeometry args={[widthWorld * 0.45, 0.028, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.55} />
          </mesh>
          {/* Risers */}
          <mesh position={[-widthWorld * 0.18, -0.02, 0]}>
            <boxGeometry args={[0.02, 0.028, 0.06]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.28} metalness={0.85} />
          </mesh>
          <mesh position={[widthWorld * 0.18, -0.02, 0]}>
            <boxGeometry args={[0.02, 0.028, 0.06]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.28} metalness={0.85} />
          </mesh>
        </group>

        {/* === DESK LAMP (low-profile banker's lamp) === */}
        <group position={[widthWorld * 0.34, 0.493, -depthWorld * 0.35]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.04, 0.008, 16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.08, 12]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.022, 0.035, 18]} />
            <meshStandardMaterial color="#15803d" roughness={0.4} metalness={0.3} emissive="#15803d" emissiveIntensity={0.25} />
          </mesh>
        </group>

        {/* === NAMEPLATE (front edge) === */}
        <mesh position={[widthWorld * 0.1, 0.49, depthWorld * 0.43]}>
          <boxGeometry args={[widthWorld * 0.3, 0.006, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.32} metalness={0.65} />
        </mesh>
        <mesh position={[widthWorld * 0.1, 0.494, depthWorld * 0.43]}>
          <boxGeometry args={[widthWorld * 0.24, 0.002, 0.025]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.85} emissive="#cbd5e1" emissiveIntensity={0.08} />
        </mesh>
      </group>
    </group>
  );
}

function ChairModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#c084fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;
  // Shorter silhouette — chairs were previously towering over agents/desks.
  // Keep footprint proportional but squash vertically so seat height reads
  // like a real office chair relative to desks and seated agents.
  const scaleXZ = 1.15;
  const scaleY = 0.82;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]} scale={[scaleXZ, scaleY, scaleXZ]}>
        {/* Floor shadow */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[widthWorld * 0.6, 24]} />
          <meshStandardMaterial color="#0a0a0c" transparent opacity={0.3} roughness={1} />
        </mesh>

        {/* === 5-STAR BASE WITH CASTERS === */}
        {[0, 72, 144, 216, 288].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const armLen = widthWorld * 0.55;
          return (
            <group key={`leg_${i}`} rotation={[0, rad, 0]}>
              {/* Arm */}
              <mesh position={[armLen / 2, 0.04, 0]} castShadow>
                <boxGeometry args={[armLen, 0.022, 0.032]} />
                <meshStandardMaterial color="#2b2f36" roughness={0.38} metalness={0.65} />
              </mesh>
              {/* Chrome tip cap */}
              <mesh position={[armLen, 0.04, 0]}>
                <cylinderGeometry args={[0.02, 0.018, 0.024, 14]} />
                <meshStandardMaterial color="#dfe3e7" roughness={0.22} metalness={0.92} />
              </mesh>
              {/* Caster wheel */}
              <mesh position={[armLen, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.018, 14]} />
                <meshStandardMaterial color="#0f172a" roughness={0.45} metalness={0.3} />
              </mesh>
            </group>
          );
        })}
        {/* Central hub */}
        <mesh position={[0, 0.055, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.052, 0.045, 20]} />
          <meshStandardMaterial color="#1f2937" roughness={0.35} metalness={0.7} />
        </mesh>

        {/* === PNEUMATIC CHROME CYLINDER === */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.028, 0.22, 18]} />
          <meshStandardMaterial color="#dfe3e7" roughness={0.2} metalness={0.95} />
        </mesh>
        {/* Inner pneumatic stage */}
        <mesh position={[0, 0.31, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.055, 18]} />
          <meshStandardMaterial color="#cfd4d9" roughness={0.22} metalness={0.95} />
        </mesh>

        {/* === SEAT TILT MECHANISM === */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.32, 0.03, depthWorld * 0.28]} />
          <meshStandardMaterial color="#1f2937" roughness={0.35} metalness={0.55} />
        </mesh>

        {/* === SEAT CUSHION === */}
        <mesh position={[0, 0.385, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.82, 0.055, depthWorld * 0.82]} />
          <meshStandardMaterial color="#0f172a" roughness={0.75} metalness={0.06} />
        </mesh>
        {/* Seat piping ring */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[widthWorld * 0.84, 0.008, depthWorld * 0.84]} />
          <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.2} />
        </mesh>
        {/* Selection glow layer */}
        {highlightIntensity > 0 ? (
          <mesh position={[0, 0.417, 0]}>
            <boxGeometry args={[widthWorld * 0.86, 0.004, depthWorld * 0.86]} />
            <meshStandardMaterial
              color={highlightColor}
              emissive={highlightColor}
              emissiveIntensity={highlightIntensity * 2}
              transparent
              opacity={0.8}
            />
          </mesh>
        ) : null}

        {/* === BACKREST SUPPORT POST (curved cantilever) === */}
        <mesh position={[0, 0.5, -depthWorld * 0.38]} castShadow>
          <boxGeometry args={[0.04, 0.28, 0.04]} />
          <meshStandardMaterial color="#1f2937" roughness={0.35} metalness={0.55} />
        </mesh>

        {/* === BACKREST (mesh style w/ lumbar support) === */}
        <mesh position={[0, 0.6, -depthWorld * 0.36]} castShadow>
          <boxGeometry args={[widthWorld * 0.8, 0.38, 0.045]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.05} />
        </mesh>
        {/* Mesh grill detail */}
        {[-0.12, -0.04, 0.04, 0.12].map((dy, i) => (
          <mesh key={`lumbar_${i}`} position={[0, 0.6 + dy, -depthWorld * 0.337]}>
            <boxGeometry args={[widthWorld * 0.74, 0.005, 0.003]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.12} />
          </mesh>
        ))}
        {/* Lumbar support curve */}
        <mesh position={[0, 0.56, -depthWorld * 0.328]}>
          <boxGeometry args={[widthWorld * 0.68, 0.04, 0.008]} />
          <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.2} />
        </mesh>
        {/* Back piping edge */}
        <mesh position={[0, 0.6, -depthWorld * 0.384]}>
          <boxGeometry args={[widthWorld * 0.82, 0.39, 0.008]} />
          <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.2} />
        </mesh>

        {/* === HEADREST === */}
        <mesh position={[0, 0.84, -depthWorld * 0.36]} castShadow>
          <boxGeometry args={[widthWorld * 0.52, 0.1, 0.05]} />
          <meshStandardMaterial color="#0f172a" roughness={0.75} metalness={0.08} />
        </mesh>
        {/* Headrest mount stick */}
        <mesh position={[0, 0.79, -depthWorld * 0.36]}>
          <cylinderGeometry args={[0.01, 0.01, 0.05, 10]} />
          <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.85} />
        </mesh>

        {/* === LEFT ARMREST === */}
        <group position={[-widthWorld * 0.44, 0.43, -depthWorld * 0.02]}>
          {/* Vertical post */}
          <mesh castShadow>
            <boxGeometry args={[0.028, 0.14, 0.035]} />
            <meshStandardMaterial color="#1f2937" roughness={0.38} metalness={0.55} />
          </mesh>
          {/* Horizontal arm pad */}
          <mesh position={[0, 0.09, 0]} castShadow>
            <boxGeometry args={[0.055, 0.028, depthWorld * 0.5]} />
            <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.1} />
          </mesh>
          {/* Pad top soft */}
          <mesh position={[0, 0.108, 0]}>
            <boxGeometry args={[0.058, 0.008, depthWorld * 0.52]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.08} />
          </mesh>
        </group>

        {/* === RIGHT ARMREST === */}
        <group position={[widthWorld * 0.44, 0.43, -depthWorld * 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.028, 0.14, 0.035]} />
            <meshStandardMaterial color="#1f2937" roughness={0.38} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.09, 0]} castShadow>
            <boxGeometry args={[0.055, 0.028, depthWorld * 0.5]} />
            <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.108, 0]}>
            <boxGeometry args={[0.058, 0.008, depthWorld * 0.52]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.08} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function WallSegmentModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const width = (item.w ?? 80) * SCALE;
  const depth = (item.h ?? WALL_THICKNESS) * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#4a90d9"
      : "#000000";
  const highlightIntensity = isSelected ? 0.35 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[width / 2, 0, depth / 2]} rotation={[0, rotY, 0]}>
        {/* v36: interior partitions are matte black for sharp contrast with the cream perimeter + graphite floor */}
        <mesh position={[0, 0.5, 0]} receiveShadow>
          <boxGeometry args={[width, 1, depth]} />
          <meshStandardMaterial
            color="#0d0d11"
            emissive={highlightColor}
            emissiveIntensity={0.25 + highlightIntensity}
            roughness={0.9}
            metalness={0.08}
          />
        </mesh>
        {/* Floor trim — slightly lighter charcoal so it reads as a baseboard detail against pure black */}
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[width + 0.02, 0.06, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color="#1a1a20" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

export function DoorModel({
  item,
  isSelected,
  isHovered,
  editMode,
  agentsRef,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: DoorModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const width = (item.w ?? DOOR_LENGTH) * SCALE;
  const depth = Math.max((item.h ?? DOOR_THICKNESS) * SCALE, 0.04);
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#4a90d9"
      : "#000000";
  const highlightIntensity = isSelected ? 0.35 : isHovered && editMode ? 0.22 : 0;
  const leafPivotRef = useRef<THREE.Group>(null);
  const openAmountRef = useRef(0);

  // v37 door proportions — nothing extends above wall top (y=1) and all frame
  // surfaces slightly overlap the wall depth so the opening reads as solid.
  const jambWidth = 0.05; // each side jamb width
  const headerHeight = 0.16; // header (top beam) height
  const leafMaxHeight = 1 - headerHeight - 0.02; // clear height under header
  const leafWidth = Math.max(width - 2 * jambWidth + 0.002, 0.08);
  const leafDepth = Math.max(depth * 0.62, 0.05);
  const frameDepth = depth + 0.03; // +0.03 so frame edges sit flush against wall faces
  const handleX = leafWidth - 0.08;
  const handleZ = Math.max(leafDepth * 0.5 + 0.012, 0.03);

  useFrame(() => {
    if (!leafPivotRef.current) return;
    const centerX = wx + width / 2;
    const centerZ = wz + depth / 2;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const touchPadX = width * 0.5 + 0.2;
    const touchPadZ = depth * 0.5 + 0.2;
    const shouldOpen = (agentsRef?.current ?? []).some((agent) => {
      const [ax, , az] = toWorld(agent.x, agent.y);
      const dx = ax - centerX;
      const dz = az - centerZ;
      const localX = dx * cos + dz * sin;
      const localZ = -dx * sin + dz * cos;
      return Math.abs(localX) <= touchPadX && Math.abs(localZ) <= touchPadZ;
    });
    const targetOpen = shouldOpen ? 1 : 0;
    openAmountRef.current = THREE.MathUtils.lerp(openAmountRef.current, targetOpen, 0.14);
    leafPivotRef.current.rotation.y = -openAmountRef.current * Math.PI * 0.55;
  });

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[width / 2, 0, depth / 2]} rotation={[0, rotY, 0]}>
        {/* Header (top beam) — stays within wall height (y≤1) so it doesn't stick above */}
        <mesh position={[0, 1 - headerHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width + 0.02, headerHeight, frameDepth]} />
          <meshStandardMaterial color="#2a1d12" roughness={0.82} metalness={0.06} />
        </mesh>
        {/* Header face molding — thin highlight strip along the bottom of the header */}
        <mesh position={[0, 1 - headerHeight - 0.01, 0]}>
          <boxGeometry args={[width + 0.01, 0.02, frameDepth + 0.002]} />
          <meshStandardMaterial color="#5a3f28" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Left jamb — full height, slightly wider than wall depth for flush fit */}
        <mesh
          position={[-width / 2 + jambWidth / 2, (1 - headerHeight) / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[jambWidth, 1 - headerHeight, frameDepth]} />
          <meshStandardMaterial color="#2a1d12" roughness={0.82} metalness={0.06} />
        </mesh>
        {/* Right jamb */}
        <mesh
          position={[width / 2 - jambWidth / 2, (1 - headerHeight) / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[jambWidth, 1 - headerHeight, frameDepth]} />
          <meshStandardMaterial color="#2a1d12" roughness={0.82} metalness={0.06} />
        </mesh>
        {/* Threshold — metallic sill along the floor across the door width */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[width - 2 * jambWidth + 0.004, 0.024, frameDepth + 0.004]} />
          <meshStandardMaterial color="#3a3a42" roughness={0.5} metalness={0.55} />
        </mesh>
        {/* Selection / hover tint — painted over both jambs as a faint emissive frame */}
        <mesh position={[0, (1 - headerHeight) / 2, 0]} visible={highlightIntensity > 0}>
          <boxGeometry args={[width + 0.015, 1 - headerHeight, frameDepth + 0.004]} />
          <meshStandardMaterial
            color="#000000"
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
            transparent
            opacity={0.001}
          />
        </mesh>
        {/* Door LEAF — pivots around the left jamb when an agent approaches */}
        <group ref={leafPivotRef} position={[-width / 2 + jambWidth, 0, 0]}>
          {/* Main leaf panel */}
          <mesh
            position={[leafWidth / 2, (1 - headerHeight) / 2 + 0.01, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[leafWidth, leafMaxHeight, leafDepth]} />
            <meshStandardMaterial
              color="#6b4426"
              emissive={highlightColor}
              emissiveIntensity={0.18 + highlightIntensity}
              roughness={0.68}
              metalness={0.05}
            />
          </mesh>
          {/* Upper panel inlay (front face) */}
          <mesh
            position={[leafWidth / 2, leafMaxHeight * 0.62 + 0.01, leafDepth / 2 + 0.001]}
          >
            <boxGeometry args={[leafWidth * 0.78, leafMaxHeight * 0.28, 0.008]} />
            <meshStandardMaterial color="#4f3020" roughness={0.78} metalness={0.04} />
          </mesh>
          {/* Lower panel inlay (front face) */}
          <mesh
            position={[leafWidth / 2, leafMaxHeight * 0.22 + 0.01, leafDepth / 2 + 0.001]}
          >
            <boxGeometry args={[leafWidth * 0.78, leafMaxHeight * 0.32, 0.008]} />
            <meshStandardMaterial color="#4f3020" roughness={0.78} metalness={0.04} />
          </mesh>
          {/* Upper panel inlay (back face — mirror) */}
          <mesh
            position={[leafWidth / 2, leafMaxHeight * 0.62 + 0.01, -leafDepth / 2 - 0.001]}
          >
            <boxGeometry args={[leafWidth * 0.78, leafMaxHeight * 0.28, 0.008]} />
            <meshStandardMaterial color="#4f3020" roughness={0.78} metalness={0.04} />
          </mesh>
          <mesh
            position={[leafWidth / 2, leafMaxHeight * 0.22 + 0.01, -leafDepth / 2 - 0.001]}
          >
            <boxGeometry args={[leafWidth * 0.78, leafMaxHeight * 0.32, 0.008]} />
            <meshStandardMaterial color="#4f3020" roughness={0.78} metalness={0.04} />
          </mesh>
          {/* Mid-rail horizontal divider */}
          <mesh
            position={[leafWidth / 2, leafMaxHeight * 0.42 + 0.01, leafDepth / 2 + 0.001]}
          >
            <boxGeometry args={[leafWidth * 0.82, 0.03, 0.006]} />
            <meshStandardMaterial color="#8a6140" roughness={0.6} metalness={0.1} />
          </mesh>
          {/* Handle backplate (both faces) */}
          <mesh position={[handleX, 0.5, handleZ + 0.006]}>
            <boxGeometry args={[0.07, 0.11, 0.012]} />
            <meshStandardMaterial color="#8a6a28" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[handleX, 0.5, -handleZ - 0.006]}>
            <boxGeometry args={[0.07, 0.11, 0.012]} />
            <meshStandardMaterial color="#8a6a28" roughness={0.4} metalness={0.55} />
          </mesh>
          {/* Handle lever front */}
          <mesh position={[handleX - 0.018, 0.5, handleZ + 0.018]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
            <meshStandardMaterial color="#d9bf72" roughness={0.32} metalness={0.68} />
          </mesh>
          {/* Handle lever back */}
          <mesh position={[handleX - 0.018, 0.5, -handleZ - 0.018]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
            <meshStandardMaterial color="#d9bf72" roughness={0.32} metalness={0.68} />
          </mesh>
          {/* Door hinge pins — visible on the jamb-side edge */}
          <mesh position={[0.012, 0.18, 0]}>
            <cylinderGeometry args={[0.008, 0.008, leafDepth * 0.92, 10]} />
            <meshStandardMaterial color="#8a6a28" roughness={0.36} metalness={0.6} />
          </mesh>
          <mesh position={[0.012, 0.82, 0]}>
            <cylinderGeometry args={[0.008, 0.008, leafDepth * 0.92, 10]} />
            <meshStandardMaterial color="#8a6a28" roughness={0.36} metalness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function KeyboardModelInner({
  item,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  editMode,
}: BasicFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const yBase = 0.621;

  return (
    <group
      position={[wx, yBase, wz]}
      onPointerDown={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerDown?.(item._uid);
      }}
      onPointerOver={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOver?.(item._uid);
      }}
      onPointerOut={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <mesh>
        <boxGeometry args={[0.27, 0.022, 0.105]} />
        <meshStandardMaterial color="#b2bac4" roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.018, 0]}>
        <boxGeometry args={[0.23, 0.008, 0.08]} />
        <meshStandardMaterial color="#2e333d" roughness={0.85} metalness={0.02} />
      </mesh>
    </group>
  );
}

function MouseModelInner({
  item,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  editMode,
}: BasicFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const yBase = 0.621;

  return (
    <group
      position={[wx, yBase, wz]}
      onPointerDown={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerDown?.(item._uid);
      }}
      onPointerOver={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOver?.(item._uid);
      }}
      onPointerOut={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <mesh scale={[1, 0.38, 0.72]}>
        <sphereGeometry args={[0.042, 8, 6]} />
        <meshStandardMaterial color="#d0cecc" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.016, -0.008]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.022, 8]} />
        <meshStandardMaterial color="#444" roughness={0.8} />
      </mesh>
    </group>
  );
}

function ClockModelInner({
  item,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  editMode,
}: BasicFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const yBase = 0.72;

  return (
    <group
      position={[wx, yBase, wz]}
      onPointerDown={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerDown?.(item._uid);
      }}
      onPointerOver={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOver?.(item._uid);
      }}
      onPointerOut={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.016, 20]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.09, 0.011, 8, 24]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>
      <mesh position={[-0.028, 0.014, -0.012]} rotation={[0, Math.PI / 6, 0]}>
        <boxGeometry args={[0.008, 0.006, 0.052]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0.018, 0.016, -0.018]} rotation={[0, -Math.PI / 5, 0]}>
        <boxGeometry args={[0.006, 0.006, 0.068]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.018, 0]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#c0392b" roughness={0.5} />
      </mesh>
    </group>
  );
}

function TrashCanModelInner({
  item,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  editMode,
}: BasicFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);

  return (
    <group
      position={[wx, 0, wz]}
      onPointerDown={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerDown?.(item._uid);
      }}
      onPointerOver={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOver?.(item._uid);
      }}
      onPointerOut={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <mesh position={[0, 0.115, 0]}>
        <cylinderGeometry args={[0.055, 0.042, 0.23, 10]} />
        <meshStandardMaterial color="#4a4e58" roughness={0.8} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.234, 0]}>
        <cylinderGeometry args={[0.057, 0.057, 0.01, 10]} />
        <meshStandardMaterial color="#363940" roughness={0.7} metalness={0.18} />
      </mesh>
    </group>
  );
}

function MugModelInner({
  item,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  editMode,
}: BasicFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const yBase = 0.45;

  return (
    <group
      position={[wx, yBase, wz]}
      onPointerDown={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerDown?.(item._uid);
      }}
      onPointerOver={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOver?.(item._uid);
      }}
      onPointerOut={(event) => {
        if (!editMode) return;
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <mesh>
        <cylinderGeometry args={[0.025, 0.022, 0.052, 10]} />
        <meshStandardMaterial color="#e8ded0" roughness={0.6} metalness={0.02} />
      </mesh>
      <mesh position={[0.033, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.016, 0.006, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#e8ded0" roughness={0.6} metalness={0.02} />
      </mesh>
    </group>
  );
}

/**
 * ============================================================================
 * LOUNGE AREA MODELS v39
 * ============================================================================
 * All four lounge primitives are designed around the same facing convention
 * used by ChairModel: at facing=180 the "front" of the object points SOUTH
 * (+z in world space, away from the north wall). This keeps the rest area
 * feeling cohesive — the TV and arcade screens face into the room, while the
 * couch and beanbags seat occupants so they look NORTH toward the screen.
 *
 * Everything is built with stable memoized geometries/materials to keep the
 * hot render path cheap. No per-frame work, no GLB loads, no cloning.
 * ----------------------------------------------------------------------------
 */

// Shared highlight helpers for selection/hover affordances.
const LOUNGE_HIGHLIGHT_COLOR = (isSelected: boolean, isHovered: boolean, editMode: boolean) =>
  isSelected ? "#fbbf24" : isHovered && editMode ? "#c084fc" : "#000000";
const LOUNGE_HIGHLIGHT_INTENSITY = (isSelected: boolean, isHovered: boolean, editMode: boolean) =>
  isSelected ? 0.32 : isHovered && editMode ? 0.2 : 0;

// ----------------------------------------------------------------------------
// Shared lounge geometries/materials — cached at module scope so we don't
// allocate dozens of BufferGeometry objects for every couch/beanbag/tv/arcade.
// Many of these are re-used across multiple lounge components to keep the
// GPU vertex/material budget low for a smooth 60fps.
// ----------------------------------------------------------------------------
const ARCADE_BUTTON_BASE_GEOM = new THREE.CylinderGeometry(0.018, 0.02, 0.018, 12);
const ARCADE_BUTTON_CAP_GEOM = new THREE.CylinderGeometry(0.015, 0.017, 0.012, 12);
const ARCADE_BUTTON_BASE_MAT = new THREE.MeshStandardMaterial({
  color: "#0b0f17",
  roughness: 0.6,
  metalness: 0.35,
});
const ARCADE_BUTTON_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
] as const;
const ARCADE_BUTTON_CAP_MATS = ARCADE_BUTTON_COLORS.map(
  (color) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.1,
    }),
);

// ----------------------------------------------------------------------------
// CouchModel — 3-seat low-profile sofa with wood legs, boucle cushions, and
// contrast throw pillows. Footprint 100×40 canvas units (1.8×0.72 world).
//
// NOTE on orientation: the couch type has a baked-in `FURNITURE_ROTATION.couch
// = Math.PI`, so at `facing=180` the total rotation is 0. The canonical
// design expects the backrest to sit on +z (south) at facing=180 (with the
// occupants looking toward -z / north, which is where the TV lives). To keep
// the math readable, we author the model with backrest at local -z and
// then apply an extra +π rotation on the inner group so the final on-screen
// orientation matches the design intent.
// ----------------------------------------------------------------------------
function CouchModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  // Add an extra +π flip to offset the FURNITURE_ROTATION.couch = π already
  // baked in by getItemRotationRadians, so the model's "natural" orientation
  // (backrest at -z local) lands at +z world at facing=180.
  const rotY = getItemRotationRadians(item) + Math.PI;
  const highlight = LOUNGE_HIGHLIGHT_COLOR(isSelected, isHovered, Boolean(editMode));
  const intensity = LOUNGE_HIGHLIGHT_INTENSITY(isSelected, isHovered, Boolean(editMode));

  // Body dimensions (relative to footprint).
  const bodyW = widthWorld * 0.96;
  const bodyD = depthWorld * 0.78;
  const seatH = 0.22;
  const backH = 0.42;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Floor shadow */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthWorld * 1.05, depthWorld * 1.2]} />
          <meshStandardMaterial color="#0a0a0c" transparent opacity={0.24} roughness={1} />
        </mesh>

        {/* Wood legs (4) — no castShadow (floor shadow plane covers the silhouette). */}
        {[
          [-bodyW * 0.44, bodyD * 0.36],
          [bodyW * 0.44, bodyD * 0.36],
          [-bodyW * 0.44, -bodyD * 0.36],
          [bodyW * 0.44, -bodyD * 0.36],
        ].map(([lx, lz], i) => (
          <mesh key={`leg_${i}`} position={[lx, 0.055, lz]}>
            <cylinderGeometry args={[0.028, 0.022, 0.11, 10]} />
            <meshStandardMaterial color="#3a2412" roughness={0.65} metalness={0.08} />
          </mesh>
        ))}

        {/* Frame / skirt */}
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[bodyW, 0.08, bodyD]} />
          <meshStandardMaterial color="#1f2b33" roughness={0.75} metalness={0.05} />
        </mesh>

        {/* Seat platform */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[bodyW * 0.98, 0.06, bodyD * 0.94]} />
          <meshStandardMaterial color="#243540" roughness={0.8} metalness={0.04} />
        </mesh>

        {/* Three seat cushions (slightly separated) */}
        {[-bodyW * 0.32, 0, bodyW * 0.32].map((cx, i) => (
          <group key={`seat_${i}`} position={[cx, 0.27, bodyD * 0.05]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[bodyW * 0.3, 0.14, bodyD * 0.78]} />
              <meshStandardMaterial color="#2f566a" roughness={0.92} metalness={0.02} />
            </mesh>
            {/* Cushion top piping */}
            <mesh position={[0, 0.076, 0]}>
              <boxGeometry args={[bodyW * 0.305, 0.006, bodyD * 0.79]} />
              <meshStandardMaterial color="#1f3f52" roughness={0.85} metalness={0.04} />
            </mesh>
          </group>
        ))}

        {/* Backrest slab — at -z at facing=0 → at +z at facing=180 (behind occupants). */}
        <mesh position={[0, seatH + backH * 0.45, -bodyD * 0.42]} castShadow receiveShadow>
          <boxGeometry args={[bodyW, backH, bodyD * 0.18]} />
          <meshStandardMaterial color="#2a4a5a" roughness={0.9} metalness={0.03} />
        </mesh>
        {/* Back cushion row */}
        {[-bodyW * 0.32, 0, bodyW * 0.32].map((cx, i) => (
          <mesh
            key={`back_${i}`}
            position={[cx, seatH + backH * 0.35, -bodyD * 0.34]}
            castShadow
          >
            <boxGeometry args={[bodyW * 0.3, backH * 0.7, bodyD * 0.14]} />
            <meshStandardMaterial color="#345e72" roughness={0.95} metalness={0.02} />
          </mesh>
        ))}
        {/* Backrest top roll */}
        <mesh position={[0, seatH + backH * 0.82, -bodyD * 0.39]} castShadow>
          <boxGeometry args={[bodyW, 0.08, bodyD * 0.2]} />
          <meshStandardMaterial color="#1f3f52" roughness={0.85} metalness={0.03} />
        </mesh>

        {/* Left armrest */}
        <group position={[-bodyW * 0.48, seatH + 0.08, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[bodyW * 0.08, 0.34, bodyD * 0.92]} />
            <meshStandardMaterial color="#2a4a5a" roughness={0.9} metalness={0.03} />
          </mesh>
          {/* Arm roll top */}
          <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, bodyD * 0.92, 14]} />
            <meshStandardMaterial color="#345e72" roughness={0.92} metalness={0.03} />
          </mesh>
        </group>
        {/* Right armrest */}
        <group position={[bodyW * 0.48, seatH + 0.08, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[bodyW * 0.08, 0.34, bodyD * 0.92]} />
            <meshStandardMaterial color="#2a4a5a" roughness={0.9} metalness={0.03} />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, bodyD * 0.92, 14]} />
            <meshStandardMaterial color="#345e72" roughness={0.92} metalness={0.03} />
          </mesh>
        </group>

        {/* Throw pillows — brighten the composition */}
        <mesh position={[-bodyW * 0.28, seatH + 0.18, -bodyD * 0.08]} rotation={[0, 0.2, 0.1]} castShadow>
          <boxGeometry args={[0.12, 0.11, 0.12]} />
          <meshStandardMaterial color="#d88a5a" roughness={0.85} metalness={0.03} />
        </mesh>
        <mesh position={[bodyW * 0.3, seatH + 0.19, -bodyD * 0.06]} rotation={[0, -0.15, -0.08]} castShadow>
          <boxGeometry args={[0.12, 0.11, 0.12]} />
          <meshStandardMaterial color="#e7c27a" roughness={0.85} metalness={0.03} />
        </mesh>

        {/* Selection/hover glow ring */}
        {intensity > 0 ? (
          <mesh position={[0, seatH + 0.005, 0]}>
            <boxGeometry args={[bodyW * 1.02, 0.004, bodyD * 1.02]} />
            <meshStandardMaterial
              color={highlight}
              emissive={highlight}
              emissiveIntensity={intensity * 2}
              transparent
              opacity={0.75}
            />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// BeanbagModel — round puff with a stitched center seam and a sat-in top
// indent. Footprint 40×40 (0.72 world). Symmetric — rotation mostly decorative.
// ----------------------------------------------------------------------------
function BeanbagModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlight = LOUNGE_HIGHLIGHT_COLOR(isSelected, isHovered, Boolean(editMode));
  const intensity = LOUNGE_HIGHLIGHT_INTENSITY(isSelected, isHovered, Boolean(editMode));
  // Accept a custom tint via item.color, fallback to a warm mustard.
  const tint = item.color ?? "#c06448";

  const bodyR = Math.min(widthWorld, depthWorld) * 0.52;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Floor shadow */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[bodyR * 1.15, 24]} />
          <meshStandardMaterial color="#0a0a0c" transparent opacity={0.26} roughness={1} />
        </mesh>

        {/* Lower hemisphere (squashed) — main body, sits on floor */}
        <mesh position={[0, bodyR * 0.48, 0]} scale={[1, 0.65, 1]} castShadow receiveShadow>
          <sphereGeometry args={[bodyR, 22, 18]} />
          <meshStandardMaterial color={tint} roughness={0.95} metalness={0.02} />
        </mesh>
        {/* Upper crown — slightly smaller, gives a rounded top */}
        <mesh position={[0, bodyR * 0.82, 0]} scale={[0.9, 0.55, 0.9]} castShadow>
          <sphereGeometry args={[bodyR * 0.9, 20, 16]} />
          <meshStandardMaterial color={tint} roughness={0.98} metalness={0.02} />
        </mesh>
        {/* Sat-in indent at the top */}
        <mesh position={[0, bodyR * 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[bodyR * 0.42, 20]} />
          <meshStandardMaterial color="#6b3019" roughness={1} metalness={0} />
        </mesh>
        {/* Seam ring around the equator */}
        <mesh position={[0, bodyR * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[bodyR * 0.99, 0.012, 6, 26]} />
          <meshStandardMaterial color="#3e1a0c" roughness={0.85} metalness={0.05} />
        </mesh>
        {/* Stitched seam — vertical accent along the front (south side at facing=180) */}
        <mesh position={[0, bodyR * 0.48, bodyR * 0.9]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.008, bodyR * 0.9, 0.012]} />
          <meshStandardMaterial color="#2f1409" roughness={0.8} metalness={0.04} />
        </mesh>

        {/* Selection/hover glow ring */}
        {intensity > 0 ? (
          <mesh position={[0, bodyR * 1.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[bodyR * 0.9, bodyR * 1.05, 24]} />
            <meshStandardMaterial
              color={highlight}
              emissive={highlight}
              emissiveIntensity={intensity * 2}
              transparent
              opacity={0.7}
            />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// TvStandModel — console base with two drawers + a wall-backed flat-panel TV
// with an emissive screen. Footprint 80×24 (1.44 × 0.432 world).
// At facing=180 the screen points south (into the room).
// ----------------------------------------------------------------------------
function TvStandModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlight = LOUNGE_HIGHLIGHT_COLOR(isSelected, isHovered, Boolean(editMode));
  const intensity = LOUNGE_HIGHLIGHT_INTENSITY(isSelected, isHovered, Boolean(editMode));

  // Console dimensions
  const consoleW = widthWorld * 0.98;
  const consoleD = depthWorld * 0.88;
  const consoleH = 0.32;
  // TV panel (wider than the console, taller up)
  const panelW = widthWorld * 0.86;
  const panelH = 0.52;
  // At facing=0 the screen should be at -z, so that facing=180 rotates it to +z.
  const screenZ = -depthWorld * 0.22;

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Floor shadow */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthWorld * 1.08, depthWorld * 1.2]} />
          <meshStandardMaterial color="#0a0a0c" transparent opacity={0.22} roughness={1} />
        </mesh>

        {/* Console base */}
        <mesh position={[0, consoleH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[consoleW, consoleH, consoleD]} />
          <meshStandardMaterial color="#28323a" roughness={0.7} metalness={0.14} />
        </mesh>
        {/* Top surface accent */}
        <mesh position={[0, consoleH + 0.006, 0]}>
          <boxGeometry args={[consoleW * 1.02, 0.012, consoleD * 1.05]} />
          <meshStandardMaterial color="#111a22" roughness={0.55} metalness={0.2} />
        </mesh>
        {/* Two drawers (fronts at +z at rest → back-side at facing=180, walker-visible at -z) */}
        {[-consoleW * 0.24, consoleW * 0.24].map((dx, i) => (
          <group key={`drw_${i}`} position={[dx, consoleH * 0.5, consoleD * 0.5 + 0.005]}>
            <mesh>
              <boxGeometry args={[consoleW * 0.44, consoleH * 0.7, 0.012]} />
              <meshStandardMaterial color="#1b242c" roughness={0.55} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.007]}>
              <boxGeometry args={[consoleW * 0.3, 0.018, 0.004]} />
              <meshStandardMaterial color="#8a98a6" roughness={0.3} metalness={0.85} />
            </mesh>
          </group>
        ))}
        {/* Stand feet */}
        {[-consoleW * 0.42, consoleW * 0.42].map((fx, i) => (
          <mesh key={`foot_${i}`} position={[fx, 0.015, 0]} castShadow>
            <boxGeometry args={[consoleW * 0.14, 0.028, consoleD * 0.95]} />
            <meshStandardMaterial color="#0c141b" roughness={0.6} metalness={0.2} />
          </mesh>
        ))}

        {/* TV BACK — mounts to north wall side. */}
        <mesh
          position={[0, consoleH + 0.04 + panelH / 2, screenZ + 0.02]}
          castShadow
        >
          <boxGeometry args={[panelW, panelH, 0.035]} />
          <meshStandardMaterial color="#0b0b0e" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* TV BEZEL — slightly larger than screen */}
        <mesh position={[0, consoleH + 0.04 + panelH / 2, screenZ]}>
          <boxGeometry args={[panelW * 0.99, panelH * 0.98, 0.018]} />
          <meshStandardMaterial color="#050507" roughness={0.4} metalness={0.35} />
        </mesh>
        {/* TV SCREEN — emissive, sits forward of the bezel (at -z at rest → +z at facing=180). */}
        <mesh position={[0, consoleH + 0.04 + panelH / 2, screenZ - 0.013]}>
          <planeGeometry args={[panelW * 0.93, panelH * 0.9]} />
          <meshStandardMaterial
            color="#133a5a"
            emissive="#3a7bb8"
            emissiveIntensity={0.85}
            roughness={0.3}
            metalness={0.0}
          />
        </mesh>
        {/* Bright highlight strip inside the screen (mock UI) */}
        <mesh position={[-panelW * 0.24, consoleH + 0.04 + panelH / 2 + 0.06, screenZ - 0.014]}>
          <planeGeometry args={[panelW * 0.2, 0.04]} />
          <meshStandardMaterial
            color="#f4e4a0"
            emissive="#f4e4a0"
            emissiveIntensity={1.1}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[panelW * 0.14, consoleH + 0.04 + panelH / 2 - 0.02, screenZ - 0.014]}>
          <planeGeometry args={[panelW * 0.42, 0.16]} />
          <meshStandardMaterial
            color="#bde3ff"
            emissive="#bde3ff"
            emissiveIntensity={0.6}
            transparent
            opacity={0.45}
          />
        </mesh>
        {/* Brand dot below screen */}
        <mesh position={[0, consoleH + 0.04 + 0.022, screenZ - 0.013]}>
          <circleGeometry args={[0.006, 12]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>

        {/* Soundbar on top of console */}
        <mesh position={[0, consoleH + 0.025, -consoleD * 0.1]} castShadow>
          <boxGeometry args={[panelW * 0.76, 0.04, consoleD * 0.22]} />
          <meshStandardMaterial color="#111a22" roughness={0.6} metalness={0.25} />
        </mesh>
        {/* Soundbar mesh grille stripes */}
        {[-0.4, -0.2, 0, 0.2, 0.4].map((sx, i) => (
          <mesh
            key={`sb_${i}`}
            position={[panelW * sx * 0.76, consoleH + 0.035, -consoleD * 0.22]}
          >
            <boxGeometry args={[panelW * 0.12, 0.015, 0.003]} />
            <meshStandardMaterial color="#0a0d10" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}

        {/* Selection/hover glow ring */}
        {intensity > 0 ? (
          <mesh position={[0, consoleH + 0.04, 0]}>
            <boxGeometry args={[consoleW * 1.02, 0.004, consoleD * 1.02]} />
            <meshStandardMaterial
              color={highlight}
              emissive={highlight}
              emissiveIntensity={intensity * 2}
              transparent
              opacity={0.7}
            />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// ArcadeModel — rebuilt from scratch (v45). Clean, iconic upright arcade
// cabinet silhouette: tapered side panels, glowing marquee, deep CRT screen,
// angled control panel with red joystick + six buttons, and kick plate.
// Footprint 30×30 canvas units (0.54 world). At facing=180 the screen and
// control panel point south into the room so agents can walk up and play.
//
// Geometry is intentionally low-poly and material count is minimized by
// reusing shared button geometries/materials at module scope. The cabinet
// is built as stacked primitive boxes/cylinders — no custom meshes — so it
// renders cheaply even when replicated.
// ----------------------------------------------------------------------------
function ArcadeModelInner({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const [wx, , wz] = toWorld(item.x, item.y);
  const { width, height } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const depthWorld = height * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlight = LOUNGE_HIGHLIGHT_COLOR(isSelected, isHovered, Boolean(editMode));
  const intensity = LOUNGE_HIGHLIGHT_INTENSITY(isSelected, isHovered, Boolean(editMode));

  // Cabinet proportions — classic upright silhouette (taller than wide).
  const bodyW = widthWorld * 0.78;
  const bodyD = depthWorld * 0.82;
  const cabHeight = 1.5; // overall cabinet height (before marquee)

  // Key heights along the cabinet (from floor).
  const kickH = 0.22;      // kick plate / coin door
  const panelY = 0.82;     // control-panel top surface
  const screenY = 1.15;    // CRT centerline
  const marqueeY = cabHeight + 0.11; // top marquee centerline

  return (
    <group
      position={[wx, item.elevation ?? 0, wz]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(item._uid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver(item._uid);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(item._uid);
      }}
    >
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Ground contact shadow */}
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthWorld * 1.1, depthWorld * 1.15]} />
          <meshStandardMaterial color="#050507" transparent opacity={0.38} roughness={1} />
        </mesh>

        {/* KICK PLATE — dark base with coin door */}
        <mesh position={[0, kickH * 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[bodyW * 1.02, kickH, bodyD * 1.02]} />
          <meshStandardMaterial color="#0b0b10" roughness={0.85} metalness={0.15} />
        </mesh>
        {/* Coin door (front) */}
        <mesh position={[0, kickH * 0.55, -bodyD * 0.5 - 0.002]}>
          <boxGeometry args={[bodyW * 0.42, kickH * 0.7, 0.006]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.55} />
        </mesh>
        {/* Two coin slots */}
        <mesh position={[-bodyW * 0.08, kickH * 0.6, -bodyD * 0.5 - 0.006]}>
          <boxGeometry args={[0.04, 0.008, 0.004]} />
          <meshStandardMaterial color="#000000" roughness={0.9} />
        </mesh>
        <mesh position={[bodyW * 0.08, kickH * 0.6, -bodyD * 0.5 - 0.006]}>
          <boxGeometry args={[0.04, 0.008, 0.004]} />
          <meshStandardMaterial color="#000000" roughness={0.9} />
        </mesh>

        {/* MAIN CABINET BODY — black core */}
        <mesh position={[0, kickH + (cabHeight - kickH) * 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[bodyW * 0.94, cabHeight - kickH, bodyD * 0.96]} />
          <meshStandardMaterial color="#111114" roughness={0.65} metalness={0.18} />
        </mesh>

        {/* SIDE PANELS — classic tapered purple cabinet "wings" (left + right).
            Plane quads cheaper than full boxes; tinted emissive for neon vibe. */}
        <mesh position={[-bodyW * 0.47, kickH + (cabHeight - kickH) * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[bodyD * 0.98, cabHeight - kickH]} />
          <meshStandardMaterial
            color="#4c1d95"
            emissive="#7c3aed"
            emissiveIntensity={0.12}
            roughness={0.5}
            metalness={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[bodyW * 0.47, kickH + (cabHeight - kickH) * 0.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[bodyD * 0.98, cabHeight - kickH]} />
          <meshStandardMaterial
            color="#4c1d95"
            emissive="#7c3aed"
            emissiveIntensity={0.12}
            roughness={0.5}
            metalness={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Neon pinstripe running top-to-bottom on each side panel */}
        <mesh position={[-bodyW * 0.472, kickH + (cabHeight - kickH) * 0.5, 0]}>
          <boxGeometry args={[0.004, cabHeight - kickH - 0.05, 0.006]} />
          <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.1} />
        </mesh>
        <mesh position={[bodyW * 0.472, kickH + (cabHeight - kickH) * 0.5, 0]}>
          <boxGeometry args={[0.004, cabHeight - kickH - 0.05, 0.006]} />
          <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.1} />
        </mesh>

        {/* BEZEL — black recessed frame around the CRT */}
        <mesh position={[0, screenY, -bodyD * 0.46]} castShadow>
          <boxGeometry args={[bodyW * 0.86, 0.52, 0.04]} />
          <meshStandardMaterial color="#050506" roughness={0.8} metalness={0.15} />
        </mesh>
        {/* CRT SCREEN — emissive plane with faint scanline sprite overlay */}
        <mesh position={[0, screenY, -bodyD * 0.46 - 0.022]}>
          <planeGeometry args={[bodyW * 0.74, 0.42]} />
          <meshStandardMaterial
            color="#0b1026"
            emissive="#3b82f6"
            emissiveIntensity={1.15}
            roughness={0.25}
          />
        </mesh>
        {/* Faux sprite — orange game character streak across the middle */}
        <mesh position={[0, screenY + 0.02, -bodyD * 0.46 - 0.028]}>
          <planeGeometry args={[bodyW * 0.5, 0.07]} />
          <meshStandardMaterial
            color="#fb923c"
            emissive="#fb923c"
            emissiveIntensity={1.4}
            transparent
            opacity={0.82}
          />
        </mesh>
        {/* Health bar sprite */}
        <mesh position={[-bodyW * 0.2, screenY + 0.14, -bodyD * 0.46 - 0.028]}>
          <planeGeometry args={[bodyW * 0.28, 0.02]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={1.2}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* CONTROL PANEL — angled up toward the player */}
        <group position={[0, panelY, -bodyD * 0.4]} rotation={[0.32, 0, 0]}>
          {/* Panel surface */}
          <mesh castShadow>
            <boxGeometry args={[bodyW * 0.92, 0.05, bodyD * 0.36]} />
            <meshStandardMaterial color="#18181b" roughness={0.55} metalness={0.3} />
          </mesh>
          {/* Red trim around the panel edge */}
          <mesh position={[0, 0.027, -bodyD * 0.175]}>
            <boxGeometry args={[bodyW * 0.92, 0.006, 0.01]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 0.027, bodyD * 0.175]}>
            <boxGeometry args={[bodyW * 0.92, 0.006, 0.01]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} />
          </mesh>
          {/* Joystick — bolted to the left side of the panel */}
          <mesh position={[-bodyW * 0.28, 0.03, 0]}>
            <cylinderGeometry args={[0.04, 0.046, 0.012, 16]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[-bodyW * 0.28, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.08, 10]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.25} metalness={0.9} />
          </mesh>
          <mesh position={[-bodyW * 0.28, 0.135, 0]} castShadow>
            <sphereGeometry args={[0.026, 18, 14]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.15} emissive="#7f1d1d" emissiveIntensity={0.25} />
          </mesh>
          {/* 6 arcade buttons — 2 rows × 3 cols, right side of panel */}
          {[0, 1, 2].map((col) =>
            [0, 1].map((row) => {
              const key = `btn_${col}_${row}`;
              const bx = bodyW * (0.02 + col * 0.12);
              const bz = (row - 0.5) * bodyD * 0.16;
              const colorIndex = col * 2 + row;
              return (
                <group key={key} position={[bx, 0.03, bz]}>
                  <mesh
                    geometry={ARCADE_BUTTON_BASE_GEOM}
                    material={ARCADE_BUTTON_BASE_MAT}
                  />
                  <mesh
                    position={[0, 0.012, 0]}
                    geometry={ARCADE_BUTTON_CAP_GEOM}
                    material={ARCADE_BUTTON_CAP_MATS[colorIndex]}
                  />
                </group>
              );
            })
          )}
          {/* START / SELECT pill buttons near player edge */}
          <mesh position={[-bodyW * 0.05, 0.03, -bodyD * 0.12]}>
            <cylinderGeometry args={[0.013, 0.014, 0.01, 12]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[bodyW * 0.05, 0.03, -bodyD * 0.12]}>
            <cylinderGeometry args={[0.013, 0.014, 0.01, 12]} />
            <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.4} />
          </mesh>
        </group>

        {/* MARQUEE — glowing top sign with cabinet title */}
        {/* Marquee housing */}
        <mesh position={[0, marqueeY, -bodyD * 0.15]} castShadow>
          <boxGeometry args={[bodyW * 0.96, 0.24, bodyD * 0.7]} />
          <meshStandardMaterial color="#1a0933" roughness={0.55} metalness={0.2} />
        </mesh>
        {/* Glowing marquee face (front) */}
        <mesh position={[0, marqueeY, -bodyD * 0.5 - 0.001]}>
          <planeGeometry args={[bodyW * 0.92, 0.2]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={1.25}
          />
        </mesh>
        {/* Marquee top edge neon (cyan highlight) */}
        <mesh position={[0, marqueeY + 0.115, -bodyD * 0.5 - 0.003]}>
          <boxGeometry args={[bodyW * 0.92, 0.008, 0.004]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.3} />
        </mesh>
        {/* Marquee bottom edge neon (pink highlight) */}
        <mesh position={[0, marqueeY - 0.115, -bodyD * 0.5 - 0.003]}>
          <boxGeometry args={[bodyW * 0.92, 0.008, 0.004]} />
          <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={1.3} />
        </mesh>
        {/* "ARCADE" letter dots — 6 small squares on the marquee face */}
        {[-0.24, -0.144, -0.048, 0.048, 0.144, 0.24].map((dx, i) => (
          <mesh key={`mq_${i}`} position={[bodyW * dx, marqueeY, -bodyD * 0.5 - 0.005]}>
            <boxGeometry args={[0.03, 0.06, 0.003]} />
            <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.3} />
          </mesh>
        ))}

        {/* TOP CAP — thin dark crown over marquee */}
        <mesh position={[0, marqueeY + 0.14, -bodyD * 0.15]}>
          <boxGeometry args={[bodyW * 0.98, 0.04, bodyD * 0.72]} />
          <meshStandardMaterial color="#050507" roughness={0.8} metalness={0.1} />
        </mesh>

        {/* Selection/hover glow ring */}
        {intensity > 0 ? (
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[bodyW * 1.1, 0.004, bodyD * 1.1]} />
            <meshStandardMaterial
              color={highlight}
              emissive={highlight}
              emissiveIntensity={intensity * 2}
              transparent
              opacity={0.7}
            />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// Memoized exports — these models are replicated heavily (20+ chairs, 12+
// desks, 10+ cabinets) or live in the hot interactive render path. Since
// their item props only change when the user moves/selects/hovers a piece,
// React.memo skips the vast majority of re-renders for free.
// ----------------------------------------------------------------------------
export const CouchModel = memo(CouchModelInner);
export const BeanbagModel = memo(BeanbagModelInner);
export const TvStandModel = memo(TvStandModelInner);
export const ArcadeModel = memo(ArcadeModelInner);
export const ChairModel = memo(ChairModelInner);
export const DeskCubicleModel = memo(DeskCubicleModelInner);
export const ConferenceTableModel = memo(ConferenceTableModelInner);
export const RoundTableModel = memo(RoundTableModelInner);
export const KeyboardModel = memo(KeyboardModelInner);
export const MouseModel = memo(MouseModelInner);
export const MugModel = memo(MugModelInner);
export const ClockModel = memo(ClockModelInner);
export const TrashCanModel = memo(TrashCanModelInner);
export const WallSegmentModel = memo(WallSegmentModelInner);
