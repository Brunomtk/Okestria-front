import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { SCALE } from "@/features/retro-office/core/constants";
import {
  getItemBaseSize,
  getItemRotationRadians,
  toWorld,
} from "@/features/retro-office/core/geometry";
import { InteractiveFurnitureModelProps } from "@/features/retro-office/objects/types";

// IPF-inspired weight plate colors (per kilogram)
const PLATE_COLORS = {
  p25: "#dc2626", // 25 kg – red
  p20: "#2563eb", // 20 kg – blue
  p15: "#f5b800", // 15 kg – yellow
  p10: "#16a34a", // 10 kg – green
  p5: "#f1f5f9", //  5 kg – white
  p2: "#0f172a", //  2.5 kg – black / clip
};

const CHROME = "#e5e7eb";
const STEEL = "#94a3b8";
const GUNMETAL = "#1f2937";
const RUBBER_BLACK = "#0b0f14";
const LEATHER_BLACK = "#111827";
const LED_CYAN = "#22d3ee";
const ACCENT_AMBER = "#f59e0b";

export function AtmMachineModel({
  item,
  isSelected,
  isHovered,
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
    : isHovered
      ? "#69f0da"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered ? 0.2 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.45, -depthWorld * 0.1]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.9, depthWorld * 0.8]} />
          <meshStandardMaterial
            color="#1f2937"
            roughness={0.7}
            metalness={0.1}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, 0.95, -depthWorld * 0.1]}>
          <boxGeometry args={[widthWorld * 0.86, 0.1, depthWorld * 0.76]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0, 0.95, depthWorld * 0.29]}>
          <planeGeometry args={[widthWorld * 0.8, 0.08]} />
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#0ea5e9"
            emissiveIntensity={0.8}
          />
        </mesh>
        <Text
          position={[0, 0.95, depthWorld * 0.3]}
          fontSize={0.06}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ATM
        </Text>

        <group position={[0, 0.6, depthWorld * 0.35]}>
          <mesh receiveShadow>
            <boxGeometry args={[widthWorld * 0.92, 0.5, depthWorld * 0.5]} />
            <meshStandardMaterial color="#d1d5db" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, depthWorld * 0.25 + 0.02]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[widthWorld * 0.7, 0.28, 0.05]} />
            <meshStandardMaterial color="#000000" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.1, depthWorld * 0.25 + 0.046]} rotation={[-0.2, 0, 0]}>
            <planeGeometry args={[widthWorld * 0.6, 0.22]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={0.5}
              roughness={0.2}
            />
          </mesh>
          <Text
            position={[0, 0.1, depthWorld * 0.25 + 0.05]}
            rotation={[-0.2, 0, 0]}
            fontSize={0.045}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            WELCOME
          </Text>
          <Text
            position={[0, 0.06, depthWorld * 0.25 + 0.05]}
            rotation={[-0.2, 0, 0]}
            fontSize={0.02}
            color="#ccfbf1"
            anchorX="center"
            anchorY="middle"
          >
            INSERT CARD
          </Text>
          <mesh
            position={[-widthWorld * 0.42, 0.1, depthWorld * 0.25 + 0.05]}
            rotation={[0, 0.2, 0]}
          >
            <boxGeometry args={[0.04, 0.3, 0.3]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
          <mesh
            position={[widthWorld * 0.42, 0.1, depthWorld * 0.25 + 0.05]}
            rotation={[0, -0.2, 0]}
          >
            <boxGeometry args={[0.04, 0.3, 0.3]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
          <mesh position={[0, -0.15, depthWorld * 0.25 + 0.08]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[widthWorld * 0.92, 0.05, 0.25]} />
            <meshStandardMaterial color="#d1d5db" roughness={0.4} metalness={0.3} />
          </mesh>
          <group position={[0, -0.14, depthWorld * 0.25 + 0.11]} rotation={[0.2, 0, 0]}>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[widthWorld * 0.25, 0.01, 0.12]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
            {Array.from({ length: 12 }).map((_, index) => {
              const column = index % 3;
              const row = Math.floor(index / 3);

              return (
                <mesh
                  key={index}
                  position={[(column - 1) * 0.025, 0.015, (row - 1.5) * 0.025]}
                >
                  <boxGeometry args={[0.015, 0.005, 0.015]} />
                  <meshStandardMaterial color="#f3f4f6" />
                </mesh>
              );
            })}
          </group>
          <group
            position={[widthWorld * 0.25, -0.14, depthWorld * 0.25 + 0.11]}
            rotation={[0.2, 0, 0]}
          >
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.08, 0.02, 0.1]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
            <mesh position={[0, 0.021, 0]}>
              <planeGeometry args={[0.06, 0.008]} />
              <meshStandardMaterial
                color="#10b981"
                emissive="#10b981"
                emissiveIntensity={2}
              />
            </mesh>
          </group>
          <mesh position={[0, -0.35, depthWorld * 0.25 + 0.05]}>
            <boxGeometry args={[widthWorld * 0.6, 0.08, 0.05]} />
            <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.35, depthWorld * 0.25 + 0.076]}>
            <planeGeometry args={[widthWorld * 0.5, 0.02]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function PhoneBoothModel({
  item,
  isSelected,
  isHovered,
  doorOpen = false,
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
    : isHovered
      ? "#7dd3fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.3 : isHovered ? 0.18 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* Base */}
        <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.05, depthWorld]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>

        {/* Roof */}
        <mesh position={[0, 2.175, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.05, depthWorld]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.5}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Roof Top Accent / Sign Block */}
        <mesh position={[0, 2.25, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.1, depthWorld * 0.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
        <Text
          position={[0, 2.25, depthWorld * 0.451]}
          fontSize={0.06}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          PHONE
        </Text>

        {/* Back Wall */}
        <mesh position={[0, 1.1, -depthWorld / 2 + 0.025]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 2.1, 0.05]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>

        {/* Left Wall (Glass) */}
        <mesh position={[-widthWorld / 2 + 0.025, 1.1, 0]} receiveShadow>
          <boxGeometry args={[0.05, 2.1, depthWorld]} />
          <meshStandardMaterial
            color="#bae6fd"
            transparent
            opacity={0.2}
            roughness={0.1}
            metalness={0.8}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Right Wall (Glass) */}
        <mesh position={[widthWorld / 2 - 0.025, 1.1, 0]} receiveShadow>
          <boxGeometry args={[0.05, 2.1, depthWorld]} />
          <meshStandardMaterial
            color="#bae6fd"
            transparent
            opacity={0.2}
            roughness={0.1}
            metalness={0.8}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Front Left Frame */}
        <mesh position={[-widthWorld / 2 + 0.05, 1.1, depthWorld / 2 - 0.025]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 2.1, 0.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        {/* Front Right Frame */}
        <mesh position={[widthWorld / 2 - 0.05, 1.1, depthWorld / 2 - 0.025]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 2.1, 0.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        <mesh
          position={[
            doorOpen ? widthWorld * 0.18 : 0,
            1.1,
            depthWorld / 2 - 0.03,
          ]}
          receiveShadow
        >
          <boxGeometry args={[widthWorld * 0.72, 2.02, 0.04]} />
          <meshStandardMaterial
            color="#dbeafe"
            transparent
            opacity={doorOpen ? 0.14 : 0.2}
            roughness={0.08}
            metalness={0.85}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity * 0.7}
          />
        </mesh>

        {/* Shelf */}
        <mesh position={[0, 1.0, -depthWorld / 2 + 0.15]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.8, 0.04, 0.25]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>

        {/* Phone unit on back wall */}
        <group position={[0, 1.2, -depthWorld / 2 + 0.08]}>
          <mesh>
            <boxGeometry args={[0.2, 0.3, 0.06]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0, -0.05, 0.035]}>
            <boxGeometry args={[0.12, 0.12, 0.02]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[0, 0.08, 0.035]}>
            <planeGeometry args={[0.14, 0.08]} />
            <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-0.15, 0, 0.02]}>
            <boxGeometry args={[0.04, 0.25, 0.04]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[-0.1, -0.15, 0.02]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.005, 0.005, 0.15, 8]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        </group>

        {/* Acoustic panels inside */}
        <mesh position={[0, 1.5, -depthWorld / 2 + 0.06]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.8, 0.6, 0.02]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function SmsBoothModel({
  item,
  isSelected,
  isHovered,
  doorOpen = false,
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
    : isHovered
      ? "#7dd3fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.28 : isHovered ? 0.16 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.05, depthWorld]} />
          <meshStandardMaterial color="#172033" roughness={0.84} />
        </mesh>
        <mesh position={[0, 1.625, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.05, depthWorld]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.5}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, 1.69, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.88, 0.08, depthWorld * 0.88]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
        <Text
          position={[0, 1.69, depthWorld * 0.445]}
          fontSize={0.055}
          color="#22d3ee"
          anchorX="center"
          anchorY="middle"
        >
          SMS
        </Text>
        <mesh position={[0, 0.8, -depthWorld / 2 + 0.025]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 1.5, 0.05]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[-widthWorld / 2 + 0.025, 0.8, 0]} receiveShadow>
          <boxGeometry args={[0.05, 1.5, depthWorld]} />
          <meshStandardMaterial
            color="#cffafe"
            transparent
            opacity={0.18}
            roughness={0.1}
            metalness={0.8}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[widthWorld / 2 - 0.025, 0.8, 0]} receiveShadow>
          <boxGeometry args={[0.05, 1.5, depthWorld]} />
          <meshStandardMaterial
            color="#cffafe"
            transparent
            opacity={0.18}
            roughness={0.1}
            metalness={0.8}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[-widthWorld / 2 + 0.05, 0.8, depthWorld / 2 - 0.025]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1.5, 0.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh position={[widthWorld / 2 - 0.05, 0.8, depthWorld / 2 - 0.025]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1.5, 0.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh
          position={[
            doorOpen ? widthWorld * 0.15 : 0,
            0.8,
            depthWorld / 2 - 0.03,
          ]}
          receiveShadow
        >
          <boxGeometry args={[widthWorld * 0.68, 1.42, 0.04]} />
          <meshStandardMaterial
            color="#dbeafe"
            transparent
            opacity={doorOpen ? 0.12 : 0.18}
            roughness={0.08}
            metalness={0.85}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity * 0.7}
          />
        </mesh>
        <mesh position={[0, 0.68, -depthWorld / 2 + 0.17]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.78, 0.06, 0.28]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.88, -depthWorld / 2 + 0.15]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.18, 0.08, 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.9, -depthWorld / 2 + 0.184]}>
          <planeGeometry args={[widthWorld * 0.13, 0.05]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#60a5fa"
            emissiveIntensity={0.8}
          />
        </mesh>
        <mesh position={[0, 0.84, -depthWorld / 2 + 0.165]}>
          <boxGeometry args={[widthWorld * 0.2, 0.01, 0.08]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </group>
    </group>
  );
}

export function ServerRackModel({
  item,
  isSelected,
  isHovered,
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
    : isHovered
      ? "#38bdf8"
      : "#000000";
  const highlightIntensity = isSelected ? 0.3 : isHovered ? 0.15 : 0;
  const rackHeight = 1.45;
  const serverUnits = 8;
  const unitHeight = (rackHeight - 0.2) / serverUnits;

  const lightColors = useMemo(() => {
    const colors = ["#22c55e", "#3b82f6", "#ef4444", "#eab308", "#ec4899"];
    let seed = 0;
    for (let index = 0; index < item._uid.length; index += 1) {
      seed += item._uid.charCodeAt(index);
    }
    return Array.from({ length: serverUnits }).map((_, index) => ({
      status: colors[(seed + index) % colors.length],
      activity: (seed + index) % 3 === 0,
    }));
  }, [item._uid]);

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, rackHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, rackHeight, depthWorld]} />
          <meshStandardMaterial
            color="#111827"
            roughness={0.4}
            metalness={0.6}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <group position={[0, 0.1 + unitHeight / 2, depthWorld / 2 + 0.01]}>
          {lightColors.map((config, index) => (
            <group key={index} position={[0, index * unitHeight, 0]}>
              <mesh receiveShadow>
                <boxGeometry args={[widthWorld * 0.88, unitHeight * 0.9, 0.02]} />
                <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.4} />
              </mesh>
              <mesh position={[-widthWorld * 0.38, 0, 0.015]}>
                <planeGeometry args={[0.03, 0.03]} />
                <meshStandardMaterial
                  color={config.status}
                  emissive={config.status}
                  emissiveIntensity={2}
                  toneMapped={false}
                />
              </mesh>
              {config.activity ? (
                <group position={[-widthWorld * 0.28, 0, 0.015]}>
                  <mesh position={[0, 0.015, 0]}>
                    <planeGeometry args={[0.015, 0.015]} />
                    <meshStandardMaterial
                      color="#22d3ee"
                      emissive="#22d3ee"
                      emissiveIntensity={3}
                      toneMapped={false}
                    />
                  </mesh>
                  <mesh position={[0.025, 0, 0]}>
                    <planeGeometry args={[0.015, 0.015]} />
                    <meshStandardMaterial
                      color="#22d3ee"
                      emissive="#22d3ee"
                      emissiveIntensity={1.5}
                      toneMapped={false}
                    />
                  </mesh>
                </group>
              ) : null}
              <mesh position={[widthWorld * 0.15, 0, 0.015]}>
                <planeGeometry args={[widthWorld * 0.4, unitHeight * 0.6]} />
                <meshStandardMaterial color="#000000" opacity={0.6} transparent />
              </mesh>
            </group>
          ))}
        </group>
        <mesh position={[0, rackHeight / 2, depthWorld / 2 + 0.03]}>
          <boxGeometry args={[widthWorld, rackHeight, 0.02]} />
          <meshStandardMaterial
            color="#a5f3fc"
            opacity={0.15}
            transparent
            roughness={0.08}
            metalness={0.1}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, rackHeight + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthWorld * 0.8, depthWorld * 0.8]} />
          <meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

export function ServerTerminalModel({
  item,
  isSelected,
  isHovered,
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
    : isHovered
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.92, 0.64, depthWorld * 0.86]} />
          <meshStandardMaterial
            color="#101827"
            roughness={0.62}
            metalness={0.18}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, 0.46, depthWorld * 0.44]} rotation={[-0.18, 0, 0]}>
          <planeGeometry args={[widthWorld * 0.64, 0.26]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#60a5fa"
            emissiveIntensity={0.7}
          />
        </mesh>
        <Text
          position={[0, 0.47, depthWorld * 0.45]}
          rotation={[-0.18, 0, 0]}
          fontSize={0.05}
          color="#eff6ff"
          anchorX="center"
          anchorY="middle"
        >
          GITHUB
        </Text>
        <Text
          position={[0, 0.4, depthWorld * 0.45]}
          rotation={[-0.18, 0, 0]}
          fontSize={0.018}
          color="#bfdbfe"
          anchorX="center"
          anchorY="middle"
        >
          REVIEW STATION
        </Text>
        <mesh position={[0, 0.11, depthWorld * 0.42]}>
          <boxGeometry args={[widthWorld * 0.66, 0.06, 0.12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.14} />
        </mesh>
      </group>
    </group>
  );
}

