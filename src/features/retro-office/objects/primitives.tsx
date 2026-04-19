"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, items.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#787878" roughness={0.92} />
    </instancedMesh>
  );
}

export function RoundTableModel({
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

export function ConferenceTableModel({
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
        {/* 4 chunky wooden legs at corners (dark oak) */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`leg_${sx}_${sz}`}
              position={[widthWorld * 0.42 * sx, 0.22, depthWorld * 0.38 * sz]}
              castShadow
            >
              <boxGeometry args={[0.06, 0.44, 0.06]} />
              <meshStandardMaterial color="#3a2410" roughness={0.65} metalness={0.08} />
            </mesh>
          )),
        )}
        {/* Chrome foot caps */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`foot_${sx}_${sz}`}
              position={[widthWorld * 0.42 * sx, 0.012, depthWorld * 0.38 * sz]}
            >
              <boxGeometry args={[0.07, 0.024, 0.07]} />
              <meshStandardMaterial color="#d1d5db" roughness={0.3} metalness={0.88} />
            </mesh>
          )),
        )}
        {/* Long cross-beam under table (side supports) */}
        <mesh position={[0, 0.34, -depthWorld * 0.36]} castShadow>
          <boxGeometry args={[widthWorld * 0.84, 0.05, 0.04]} />
          <meshStandardMaterial color="#2b180a" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.34, depthWorld * 0.36]} castShadow>
          <boxGeometry args={[widthWorld * 0.84, 0.05, 0.04]} />
          <meshStandardMaterial color="#2b180a" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* TABLE TOP — walnut slab, thick and solid */}
        <mesh position={[0, 0.46, 0]} receiveShadow castShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.055, depthWorld * 0.94]} />
          <meshStandardMaterial
            color="#7a4a28"
            roughness={0.55}
            metalness={0.12}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Darker beveled edge (runs around the slab) */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[widthWorld * 1.0, 0.022, depthWorld * 0.96]} />
          <meshStandardMaterial color="#4a2b16" roughness={0.75} metalness={0.08} />
        </mesh>
        {/* Subtle glossy wood-grain highlight stripe along length */}
        <mesh position={[0, 0.489, 0]}>
          <boxGeometry args={[widthWorld * 0.86, 0.002, depthWorld * 0.02]} />
          <meshStandardMaterial color="#b78a5c" roughness={0.3} metalness={0.3} />
        </mesh>

        {/* Center runner — felt strip */}
        <mesh position={[0, 0.49, 0]}>
          <boxGeometry args={[widthWorld * 0.9, 0.002, depthWorld * 0.16]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.9} metalness={0.02} />
        </mesh>

        {/* Speaker-phone puck in the middle */}
        <group position={[0, 0.495, 0]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.07, 0.018, 28]} />
            <meshStandardMaterial color="#111827" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.011, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.006, 22]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={0.9}
            />
          </mesh>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <mesh
                key={`sp-btn-${i}`}
                position={[Math.cos(rad) * 0.045, 0.011, Math.sin(rad) * 0.045]}
              >
                <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.3} metalness={0.55} />
              </mesh>
            );
          })}
        </group>

        {/* Laptop pairs along the long sides — decorative placeholders */}
        {[-0.32, 0.32].map((dz, iz) =>
          [-0.3, -0.1, 0.1, 0.3].map((dx, ix) => (
            <group
              key={`laptop-${iz}-${ix}`}
              position={[widthWorld * dx, 0.491, depthWorld * dz]}
              rotation={[0, dz < 0 ? 0 : Math.PI, 0]}
            >
              {/* Base */}
              <mesh>
                <boxGeometry args={[0.1, 0.008, 0.068]} />
                <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.5} />
              </mesh>
              {/* Lid */}
              <mesh position={[0, 0.028, -0.032]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.1, 0.058, 0.006]} />
                <meshStandardMaterial color="#111827" roughness={0.45} metalness={0.5} />
              </mesh>
              {/* Screen glow */}
              <mesh position={[0, 0.028, -0.028]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.088, 0.05, 0.0015]} />
                <meshStandardMaterial
                  color="#7c3aed"
                  emissive="#7c3aed"
                  emissiveIntensity={0.65}
                />
              </mesh>
            </group>
          )),
        )}

        {/* Coasters + mugs at every other seat */}
        {[-0.3, 0.1].map((dx, ix) =>
          [-0.4, 0.4].map((dz, iz) => (
            <group
              key={`mug-${ix}-${iz}`}
              position={[widthWorld * dx, 0.495, depthWorld * dz]}
            >
              <mesh>
                <cylinderGeometry args={[0.014, 0.014, 0.003, 16]} />
                <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.017, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.028, 16]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
              </mesh>
            </group>
          )),
        )}

        {/* Front brand plate */}
        <mesh position={[0, 0.48, depthWorld * 0.458]}>
          <boxGeometry args={[widthWorld * 0.26, 0.02, 0.004]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

export function WallSegmentModel({
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
        <mesh position={[0, 0.5, 0]} receiveShadow>
          <boxGeometry args={[width, 1, depth]} />
          <meshStandardMaterial
            color="#787878"
            emissive={highlightColor}
            emissiveIntensity={0.4 + highlightIntensity}
            roughness={0.92}
          />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[width + 0.02, 0.06, Math.max(depth, 0.06)]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.8} />
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
  const handleX = width - 0.09;
  const handleZ = Math.max(depth * 0.28, 0.035);
  const leafPivotRef = useRef<THREE.Group>(null);
  const openAmountRef = useRef(0);

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
        <mesh position={[0, 1.01, 0]}>
          <boxGeometry args={[width + 0.05, 0.08, depth + 0.04]} />
          <meshStandardMaterial color="#4a3421" roughness={0.88} />
        </mesh>
        <mesh position={[-width / 2 + 0.02, 0.5, 0]}>
          <boxGeometry args={[0.04, 1, depth + 0.03]} />
          <meshStandardMaterial color="#4a3421" roughness={0.88} />
        </mesh>
        <mesh position={[width / 2 - 0.02, 0.5, 0]}>
          <boxGeometry args={[0.04, 1, depth + 0.03]} />
          <meshStandardMaterial color="#4a3421" roughness={0.88} />
        </mesh>
        <group ref={leafPivotRef} position={[-width / 2 + 0.025, 0, 0]}>
          <mesh position={[width / 2 - 0.035, 0.5, 0]} receiveShadow>
            <boxGeometry args={[Math.max(width - 0.09, 0.08), 0.94, depth * 0.68]} />
            <meshStandardMaterial
              color="#7c5330"
              emissive={highlightColor}
              emissiveIntensity={0.28 + highlightIntensity}
              roughness={0.74}
            />
          </mesh>
          <mesh position={[handleX, 0.52, 0]}>
            <cylinderGeometry args={[0.008, 0.008, handleZ * 2.1, 10]} />
            <meshStandardMaterial color="#9f8141" roughness={0.4} metalness={0.45} />
          </mesh>
          <mesh position={[handleX, 0.52, handleZ]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color="#d9bf72" roughness={0.36} metalness={0.35} />
          </mesh>
          <mesh position={[handleX, 0.52, -handleZ]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshStandardMaterial color="#d9bf72" roughness={0.36} metalness={0.35} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function KeyboardModel({
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

export function MouseModel({
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

export function ClockModel({
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

export function TrashCanModel({
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

export function MugModel({
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
