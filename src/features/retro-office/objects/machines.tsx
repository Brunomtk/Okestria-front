import { Text } from "@react-three/drei";
import { memo, useMemo } from "react";
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

function AtmMachineModelInner({
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

function PhoneBoothModelInner({
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

function SmsBoothModelInner({
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

function ServerRackModelInner({
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

function ServerTerminalModelInner({
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

function QaTerminalModelInner({
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
        QA TEST CONSOLE — full workstation (footprint 54×38)
        Desk on 4 tapered legs with cable-management shelf, drawer pedestal and operator chair.
        Dual-monitor setup (primary curved QA dashboard + vertical log-tail), full mechanical
        keyboard with visible keys, precision mouse, CPU tower, status tower, webcam, desk
        lamp, headphones, coffee mug, notebook, small plant, and amber front badge.
      */}
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* === 4 tapered legs === */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`leg_${sx}_${sz}`}
              position={[widthWorld * 0.42 * sx, 0.24, depthWorld * 0.36 * sz]}
              castShadow
            >
              <boxGeometry args={[0.04, 0.48, 0.04]} />
              <meshStandardMaterial color="#1e1b4b" roughness={0.45} metalness={0.55} />
            </mesh>
          )),
        )}
        {/* Chrome foot caps */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`foot_${sx}_${sz}`}
              position={[widthWorld * 0.42 * sx, 0.015, depthWorld * 0.36 * sz]}
            >
              <boxGeometry args={[0.052, 0.03, 0.052]} />
              <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
            </mesh>
          )),
        )}

        {/* Cable-management tray underneath (back) */}
        <mesh position={[0, 0.12, -depthWorld * 0.25]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.8, 0.025, depthWorld * 0.25]} />
          <meshStandardMaterial color="#312e81" roughness={0.55} metalness={0.3} />
        </mesh>

        {/* === DRAWER PEDESTAL (under-desk left) === */}
        <group position={[-widthWorld * 0.32, 0.22, depthWorld * 0.02]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[widthWorld * 0.22, 0.4, depthWorld * 0.72]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.5} metalness={0.35} />
          </mesh>
          {/* Drawer fronts */}
          {[0.13, 0, -0.13].map((dy, i) => (
            <group key={`drawer-${i}`} position={[0, dy, depthWorld * 0.36]}>
              <mesh>
                <boxGeometry args={[widthWorld * 0.2, 0.11, 0.004]} />
                <meshStandardMaterial color="#2d2b6e" roughness={0.45} metalness={0.4} />
              </mesh>
              {/* Handle */}
              <mesh position={[0, 0, 0.005]}>
                <boxGeometry args={[widthWorld * 0.12, 0.015, 0.006]} />
                <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        {/* === DESKTOP SURFACE (thicker solid box, no planes) === */}
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.04, depthWorld * 0.92]} />
          <meshStandardMaterial
            color="#2d2b6e"
            roughness={0.3}
            metalness={0.5}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Chrome edge trims (front + back) — sit on top of desk, not inside it */}
        <mesh position={[0, 0.504, depthWorld * 0.452]}>
          <boxGeometry args={[widthWorld * 0.98, 0.008, 0.012]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
        </mesh>
        <mesh position={[0, 0.504, -depthWorld * 0.452]}>
          <boxGeometry args={[widthWorld * 0.98, 0.008, 0.012]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
        </mesh>

        {/* Under-desk RGB accent */}
        <mesh position={[0, 0.46, depthWorld * 0.44]}>
          <boxGeometry args={[widthWorld * 0.9, 0.004, 0.006]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={1.1}
          />
        </mesh>

        {/* === PRIMARY MONITOR (left — 27" curved QA dashboard) === */}
        <group position={[-widthWorld * 0.22, 0.5, -depthWorld * 0.18]}>
          {/* Monitor stand base */}
          <mesh position={[0, 0.018, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.012, 20]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.35} metalness={0.65} />
          </mesh>
          {/* Neck */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.022, 0.16, 0.03]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.35} metalness={0.65} />
          </mesh>
          {/* Bezel — slightly tilted toward user */}
          <mesh position={[0, 0.24, 0.01]} rotation={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[widthWorld * 0.42, 0.26, 0.022]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.4} metalness={0.45} />
          </mesh>
          {/* Screen body — emissive purple */}
          <mesh position={[0, 0.24, 0.023]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[widthWorld * 0.39, 0.23, 0.002]} />
            <meshStandardMaterial
              color="#7c3aed"
              emissive="#7c3aed"
              emissiveIntensity={1.15}
              roughness={0.3}
            />
          </mesh>
          {/* Dashboard header bar */}
          <mesh position={[0, 0.34, 0.025]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[widthWorld * 0.37, 0.018, 0.0015]} />
            <meshStandardMaterial
              color="#312e81"
              emissive="#312e81"
              emissiveIntensity={0.9}
            />
          </mesh>
          <Text
            position={[0, 0.342, 0.026]}
            rotation={[-0.12, 0, 0]}
            fontSize={0.013}
            color="#ecfeff"
            anchorX="center"
            anchorY="middle"
          >
            QA · BUILD #1287 · PASS
          </Text>
          {/* Test result grid (4x4) */}
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3].map((col) => {
              const isPass = !(row === 1 && col === 2);
              return (
                <mesh
                  key={`grid-${row}-${col}`}
                  position={[
                    -widthWorld * 0.14 + col * 0.03,
                    0.305 - row * 0.035,
                    0.026 - row * 0.004,
                  ]}
                  rotation={[-0.12, 0, 0]}
                >
                  <boxGeometry args={[0.022, 0.022, 0.0015]} />
                  <meshStandardMaterial
                    color={isPass ? "#22c55e" : "#ef4444"}
                    emissive={isPass ? "#22c55e" : "#ef4444"}
                    emissiveIntensity={1.05}
                  />
                </mesh>
              );
            }),
          )}
          {/* Right-side sparkline / metrics column */}
          {[0.29, 0.26, 0.23, 0.2, 0.17].map((yy, i) => (
            <mesh
              key={`spark-${i}`}
              position={[widthWorld * 0.12, yy, 0.025 - (0.295 - yy) * 0.12]}
              rotation={[-0.12, 0, 0]}
            >
              <boxGeometry args={[widthWorld * 0.08 * (0.45 + (i % 3) * 0.18), 0.012, 0.0015]} />
              <meshStandardMaterial
                color="#c4b5fd"
                emissive="#c4b5fd"
                emissiveIntensity={0.9}
              />
            </mesh>
          ))}
          {/* Brand badge on bezel bottom */}
          <Text
            position={[0, 0.115, 0.024]}
            rotation={[-0.12, 0, 0]}
            fontSize={0.014}
            color="#c4b5fd"
            anchorX="center"
            anchorY="middle"
          >
            QA DASH
          </Text>
          {/* Webcam clipped to top bezel */}
          <group position={[0, 0.375, 0.02]} rotation={[-0.12, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.06, 0.022, 0.024]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.014]}>
              <cylinderGeometry args={[0.008, 0.008, 0.004, 14]} />
              <meshStandardMaterial
                color={LED_CYAN}
                emissive={LED_CYAN}
                emissiveIntensity={0.9}
              />
            </mesh>
          </group>
        </group>

        {/* === SECONDARY MONITOR (right — vertical log tail) === */}
        <group position={[widthWorld * 0.22, 0.5, -depthWorld * 0.18]}>
          <mesh position={[0, 0.018, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.012, 20]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.35} metalness={0.65} />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.022, 0.16, 0.03]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.35} metalness={0.65} />
          </mesh>
          {/* Vertical portrait bezel */}
          <mesh position={[0, 0.25, 0.01]} rotation={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.3, 0.022]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.4} metalness={0.45} />
          </mesh>
          {/* Cyan log-stream screen (solid box instead of plane) */}
          <mesh position={[0, 0.25, 0.023]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[0.2, 0.27, 0.002]} />
            <meshStandardMaterial
              color="#0b1e2a"
              emissive="#22d3ee"
              emissiveIntensity={0.9}
              roughness={0.32}
            />
          </mesh>
          {/* Header bar */}
          <mesh position={[0, 0.37, 0.025]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[0.18, 0.015, 0.0015]} />
            <meshStandardMaterial
              color="#0369a1"
              emissive="#0369a1"
              emissiveIntensity={0.9}
            />
          </mesh>
          <Text
            position={[0, 0.37, 0.026]}
            rotation={[-0.12, 0, 0]}
            fontSize={0.011}
            color="#ecfeff"
            anchorX="center"
            anchorY="middle"
          >
            LOG · tail -f qa.log
          </Text>
          {/* Simulated log lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <mesh
              key={`log-${i}`}
              position={[0, 0.34 - i * 0.025, 0.026 - i * 0.002]}
              rotation={[-0.12, 0, 0]}
            >
              <boxGeometry args={[0.17 * (0.6 + ((i * 7) % 10) / 14), 0.01, 0.0012]} />
              <meshStandardMaterial
                color="#ecfeff"
                emissive="#ecfeff"
                emissiveIntensity={0.45}
                transparent
                opacity={i === 3 ? 1 : 0.6}
              />
            </mesh>
          ))}
        </group>

        {/* === KEYBOARD (low-profile mechanical with visible key grid) === */}
        <group position={[-widthWorld * 0.06, 0.506, depthWorld * 0.22]}>
          {/* Base */}
          <mesh castShadow>
            <boxGeometry args={[widthWorld * 0.5, 0.016, 0.12]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.55} metalness={0.3} />
          </mesh>
          {/* Inset */}
          <mesh position={[0, 0.009, 0]}>
            <boxGeometry args={[widthWorld * 0.48, 0.004, 0.105]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.55} metalness={0.25} />
          </mesh>
          {/* Key grid (4 rows × 14 columns) */}
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 14 }).map((__, col) => (
              <mesh
                key={`key-${row}-${col}`}
                position={[
                  -widthWorld * 0.22 + col * (widthWorld * 0.034),
                  0.014,
                  -0.038 + row * 0.025,
                ]}
                castShadow
              >
                <boxGeometry args={[widthWorld * 0.028, 0.006, 0.02]} />
                <meshStandardMaterial color="#1e1b4b" roughness={0.65} metalness={0.25} />
              </mesh>
            )),
          )}
          {/* Space bar */}
          <mesh position={[0, 0.014, 0.042]} castShadow>
            <boxGeometry args={[widthWorld * 0.2, 0.006, 0.02]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.65} metalness={0.25} />
          </mesh>
          {/* RGB underglow */}
          <mesh position={[0, 0.0, 0.065]}>
            <boxGeometry args={[widthWorld * 0.5, 0.003, 0.004]} />
            <meshStandardMaterial
              color="#a855f7"
              emissive="#a855f7"
              emissiveIntensity={1.3}
            />
          </mesh>
        </group>

        {/* === MOUSE PAD === */}
        <mesh position={[widthWorld * 0.24, 0.502, depthWorld * 0.22]}>
          <boxGeometry args={[0.15, 0.004, 0.12]} />
          <meshStandardMaterial color="#312e81" roughness={0.85} metalness={0.08} />
        </mesh>
        {/* Cyan edge glow on pad */}
        <mesh position={[widthWorld * 0.24, 0.504, depthWorld * 0.22]}>
          <boxGeometry args={[0.148, 0.001, 0.118]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.55}
            transparent
            opacity={0.45}
          />
        </mesh>
        {/* === MOUSE === */}
        <mesh
          position={[widthWorld * 0.24, 0.512, depthWorld * 0.22]}
          rotation={[0, 0.05, 0]}
          castShadow
        >
          <boxGeometry args={[0.052, 0.018, 0.08]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.55} metalness={0.3} />
        </mesh>
        {/* Scroll wheel */}
        <mesh
          position={[widthWorld * 0.24, 0.524, depthWorld * 0.22 - 0.012]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.006, 0.006, 0.018, 10]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
        </mesh>
        {/* Mouse RGB underglow */}
        <mesh position={[widthWorld * 0.24, 0.506, depthWorld * 0.22]}>
          <boxGeometry args={[0.045, 0.001, 0.076]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#a855f7"
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* === CPU TOWER (under-desk right corner) === */}
        <group position={[widthWorld * 0.36, 0.25, -depthWorld * 0.28]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.38, 0.18]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.45} metalness={0.5} />
          </mesh>
          {/* Tempered glass side panel */}
          <mesh position={[0.052, 0, 0]}>
            <boxGeometry args={[0.002, 0.34, 0.16]} />
            <meshStandardMaterial
              color="#0891b2"
              transparent
              opacity={0.18}
              emissive="#22d3ee"
              emissiveIntensity={0.25}
              metalness={0.6}
              roughness={0.15}
            />
          </mesh>
          {/* Internal RGB fans (3) */}
          {[-0.12, 0, 0.12].map((yy, idx) => (
            <mesh key={`fan-${idx}`} position={[0.04, yy, 0]} rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.008, 22]} />
              <meshStandardMaterial
                color={["#a855f7", "#22d3ee", "#22c55e"][idx]}
                emissive={["#a855f7", "#22d3ee", "#22c55e"][idx]}
                emissiveIntensity={0.9}
                transparent
                opacity={0.75}
              />
            </mesh>
          ))}
          {/* Front mesh grille (vertical stripes) */}
          {[0.14, 0.08, 0.02, -0.04, -0.1, -0.16].map((yy, idx) => (
            <mesh key={`mesh-${idx}`} position={[0, yy, 0.092]}>
              <boxGeometry args={[0.09, 0.008, 0.002]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
          {/* Power button + LED */}
          <mesh position={[0, 0.17, 0.093]}>
            <cylinderGeometry args={[0.008, 0.008, 0.002, 12]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.155, 0.093]}>
            <boxGeometry args={[0.004, 0.004, 0.001]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.4}
            />
          </mesh>
        </group>

        {/* === STATUS LED STACK (left corner — build status) === */}
        <group position={[-widthWorld * 0.42, 0.52, -depthWorld * 0.36]}>
          {/* Tower base */}
          <mesh position={[0, 0.01, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 0.018, 14]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Red/Amber/Green lights stacked */}
          {[
            { y: 0.04, color: "#ef4444" },
            { y: 0.08, color: "#f59e0b" },
            { y: 0.12, color: "#22c55e" },
          ].map((lamp, idx) => (
            <mesh key={`lamp-${idx}`} position={[0, lamp.y, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.028, 14]} />
              <meshStandardMaterial
                color={lamp.color}
                emissive={lamp.color}
                emissiveIntensity={idx === 2 ? 1.4 : 0.25}
                transparent
                opacity={0.9}
              />
            </mesh>
          ))}
          {/* Top cap */}
          <mesh position={[0, 0.145, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.006, 12]} />
            <meshStandardMaterial color={CHROME} roughness={0.25} metalness={0.9} />
          </mesh>
        </group>

        {/* === DESK LAMP (arch lamp, right-back) === */}
        <group position={[widthWorld * 0.34, 0.5, -depthWorld * 0.4]}>
          <mesh position={[0, 0.01, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.045, 0.02, 16]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.38} metalness={0.65} />
          </mesh>
          {/* Arch arm */}
          <mesh position={[-0.03, 0.13, 0]} rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.006, 0.006, 0.24, 10]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.42} metalness={0.55} />
          </mesh>
          {/* Shade */}
          <mesh position={[-0.09, 0.24, 0]} rotation={[0, 0, -0.7]}>
            <cylinderGeometry args={[0.02, 0.035, 0.06, 18]} />
            <meshStandardMaterial color={ACCENT_AMBER} roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Glow under shade */}
          <mesh position={[-0.09, 0.21, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.006, 18]} />
            <meshStandardMaterial
              color="#fcd34d"
              emissive="#fcd34d"
              emissiveIntensity={1.3}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>

        {/* === HEADPHONES (hanging on small stand) === */}
        <group position={[widthWorld * -0.4, 0.52, -depthWorld * 0.32]}>
          {/* Stand pole */}
          <mesh>
            <cylinderGeometry args={[0.006, 0.006, 0.18, 10]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Base */}
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.008, 16]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Headband (arc) */}
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.038, 0.006, 8, 18, Math.PI]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.45} metalness={0.35} />
          </mesh>
          {/* Earcups */}
          {([-0.038, 0.038] as const).map((sx, i) => (
            <mesh key={`cup-${i}`} position={[sx, 0.08, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.02, 16]} />
              <meshStandardMaterial color="#1e1b4b" roughness={0.5} metalness={0.3} />
            </mesh>
          ))}
          {/* Cup accent ring (cyan) */}
          {([-0.038, 0.038] as const).map((sx, i) => (
            <mesh key={`ring-${i}`} position={[sx, 0.092, 0]}>
              <torusGeometry args={[0.021, 0.0025, 8, 18]} />
              <meshStandardMaterial
                color={LED_CYAN}
                emissive={LED_CYAN}
                emissiveIntensity={1.1}
              />
            </mesh>
          ))}
        </group>

        {/* === COFFEE MUG === */}
        <group position={[widthWorld * 0.4, 0.53, depthWorld * 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.055, 18]} />
            <meshStandardMaterial color="#ede9fe" roughness={0.6} metalness={0.05} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.03, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <torusGeometry args={[0.016, 0.005, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#ede9fe" roughness={0.6} metalness={0.05} />
          </mesh>
          {/* QA print */}
          <mesh position={[0, 0, 0.029]}>
            <boxGeometry args={[0.025, 0.02, 0.001]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.5} />
          </mesh>
          {/* Coffee top */}
          <mesh position={[0, 0.028, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.002, 18]} />
            <meshStandardMaterial color="#3b2014" roughness={0.5} />
          </mesh>
          {/* Steam wisps */}
          {[0, 1, 2].map((i) => (
            <mesh
              key={`steam-${i}`}
              position={[(i - 1) * 0.01, 0.055 + i * 0.018, 0]}
            >
              <sphereGeometry args={[0.006 - i * 0.001, 8, 6]} />
              <meshStandardMaterial
                color="#f1f5f9"
                transparent
                opacity={0.35 - i * 0.08}
              />
            </mesh>
          ))}
        </group>

        {/* === NOTEBOOK + PEN === */}
        <group position={[-widthWorld * 0.38, 0.508, depthWorld * 0.3]} rotation={[0, 0.15, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.008, 0.07]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.65} metalness={0.15} />
          </mesh>
          {/* Spiral binding */}
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={`spiral-${i}`} position={[-0.048, 0.006, -0.028 + i * 0.01]}>
              <cylinderGeometry args={[0.003, 0.003, 0.014, 8]} />
              <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.9} />
            </mesh>
          ))}
          {/* Pen on top */}
          <mesh position={[0.015, 0.013, 0.005]} rotation={[0, 0.3, Math.PI / 2]}>
            <cylinderGeometry args={[0.004, 0.004, 0.08, 10]} />
            <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.9} />
          </mesh>
        </group>

        {/* === SMALL DESK PLANT (back-left corner) === */}
        <group position={[-widthWorld * 0.4, 0.5, -depthWorld * 0.1]}>
          {/* Pot */}
          <mesh>
            <cylinderGeometry args={[0.028, 0.022, 0.04, 14]} />
            <meshStandardMaterial color="#ede9fe" roughness={0.7} metalness={0.05} />
          </mesh>
          {/* Leaves (small sphere cluster) */}
          {[
            { x: 0, y: 0.05, z: 0 },
            { x: 0.015, y: 0.06, z: 0.005 },
            { x: -0.012, y: 0.057, z: -0.005 },
            { x: 0.005, y: 0.075, z: -0.01 },
          ].map((l, i) => (
            <mesh key={`leaf-${i}`} position={[l.x, l.y, l.z]}>
              <sphereGeometry args={[0.02, 10, 8]} />
              <meshStandardMaterial color="#16a34a" roughness={0.65} metalness={0.05} />
            </mesh>
          ))}
        </group>

        {/* === OPERATOR CHAIR (gaming chair, behind desk at +Z, facing monitors at -Z) === */}
        <group position={[0, 0, depthWorld * 0.82]} rotation={[0, Math.PI, 0]}>
          {/* 5-point base */}
          {[0, 72, 144, 216, 288].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <mesh
                key={`caster-${i}`}
                position={[Math.cos(rad) * 0.11, 0.015, Math.sin(rad) * 0.11]}
                rotation={[0, -rad, 0]}
                castShadow
              >
                <boxGeometry args={[0.1, 0.018, 0.02]} />
                <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.55} />
              </mesh>
            );
          })}
          {/* Gas lift */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.018, 0.3, 14]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Seat pan */}
          <mesh position={[0, 0.36, 0]} castShadow>
            <boxGeometry args={[0.28, 0.06, 0.28]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.55} metalness={0.2} />
          </mesh>
          {/* Seat cushion cyan stripes */}
          <mesh position={[0, 0.392, 0]}>
            <boxGeometry args={[0.25, 0.004, 0.25]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.6} metalness={0.15} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 0.56, -0.12]} rotation={[-0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.42, 0.06]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.55} metalness={0.2} />
          </mesh>
          {/* Backrest purple accent panel */}
          <mesh position={[0, 0.58, -0.087]} rotation={[-0.08, 0, 0]}>
            <boxGeometry args={[0.18, 0.38, 0.004]} />
            <meshStandardMaterial color="#7c3aed" roughness={0.6} metalness={0.15} />
          </mesh>
          {/* Cyan stripe on back */}
          <mesh position={[0, 0.72, -0.085]} rotation={[-0.08, 0, 0]}>
            <boxGeometry args={[0.2, 0.012, 0.003]} />
            <meshStandardMaterial
              color={LED_CYAN}
              emissive={LED_CYAN}
              emissiveIntensity={0.9}
            />
          </mesh>
          {/* Headrest pillow */}
          <mesh position={[0, 0.8, -0.08]} rotation={[-0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.07, 0.05]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.6} metalness={0.2} />
          </mesh>
          {/* Armrests */}
          {([-1, 1] as const).map((sx) => (
            <mesh
              key={`arm-${sx}`}
              position={[sx * 0.17, 0.46, 0.02]}
              castShadow
            >
              <boxGeometry args={[0.04, 0.04, 0.18]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.55} />
            </mesh>
          ))}
        </group>

        {/* === FRONT QA BADGE (amber LED strip at front edge) === */}
        <mesh position={[0, 0.455, depthWorld * 0.47]}>
          <boxGeometry args={[widthWorld * 0.3, 0.02, 0.008]} />
          <meshStandardMaterial
            color={ACCENT_AMBER}
            emissive={ACCENT_AMBER}
            emissiveIntensity={0.9}
            roughness={0.35}
            metalness={0.5}
          />
        </mesh>
        <Text
          position={[0, 0.455, depthWorld * 0.474]}
          fontSize={0.014}
          color="#0b0b1a"
          anchorX="center"
          anchorY="middle"
        >
          QA · OKESTRIA
        </Text>
      </group>
    </group>
  );
}