export function QaTerminalModel({
  item,
  isSelected,
  isHovered,
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
    : isHovered
      ? "#c084fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.37, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.74, depthWorld * 0.88]} />
          <meshStandardMaterial
            color="#12081c"
            roughness={0.5}
            metalness={0.26}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.94, 0.04, depthWorld * 0.9]} />
          <meshStandardMaterial color="#231235" metalness={0.55} roughness={0.24} />
        </mesh>
        {[-widthWorld * 0.2, widthWorld * 0.2].map((x, index) => (
          <group key={x} position={[x, 0.52, depthWorld * 0.41]} rotation={[-0.16, 0, 0]}>
            <mesh>
              <planeGeometry args={[widthWorld * 0.28, 0.24]} />
              <meshStandardMaterial
                color={index === 0 ? "#8b5cf6" : "#38bdf8"}
                emissive={index === 0 ? "#8b5cf6" : "#38bdf8"}
                emissiveIntensity={0.9}
              />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[widthWorld * 0.24, 0.18]} />
              <meshStandardMaterial
                color={index === 0 ? "#ede9fe" : "#e0f2fe"}
                emissive={index === 0 ? "#c084fc" : "#38bdf8"}
                emissiveIntensity={0.18}
              />
            </mesh>
          </group>
        ))}
        <Text
          position={[0, 0.73, 0]}
          fontSize={0.034}
          color="#faf5ff"
          anchorX="center"
          anchorY="middle"
        >
          QA LAB
        </Text>
        <Text
          position={[0, 0.66, 0]}
          fontSize={0.014}
          color="#ddd6fe"
          anchorX="center"
          anchorY="middle"
        >
          TEST CONSOLE
        </Text>
        <mesh position={[0, 0.16, depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.78, 0.07, 0.15]} />
          <meshStandardMaterial color="#241237" roughness={0.48} metalness={0.22} />
        </mesh>
        <mesh position={[0, 0.2, depthWorld * 0.44]}>
          <boxGeometry args={[widthWorld * 0.48, 0.02, 0.07]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.2} />
        </mesh>
        {[-widthWorld * 0.44, widthWorld * 0.44].map((x) => (
          <mesh key={x} position={[x, 0.4, 0]}>
            <boxGeometry args={[0.03, 0.64, 0.03]} />
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#8b5cf6"
              emissiveIntensity={0.7}
              metalness={0.35}
              roughness={0.28}
            />
          </mesh>
        ))}
        {[-widthWorld * 0.3, 0, widthWorld * 0.3].map((x, index) => (
          <mesh key={x} position={[x, 0.09, depthWorld * 0.47]}>
            <boxGeometry args={[0.05, 0.01, 0.02]} />
            <meshStandardMaterial
              color={index === 1 ? "#22c55e" : "#38bdf8"}
              emissive={index === 1 ? "#22c55e" : "#38bdf8"}
              emissiveIntensity={1.2}
            />
          </mesh>
        ))}
        <mesh position={[widthWorld * 0.36, 0.3, -depthWorld * 0.18]} rotation={[0, -0.3, 0]}>
          <boxGeometry args={[0.08, 0.18, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.55} />
        </mesh>
        <mesh position={[widthWorld * 0.36, 0.39, -depthWorld * 0.18]} rotation={[0, -0.3, 0]}>
          <planeGeometry args={[0.05, 0.07]} />
          <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

export function DeviceRackModel({
  item,
  isSelected,
  isHovered,
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
    : isHovered
      ? "#38bdf8"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered ? 0.18 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 1.0, depthWorld * 0.92]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.45}
            metalness={0.58}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {[-0.26, 0, 0.26].map((offset, columnIndex) => (
          <group key={offset} position={[offset, 0.22, depthWorld / 2 + 0.01]}>
            {[0, 0.24, 0.48].map((level, rowIndex) => (
              <group key={`${offset}:${level}`} position={[0, level, 0]}>
                <mesh>
                  <boxGeometry args={[widthWorld * 0.24, 0.16, 0.03]} />
                  <meshStandardMaterial color="#111827" />
                </mesh>
                <mesh position={[0, 0, 0.018]}>
                  <planeGeometry args={[widthWorld * 0.18, 0.09]} />
                  <meshStandardMaterial
                    color={
                      rowIndex === 1
                        ? "#22c55e"
                        : columnIndex === 1
                          ? "#8b5cf6"
                          : "#38bdf8"
                    }
                    emissive={
                      rowIndex === 1
                        ? "#22c55e"
                        : columnIndex === 1
                          ? "#8b5cf6"
                          : "#38bdf8"
                    }
                    emissiveIntensity={0.8}
                  />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        {[-widthWorld * 0.47, widthWorld * 0.47].map((x) => (
          <mesh key={x} position={[x, 0.5, 0]}>
            <boxGeometry args={[0.02, 0.96, depthWorld * 0.94]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.55} />
          </mesh>
        ))}
        <Text
          position={[0, 1.05, 0]}
          fontSize={0.04}
          color="#e0f2fe"
          anchorX="center"
          anchorY="middle"
        >
          DEVICES
        </Text>
      </group>
    </group>
  );
}

export function TestBenchModel({
  item,
  isSelected,
  isHovered,
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
    : isHovered
      ? "#c084fc"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered ? 0.18 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.08, depthWorld]} />
          <meshStandardMaterial
            color="#312e81"
            roughness={0.62}
            metalness={0.14}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {[-widthWorld * 0.34, widthWorld * 0.34].map((x) =>
          [-depthWorld * 0.34, depthWorld * 0.34].map((z) => (
            <mesh key={`${x}:${z}`} position={[x, 0.22, z]} castShadow>
              <boxGeometry args={[0.05, 0.44, 0.05]} />
              <meshStandardMaterial color="#1f2937" roughness={0.52} metalness={0.2} />
            </mesh>
          )),
        )}
        <mesh position={[-widthWorld * 0.18, 0.52, 0]}>
          <boxGeometry args={[widthWorld * 0.22, 0.12, 0.02]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[-widthWorld * 0.18, 0.52, 0.016]}>
          <planeGeometry args={[widthWorld * 0.18, 0.08]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[widthWorld * 0.16, 0.5, 0]} rotation={[0, 0.16, 0]}>
          <boxGeometry args={[0.1, 0.02, 0.14]} />
          <meshStandardMaterial color="#111827" roughness={0.24} metalness={0.58} />
        </mesh>
        <mesh position={[widthWorld * 0.04, 0.52, -depthWorld * 0.22]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.08]} />
          <meshStandardMaterial color="#1f2937" roughness={0.18} metalness={0.65} />
        </mesh>
        <mesh position={[widthWorld * 0.04, 0.54, -depthWorld * 0.22]} rotation={[0, 0.3, 0]}>
          <planeGeometry args={[0.09, 0.05]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-widthWorld * 0.36, 0.5, -depthWorld * 0.16]}>
          <cylinderGeometry args={[0.015, 0.022, 0.18, 14]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.32} metalness={0.7} />
        </mesh>
        <mesh position={[-widthWorld * 0.31, 0.6, -depthWorld * 0.1]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.12, 0.018, 0.018]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.28} metalness={0.65} />
        </mesh>
        <Text
          position={[0, 0.64, 0]}
          fontSize={0.034}
          color="#ede9fe"
          anchorX="center"
          anchorY="middle"
        >
          TEST BENCH
        </Text>
      </group>
    </group>
  );
}

export function PingPongTableModel({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const width = (item.w ?? 100) * SCALE;
  const depth = (item.h ?? 60) * SCALE;
  const [wx, , wz] = toWorld(item.x, item.y);
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#4a90d9"
      : "#000000";
  const highlightIntensity = isSelected ? 0.35 : isHovered && editMode ? 0.22 : 0;
  const topThickness = 0.045;
  const topHeight = 0.44;
  const lineThickness = 0.012;
  const lineRaise = topThickness * 0.55;

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
        <mesh position={[0, topHeight, 0]} receiveShadow>
          <boxGeometry args={[width, topThickness, depth]} />
          <meshStandardMaterial
            color="#1f6f4a"
            roughness={0.72}
            metalness={0.08}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, topHeight - 0.01, 0]}>
          <boxGeometry args={[width + 0.02, 0.018, depth + 0.02]} />
          <meshStandardMaterial
            color="#d7dde3"
            roughness={0.5}
            metalness={0.15}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity * 0.5}
          />
        </mesh>
        <mesh position={[0, topHeight + lineRaise, 0]}>
          <boxGeometry args={[width * 0.94, lineThickness, 0.02]} />
          <meshStandardMaterial color="#f7f8fb" roughness={0.45} />
        </mesh>
        <mesh position={[0, topHeight + lineRaise, depth * 0.48]}>
          <boxGeometry args={[width * 0.94, lineThickness, 0.02]} />
          <meshStandardMaterial color="#f7f8fb" roughness={0.45} />
        </mesh>
        <mesh position={[0, topHeight + lineRaise, -depth * 0.48]}>
          <boxGeometry args={[width * 0.94, lineThickness, 0.02]} />
          <meshStandardMaterial color="#f7f8fb" roughness={0.45} />
        </mesh>
        <mesh position={[0, topHeight + lineRaise, 0]}>
          <boxGeometry args={[0.02, lineThickness, depth * 0.92]} />
          <meshStandardMaterial color="#f7f8fb" roughness={0.45} />
        </mesh>
        <mesh position={[0, topHeight + 0.075, 0]}>
          <boxGeometry args={[0.012, 0.11, depth * 0.92]} />
          <meshStandardMaterial
            color="#e8edf2"
            roughness={0.85}
            metalness={0.04}
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh position={[0, topHeight + 0.06, -depth * 0.46]}>
          <boxGeometry args={[0.02, 0.14, 0.02]} />
          <meshStandardMaterial
            color="#2f3a44"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, topHeight + 0.06, depth * 0.46]}>
          <boxGeometry args={[0.02, 0.14, 0.02]} />
          <meshStandardMaterial
            color="#2f3a44"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[-width * 0.34, 0.21, -depth * 0.3]}>
          <boxGeometry args={[0.06, 0.38, 0.06]} />
          <meshStandardMaterial
            color="#55616c"
            roughness={0.55}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[width * 0.34, 0.21, -depth * 0.3]}>
          <boxGeometry args={[0.06, 0.38, 0.06]} />
          <meshStandardMaterial
            color="#55616c"
            roughness={0.55}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[-width * 0.34, 0.21, depth * 0.3]}>
          <boxGeometry args={[0.06, 0.38, 0.06]} />
          <meshStandardMaterial
            color="#55616c"
            roughness={0.55}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[width * 0.34, 0.21, depth * 0.3]}>
          <boxGeometry args={[0.06, 0.38, 0.06]} />
          <meshStandardMaterial
            color="#55616c"
            roughness={0.55}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[width * 0.46, 0.03, 0.06]} />
          <meshStandardMaterial
            color="#55616c"
            roughness={0.55}
            metalness={0.25}
          />
        </mesh>
      </group>
    </group>
  );
}

