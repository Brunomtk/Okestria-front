import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { createDefaultAgentAvatarProfile } from "@/lib/avatars/profile";
import {
  AGENT_SCALE,
  WALK_ANIM_SPEED,
} from "@/features/retro-office/core/constants";
import { toWorld } from "@/features/retro-office/core/geometry";
import type {
  JanitorActor,
  RenderAgent,
} from "@/features/retro-office/core/types";
import { AgentModelProps } from "@/features/retro-office/objects/types";

const normalizeAgentNameLabel = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Agent";
  const compact = trimmed.replace(/\s+/g, " ");
  if (compact.length <= 18) return compact;

  const words = compact.split(" ");
  if (words.length === 1) {
    return `${compact.slice(0, 16)}…`;
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= 18) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === 1) break;
  }
  if (current) lines.push(current);
  const limited = lines.slice(0, 2);
  if (limited.length === 2 && limited[1].length > 18) {
    limited[1] = `${limited[1].slice(0, 16)}…`;
  } else if (limited.length < lines.length) {
    limited[limited.length - 1] = `${limited[limited.length - 1].slice(0, 16)}…`;
  }
  return limited.join("\n");
};

export const AgentModel = memo(function AgentModel({
  agentId,
  name,
  status,
  color,
  appearance,
  agentsRef,
  agentLookupRef,
  onHover,
  onUnhover,
  onClick,
  onContextMenu,
  showSpeech = false,
  speechText = null,
  suppressSpeechBubble = false,
}: AgentModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const statusDotMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const pulseRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const nameplateRef = useRef<THREE.Group>(null);
  const nameplateMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const nameplateAccentMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftEyeHighlightRef = useRef<THREE.Mesh>(null);
  const rightEyeHighlightRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftMouthCornerRef = useRef<THREE.Mesh>(null);
  const rightMouthCornerRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const heldPaddleRef = useRef<THREE.Group>(null);
  const heldPaddleFaceRef = useRef<THREE.MeshStandardMaterial>(null);
  const heldCleaningToolRef = useRef<THREE.Group>(null);
  const heldCleaningHeadRef = useRef<THREE.MeshStandardMaterial>(null);
  const heldBucketRef = useRef<THREE.Group>(null);
  const heldScrubberRef = useRef<THREE.Group>(null);
  const speechBubbleRef = useRef<THREE.Group>(null);
  const speechBubbleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const awayBubbleRef = useRef<THREE.Group>(null);
  const bodyMatRef = useRef<THREE.MeshLambertMaterial>(null);
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const motionTimeRef = useRef(0);
  // Idle animation state
  const idleAnimRef = useRef({
    type: 0 as number, // 0=breathe, 1=lookAround, 2=scratchHead, 3=crossArms, 4=stretch, 5=wave, 6=think, 7=tap, 8=nod, 9=shrug, 10=checkPhone, 11=yawn
    startFrame: 0,
    duration: 300,
    nextChange: 180,
  });
  const headTiltRef = useRef({ x: 0, y: 0 });
  const resolvedAppearance = useMemo(
    () => appearance ?? createDefaultAgentAvatarProfile(agentId),
    [agentId, appearance],
  );
  const nameLabel = useMemo(() => normalizeAgentNameLabel(name), [name]);

  useFrame((_, delta) => {
    motionTimeRef.current += Math.min(0.05, delta) * 60;
    const agent =
      agentLookupRef?.current?.get(agentId) ??
      agentsRef.current?.find((candidate) => candidate.id === agentId);
    if (!agent || !groupRef.current) return;

    const [wx, , wz] = toWorld(agent.x, agent.y);
    pos.current.set(wx, 0, wz);
    const positionLerp = 1 - Math.exp(-Math.min(0.05, delta) * 12);
    groupRef.current.position.lerp(pos.current, positionLerp);

    const targetY = agent.facing;
    let rotDelta = targetY - groupRef.current.rotation.y;
    while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
    while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
    const rotationLerp = 1 - Math.exp(-Math.min(0.05, delta) * 14);
    groupRef.current.rotation.y += rotDelta * rotationLerp;
    const isWorkout = agent.state === "working_out";
    const isDancing = agent.state === "dancing";
    const isJanitor = "role" in agent && agent.role === "janitor";
    const janitorTool = isJanitor
      ? (agent as RenderAgent & JanitorActor).janitorTool
      : undefined;
    const workoutStyle = agent.workoutStyle ?? "lift";
    const motionFrame = motionTimeRef.current + (agent.phaseOffset ?? 0);
    const frameValue = motionFrame + (agent.phaseOffset ?? 0) / WALK_ANIM_SPEED;
    const walkPhase = Math.sin(frameValue * WALK_ANIM_SPEED);
    const workoutPhase = Math.sin(motionFrame * 0.18);
    const workoutPushPhase = Math.sin(motionFrame * 0.18 + Math.PI / 2);
    groupRef.current.rotation.z = 0;
    
    // Idle animation system - select and manage idle behaviors
    const isIdle = agent.state === "standing" && agent.status === "idle";
    const idleAnim = idleAnimRef.current;
    
    if (isIdle) {
      // Check if it's time to change idle animation
      if (agent.frame >= idleAnim.nextChange) {
        // Pick a new random idle animation (weighted towards subtle ones)
        const rand = Math.random();
        if (rand < 0.28) idleAnim.type = 0; // breathe (most common)
        else if (rand < 0.40) idleAnim.type = 1; // lookAround
        else if (rand < 0.48) idleAnim.type = 2; // scratchHead
        else if (rand < 0.56) idleAnim.type = 3; // crossArms
        else if (rand < 0.64) idleAnim.type = 4; // stretch
        else if (rand < 0.71) idleAnim.type = 5; // wave
        else if (rand < 0.77) idleAnim.type = 6; // think
        else if (rand < 0.82) idleAnim.type = 7; // tap foot
        else if (rand < 0.87) idleAnim.type = 8; // nod
        else if (rand < 0.92) idleAnim.type = 9; // shrug
        else if (rand < 0.96) idleAnim.type = 10; // checkPhone
        else idleAnim.type = 11; // yawn
        
        idleAnim.startFrame = agent.frame;
        idleAnim.duration = 180 + Math.random() * 240; // 3-7 seconds at 60fps
        idleAnim.nextChange = agent.frame + idleAnim.duration;
      }
    } else {
      // Reset when not idle
      idleAnim.type = 0;
      idleAnim.nextChange = agent.frame + 60;
    }
    
    const idleProgress = isIdle ? (agent.frame - idleAnim.startFrame) / idleAnim.duration : 0;
    const idlePhase = Math.sin(idleProgress * Math.PI * 2);
    const idleSmoothIn = Math.min(1, idleProgress * 4); // Smooth transition in
    const idleSmoothOut = Math.min(1, (1 - idleProgress) * 4); // Smooth transition out
    const idleSmooth = Math.min(idleSmoothIn, idleSmoothOut);
    
    // Calculate idle body rotation
    let idleBodyRotX = 0;
    let idleBodyRotY = 0;
    let idleBodyRotZ = 0;
    
    if (isIdle) {
      switch (idleAnim.type) {
        case 1: // lookAround - turn head/body side to side
          idleBodyRotY = Math.sin(frameValue * 0.04) * 0.4 * idleSmooth;
          idleBodyRotX = Math.sin(frameValue * 0.025) * 0.03 * idleSmooth;
          break;
        case 3: // crossArms - slight lean back
          idleBodyRotX = -0.06 * idleSmooth;
          break;
        case 4: // stretch - lean back
          idleBodyRotX = (-0.15 + Math.sin(idleProgress * Math.PI) * 0.08) * idleSmooth;
          break;
        case 6: // think - tilt head
          idleBodyRotZ = 0.08 * idleSmooth;
          idleBodyRotX = -0.04 * idleSmooth;
          break;
        case 7: // tap foot - slight body sway
          idleBodyRotZ = Math.sin(frameValue * 0.12) * 0.03 * idleSmooth;
          break;
        case 8: // nod - head bobs
          const nodPhase = Math.sin(frameValue * 0.2) * idleSmooth;
          idleBodyRotX = nodPhase * 0.12;
          break;
        case 11: // yawn - slight lean back
          idleBodyRotX = -0.08 * idleSmooth;
          break;
      }
    }
    
    groupRef.current.rotation.x =
      agent.state === "sitting"
        ? -0.15
        : isDancing
          ? Math.sin(agent.frame * 0.18 + (agent.phaseOffset ?? 0)) * 0.06
          : isWorkout
            ? workoutStyle === "bike"
              ? 0.18
              : workoutStyle === "row"
                ? -0.12 + Math.max(0, workoutPhase) * 0.08
                : workoutStyle === "stretch"
                  ? -0.08
                  : workoutStyle === "run"
                    ? 0.08
                    : workoutStyle === "box"
                      ? 0.04
                      : 0.02
          : agent.pingPongUntil
            ? 0.08
            : idleBodyRotX;
    
    // Apply idle body Y rotation (looking around)
    if (isIdle && idleAnim.type === 1) {
      groupRef.current.rotation.y += idleBodyRotY;
    }
    
    // Apply idle body Z rotation (lean/sway)
    groupRef.current.rotation.z = idleBodyRotZ;
    const bounce =
      agent.state === "walking"
        ? Math.sin(frameValue * WALK_ANIM_SPEED) * 0.04
        : isDancing
          ? 0.03 + Math.abs(Math.sin(agent.frame * 0.22 + (agent.phaseOffset ?? 0))) * 0.05
          : isWorkout
            ? workoutStyle === "stretch"
              ? 0.012 + Math.abs(workoutPhase) * 0.018
              : workoutStyle === "row"
                ? 0.015 + Math.abs(workoutPhase) * 0.028
                : 0.02 + Math.abs(workoutPhase) * 0.04
            : 0;
    
    const idleFloat = isIdle ? Math.sin(frameValue * 0.05) * 0.014 : 0;
    const breathe =
      agent.state === "standing" || isWorkout || agent.pingPongUntil
        ? Math.sin(frameValue * 0.03) * (agent.status === "idle" ? 0.016 : 0.01)
        : 0;
    const errorShakeX =
      agent.status === "error" ? Math.sin(agent.frame * 0.9) * 0.01 : 0;
    const errorShakeZ =
      agent.status === "error" ? Math.cos(agent.frame * 0.72) * 0.007 : 0;
    const statusScale =
      agent.status === "working"
        ? 1.02 + Math.sin(agent.frame * 0.09) * 0.015
        : agent.status === "error"
          ? 1.015 + Math.sin(agent.frame * 0.16) * 0.01
          : 1;
    groupRef.current.position.set(wx + errorShakeX, bounce + breathe + idleFloat, wz + errorShakeZ);
    groupRef.current.scale.setScalar(statusScale);

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = 0;
      leftArmRef.current.rotation.y = 0;
      leftArmRef.current.rotation.z = 0;
      if (isJanitor && janitorTool !== "broom") {
        leftArmRef.current.rotation.x = -0.22;
        leftArmRef.current.rotation.z = -0.08;
      } else if (agent.state === "walking") {
        leftArmRef.current.rotation.x = walkPhase * 0.4;
      } else if (isDancing) {
        leftArmRef.current.rotation.x = -0.8 + Math.sin(agent.frame * 0.22) * 0.9;
        leftArmRef.current.rotation.z = -0.45 + Math.cos(agent.frame * 0.16) * 0.18;
        leftArmRef.current.rotation.y = -0.08;
        groupRef.current.rotation.z = Math.sin(agent.frame * 0.12) * 0.08;
      } else if (isWorkout) {
        if (workoutStyle === "run") {
          leftArmRef.current.rotation.x = -(0.28 + workoutPhase * 1.05);
          leftArmRef.current.rotation.z = -0.08;
        } else if (workoutStyle === "bike") {
          leftArmRef.current.rotation.x = -(1.05 + workoutPushPhase * 0.16);
          leftArmRef.current.rotation.z = -0.18;
          leftArmRef.current.rotation.y = -0.12;
        } else if (workoutStyle === "row") {
          leftArmRef.current.rotation.x = -(
            0.95 -
            Math.max(0, workoutPhase) * 0.7
          );
          leftArmRef.current.rotation.z = -0.16;
          leftArmRef.current.rotation.y = -0.1;
        } else if (workoutStyle === "box") {
          leftArmRef.current.rotation.x = -(
            0.92 +
            Math.max(0, workoutPushPhase) * 0.45
          );
          leftArmRef.current.rotation.z = -0.52;
          leftArmRef.current.rotation.y = -0.06;
          groupRef.current.rotation.z = 0.05;
        } else if (workoutStyle === "stretch") {
          leftArmRef.current.rotation.x = -1.58;
          leftArmRef.current.rotation.z = -0.42;
          leftArmRef.current.rotation.y = -0.08;
        } else {
          leftArmRef.current.rotation.x = -(
            0.28 +
            Math.abs(workoutPhase) * 0.28
          );
          leftArmRef.current.rotation.z = -0.58;
          leftArmRef.current.rotation.y = -0.12;
        }
      } else if (agent.pingPongUntil) {
        leftArmRef.current.rotation.x =
          0.2 + Math.sin(agent.frame * 0.08) * 0.28;
      } else if (agent.state === "sitting") {
        leftArmRef.current.rotation.x = 0.3;
      } else if (isIdle) {
        // Enhanced idle animations for left arm
        const baseBreathX = -0.08 + Math.sin(frameValue * 0.05) * 0.08;
        const baseBreathZ = -0.03 + Math.cos(frameValue * 0.04) * 0.02;
        
        switch (idleAnim.type) {
          case 1: // lookAround - hands on hips
            leftArmRef.current.rotation.x = 0.15 * idleSmooth + baseBreathX * (1 - idleSmooth);
            leftArmRef.current.rotation.z = -0.35 * idleSmooth + baseBreathZ * (1 - idleSmooth);
            leftArmRef.current.rotation.y = 0.2 * idleSmooth;
            break;
          case 2: // scratchHead - left arm stays relaxed
            leftArmRef.current.rotation.x = baseBreathX;
            leftArmRef.current.rotation.z = baseBreathZ;
            break;
          case 3: // crossArms
            leftArmRef.current.rotation.x = (-0.85 - idlePhase * 0.05) * idleSmooth + baseBreathX * (1 - idleSmooth);
            leftArmRef.current.rotation.z = 0.4 * idleSmooth + baseBreathZ * (1 - idleSmooth);
            leftArmRef.current.rotation.y = 0.3 * idleSmooth;
            break;
          case 4: // stretch - arms up
            leftArmRef.current.rotation.x = (-2.8 + Math.sin(idleProgress * Math.PI) * 0.2) * idleSmooth + baseBreathX * (1 - idleSmooth);
            leftArmRef.current.rotation.z = (-0.25 + Math.sin(idleProgress * Math.PI * 2) * 0.1) * idleSmooth + baseBreathZ * (1 - idleSmooth);
            break;
          case 5: // wave - left arm at side
            leftArmRef.current.rotation.x = baseBreathX;
            leftArmRef.current.rotation.z = baseBreathZ;
            break;
          case 6: // think - hand on chin
            leftArmRef.current.rotation.x = (-1.2 - Math.sin(frameValue * 0.03) * 0.05) * idleSmooth + baseBreathX * (1 - idleSmooth);
            leftArmRef.current.rotation.z = 0.15 * idleSmooth + baseBreathZ * (1 - idleSmooth);
            leftArmRef.current.rotation.y = 0.1 * idleSmooth;
            break;
          case 7: // tap foot - arms relaxed with slight sway
            leftArmRef.current.rotation.x = baseBreathX + Math.sin(frameValue * 0.12) * 0.06 * idleSmooth;
            leftArmRef.current.rotation.z = baseBreathZ;
            break;
          case 8: // nod - hands relaxed at sides
            leftArmRef.current.rotation.x = baseBreathX - 0.05 * idleSmooth;
            leftArmRef.current.rotation.z = baseBreathZ;
            break;
          case 9: // shrug - arms slightly raised
            leftArmRef.current.rotation.x = baseBreathX;
            leftArmRef.current.rotation.z = (baseBreathZ - 0.3 * Math.sin(frameValue * 0.15)) * idleSmooth + baseBreathZ * (1 - idleSmooth);
            break;
          case 10: // checkPhone - left arm comes up holding phone
            leftArmRef.current.rotation.x = (-1.8 + Math.sin(frameValue * 0.08) * 0.05) * idleSmooth + baseBreathX * (1 - idleSmooth);
            leftArmRef.current.rotation.z = (-0.3) * idleSmooth + baseBreathZ * (1 - idleSmooth);
            break;
          case 11: // yawn - left arm stays relaxed
            leftArmRef.current.rotation.x = baseBreathX + 0.1 * Math.sin(frameValue * 0.1) * idleSmooth;
            leftArmRef.current.rotation.z = baseBreathZ;
            break;
          default: // 0 - basic breathe
            leftArmRef.current.rotation.x = baseBreathX;
            leftArmRef.current.rotation.z = baseBreathZ;
        }
      }
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = 0;
      rightArmRef.current.rotation.y = 0;
      rightArmRef.current.rotation.z = 0;
      if (isJanitor && janitorTool !== "broom") {
        rightArmRef.current.rotation.x = -0.95;
        rightArmRef.current.rotation.y = 0.18;
        rightArmRef.current.rotation.z = 0.08;
      } else if (agent.state === "walking") {
        rightArmRef.current.rotation.x = -walkPhase * 0.4;
      } else if (isDancing) {
        rightArmRef.current.rotation.x = -0.8 - Math.sin(agent.frame * 0.22) * 0.9;
        rightArmRef.current.rotation.z = 0.45 - Math.cos(agent.frame * 0.16) * 0.18;
        rightArmRef.current.rotation.y = 0.08;
        groupRef.current.rotation.z = Math.sin(agent.frame * 0.12) * 0.08;
      } else if (isWorkout) {
        if (workoutStyle === "run") {
          rightArmRef.current.rotation.x = -(0.28 - workoutPhase * 1.05);
          rightArmRef.current.rotation.z = 0.08;
        } else if (workoutStyle === "bike") {
          rightArmRef.current.rotation.x = -(1.05 - workoutPushPhase * 0.16);
          rightArmRef.current.rotation.z = 0.18;
          rightArmRef.current.rotation.y = 0.12;
        } else if (workoutStyle === "row") {
          rightArmRef.current.rotation.x = -(
            0.95 -
            Math.max(0, -workoutPhase) * 0.7
          );
          rightArmRef.current.rotation.z = 0.16;
          rightArmRef.current.rotation.y = 0.1;
        } else if (workoutStyle === "box") {
          rightArmRef.current.rotation.x = -(
            0.92 +
            Math.max(0, -workoutPushPhase) * 0.45
          );
          rightArmRef.current.rotation.z = 0.52;
          rightArmRef.current.rotation.y = 0.06;
          groupRef.current.rotation.z = -0.05;
        } else if (workoutStyle === "stretch") {
          rightArmRef.current.rotation.x = -1.58;
          rightArmRef.current.rotation.z = 0.42;
          rightArmRef.current.rotation.y = 0.08;
        } else {
          rightArmRef.current.rotation.x = -(
            0.28 +
            Math.abs(workoutPhase) * 0.28
          );
          rightArmRef.current.rotation.z = 0.58;
          rightArmRef.current.rotation.y = 0.12;
        }
      } else if (agent.pingPongUntil) {
        rightArmRef.current.rotation.x =
          0.08 - Math.sin(agent.frame * 0.08) * 0.16;
      } else if (agent.state === "sitting") {
        rightArmRef.current.rotation.x = 0.3;
      } else if (isIdle) {
        // Enhanced idle animations for right arm
        const baseBreathX = 0.08 - Math.sin(frameValue * 0.05) * 0.08;
        const baseBreathZ = 0.03 - Math.cos(frameValue * 0.04) * 0.02;
        
        switch (idleAnim.type) {
          case 1: // lookAround - hands on hips
            rightArmRef.current.rotation.x = 0.15 * idleSmooth + baseBreathX * (1 - idleSmooth);
            rightArmRef.current.rotation.z = 0.35 * idleSmooth + baseBreathZ * (1 - idleSmooth);
            rightArmRef.current.rotation.y = -0.2 * idleSmooth;
            break;
          case 2: // scratchHead - right hand scratches head
            rightArmRef.current.rotation.x = (-2.2 + Math.sin(frameValue * 0.15) * 0.15) * idleSmooth + baseBreathX * (1 - idleSmooth);
            rightArmRef.current.rotation.z = (0.3 + Math.sin(frameValue * 0.2) * 0.08) * idleSmooth + baseBreathZ * (1 - idleSmooth);
            rightArmRef.current.rotation.y = (-0.2 + Math.cos(frameValue * 0.15) * 0.05) * idleSmooth;
            break;
          case 3: // crossArms
            rightArmRef.current.rotation.x = (-0.85 + idlePhase * 0.05) * idleSmooth + baseBreathX * (1 - idleSmooth);
            rightArmRef.current.rotation.z = -0.4 * idleSmooth + baseBreathZ * (1 - idleSmooth);
            rightArmRef.current.rotation.y = -0.3 * idleSmooth;
            break;
          case 4: // stretch - arms up
            rightArmRef.current.rotation.x = (-2.8 + Math.sin(idleProgress * Math.PI) * 0.2) * idleSmooth + baseBreathX * (1 - idleSmooth);
            rightArmRef.current.rotation.z = (0.25 - Math.sin(idleProgress * Math.PI * 2) * 0.1) * idleSmooth + baseBreathZ * (1 - idleSmooth);
            break;
          case 5: // wave - right arm waves
            const wavePhase = Math.sin(frameValue * 0.25) * idleSmooth;
            rightArmRef.current.rotation.x = (-2.5 + wavePhase * 0.3) * idleSmooth + baseBreathX * (1 - idleSmooth);
            rightArmRef.current.rotation.z = (0.6 + wavePhase * 0.2) * idleSmooth + baseBreathZ * (1 - idleSmooth);
            rightArmRef.current.rotation.y = -0.1 * idleSmooth;
            break;
          case 6: // think - arm at side, slight movement
            rightArmRef.current.rotation.x = baseBreathX + Math.sin(frameValue * 0.04) * 0.05 * idleSmooth;
            rightArmRef.current.rotation.z = baseBreathZ;
            break;
          case 7: // tap foot - arms relaxed with slight sway
            rightArmRef.current.rotation.x = baseBreathX - Math.sin(frameValue * 0.12) * 0.06 * idleSmooth;
            rightArmRef.current.rotation.z = baseBreathZ;
            break;
          case 8: // nod - hands relaxed
            rightArmRef.current.rotation.x = baseBreathX - 0.05 * idleSmooth;
            rightArmRef.current.rotation.z = -baseBreathZ;
            break;
          case 9: // shrug - arms slightly raised
            rightArmRef.current.rotation.x = baseBreathX;
            rightArmRef.current.rotation.z = (-baseBreathZ + 0.3 * Math.sin(frameValue * 0.15)) * idleSmooth + (-baseBreathZ) * (1 - idleSmooth);
            break;
          case 10: // checkPhone - right arm relaxed
            rightArmRef.current.rotation.x = baseBreathX - 0.08 * idleSmooth;
            rightArmRef.current.rotation.z = -baseBreathZ;
            break;
          case 11: // yawn - right arm stretches up slightly
            rightArmRef.current.rotation.x = (-1.2 + Math.sin(frameValue * 0.1) * 0.15) * idleSmooth + baseBreathX * (1 - idleSmooth);
            rightArmRef.current.rotation.z = (0.4) * idleSmooth + (-baseBreathZ) * (1 - idleSmooth);
            break;
          default: // 0 - basic breathe
            rightArmRef.current.rotation.x = baseBreathX;
            rightArmRef.current.rotation.z = baseBreathZ;
        }
      }
    }
    if (leftLegRef.current) {
      let leftLegX = 0;
      if (agent.state === "walking") {
        leftLegX = walkPhase * 0.35;
      } else if (isDancing) {
        leftLegX = Math.sin(agent.frame * 0.22 + (agent.phaseOffset ?? 0)) * 0.35;
      } else if (isWorkout) {
        if (workoutStyle === "run") leftLegX = workoutPhase * 0.7;
        else if (workoutStyle === "bike") leftLegX = workoutPhase * 0.82;
        else if (workoutStyle === "row") leftLegX = 0.14 + Math.max(0, workoutPhase) * 0.42;
        else if (workoutStyle === "stretch") leftLegX = -0.2 + Math.abs(workoutPhase) * 0.08;
        else if (workoutStyle === "box") leftLegX = 0.06 + workoutPhase * 0.14;
        else leftLegX = workoutPhase * 0.18;
      } else if (isIdle && idleAnim.type === 7) {
        // Tap foot animation - left leg taps
        leftLegX = Math.max(0, Math.sin(frameValue * 0.2)) * 0.12 * idleSmooth;
      } else if (isIdle && idleAnim.type === 4) {
        // Stretch - slight leg movement
        leftLegX = Math.sin(idleProgress * Math.PI) * 0.05 * idleSmooth;
      }
      leftLegRef.current.rotation.x = leftLegX;
    }
    if (rightLegRef.current) {
      let rightLegX = 0;
      if (agent.state === "walking") {
        rightLegX = -walkPhase * 0.35;
      } else if (isDancing) {
        rightLegX = -Math.sin(agent.frame * 0.22 + (agent.phaseOffset ?? 0)) * 0.35;
      } else if (isWorkout) {
        if (workoutStyle === "run") rightLegX = -workoutPhase * 0.7;
        else if (workoutStyle === "bike") rightLegX = -workoutPhase * 0.82;
        else if (workoutStyle === "row") rightLegX = 0.14 + Math.max(0, -workoutPhase) * 0.42;
        else if (workoutStyle === "stretch") rightLegX = -0.12 + Math.abs(workoutPhase) * 0.08;
        else if (workoutStyle === "box") rightLegX = 0.06 - workoutPhase * 0.14;
        else rightLegX = -workoutPhase * 0.18;
      } else if (isIdle && idleAnim.type === 4) {
        // Stretch - slight leg movement
        rightLegX = -Math.sin(idleProgress * Math.PI) * 0.05 * idleSmooth;
      }
      rightLegRef.current.rotation.x = rightLegX;
    }

    const working =
      agent.state === "sitting" || isWorkout || isDancing || agent.status === "working";
    const isError = agent.status === "error";
    const isAway = agent.state === "away";

    if (statusDotMatRef.current) {
      statusDotMatRef.current.color.set(
        isError ? "#ef4444" : working ? "#22c55e" : "#f59e0b",
      );
    }

    if (pulseRingRef.current && pulseRingMatRef.current) {
      const pulse =
        (Math.sin(agent.frame * (isError ? 0.15 : working ? 0.08 : 0.05)) + 1) /
        2;
      const scale = isError
        ? 1.24 + pulse * 0.52
        : working
          ? 1.18 + pulse * 0.74
          : 1.08 + pulse * 0.18;
      pulseRingRef.current.scale.setScalar(scale);
      pulseRingMatRef.current.color.set(
        isError ? "#ef4444" : working ? "#22c55e" : "#38bdf8",
      );
      pulseRingMatRef.current.opacity = isError
        ? 0.68 - pulse * 0.24
        : working
          ? 0.52 - pulse * 0.4
          : 0.18 + pulse * 0.08;
      pulseRingRef.current.visible = true;
    }

    if (nameplateRef.current) {
      const pulse =
        (Math.sin(agent.frame * (isError ? 0.16 : working ? 0.09 : 0.05)) + 1) /
        2;
      const scale = isError
        ? 1.035 + pulse * 0.03
        : working
          ? 1.02 + pulse * 0.025
          : 1.01 + pulse * 0.01;
      nameplateRef.current.scale.set(scale, scale, 1);
      nameplateRef.current.position.y = working ? pulse * 0.012 : pulse * 0.008;
    }
    if (nameplateMatRef.current) {
      nameplateMatRef.current.opacity = isError
        ? 0.94
        : working
          ? 0.9
          : 0.82;
      nameplateMatRef.current.color.set(
        isError ? "#17090c" : working ? "#07130d" : "#080c14",
      );
    }
    if (nameplateAccentMatRef.current) {
      nameplateAccentMatRef.current.color.set(
        isError ? "#ef4444" : working ? "#22c55e" : color,
      );
    }

    if (awayBubbleRef.current) awayBubbleRef.current.visible = isAway;
    if (bodyMatRef.current) bodyMatRef.current.opacity = isAway ? 0.45 : 1;
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshLambertMaterial
        ) {
          child.material.transparent = isAway;
          child.material.opacity = isAway ? 0.45 : 1;
        }
      });
    }

    const blinkSeed = agentId
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const blinkCycle = isAway ? 180 : isError ? 120 : working ? 170 : 240;
    const blinkWindow = isAway ? 26 : isError ? 18 : 12;
    const blinkPhase = (agent.frame + blinkSeed * 17) % blinkCycle;
    let eyeOpen = isError ? 0.92 : working ? 0.84 : 1.12;

    if (blinkPhase < blinkWindow) {
      const midpoint = blinkWindow / 2;
      eyeOpen *= Math.min(1, Math.abs(blinkPhase - midpoint) / midpoint);
    }
    if (working) eyeOpen = Math.max(0.48, eyeOpen);
    if (isError) eyeOpen = Math.max(0.28, eyeOpen);
    if (isAway) eyeOpen = Math.min(eyeOpen, 0.2);

    const eyeScaleX = isError ? 1.2 : working ? 1.06 : 1.12;
    const eyeScaleY = Math.max(0.05, eyeOpen);
    const eyeOffsetY =
      (working ? -0.006 : 0) +
      (isError ? -0.004 : 0) +
      (agent.state === "walking" ? 0.004 : 0) +
      (isAway ? -0.008 : 0);

    for (const eyeRef of [leftEyeRef, rightEyeRef]) {
      if (!eyeRef.current) continue;
      eyeRef.current.scale.x = eyeScaleX;
      eyeRef.current.scale.y = eyeScaleY;
      eyeRef.current.position.y = 0.475 + eyeOffsetY;
    }
    for (const highlightRef of [leftEyeHighlightRef, rightEyeHighlightRef]) {
      if (!highlightRef.current) continue;
      highlightRef.current.visible = eyeOpen > 0.45 && !isAway;
      highlightRef.current.position.y = 0.482 + eyeOffsetY;
    }

    if (mouthRef.current) {
      mouthRef.current.rotation.z = 0;
      mouthRef.current.position.set(0, 0.436, 0.074);
      if (isAway) {
        mouthRef.current.scale.set(0.5, 0.12, 1);
        mouthRef.current.position.y = 0.434;
      } else if (isError) {
        mouthRef.current.scale.set(1.28, 0.16, 1);
        mouthRef.current.position.y = 0.43;
      } else if (working) {
        mouthRef.current.scale.set(0.92, 0.14, 1);
        mouthRef.current.position.y = 0.437;
      } else if (agent.state === "walking") {
        const talkPulse =
          0.38 + (Math.sin(agent.frame * 0.14 + blinkSeed) + 1) * 0.22;
        mouthRef.current.scale.set(0.95, talkPulse, 1);
      } else {
        mouthRef.current.scale.set(1.35, 0.34, 1);
        mouthRef.current.position.y = 0.428;
      }
    }

    const showSmileCorners =
      !isAway && !isError && !working && agent.state !== "walking";
    const showFrownCorners = isError;
    if (leftMouthCornerRef.current && rightMouthCornerRef.current) {
      leftMouthCornerRef.current.visible = showSmileCorners || showFrownCorners;
      rightMouthCornerRef.current.visible =
        showSmileCorners || showFrownCorners;
      leftMouthCornerRef.current.position.set(-0.031, 0.434, 0.074);
      rightMouthCornerRef.current.position.set(0.031, 0.434, 0.074);
      if (showFrownCorners) {
        leftMouthCornerRef.current.rotation.z = -0.6;
        rightMouthCornerRef.current.rotation.z = 0.6;
        leftMouthCornerRef.current.position.y = 0.425;
        rightMouthCornerRef.current.position.y = 0.425;
      } else if (showSmileCorners) {
        leftMouthCornerRef.current.rotation.z = 0.62;
        rightMouthCornerRef.current.rotation.z = -0.62;
        leftMouthCornerRef.current.position.y = 0.438;
        rightMouthCornerRef.current.position.y = 0.438;
      }
    }

    if (leftBrowRef.current && rightBrowRef.current) {
      leftBrowRef.current.position.y = 0.52;
      rightBrowRef.current.position.y = 0.52;
      if (isAway) {
        leftBrowRef.current.rotation.z = -0.24;
        rightBrowRef.current.rotation.z = 0.24;
        leftBrowRef.current.position.y = 0.512;
        rightBrowRef.current.position.y = 0.512;
      } else if (isError) {
        leftBrowRef.current.rotation.z = 0.42;
        rightBrowRef.current.rotation.z = -0.42;
        leftBrowRef.current.position.y = 0.516;
        rightBrowRef.current.position.y = 0.516;
      } else if (working) {
        leftBrowRef.current.rotation.z = 0.3;
        rightBrowRef.current.rotation.z = -0.3;
      } else {
        leftBrowRef.current.rotation.z = -0.18;
        rightBrowRef.current.rotation.z = 0.18;
        leftBrowRef.current.position.y = 0.526;
        rightBrowRef.current.position.y = 0.526;
      }
    }

    const ambientBubbleVisible =
      (!suppressSpeechBubble && isError) ||
      (!isAway &&
        !suppressSpeechBubble &&
        !working &&
        !isError &&
        agent.state === "standing" &&
        (agent.frame + blinkSeed * 11) % 320 < 42);
    const bumpTalking = (agent.bumpTalkUntil ?? 0) > Date.now();

    if (speechBubbleRef.current) {
      const bubbleVisible =
        !suppressSpeechBubble &&
        (showSpeech || bumpTalking || ambientBubbleVisible);
      speechBubbleRef.current.visible = bubbleVisible;
      if (bubbleVisible) {
        const bubbleBob = Math.sin(agent.frame * (showSpeech ? 0.08 : 0.05)) * 0.02;
        speechBubbleRef.current.position.y = 1.18 + bubbleBob;
        if (showSpeech && speechText?.trim()) {
          speechBubbleRef.current.scale.setScalar(1.02 + Math.sin(agent.frame * 0.08) * 0.015);
        } else {
          const pulseBase = isError
            ? 1.06
            : showSpeech || bumpTalking
              ? 1.03
              : 0.98;
          const pulse =
            pulseBase + Math.sin(agent.frame * (isError ? 0.18 : 0.12)) * 0.06;
          speechBubbleRef.current.scale.setScalar(pulse);
        }
      }
    }

    if (speechBubbleMatRef.current) {
      speechBubbleMatRef.current.color.set(
        isError ? "#3a1016" : working ? "#1d2a17" : "#1a2030",
      );
      speechBubbleMatRef.current.opacity = isError ? 0.97 : 0.92;
    }

    if (heldPaddleRef.current) {
      const isPlaying = agent.pingPongUntil !== undefined;
      heldPaddleRef.current.visible = isPlaying;
      if (isPlaying) {
        const swing = Math.sin(agent.frame * 0.08);
        heldPaddleRef.current.position.set(-0.01, -0.21, 0.07 + swing * 0.015);
        heldPaddleRef.current.rotation.set(-0.55 + swing * 0.1, 0.25, -0.35);
      }
    }

    if (heldPaddleFaceRef.current) {
      heldPaddleFaceRef.current.color.set(
        agent.pingPongSide === 0 ? "#1f4fa8" : "#c53b30",
      );
    }

    if (heldCleaningToolRef.current) {
      const showBroom = isJanitor && janitorTool === "broom";
      heldCleaningToolRef.current.visible = showBroom;
      if (showBroom) {
        const sweep =
          agent.state === "walking" ? Math.sin(agent.frame * 0.08) * 0.08 : 0;
        heldCleaningToolRef.current.position.set(
          -0.02,
          -0.2,
          0.08 + sweep * 0.06,
        );
        heldCleaningToolRef.current.rotation.set(-0.8, 0.18, -0.18);
      }
    }

    if (heldCleaningHeadRef.current) {
      heldCleaningHeadRef.current.color.set("#facc15");
    }

    if (heldBucketRef.current) {
      const showVacuum = isJanitor && janitorTool === "vacuum";
      heldBucketRef.current.visible = showVacuum;
      if (showVacuum) {
        heldBucketRef.current.position.set(-0.08, -0.1, 0.18);
        heldBucketRef.current.rotation.set(-0.32, 0.22, -0.38);
      }
    }

    if (heldScrubberRef.current) {
      const showScrubber = isJanitor && janitorTool === "floor_scrubber";
      heldScrubberRef.current.visible = showScrubber;
      if (showScrubber) {
        heldScrubberRef.current.position.set(-0.1, -0.08, 0.2);
        heldScrubberRef.current.rotation.set(-0.28, 0.18, -0.42);
      }
    }
  });

  const skin = resolvedAppearance.body.skinTone;
  const topColor = resolvedAppearance.clothing.topColor;
  const trouserColor = resolvedAppearance.clothing.bottomColor;
  const shoeColor = resolvedAppearance.clothing.shoesColor;
  const hairColor = resolvedAppearance.hair.color;
  const hairStyle = resolvedAppearance.hair.style;
  const topStyle = resolvedAppearance.clothing.topStyle;
  const bottomStyle = resolvedAppearance.clothing.bottomStyle;
  const hatStyle = resolvedAppearance.accessories.hatStyle;
  const accessoryColor = topColor;
  const sleeveColor = topStyle === "jacket" ? "#dbe4ff" : topColor;
  const cuffColor = topStyle === "hoodie" ? "#d1d5db" : sleeveColor;
  const topAccentColor = topStyle === "jacket" ? "#1f2937" : cuffColor;

  // NEW: Extract new profile fields with safe defaults
  const facialHair = resolvedAppearance.face?.facialHair ?? "none";
  const facialHairColor = resolvedAppearance.face?.facialHairColor ?? hairColor;
  const glassesStyle = typeof resolvedAppearance.accessories?.glasses === "string"
    ? resolvedAppearance.accessories.glasses
    : (resolvedAppearance.accessories?.glasses ? "square" : "none");
  const earringStyle = resolvedAppearance.accessories?.earrings ?? "none";
  const watchStyle = resolvedAppearance.accessories?.watch ?? "none";
  const neckwearStyle = resolvedAppearance.accessories?.neckwear ?? "none";
  const bodyBuild = resolvedAppearance.body?.build ?? "average";
  const showHeadset = resolvedAppearance.accessories.headset;
  const showBackpack = resolvedAppearance.accessories.backpack;

  // NEW: Build scale factors based on body type
  const buildScale = {
    average: { torsoW: 1, torsoH: 1, limbW: 1 },
    slim: { torsoW: 0.85, torsoH: 1.02, limbW: 0.88 },
    athletic: { torsoW: 1.06, torsoH: 1, limbW: 1.05 },
    stocky: { torsoW: 1.16, torsoH: 0.95, limbW: 1.12 },
  }[bodyBuild];

  // Helper: check if should show glasses
  const showGlasses = glassesStyle !== "none";

  const faceTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(0, 0, 64, 10);
    ctx.fillStyle = "rgba(196,122,84,0.18)";
    ctx.beginPath();
    ctx.arc(18, 38, 7, 0, Math.PI * 2);
    ctx.arc(46, 38, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8a06e";
    ctx.fillRect(30, 28, 4, 10);
    ctx.fillRect(29, 37, 6, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [skin]);

  const resolvedSpeechText =
    showSpeech && speechText?.trim()
      ? speechText.trim()
      : status === "error"
        ? "error"
        : "...";
  const activeSpeechBubble = showSpeech && Boolean(speechText?.trim());
  const normalizedSpeechBubbleText = activeSpeechBubble
    ? resolvedSpeechText.replace(/\s+/g, " ").trim()
    : resolvedSpeechText;
  const speechBubbleDisplayText = normalizedSpeechBubbleText;
  const speechBubbleTextLength = speechBubbleDisplayText.length;
  const speechBubbleWidth = activeSpeechBubble
    ? Math.min(4.6, Math.max(1.8, 1.55 + speechBubbleTextLength * 0.018))
    : 0.36;
  const speechBubblePaddingX = activeSpeechBubble ? 0.34 : 0.06;
  const speechBubblePaddingY = activeSpeechBubble ? 0.3 : 0.06;
  const speechBubbleMaxWidth = Math.max(
    0.24,
    speechBubbleWidth - speechBubblePaddingX,
  );
  const estimatedSpeechCharsPerLine = activeSpeechBubble
    ? Math.max(10, Math.floor(speechBubbleMaxWidth * 7))
    : 8;
  const estimatedSpeechLines = activeSpeechBubble
    ? Math.max(
        1,
        Math.ceil(speechBubbleTextLength / estimatedSpeechCharsPerLine),
      )
    : 1;
  const speechBubbleHeight = activeSpeechBubble
    ? Math.max(0.72, estimatedSpeechLines * 0.26 + speechBubblePaddingY)
    : 0.2;
  const speechBubbleFontSize = activeSpeechBubble
    ? speechBubbleTextLength > 110
      ? 0.188
      : speechBubbleTextLength > 70
        ? 0.2
        : 0.216
    : 0.13;
  const speechBubbleTextColor = activeSpeechBubble
    ? "#f8fafc"
    : status === "error"
      ? "#ff9aa5"
      : status === "working"
        ? "#b9f99d"
        : "#a0c8ff";
  const speechBubbleBorderColor = activeSpeechBubble
    ? status === "error"
      ? "#ff7f93"
      : status === "working"
        ? "#93f57d"
        : "#8dc4ff"
    : "transparent";
  const speechBubbleBorderInset = activeSpeechBubble ? 0.03 : 0;

  return (
    <group
      ref={groupRef}
      scale={[AGENT_SCALE, AGENT_SCALE * 1.1, AGENT_SCALE]}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover?.(agentId);
      }}
      onPointerOut={() => onUnhover?.()}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(agentId);
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
        const nativeEvent = event.nativeEvent as MouseEvent;
        onContextMenu?.(agentId, nativeEvent.clientX, nativeEvent.clientY);
      }}
    >
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 12]} />
        <meshBasicMaterial color="#000" transparent opacity={0.2} />
      </mesh>
      {/* RIGHT LEG */}
      <group ref={rightLegRef} position={[-0.045, 0.1, 0]}>
        {bottomStyle === "shorts" ? (
          <>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.08, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            <mesh position={[0, -0.045, 0]}>
              <boxGeometry args={[0.05 * buildScale.limbW, 0.06, 0.05]} />
              <meshLambertMaterial color={skin} />
            </mesh>
          </>
        ) : bottomStyle === "skirt" ? (
          <>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.12 * buildScale.limbW, 0.12, 0.1]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
          </>
        ) : bottomStyle === "cargo" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Cargo pocket */}
            <mesh position={[-0.04, 0.005, 0.03]}>
              <boxGeometry args={[0.02, 0.04, 0.014]} />
              <meshLambertMaterial color="#555" />
            </mesh>
            <mesh position={[0.04, 0.005, 0.03]}>
              <boxGeometry args={[0.02, 0.04, 0.014]} />
              <meshLambertMaterial color="#555" />
            </mesh>
          </>
        ) : bottomStyle === "overalls" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Overalls straps */}
            <mesh position={[-0.03, 0.08, 0.035]}>
              <boxGeometry args={[0.01, 0.16, 0.008]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
          </>
        ) : bottomStyle === "joggers" ? (
          <>
            <mesh>
              <boxGeometry args={[0.075 * buildScale.limbW, 0.14, 0.085]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Cuffs at bottom */}
            <mesh position={[0, -0.07, 0]}>
              <boxGeometry args={[0.078 * buildScale.limbW, 0.018, 0.088]} />
              <meshLambertMaterial color="#555" />
            </mesh>
          </>
        ) : bottomStyle === "formal" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Crease line */}
            <mesh position={[0, 0.04, 0.04]}>
              <boxGeometry args={[0.008, 0.12, 0.004]} />
              <meshLambertMaterial color="#333" />
            </mesh>
          </>
        ) : (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {bottomStyle === "cuffed" ? (
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.074 * buildScale.limbW, 0.022, 0.084]} />
                <meshLambertMaterial color="#d1d5db" />
              </mesh>
            ) : null}
          </>
        )}
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[0.07 * buildScale.limbW, 0.05, 0.12]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>
      {/* LEFT LEG */}
      <group ref={leftLegRef} position={[0.045, 0.1, 0]}>
        {bottomStyle === "shorts" ? (
          <>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.08, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            <mesh position={[0, -0.045, 0]}>
              <boxGeometry args={[0.05 * buildScale.limbW, 0.06, 0.05]} />
              <meshLambertMaterial color={skin} />
            </mesh>
          </>
        ) : bottomStyle === "skirt" ? (
          <>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.12 * buildScale.limbW, 0.12, 0.1]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
          </>
        ) : bottomStyle === "cargo" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Cargo pocket */}
            <mesh position={[-0.04, 0.005, 0.03]}>
              <boxGeometry args={[0.02, 0.04, 0.014]} />
              <meshLambertMaterial color="#555" />
            </mesh>
            <mesh position={[0.04, 0.005, 0.03]}>
              <boxGeometry args={[0.02, 0.04, 0.014]} />
              <meshLambertMaterial color="#555" />
            </mesh>
          </>
        ) : bottomStyle === "overalls" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Overalls straps */}
            <mesh position={[0.03, 0.08, 0.035]}>
              <boxGeometry args={[0.01, 0.16, 0.008]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
          </>
        ) : bottomStyle === "joggers" ? (
          <>
            <mesh>
              <boxGeometry args={[0.075 * buildScale.limbW, 0.14, 0.085]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Cuffs at bottom */}
            <mesh position={[0, -0.07, 0]}>
              <boxGeometry args={[0.078 * buildScale.limbW, 0.018, 0.088]} />
              <meshLambertMaterial color="#555" />
            </mesh>
          </>
        ) : bottomStyle === "formal" ? (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {/* Crease line */}
            <mesh position={[0, 0.04, 0.04]}>
              <boxGeometry args={[0.008, 0.12, 0.004]} />
              <meshLambertMaterial color="#333" />
            </mesh>
          </>
        ) : (
          <>
            <mesh>
              <boxGeometry args={[0.07 * buildScale.limbW, 0.14, 0.08]} />
              <meshLambertMaterial color={trouserColor} />
            </mesh>
            {bottomStyle === "cuffed" ? (
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.074 * buildScale.limbW, 0.022, 0.084]} />
                <meshLambertMaterial color="#d1d5db" />
              </mesh>
            ) : null}
          </>
        )}
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[0.07 * buildScale.limbW, 0.05, 0.12]} />
          <meshLambertMaterial color={shoeColor} />
        </mesh>
      </group>
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
      {/* TORSO */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.18 * buildScale.torsoW, 0.2 * buildScale.torsoH, 0.1]} />
        <meshLambertMaterial ref={bodyMatRef} color={topColor} />
      </mesh>
      {topStyle === "hoodie" ? (
        <>
          <mesh position={[0, 0.35, -0.045]}>
            <boxGeometry args={[0.17 * buildScale.torsoW, 0.1, 0.03]} />
            <meshLambertMaterial color={topColor} />
          </mesh>
          <mesh position={[0, 0.22, 0.056]}>
            <boxGeometry args={[0.11 * buildScale.torsoW, 0.03, 0.012]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        </>
      ) : null}
      {topStyle === "jacket" ? (
        <>
          <mesh position={[0, 0.28, 0.056]}>
            <boxGeometry args={[0.182 * buildScale.torsoW, 0.21 * buildScale.torsoH, 0.012]} />
            <meshLambertMaterial color={topAccentColor} />
          </mesh>
          <mesh position={[0, 0.28, 0.063]}>
            <boxGeometry args={[0.034 * buildScale.torsoW, 0.2 * buildScale.torsoH, 0.01]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Polo collar */}
      {topStyle === "polo" ? (
        <mesh position={[0, 0.36, 0.055]}>
          <boxGeometry args={[0.14 * buildScale.torsoW, 0.025, 0.02]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {/* NEW: Suit lapels */}
      {topStyle === "suit" ? (
        <>
          <mesh position={[-0.045, 0.32, 0.054]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.05, 0.08, 0.008]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0.045, 0.32, 0.054]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.05, 0.08, 0.008]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Dress shirt collar and button line */}
      {topStyle === "dress_shirt" ? (
        <>
          <mesh position={[0, 0.36, 0.055]}>
            <boxGeometry args={[0.15 * buildScale.torsoW, 0.03, 0.02]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 0.28, 0.058]}>
            <boxGeometry args={[0.008, 0.18, 0.006]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Lab coat (longer overlay) */}
      {topStyle === "lab_coat" ? (
        <>
          <mesh position={[0, 0.24, 0.08]}>
            <boxGeometry args={[0.19 * buildScale.torsoW, 0.28, 0.08]} />
            <meshLambertMaterial color="#f5ead0" />
          </mesh>
          <mesh position={[0, 0.28, 0.083]}>
            <boxGeometry args={[0.04, 0.15, 0.005]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Sweater (thicker with ribbed bottom) */}
      {topStyle === "sweater" ? (
        <mesh position={[0, 0.2, 0.02]}>
          <boxGeometry args={[0.185 * buildScale.torsoW, 0.22, 0.12]} />
          <meshLambertMaterial color={topColor} />
        </mesh>
      ) : null}
      {/* RIGHT ARM */}
      <group ref={rightArmRef} position={[-0.12, 0.28, 0]}>
        {(topStyle !== "tank_top" && topStyle !== "vest") && (
          <mesh position={[0, -0.08, 0]}>
            <boxGeometry args={[0.06 * buildScale.limbW, 0.16, 0.06]} />
            <meshLambertMaterial color={sleeveColor} />
          </mesh>
        )}
        {topStyle === "tank_top" || topStyle === "vest" ? (
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.065 * buildScale.limbW, 0.08, 0.065]} />
            <meshLambertMaterial color={skin} />
          </mesh>
        ) : null}
        {topStyle === "hoodie" ? (
          <mesh position={[0, -0.145, 0]}>
            <boxGeometry args={[0.064 * buildScale.limbW, 0.03, 0.064]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        ) : null}
        <mesh position={[0, -0.17, 0]}>
          <boxGeometry args={[0.05 * buildScale.limbW, 0.05, 0.05]} />
          <meshLambertMaterial color={skin} />
        </mesh>
        <group
          ref={heldPaddleRef}
          position={[-0.01, -0.21, 0.07]}
          visible={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.012, 18]} />
            <meshStandardMaterial
              ref={heldPaddleFaceRef}
              color="#c53b30"
              roughness={0.72}
            />
          </mesh>
          <mesh position={[0, -0.045, -0.015]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.014, 0.07, 0.014]} />
            <meshStandardMaterial color="#c59a68" roughness={0.74} />
          </mesh>
        </group>
        <group
          ref={heldCleaningToolRef}
          position={[-0.02, -0.2, 0.08]}
          rotation={[-0.8, 0.18, -0.18]}
          visible={false}
        >
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.012, 0.28, 0.012]} />
            <meshStandardMaterial color="#9a6b3c" roughness={0.76} />
          </mesh>
          <mesh position={[0, -0.28, 0.012]}>
            <boxGeometry args={[0.09, 0.028, 0.03]} />
            <meshStandardMaterial
              ref={heldCleaningHeadRef}
              color="#facc15"
              roughness={0.68}
            />
          </mesh>
        </group>
        {/* Vacuum cleaner: larger upright silhouette so it reads clearly in-scene. */}
        <group
          ref={heldBucketRef}
          position={[-0.08, -0.1, 0.18]}
          visible={false}
        >
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.015, 0.3, 0.015]} />
            <meshStandardMaterial color="#555" roughness={0.72} />
          </mesh>
          <mesh position={[0.025, -0.16, 0]}>
            <boxGeometry args={[0.08, 0.12, 0.07]} />
            <meshStandardMaterial color="#dc2626" roughness={0.48} />
          </mesh>
          <mesh position={[0.05, -0.24, 0.02]}>
            <boxGeometry args={[0.11, 0.024, 0.06]} />
            <meshStandardMaterial color="#1f2937" roughness={0.65} />
          </mesh>
          <mesh position={[0.02, -0.11, 0.035]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.03, 0.005, 10, 18, Math.PI]} />
            <meshStandardMaterial
              color="#94a3b8"
              roughness={0.36}
              metalness={0.18}
            />
          </mesh>
        </group>
        {/* Floor scrubber: prominent handle, body, and wide cleaning base. */}
        <group
          ref={heldScrubberRef}
          position={[-0.1, -0.08, 0.2]}
          visible={false}
        >
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.015, 0.32, 0.015]} />
            <meshStandardMaterial color="#777" roughness={0.7} />
          </mesh>
          <mesh position={[0.035, -0.17, 0]}>
            <boxGeometry args={[0.085, 0.08, 0.065]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.46} />
          </mesh>
          <mesh position={[0.06, -0.27, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.018, 24]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.52} />
          </mesh>
          <mesh position={[0.06, -0.23, 0.02]}>
            <boxGeometry args={[0.12, 0.018, 0.07]} />
            <meshStandardMaterial color="#1f2937" roughness={0.6} />
          </mesh>
        </group>
      </group>
      {/* LEFT ARM */}
      <group ref={leftArmRef} position={[0.12, 0.28, 0]}>
        {(topStyle !== "tank_top" && topStyle !== "vest") && (
          <mesh position={[0, -0.08, 0]}>
            <boxGeometry args={[0.06 * buildScale.limbW, 0.16, 0.06]} />
            <meshLambertMaterial color={sleeveColor} />
          </mesh>
        )}
        {topStyle === "tank_top" || topStyle === "vest" ? (
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.065 * buildScale.limbW, 0.08, 0.065]} />
            <meshLambertMaterial color={skin} />
          </mesh>
        ) : null}
        {topStyle === "hoodie" ? (
          <mesh position={[0, -0.145, 0]}>
            <boxGeometry args={[0.064 * buildScale.limbW, 0.03, 0.064]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
        ) : null}
        <mesh position={[0, -0.17, 0]}>
          <boxGeometry args={[0.05 * buildScale.limbW, 0.05, 0.05]} />
          <meshLambertMaterial color={skin} />
        </mesh>
      </group>
      <mesh position={[0, 0.39, 0]}>
        <boxGeometry args={[0.07, 0.05, 0.07]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[0.16, 0.16, 0.14]} />
        <meshLambertMaterial attach="material-0" color={skin} />
        <meshLambertMaterial attach="material-1" color={skin} />
        <meshLambertMaterial attach="material-2" color={skin} />
        <meshLambertMaterial attach="material-3" color={skin} />
        <meshLambertMaterial attach="material-4" map={faceTexture} />
        <meshLambertMaterial attach="material-5" color={skin} />
      </mesh>
      {/* HAIR STYLES */}
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
          <mesh position={[0, 0.605, 0]} rotation={[0, 0, 0]}>
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
      {/* NEW: Mohawk */}
      {hairStyle === "mohawk" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.59, 0]}>
            <boxGeometry args={[0.04, 0.08, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.625, 0]}>
            <boxGeometry args={[0.032, 0.07, 0.032]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.655, 0]}>
            <boxGeometry args={[0.025, 0.06, 0.025]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Afro */}
      {hairStyle === "afro" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.076, 16, 16]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Ponytail */}
      {hairStyle === "ponytail" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.45, -0.075]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Braids */}
      {hairStyle === "braids" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.045, 0.48, 0.01]} rotation={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.045, 0.48, 0.01]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Buzz (barely visible) */}
      {hairStyle === "buzz" ? (
        <mesh position={[0, 0.547, 0]}>
          <boxGeometry args={[0.16, 0.015, 0.14]} />
          <meshLambertMaterial color={hairColor} />
        </mesh>
      ) : null}
      {/* NEW: Curly */}
      {hairStyle === "curly" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.04, 0.59, 0]}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.04, 0.59, 0]}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.62, 0.02]}>
            <sphereGeometry args={[0.026, 10, 10]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.605, -0.03]}>
            <sphereGeometry args={[0.024, 10, 10]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Long straight */}
      {hairStyle === "long_straight" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.055, 0.4, 0]}>
            <boxGeometry args={[0.05, 0.24, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.055, 0.4, 0]}>
            <boxGeometry args={[0.05, 0.24, 0.08]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Side shave */}
      {hairStyle === "side_shave" ? (
        <>
          <mesh position={[-0.055, 0.555, 0]}>
            <boxGeometry args={[0.055, 0.048, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.07, 0.558, 0]}>
            <boxGeometry args={[0.032, 0.04, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Messy */}
      {hairStyle === "messy" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.04, 0.595, -0.01]} rotation={[0.3, -0.2, -0.15]}>
            <boxGeometry args={[0.032, 0.045, 0.032]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.045, 0.585, 0.01]} rotation={[-0.2, 0.25, 0.12]}>
            <boxGeometry args={[0.028, 0.04, 0.028]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.62, 0.025]} rotation={[0.15, 0, 0.1]}>
            <boxGeometry args={[0.03, 0.038, 0.03]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.01, 0.605, -0.03]} rotation={[-0.1, -0.15, -0.2]}>
            <boxGeometry args={[0.025, 0.035, 0.025]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Slicked back */}
      {hairStyle === "slicked_back" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.595, -0.055]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.165, 0.058, 0.04]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Pigtails */}
      {hairStyle === "pigtails" ? (
        <>
          <mesh position={[0, 0.548, 0]}>
            <boxGeometry args={[0.16, 0.035, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[-0.065, 0.575, 0]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0.065, 0.575, 0]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Fade */}
      {hairStyle === "fade" ? (
        <>
          <mesh position={[0, 0.552, 0]}>
            <boxGeometry args={[0.14, 0.032, 0.12]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
          <mesh position={[0, 0.59, 0]}>
            <boxGeometry args={[0.17, 0.05, 0.14]} />
            <meshLambertMaterial color={hairColor} />
          </mesh>
        </>
      ) : null}
      {/* HAT STYLES */}
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
      {/* NEW: Fedora */}
      {hatStyle === "fedora" ? (
        <>
          <mesh position={[0, 0.575, 0]}>
            <boxGeometry args={[0.22, 0.014, 0.18]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.16, 0.045, 0.14]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Top hat */}
      {hatStyle === "top_hat" ? (
        <>
          <mesh position={[0, 0.605, 0]}>
            <boxGeometry args={[0.15, 0.12, 0.13]} />
            <meshLambertMaterial color="#1f1f1f" />
          </mesh>
          <mesh position={[0, 0.565, 0]}>
            <boxGeometry args={[0.19, 0.018, 0.16]} />
            <meshLambertMaterial color="#1f1f1f" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Cowboy */}
      {hatStyle === "cowboy" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.28, 0.018, 0.24]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0, 0.61, 0]}>
            <boxGeometry args={[0.15, 0.055, 0.13]} />
            <meshLambertMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {/* NEW: Beret */}
      {hatStyle === "beret" ? (
        <mesh position={[0.05, 0.595, -0.01]} rotation={[0.2, 0, 0.15]}>
          <sphereGeometry args={[0.065, 16, 12]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {/* NEW: Headband */}
      {hatStyle === "headband" ? (
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[0.17, 0.016, 0.16]} />
          <meshLambertMaterial color={accessoryColor} />
        </mesh>
      ) : null}
      {/* NEW: Crown */}
      {hatStyle === "crown" ? (
        <>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.18, 0.014, 0.16]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[-0.055, 0.62, 0]}>
            <boxGeometry args={[0.04, 0.06, 0.014]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0, 0.625, 0]}>
            <boxGeometry args={[0.04, 0.065, 0.014]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0.055, 0.62, 0]}>
            <boxGeometry args={[0.04, 0.06, 0.014]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Santa */}
      {hatStyle === "santa" ? (
        <>
          <mesh position={[0, 0.59, 0]}>
            <boxGeometry args={[0.18, 0.055, 0.16]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 0.635, 0]}>
            <boxGeometry args={[0.19, 0.018, 0.17]} />
            <meshLambertMaterial color="#f5ead0" />
          </mesh>
          <mesh position={[0.08, 0.66, 0]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshLambertMaterial color="#f5ead0" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Wizard */}
      {hatStyle === "wizard" ? (
        <>
          <mesh position={[0, 0.62, 0]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.05, 0.11, 0.04]} />
            <meshLambertMaterial color="#4c1d95" />
          </mesh>
          <mesh position={[0, 0.572, 0]}>
            <boxGeometry args={[0.19, 0.018, 0.17]} />
            <meshLambertMaterial color="#4c1d95" />
          </mesh>
        </>
      ) : null}
      {/* NEW: Hard hat */}
      {hatStyle === "hard_hat" ? (
        <>
          <mesh position={[0, 0.605, 0]} rotation={[-0.06, 0, 0]}>
            <sphereGeometry args={[0.075, 16, 8]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0, 0.56, 0.07]}>
            <boxGeometry args={[0.18, 0.014, 0.04]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
        </>
      ) : null}
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
      <mesh ref={leftBrowRef} position={[-0.04, 0.52, 0.074]}>
        <boxGeometry args={[0.04, 0.01, 0.01]} />
        <meshBasicMaterial color="#342016" />
      </mesh>
      <mesh ref={rightBrowRef} position={[0.04, 0.52, 0.074]}>
        <boxGeometry args={[0.04, 0.01, 0.01]} />
        <meshBasicMaterial color="#342016" />
      </mesh>
      <mesh ref={leftEyeRef} position={[-0.04, 0.475, 0.072]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.04, 0.475, 0.072]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      <mesh ref={leftEyeHighlightRef} position={[-0.03, 0.482, 0.074]}>
        <boxGeometry args={[0.008, 0.008, 0.01]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh ref={rightEyeHighlightRef} position={[0.05, 0.482, 0.074]}>
        <boxGeometry args={[0.008, 0.008, 0.01]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      {/* GLASSES - differentiated by style */}
      {glassesStyle === "round" ? (
        <>
          <mesh position={[-0.04, 0.475, 0.078]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.01, 16]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0.04, 0.475, 0.078]}>
            <cylinderGeometry args={[0.028, 0.028, 0.01, 16]} />
            <meshBasicMaterial color="#111827" wireframe />
          </mesh>
          <mesh position={[0, 0.475, 0.078]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#111827" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "aviator" ? (
        <>
          <mesh position={[-0.04, 0.475, 0.078]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.056, 0.042, 0.01]} />
            <meshBasicMaterial color="#4b5563" />
          </mesh>
          <mesh position={[0.04, 0.475, 0.078]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.056, 0.042, 0.01]} />
            <meshBasicMaterial color="#4b5563" />
          </mesh>
          <mesh position={[0, 0.475, 0.078]}>
            <boxGeometry args={[0.022, 0.008, 0.01]} />
            <meshBasicMaterial color="#4b5563" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "monocle" ? (
        <>
          <mesh position={[0.04, 0.475, 0.078]}>
            <cylinderGeometry args={[0.032, 0.032, 0.01, 16]} />
            <meshBasicMaterial color="#d4af37" wireframe />
          </mesh>
          <mesh position={[0.04, 0.48, 0.085]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.004, 0.06, 0.004]} />
            <meshBasicMaterial color="#d4af37" />
          </mesh>
        </>
      ) : null}
      {glassesStyle === "sunglasses" ? (
        <>
          <mesh position={[-0.04, 0.475, 0.078]}>
            <boxGeometry args={[0.052, 0.048, 0.01]} />
            <meshBasicMaterial color="#1f1f1f" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0.04, 0.475, 0.078]}>
            <boxGeometry args={[0.052, 0.048, 0.01]} />
            <meshBasicMaterial color="#1f1f1f" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0.475, 0.078]}>
            <boxGeometry args={[0.02, 0.008, 0.01]} />
            <meshBasicMaterial color="#333" />
          </mesh>
        </>
      ) : null}
      {(glassesStyle === "square" || !showGlasses) && showGlasses ? (
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
      <mesh ref={mouthRef} position={[0, 0.436, 0.074]}>
        <boxGeometry args={[0.05, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>
      <mesh
        ref={leftMouthCornerRef}
        position={[-0.031, 0.438, 0.074]}
        visible={false}
      >
        <boxGeometry args={[0.014, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>
      <mesh
        ref={rightMouthCornerRef}
        position={[0.031, 0.438, 0.074]}
        visible={false}
      >
        <boxGeometry args={[0.014, 0.014, 0.01]} />
        <meshBasicMaterial color="#9c4a4a" />
      </mesh>

      {/* FACIAL HAIR */}
      {facialHair === "stubble" ? (
        <>
          <mesh position={[-0.03, 0.42, 0.073]}>
            <boxGeometry args={[0.01, 0.008, 0.008]} />
            <meshBasicMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[0.03, 0.42, 0.073]}>
            <boxGeometry args={[0.01, 0.008, 0.008]} />
            <meshBasicMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[0, 0.418, 0.073]}>
            <boxGeometry args={[0.008, 0.006, 0.008]} />
            <meshBasicMaterial color={facialHairColor} />
          </mesh>
          <mesh position={[-0.018, 0.418, 0.073]}>
            <boxGeometry args={[0.008, 0.006, 0.008]} />
            <meshBasicMaterial color={facialHairColor} />
          </mesh>
        </>
      ) : null}
      {facialHair === "full_beard" ? (
        <mesh position={[0, 0.42, 0.072]}>
          <boxGeometry args={[0.12, 0.06, 0.025]} />
          <meshBasicMaterial color={facialHairColor} />
        </mesh>
      ) : null}
      {facialHair === "goatee" ? (
        <mesh position={[0, 0.42, 0.073]}>
          <boxGeometry args={[0.04, 0.05, 0.015]} />
          <meshBasicMaterial color={facialHairColor} />
        </mesh>
      ) : null}
      {facialHair === "mustache" ? (
        <mesh position={[0, 0.455, 0.073]}>
          <boxGeometry args={[0.09, 0.012, 0.01]} />
          <meshBasicMaterial color={facialHairColor} />
        </mesh>
      ) : null}
      {facialHair === "soul_patch" ? (
        <mesh position={[0, 0.422, 0.073]}>
          <boxGeometry args={[0.015, 0.018, 0.01]} />
          <meshBasicMaterial color={facialHairColor} />
        </mesh>
      ) : null}

      {/* EARRINGS */}
      {earringStyle === "stud" ? (
        <>
          <mesh position={[-0.085, 0.485, 0.07]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0.085, 0.485, 0.07]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {earringStyle === "hoop" ? (
        <>
          <mesh position={[-0.09, 0.485, 0.065]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.018, 0.004, 8, 16]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0.09, 0.485, 0.065]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.018, 0.004, 8, 16]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {earringStyle === "drop" ? (
        <>
          <mesh position={[-0.085, 0.47, 0.07]}>
            <cylinderGeometry args={[0.008, 0.006, 0.038, 6]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0.085, 0.47, 0.07]}>
            <cylinderGeometry args={[0.008, 0.006, 0.038, 6]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}

      {/* NECKWEAR */}
      {neckwearStyle === "tie" ? (
        <>
          <mesh position={[0, 0.38, 0.056]}>
            <boxGeometry args={[0.022, 0.08, 0.012]} />
            <meshBasicMaterial color="#1f1f1f" />
          </mesh>
        </>
      ) : null}
      {neckwearStyle === "bowtie" ? (
        <>
          <mesh position={[-0.032, 0.39, 0.056]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.032, 0.026, 0.012]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
          <mesh position={[0.032, 0.39, 0.056]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.032, 0.026, 0.012]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {neckwearStyle === "scarf" ? (
        <>
          <mesh position={[0, 0.38, 0.068]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.16, 0.042, 0.018]} />
            <meshBasicMaterial color={accessoryColor} />
          </mesh>
        </>
      ) : null}
      {neckwearStyle === "necklace" ? (
        <mesh position={[0, 0.38, 0.062]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.056, 0.006, 8, 32]} />
          <meshBasicMaterial color="#d4af37" />
        </mesh>
      ) : null}
      {neckwearStyle === "lanyard" ? (
        <>
          <mesh position={[0, 0.35, 0.065]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.008, 0.12, 0.008]} />
            <meshBasicMaterial color="#e5e7eb" />
          </mesh>
          <mesh position={[0, 0.25, 0.065]}>
            <boxGeometry args={[0.028, 0.018, 0.018]} />
            <meshBasicMaterial color="#475569" />
          </mesh>
        </>
      ) : null}

      {/* WATCH on left wrist */}
      {watchStyle === "digital" ? (
        <mesh position={[0.12, -0.145, 0.015]}>
          <boxGeometry args={[0.032, 0.028, 0.012]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ) : null}
      {watchStyle === "analog" ? (
        <mesh position={[0.12, -0.145, 0.018]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.008, 16]} />
          <meshBasicMaterial color="#e5dcc9" />
        </mesh>
      ) : null}
      {watchStyle === "smart" ? (
        <mesh position={[0.12, -0.145, 0.015]}>
          <boxGeometry args={[0.034, 0.032, 0.012]} />
          <meshBasicMaterial color="#0369a1" />
        </mesh>
      ) : null}

      <mesh
        ref={pulseRingRef}
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.13, 0.19, 24]} />
        <meshBasicMaterial
          ref={pulseRingMatRef}
          color="#22c55e"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      {!activeSpeechBubble && name ? (
        <Billboard position={[0, 1.08, 0]}>
          <group ref={nameplateRef}>
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[1.22, 0.4]} />
              <meshBasicMaterial
                ref={nameplateMatRef}
                color="#080c14"
                transparent
                opacity={0.92}
              />
            </mesh>
            <mesh position={[-0.584, 0, 0]}>
              <planeGeometry args={[0.04, 0.4]} />
              <meshBasicMaterial ref={nameplateAccentMatRef} color={color} />
            </mesh>
            <mesh position={[0.52, 0, 0]}>
              <circleGeometry args={[0.06, 16]} />
              <meshBasicMaterial ref={statusDotMatRef} color="#ef4444" />
            </mesh>
            <Text
              position={[-0.02, 0, 0.001]}
              fontSize={0.125}
              color="#f5ead0"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.92}
              textAlign="center"
              lineHeight={1.05}
              overflowWrap="break-word"
              whiteSpace="normal"
              font={undefined}
            >
              {nameLabel}
            </Text>
          </group>
        </Billboard>
      ) : null}
      <group ref={awayBubbleRef} visible={false}>
        <Billboard position={[0, 1.3, 0]}>
          <mesh position={[0, 0, -0.001]}>
            <planeGeometry args={[0.32, 0.18]} />
            <meshBasicMaterial color="#0d1015" transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0, 0.001]}
            fontSize={0.11}
            color="#6080b0"
            anchorX="center"
            anchorY="middle"
          >
            z z z
          </Text>
        </Billboard>
      </group>
      <group ref={speechBubbleRef} visible={false}>
        <Billboard position={[0, 1.45, 0]}>
          {activeSpeechBubble ? (
            <mesh position={[0, 0, -0.0015]} renderOrder={99998}>
              <planeGeometry
                args={[
                  speechBubbleWidth + speechBubbleBorderInset,
                  speechBubbleHeight + speechBubbleBorderInset,
                ]}
              />
              <meshBasicMaterial
                color={speechBubbleBorderColor}
                transparent
                opacity={0.88}
                depthTest={false}
                depthWrite={false}
              />
            </mesh>
          ) : null}
          <mesh position={[0, 0, -0.001]} renderOrder={99999}>
            <planeGeometry args={[speechBubbleWidth, speechBubbleHeight]} />
            <meshBasicMaterial
              ref={speechBubbleMatRef}
              color="#1a2030"
              transparent
              opacity={activeSpeechBubble ? 0.76 : 0.92}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <Text
            position={
              activeSpeechBubble
                ? [-speechBubbleWidth / 2 + speechBubblePaddingX / 2, 0, 0.001]
                : [0, 0, 0.001]
            }
            fontSize={speechBubbleFontSize}
            color={speechBubbleTextColor}
            anchorX={activeSpeechBubble ? "left" : "center"}
            anchorY="middle"
            maxWidth={speechBubbleMaxWidth}
            textAlign={activeSpeechBubble ? "left" : "center"}
            lineHeight={1.1}
            renderOrder={100000}
            depthOffset={-10}
            material-depthTest={false}
            material-depthWrite={false}
          >
            {speechBubbleDisplayText}
          </Text>
        </Billboard>
      </group>
    </group>
  );
});

AgentModel.displayName = "AgentModel";
