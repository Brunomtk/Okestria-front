"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SCALE } from "@/features/retro-office/core/constants";
import {
  FURNITURE_ROTATION,
  getItemBaseSize,
  getItemRotationRadians,
  resolveItemTypeKey,
  toWorld,
} from "@/features/retro-office/core/geometry";
import type { FurnitureItem } from "@/features/retro-office/core/types";
import type { InteractiveFurnitureModelProps } from "@/features/retro-office/objects/types";

export const FURNITURE_GLB: Record<string, string> = {
  desk_cubicle: "/office-assets/models/furniture/desk.glb",
  executive_desk: "/office-assets/models/furniture/deskCorner.glb",
  chair: "/office-assets/models/furniture/chairDesk.glb",
  round_table: "/office-assets/models/furniture/tableRound.glb",
  couch: "/office-assets/models/furniture/loungeSofa.glb",
  couch_v: "/office-assets/models/furniture/loungeDesignChair.glb",
  bookshelf: "/office-assets/models/furniture/bookcaseClosed.glb",
  plant: "/office-assets/models/furniture/pottedPlant.glb",
  beanbag: "/office-assets/models/furniture/loungeDesignChair.glb",
  pingpong: "/office-assets/models/furniture/tableCoffee.glb",
  table_rect: "/office-assets/models/furniture/table.glb",
  coffee_machine: "/office-assets/models/furniture/kitchenCoffeeMachine.glb",
  fridge: "/office-assets/models/furniture/kitchenFridgeSmall.glb",
  water_cooler: "/office-assets/models/furniture/plantSmall1.glb",
  whiteboard: "/office-assets/models/furniture/bookcaseClosed.glb",
  cabinet: "/office-assets/models/furniture/kitchenCabinet.glb",
  computer: "/office-assets/models/furniture/computerScreen.glb",
  lamp: "/office-assets/models/furniture/lampRoundFloor.glb",
  printer: "/office-assets/models/furniture/kitchenCabinet.glb",
  locker: "/office-assets/models/furniture/bookcaseClosed.glb",
  copier: "/office-assets/models/furniture/kitchenCabinet.glb",
  reception_desk: "/office-assets/models/furniture/deskCorner.glb",
  side_table: "/office-assets/models/furniture/tableCoffee.glb",
  ottoman: "/office-assets/models/furniture/loungeDesignChair.glb",
  bench_seat: "/office-assets/models/furniture/loungeSofa.glb",
  coat_rack: "/office-assets/models/furniture/lampRoundFloor.glb",
  floor_sign: "/office-assets/models/furniture/plantSmall1.glb",
  router_station: "/office-assets/models/furniture/computerScreen.glb",
  speaker: "/office-assets/models/furniture/loungeDesignChair.glb",
  projector: "/office-assets/models/furniture/computerScreen.glb",
  tv_stand: "/office-assets/models/furniture/kitchenCabinet.glb",
  charging_station: "/office-assets/models/furniture/computerScreen.glb",
  arcade: "/office-assets/models/furniture/deskCorner.glb",
  foosball: "/office-assets/models/furniture/table.glb",
  air_hockey: "/office-assets/models/furniture/table.glb",
  podium: "/office-assets/models/furniture/deskCorner.glb",
  camera_tripod: "/office-assets/models/furniture/lampRoundFloor.glb",
  mail_cart: "/office-assets/models/furniture/tableCoffee.glb",
  first_aid: "/office-assets/models/furniture/kitchenCabinet.glb",
};