export function TreadmillModel({
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
      ? "#38bdf8"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
      {/*
        Treadmill layout (top-down reads as a real treadmill):
        - Running direction along +X (long axis)
        - Motor cover, uprights, console at +X end (the "front")
        - Running belt centered, tread stripes perpendicular to running direction
        - Handrails along both +Z and -Z sides of the belt, extending most of X
      */}
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* ===== Floor pad + feet ===== */}
        <mesh position={[0, 0.004, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 1.02, 0.008, depthWorld * 1.06]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.98} metalness={0.02} />
        </mesh>
        {([-0.42, 0.42] as const).map((fx) =>
          ([-0.4, 0.4] as const).map((fz) => (
            <mesh key={`tf_${fx}_${fz}`} position={[widthWorld * fx, 0.03, depthWorld * fz]} castShadow>
              <cylinderGeometry args={[0.045, 0.055, 0.05, 16]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.02} />
            </mesh>
          ))
        )}

        {/* ===== Deck chassis (low rectangle that hosts the belt) ===== */}
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.96, 0.14, depthWorld * 0.9]} />
          <meshStandardMaterial
            color={GUNMETAL}
            roughness={0.6}
            metalness={0.45}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Chassis cyan side stripes (long sides, along X) */}
        <mesh position={[0, 0.14, -depthWorld * 0.455]}>
          <boxGeometry args={[widthWorld * 0.8, 0.018, 0.004]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.75} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.14, depthWorld * 0.455]}>
          <boxGeometry args={[widthWorld * 0.8, 0.018, 0.004]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.75} toneMapped={false} />
        </mesh>

        {/* ===== Side rails (raised aluminum edges flanking the belt, long X axis) ===== */}
        <mesh position={[-widthWorld * 0.04, 0.2, -depthWorld * 0.38]} castShadow>
          <boxGeometry args={[widthWorld * 0.78, 0.05, depthWorld * 0.1]} />
          <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.82} />
        </mesh>
        <mesh position={[-widthWorld * 0.04, 0.2, depthWorld * 0.38]} castShadow>
          <boxGeometry args={[widthWorld * 0.78, 0.05, depthWorld * 0.1]} />
          <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.82} />
        </mesh>

        {/* ===== Running belt (long along X, narrower along Z) ===== */}
        <mesh position={[-widthWorld * 0.04, 0.19, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.78, 0.02, depthWorld * 0.58]} />
          <meshStandardMaterial color="#040609" roughness={0.95} metalness={0.05} />
        </mesh>
        {/* Front belt roller (chrome, oriented along Z at +X end of belt) */}
        <mesh
          position={[widthWorld * 0.35, 0.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.05, depthWorld * 0.58, 18]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
        </mesh>
        {/* Rear belt roller (chrome, at -X end) */}
        <mesh
          position={[-widthWorld * 0.43, 0.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.05, depthWorld * 0.58, 18]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
        </mesh>
        {/* Belt tread stripes: thin boxes oriented ACROSS Z (perpendicular to running direction),
            spaced evenly along X so they visually read as tread from above */}
        {Array.from({ length: 18 }).map((_, i) => {
          const t = i / 17; // 0..1 along belt length
          const x = -widthWorld * 0.4 + t * widthWorld * 0.72;
          return (
            <mesh key={`tread_${i}`} position={[x, 0.202, 0]}>
              <boxGeometry args={[0.01, 0.002, depthWorld * 0.54]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} metalness={0.08} />
            </mesh>
          );
        })}

        {/* ===== Motor cover at +X end (angled hood pointing forward/up) ===== */}
        <mesh position={[widthWorld * 0.44, 0.26, 0]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[depthWorld * 0.35, 0.26, depthWorld * 0.84]} />
          <meshStandardMaterial color="#0f172a" roughness={0.38} metalness={0.62} />
        </mesh>
        {/* Chrome band running along the motor cover's front edge (across Z) */}
        <mesh position={[widthWorld * 0.5, 0.3, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.02, 0.03, depthWorld * 0.82]} />
          <meshStandardMaterial color={CHROME} roughness={0.2} metalness={0.95} />
        </mesh>
        {/* Brand badge decal on motor cover top */}
        <mesh position={[widthWorld * 0.44, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[depthWorld * 0.3, 0.055]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.85} toneMapped={false} />
        </mesh>

        {/* ===== Uprights (two tilted tubes rising from +X end) ===== */}
        {([-0.32, 0.32] as const).map((zSide, i) => (
          <mesh
            key={`upright_${i}`}
            position={[widthWorld * 0.44, 0.58, depthWorld * zSide]}
            rotation={[0, 0, -0.1]}
            castShadow
          >
            <boxGeometry args={[0.07, 0.78, 0.07]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.46} metalness={0.55} />
          </mesh>
        ))}
        {/* Cross brace (connecting uprights at mid-height, spans Z) */}
        <mesh position={[widthWorld * 0.47, 0.5, 0]} castShadow>
          <boxGeometry args={[0.06, 0.04, depthWorld * 0.6]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.5} />
        </mesh>

        {/* ===== Console bezel (tilted, at top of uprights, spans Z) ===== */}
        <mesh position={[widthWorld * 0.5, 0.98, 0]} rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.08, 0.3, depthWorld * 0.82]} />
          <meshStandardMaterial color="#0b1220" roughness={0.4} metalness={0.55} />
        </mesh>
        {/* Chrome rim around console (facing -X so runner can see it) */}
        <mesh position={[widthWorld * 0.46, 0.98, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.005, 0.34, depthWorld * 0.84]} />
          <meshStandardMaterial color={CHROME} roughness={0.24} metalness={0.92} />
        </mesh>
        {/* Main LCD display (cyan, facing -X) */}
        <mesh position={[widthWorld * 0.455, 1.0, 0]} rotation={[0, -Math.PI / 2, -0.3]}>
          <planeGeometry args={[depthWorld * 0.5, 0.16]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={1.9} toneMapped={false} />
        </mesh>
        {/* Digit bars on LCD */}
        {([-0.18, -0.06, 0.06, 0.18] as const).map((lz, i) => (
          <mesh
            key={`digit_${i}`}
            position={[widthWorld * 0.453, 1.0, depthWorld * lz]}
            rotation={[0, -Math.PI / 2, -0.3]}
          >
            <planeGeometry args={[0.065, 0.05]} />
            <meshStandardMaterial color="#0f172a" opacity={0.55} transparent />
          </mesh>
        ))}
        {/* Red pulse dot on the LCD */}
        <mesh
          position={[widthWorld * 0.451, 1.01, depthWorld * 0.28]}
          rotation={[0, -Math.PI / 2, -0.3]}
        >
          <circleGeometry args={[0.018, 20]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>

        {/* Speed buttons row (amber, on console face below LCD) */}
        {([-0.22, -0.08, 0.08, 0.22] as const).map((bz, i) => (
          <mesh
            key={`spd_${i}`}
            position={[widthWorld * 0.448, 0.92, depthWorld * bz]}
            rotation={[0, -Math.PI / 2, -0.3]}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.018, 16]} />
            <meshStandardMaterial
              color={ACCENT_AMBER}
              emissive={ACCENT_AMBER}
              emissiveIntensity={0.45}
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
        ))}
        {/* Incline buttons row (chrome) */}
        {([-0.22, -0.08, 0.08, 0.22] as const).map((bz, i) => (
          <mesh
            key={`inc_${i}`}
            position={[widthWorld * 0.446, 0.86, depthWorld * bz]}
            rotation={[0, -Math.PI / 2, -0.3]}
          >
            <cylinderGeometry args={[0.016, 0.016, 0.016, 16]} />
            <meshStandardMaterial color={CHROME} metalness={0.9} roughness={0.22} />
          </mesh>
        ))}
        {/* Big START/STOP buttons flanking the console */}
        <mesh
          position={[widthWorld * 0.444, 0.88, -depthWorld * 0.35]}
          rotation={[0, -Math.PI / 2, -0.3]}
        >
          <cylinderGeometry args={[0.038, 0.038, 0.022, 20]} />
          <meshStandardMaterial color="#16a34a" emissive="#16a34a" emissiveIntensity={0.8} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh
          position={[widthWorld * 0.444, 0.88, depthWorld * 0.35]}
          rotation={[0, -Math.PI / 2, -0.3]}
        >
          <cylinderGeometry args={[0.038, 0.038, 0.022, 20]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.8} metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Tablet holder shelf at the top of console */}
        <mesh position={[widthWorld * 0.52, 1.15, 0]} rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.06, 0.02, depthWorld * 0.42]} />
          <meshStandardMaterial color="#0b1220" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[widthWorld * 0.56, 1.17, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.02, 0.04, depthWorld * 0.42]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.55} />
        </mesh>

        {/* Cup holders (two chrome rings on the front rail) */}
        {([-0.28, 0.28] as const).map((cz, i) => (
          <mesh
            key={`cup_${i}`}
            position={[widthWorld * 0.42, 0.75, depthWorld * cz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.042, 0.007, 8, 20]} />
            <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.9} />
          </mesh>
        ))}
        {/* Water bottle */}
        <mesh position={[widthWorld * 0.42, 0.8, depthWorld * 0.28]} castShadow>
          <cylinderGeometry args={[0.032, 0.036, 0.13, 18]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[widthWorld * 0.42, 0.87, depthWorld * 0.28]}>
          <cylinderGeometry args={[0.024, 0.024, 0.022, 14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* Safety key (amber) + red tether */}
        <mesh position={[widthWorld * 0.444, 0.82, depthWorld * 0.08]} rotation={[0, -Math.PI / 2, -0.3]}>
          <boxGeometry args={[0.016, 0.04, 0.032]} />
          <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
        <mesh position={[widthWorld * 0.42, 0.7, depthWorld * 0.08]}>
          <cylinderGeometry args={[0.004, 0.004, 0.18, 8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* ===== Handrails (two tubular rails along both sides of the belt, running along X) ===== */}
        {([-0.34, 0.34] as const).map((zSide, i) => (
          <group key={`rail_${i}`}>
            {/* Vertical tie-in post at +X end (connects to upright) */}
            <mesh position={[widthWorld * 0.36, 0.46, depthWorld * zSide]} castShadow>
              <boxGeometry args={[0.05, 0.36, 0.05]} />
              <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.78} />
            </mesh>
            {/* Horizontal foam handrail (long along X, sits mid-high) */}
            <mesh
              position={[-widthWorld * 0.05, 0.62, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.04, 0.04, widthWorld * 0.78, 16]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.88} metalness={0.08} />
            </mesh>
            {/* Amber grip band mid-rail */}
            <mesh
              position={[widthWorld * 0.1, 0.62, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.043, 0.043, 0.08, 16]} />
              <meshStandardMaterial color={ACCENT_AMBER} roughness={0.55} metalness={0.15} />
            </mesh>
            {/* Chrome pulse-sensor band near front */}
            <mesh
              position={[widthWorld * 0.28, 0.62, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
              <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.9} />
            </mesh>
            {/* End cap at -X end */}
            <mesh
              position={[-widthWorld * 0.44, 0.62, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
              <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.78} />
            </mesh>
          </group>
        ))}

        {/* ===== Rear cooling vent (at -X end of chassis) ===== */}
        <mesh position={[-widthWorld * 0.49, 0.14, 0]}>
          <boxGeometry args={[0.005, 0.1, depthWorld * 0.4]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.1} />
        </mesh>
        {([-0.15, -0.05, 0.05, 0.15] as const).map((vz, i) => (
          <mesh key={`vent_${i}`} position={[-widthWorld * 0.488, 0.14, depthWorld * vz]}>
            <boxGeometry args={[0.002, 0.08, 0.005]} />
            <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function WeightBenchModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* Rubber flooring under bench */}
        <mesh position={[0, 0.005, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.01, depthWorld * 0.98]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.98} metalness={0.02} />
        </mesh>

        {/* === FRAME (H-style steel skeleton) === */}
        {/* Foot-end floor stabilizer (horizontal bar perpendicular to bench length) */}
        <mesh position={[-widthWorld * 0.42, 0.05, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, depthWorld * 0.72]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>
        {/* Head-end floor stabilizer (under uprights) */}
        <mesh position={[widthWorld * 0.34, 0.05, 0]} castShadow>
          <boxGeometry args={[0.1, 0.08, depthWorld * 0.88]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>
        {/* Rubber foot caps on stabilizer ends */}
        {([
          [-0.42, -0.34],
          [-0.42, 0.34],
          [0.34, -0.42],
          [0.34, 0.42],
        ] as const).map(([fx, fz], i) => (
          <mesh key={`foot_${i}`} position={[widthWorld * fx, 0.015, depthWorld * fz]}>
            <boxGeometry args={[0.1, 0.03, 0.1]} />
            <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.03} />
          </mesh>
        ))}
        {/* Central spine connecting both feet (hidden under seat) */}
        <mesh position={[-widthWorld * 0.05, 0.1, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.8, 0.06, 0.1]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>

        {/* Vertical post supporting the seat pad */}
        <mesh position={[-widthWorld * 0.22, 0.27, 0]} castShadow>
          <boxGeometry args={[0.08, 0.34, 0.1]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>
        {/* Second vertical support for back-pad end (no diagonal — flat bench) */}
        <mesh position={[widthWorld * 0.08, 0.27, 0]} castShadow>
          <boxGeometry args={[0.08, 0.34, 0.1]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>

        {/* === PADS (FLAT bench — single continuous horizontal pad for supino reto) === */}
        {/* Full-length horizontal pad */}
        <mesh position={[-widthWorld * 0.07, 0.46, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.74, 0.09, depthWorld * 0.36]} />
          <meshStandardMaterial
            color={LEATHER_BLACK}
            roughness={0.4}
            metalness={0.08}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Pad top highlight */}
        <mesh position={[-widthWorld * 0.07, 0.505, 0]}>
          <boxGeometry args={[widthWorld * 0.72, 0.001, depthWorld * 0.34]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Red racing stripe down the length of the pad */}
        <mesh position={[-widthWorld * 0.07, 0.506, 0]}>
          <boxGeometry args={[widthWorld * 0.7, 0.001, 0.01]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} metalness={0.1} />
        </mesh>

        {/* === BARBELL RACK === */}
        {/* Two shorter uprights at the head end */}
        {([-0.36, 0.36] as const).map((zSide, i) => (
          <mesh
            key={`upright_${i}`}
            position={[widthWorld * 0.34, 0.48, depthWorld * zSide]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.86, 0.08]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.6} />
          </mesh>
        ))}
        {/* Top crossbar connecting uprights */}
        <mesh position={[widthWorld * 0.34, 0.92, 0]} castShadow>
          <boxGeometry args={[0.08, 0.06, depthWorld * 0.8]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.6} />
        </mesh>

        {/* J-cups (U-shaped hooks on each upright) */}
        {([-0.36, 0.36] as const).map((zSide, i) => (
          <group key={`jcup_${i}`} position={[widthWorld * 0.34, 0.73, depthWorld * zSide]}>
            {/* Cup base plate */}
            <mesh>
              <boxGeometry args={[0.14, 0.04, 0.08]} />
              <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.9} />
            </mesh>
            {/* Upright wall of the cup (front side) */}
            <mesh position={[-0.05, 0.04, 0]}>
              <boxGeometry args={[0.02, 0.07, 0.08]} />
              <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Olympic barbell (chrome, sitting in the J-cups) — no plates, empty bar */}
        <mesh position={[widthWorld * 0.29, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.026, 0.026, depthWorld * 1.18, 24]} />
          <meshStandardMaterial color={CHROME} roughness={0.2} metalness={0.92} />
        </mesh>
        {/* Inner sleeve (thicker end section) */}
        {([-0.46, 0.46] as const).map((pz, i) => (
          <mesh
            key={`sleeve_${i}`}
            position={[widthWorld * 0.29, 0.78, depthWorld * pz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.042, 0.042, 0.12, 20]} />
            <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.65} />
          </mesh>
        ))}

        {/* Knurl rings on barbell center (grip) */}
        {([-0.22, -0.11, 0.11, 0.22] as const).map((kz, i) => (
          <mesh
            key={`knurl_${i}`}
            position={[widthWorld * 0.29, 0.78, depthWorld * kz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.03, 0.03, 0.06, 18]} />
            <meshStandardMaterial color="#6b7280" roughness={0.9} metalness={0.55} />
          </mesh>
        ))}

        {/* Safety collars (spring clips, empty bar) */}
        {([-0.42, 0.42] as const).map((cz, i) => (
          <mesh
            key={`clip_${i}`}
            position={[widthWorld * 0.29, 0.78, depthWorld * cz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.05, 0.05, 0.04, 18]} />
            <meshStandardMaterial color="#111827" roughness={0.38} metalness={0.65} />
          </mesh>
        ))}

        {/* Safety peg holes on uprights (ladder of notches) */}
        {[0.35, 0.5, 0.65, 0.8].map((yOff, i) =>
          ([-0.36, 0.36] as const).map((zOff, j) => (
            <mesh
              key={`peg_${i}_${j}`}
              position={[widthWorld * 0.34 + 0.05, yOff, depthWorld * zOff]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.06, 10]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
            </mesh>
          )),
        )}

        {/* Brand badge on upright crossbar */}
        <mesh position={[widthWorld * 0.34, 0.88, 0]}>
          <boxGeometry args={[0.01, 0.04, 0.18]} />
          <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.25} roughness={0.4} />
        </mesh>

        {/* === WARMUP PLATES ON FLOOR (at foot-end, stacked) === */}
        {/* 15kg yellow stacked flat */}
        <mesh position={[-widthWorld * 0.42, 0.12, -depthWorld * 0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 32]} />
          <meshStandardMaterial color={PLATE_COLORS.p15} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* 10kg green on top */}
        <mesh position={[-widthWorld * 0.42, 0.17, -depthWorld * 0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.04, 32]} />
          <meshStandardMaterial color={PLATE_COLORS.p10} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Leaning 5kg white plate */}
        <mesh position={[-widthWorld * 0.4, 0.16, depthWorld * 0.3]} rotation={[0, 0, Math.PI / 2 - 0.3]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.035, 32]} />
          <meshStandardMaterial color={PLATE_COLORS.p5} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Water bottle under bench */}
        <mesh position={[-widthWorld * 0.1, 0.13, -depthWorld * 0.4]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.18, 16]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.65} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[-widthWorld * 0.1, 0.23, -depthWorld * 0.4]}>
          <cylinderGeometry args={[0.028, 0.028, 0.03, 14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export function DumbbellRackModel({
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
      ? "#67e8f9"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/*
          PROFESSIONAL HEX DUMBBELL RACK (A-frame, two-tier)
          • Heavy rubber floor pad
          • A-frame: 4 vertical posts + angled inner tray supports (true A-frame geometry)
          • Two angled trays (bottom heavy, top light) — angled 8° back for proper rack-lean
          • Each tray has a chrome saddle rail that cradles the bar between plates
          • Brand header plate with amber LED
          • 10 hex-rubber dumbbells properly shaped: 6-sided prisms, scaled realistically,
            descending in weight from left (heaviest) to right (lightest), with competition
            color-coded inner bands
        */}

        {/* Rubber shock pad under whole rack */}
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.02, depthWorld * 0.96]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.02} />
        </mesh>

        {/* Base sled (gunmetal powder coat) */}
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.94, 0.09, depthWorld * 0.8]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.55} />
        </mesh>
        {/* Chrome trim strips on base */}
        <mesh position={[0, 0.111, depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.94, 0.008, 0.015]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.111, -depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.94, 0.008, 0.015]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.9} />
        </mesh>

        {/* ===== A-FRAME UPRIGHT POSTS (4 corners, tilted inward slightly) ===== */}
        {([-1, 1] as const).map((sideX) =>
          ([-1, 1] as const).map((sideZ) => (
            <mesh
              key={`post_${sideX}_${sideZ}`}
              position={[widthWorld * 0.43 * sideX, 0.4, depthWorld * 0.33 * sideZ]}
              rotation={[0, 0, sideX * 0.06]}
              castShadow
            >
              <boxGeometry args={[0.065, 0.68, 0.065]} />
              <meshStandardMaterial
                color={GUNMETAL}
                roughness={0.4}
                metalness={0.6}
                emissive={highlightColor}
                emissiveIntensity={highlightIntensity}
              />
            </mesh>
          )),
        )}
        {/* Chrome end caps */}
        {([-1, 1] as const).map((sideX) =>
          ([-1, 1] as const).map((sideZ) => (
            <mesh
              key={`cap_${sideX}_${sideZ}`}
              position={[widthWorld * 0.43 * sideX, 0.74, depthWorld * 0.33 * sideZ]}
            >
              <boxGeometry args={[0.075, 0.012, 0.075]} />
              <meshStandardMaterial color={CHROME} roughness={0.2} metalness={0.93} />
            </mesh>
          )),
        )}

        {/* Back crossbars tying the A-frame together */}
        {([-depthWorld * 0.33, depthWorld * 0.33] as const).map((z, idx) => (
          <mesh key={`cb-top-${idx}`} position={[0, 0.72, z]}>
            <boxGeometry args={[widthWorld * 0.88, 0.04, 0.04]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.42} metalness={0.58} />
          </mesh>
        ))}
        {/* Diagonal bracing visible from front */}
        <mesh position={[0, 0.4, depthWorld * 0.36]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[widthWorld * 0.2, 0.025, 0.02]} />
          <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.78} />
        </mesh>
        <mesh position={[0, 0.4, -depthWorld * 0.36]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[widthWorld * 0.2, 0.025, 0.02]} />
          <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.78} />
        </mesh>

        {/* ===== TWO ANGLED TRAYS (bottom heavy, top light) ===== */}
        {/* Bottom tray — 8° lean back for proper A-frame angle */}
        <mesh position={[0, 0.26, -depthWorld * 0.02]} rotation={[0.14, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.88, 0.045, depthWorld * 0.52]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.48} />
        </mesh>
        {/* Chrome saddle rail on bottom tray */}
        <mesh position={[0, 0.295, -depthWorld * 0.02]} rotation={[0.14, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, widthWorld * 0.84, 14]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
          <group rotation={[0, 0, Math.PI / 2]} />
        </mesh>

        {/* Top tray — same lean */}
        <mesh position={[0, 0.55, -depthWorld * 0.02]} rotation={[0.14, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.88, 0.045, depthWorld * 0.52]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.48} />
        </mesh>
        <mesh position={[0, 0.585, -depthWorld * 0.02]} rotation={[0.14, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, widthWorld * 0.84, 14]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
          <group rotation={[0, 0, Math.PI / 2]} />
        </mesh>

        {/* ===== HEADER PLATE (brand) ===== */}
        <mesh position={[0, 0.82, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.55, 0.14, 0.06]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.38} metalness={0.62} />
        </mesh>
        {/* LED panel */}
        <mesh position={[0, 0.82, 0.032]}>
          <planeGeometry args={[widthWorld * 0.44, 0.08]} />
          <meshStandardMaterial
            color={ACCENT_AMBER}
            emissive={ACCENT_AMBER}
            emissiveIntensity={0.7}
            roughness={0.35}
          />
        </mesh>
        {/* Chrome frame around LED */}
        <mesh position={[0, 0.82, 0.033]}>
          <planeGeometry args={[widthWorld * 0.46, 0.1]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.9} transparent opacity={0.15} />
        </mesh>

        {/* ───────────────────────────────────────────────
            HEX DUMBBELLS — 10 pairs, descending in size
           ─────────────────────────────────────────────── */}
        {(() => {
          type DB = {
            offsetX: number;
            tray: "bottom" | "top";
            plateColor: string;
            bandColor: string;
            scale: number;
          };
          const rows: DB[] = [
            // BOTTOM tray — heavy (45-25 lbs)
            { offsetX: -0.38, tray: "bottom", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p25, scale: 1.25 },
            { offsetX: -0.2,  tray: "bottom", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p20, scale: 1.15 },
            { offsetX: -0.02, tray: "bottom", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p15, scale: 1.05 },
            { offsetX: 0.18,  tray: "bottom", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p10, scale: 0.97 },
            { offsetX: 0.38,  tray: "bottom", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p5,  scale: 0.9  },
            // TOP tray — light (20-5 lbs)
            { offsetX: -0.38, tray: "top", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p10, scale: 0.85 },
            { offsetX: -0.2,  tray: "top", plateColor: RUBBER_BLACK, bandColor: PLATE_COLORS.p5,  scale: 0.8  },
            { offsetX: -0.02, tray: "top", plateColor: RUBBER_BLACK, bandColor: "#be123c",       scale: 0.75 },
            { offsetX: 0.18,  tray: "top", plateColor: RUBBER_BLACK, bandColor: "#7c3aed",       scale: 0.72 },
            { offsetX: 0.38,  tray: "top", plateColor: RUBBER_BLACK, bandColor: "#0891b2",       scale: 0.68 },
          ];
          const baseYBottom = 0.33;
          const baseYTop = 0.62;

          return rows.map((db, idx) => {
            const r = 0.072 * db.scale;
            const headH = 0.125 * db.scale; // thickness of each hex head
            const barLen = depthWorld * 0.44; // total bar span (front-to-back)
            const yBase = db.tray === "bottom" ? baseYBottom : baseYTop;
            // slight vertical offset so bigger bells sit lower on the angled tray
            const yAdj = (r - 0.072) * 1.3;

            return (
              <group
                key={`db_${idx}`}
                position={[widthWorld * db.offsetX, yBase + yAdj, 0]}
                rotation={[0.14, 0, 0]}
              >
                {/* CHROME BAR with knurl — spans the full width of both heads */}
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.022, 0.022, barLen, 20]} />
                  <meshStandardMaterial color={CHROME} roughness={0.2} metalness={0.95} />
                </mesh>
                {/* Knurl band (center grip — darker, matte) */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.024, 0.024, barLen * 0.42, 20]} />
                  <meshStandardMaterial color="#1f2937" roughness={0.92} metalness={0.4} />
                </mesh>

                {/* FRONT hex head */}
                <group position={[0, 0, barLen * 0.35]}>
                  <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[r, r, headH, 6]} />
                    <meshStandardMaterial color={db.plateColor} roughness={0.82} metalness={0.1} />
                  </mesh>
                  {/* Colored weight band on front face */}
                  <mesh position={[0, 0, headH * 0.5 + 0.001]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[r * 0.78, r * 0.78, 0.003, 6]} />
                    <meshStandardMaterial
                      color={db.bandColor}
                      roughness={0.55}
                      metalness={0.18}
                      emissive={db.bandColor}
                      emissiveIntensity={0.1}
                    />
                  </mesh>
                  {/* Chrome inner hub */}
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[r * 0.26, r * 0.26, headH * 1.02, 18]} />
                    <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
                  </mesh>
                </group>

                {/* BACK hex head */}
                <group position={[0, 0, -barLen * 0.35]}>
                  <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[r, r, headH, 6]} />
                    <meshStandardMaterial color={db.plateColor} roughness={0.82} metalness={0.1} />
                  </mesh>
                  <mesh position={[0, 0, -headH * 0.5 - 0.001]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[r * 0.78, r * 0.78, 0.003, 6]} />
                    <meshStandardMaterial
                      color={db.bandColor}
                      roughness={0.55}
                      metalness={0.18}
                      emissive={db.bandColor}
                      emissiveIntensity={0.1}
                    />
                  </mesh>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[r * 0.26, r * 0.26, headH * 1.02, 18]} />
                    <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
                  </mesh>
                </group>

                {/* Inner collars (between head and bar, both sides) */}
                <mesh position={[0, 0, barLen * 0.24]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.034, 0.034, 0.02, 14]} />
                  <meshStandardMaterial color="#4b5563" roughness={0.38} metalness={0.68} />
                </mesh>
                <mesh position={[0, 0, -barLen * 0.24]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.034, 0.034, 0.02, 14]} />
                  <meshStandardMaterial color="#4b5563" roughness={0.38} metalness={0.68} />
                </mesh>
              </group>
            );
          });
        })()}
      </group>
    </group>
  );
}

