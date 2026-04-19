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

        {/* Center cable raceway — brushed aluminum recess with power grommets */}
        <mesh position={[0, 0.512, 0]}>
          <boxGeometry args={[widthWorld * 0.58, 0.004, depthWorld * 0.12]} />
          <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.515, 0]}>
          <boxGeometry args={[widthWorld * 0.55, 0.002, depthWorld * 0.08]} />
          <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.85} />
        </mesh>
        {[-0.22, 0, 0.22].map((dx, i) => (
          <group key={`grommet_${i}`} position={[widthWorld * dx, 0.517, 0]}>
            <mesh>
              <cylinderGeometry args={[0.018, 0.02, 0.003, 18]} />
              <meshStandardMaterial color="#2b2f36" roughness={0.35} metalness={0.75} />
            </mesh>
            <mesh position={[0, 0.002, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.002, 14]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
            </mesh>
          </group>
        ))}

        {/* Speaker-phone puck — polished obsidian with ring LED */}
        <group position={[0, 0.52, 0]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.082, 0.02, 32]} />
            <meshStandardMaterial color="#0b0f1a" roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <torusGeometry args={[0.05, 0.006, 14, 32]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1.1}
              roughness={0.2}
              metalness={0.4}
            />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.006, 22]} />
            <meshStandardMaterial color="#18222e" roughness={0.3} metalness={0.55} />
          </mesh>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <mesh
                key={`sp-btn-${i}`}
                position={[Math.cos(rad) * 0.042, 0.013, Math.sin(rad) * 0.042]}
              >
                <cylinderGeometry args={[0.0055, 0.0055, 0.003, 10]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.25} metalness={0.85} />
              </mesh>
            );
          })}
        </group>

        {/* Laptop pairs along the long sides — premium silver + warm display */}
        {[-0.34, 0.34].map((dz, iz) =>
          [-0.32, -0.1, 0.12, 0.32].map((dx, ix) => (
            <group
              key={`laptop-${iz}-${ix}`}
              position={[widthWorld * dx, 0.512, depthWorld * dz]}
              rotation={[0, dz < 0 ? 0 : Math.PI, 0]}
            >
              {/* Base */}
              <mesh castShadow>
                <boxGeometry args={[0.11, 0.008, 0.075]} />
                <meshStandardMaterial color="#c7ccd1" roughness={0.28} metalness={0.85} />
              </mesh>
              {/* Keyboard inlay */}
              <mesh position={[0, 0.005, 0.01]}>
                <boxGeometry args={[0.092, 0.001, 0.04]} />
                <meshStandardMaterial color="#1f2937" roughness={0.7} metalness={0.1} />
              </mesh>
              {/* Trackpad */}
              <mesh position={[0, 0.005, 0.032]}>
                <boxGeometry args={[0.04, 0.001, 0.016]} />
                <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.4} />
              </mesh>
              {/* Lid (silver shell) */}
              <mesh position={[0, 0.032, -0.036]} rotation={[-0.25, 0, 0]} castShadow>
                <boxGeometry args={[0.11, 0.062, 0.006]} />
                <meshStandardMaterial color="#b9bdc2" roughness={0.25} metalness={0.9} />
              </mesh>
              {/* Screen glow */}
              <mesh position={[0, 0.032, -0.032]} rotation={[-0.25, 0, 0]}>
                <boxGeometry args={[0.096, 0.052, 0.0012]} />
                <meshStandardMaterial
                  color="#60a5fa"
                  emissive="#60a5fa"
                  emissiveIntensity={0.75}
                />
              </mesh>
              {/* Apple-style brand dot */}
              <mesh position={[0, 0.04, -0.0385]} rotation={[-0.25, 0, 0]}>
                <boxGeometry args={[0.012, 0.012, 0.0006]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.3} metalness={0.7} emissive="#e5e7eb" emissiveIntensity={0.12} />
              </mesh>
            </group>
          )),
        )}

        {/* Glass + coaster per seat (every position) */}
        {[-0.34, 0.34].map((dz, iz) =>
          [-0.22, 0.0, 0.22].map((dx, ix) => (
            <group
              key={`glass-${iz}-${ix}`}
              position={[widthWorld * dx, 0.518, depthWorld * dz * 0.8]}
            >
              <mesh>
                <cylinderGeometry args={[0.016, 0.016, 0.003, 18]} />
                <meshStandardMaterial color="#2b2f36" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.018, 0]}>
                <cylinderGeometry args={[0.011, 0.013, 0.032, 18]} />
                <meshStandardMaterial color="#e5f2ff" roughness={0.1} metalness={0.15} transparent opacity={0.55} />
              </mesh>
              <mesh position={[0, 0.008, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.016, 14]} />
                <meshStandardMaterial color="#60a5fa" transparent opacity={0.35} roughness={0.1} />
              </mesh>
            </group>
          )),
        )}

        {/* Two notepads + pens at the ends */}
        {[-0.42, 0.42].map((dz, iz) => (
          <group key={`pad_${iz}`} position={[0, 0.512, depthWorld * dz]}>
            <mesh>
              <boxGeometry args={[0.09, 0.003, 0.06]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.8} metalness={0.02} />
            </mesh>
            <mesh position={[0.045, 0.004, 0]}>
              <boxGeometry args={[0.002, 0.004, 0.058]} />
              <meshStandardMaterial color="#1e40af" roughness={0.5} />
            </mesh>
            <mesh position={[0.02, 0.006, -0.015]} rotation={[0, 0, -0.3]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.06, 10]} />
              <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.3} />
            </mesh>
          </group>
        ))}

        {/* Subtle brand plate (front) */}
        <mesh position={[0, 0.49, depthWorld * 0.47]}>
          <boxGeometry args={[widthWorld * 0.22, 0.018, 0.004]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.75} />
        </mesh>
        <mesh position={[0, 0.498, depthWorld * 0.473]}>
          <boxGeometry args={[widthWorld * 0.14, 0.006, 0.001]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.85} emissive="#cbd5e1" emissiveIntensity={0.08} />
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