function DeviceRackModelInner({
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
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.2 : 0;

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
        DEVICE TEST RACK (footprint 70×36, ~1.3m tall server-style cabinet)
        Anodized black frame with perforated sides, 4 labeled shelves:
          bottom → laptops (2 silver machines running test suite)
          shelf2  → tablets (3 propped, mixed colors + dividers)
          shelf3  → smartphones (5 portrait + 2 landscape, per-shelf status LEDs)
          top    → wearables + IoT (4 watches, earbuds case, IoT hub)
        Front: glass door + chrome frame, handle, status-display panel, asset tag.
        Top: USB hub with cable loom, 2 vent fans, brand plate with cyan LED.
        Bottom: power cable coiling to wall plug.
      */}
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* === BASE PLATE with rubber feet === */}
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.06, depthWorld * 0.92]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.55} metalness={0.4} />
        </mesh>
        {([-0.44, 0.44] as const).map((sx) =>
          ([-0.4, 0.4] as const).map((sz) => (
            <mesh
              key={`foot-${sx}-${sz}`}
              position={[widthWorld * sx, 0.01, depthWorld * sz]}
            >
              <cylinderGeometry args={[0.018, 0.022, 0.02, 12]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.05} />
            </mesh>
          )),
        )}

        {/* === CABINET BODY === */}
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.96, 1.12, depthWorld * 0.9]} />
          <meshStandardMaterial
            color="#111827"
            roughness={0.45}
            metalness={0.55}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* Perforated side panels */}
        {[-1, 1].map((side) => (
          <group key={`perf-${side}`}>
            <mesh position={[widthWorld * 0.48 * side, 0.62, 0]}>
              <boxGeometry args={[0.006, 1.08, depthWorld * 0.86]} />
              <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.5} />
            </mesh>
            {Array.from({ length: 12 }).map((_, row) =>
              Array.from({ length: 3 }).map((__, col) => (
                <mesh
                  key={`hole-${side}-${row}-${col}`}
                  position={[
                    widthWorld * 0.482 * side,
                    0.14 + row * 0.08,
                    depthWorld * (-0.28 + col * 0.28),
                  ]}
                >
                  <boxGeometry args={[0.002, 0.03, 0.02]} />
                  <meshStandardMaterial color="#000000" />
                </mesh>
              )),
            )}
          </group>
        ))}
        {/* Top cap */}
        <mesh position={[0, 1.19, 0]}>
          <boxGeometry args={[widthWorld * 0.99, 0.02, depthWorld * 0.92]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.42} metalness={0.6} />
        </mesh>
        {/* Fan vents on top (2 exhaust fans) */}
        {([-0.18, 0.18] as const).map((sx, i) => (
          <group key={`fan-${i}`} position={[widthWorld * sx, 1.205, 0]}>
            <mesh>
              <cylinderGeometry args={[0.05, 0.05, 0.006, 20]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Fan blades (stylized cross) */}
            {[0, 60, 120].map((deg, j) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <mesh
                  key={`blade-${i}-${j}`}
                  position={[0, 0.005, 0]}
                  rotation={[0, rad, 0]}
                >
                  <boxGeometry args={[0.09, 0.002, 0.018]} />
                  <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.45} />
                </mesh>
              );
            })}
            {/* Hub */}
            <mesh position={[0, 0.008, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.006, 14]} />
              <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* === GLASS FRONT (semi-transparent with frame) === */}
        <mesh position={[0, 0.62, depthWorld * 0.452]}>
          <boxGeometry args={[widthWorld * 0.94, 1.1, 0.003]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.1}
            emissive="#22d3ee"
            emissiveIntensity={0.08}
            metalness={0.6}
            roughness={0.1}
          />
        </mesh>
        {/* Glass frame */}
        {[-0.48, 0.48].map((sx) => (
          <mesh key={`gframe-v-${sx}`} position={[widthWorld * sx, 0.62, depthWorld * 0.455]}>
            <boxGeometry args={[0.01, 1.12, 0.008]} />
            <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.9} />
          </mesh>
        ))}
        {[0.07, 1.17].map((yy, i) => (
          <mesh key={`gframe-h-${i}`} position={[0, yy, depthWorld * 0.455]}>
            <boxGeometry args={[widthWorld * 0.96, 0.01, 0.008]} />
            <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.9} />
          </mesh>
        ))}
        {/* Mid glass divider */}
        <mesh position={[0, 0.62, depthWorld * 0.455]}>
          <boxGeometry args={[widthWorld * 0.96, 0.006, 0.008]} />
          <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.9} />
        </mesh>
        {/* Door handle */}
        <mesh position={[widthWorld * 0.42, 0.62, depthWorld * 0.46]}>
          <boxGeometry args={[0.02, 0.12, 0.014]} />
          <meshStandardMaterial color={CHROME} roughness={0.26} metalness={0.9} />
        </mesh>
        {/* Keyed lock cylinder */}
        <mesh position={[widthWorld * 0.42, 0.52, depthWorld * 0.461]}>
          <cylinderGeometry args={[0.006, 0.006, 0.006, 12]} />
          <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.9} />
        </mesh>

        {/* ====== 4 SHELVES OF DEVICES ====== */}

        {/* --- Shelf 1 (bottom, ~y=0.18) — LAPTOPS --- */}
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.012, depthWorld * 0.78]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.45} />
        </mesh>
        {/* Shelf 1 front edge label plate */}
        <mesh position={[-widthWorld * 0.35, 0.205, depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.18, 0.018, 0.003]} />
          <meshStandardMaterial color="#1e40af" roughness={0.55} metalness={0.35} />
        </mesh>
        <Text
          position={[-widthWorld * 0.35, 0.205, depthWorld * 0.402]}
          fontSize={0.015}
          color="#ecfeff"
          anchorX="center"
          anchorY="middle"
        >
          LAPTOPS
        </Text>
        {([-0.22, 0.22] as const).map((sx, i) => (
          <group
            key={`lap-${i}`}
            position={[widthWorld * sx, 0.2, 0]}
            rotation={[0, 0, 0]}
          >
            {/* Laptop base */}
            <mesh castShadow>
              <boxGeometry args={[widthWorld * 0.3, 0.018, depthWorld * 0.52]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.78} />
            </mesh>
            {/* Trackpad */}
            <mesh position={[0, 0.01, depthWorld * 0.1]}>
              <boxGeometry args={[widthWorld * 0.14, 0.001, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.55} />
            </mesh>
            {/* Laptop screen (open at ~110°) */}
            <mesh
              position={[0, 0.08, -depthWorld * 0.22]}
              rotation={[-0.35, 0, 0]}
              castShadow
            >
              <boxGeometry args={[widthWorld * 0.3, 0.18, 0.012]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.4} metalness={0.4} />
            </mesh>
            {/* Laptop screen content — test runner (solid box, not plane) */}
            <mesh
              position={[0, 0.09, -depthWorld * 0.215]}
              rotation={[-0.35, 0, 0]}
            >
              <boxGeometry args={[widthWorld * 0.28, 0.16, 0.002]} />
              <meshStandardMaterial
                color={i === 0 ? "#16a34a" : "#2563eb"}
                emissive={i === 0 ? "#16a34a" : "#2563eb"}
                emissiveIntensity={0.9}
              />
            </mesh>
            {/* Apple-style logo on lid */}
            <mesh
              position={[0, 0.08, -depthWorld * 0.222]}
              rotation={[-0.35, 0, 0]}
            >
              <boxGeometry args={[0.02, 0.02, 0.001]} />
              <meshStandardMaterial
                color="#f1f5f9"
                emissive="#f1f5f9"
                emissiveIntensity={0.2}
              />
            </mesh>
          </group>
        ))}

        {/* --- Shelf 2 (~y=0.48) — TABLETS --- */}
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.012, depthWorld * 0.78]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.45} />
        </mesh>
        {/* Shelf 2 label */}
        <mesh position={[-widthWorld * 0.35, 0.505, depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.18, 0.018, 0.003]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.55} metalness={0.35} />
        </mesh>
        <Text
          position={[-widthWorld * 0.35, 0.505, depthWorld * 0.402]}
          fontSize={0.015}
          color="#ecfeff"
          anchorX="center"
          anchorY="middle"
        >
          TABLETS
        </Text>
        {/* Shelf dividers between tablets */}
        {([-0.15, 0.15] as const).map((sx, i) => (
          <mesh key={`div-${i}`} position={[widthWorld * sx, 0.52, 0]}>
            <boxGeometry args={[0.004, 0.06, depthWorld * 0.6]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.55} metalness={0.5} />
          </mesh>
        ))}
        {([-0.3, 0, 0.3] as const).map((sx, i) => (
          <group
            key={`tab-${i}`}
            position={[widthWorld * sx, 0.55, 0]}
            rotation={[-0.2, 0, 0]}
          >
            {/* Tablet body (propped up) */}
            <mesh castShadow>
              <boxGeometry args={[widthWorld * 0.22, 0.16, 0.012]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.4} metalness={0.55} />
            </mesh>
            {/* Tablet screen (solid slab) */}
            <mesh position={[0, 0, 0.008]}>
              <boxGeometry args={[widthWorld * 0.19, 0.14, 0.002]} />
              <meshStandardMaterial
                color={i === 0 ? "#8b5cf6" : i === 1 ? "#22d3ee" : "#f59e0b"}
                emissive={i === 0 ? "#8b5cf6" : i === 1 ? "#22d3ee" : "#f59e0b"}
                emissiveIntensity={1.05}
              />
            </mesh>
            {/* Home indicator */}
            <mesh position={[0, -0.06, 0.01]}>
              <boxGeometry args={[0.04, 0.002, 0.001]} />
              <meshStandardMaterial color="#ecfeff" emissive="#ecfeff" emissiveIntensity={0.6} />
            </mesh>
            {/* Front camera dot */}
            <mesh position={[0, 0.065, 0.01]}>
              <boxGeometry args={[0.005, 0.005, 0.001]} />
              <meshStandardMaterial color="#0b0b1a" />
            </mesh>
            {/* Stand */}
            <mesh position={[0, -0.07, -0.02]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[0.018, 0.06, 0.012]} />
              <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.5} />
            </mesh>
          </group>
        ))}

        {/* --- Shelf 3 (~y=0.78) — SMARTPHONES --- */}
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.012, depthWorld * 0.78]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.45} />
        </mesh>
        {/* Shelf 3 label */}
        <mesh position={[-widthWorld * 0.35, 0.805, depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.18, 0.018, 0.003]} />
          <meshStandardMaterial color="#0891b2" roughness={0.55} metalness={0.35} />
        </mesh>
        <Text
          position={[-widthWorld * 0.35, 0.805, depthWorld * 0.402]}
          fontSize={0.015}
          color="#ecfeff"
          anchorX="center"
          anchorY="middle"
        >
          PHONES
        </Text>
        {([-0.38, -0.19, 0, 0.19, 0.38] as const).map((sx, i) => (
          <group
            key={`phone-${i}`}
            position={[widthWorld * sx, 0.82, 0]}
            rotation={[-0.1, 0, 0]}
          >
            {/* Phone body (portrait) */}
            <mesh castShadow>
              <boxGeometry args={[0.04, 0.085, 0.008]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.35} metalness={0.55} />
            </mesh>
            {/* Phone screen (solid) */}
            <mesh position={[0, 0.005, 0.005]}>
              <boxGeometry args={[0.032, 0.07, 0.002]} />
              <meshStandardMaterial
                color={["#22c55e", "#f43f5e", "#38bdf8", "#f59e0b", "#a855f7"][i % 5]}
                emissive={["#22c55e", "#f43f5e", "#38bdf8", "#f59e0b", "#a855f7"][i % 5]}
                emissiveIntensity={1.15}
              />
            </mesh>
            {/* Camera cutout */}
            <mesh position={[0, 0.03, 0.007]}>
              <cylinderGeometry args={[0.003, 0.003, 0.003, 10]} />
              <meshStandardMaterial color="#0b0b1a" />
            </mesh>
            {/* Small status LED above each phone */}
            <mesh position={[0, 0.052, 0]}>
              <boxGeometry args={[0.006, 0.003, 0.006]} />
              <meshStandardMaterial
                color={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#f59e0b" : "#ef4444"}
                emissive={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#f59e0b" : "#ef4444"}
                emissiveIntensity={1.3}
              />
            </mesh>
          </group>
        ))}

        {/* --- Shelf 4 (top ~y=1.05) — WEARABLES / IoT --- */}
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.9, 0.012, depthWorld * 0.78]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.45} />
        </mesh>
        {/* Shelf 4 label */}
        <mesh position={[-widthWorld * 0.35, 1.075, depthWorld * 0.4]}>
          <boxGeometry args={[widthWorld * 0.18, 0.018, 0.003]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.55} metalness={0.35} />
        </mesh>
        <Text
          position={[-widthWorld * 0.35, 1.075, depthWorld * 0.402]}
          fontSize={0.014}
          color="#0b0b1a"
          anchorX="center"
          anchorY="middle"
        >
          WEARABLES
        </Text>
        {/* Watch stands (4) */}
        {([-0.32, -0.15, 0.02, 0.19] as const).map((sx, i) => (
          <group key={`watch-${i}`} position={[widthWorld * sx, 1.08, 0]}>
            {/* Stand pillar */}
            <mesh>
              <cylinderGeometry args={[0.012, 0.018, 0.05, 14]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.42} metalness={0.6} />
            </mesh>
            {/* Watch face */}
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.012, 18]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.35} metalness={0.55} />
            </mesh>
            {/* Watch screen (solid) */}
            <mesh position={[0, 0.037, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.003, 18]} />
              <meshStandardMaterial
                color={["#22d3ee", "#22c55e", "#a855f7", "#f59e0b"][i]}
                emissive={["#22d3ee", "#22c55e", "#a855f7", "#f59e0b"][i]}
                emissiveIntensity={1.1}
              />
            </mesh>
            {/* Watch strap accent */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.03, 0.005, 0.012]} />
              <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.2} />
            </mesh>
          </group>
        ))}
        {/* Earbuds charging case */}
        <group position={[widthWorld * 0.32, 1.08, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.018, 0.05]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.55} metalness={0.4} />
          </mesh>
          {/* Hinge */}
          <mesh position={[0, 0.008, -0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.002, 0.002, 0.04, 8]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.9} />
          </mesh>
          {/* LED */}
          <mesh position={[0, 0.005, 0.026]}>
            <boxGeometry args={[0.004, 0.003, 0.002]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.3} />
          </mesh>
        </group>
        {/* IoT hub */}
        <group position={[widthWorld * 0.4, 1.09, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.025, 0.04, 20]} />
            <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.35} />
          </mesh>
          {/* Top glow ring */}
          <mesh position={[0, 0.022, 0]}>
            <torusGeometry args={[0.016, 0.002, 8, 18]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>

        {/* === USB HUB at top right — status + cables === */}
        <mesh position={[widthWorld * 0.33, 1.14, 0]}>
          <boxGeometry args={[0.14, 0.025, 0.05]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.4} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh
            key={`usb-led-${i}`}
            position={[widthWorld * 0.33 - 0.04 + i * 0.018, 1.145, 0.025]}
          >
            <boxGeometry args={[0.005, 0.004, 0.003]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.2}
            />
          </mesh>
        ))}

        {/* === FRONT LED STATUS COLUMN (left outer — one per shelf) === */}
        {[0.18, 0.48, 0.78, 1.05].map((yy, idx) => (
          <group key={`sled-${idx}`} position={[-widthWorld * 0.46, yy + 0.02, depthWorld * 0.455]}>
            <mesh>
              <boxGeometry args={[0.018, 0.006, 0.004]} />
              <meshStandardMaterial
                color={idx === 2 ? "#ef4444" : "#22c55e"}
                emissive={idx === 2 ? "#ef4444" : "#22c55e"}
                emissiveIntensity={1.3}
              />
            </mesh>
          </group>
        ))}

        {/* === STATUS DISPLAY PANEL (top-right, under brand plate) === */}
        <group position={[widthWorld * 0.25, 1.13, depthWorld * 0.458]}>
          <mesh>
            <boxGeometry args={[0.14, 0.04, 0.003]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <boxGeometry args={[0.12, 0.028, 0.001]} />
            <meshStandardMaterial
              color="#16a34a"
              emissive="#16a34a"
              emissiveIntensity={1.1}
            />
          </mesh>
          <Text
            position={[0, 0, 0.003]}
            fontSize={0.012}
            color="#0b0b1a"
            anchorX="center"
            anchorY="middle"
          >
            ALL OK · 14/14
          </Text>
        </group>

        {/* === ASSET TAG (bottom-left front) === */}
        <group position={[-widthWorld * 0.38, 0.09, depthWorld * 0.457]}>
          <mesh>
            <boxGeometry args={[0.05, 0.034, 0.002]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Fake QR — 5x5 grid */}
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 5 }).map((__, c) => {
              const fill = (r + c) % 2 === 0 || (r === 0 && c === 0) || (r === 4 && c === 4);
              return fill ? (
                <mesh key={`qr-${r}-${c}`} position={[-0.015 + c * 0.0075, 0.01 - r * 0.0075, 0.002]}>
                  <boxGeometry args={[0.006, 0.006, 0.001]} />
                  <meshStandardMaterial color="#0b0b1a" />
                </mesh>
              ) : null;
            }),
          )}
        </group>

        {/* === POWER CABLE coiling out of bottom-back === */}
        <mesh
          position={[widthWorld * 0.3, 0.02, -depthWorld * 0.4]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.045, 0.006, 8, 20]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.85} metalness={0.1} />
        </mesh>

        {/* === BRAND PLATE at top === */}
        <mesh position={[-widthWorld * 0.12, 1.18, depthWorld * 0.456]}>
          <boxGeometry args={[widthWorld * 0.38, 0.06, 0.004]} />
          <meshStandardMaterial
            color={LED_CYAN}
            emissive={LED_CYAN}
            emissiveIntensity={0.85}
            roughness={0.35}
          />
        </mesh>
        <Text
          position={[-widthWorld * 0.12, 1.18, depthWorld * 0.46]}
          fontSize={0.026}
          color="#0b1e2a"
          anchorX="center"
          anchorY="middle"
        >
          DEVICE LAB
        </Text>
      </group>
    </group>
  );
}