export function ExerciseBikeModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
      {/*
        Spin bike layout (top-down reads as a real spinning bike):
        - Long axis along Z (depth=65 > width=45)
        - Front of bike (flywheel, handlebars) at +Z
        - Rear of bike (saddle) at -Z
        - H-frame: front stabilizer foot across X at +Z end; rear stabilizer across X at -Z end
      */}
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* ===== Stabilizer feet (H-frame) ===== */}
        {/* Front stabilizer (spans X, at +Z end) */}
        <mesh position={[0, 0.05, depthWorld * 0.42]} castShadow>
          <boxGeometry args={[widthWorld * 0.92, 0.09, 0.14]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Rear stabilizer (spans X, at -Z end) */}
        <mesh position={[0, 0.05, -depthWorld * 0.42]} castShadow>
          <boxGeometry args={[widthWorld * 0.92, 0.09, 0.14]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Rubber end caps on stabilizers */}
        {([-0.4, 0.4] as const).map((fx) =>
          ([-0.42, 0.42] as const).map((fz) => (
            <mesh key={`bf_${fx}_${fz}`} position={[widthWorld * fx, 0.03, depthWorld * fz]}>
              <boxGeometry args={[0.09, 0.05, 0.16]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.02} />
            </mesh>
          ))
        )}
        {/* Transport wheels at front stabilizer */}
        <mesh position={[widthWorld * 0.3, 0.05, depthWorld * 0.46]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[-widthWorld * 0.3, 0.05, depthWorld * 0.46]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.9} metalness={0.05} />
        </mesh>

        {/* ===== Main frame (red tubular geometry) ===== */}
        {/* Down tube: from bottom bracket (center-front) rising forward to handlebar post top */}
        <mesh
          position={[0, 0.62, depthWorld * 0.24]}
          rotation={[0.45, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.08, 0.95, 0.08]} />
          <meshStandardMaterial
            color="#dc2626"
            roughness={0.36}
            metalness={0.45}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Seat tube: from bottom bracket rising rearward to seat post */}
        <mesh
          position={[0, 0.62, -depthWorld * 0.05]}
          rotation={[-0.32, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.08, 0.9, 0.08]} />
          <meshStandardMaterial color="#dc2626" roughness={0.36} metalness={0.45} />
        </mesh>
        {/* Top cross tube: short horizontal connector between down tube and seat tube tops */}
        <mesh position={[0, 1.0, depthWorld * 0.1]} castShadow>
          <boxGeometry args={[0.07, 0.07, depthWorld * 0.26]} />
          <meshStandardMaterial color="#dc2626" roughness={0.38} metalness={0.42} />
        </mesh>
        {/* Frame chrome nameplate on down tube */}
        <mesh position={[0, 0.82, depthWorld * 0.255]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.092, 0.12, 0.01]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.82, depthWorld * 0.26]} rotation={[0.45, 0, 0]}>
          <planeGeometry args={[0.07, 0.06]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.7} toneMapped={false} />
        </mesh>

        {/* ===== Flywheel (heavy chrome disc at front, axis along X) ===== */}
        <mesh
          position={[0, 0.38, depthWorld * 0.3]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.26, 0.26, 0.07, 36]} />
          <meshStandardMaterial color="#d1d5db" roughness={0.28} metalness={0.88} />
        </mesh>
        {/* Red rim ring accent on one face of flywheel */}
        <mesh
          position={[widthWorld * 0.08, 0.38, depthWorld * 0.3]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <torusGeometry args={[0.24, 0.012, 10, 40]} />
          <meshStandardMaterial color={PLATE_COLORS.p25} roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Center hub */}
        <mesh
          position={[0, 0.38, depthWorld * 0.3]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.1, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Spokes (6, radiating around X axis — in YZ plane) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={`fspoke_${i}`}
            position={[0, 0.38, depthWorld * 0.3]}
            rotation={[(i * Math.PI) / 3, 0, 0]}
          >
            <boxGeometry args={[0.015, 0.4, 0.008]} />
            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}

        {/* ===== Crank + pedals (axis along X through bottom bracket) ===== */}
        <mesh
          position={[0, 0.3, depthWorld * 0.2]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.022, widthWorld * 0.9, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Crank arms (rising perpendicular to axle on each side) */}
        <mesh position={[widthWorld * 0.44, 0.3, depthWorld * 0.2]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.03, 0.22, 0.03]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[-widthWorld * 0.44, 0.3, depthWorld * 0.2]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.03, 0.22, 0.03]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Pedals (flat rubber platforms) */}
        <mesh position={[widthWorld * 0.48, 0.22, depthWorld * 0.28]}>
          <boxGeometry args={[0.08, 0.025, 0.14]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.9} metalness={0.04} />
        </mesh>
        <mesh position={[-widthWorld * 0.48, 0.38, depthWorld * 0.12]}>
          <boxGeometry args={[0.08, 0.025, 0.14]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.9} metalness={0.04} />
        </mesh>

        {/* ===== Resistance knob (tension dial on top of down tube) ===== */}
        <mesh position={[0, 1.08, depthWorld * 0.2]}>
          <cylinderGeometry args={[0.055, 0.065, 0.08, 20]} />
          <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.13, depthWorld * 0.2]}>
          <cylinderGeometry args={[0.065, 0.055, 0.04, 20]} />
          <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.35} roughness={0.3} metalness={0.5} />
        </mesh>

        {/* ===== Handlebar post (chrome, rising from top of down tube) ===== */}
        <mesh position={[0, 1.18, depthWorld * 0.32]} castShadow>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.88} />
        </mesh>
        {/* Handlebar (horizontal bullhorn across X) */}
        <mesh
          position={[0, 1.38, depthWorld * 0.3]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.022, widthWorld * 0.8, 18]} />
          <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.88} />
        </mesh>
        {/* Handlebar side bullhorn tips curving forward (+Z) */}
        {([-0.4, 0.4] as const).map((bx, i) => (
          <mesh
            key={`bh_${i}`}
            position={[widthWorld * bx, 1.38, depthWorld * 0.36]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.022, 0.022, 0.14, 16]} />
            <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.88} />
          </mesh>
        ))}
        {/* Rubber grips on the bullhorns */}
        {([-0.4, 0.4] as const).map((gx, i) => (
          <mesh
            key={`grip_${i}`}
            position={[widthWorld * gx, 1.38, depthWorld * 0.4]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.028, 0.028, 0.08, 16]} />
            <meshStandardMaterial color={RUBBER_BLACK} roughness={0.88} metalness={0.1} />
          </mesh>
        ))}
        {/* Amber end caps on grips */}
        {([-0.4, 0.4] as const).map((gx, i) => (
          <mesh
            key={`gcap_${i}`}
            position={[widthWorld * gx, 1.38, depthWorld * 0.44]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.03, 0.03, 0.012, 16]} />
            <meshStandardMaterial color={ACCENT_AMBER} roughness={0.6} metalness={0.15} />
          </mesh>
        ))}

        {/* ===== Digital console mounted on handlebar post (faces -Z toward rider) ===== */}
        <mesh position={[0, 1.48, depthWorld * 0.27]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.26, 0.14, 0.05]} />
          <meshStandardMaterial color="#0b1220" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.48, depthWorld * 0.255]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[0.22, 0.09]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        {/* LCD digit bars */}
        {([-0.07, 0.01, 0.07] as const).map((lx, i) => (
          <mesh
            key={`bd_${i}`}
            position={[lx, 1.48, depthWorld * 0.248]}
            rotation={[-0.2, 0, 0]}
          >
            <planeGeometry args={[0.05, 0.04]} />
            <meshStandardMaterial color="#0f172a" opacity={0.55} transparent />
          </mesh>
        ))}

        {/* ===== Saddle (rear -Z end) ===== */}
        {/* Seat post rising from top of seat tube */}
        <mesh position={[0, 1.12, -depthWorld * 0.16]} castShadow>
          <boxGeometry args={[0.055, 0.32, 0.055]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.85} />
        </mesh>
        {/* Saddle base (long along Z, narrow along X) */}
        <mesh position={[0, 1.28, -depthWorld * 0.2]} castShadow>
          <boxGeometry args={[widthWorld * 0.32, 0.05, depthWorld * 0.3]} />
          <meshStandardMaterial color={LEATHER_BLACK} roughness={0.5} metalness={0.12} />
        </mesh>
        {/* Saddle nose (rounded front of the saddle) */}
        <mesh position={[0, 1.28, -depthWorld * 0.05]} castShadow>
          <boxGeometry args={[widthWorld * 0.18, 0.04, depthWorld * 0.12]} />
          <meshStandardMaterial color={LEATHER_BLACK} roughness={0.5} metalness={0.12} />
        </mesh>
        {/* Red stitch stripe down center of saddle */}
        <mesh position={[0, 1.31, -depthWorld * 0.18]}>
          <boxGeometry args={[0.008, 0.005, depthWorld * 0.28]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} metalness={0.1} />
        </mesh>

        {/* ===== Water bottle cage on down tube ===== */}
        <mesh position={[widthWorld * 0.16, 0.78, depthWorld * 0.24]} rotation={[0.45, 0, 0]} castShadow>
          <cylinderGeometry args={[0.036, 0.04, 0.16, 16]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[widthWorld * 0.16, 0.87, depthWorld * 0.24]} rotation={[0.45, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.022, 14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export function PunchingBagModel({
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
  const { width } = getItemBaseSize(item);
  const widthWorld = width * SCALE;
  const rotY = getItemRotationRadians(item);
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#f97316"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
      <group position={[widthWorld / 2, 0, widthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* Ceiling hook mount */}
        <mesh position={[0, 2.15, 0]}>
          <boxGeometry args={[0.26, 0.04, 0.26]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.65} />
        </mesh>
        <mesh position={[0, 2.11, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
          <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Chain (series of small links) */}
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`chain_${i}`} position={[0, 2.05 - i * 0.05, 0]} rotation={[i % 2 ? Math.PI / 2 : 0, 0, 0]}>
            <torusGeometry args={[0.022, 0.007, 6, 12]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.32} metalness={0.85} />
          </mesh>
        ))}

        {/* Top swivel cap */}
        <mesh position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.06, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* The heavy bag body (tall cylinder) */}
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.16, 1.4, 28]} />
          <meshStandardMaterial
            color="#7f1d1d"
            roughness={0.55}
            metalness={0.08}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Stitched panel seams (3 vertical lines) */}
        {([0, (Math.PI * 2) / 3, (Math.PI * 4) / 3] as const).map((a, i) => (
          <mesh
            key={`seam_${i}`}
            position={[Math.sin(a) * 0.185, 1.0, Math.cos(a) * 0.185]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[0.004, 1.38, 0.006]} />
            <meshStandardMaterial color="#3f0d0d" roughness={0.85} metalness={0.04} />
          </mesh>
        ))}

        {/* Horizontal wear band top & bottom */}
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.06, 24]} />
          <meshStandardMaterial color={LEATHER_BLACK} roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 24]} />
          <meshStandardMaterial color={LEATHER_BLACK} roughness={0.6} metalness={0.1} />
        </mesh>

        {/* Brand strap */}
        <mesh position={[0, 1.35, 0.19]}>
          <boxGeometry args={[0.16, 0.05, 0.002]} />
          <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.25} roughness={0.4} metalness={0.2} />
        </mesh>

        {/* Rounded bottom cap */}
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.16, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.55} metalness={0.08} />
        </mesh>

        {/* Floor mat ring */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.32, 32]} />
          <meshStandardMaterial color="#111827" roughness={0.92} metalness={0.08} />
        </mesh>
      </group>
    </group>
  );
}