export const FURNITURE_SCALE: Record<string, [number, number, number]> = {
  desk_cubicle: [1.5, 1.5, 1.5],
  executive_desk: [1.8, 1.8, 1.8],
  chair: [1.2, 1.2, 1.2],
  round_table: [3.2, 3.2, 3.2],
  couch: [1.8, 1.8, 1.8],
  couch_v: [1.4, 1.4, 1.4],
  bookshelf: [1.5, 2, 1.5],
  plant: [1.2, 1.8, 1.2],
  beanbag: [1, 1, 1],
  pingpong: [2.4, 1.2, 1.6],
  table_rect: [1.4, 1.2, 1.0],
  coffee_machine: [0.8, 0.8, 0.8],
  fridge: [1, 1.4, 1],
  water_cooler: [1, 2, 1],
  whiteboard: [0.6, 1.4, 0.3],
  cabinet: [2.6, 1.2, 1],
  computer: [1.1, 1.1, 1.1],
  lamp: [1.2, 1.2, 1.2],
  printer: [0.85, 0.85, 0.75],
  locker: [0.7, 1.25, 0.7],
  copier: [0.9, 0.8, 0.8],
  reception_desk: [1.5, 1.25, 1.1],
  side_table: [0.9, 0.8, 0.9],
  ottoman: [0.9, 0.75, 0.9],
  bench_seat: [1.1, 0.85, 0.7],
  coat_rack: [0.42, 1.2, 0.42],
  floor_sign: [0.35, 0.5, 0.35],
  router_station: [0.55, 0.35, 0.45],
  speaker: [0.55, 0.8, 0.55],
  projector: [0.55, 0.4, 0.55],
  tv_stand: [1.15, 0.7, 0.7],
  charging_station: [0.45, 0.65, 0.45],
  arcade: [0.95, 1.2, 0.85],
  foosball: [1.35, 1.0, 0.95],
  air_hockey: [1.45, 1.0, 1.05],
  podium: [0.7, 0.9, 0.65],
  camera_tripod: [0.4, 1.0, 0.4],
  mail_cart: [0.9, 0.75, 0.7],
  first_aid: [0.4, 0.4, 0.18],
};

export const FURNITURE_Y_OFFSET: Record<string, number> = {
  computer: 0.61,
  router_station: 0.62,
  projector: 0.82,
  first_aid: 0.78,
};

export const FURNITURE_TINT: Record<string, string | null> = {
  desk_cubicle: "#8b5e32",
  executive_desk: "#6b3c1a",
  chair: "#4a5568",
  round_table: "#9a6332",
  couch: "#3d5575",
  couch_v: "#5a4870",
  bookshelf: "#5c3520",
  beanbag: null,
  computer: "#363c58",
  pingpong: "#2d6048",
  table_rect: "#7a5028",
  coffee_machine: "#2d2d38",
  fridge: "#505a60",
  water_cooler: "#3a5070",
  whiteboard: "#f4f2ee",
  cabinet: "#3c4248",
  plant: null,
  lamp: "#c8a060",
  printer: "#404858",
  locker: "#4b5563",
  copier: "#6b7280",
  reception_desk: "#6b3c1a",
  side_table: "#7a5028",
  ottoman: null,
  bench_seat: "#4b5563",
  coat_rack: "#8b5e32",
  floor_sign: "#f59e0b",
  router_station: "#334155",
  speaker: "#1f2937",
  projector: "#475569",
  tv_stand: "#374151",
  charging_station: "#0f766e",
  arcade: "#7c3aed",
  foosball: "#166534",
  air_hockey: "#0ea5e9",
  podium: "#8b5e32",
  camera_tripod: "#374151",
  mail_cart: "#6b7280",
  first_aid: "#ffffff",
};

const SHADOW_CASTING_FURNITURE_TYPES = new Set([
  "desk_cubicle",
  "executive_desk",
  "round_table",
  "table_rect",
  "couch",
  "couch_v",
  "bookshelf",
  "cabinet",
  "fridge",
]);

const furnitureTemplateCache = new Map<string, THREE.Object3D>();

const gltfSceneCache = new Map<string, THREE.Object3D | null>();
const gltfLoadErrorCache = new Set<string>();

const resolveFurnitureAssetPath = (path: string) => {
  if (!path.startsWith("/")) return path;
  if (typeof window === "undefined") return path;
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
  const normalizedBasePath = basePath && basePath !== "/"
    ? `${basePath.startsWith("/") ? basePath : `/${basePath}`}`.replace(/\/$/, "")
    : "";
  return `${normalizedBasePath}${path}`;
};