function TestBenchModelInner({
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
  const highlightIntensity = isSelected ? 0.34 : isHovered && editMode ? 0.2 : 0;

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
        ELECTRONICS TEST BENCH (footprint 90×42)
        Steel-frame workbench with anti-static ESD green mat, chrome edge strips, pegboard
        back wall with hanging tools (wrench, screwdrivers, pliers, wire strippers, calipers,
        cable coils, safety glasses), wire spools, schematic, and a task-light LED strip.
        On bench: oscilloscope, function generator, bench power supply with dual meters,
        soldering station with glowing iron + wet sponge, handheld multimeter with leads,
        magnifier lamp, DUT (populated PCB with LEDs + chips), 4 colored parts bins, stool.
      */}
      <group position={[widthWorld / 2, 0, depthWorld / 2]} rotation={[0, rotY, 0]}>
        {/* === LEGS (4 steel tube legs) === */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`leg_${sx}_${sz}`}
              position={[widthWorld * 0.44 * sx, 0.22, depthWorld * 0.4 * sz]}
              castShadow
            >
              <boxGeometry args={[0.055, 0.44, 0.055]} />
              <meshStandardMaterial color={GUNMETAL} roughness={0.42} metalness={0.6} />
            </mesh>
          )),
        )}
        {/* Rubber foot caps */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`foot_${sx}_${sz}`}
              position={[widthWorld * 0.44 * sx, 0.01, depthWorld * 0.4 * sz]}
            >
              <boxGeometry args={[0.065, 0.02, 0.065]} />
              <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.05} />
            </mesh>
          )),
        )}

        {/* Lower storage shelf */}
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.86, 0.02, depthWorld * 0.82]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.4} />
        </mesh>
        {/* Toolbox on lower shelf */}
        <mesh position={[-widthWorld * 0.22, 0.2, 0]} castShadow>
          <boxGeometry args={[0.18, 0.11, 0.12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} metalness={0.35} />
        </mesh>
        {/* Power strip with 4 sockets + LED */}
        <mesh position={[widthWorld * 0.25, 0.165, depthWorld * 0.2]}>
          <boxGeometry args={[0.22, 0.02, 0.05]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[widthWorld * 0.36, 0.175, depthWorld * 0.2]}>
          <boxGeometry args={[0.005, 0.004, 0.006]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.3} />
        </mesh>

        {/* === BENCH TOP (steel body with baked-in ESD rubber mat on top) === */}
        <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthWorld * 0.98, 0.04, depthWorld * 0.92]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.55}
            metalness={0.15}
            emissive={highlightColor}
            emissiveIntensity={highlightIntensity}
          />
        </mesh>
        {/* ESD-green surface layer — thin inset box (no z-fighting) */}
        <mesh position={[0, 0.483, 0]} receiveShadow>
          <boxGeometry args={[widthWorld * 0.94, 0.006, depthWorld * 0.86]} />
          <meshStandardMaterial color="#065f46" roughness={0.92} metalness={0.02} />
        </mesh>
        {/* Chrome edge strips */}
        <mesh position={[0, 0.462, depthWorld * 0.46]}>
          <boxGeometry args={[widthWorld * 0.98, 0.042, 0.008]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
        </mesh>
        <mesh position={[0, 0.462, -depthWorld * 0.46]}>
          <boxGeometry args={[widthWorld * 0.98, 0.042, 0.008]} />
          <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.88} />
        </mesh>

        {/* === PEGBOARD BACK WALL === */}
        <mesh position={[0, 0.82, -depthWorld * 0.42]} castShadow>
          <boxGeometry args={[widthWorld * 0.92, 0.72, 0.015]} />
          <meshStandardMaterial color="#78350f" roughness={0.78} metalness={0.08} />
        </mesh>
        {/* Pegboard hole grid */}
        {Array.from({ length: 10 }).map((_, col) =>
          Array.from({ length: 5 }).map((__, row) => (
            <mesh
              key={`peg-${row}-${col}`}
              position={[
                widthWorld * (-0.4 + col * 0.09),
                0.58 + row * 0.12,
                -depthWorld * 0.412,
              ]}
            >
              <cylinderGeometry args={[0.004, 0.004, 0.004, 8]} />
              <meshStandardMaterial color="#0b0b1a" />
            </mesh>
          )),
        )}
        {/* Hanging tools on pegboard */}
        {/* Wrench outline */}
        <mesh position={[-widthWorld * 0.35, 0.86, -depthWorld * 0.408]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.02, 0.12, 0.008]} />
          <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Screwdriver */}
        <mesh position={[-widthWorld * 0.25, 0.86, -depthWorld * 0.408]}>
          <boxGeometry args={[0.012, 0.14, 0.008]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[-widthWorld * 0.25, 0.94, -depthWorld * 0.408]}>
          <boxGeometry args={[0.006, 0.05, 0.006]} />
          <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.9} />
        </mesh>
        {/* Pliers */}
        <mesh position={[-widthWorld * 0.14, 0.88, -depthWorld * 0.408]}>
          <boxGeometry args={[0.04, 0.12, 0.008]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Pliers handle grip */}
        <mesh position={[-widthWorld * 0.14, 0.82, -depthWorld * 0.408]}>
          <boxGeometry args={[0.03, 0.04, 0.008]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} metalness={0.1} />
        </mesh>
        {/* Wire strippers */}
        <mesh position={[-widthWorld * 0.04, 0.88, -depthWorld * 0.408]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.03, 0.1, 0.008]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.55} metalness={0.4} />
        </mesh>
        {/* Digital calipers */}
        <mesh position={[widthWorld * 0.08, 0.96, -depthWorld * 0.408]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.09, 0.022, 0.008]} />
          <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
        </mesh>
        <mesh position={[widthWorld * 0.08, 0.962, -depthWorld * 0.407]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.03, 0.014, 0.001]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.9}
          />
        </mesh>
        {/* Safety glasses hanging */}
        <group position={[widthWorld * 0.18, 1.04, -depthWorld * 0.408]}>
          <mesh>
            <boxGeometry args={[0.07, 0.018, 0.004]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[-0.02, 0, 0.003]}>
            <cylinderGeometry args={[0.012, 0.012, 0.002, 16]} />
            <meshStandardMaterial
              color="#67e8f9"
              transparent
              opacity={0.5}
              emissive="#67e8f9"
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[0.02, 0, 0.003]}>
            <cylinderGeometry args={[0.012, 0.012, 0.002, 16]} />
            <meshStandardMaterial
              color="#67e8f9"
              transparent
              opacity={0.5}
              emissive="#67e8f9"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
        {/* Cable coil */}
        <mesh
          position={[widthWorld * 0.3, 0.88, -depthWorld * 0.405]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.05, 0.012, 8, 20]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.85} metalness={0.1} />
        </mesh>
        {/* Red wire spool */}
        <mesh
          position={[widthWorld * 0.4, 0.88, -depthWorld * 0.405]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.04, 0.009, 8, 20]} />
          <meshStandardMaterial color="#dc2626" roughness={0.85} metalness={0.1} />
        </mesh>
        {/* Schematic paper pinned on pegboard */}
        <mesh position={[widthWorld * 0.35, 1.08, -depthWorld * 0.407]}>
          <boxGeometry args={[0.12, 0.09, 0.002]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.9} metalness={0.02} />
        </mesh>
        {/* Schematic lines (decorative) */}
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={`sch-${i}`}
            position={[widthWorld * 0.35 + (i - 1.5) * 0.02, 1.08, -depthWorld * 0.406]}
          >
            <boxGeometry args={[0.002, 0.06, 0.001]} />
            <meshStandardMaterial color="#0369a1" />
          </mesh>
        ))}
        {/* Task lighting LED strip under top shelf of pegboard */}
        <mesh position={[0, 1.155, -depthWorld * 0.395]}>
          <boxGeometry args={[widthWorld * 0.86, 0.008, 0.012]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fef3c7"
            emissiveIntensity={1.3}
          />
        </mesh>

        {/* === OSCILLOSCOPE (center-back on bench) === */}
        <group position={[-widthWorld * 0.2, 0.55, -depthWorld * 0.22]}>
          {/* Body */}
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.2, 0.16]} />
            <meshStandardMaterial color="#374151" roughness={0.45} metalness={0.45} />
          </mesh>
          {/* Screen bezel */}
          <mesh position={[0, 0, 0.082]}>
            <boxGeometry args={[0.2, 0.15, 0.008]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.4} metalness={0.45} />
          </mesh>
          {/* Screen content — cyan waveform */}
          <mesh position={[0, 0, 0.088]}>
            <planeGeometry args={[0.18, 0.13]} />
            <meshStandardMaterial
              color="#052e2b"
              emissive="#22d3ee"
              emissiveIntensity={1.1}
              roughness={0.3}
            />
          </mesh>
          {/* Waveform lines (simulated) */}
          {[0, 1, 2].map((wave) => (
            <mesh
              key={`wave-${wave}`}
              position={[0, 0.02 - wave * 0.025, 0.093]}
            >
              <planeGeometry args={[0.16, 0.003]} />
              <meshStandardMaterial
                color={wave === 0 ? "#fbbf24" : wave === 1 ? "#22d3ee" : "#a855f7"}
                emissive={wave === 0 ? "#fbbf24" : wave === 1 ? "#22d3ee" : "#a855f7"}
                emissiveIntensity={1.3}
              />
            </mesh>
          ))}
          {/* Knob row under screen */}
          {[-0.08, -0.04, 0, 0.04, 0.08].map((kx, i) => (
            <mesh key={`knob-${i}`} position={[kx, -0.1, 0.082]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.01, 14]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.55} metalness={0.45} />
            </mesh>
          ))}
        </group>

        {/* === BENCH POWER SUPPLY (center) === */}
        <group position={[widthWorld * 0.05, 0.54, -depthWorld * 0.22]}>
          {/* Body */}
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.16, 0.16]} />
            <meshStandardMaterial color="#0b1e2a" roughness={0.5} metalness={0.45} />
          </mesh>
          {/* Two analog voltmeters */}
          {([-0.05, 0.05] as const).map((mx, i) => (
            <group key={`meter-${i}`} position={[mx, 0.03, 0.082]}>
              <mesh>
                <cylinderGeometry args={[0.035, 0.035, 0.008, 22]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.55} />
              </mesh>
              {/* Meter face */}
              <mesh position={[0, 0, 0.005]}>
                <cylinderGeometry args={[0.028, 0.028, 0.002, 22]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
              </mesh>
              {/* Needle */}
              <mesh position={[0, 0, 0.008]} rotation={[0, 0, i === 0 ? -0.4 : 0.3]}>
                <boxGeometry args={[0.002, 0.02, 0.001]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
            </group>
          ))}
          {/* Front knobs & terminals */}
          {[-0.08, -0.04, 0.04, 0.08].map((kx, i) => (
            <mesh key={`ps-knob-${i}`} position={[kx, -0.05, 0.082]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.012, 0.01, 14]} />
              <meshStandardMaterial color={CHROME} roughness={0.28} metalness={0.85} />
            </mesh>
          ))}
          {/* Terminal posts (red/black) */}
          {[-0.02, 0.02].map((tx, i) => (
            <mesh key={`term-${i}`} position={[tx, -0.05, 0.085]}>
              <cylinderGeometry args={[0.007, 0.007, 0.012, 12]} />
              <meshStandardMaterial
                color={i === 0 ? "#dc2626" : "#0b0b1a"}
                roughness={0.45}
                metalness={0.45}
              />
            </mesh>
          ))}
        </group>

        {/* === SOLDERING STATION (right side) === */}
        <group position={[widthWorld * 0.3, 0.53, -depthWorld * 0.24]}>
          {/* Station body */}
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.14, 0.1]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.42} metalness={0.35} />
          </mesh>
          {/* Digital display */}
          <mesh position={[0, 0.02, 0.052]}>
            <planeGeometry args={[0.08, 0.03]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={1.3}
            />
          </mesh>
          <Text
            position={[0, 0.02, 0.053]}
            fontSize={0.014}
            color="#0b0b1a"
            anchorX="center"
            anchorY="middle"
          >
            350°C
          </Text>
          {/* Knob */}
          <mesh position={[0.04, -0.03, 0.052]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.01, 14]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.55} metalness={0.45} />
          </mesh>
        </group>
        {/* Iron holder (coiled spring) */}
        <group position={[widthWorld * 0.4, 0.5, -depthWorld * 0.2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.018, 0.003, 8, 20]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Iron body */}
          <mesh position={[0, 0.025, 0]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.018, 0.1, 0.018]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Tip (orange glow) */}
          <mesh position={[0, 0.08, 0.028]}>
            <coneGeometry args={[0.005, 0.018, 10]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#f97316"
              emissiveIntensity={1.1}
            />
          </mesh>
          {/* Wet sponge tray */}
          <mesh position={[-0.04, 0.02, 0]}>
            <boxGeometry args={[0.04, 0.01, 0.05]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[-0.04, 0.027, 0]}>
            <boxGeometry args={[0.035, 0.005, 0.045]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.9} metalness={0.05} />
          </mesh>
        </group>

        {/* === MAGNIFIER LAMP on articulated arm (left-front) === */}
        <group position={[-widthWorld * 0.36, 0.5, depthWorld * 0.24]}>
          {/* Base clamp */}
          <mesh>
            <cylinderGeometry args={[0.03, 0.035, 0.02, 16]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.42} metalness={0.58} />
          </mesh>
          {/* Arm segment 1 */}
          <mesh position={[0.05, 0.08, 0]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.008, 0.008, 0.16, 10]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.65} />
          </mesh>
          {/* Elbow */}
          <mesh position={[0.1, 0.14, 0]}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Arm segment 2 */}
          <mesh position={[0.16, 0.12, 0]} rotation={[0, 0, 0.9]}>
            <cylinderGeometry args={[0.008, 0.008, 0.14, 10]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.65} />
          </mesh>
          {/* Magnifier head */}
          <mesh position={[0.2, 0.08, 0]} rotation={[0.2, 0, -0.3]}>
            <cylinderGeometry args={[0.05, 0.05, 0.015, 24]} />
            <meshStandardMaterial color={GUNMETAL} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Lens (glassy cyan) */}
          <mesh position={[0.2, 0.075, 0]} rotation={[0.2, 0, -0.3]}>
            <cylinderGeometry args={[0.038, 0.038, 0.004, 24]} />
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#67e8f9"
              emissiveIntensity={0.6}
              transparent
              opacity={0.55}
              metalness={0.4}
              roughness={0.15}
            />
          </mesh>
        </group>

        {/* === DUT (device under test — PCB on the bench) === */}
        <group position={[-widthWorld * 0.05, 0.5, depthWorld * 0.1]}>
          {/* PCB board */}
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.01, 0.08]} />
            <meshStandardMaterial color="#065f46" roughness={0.55} metalness={0.3} />
          </mesh>
          {/* Chips */}
          {([-0.035, 0.02] as const).map((cx, i) => (
            <mesh key={`chip-${i}`} position={[cx, 0.012, 0]} castShadow>
              <boxGeometry args={[0.03, 0.008, 0.025]} />
              <meshStandardMaterial color="#0b0b1a" roughness={0.4} metalness={0.5} />
            </mesh>
          ))}
          {/* LEDs on PCB */}
          {[-0.05, -0.03, 0.04].map((lx, i) => (
            <mesh key={`pcbled-${i}`} position={[lx, 0.008, 0.03]}>
              <boxGeometry args={[0.004, 0.003, 0.004]} />
              <meshStandardMaterial
                color={["#22c55e", "#f59e0b", "#ef4444"][i]}
                emissive={["#22c55e", "#f59e0b", "#ef4444"][i]}
                emissiveIntensity={1.3}
              />
            </mesh>
          ))}
          {/* Probe wires (red/black) */}
          <mesh position={[-0.06, 0.03, 0]} rotation={[0, 0, -0.5]}>
            <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0.06, 0.03, 0]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
            <meshStandardMaterial color="#0b0b1a" />
          </mesh>
        </group>

        {/* === PARTS BINS (4 small colored organizer bins, back-right) === */}
        {[
          { x: 0.32, color: "#ef4444" },
          { x: 0.37, color: "#22c55e" },
          { x: 0.42, color: "#3b82f6" },
          { x: 0.47, color: "#fbbf24" },
        ].map((bin, i) => (
          <group key={`bin-${i}`} position={[widthWorld * bin.x - widthWorld * 0.05, 0.5, depthWorld * 0.32]}>
            <mesh castShadow>
              <boxGeometry args={[0.038, 0.04, 0.05]} />
              <meshStandardMaterial color={bin.color} roughness={0.55} metalness={0.25} />
            </mesh>
            {/* Tag window */}
            <mesh position={[0, 0, 0.026]}>
              <planeGeometry args={[0.025, 0.012]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* === FUNCTION GENERATOR (stacked on oscilloscope) === */}
        <group position={[-widthWorld * 0.2, 0.74, -depthWorld * 0.22]}>
          {/* Body */}
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.12, 0.16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.45} />
          </mesh>
          {/* Display */}
          <mesh position={[-0.06, 0.015, 0.082]}>
            <boxGeometry args={[0.08, 0.035, 0.002]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={1.2}
            />
          </mesh>
          <Text
            position={[-0.06, 0.015, 0.084]}
            fontSize={0.012}
            color="#0b1e2a"
            anchorX="center"
            anchorY="middle"
          >
            1.000 kHz
          </Text>
          {/* BNC output jacks */}
          {[0.02, 0.06, 0.1].map((tx, i) => (
            <mesh key={`bnc-${i}`} position={[tx, 0.015, 0.082]}>
              <cylinderGeometry args={[0.007, 0.007, 0.012, 14]} />
              <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.88} />
            </mesh>
          ))}
          {/* Waveform selector buttons */}
          {[-0.08, -0.05, -0.02, 0.01].map((kx, i) => (
            <mesh key={`fg-btn-${i}`} position={[kx, -0.03, 0.082]}>
              <boxGeometry args={[0.018, 0.018, 0.004]} />
              <meshStandardMaterial color={["#22d3ee", "#a855f7", "#f59e0b", "#22c55e"][i]} emissive={["#22d3ee", "#a855f7", "#f59e0b", "#22c55e"][i]} emissiveIntensity={0.5} />
            </mesh>
          ))}
        </group>

        {/* === HANDHELD MULTIMETER (front-center, on mat) === */}
        <group position={[widthWorld * 0.18, 0.51, depthWorld * 0.18]} rotation={[0, -0.1, 0]}>
          {/* Body */}
          <mesh castShadow>
            <boxGeometry args={[0.09, 0.02, 0.16]} />
            <meshStandardMaterial color="#eab308" roughness={0.55} metalness={0.25} />
          </mesh>
          {/* Display */}
          <mesh position={[0, 0.012, -0.04]}>
            <boxGeometry args={[0.06, 0.002, 0.04]} />
            <meshStandardMaterial
              color="#0b1e2a"
              emissive="#22d3ee"
              emissiveIntensity={1.15}
            />
          </mesh>
          <Text
            position={[0, 0.014, -0.04]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.011}
            color="#ecfeff"
            anchorX="center"
            anchorY="middle"
          >
            4.998 V
          </Text>
          {/* Rotary dial */}
          <mesh position={[0, 0.013, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.005, 24]} />
            <meshStandardMaterial color="#0b0b1a" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Dial pointer */}
          <mesh position={[0, 0.017, 0.008]}>
            <boxGeometry args={[0.002, 0.002, 0.018]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          {/* Probe ports */}
          {([-0.015, 0.015] as const).map((tx, i) => (
            <mesh key={`mmprobe-${i}`} position={[tx, 0.013, 0.06]}>
              <cylinderGeometry args={[0.005, 0.005, 0.008, 10]} />
              <meshStandardMaterial color={i === 0 ? "#dc2626" : "#0b0b1a"} />
            </mesh>
          ))}
          {/* Red probe wire curving away */}
          <mesh
            position={[-0.015, 0.018, 0.09]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.002, 0.002, 0.08, 8]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh
            position={[0.015, 0.018, 0.09]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.002, 0.002, 0.08, 8]} />
            <meshStandardMaterial color="#0b0b1a" />
          </mesh>
        </group>

        {/* === STOOL (at front of bench for technician) === */}
        <group position={[widthWorld * 0.05, 0, depthWorld * 0.78]}>
          {/* Gas lift */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.015, 0.44, 14]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
          </mesh>
          {/* 5-point base */}
          {[0, 72, 144, 216, 288].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <mesh
                key={`stool-caster-${i}`}
                position={[Math.cos(rad) * 0.1, 0.014, Math.sin(rad) * 0.1]}
                rotation={[0, -rad, 0]}
                castShadow
              >
                <boxGeometry args={[0.09, 0.016, 0.018]} />
                <meshStandardMaterial color={GUNMETAL} roughness={0.45} metalness={0.55} />
              </mesh>
            );
          })}
          {/* Seat */}
          <mesh position={[0, 0.46, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} />
            <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.2} />
          </mesh>
          {/* Seat ESD stripe */}
          <mesh position={[0, 0.482, 0]}>
            <cylinderGeometry args={[0.117, 0.117, 0.004, 24]} />
            <meshStandardMaterial color="#065f46" roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Footrest ring */}
          <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.006, 8, 20]} />
            <meshStandardMaterial color={CHROME} roughness={0.3} metalness={0.85} />
          </mesh>
        </group>

        {/* === ESD WRIST STRAP (coiled on bench) === */}
        <mesh
          position={[-widthWorld * 0.08, 0.505, depthWorld * 0.15]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.025, 0.003, 6, 16]} />
          <meshStandardMaterial color="#0b0b1a" roughness={0.8} metalness={0.1} />
        </mesh>
        {/* Strap band */}
        <mesh position={[-widthWorld * 0.08, 0.51, depthWorld * 0.15]}>
          <torusGeometry args={[0.02, 0.005, 8, 20]} />
          <meshStandardMaterial color="#16a34a" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* === FRONT QA BADGE (amber LED strip with label) === */}
        <mesh position={[0, 0.432, depthWorld * 0.47]}>
          <boxGeometry args={[widthWorld * 0.3, 0.02, 0.008]} />
          <meshStandardMaterial
            color={ACCENT_AMBER}
            emissive={ACCENT_AMBER}
            emissiveIntensity={0.9}
            roughness={0.35}
            metalness={0.5}
          />
        </mesh>
        <Text
          position={[0, 0.432, depthWorld * 0.474]}
          fontSize={0.014}
          color="#0b0b1a"
          anchorX="center"
          anchorY="middle"
        >
          TEST BENCH · OKESTRIA
        </Text>
      </group>
    </group>
  );
}