export function RowingMachineModel({
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
      ? "#38bdf8"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* Floor level stabilizer */}
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.96, 0.06, 0.14]} />
          <meshStandardMaterial
            color={GUNMETAL}
            roughness={0.6}
            metalness={0.35}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Rear flywheel cage */}
        <mesh position={[widthWorld * 0.42, 0.32, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.14, 32]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>
        {/* Spoked flywheel inner */}
        <mesh position={[widthWorld * 0.42, 0.32, 0.08]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.005, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.55} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh
            key={`fan_${i}`}
            position={[widthWorld * 0.42, 0.32, 0.08]}
            rotation={[0, Math.PI / 2, (i * Math.PI) / 4]}
          >
            <boxGeometry args={[0.01, 0.36, 0.01]} />
            <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.5} />
          </mesh>
        ))}
        {/* Center hub */}
        <mesh position={[widthWorld * 0.42, 0.32, 0.1]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
          <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.4} roughness={0.35} metalness={0.5} />
        </mesh>
        {/* Fan cage grid */}
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={`cage_${i}`}
            position={[widthWorld * 0.42, 0.32, 0.15]}
            rotation={[0, Math.PI / 2, (i * Math.PI) / 3]}
          >
            <boxGeometry args={[0.003, 0.42, 0.003]} />
            <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.65} />
          </mesh>
        ))}

        {/* Long monorail (the track) */}
        <mesh position={[0, 0.18, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.84, 0.05, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[widthWorld * 0.82, 0.02, 0.06]} />
          <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.85} />
        </mesh>

        {/* Seat (wheeled, sitting on rail) */}
        <mesh position={[-widthWorld * 0.04, 0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.06, 0.22]} />
          <meshStandardMaterial color={LEATHER_BLACK} roughness={0.42} metalness={0.1} />
        </mesh>
        <mesh position={[-widthWorld * 0.04, 0.35, 0]}>
          <boxGeometry args={[0.22, 0.02, 0.08]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.1} />
        </mesh>

        {/* Foot plates */}
        <mesh position={[widthWorld * 0.32, 0.16, 0]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.02, 0.44]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.55} metalness={0.4} />
        </mesh>
        <mesh position={[widthWorld * 0.32, 0.22, 0.11]}>
          <boxGeometry args={[0.08, 0.08, 0.16]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.92} metalness={0.05} />
        </mesh>
        <mesh position={[widthWorld * 0.32, 0.22, -0.11]}>
          <boxGeometry args={[0.08, 0.08, 0.16]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.92} metalness={0.05} />
        </mesh>

        {/* Rowing handle (red ergonomic grip) */}
        <mesh position={[-widthWorld * 0.28, 0.32, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.34]} />
          <meshStandardMaterial color="#dc2626" roughness={0.45} metalness={0.2} />
        </mesh>
        {/* Handle chain to flywheel (thin black strap) */}
        <mesh position={[widthWorld * 0.06, 0.32, 0]}>
          <boxGeometry args={[widthWorld * 0.68, 0.008, 0.008]} />
          <meshStandardMaterial color="#111827" roughness={0.55} metalness={0.35} />
        </mesh>

        {/* Display arm + monitor */}
        <mesh position={[widthWorld * 0.34, 0.66, 0]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[0.04, 0.6, 0.04]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.85} />
        </mesh>
        <mesh position={[widthWorld * 0.26, 0.94, 0]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.22, 0.16, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[widthWorld * 0.26, 0.94, 0.022]} rotation={[0.1, 0, 0]}>
          <planeGeometry args={[0.18, 0.12]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function KettlebellRackModel({
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
      ? "#67e8f9"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/*
          COMPETITION-GRADE KETTLEBELL RACK
          • Heavy rubber floor pad (shock absorber)
          • Three-tier stepped A-frame: lower row (big bells), middle row (medium), top row (light)
          • Anodized black steel frame with chrome caps
          • Kettlebells modelled accurately: flattened-sphere body + stubby neck + thick arched handle
          • Colored competition bands (IPF) wrapped around the bells like real comp kettlebells
          • Each bell has a chrome base plate so it sits flat on the tray (no floating)
        */}

        {/* Rubber shock-absorber pad under the whole rack */}
        <mesh position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.02, depthWorld * 0.96]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.02} />
        </mesh>
        {/* Diamond tread pattern (subtle decal) */}
        <mesh position={[0, 0.023, 0]}>
          <planeGeometry args={[widthWorld * 0.9, depthWorld * 0.88]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.99} metalness={0} transparent opacity={0.55} />
        </mesh>

        {/* === BASE SLED (anodized steel) === */}
        <mesh position={[0, 0.055, -depthWorld * 0.05]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.09, depthWorld * 0.4]} />
          <meshStandardMaterial
            color={GUNMETAL}
            roughness={0.42}
            metalness={0.6}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Chrome trim on base edge */}
        <mesh position={[0, 0.105, -depthWorld * 0.05 + depthWorld * 0.2]}>
          <boxGeometry args={[widthWorld * 0.9, 0.01, 0.02]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.9} />
        </mesh>

        {/* === A-FRAME UPRIGHTS (4 posts: 2 front, 2 back) === */}
        {([-1, 1] as const).map((side) =>
          ([-0.2, -0.05] as const).map((zOffset, zIdx) => (
            <mesh
              key={`post-${side}-${zIdx}`}
              position={[widthWorld * 0.44 * side, 0.3, depthWorld * zOffset]}
              castShadow
            >
              <boxGeometry args={[0.055, 0.56, 0.055]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.38} metalness={0.62} />
            </mesh>
          )),
        )}
        {/* Chrome end caps on the top of the uprights */}
        {([-1, 1] as const).map((side) =>
          ([-0.2, -0.05] as const).map((zOffset, zIdx) => (
            <mesh
              key={`cap-${side}-${zIdx}`}
              position={[widthWorld * 0.44 * side, 0.585, depthWorld * zOffset]}
            >
              <boxGeometry args={[0.065, 0.012, 0.065]} />
              <meshStandardMaterial color={CHROME} roughness={0.18} metalness={0.93} />
            </mesh>
          )),
        )}

        {/* === TWO TIERED SHELVES (slightly angled back for display) === */}
        {/* Bottom tier — heavy bells */}
        <mesh position={[0, 0.11, -depthWorld * 0.05]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.88, 0.02, depthWorld * 0.36]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.35} />
        </mesh>
        {/* Middle tier — medium bells */}
        <mesh position={[0, 0.34, -depthWorld * 0.05]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.88, 0.02, depthWorld * 0.36]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.35} />
        </mesh>
        {/* Top tier — small bells */}
        <mesh position={[0, 0.56, -depthWorld * 0.05]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.88, 0.02, depthWorld * 0.36]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.35} />
        </mesh>

        {/* Retainer bar along front of each tier to stop bells rolling */}
        {[0.135, 0.365, 0.585].map((yTier, idx) => (
          <mesh key={`retainer-${idx}`} position={[0, yTier, depthWorld * 0.12]}>
            <cylinderGeometry args={[0.012, 0.012, widthWorld * 0.86, 12]} />
            <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
            <group rotation={[0, 0, Math.PI / 2]} />
          </mesh>
        ))}
        {/* Actually rotate retainers — separate mesh for correct orientation */}

        {/* === BACK SUPPORT CROSSBARS === */}
        {[0.15, 0.4, 0.6].map((yBar, idx) => (
          <mesh key={`crossbar-${idx}`} position={[0, yBar, -depthWorld * 0.22]}>
            <boxGeometry args={[widthWorld * 0.86, 0.028, 0.028]} />
            <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.78} />
          </mesh>
        ))}

        {/* === BRAND TAG (amber enamel on the back panel) === */}
        <mesh position={[0, 0.26, -depthWorld * 0.225]}>
          <boxGeometry args={[widthWorld * 0.38, 0.07, 0.012]} />
          <meshStandardMaterial
            color={ACCENT_AMBER}
            roughness={0.38}
            metalness={0.5}
            emissive={ACCENT_AMBER}
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* ───────────────────────────────────────────────
            KETTLEBELLS — reusable compact renderer
            Each bell: flattened-sphere body + neck + thick handle + color stripe
           ─────────────────────────────────────────────── */}
        {(() => {
          type KB = {
            offset: number;
            yBase: number;
            color: string;
            stripeColor: string;
            size: number;
            label: string;
          };
          const bells: KB[] = [
            // BOTTOM — heavy weights (24-32kg)
            { offset: -0.34, yBase: 0.12, color: "#1f2937", stripeColor: PLATE_COLORS.p25, size: 0.082, label: "bot1" },
            { offset: -0.11, yBase: 0.12, color: "#1f2937", stripeColor: PLATE_COLORS.p20, size: 0.078, label: "bot2" },
            { offset: 0.11,  yBase: 0.12, color: "#1f2937", stripeColor: PLATE_COLORS.p15, size: 0.074, label: "bot3" },
            { offset: 0.33,  yBase: 0.12, color: "#1f2937", stripeColor: PLATE_COLORS.p10, size: 0.07,  label: "bot4" },
            // MIDDLE — medium weights (14-20kg)
            { offset: -0.34, yBase: 0.35, color: "#1f2937", stripeColor: PLATE_COLORS.p20, size: 0.066, label: "mid1" },
            { offset: -0.11, yBase: 0.35, color: "#1f2937", stripeColor: PLATE_COLORS.p15, size: 0.062, label: "mid2" },
            { offset: 0.11,  yBase: 0.35, color: "#1f2937", stripeColor: PLATE_COLORS.p10, size: 0.058, label: "mid3" },
            { offset: 0.33,  yBase: 0.35, color: "#1f2937", stripeColor: PLATE_COLORS.p5,  size: 0.054, label: "mid4" },
            // TOP — light weights (6-12kg)
            { offset: -0.3,  yBase: 0.57, color: "#1f2937", stripeColor: PLATE_COLORS.p10, size: 0.048, label: "top1" },
            { offset: -0.1,  yBase: 0.57, color: "#1f2937", stripeColor: PLATE_COLORS.p5,  size: 0.044, label: "top2" },
            { offset: 0.1,   yBase: 0.57, color: "#1f2937", stripeColor: "#be123c",        size: 0.04,  label: "top3" },
            { offset: 0.3,   yBase: 0.57, color: "#1f2937", stripeColor: "#7c3aed",        size: 0.036, label: "top4" },
          ];

          return bells.map((kb) => {
            const r = kb.size;
            const neckH = r * 0.28;
            const handleH = r * 0.62;
            return (
              <group
                key={`kb-${kb.label}`}
                position={[widthWorld * kb.offset, kb.yBase + r * 0.92, -depthWorld * 0.05]}
              >
                {/* Flat base plate (so bell sits level) */}
                <mesh position={[0, -r * 0.92, 0]}>
                  <cylinderGeometry args={[r * 0.58, r * 0.62, 0.012, 22]} />
                  <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.62} />
                </mesh>
                {/* BELL BODY — flattened sphere (scale Y=0.85 to simulate real proportions) */}
                <mesh scale={[1, 0.92, 1]} castShadow>
                  <sphereGeometry args={[r, 22, 18]} />
                  <meshStandardMaterial color={kb.color} roughness={0.52} metalness={0.35} />
                </mesh>
                {/* COMPETITION COLOR BAND around the equator */}
                <mesh position={[0, r * 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[r * 0.98, r * 0.085, 10, 28]} />
                  <meshStandardMaterial
                    color={kb.stripeColor}
                    roughness={0.45}
                    metalness={0.18}
                    emissive={kb.stripeColor}
                    emissiveIntensity={0.08}
                  />
                </mesh>
                {/* Weight label (small chrome dot) */}
                <mesh position={[0, r * 0.05, r * 0.97]}>
                  <cylinderGeometry args={[r * 0.2, r * 0.2, 0.002, 16]} />
                  <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.9} />
                </mesh>
                {/* NECK — tapered shoulder between body and handle */}
                <mesh position={[0, r * 0.82, 0]}>
                  <cylinderGeometry args={[r * 0.38, r * 0.55, neckH, 18]} />
                  <meshStandardMaterial color={GUNMETAL} roughness={0.42} metalness={0.58} />
                </mesh>
                {/* HANDLE — thick chrome arch (true half-torus, forward facing) */}
                <mesh
                  position={[0, r * 0.82 + neckH * 0.5 + handleH * 0.5, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <torusGeometry args={[r * 0.62, r * 0.11, 12, 26, Math.PI]} />
                  <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
                </mesh>
                {/* Knurl rings on the handle grip area */}
                <mesh
                  position={[0, r * 0.82 + neckH * 0.5 + handleH * 0.78, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <torusGeometry args={[r * 0.62, r * 0.12, 12, 28, Math.PI]} />
                  <meshStandardMaterial
                    color="#1f2937"
                    roughness={0.82}
                    metalness={0.4}
                    transparent
                    opacity={0.22}
                  />
                </mesh>
              </group>
            );
          });
        })()}
      </group>
    </group>
  );
}

export function YogaMatModel({
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
  const matColor = item.color ?? "#0f766e";
  const highlightColor = isSelected
    ? "#fbbf24"
    : isHovered && editMode
      ? "#5eead4"
      : "#000000";
  const highlightIntensity = isSelected ? 0.3 : isHovered && editMode ? 0.18 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* Base unrolled mat (textured, slight sheen) */}
        <mesh position={[0, 0.012, depthWorld * 0.04]} receiveShadow castShadow>
          <boxGeometry args={[widthWorld * 0.92, 0.018, depthWorld * 0.86]} />
          <meshStandardMaterial
            color={matColor}
            roughness={0.9}
            metalness={0.04}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Inner printed stripe on mat — simulates brand/line */}
        <mesh position={[0, 0.022, depthWorld * 0.04]}>
          <boxGeometry args={[widthWorld * 0.04, 0.001, depthWorld * 0.78]} />
          <meshStandardMaterial color={CHROME} roughness={0.65} metalness={0.1} />
        </mesh>

        {/* Rolled mat at the back — horizontal roll */}
        <mesh position={[0, 0.055, -depthWorld * 0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, widthWorld * 0.88, 22]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.85} metalness={0.04} />
        </mesh>
        {/* End caps of horizontal roll */}
        {[-1, 1].map((side) => (
          <mesh key={`roll-cap-${side}`} position={[widthWorld * 0.44 * side, 0.055, -depthWorld * 0.42]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.057, 0.057, 0.006, 22]} />
            <meshStandardMaterial color="#5b21b6" roughness={0.7} metalness={0.08} />
          </mesh>
        ))}
        {/* Elastic strap binding the roll */}
        <mesh position={[-widthWorld * 0.2, 0.055, -depthWorld * 0.42]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.058, 0.008, 8, 20]} />
          <meshStandardMaterial color={ACCENT_AMBER} roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[widthWorld * 0.22, 0.055, -depthWorld * 0.42]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.058, 0.008, 8, 20]} />
          <meshStandardMaterial color={ACCENT_AMBER} roughness={0.5} metalness={0.15} />
        </mesh>

        {/* Standing rolled mat #1 (vertical) */}
        <group position={[-widthWorld * 0.4, 0, depthWorld * 0.3]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.44, 20]} />
            <meshStandardMaterial color="#0f766e" roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <cylinderGeometry args={[0.052, 0.052, 0.005, 20]} />
            <meshStandardMaterial color="#065f46" roughness={0.7} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.053, 0.007, 8, 18]} />
            <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>

        {/* Standing rolled mat #2 (vertical) */}
        <group position={[-widthWorld * 0.32, 0, depthWorld * 0.36]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.046, 0.046, 0.4, 20]} />
            <meshStandardMaterial color="#be123c" roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 0.005, 20]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} metalness={0.08} />
          </mesh>
        </group>

        {/* Foam yoga block #1 */}
        <mesh position={[widthWorld * 0.35, 0.04, depthWorld * 0.32]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.1]} />
          <meshStandardMaterial color="#6366f1" roughness={0.95} metalness={0.02} />
        </mesh>

        {/* Foam yoga block #2 stacked */}
        <mesh position={[widthWorld * 0.35, 0.12, depthWorld * 0.32]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.1]} />
          <meshStandardMaterial color="#f472b6" roughness={0.95} metalness={0.02} />
        </mesh>

        {/* Yoga strap coiled */}
        <mesh position={[widthWorld * 0.36, 0.018, -depthWorld * 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.06, 0.012, 8, 20]} />
          <meshStandardMaterial color={ACCENT_AMBER} roughness={0.6} metalness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