function useFurnitureScene(glbPath: string) {
  const resolvedPath = useMemo(() => resolveFurnitureAssetPath(glbPath), [glbPath]);
  const [scene, setScene] = useState<THREE.Object3D | null>(() => gltfSceneCache.get(resolvedPath) ?? null);

  useEffect(() => {
    let cancelled = false;
    if (gltfSceneCache.has(resolvedPath)) {
      setScene(gltfSceneCache.get(resolvedPath) ?? null);
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      resolvedPath,
      (gltf) => {
        if (cancelled) return;
        gltfSceneCache.set(resolvedPath, gltf.scene);
        gltfLoadErrorCache.delete(resolvedPath);
        setScene(gltf.scene);
      },
      undefined,
      (error) => {
        if (cancelled) return;
        gltfSceneCache.set(resolvedPath, null);
        if (!gltfLoadErrorCache.has(resolvedPath)) {
          gltfLoadErrorCache.add(resolvedPath);
          console.error(`Could not load furniture model ${resolvedPath}. Rendering fallback geometry instead.`, error);
        }
        setScene(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [resolvedPath]);

  return { scene, resolvedPath };
}

function FurnitureFallback({
  itemType,
  itemColor,
  opacity = 1,
}: {
  itemType: string;
  itemColor?: string | null;
  opacity?: number;
}) {
  const tint = itemColor ?? FURNITURE_TINT[itemType] ?? "#64748b";
  const [sx, sy, sz] = FURNITURE_SCALE[itemType] ?? [1, 1, 1];
  const safeScale: [number, number, number] = [
    Math.max(0.3, sx * 0.45),
    Math.max(0.2, sy * 0.35),
    Math.max(0.3, sz * 0.45),
  ];

  return (
    <group>
      <mesh castShadow receiveShadow scale={safeScale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={tint} transparent={opacity < 1} opacity={opacity} roughness={0.7} metalness={0.08} />
      </mesh>
    </group>
  );
}

function InstancedFurnitureFallback({
  itemType,
  items,
  onItemClick,
}: {
  itemType: string;
  items: FurnitureItem[];
  onItemClick?: (itemUid: string) => void;
}) {
  return (
    <>
      {items.map((item) => {
        const [wx, , wz] = toWorld(item.x, item.y);
        const yOffset = (FURNITURE_Y_OFFSET[itemType] ?? 0) + (item.elevation ?? 0);
        const rotY = getItemRotationRadians(item);
        const { width, height } = getItemBaseSize(item);
        const pivotX = width * SCALE * 0.5;
        const pivotZ = height * SCALE * 0.5;

        return (
          <group
            key={item._uid}
            position={[wx, yOffset, wz]}
            onClick={(event) => {
              event.stopPropagation();
              onItemClick?.(item._uid);
            }}
          >
            <group position={[pivotX, 0, pivotZ]} rotation={[0, rotY, 0]}>
              <group position={[-pivotX, 0, -pivotZ]}>
                <FurnitureFallback itemType={itemType} itemColor={item.color} />
              </group>
            </group>
          </group>
        );
      })}
    </>
  );
}


type InstancedFurnitureMeshDef = {
  castShadow: boolean;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrixWorld: THREE.Matrix4;
  receiveShadow: boolean;
};

const resolveFurnitureTemplate = (params: {
  glbPath: string;
  itemColor: string | undefined;
  itemType: string;
  scene: THREE.Object3D;
}) => {
  const cacheKey = `${params.glbPath}:${params.itemType}:${params.itemColor ?? ""}`;
  const cached = furnitureTemplateCache.get(cacheKey);
  if (cached) return cached;

  const rawTint =
    params.itemType === "beanbag"
      ? (params.itemColor ?? null)
      : FURNITURE_TINT[params.itemType];
  const tintColor = rawTint ? new THREE.Color(rawTint) : null;
  const template = params.scene.clone(true);
  const castShadow = SHADOW_CASTING_FURNITURE_TYPES.has(params.itemType);

  template.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const templateMats = mats.map((material) => {
      const nextMaterial = material.clone() as THREE.MeshStandardMaterial;
      if (tintColor && "color" in nextMaterial) {
        nextMaterial.color.lerp(tintColor, 0.8);
      }
      if ("roughness" in nextMaterial) nextMaterial.roughness = 0.65;
      if ("metalness" in nextMaterial) nextMaterial.metalness = 0.08;
      nextMaterial.userData = {
        ...nextMaterial.userData,
        furnitureSharedMaterial: true,
      };
      return nextMaterial;
    });
    mesh.material = Array.isArray(mesh.material) ? templateMats : templateMats[0];
  });

  furnitureTemplateCache.set(cacheKey, template);
  return template;
};

const buildFurnitureItemMatrix = (item: FurnitureItem, itemType: string) => {
  const [wx, , wz] = toWorld(item.x, item.y);
  const yOffset = (FURNITURE_Y_OFFSET[itemType] ?? 0) + (item.elevation ?? 0);
  const scale = FURNITURE_SCALE[itemType] ?? [1, 1, 1];
  const rotY = getItemRotationRadians(item);
  const { width, height } = getItemBaseSize(item);
  const pivotX = width * SCALE * 0.5;
  const pivotZ = height * SCALE * 0.5;

  const containerMatrix = new THREE.Matrix4().makeTranslation(wx, yOffset, wz);
  const pivotMatrix = new THREE.Matrix4().makeTranslation(pivotX, 0, pivotZ);
  const rotationMatrix = new THREE.Matrix4().makeRotationY(rotY);
  const unpivotMatrix = new THREE.Matrix4().makeTranslation(-pivotX, 0, -pivotZ);
  const scaleMatrix = new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]);

  return containerMatrix
    .multiply(pivotMatrix)
    .multiply(rotationMatrix)
    .multiply(unpivotMatrix)
    .multiply(scaleMatrix);
};

export function InstancedFurnitureItems({
  itemType,
  items,
  onItemClick,
}: {
  itemType: string;
  items: FurnitureItem[];
  onItemClick?: (itemUid: string) => void;
}) {
  const glbPath = FURNITURE_GLB[itemType] ?? FURNITURE_GLB.table_rect;
  const { scene } = useFurnitureScene(glbPath);
  const template = useMemo(
    () =>
      scene
        ? resolveFurnitureTemplate({
            glbPath,
            itemColor: undefined,
            itemType,
            scene,
          })
        : null,
    [glbPath, itemType, scene],
  );
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const meshDefs = useMemo<InstancedFurnitureMeshDef[]>(() => {
    if (!template) return [];
    template.updateMatrixWorld(true);
    const nextDefs: InstancedFurnitureMeshDef[] = [];
    template.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      nextDefs.push({
        castShadow: mesh.castShadow,
        geometry: mesh.geometry,
        material: mesh.material as THREE.Material,
        matrixWorld: mesh.matrixWorld.clone(),
        receiveShadow: mesh.receiveShadow,
      });
    });
    return nextDefs;
  }, [template]);
  const itemMatrices = useMemo(
    () => items.map((item) => buildFurnitureItemMatrix(item, itemType)),
    [itemType, items],
  );
  const itemUidByInstanceId = useMemo(
    () => items.map((item) => item._uid),
    [items],
  );

  const handleClick = useMemo(
    () =>
      onItemClick
        ? (event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            const instanceId = event.instanceId;
            if (typeof instanceId !== "number") return;
            const itemUid = itemUidByInstanceId[instanceId];
            if (!itemUid) return;
            onItemClick(itemUid);
          }
        : undefined,
    [itemUidByInstanceId, onItemClick],
  );

  useLayoutEffect(() => {
    meshDefs.forEach((def, meshIndex) => {
      const instancedMesh = meshRefs.current[meshIndex];
      if (!instancedMesh) return;
      const worldMatrix = new THREE.Matrix4();
      for (let itemIndex = 0; itemIndex < itemMatrices.length; itemIndex += 1) {
        worldMatrix.multiplyMatrices(itemMatrices[itemIndex], def.matrixWorld);
        instancedMesh.setMatrixAt(itemIndex, worldMatrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMesh.computeBoundingSphere();
    });
  }, [itemMatrices, meshDefs]);

  if (items.length === 0) return null;
  if (!template || meshDefs.length === 0) {
    return <InstancedFurnitureFallback itemType={itemType} items={items} onItemClick={onItemClick} />;
  }

  return (
    <>
      {meshDefs.map((def, meshIndex) => (
        <instancedMesh
          key={`${itemType}-${meshIndex}`}
          ref={(node) => {
            meshRefs.current[meshIndex] = node;
          }}
          args={[def.geometry, def.material, items.length]}
          castShadow={def.castShadow}
          receiveShadow={def.receiveShadow}
          onClick={handleClick}
        />
      ))}
    </>
  );
}

export function FurnitureModel({
  item,
  isSelected,
  isHovered,
  editMode,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  onClick,
}: InteractiveFurnitureModelProps) {
  const itemType = resolveItemTypeKey(item);
  const glbPath = FURNITURE_GLB[itemType] ?? FURNITURE_GLB.table_rect;
  const { scene } = useFurnitureScene(glbPath);
  const template = useMemo(
    () =>
      scene
        ? resolveFurnitureTemplate({
            glbPath,
            itemColor: item.color,
            itemType,
            scene,
          })
        : null,
    [glbPath, item.color, itemType, scene],
  );
  const cloned = useMemo(() => template?.clone(true) ?? null, [template]);
  const [wx, , wz] = toWorld(item.x, item.y);
  const yOffset = (FURNITURE_Y_OFFSET[itemType] ?? 0) + (item.elevation ?? 0);
  const scale = FURNITURE_SCALE[itemType] ?? [1, 1, 1];
  const rotY = getItemRotationRadians(item);
  const { width, height } = getItemBaseSize(item);
  const pivotX = width * SCALE * 0.5;
  const pivotZ = height * SCALE * 0.5;

  useEffect(() => {
    if (!cloned) return;
    const highlightActive = isSelected || (isHovered && editMode);
    cloned.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const nextMats = mats.map((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) {
          return material;
        }
        const hasOwnMaterial = Boolean(material.userData?.furnitureInstanceMaterial);
        let nextMaterial = material;
        if (highlightActive && !hasOwnMaterial) {
          nextMaterial = material.clone();
          nextMaterial.userData = {
            ...material.userData,
            furnitureInstanceMaterial: true,
          };
        }
        if (!("emissive" in nextMaterial)) {
          return nextMaterial;
        }
        if (isSelected) {
          nextMaterial.emissive.set("#fbbf24");
          nextMaterial.emissiveIntensity = 0.35;
        } else if (isHovered && editMode) {
          nextMaterial.emissive.set("#4a90d9");
          nextMaterial.emissiveIntensity = 0.25;
        } else {
          nextMaterial.emissive.set("#000000");
          nextMaterial.emissiveIntensity = 0;
        }
        return nextMaterial;
      });
      mesh.material = Array.isArray(mesh.material) ? nextMats : nextMats[0];
    });
  }, [cloned, editMode, isHovered, isSelected]);

  return (
    <group
      position={[wx, yOffset, wz]}
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
      <group position={[pivotX, 0, pivotZ]} rotation={[0, rotY, 0]}>
        <group position={[-pivotX, 0, -pivotZ]} scale={scale}>
          {cloned ? <primitive object={cloned} /> : <FurnitureFallback itemType={itemType} itemColor={item.color} />}
        </group>
      </group>
    </group>
  );
}

export function PlacementGhost({
  itemType,
  position,
}: {
  itemType: string;
  position: [number, number, number];
}) {
  const glbPath = FURNITURE_GLB[itemType] ?? FURNITURE_GLB.table_rect;
  const { scene } = useFurnitureScene(glbPath);
  const template = useMemo(
    () =>
      scene
        ? resolveFurnitureTemplate({
            glbPath,
            itemColor: undefined,
            itemType,
            scene,
          })
        : null,
    [glbPath, itemType, scene],
  );
  const cloned = useMemo(() => template.clone(true), [template]);
  const scale = FURNITURE_SCALE[itemType] ?? [1, 1, 1];
  const rotY = FURNITURE_ROTATION[itemType] ?? 0;

  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {cloned ? <primitive object={cloned} /> : <FurnitureFallback itemType={itemType} opacity={0.5} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

