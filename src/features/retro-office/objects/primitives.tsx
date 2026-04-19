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

        {/* Engraved brass nameplate on the front apron */}
        <mesh position={[0, 0.49, depthWorld * 0.47]}>
          <boxGeometry args={[widthWorld * 0.24, 0.02, 0.004]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.75} />
        </mesh>
        <mesh position={[0, 0.498, depthWorld * 0.473]}>
          <boxGeometry args={[widthWorld * 0.17, 0.008, 0.001]} />
          <meshStandardMaterial
            color="#d4a857"
            roughness={0.28}
            metalness={0.92}
            emissive="#d4a857"
            emissiveIntensity={0.14}
          />
        </mesh>
        {/* Nameplate engraved letters (three brass studs) */}
        {[-0.035, 0, 0.035].map((dx, i) => (
          <mesh key={`nameplate_stud_${i}`} position={[widthWorld * dx, 0.5018, depthWorld * 0.474]}>
            <boxGeometry args={[0.006, 0.002, 0.0005]} />
            <meshStandardMaterial color="#f5d78b" roughness={0.25} metalness={0.95} emissive="#f5d78b" emissiveIntensity={0.25} />
          </mesh>
        ))}

        {/* Executive floral centerpiece — crystal vase with orchid sprig (offset from speaker phone along long axis) */}
        <group position={[0, 0.512, depthWorld * 0.18]}>
          {/* Crystal vase (low profile — doesn't block sightlines) */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.022, 0.028, 0.08, 20]} />
            <meshStandardMaterial
              color="#c6e2ff"
              transparent
              opacity={0.55}
              roughness={0.08}
              metalness={0.25}
              emissive="#9bd0ff"
              emissiveIntensity={0.08}
            />
          </mesh>
          {/* Vase water highlight */}
          <mesh position={[0, 0.062, 0]}>
            <cylinderGeometry args={[0.017, 0.02, 0.02, 14]} />
            <meshStandardMaterial color="#7ec4ff" transparent opacity={0.35} roughness={0.1} metalness={0.15} />
          </mesh>
          {/* Orchid stem */}
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.0015, 0.002, 0.08, 8]} />
            <meshStandardMaterial color="#0f5132" roughness={0.7} />
          </mesh>
          {/* Orchid petals — three small blossoms */}
          {[
            { x: 0, y: 0.15, z: 0, col: "#f3e6fb" },
            { x: 0.012, y: 0.13, z: -0.008, col: "#e9d0f9" },
            { x: -0.01, y: 0.138, z: 0.006, col: "#fdf2ff" },
          ].map((b, i) => (
            <mesh key={`orchid_${i}`} position={[b.x, b.y, b.z]}>
              <sphereGeometry args={[0.013, 12, 10]} />
              <meshStandardMaterial
                color={b.col}
                roughness={0.45}
                metalness={0.05}
                emissive={b.col}
                emissiveIntensity={0.08}
              />
            </mesh>
          ))}
          {/* Tiny yellow center of one orchid */}
          <mesh position={[0, 0.15, 0.006]}>
            <sphereGeometry args={[0.004, 10, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function DeskCubicleModel({
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

export function ChairModel({
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
  // Enlarged visual footprint — chairs were reported as "bugged/small"
  const scale = 1.35;

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
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]} scale={[scale, scale, scale]}>
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