export function EaselModel({
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
      ? "#fb7185"
      : "#000000";
  const highlightIntensity = isSelected ? 0.32 : isHovered && editMode ? 0.18 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.56, 0.12]} castShadow>
          <boxGeometry args={[0.028, 1.05, 0.028]} />
          <meshStandardMaterial color="#8b5e34" roughness={0.76} />
        </mesh>
        <mesh position={[-0.18, 0.38, -0.02]} rotation={[0.18, 0, 0.16]} castShadow>
          <boxGeometry args={[0.028, 0.88, 0.028]} />
          <meshStandardMaterial color="#8b5e34" roughness={0.76} />
        </mesh>
        <mesh position={[0.18, 0.38, -0.02]} rotation={[0.18, 0, -0.16]} castShadow>
          <boxGeometry args={[0.028, 0.88, 0.028]} />
          <meshStandardMaterial color="#8b5e34" roughness={0.76} />
        </mesh>
        <mesh position={[0, 0.3, 0.02]} castShadow>
          <boxGeometry args={[0.32, 0.03, 0.04]} />
          <meshStandardMaterial color="#7c5530" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.54, -0.03]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.44, 0.03]} />
          <meshStandardMaterial
            color="#fef3c7"
            roughness={0.94}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        <mesh position={[0, 0.55, -0.012]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[-0.05, 0.57, -0.011]}>
          <planeGeometry args={[0.09, 0.06]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[0.07, 0.49, -0.011]}>
          <planeGeometry args={[0.12, 0.07]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.08} />
        </mesh>
      </group>
    </group>
  );
}

export function PaintTableModel({
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
      ? "#f472b6"
      : "#000000";
  const highlightIntensity = isSelected ? 0.3 : isHovered && editMode ? 0.16 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.06, depthWorld]} />
          <meshStandardMaterial
            color="#5b3c22"
            roughness={0.7}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {[
          [-widthWorld * 0.38, 0.2, -depthWorld * 0.34],
          [widthWorld * 0.38, 0.2, -depthWorld * 0.34],
          [-widthWorld * 0.38, 0.2, depthWorld * 0.34],
          [widthWorld * 0.38, 0.2, depthWorld * 0.34],
        ].map(([x, y, z], index) => (
          <mesh key={index} position={[x, y, z]} castShadow>
            <boxGeometry args={[0.035, 0.38, 0.035]} />
            <meshStandardMaterial color="#7c5530" roughness={0.76} />
          </mesh>
        ))}
        <mesh position={[-0.18, 0.46, -0.06]}>
          <cylinderGeometry args={[0.08, 0.08, 0.01, 18]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
        <mesh position={[-0.04, 0.46, 0.04]}>
          <cylinderGeometry args={[0.07, 0.07, 0.01, 18]} />
          <meshStandardMaterial color="#fb7185" />
        </mesh>
        <mesh position={[0.1, 0.46, -0.02]}>
          <cylinderGeometry args={[0.065, 0.065, 0.01, 18]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0.24, 0.49, 0.08]} castShadow>
          <boxGeometry args={[0.09, 0.1, 0.09]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.35} metalness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export function ArtRackModel({
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
      ? "#fda4af"
      : "#000000";
  const highlightIntensity = isSelected ? 0.28 : isHovered && editMode ? 0.14 : 0;

  return (
    <group
      position={[wx, 0, wz]}
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
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld, 0.96, depthWorld]} />
          <meshStandardMaterial
            color="#2d1b24"
            roughness={0.68}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {[
          { y: 0.18, tone: "#38bdf8", label: "A1" },
          { y: 0.48, tone: "#f59e0b", label: "B2" },
          { y: 0.78, tone: "#fb7185", label: "C3" },
        ].map((shelf) => (
          <group key={shelf.label} position={[0, shelf.y, depthWorld / 2 + 0.012]}>
            <mesh>
              <boxGeometry args={[widthWorld * 0.86, 0.18, 0.02]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
            <Text
              position={[0, 0, 0.015]}
              fontSize={0.04}
              color={shelf.tone}
              anchorX="center"
              anchorY="middle"
            >
              {shelf.label}
            </Text>
          </group>
        ))}
      </group>
    </group>
  );
}