function PingPongTableModelInner({
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

function TreadmillModelInner({
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

function WeightBenchModelInner({
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

function DumbbellRackModelInner({
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

function ExerciseBikeModelInner({
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

function PunchingBagModelInner({
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

function RowingMachineModelInner({
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

function KettlebellRackModelInner({
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

function YogaMatModelInner({
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

function EaselModelInner({
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

function PaintTableModelInner({
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

function ArtRackModelInner({
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

function SpeakerModelInner({
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

function SquatRackModelInner({
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

function DeadliftPlatformModelInner({
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

function PlateRackModelInner({
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

function CableCrossoverModelInner({
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

// ---- Memoized exports (v40 performance pass) ----
// All gym, QA lab, art, server, phone, SMS and ATM models are wrapped in
// React.memo to avoid re-rendering when parent state changes but model props
// are unchanged. This is critical because the office has many of these models
// and they each contain dozens of meshes.
export const AtmMachineModel = memo(AtmMachineModelInner);
export const PhoneBoothModel = memo(PhoneBoothModelInner);
export const SmsBoothModel = memo(SmsBoothModelInner);
export const ServerRackModel = memo(ServerRackModelInner);
export const ServerTerminalModel = memo(ServerTerminalModelInner);
export const QaTerminalModel = memo(QaTerminalModelInner);
export const DeviceRackModel = memo(DeviceRackModelInner);
export const TestBenchModel = memo(TestBenchModelInner);
export const PingPongTableModel = memo(PingPongTableModelInner);
export const TreadmillModel = memo(TreadmillModelInner);
export const WeightBenchModel = memo(WeightBenchModelInner);
export const DumbbellRackModel = memo(DumbbellRackModelInner);
export const ExerciseBikeModel = memo(ExerciseBikeModelInner);
export const PunchingBagModel = memo(PunchingBagModelInner);
export const RowingMachineModel = memo(RowingMachineModelInner);
export const KettlebellRackModel = memo(KettlebellRackModelInner);
export const YogaMatModel = memo(YogaMatModelInner);
export const EaselModel = memo(EaselModelInner);
export const PaintTableModel = memo(PaintTableModelInner);
export const ArtRackModel = memo(ArtRackModelInner);
export const SpeakerModel = memo(SpeakerModelInner);
export const SquatRackModel = memo(SquatRackModelInner);
export const DeadliftPlatformModel = memo(DeadliftPlatformModelInner);
export const PlateRackModel = memo(PlateRackModelInner);
export const CableCrossoverModel = memo(CableCrossoverModelInner);