export function SpeakerModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  // Tall floor-standing PA/hi-fi speaker
  // Footprint is a 20x20 square; we build a ~1.5m-tall cabinet with two drivers + a tweeter.
  const cabinetHeight = 1.45;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* Rubber base pad */}
        <mesh position={[0, 0.015, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 1.04, 0.03, depthWorld * 1.04]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.03} />
        </mesh>

        {/* Main cabinet (dark wood/composite) */}
        <mesh position={[0, cabinetHeight / 2 + 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.96, cabinetHeight, depthWorld * 0.96]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.7}
            metalness={0.25}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Subtle side bevel (slimmer strip on each side) */}
        <mesh position={[-widthWorld * 0.475, cabinetHeight / 2 + 0.03, 0]}>
          <boxGeometry args={[0.005, cabinetHeight * 0.96, depthWorld * 0.9]} />
          <meshStandardMaterial color="#020617" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[widthWorld * 0.475, cabinetHeight / 2 + 0.03, 0]}>
          <boxGeometry args={[0.005, cabinetHeight * 0.96, depthWorld * 0.9]} />
          <meshStandardMaterial color="#020617" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Front grille panel (slightly recessed) */}
        <mesh position={[0, cabinetHeight / 2 + 0.03, -depthWorld * 0.47]}>
          <boxGeometry args={[widthWorld * 0.88, cabinetHeight * 0.94, 0.01]} />
          <meshStandardMaterial color="#1f2937" roughness={0.85} metalness={0.1} />
        </mesh>

        {/* ===== Tweeter (small, top) ===== */}
        <mesh position={[0, cabinetHeight * 0.88, -depthWorld * 0.48]}>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 24]} />
          <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Tweeter dome */}
        <mesh position={[0, cabinetHeight * 0.88, -depthWorld * 0.49]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.035, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.9} />
        </mesh>

        {/* ===== Midrange driver (medium, upper-middle) ===== */}
        <mesh position={[0, cabinetHeight * 0.62, -depthWorld * 0.48]}>
          <cylinderGeometry args={[0.12, 0.12, 0.02, 28]} />
          <meshStandardMaterial color="#0b0f14" roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Midrange cone (recessed, conical look) */}
        <mesh position={[0, cabinetHeight * 0.62, -depthWorld * 0.475]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.04, 28, 1, true]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>
        {/* Midrange dust cap (center) */}
        <mesh position={[0, cabinetHeight * 0.62, -depthWorld * 0.49]}>
          <sphereGeometry args={[0.024, 14, 10]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* ===== Woofer (big driver, lower-middle) ===== */}
        <mesh position={[0, cabinetHeight * 0.3, -depthWorld * 0.48]}>
          <cylinderGeometry args={[0.19, 0.19, 0.02, 32]} />
          <meshStandardMaterial color="#050709" roughness={0.7} metalness={0.25} />
        </mesh>
        {/* Woofer surround (rubber ring) */}
        <mesh position={[0, cabinetHeight * 0.3, -depthWorld * 0.486]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.018, 10, 40]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.92} metalness={0.05} />
        </mesh>
        {/* Woofer cone */}
        <mesh position={[0, cabinetHeight * 0.3, -depthWorld * 0.478]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.05, 32, 1, true]} />
          <meshStandardMaterial color="#111827" roughness={0.75} metalness={0.15} side={THREE.DoubleSide} />
        </mesh>
        {/* Woofer dust cap */}
        <mesh position={[0, cabinetHeight * 0.3, -depthWorld * 0.495]}>
          <sphereGeometry args={[0.04, 16, 12]} />
          <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* ===== Bass port (circular hole below woofer) ===== */}
        <mesh position={[0, cabinetHeight * 0.08, -depthWorld * 0.48]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 20]} />
          <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.05} />
        </mesh>

        {/* Brand plate (chrome strip near bottom of grille) */}
        <mesh position={[0, cabinetHeight * 0.03 + 0.03, -depthWorld * 0.482]}>
          <boxGeometry args={[widthWorld * 0.38, 0.04, 0.005]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
        </mesh>

        {/* LED power indicator */}
        <mesh position={[widthWorld * 0.32, cabinetHeight * 0.96, -depthWorld * 0.48]}>
          <sphereGeometry args={[0.012, 12, 8]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>

        {/* Top bevel cap (slightly lighter strip at top to suggest rounded corner) */}
        <mesh position={[0, cabinetHeight + 0.02, 0]}>
          <boxGeometry args={[widthWorld * 0.95, 0.01, depthWorld * 0.95]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
        </mesh>

        {/* Rear binding posts (small chrome nubs) */}
        {([-0.08, 0.08] as const).map((bx, i) => (
          <mesh key={`bp_${i}`} position={[widthWorld * bx, cabinetHeight * 0.18, depthWorld * 0.48]}>
            <cylinderGeometry args={[0.012, 0.012, 0.02, 12]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
          </mesh>
        ))}

        {/* Four small rubber feet */}
        {([-0.4, 0.4] as const).map((fx) =>
          ([-0.4, 0.4] as const).map((fz) => (
            <mesh key={`sf_${fx}_${fz}`} position={[widthWorld * fx, 0.02, depthWorld * fz]}>
              <cylinderGeometry args={[0.022, 0.025, 0.015, 12]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.02} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

export function SquatRackModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  // Squat rack / power rack:
  // - Two tall uprights at the rear (-X side), one on each Z end (spaced across Z)
  // - Barbell resting in J-cups running along Z
  // - Safety pins lower, spotter arms forward, weight storage pegs on the rear posts
  // - User stands on +X side
  const uprightHeight = 1.35;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* ===== Floor base mat (rubber tile) ===== */}
        <mesh position={[0, 0.005, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.01, depthWorld * 0.98]} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} metalness={0.05} />
        </mesh>
        {/* Checkerboard accent tile (inner square, slightly lighter) */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[widthWorld * 0.72, 0.004, depthWorld * 0.72]} />
          <meshStandardMaterial color="#334155" roughness={0.92} metalness={0.06} />
        </mesh>

        {/* ===== Steel frame base (H-shape on floor connecting uprights) ===== */}
        {/* Rear base beam (across Z, under uprights) */}
        <mesh position={[-widthWorld * 0.32, 0.07, 0]} castShadow>
          <boxGeometry args={[0.14, 0.1, depthWorld * 0.84]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.55} metalness={0.45} />
        </mesh>
        {/* Front stabilizer feet extending forward from each upright */}
        {([-0.4, 0.4] as const).map((zSide, i) => (
          <mesh
            key={`sbase_${i}`}
            position={[-widthWorld * 0.05, 0.07, depthWorld * zSide]}
            castShadow
          >
            <boxGeometry args={[widthWorld * 0.68, 0.1, 0.14]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.55} metalness={0.45} />
          </mesh>
        ))}

        {/* ===== Rear uprights (two tall black powder-coated posts) ===== */}
        {([-0.4, 0.4] as const).map((zSide, i) => (
          <mesh
            key={`up_${i}`}
            position={[-widthWorld * 0.32, uprightHeight / 2 + 0.1, depthWorld * zSide]}
            castShadow
          >
            <boxGeometry args={[0.14, uprightHeight, 0.14]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.55}
              metalness={0.55}
              emissive={highlightColor}
              emissiveIntensity={highlightIntensity}
            />
          </mesh>
        ))}
        {/* Numbered hole pattern along the uprights (visual) */}
        {([-0.4, 0.4] as const).map((zSide, iZ) =>
          Array.from({ length: 7 }).map((_, i) => (
            <mesh
              key={`hole_${iZ}_${i}`}
              position={[-widthWorld * 0.25, 0.25 + i * 0.16, depthWorld * zSide]}
            >
              <cylinderGeometry args={[0.014, 0.014, 0.04, 10]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.6} metalness={0.5} />
            </mesh>
          ))
        )}

        {/* ===== Top crossmember (connects the two uprights across Z) ===== */}
        <mesh
          position={[-widthWorld * 0.32, uprightHeight + 0.08, 0]}
          castShadow
        >
          <boxGeometry args={[0.14, 0.14, depthWorld * 0.84]} />
          <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.55} />
        </mesh>
        {/* Pull-up bar (chrome, across Z, slightly above the crossmember) */}
        <mesh
          position={[-widthWorld * 0.28, uprightHeight + 0.15, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.028, 0.028, depthWorld * 0.86, 20]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
        </mesh>
        {/* Knurling stripes on pull-up bar */}
        {([-0.3, -0.1, 0.1, 0.3] as const).map((pz, i) => (
          <mesh
            key={`puk_${i}`}
            position={[-widthWorld * 0.28, uprightHeight + 0.15, depthWorld * pz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.031, 0.031, 0.03, 18]} />
            <meshStandardMaterial color={STEEL} roughness={0.55} metalness={0.7} />
          </mesh>
        ))}

        {/* ===== J-cups (barbell catches, chrome L-shaped) ===== */}
        {([-0.4, 0.4] as const).map((zSide, i) => (
          <group key={`jcup_${i}`} position={[-widthWorld * 0.25, 0.82, depthWorld * zSide]}>
            {/* Horizontal arm */}
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.05, 0.09]} />
              <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
            </mesh>
            {/* Up-curve lip */}
            <mesh position={[0.08, 0.05, 0]}>
              <boxGeometry args={[0.03, 0.12, 0.09]} />
              <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
            </mesh>
          </group>
        ))}

        {/* ===== Spotter arms (forward-projecting safety catchers) ===== */}
        {([-0.4, 0.4] as const).map((zSide, i) => (
          <group key={`spotter_${i}`}>
            {/* Main horizontal spotter bar extending forward from upright */}
            <mesh position={[widthWorld * 0.02, 0.55, depthWorld * zSide]} castShadow>
              <boxGeometry args={[widthWorld * 0.62, 0.06, 0.08]} />
              <meshStandardMaterial color={ACCENT_AMBER} roughness={0.45} metalness={0.35} />
            </mesh>
            {/* Rubber catch pad on top of spotter (black) */}
            <mesh position={[widthWorld * 0.02, 0.585, depthWorld * zSide]}>
              <boxGeometry args={[widthWorld * 0.6, 0.015, 0.09]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.02} />
            </mesh>
            {/* Mount block where it pins into the upright (on rear) */}
            <mesh position={[-widthWorld * 0.3, 0.55, depthWorld * zSide]} castShadow>
              <boxGeometry args={[0.14, 0.12, 0.12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.5} />
            </mesh>
            {/* Locking pin (small cylinder through mount) */}
            <mesh
              position={[-widthWorld * 0.26, 0.55, depthWorld * zSide]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.015, 0.015, 0.16, 12]} />
              <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.7} />
            </mesh>
          </group>
        ))}

        {/* ===== Safety pins (below spotter arms for pin-safety on heavy squats) ===== */}
        <mesh
          position={[-widthWorld * 0.2, 0.4, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.026, 0.026, depthWorld * 0.8, 14]} />
          <meshStandardMaterial color={ACCENT_AMBER} roughness={0.55} metalness={0.2} />
        </mesh>

        {/* ===== Barbell resting in J-cups (long along Z) ===== */}
        {/* Bar shaft (chrome) */}
        <mesh
          position={[-widthWorld * 0.22, 0.88, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.022, depthWorld * 1.08, 20]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.95} />
        </mesh>
        {/* Knurl zones on bar (rough bands) */}
        {([-0.12, 0.12] as const).map((kz, i) => (
          <mesh
            key={`bk_${i}`}
            position={[-widthWorld * 0.22, 0.88, depthWorld * kz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.024, 0.024, depthWorld * 0.12, 18]} />
            <meshStandardMaterial color={STEEL} roughness={0.65} metalness={0.75} />
          </mesh>
        ))}
        {/* Sleeve collars (thicker bar ends where plates load) */}
        {([-0.48, 0.48] as const).map((cz, i) => (
          <mesh
            key={`sl_${i}`}
            position={[-widthWorld * 0.22, 0.88, depthWorld * cz]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.036, 0.036, depthWorld * 0.18, 18]} />
            <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.9} />
          </mesh>
        ))}
        {/* ===== Plates loaded on each side (IPF colors) =====
            Order (largest→smallest from bar center outward):
            25kg red (innermost, against collar) → 20kg blue (outer) → chrome clip */}
        {([-1, 1] as const).map((side, i) => (
          <group key={`plates_${i}`}>
            {/* 25kg red (innermost — closest to bar center) */}
            <mesh
              position={[-widthWorld * 0.22, 0.88, depthWorld * side * 0.48]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.22, 0.22, 0.04, 28]} />
              <meshStandardMaterial color={PLATE_COLORS.p25} roughness={0.4} metalness={0.25} />
            </mesh>
            {/* 20kg blue (outer) */}
            <mesh
              position={[-widthWorld * 0.22, 0.88, depthWorld * side * 0.54]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.2, 0.2, 0.036, 28]} />
              <meshStandardMaterial color={PLATE_COLORS.p20} roughness={0.4} metalness={0.25} />
            </mesh>
            {/* Chrome clip collar (outermost) */}
            <mesh
              position={[-widthWorld * 0.22, 0.88, depthWorld * side * 0.59]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.05, 0.05, 0.025, 18]} />
              <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* ===== Weight-storage pegs on rear uprights (spare plates) ===== */}
        {([-0.4, 0.4] as const).map((zSide, iZ) =>
          ([0.3, 0.55] as const).map((yPos, iY) => (
            <group key={`peg_${iZ}_${iY}`}>
              {/* Peg */}
              <mesh
                position={[-widthWorld * 0.42, yPos, depthWorld * zSide]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.025, 0.025, 0.18, 16]} />
                <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.75} />
              </mesh>
              {/* Stored plate on peg (green 10kg if lower, yellow 15kg if upper, alternating by Z) */}
              <mesh
                position={[-widthWorld * 0.5, yPos, depthWorld * zSide]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.16, 0.16, 0.03, 24]} />
                <meshStandardMaterial
                  color={
                    iY === 0 && zSide > 0
                      ? PLATE_COLORS.p10
                      : iY === 0
                        ? PLATE_COLORS.p15
                        : iY === 1 && zSide > 0
                          ? PLATE_COLORS.p5
                          : PLATE_COLORS.p2
                  }
                  roughness={0.45}
                  metalness={0.2}
                />
              </mesh>
            </group>
          ))
        )}

        {/* ===== Brand decal plate near top of rack (cyan emissive logo) ===== */}
        <mesh position={[-widthWorld * 0.25, uprightHeight + 0.01, 0]}>
          <boxGeometry args={[0.005, 0.08, depthWorld * 0.3]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.85} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function DeadliftPlatformModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  // Classic lifting platform:
  // - Footprint 150x80 (LONG along X, short along Z)
  // - The wooden lifting zone is the CENTER strip (along the long X axis)
  // - Rubber drop zones are on the two SHORT sides (±Z)
  // - The loaded Olympic bar lies ALONG the platform's long axis (X),
  //   with plates stacked on each END hanging over the rubber drop zones
  // - Plates ordered largest→smallest from bar center outward: 25, 25, 20, 15
  // - Chalk bowl off to one side for flavor

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* ===== Platform slab (sits flush on floor) ===== */}
        {/* Outer rubber frame (black) */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.995, 0.04, depthWorld * 0.995]} />
          <meshStandardMaterial
            color="#0b0f14"
            roughness={0.95}
            metalness={0.05}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* Rubber drop zone — far Z end (+Z side, plate-drop zone) */}
        <mesh position={[0, 0.045, depthWorld * 0.34]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.95, 0.015, depthWorld * 0.3]} />
          <meshStandardMaterial color="#111827" roughness={0.95} metalness={0.05} />
        </mesh>
        {/* Rubber drop zone — near Z end (-Z side) */}
        <mesh position={[0, 0.045, -depthWorld * 0.34]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.95, 0.015, depthWorld * 0.3]} />
          <meshStandardMaterial color="#111827" roughness={0.95} metalness={0.05} />
        </mesh>

        {/* Rubber texture dots on the drop zones (suggesting tile grain) */}
        {([
          [-0.35, 0.34], [-0.2, 0.34], [-0.05, 0.34], [0.1, 0.34], [0.25, 0.34], [0.4, 0.34],
          [-0.35, -0.34], [-0.2, -0.34], [-0.05, -0.34], [0.1, -0.34], [0.25, -0.34], [0.4, -0.34],
        ] as const).map(([tx, tz], i) => (
          <mesh key={`rdot_${i}`} position={[widthWorld * tx, 0.055, depthWorld * tz]}>
            <cylinderGeometry args={[0.025, 0.025, 0.002, 10]} />
            <meshStandardMaterial color="#1f2937" roughness={0.9} metalness={0.05} />
          </mesh>
        ))}

        {/* Center WOODEN lifting strip (LONG along X, planks run perpendicular) */}
        {Array.from({ length: 7 }).map((_, i) => {
          const xOffset = -0.4 + (i * 0.8) / 6;
          return (
            <mesh
              key={`plank_${i}`}
              position={[widthWorld * xOffset, 0.048, 0]}
              receiveShadow
            >
              <boxGeometry args={[widthWorld * 0.12, 0.02, depthWorld * 0.36]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#a16a3f" : "#92582f"}
                roughness={0.85}
                metalness={0.03}
              />
            </mesh>
          );
        })}
        {/* Center chalk stripe (down the wooden stage, marks bar start line) */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[widthWorld * 0.85, 0.002, 0.008]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} metalness={0.02} />
        </mesh>

        {/* Silver trim strips dividing wood from rubber drop zones (along X) */}
        <mesh position={[0, 0.06, depthWorld * 0.175]}>
          <boxGeometry args={[widthWorld * 0.92, 0.01, 0.01]} />
          <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.06, -depthWorld * 0.175]}>
          <boxGeometry args={[widthWorld * 0.92, 0.01, 0.01]} />
          <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
        </mesh>

        {/* ===== Loaded Olympic barbell (axis along X — the platform's LONG axis) ===== */}
        {/* Bar shaft — shorter, stays centered on the platform */}
        <mesh
          position={[0, 0.26, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.024, 0.024, widthWorld * 0.7, 22]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.95} />
        </mesh>
        {/* Knurl bands — 2 inner knurls along the shaft */}
        {([-0.08, 0.08] as const).map((kx, i) => (
          <mesh
            key={`dk_${i}`}
            position={[widthWorld * kx, 0.26, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.026, 0.026, widthWorld * 0.06, 18]} />
            <meshStandardMaterial color={STEEL} roughness={0.65} metalness={0.7} />
          </mesh>
        ))}
        {/* Sleeves (thicker ends where plates load) */}
        {([-0.28, 0.28] as const).map((cx, i) => (
          <mesh
            key={`dsl_${i}`}
            position={[widthWorld * cx, 0.26, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.04, 0.04, widthWorld * 0.14, 18]} />
            <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.9} />
          </mesh>
        ))}
        {/* ===== Plates loaded heavy on each END of the bar — packed tightly =====
            Order from bar CENTER outward (largest → smallest):
            25kg red (innermost, against sleeve) → 25kg red → 20kg blue → 15kg yellow (outer) */}
        {([-1, 1] as const).map((side, i) => (
          <group key={`dp_${i}`}>
            {/* 25kg red (innermost, against sleeve) */}
            <mesh
              position={[widthWorld * side * 0.24, 0.26, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.24, 0.24, 0.045, 32]} />
              <meshStandardMaterial color={PLATE_COLORS.p25} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* second 25 red */}
            <mesh
              position={[widthWorld * side * 0.275, 0.26, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.24, 0.24, 0.045, 32]} />
              <meshStandardMaterial color={PLATE_COLORS.p25} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* 20 blue */}
            <mesh
              position={[widthWorld * side * 0.31, 0.26, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.21, 0.21, 0.04, 30]} />
              <meshStandardMaterial color={PLATE_COLORS.p20} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* 15 yellow (outermost plate) */}
            <mesh
              position={[widthWorld * side * 0.34, 0.26, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.19, 0.19, 0.036, 30]} />
              <meshStandardMaterial color={PLATE_COLORS.p15} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* Chrome spring collar (outboard of plates) */}
            <mesh
              position={[widthWorld * side * 0.37, 0.26, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.055, 0.055, 0.03, 20]} />
              <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* ===== Chalk bowl (off-platform, corner of the wood strip) ===== */}
        <mesh position={[widthWorld * 0.45, 0.12, -depthWorld * 0.06]} castShadow>
          <cylinderGeometry args={[0.1, 0.075, 0.12, 20]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Chalk inside (white powder) */}
        <mesh position={[widthWorld * 0.45, 0.18, -depthWorld * 0.06]}>
          <cylinderGeometry args={[0.08, 0.08, 0.01, 20]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.95} metalness={0.02} />
        </mesh>

        {/* Small "DEADLIFT" brand plaque (cyan LED strip) on opposite corner */}
        <mesh position={[-widthWorld * 0.45, 0.065, depthWorld * 0.06]}>
          <boxGeometry args={[0.12, 0.01, 0.02]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>

        {/* Anti-slip chalk dust patches on wood */}
        {([
          [-0.2, 0.05],
          [0.12, -0.08],
          [-0.04, 0.09],
        ] as const).map(([px, pz], i) => (
          <mesh key={`chalk_${i}`} position={[widthWorld * px, 0.062, depthWorld * pz]}>
            <circleGeometry args={[0.035, 12]} />
            <meshStandardMaterial color="#f8fafc" opacity={0.3} transparent roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function PlateRackModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  // Compact gym plate tree / rack:
  // - A steel A-base / triangular footprint
  // - One vertical post
  // - 6 horizontal pegs radiating forward, each loaded with IPF-colored plates
  //   sorted largest→smallest from center outward on each peg
  // - The pegs pair up in 3 tiers: bottom 25kg pair, middle 20kg pair, top 15kg/10kg/5kg set

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* ===== Triangular steel base (A-frame foot) ===== */}
        <mesh position={[-widthWorld * 0.3, 0.05, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.28, 0.08, depthWorld * 0.9]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
        </mesh>
        {/* Forward bracing feet along Z (two stabilizer bars) */}
        {([-0.38, 0.38] as const).map((zSide, i) => (
          <mesh
            key={`fbase_${i}`}
            position={[0, 0.05, depthWorld * zSide]}
            castShadow
          >
            <boxGeometry args={[widthWorld * 0.75, 0.08, 0.1]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.55} />
          </mesh>
        ))}
        {/* Rubber feet caps */}
        {([
          [-0.42, -0.42],
          [-0.42, 0.42],
          [0.32, -0.42],
          [0.32, 0.42],
        ] as const).map(([fx, fz], i) => (
          <mesh key={`pfoot_${i}`} position={[widthWorld * fx, 0.015, depthWorld * fz]}>
            <boxGeometry args={[0.08, 0.03, 0.08]} />
            <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.03} />
          </mesh>
        ))}

        {/* ===== Vertical post (black powder-coated) ===== */}
        <mesh position={[-widthWorld * 0.32, 0.75, 0]} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.1]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.55}
            metalness={0.55}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>

        {/* ===== 3 tiers of pegs holding plates ===== */}
        {/* Tier 1 (bottom): 25kg red plates — one peg on each Z side */}
        {([-0.3, 0.3] as const).map((zSide, i) => (
          <group key={`tier1_${i}`}>
            {/* Peg (horizontal, points +X from post) */}
            <mesh
              position={[-widthWorld * 0.1, 0.35, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.025, 0.025, widthWorld * 0.5, 16]} />
              <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.75} />
            </mesh>
            {/* Plates (largest→smallest from inside→outside) */}
            {[0, 1, 2].map((p) => (
              <mesh
                key={`t1_p_${i}_${p}`}
                position={[widthWorld * (0.05 + p * 0.04), 0.35, depthWorld * zSide]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.22 - p * 0.01, 0.22 - p * 0.01, 0.035, 26]} />
                <meshStandardMaterial color={PLATE_COLORS.p25} roughness={0.42} metalness={0.22} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Tier 2 (middle): 20kg blue + 15kg yellow */}
        {([-0.3, 0.3] as const).map((zSide, i) => (
          <group key={`tier2_${i}`}>
            <mesh
              position={[-widthWorld * 0.1, 0.78, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.024, 0.024, widthWorld * 0.5, 16]} />
              <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.75} />
            </mesh>
            {/* 20kg blue (innermost) */}
            <mesh
              position={[widthWorld * 0.05, 0.78, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.2, 0.2, 0.033, 26]} />
              <meshStandardMaterial color={PLATE_COLORS.p20} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* 15kg yellow (next) */}
            <mesh
              position={[widthWorld * 0.1, 0.78, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.18, 0.18, 0.03, 26]} />
              <meshStandardMaterial color={PLATE_COLORS.p15} roughness={0.42} metalness={0.22} />
            </mesh>
          </group>
        ))}

        {/* Tier 3 (top): 10kg green + 5kg white + 2.5kg black */}
        {([-0.3, 0.3] as const).map((zSide, i) => (
          <group key={`tier3_${i}`}>
            <mesh
              position={[-widthWorld * 0.1, 1.21, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.022, 0.022, widthWorld * 0.5, 16]} />
              <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.75} />
            </mesh>
            {/* 10kg green */}
            <mesh
              position={[widthWorld * 0.05, 1.21, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.15, 0.15, 0.028, 24]} />
              <meshStandardMaterial color={PLATE_COLORS.p10} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* 5kg white */}
            <mesh
              position={[widthWorld * 0.095, 1.21, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
              <meshStandardMaterial color={PLATE_COLORS.p5} roughness={0.42} metalness={0.22} />
            </mesh>
            {/* 2.5kg black */}
            <mesh
              position={[widthWorld * 0.125, 1.21, depthWorld * zSide]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.09, 0.09, 0.015, 20]} />
              <meshStandardMaterial color={PLATE_COLORS.p2} roughness={0.42} metalness={0.22} />
            </mesh>
          </group>
        ))}

        {/* Brand LED badge on top of post */}
        <mesh position={[-widthWorld * 0.26, 1.45, 0]}>
          <boxGeometry args={[0.005, 0.08, 0.2]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.85} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function CableCrossoverModel({
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
      ? "#60a5fa"
      : "#000000";
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.22 : 0;

  // Cable Crossover / Functional Trainer:
  // - Two tall towers (left and right) connected at the top with a horizontal crossbar
  // - Weight stacks at the base of each tower (stacked black plates with a yellow selector pin)
  // - Cable pulleys at the top of each tower, with cables running down to D-handles
  // - Steel base plates, rubber feet
  // - Two users can work out simultaneously, one at each tower

  const towerHeight = 1.5;

  return (
    <group
      position={[wx, 0, wz]}
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
        {/* ===== Floor rubber mat ===== */}
        <mesh position={[0, 0.005, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.01, depthWorld * 0.98]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.97} metalness={0.03} />
        </mesh>
        {/* Accent inner tile */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[widthWorld * 0.78, 0.004, depthWorld * 0.78]} />
          <meshStandardMaterial color="#1e293b" roughness={0.92} metalness={0.06} />
        </mesh>

        {/* ===== Base connector beam spanning both towers along X ===== */}
        <mesh position={[0, 0.07, 0]} castShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.12, 0.18]} />
          <meshStandardMaterial color={GUNMETAL} roughness={0.55} metalness={0.5} />
        </mesh>
        {/* Rubber feet under each tower base */}
        {([-0.4, 0.4] as const).map((fx, i) =>
          ([-0.4, 0.4] as const).map((fz, j) => (
            <mesh key={`cf_${i}_${j}`} position={[widthWorld * fx, 0.02, depthWorld * fz]}>
              <boxGeometry args={[0.09, 0.04, 0.09]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.03} />
            </mesh>
          )),
        )}

        {/* ===== Two tall uprights (towers) — left and right ===== */}
        {([-0.4, 0.4] as const).map((xSide, i) => (
          <group key={`tower_${i}`}>
            {/* Main upright column */}
            <mesh
              position={[widthWorld * xSide, towerHeight / 2 + 0.1, 0]}
              castShadow
            >
              <boxGeometry args={[0.16, towerHeight, 0.16]} />
              <meshStandardMaterial
                color="#0f172a"
                roughness={0.55}
                metalness={0.55}
                emissive={highlightColor}
                emissiveIntensity={highlightIntensity}
              />
            </mesh>
            {/* Vertical accent stripe (cyan) running up the front of tower */}
            <mesh
              position={[widthWorld * xSide, towerHeight / 2 + 0.1, 0.085]}
            >
              <boxGeometry args={[0.03, towerHeight * 0.9, 0.002]} />
              <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.7} toneMapped={false} />
            </mesh>

            {/* Weight stack housing (black box in front of the tower, at the base) */}
            <mesh
              position={[widthWorld * xSide, 0.45, 0.18]}
              castShadow
            >
              <boxGeometry args={[0.16, 0.7, 0.16]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.5} metalness={0.6} />
            </mesh>
            {/* Stacked weight plates visible through the housing (6 flat black plates) */}
            {Array.from({ length: 6 }).map((_, k) => (
              <mesh
                key={`ws_${i}_${k}`}
                position={[widthWorld * xSide, 0.18 + k * 0.085, 0.18]}
              >
                <boxGeometry args={[0.13, 0.06, 0.13]} />
                <meshStandardMaterial color="#111827" roughness={0.48} metalness={0.55} />
              </mesh>
            ))}
            {/* Yellow weight-selector pin (sticking out of the 3rd plate) */}
            <mesh
              position={[widthWorld * xSide + 0.1, 0.31, 0.18]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
              <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.4} roughness={0.35} />
            </mesh>
            {/* Silver guide rods flanking the weight stack */}
            {([-0.07, 0.07] as const).map((grOff, k) => (
              <mesh
                key={`gr_${i}_${k}`}
                position={[widthWorld * xSide + grOff, 0.45, 0.18]}
              >
                <cylinderGeometry args={[0.008, 0.008, 0.66, 10]} />
                <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.88} />
              </mesh>
            ))}

            {/* Top pulley wheel at the top of each tower */}
            <mesh
              position={[widthWorld * xSide, towerHeight + 0.02, 0.11]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
              <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.9} />
            </mesh>
            {/* Pulley housing bracket */}
            <mesh
              position={[widthWorld * xSide, towerHeight + 0.02, 0.11]}
            >
              <boxGeometry args={[0.12, 0.12, 0.1]} />
              <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.5} />
            </mesh>

            {/* Black cable dropping from pulley down to D-handle height */}
            <mesh
              position={[widthWorld * xSide, 0.95, 0.2]}
            >
              <cylinderGeometry args={[0.006, 0.006, 1.1, 10]} />
              <meshStandardMaterial color="#0b1220" roughness={0.7} metalness={0.1} />
            </mesh>
            {/* Adjustable height peg (moveable pulley carriage marker) */}
            <mesh
              position={[widthWorld * xSide + 0.085, 0.8, 0]}
            >
              <boxGeometry args={[0.04, 0.06, 0.05]} />
              <meshStandardMaterial color={ACCENT_AMBER} roughness={0.4} metalness={0.35} />
            </mesh>

            {/* D-handle (rubber grip hanging at the end of the cable) */}
            <group position={[widthWorld * xSide, 0.42, 0.2]}>
              {/* Metal swivel ring at top of handle */}
              <mesh>
                <torusGeometry args={[0.025, 0.008, 8, 18]} />
                <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
              </mesh>
              {/* D-shaped grip bar (below ring) */}
              <mesh position={[0, -0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.04, 0.014, 10, 20, Math.PI]} />
                <meshStandardMaterial color={RUBBER_BLACK} roughness={0.9} metalness={0.05} />
              </mesh>
            </group>

            {/* Tower-height tick marks (visual slot markers along the front) */}
            {[0.4, 0.6, 0.8, 1.0, 1.2].map((yOff, k) => (
              <mesh
                key={`tick_${i}_${k}`}
                position={[widthWorld * xSide - 0.085, yOff, 0]}
              >
                <boxGeometry args={[0.005, 0.012, 0.06]} />
                <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.7} />
              </mesh>
            ))}
          </group>
        ))}

        {/* ===== Top horizontal crossbar connecting the two towers ===== */}
        <mesh
          position={[0, towerHeight + 0.12, 0]}
          castShadow
        >
          <boxGeometry args={[widthWorld * 0.86, 0.14, 0.14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.55} />
        </mesh>
        {/* Pull-up bar beneath the top crossbar (chrome) */}
        <mesh
          position={[0, towerHeight + 0.02, -0.08]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.028, 0.028, widthWorld * 0.82, 20]} />
          <meshStandardMaterial color={CHROME} roughness={0.22} metalness={0.92} />
        </mesh>
        {/* Knurled grip patches on pull-up bar */}
        {([-0.3, -0.1, 0.1, 0.3] as const).map((gx, i) => (
          <mesh
            key={`cbg_${i}`}
            position={[widthWorld * gx, towerHeight + 0.02, -0.08]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.031, 0.031, 0.04, 18]} />
            <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.7} />
          </mesh>
        ))}

        {/* Brand decal running across the top crossbar */}
        <mesh position={[0, towerHeight + 0.12, 0.08]}>
          <boxGeometry args={[widthWorld * 0.5, 0.08, 0.003]} />
          <meshStandardMaterial color={LED_CYAN} emissive={LED_CYAN} emissiveIntensity={0.85} toneMapped={false} />
        </mesh>

        {/* Info placard (tilted) between towers at mid-height */}
        <mesh position={[0, 1.05, 0]} rotation={[-0.15, 0, 0]}>
          <boxGeometry args={[0.22, 0.14, 0.01]} />
          <meshStandardMaterial color="#0b1220" roughness={0.4} metalness={0.55} />
        </mesh>
        <mesh position={[0, 1.05, 0.007]} rotation={[-0.15, 0, 0]}>
          <planeGeometry args={[0.18, 0.1]} />
          <meshStandardMaterial color={ACCENT_AMBER} emissive={ACCENT_AMBER} emissiveIntensity={0.3} roughness={0.4} />
        </mesh>

        {/* Chrome side-rails descending from top crossbar down toward mid-height (cable guides) */}
        {([-0.4, 0.4] as const).map((xSide, i) => (
          <mesh
            key={`cg_${i}`}
            position={[widthWorld * xSide + (xSide > 0 ? -0.01 : 0.01), towerHeight * 0.65, 0.11]}
            rotation={[0, 0, xSide > 0 ? 0.04 : -0.04]}
          >
            <cylinderGeometry args={[0.006, 0.006, 0.85, 10]} />
            <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
