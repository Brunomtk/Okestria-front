import { Billboard, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";

// Module-level helpers for frustum culling without per-agent allocations.
const _cullFrustum = new THREE.Frustum();
const _cullMatrix = new THREE.Matrix4();
const _cullSphere = new THREE.Sphere(new THREE.Vector3(), 0.8);
let _cullFrustumFrame = -1;
let _cullFrustumCamera: THREE.Camera | null = null;
// Update the shared frustum at most once per frame (called from every
// AgentModel useFrame). Uses `renderer.info.render.frame` as a frame token —
// but @react-three/fiber doesn't expose it cleanly, so we key off the clock
// elapsed time rounded to microseconds via the shared camera identity.
function refreshFrustum(camera: THREE.Camera, token: number) {
  if (_cullFrustumFrame === token && _cullFrustumCamera === camera) return;
  _cullFrustumFrame = token;
  _cullFrustumCamera = camera;
  _cullMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  _cullFrustum.setFromProjectionMatrix(_cullMatrix);
}
import { createDefaultAgentAvatarProfile } from "@/lib/avatars/profile";
import {
  AGENT_SCALE,
  WALK_ANIM_SPEED,
} from "@/features/retro-office/core/constants";
import { PerfLod } from "@/features/retro-office/core/perfLod";
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
    type: 0 as number, // 0=breathe, 1=lookAround, 2=scratchHead, 3=crossArms, 4=stretch, 5=wave, 6=think, 7=tap
    startFrame: 0,
    duration: 300,
    nextChange: 180,
  });
  const headTiltRef = useRef({ x: 0, y: 0 });
  // Smoothed rotation targets — the raw per-frame keyframes are written here
  // each tick, and the actual bone rotations lerp toward them exponentially.
  // This prevents the "snap / break" effect when a rep finishes or the agent
  // transitions between poses (e.g. yoga pose 2 → 3) across a wide arc.
  const leftArmTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const rightArmTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const leftLegTargetRef = useRef(0);
  const rightLegTargetRef = useRef(0);
  // v41 perf: track if opacity was last set so we avoid re-running the
  // whole-subtree traverse() every frame. Also used to throttle idle-agent
  // animation math to 30fps (imperceptible at rest).
  const lastAwayRef = useRef<boolean | null>(null);
  const frameTickRef = useRef(0);
  const { camera } = useThree();
  const resolvedAppearance = useMemo(
    () => appearance ?? createDefaultAgentAvatarProfile(agentId),
    [agentId, appearance],
  );
  const nameLabel = useMemo(() => normalizeAgentNameLabel(name), [name]);

  useFrame((state, delta) => {
    motionTimeRef.current += Math.min(0.05, delta) * 60;
    frameTickRef.current = (frameTickRef.current + 1) | 0;
    const agent =
      agentLookupRef?.current?.get(agentId) ??
      agentsRef.current?.find((candidate) => candidate.id === agentId);
    if (!agent || !groupRef.current) return;

    const [wx, , wz] = toWorld(agent.x, agent.y);
    pos.current.set(wx, 0, wz);

    // ---- v41 perf: frustum cull ----
    // If the agent is fully offscreen, skip the entire body-animation block.
    // We still allow a minimal position update every ~8 frames so that when
    // the agent re-enters the viewport it snaps to roughly the right place.
    refreshFrustum(camera, state.clock.elapsedTime);
    _cullSphere.center.set(wx, 0.6, wz);
    const inFrustum = _cullFrustum.intersectsSphere(_cullSphere);
    if (!inFrustum) {
      if ((frameTickRef.current & 7) === 0) {
        groupRef.current.position.set(wx, 0, wz);
      }
      return;
    }

    // ---- v41 perf: half-rate animation for idle/sitting agents ----
    // Walking, workout, dancing, janitor, and ping-pong agents always run at
    // full rate. Everyone else alternates frames (30fps pose math, still 60fps
    // rendering) — imperceptible for subtle idle micro-motion.
    //
    // v45 perf: when the user is zoomed OUT, the screen fills with many more
    // agents and furniture at once — that's when the stutter showed up most.
    // So we extend the throttle:
    //   • zoomedOut (zoom < 55): even walking/workout agents run at half-rate.
    //   • farZoomedOut (zoom < 38): all non-janitor work runs at 1/3 rate.
    // Dancing and janitors still animate every frame so the overall scene
    // still reads as "alive" from a high-altitude view.
    const lightweight =
      agent.state !== "walking" &&
      agent.state !== "working_out" &&
      agent.state !== "dancing" &&
      !agent.pingPongUntil &&
      !("role" in agent && agent.role === "janitor");
    const isDancingOrJanitor =
      agent.state === "dancing" ||
      ("role" in agent && agent.role === "janitor");
    const zoomThrottle = PerfLod.farZoomedOut
      ? 2 // 1 in 3 frames
      : PerfLod.zoomedOut
      ? 1 // 1 in 2 frames
      : 0;
    // Skip this frame entirely?
    //  - lightweight agents always use half-rate (the v41 behavior)
    //  - when zoomed out, extend to walking/workout too
    const skipFullAnim =
      (lightweight && (frameTickRef.current & 1) === 0) ||
      (!isDancingOrJanitor &&
        zoomThrottle > 0 &&
        frameTickRef.current % (zoomThrottle + 1) !== 0);
    if (skipFullAnim) {
      // Still lerp position/rotation for smooth camera pans; skip the rest.
      const positionLerp = 1 - Math.exp(-Math.min(0.05, delta) * 12);
      groupRef.current.position.lerp(pos.current, positionLerp);
      const targetY = agent.facing;
      let rotDelta = targetY - groupRef.current.rotation.y;
      while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
      while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
      const rotationLerp = 1 - Math.exp(-Math.min(0.05, delta) * 14);
      groupRef.current.rotation.y += rotDelta * rotationLerp;
      return;
    }
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
    // QA lab — agent is "standing" at a station with lingerMs, working on
    // hardware / typing / diagnosing. Mirrors the workout state machine but
    // keyed on interactionTarget + qaLabStage so the lab feels alive.
    const isQaWorking =
      agent.state === "standing" &&
      agent.interactionTarget === "qa_lab" &&
      agent.qaLabStage === "station";
    const qaStationType = agent.qaLabStationType ?? "console";
    // Per-station cadence — typing is fast/nervous, bench soldering is
    // slower/steadier, rack diagnosis is a relaxed reach-and-inspect loop.
    const qaCadenceByStation: Record<string, number> = {
      console: 0.32, // fast finger taps
      device_rack: 0.10, // slow reach + inspect
      bench: 0.18, // moderate tool work
    };
    const qaCadence = qaCadenceByStation[qaStationType] ?? 0.18;
    const janitorTool = isJanitor
      ? (agent as RenderAgent & JanitorActor).janitorTool
      : undefined;
    const workoutStyle = agent.workoutStyle ?? "lift";
    const motionFrame = motionTimeRef.current + (agent.phaseOffset ?? 0);
    const qaPhase = Math.sin(motionFrame * qaCadence);
    const qaPhase2 = Math.sin(motionFrame * qaCadence + Math.PI / 2);
    const frameValue = motionFrame + (agent.phaseOffset ?? 0) / WALK_ANIM_SPEED;
    const walkPhase = Math.sin(frameValue * WALK_ANIM_SPEED);
    // Per-style cadence (Hz-ish). Lowered globally so reps read as natural
    // human effort rather than anxious twitching. Heavy lifts (squat,
    // deadlift, bench) are slow and controlled; bike/run cycles faster.
    const cadenceByStyle: Partial<Record<string, number>> = {
      run: 0.11,
      bike: 0.10,
      row: 0.07,
      punch: 0.14,
      box: 0.14,
      stretch: 0.035, // slow yoga flow
      squat: 0.055,
      bench_press: 0.06,
      deadlift: 0.05,
      curl: 0.075,
      kettlebell: 0.075,
      cable: 0.07,
      lift: 0.07,
    };
    const workoutCadence = cadenceByStyle[workoutStyle] ?? 0.08;
    const workoutPhase = Math.sin(motionFrame * workoutCadence);
    const workoutPushPhase = Math.sin(motionFrame * workoutCadence + Math.PI / 2);
    // Secondary phase for yoga — advances through 4 poses per ~24s cycle.
    // Each pose holds for ~6 seconds with a smooth blend between poses.
    const yogaCycle = motionFrame * 0.022; // slow
    const yogaPoseIndex = Math.floor(yogaCycle) % 4; // 0..3
    const yogaPoseProgress = yogaCycle - Math.floor(yogaCycle); // 0..1
    // Smooth in/out window so poses blend instead of snap.
    const yogaBlend = Math.min(1, yogaPoseProgress * 3.5, (1 - yogaPoseProgress) * 3.5);
    groupRef.current.rotation.z = 0;
    
    // Idle animation system - select and manage idle behaviors
    const isIdle = agent.state === "standing" && agent.status === "idle";
    const idleAnim = idleAnimRef.current;
    
    if (isIdle) {
      // Check if it's time to change idle animation
      if (agent.frame >= idleAnim.nextChange) {
        // Pick a new random idle animation (weighted towards subtle ones)
        const rand = Math.random();
        if (rand < 0.35) idleAnim.type = 0; // breathe (most common)
        else if (rand < 0.50) idleAnim.type = 1; // lookAround
        else if (rand < 0.60) idleAnim.type = 2; // scratchHead
        else if (rand < 0.70) idleAnim.type = 3; // crossArms
        else if (rand < 0.80) idleAnim.type = 4; // stretch
        else if (rand < 0.88) idleAnim.type = 5; // wave
        else if (rand < 0.94) idleAnim.type = 6; // think
        else idleAnim.type = 7; // tap foot
        
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
      }
    }
    
    // --- Per-workout body lean/rotation map ---
    // Each workout style tilts the torso differently so that the agent looks
    // like they are actually engaging with the equipment (bent over at a
    // deadlift, seated forward on a bike, leaning into a cable pull, etc.).
    let workoutBodyRotX = 0.02;
    if (isWorkout) {
      switch (workoutStyle) {
        case "bike":
          workoutBodyRotX = 0.22;
          break;
        case "row":
          workoutBodyRotX = -0.12 + Math.max(0, workoutPhase) * 0.22;
          break;
        case "stretch":
          // Yoga body lean per pose: forward fold on pose 0's tail end,
          // upright for warrior / mountain / tree, slight back-bend on upward salute
          if (yogaPoseIndex === 0) {
            workoutBodyRotX = yogaPoseProgress > 0.5 ? (yogaPoseProgress - 0.5) * 1.6 : 0;
          } else if (yogaPoseIndex === 1) {
            workoutBodyRotX = 0.08; // slight hip-hinge
          } else if (yogaPoseIndex === 2) {
            workoutBodyRotX = -0.14; // slight back-bend
          } else {
            workoutBodyRotX = 0.02;
          }
          break;
        case "run":
          workoutBodyRotX = 0.1;
          break;
        case "box":
        case "punch":
          // Small forward lean + jabbing bob
          workoutBodyRotX = 0.06 + Math.abs(workoutPushPhase) * 0.04;
          break;
        case "squat":
          // Upright torso, slight hip-hinge on descent
          workoutBodyRotX = 0.04 + Math.max(0, -workoutPhase) * 0.1;
          break;
        case "bench_press":
          // Agent stays standing but leans back to simulate being on the bench
          workoutBodyRotX = -0.1;
          break;
        case "deadlift":
          // Hip-hinge: bent over on the bottom, tall on the top. Reduced
          // maximum lean so the rep reads as a controlled pull instead of
          // a jittery bounce — pairs with the stable center-of-platform
          // anchor (see navigation.ts deadlift_platform target).
          workoutBodyRotX = 0.08 + Math.max(0, -workoutPhase) * 0.38;
          break;
        case "curl":
          workoutBodyRotX = 0.02;
          break;
        case "kettlebell":
          // Big hip-hinge swing
          workoutBodyRotX = 0.05 + Math.max(0, -workoutPhase) * 0.45;
          break;
        case "cable":
          // Slight forward lean into the stack
          workoutBodyRotX = 0.12;
          break;
        default:
          workoutBodyRotX = 0.02;
      }
    }

    // Desk chair vs lounge vs meeting — we keep sitting agents perfectly
    // upright so the pose never "bugs" with jittery recline/breath blending.
    // Desk = working (arms will type), Lounge = sleeping (zzz bubble shows).
    const isDeskChairSit =
      agent.state === "sitting" &&
      (agent.interactionTarget === "desk" ||
        agent.interactionTarget === "meeting_room");
    const isLoungeSit =
      agent.state === "sitting" && agent.interactionTarget === "lounge";
    // Rock-steady upright torso while seated — no micro-recline, no sway.
    const sittingBodyRotX = 0;
    // Lift the agent's root up onto the seat surface. Without this the
    // model's feet-plane stays on the floor and the character appears to
    // "float" through the chair cushion rather than sit on it. The values
    // are tuned so that the agent's hip-pivot (where the legs rotate from)
    // lands on top of the seat cushion, accounting for AGENT_SCALE (1.75)
    // and the chair's own Y-scale (0.82 in ChairModel).
    //   • Desk/meeting chair seat top ≈ 0.34 world → hip pivot needs lift ≈ 0.15
    //   • Lounge cushion (couch/beanbag) is lower + softer — gentler lift.
    const sittingLift = isDeskChairSit
      ? 0.16
      : isLoungeSit
        ? 0.1
        : agent.state === "sitting"
          ? 0.13
          : 0;
    // QA stations: slight forward-lean + micro-bob per station type.
    let qaBodyRotX = 0;
    if (isQaWorking) {
      if (qaStationType === "console") {
        // Typing — gentle forward lean + shoulder micro-bob on key press
        qaBodyRotX = 0.14 + Math.abs(qaPhase) * 0.015;
      } else if (qaStationType === "device_rack") {
        // Inspecting rack — upright, slow sway
        qaBodyRotX = 0.04 + Math.sin(motionFrame * 0.03) * 0.02;
      } else if (qaStationType === "bench") {
        // Bench work — deeper forward lean (soldering/probe)
        qaBodyRotX = 0.22 + Math.abs(qaPhase) * 0.02;
      }
    }
    groupRef.current.rotation.x =
      agent.state === "sitting"
        ? sittingBodyRotX
        : isDancing
          ? Math.sin(agent.frame * 0.18 + (agent.phaseOffset ?? 0)) * 0.06
          : isWorkout
            ? workoutBodyRotX
            : isQaWorking
              ? qaBodyRotX
              : agent.pingPongUntil
                ? 0.08
                : idleBodyRotX;
    
    // Apply idle body Y rotation (looking around)
    if (isIdle && idleAnim.type === 1) {
      groupRef.current.rotation.y += idleBodyRotY;
    }
    
    // Apply idle body Z rotation (lean/sway)
    groupRef.current.rotation.z = idleBodyRotZ;
    // Per-workout vertical bounce — some activities are bouncier than others.
    let workoutBounce = 0.02 + Math.abs(workoutPhase) * 0.04;
    if (isWorkout) {
      switch (workoutStyle) {
        case "stretch":
          // Very gentle rise/fall during yoga flow
          workoutBounce = 0.008 + Math.abs(workoutPhase) * 0.006;
          break;
        case "row":
          workoutBounce = 0.015 + Math.abs(workoutPhase) * 0.028;
          break;
        case "squat":
          // Deep squat — big vertical travel, drops on down phase
          workoutBounce = -Math.max(0, -workoutPhase) * 0.12;
          break;
        case "deadlift":
          // Stays low on the down phase, rises on the up phase — tamed
          // amplitude so the agent looks like they're pulling smoothly
          // rather than quikando (bouncing) on the platform.
          workoutBounce = -Math.max(0, -workoutPhase) * 0.05;
          break;
        case "kettlebell":
          workoutBounce = -Math.max(0, -workoutPhase) * 0.06;
          break;
        case "bench_press":
          // Almost no vertical — agent is "lying" flat
          workoutBounce = 0.005 + Math.abs(workoutPhase) * 0.006;
          break;
        case "curl":
          workoutBounce = 0.008 + Math.abs(workoutPhase) * 0.01;
          break;
        case "cable":
          workoutBounce = 0.01 + Math.abs(workoutPhase) * 0.012;
          break;
        case "punch":
        case "box":
          workoutBounce = 0.02 + Math.abs(workoutPushPhase) * 0.035;
          break;
        case "run":
          workoutBounce = 0.02 + Math.abs(workoutPhase) * 0.06;
          break;
        case "bike":
          workoutBounce = 0.008 + Math.abs(workoutPhase) * 0.012;
          break;
      }
    }
    const bounce =
      agent.state === "walking"
        ? Math.sin(frameValue * WALK_ANIM_SPEED) * 0.04
        : isDancing
          ? 0.03 + Math.abs(Math.sin(agent.frame * 0.22 + (agent.phaseOffset ?? 0))) * 0.05
          : isWorkout
            ? workoutBounce
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
    // Status pulse (working/error) is SUPPRESSED while sitting so the
     // agent is a completely static sit — no breathing scale, no pulse,
     // no sway. User explicitly asked for sitting to have zero animation
     // on both the desk chair and the sofa.
    const statusScale =
      agent.state === "sitting"
        ? 1
        : agent.status === "working"
          ? 1.02 + Math.sin(agent.frame * 0.09) * 0.015
          : agent.status === "error"
            ? 1.015 + Math.sin(agent.frame * 0.16) * 0.01
            : 1;
    groupRef.current.position.set(
      wx + errorShakeX,
      bounce + breathe + idleFloat + sittingLift,
      wz + errorShakeZ,
    );
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
        } else if (workoutStyle === "box" || workoutStyle === "punch") {
          leftArmRef.current.rotation.x = -(
            0.92 +
            Math.max(0, workoutPushPhase) * 0.45
          );
          leftArmRef.current.rotation.z = -0.52;
          leftArmRef.current.rotation.y = -0.06;
          groupRef.current.rotation.z = 0.05;
        } else if (workoutStyle === "stretch") {
          // Yoga flow — 4 poses held for ~7s each and *directly* lerped
          // pose N → pose N+1 (no dipping through a neutral rest), so the
          // shoulder never "breaks" through the torso shoulder cap.
          // LEFT arm keyframes per pose.
          const LEFT_YOGA_POSES = [
            // 0: Mountain → forward fold — arms hang by the sides
            { x: -0.22, z: -0.13, y: 0.0 },
            // 1: Warrior II — left arm extended out to the side
            { x: -1.55, z: -1.35, y: -0.05 },
            // 2: Upward salute — both arms reach straight up overhead
            { x: -2.75, z: -0.22, y: -0.05 },
            // 3: Tree / prayer — hands together at chest
            { x: -1.25, z: -0.55, y: -0.25 },
          ];
          const curr = LEFT_YOGA_POSES[yogaPoseIndex]!;
          const next = LEFT_YOGA_POSES[(yogaPoseIndex + 1) % 4]!;
          // Hold for first 65% of pose, ease through the final 35%.
          const holdCutoff = 0.65;
          const blendT =
            yogaPoseProgress < holdCutoff
              ? 0
              : (yogaPoseProgress - holdCutoff) / (1 - holdCutoff);
          // Smoothstep ease so transitions feel organic.
          const t = blendT * blendT * (3 - 2 * blendT);
          leftArmRef.current.rotation.x = curr.x + (next.x - curr.x) * t;
          leftArmRef.current.rotation.z = curr.z + (next.z - curr.z) * t;
          leftArmRef.current.rotation.y = curr.y + (next.y - curr.y) * t;
        } else if (workoutStyle === "squat") {
          // Both hands up holding a bar across the shoulders — elbows up
          leftArmRef.current.rotation.x = -2.1;
          leftArmRef.current.rotation.z = -0.85;
          leftArmRef.current.rotation.y = -0.2;
        } else if (workoutStyle === "bench_press") {
          // Press phase: arms pushing straight up from chest
          const pressExt = -1.45 - Math.max(0, workoutPushPhase) * 0.4;
          leftArmRef.current.rotation.x = pressExt;
          leftArmRef.current.rotation.z = -0.3;
          leftArmRef.current.rotation.y = -0.05;
        } else if (workoutStyle === "deadlift") {
          // Arms hanging straight down holding bar; rotates with torso
          // When torso bends forward (down phase), arms hang in front.
          leftArmRef.current.rotation.x = -0.05;
          leftArmRef.current.rotation.z = -0.18;
          leftArmRef.current.rotation.y = -0.02;
        } else if (workoutStyle === "curl") {
          // Bicep curl: elbow hinge up/down
          const curl = -(0.2 + Math.max(0, workoutPhase) * 1.5);
          leftArmRef.current.rotation.x = curl;
          leftArmRef.current.rotation.z = -0.28;
          leftArmRef.current.rotation.y = -0.02;
        } else if (workoutStyle === "kettlebell") {
          // Swing: arm goes from between legs (down) to shoulder height (up)
          const swing = -0.35 + Math.max(0, workoutPhase) * 1.9;
          leftArmRef.current.rotation.x = swing;
          leftArmRef.current.rotation.z = -0.22;
          leftArmRef.current.rotation.y = -0.04;
        } else if (workoutStyle === "cable") {
          // Pulling down from overhead: arm starts high, pulls down
          const pull = -2.0 + Math.max(0, workoutPhase) * 1.4;
          leftArmRef.current.rotation.x = pull;
          leftArmRef.current.rotation.z = -0.45;
          leftArmRef.current.rotation.y = -0.12;
        } else {
          // Generic "lift" fallback — shoulder press
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
      } else if (isQaWorking) {
        // QA-lab station poses — left arm per station type.
        if (qaStationType === "console") {
          // Both hands at keyboard height, micro-tapping fingers.
          leftArmRef.current.rotation.x = -1.25 + qaPhase * 0.05;
          leftArmRef.current.rotation.z = -0.28;
          leftArmRef.current.rotation.y = -0.06;
        } else if (qaStationType === "device_rack") {
          // Left hand steady at waist holding a notes tablet.
          leftArmRef.current.rotation.x = -0.85;
          leftArmRef.current.rotation.z = -0.42;
          leftArmRef.current.rotation.y = 0.08;
        } else {
          // Bench work — left hand holds part, steady at chest level.
          leftArmRef.current.rotation.x = -1.0 + Math.sin(motionFrame * 0.04) * 0.04;
          leftArmRef.current.rotation.z = -0.38;
          leftArmRef.current.rotation.y = -0.12;
        }
      } else if (agent.state === "sitting") {
        // Sitting pose is 100% static — no typing bob, no breathing, no
        // sway. Both the couch/beanbag and the desk/meeting chair poses
        // are fixed frames. User explicitly asked to remove all sitting
        // animation (both on chair and sofa).
        const isLoungeSitLocal = agent.interactionTarget === "lounge";
        if (isLoungeSitLocal) {
          // Arm resting on lap — sleeping/dozing pose, frozen.
          leftArmRef.current.rotation.x = 0.55;
          leftArmRef.current.rotation.z = -0.14;
          leftArmRef.current.rotation.y = 0.04;
        } else {
          // Desk/meeting chair — hands resting on the desk, frozen pose.
          leftArmRef.current.rotation.x = -0.98;
          leftArmRef.current.rotation.z = -0.16;
          leftArmRef.current.rotation.y = -0.02;
        }
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
        } else if (workoutStyle === "box" || workoutStyle === "punch") {
          rightArmRef.current.rotation.x = -(
            0.92 +
            Math.max(0, -workoutPushPhase) * 0.45
          );
          rightArmRef.current.rotation.z = 0.52;
          rightArmRef.current.rotation.y = 0.06;
          groupRef.current.rotation.z = -0.05;
        } else if (workoutStyle === "stretch") {
          // Yoga flow — mirror of left arm, pose-to-pose lerp.
          const RIGHT_YOGA_POSES = [
            { x: -0.22, z: 0.13, y: 0.0 },
            // Warrior II — right arm extended back (opposite of left)
            { x: -1.55, z: 1.35, y: 0.05 },
            { x: -2.75, z: 0.22, y: 0.05 },
            { x: -1.25, z: 0.55, y: 0.25 },
          ];
          const curr = RIGHT_YOGA_POSES[yogaPoseIndex]!;
          const next = RIGHT_YOGA_POSES[(yogaPoseIndex + 1) % 4]!;
          const holdCutoff = 0.65;
          const blendT =
            yogaPoseProgress < holdCutoff
              ? 0
              : (yogaPoseProgress - holdCutoff) / (1 - holdCutoff);
          const t = blendT * blendT * (3 - 2 * blendT);
          rightArmRef.current.rotation.x = curr.x + (next.x - curr.x) * t;
          rightArmRef.current.rotation.z = curr.z + (next.z - curr.z) * t;
          rightArmRef.current.rotation.y = curr.y + (next.y - curr.y) * t;
        } else if (workoutStyle === "squat") {
          // Mirror of left arm — hands gripping bar across shoulders
          rightArmRef.current.rotation.x = -2.1;
          rightArmRef.current.rotation.z = 0.85;
          rightArmRef.current.rotation.y = 0.2;
        } else if (workoutStyle === "bench_press") {
          const pressExt = -1.45 - Math.max(0, workoutPushPhase) * 0.4;
          rightArmRef.current.rotation.x = pressExt;
          rightArmRef.current.rotation.z = 0.3;
          rightArmRef.current.rotation.y = 0.05;
        } else if (workoutStyle === "deadlift") {
          rightArmRef.current.rotation.x = -0.05;
          rightArmRef.current.rotation.z = 0.18;
          rightArmRef.current.rotation.y = 0.02;
        } else if (workoutStyle === "curl") {
          const curl = -(0.2 + Math.max(0, workoutPhase) * 1.5);
          rightArmRef.current.rotation.x = curl;
          rightArmRef.current.rotation.z = 0.28;
          rightArmRef.current.rotation.y = 0.02;
        } else if (workoutStyle === "kettlebell") {
          const swing = -0.35 + Math.max(0, workoutPhase) * 1.9;
          rightArmRef.current.rotation.x = swing;
          rightArmRef.current.rotation.z = 0.22;
          rightArmRef.current.rotation.y = 0.04;
        } else if (workoutStyle === "cable") {
          const pull = -2.0 + Math.max(0, workoutPhase) * 1.4;
          rightArmRef.current.rotation.x = pull;
          rightArmRef.current.rotation.z = 0.45;
          rightArmRef.current.rotation.y = 0.12;
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
      } else if (isQaWorking) {
        // QA-lab station poses — right arm per station type.
        if (qaStationType === "console") {
          // Right hand at keyboard, offset-phase micro-tapping.
          rightArmRef.current.rotation.x = -1.25 + qaPhase2 * 0.05;
          rightArmRef.current.rotation.z = 0.28;
          rightArmRef.current.rotation.y = 0.06;
        } else if (qaStationType === "device_rack") {
          // Right hand reaches forward/up to probe racks on alternating
          // beats — that's the "action" hand for this station.
          const reach = 0.45 + Math.max(0, qaPhase) * 0.45;
          rightArmRef.current.rotation.x = -(1.05 + reach);
          rightArmRef.current.rotation.z = 0.22;
          rightArmRef.current.rotation.y = 0.18;
        } else {
          // Bench work — right hand holds tool, makes tight precise
          // little movements (soldering-like).
          rightArmRef.current.rotation.x =
            -1.15 + Math.sin(motionFrame * 0.22) * 0.08;
          rightArmRef.current.rotation.z =
            0.3 + Math.sin(motionFrame * 0.22 + Math.PI / 2) * 0.04;
          rightArmRef.current.rotation.y = 0.08;
        }
      } else if (agent.state === "sitting") {
        const isLoungeSitLocal = agent.interactionTarget === "lounge";
        if (isLoungeSitLocal) {
          // Mirror of left arm — still, resting on lap (sleeping).
          rightArmRef.current.rotation.x = 0.55;
          rightArmRef.current.rotation.z = 0.14;
          rightArmRef.current.rotation.y = -0.04;
        } else {
          // Desk/meeting chair — right hand resting on desk, frozen pose.
          // No typing bob, no breathing — user explicitly asked to remove
          // all sitting animation (both on chair and sofa).
          rightArmRef.current.rotation.x = -0.98;
          rightArmRef.current.rotation.z = 0.16;
          rightArmRef.current.rotation.y = 0.02;
        }
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
          default: // 0 - basic breathe
            rightArmRef.current.rotation.x = baseBreathX;
            rightArmRef.current.rotation.z = baseBreathZ;
        }
      }
    }
    // Flag set inside the leg blocks when the agent is sitting so the
    // downstream SMOOTH lerp knows to skip them — we want sitting legs to
    // be absolutely still, not lerping toward a target over multiple
    // frames (which reads as "dobrando a perna" on screen).
    let legsHardStatic = false;
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
        else if (workoutStyle === "stretch") {
          // Yoga left-leg keyframes, lerped pose → next pose.
          const LEFT_YOGA_LEG = [0.12, 0.55, 0.0, 0.08];
          const curr = LEFT_YOGA_LEG[yogaPoseIndex]!;
          const next = LEFT_YOGA_LEG[(yogaPoseIndex + 1) % 4]!;
          const holdCutoff = 0.65;
          const blendT =
            yogaPoseProgress < holdCutoff
              ? 0
              : (yogaPoseProgress - holdCutoff) / (1 - holdCutoff);
          const t = blendT * blendT * (3 - 2 * blendT);
          leftLegX = curr + (next - curr) * t;
        }
        else if (workoutStyle === "box" || workoutStyle === "punch")
          leftLegX = 0.06 + workoutPhase * 0.14;
        else if (workoutStyle === "squat") {
          // Deep bend on down phase: both legs flex together
          leftLegX = 0.1 + Math.max(0, -workoutPhase) * 0.85;
        } else if (workoutStyle === "bench_press") {
          // Static planted stance — tiny sway
          leftLegX = 0.04 + Math.sin(motionFrame * 0.08) * 0.02;
        } else if (workoutStyle === "deadlift") {
          // Slight knee bend, deeper on down
          leftLegX = 0.18 + Math.max(0, -workoutPhase) * 0.35;
        } else if (workoutStyle === "curl") {
          // Planted, slight shift
          leftLegX = 0.02;
        } else if (workoutStyle === "kettlebell") {
          // Wide-stance swing squat
          leftLegX = 0.08 + Math.max(0, -workoutPhase) * 0.55;
        } else if (workoutStyle === "cable") {
          // Split stance, subtle shift
          leftLegX = 0.1 + Math.abs(workoutPhase) * 0.06;
        } else leftLegX = workoutPhase * 0.18;
      } else if (isQaWorking) {
        // Gentle standing sway at the station — no rep motion needed.
        leftLegX = 0.02 + Math.sin(motionFrame * 0.05) * 0.015;
      } else if (agent.state === "sitting") {
        // Sitting is a HARD-STATIC pose. User asked repeatedly to remove
        // ALL sitting leg animation — so we snap directly to the target
        // rotation, zero-out Y/Z, and skip the downstream SMOOTH lerp
        // entirely so there's never a visible inter-frame drift that
        // reads as "dobrando a perna".
        const isLoungeSitLocal = agent.interactionTarget === "lounge";
        leftLegX = isLoungeSitLocal ? 0.72 : 1.05;
        legsHardStatic = true;
      } else if (isIdle && idleAnim.type === 7) {
        // Tap foot animation - left leg taps
        leftLegX = Math.max(0, Math.sin(frameValue * 0.2)) * 0.12 * idleSmooth;
      } else if (isIdle && idleAnim.type === 4) {
        // Stretch - slight leg movement
        leftLegX = Math.sin(idleProgress * Math.PI) * 0.05 * idleSmooth;
      }
      leftLegRef.current.rotation.x = leftLegX;
      if (legsHardStatic) {
        leftLegRef.current.rotation.y = 0;
        leftLegRef.current.rotation.z = 0;
      }
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
        else if (workoutStyle === "stretch") {
          // Yoga right-leg keyframes, lerped pose → next pose.
          const RIGHT_YOGA_LEG = [0.12, -0.12, 0.0, -0.55];
          const curr = RIGHT_YOGA_LEG[yogaPoseIndex]!;
          const next = RIGHT_YOGA_LEG[(yogaPoseIndex + 1) % 4]!;
          const holdCutoff = 0.65;
          const blendT =
            yogaPoseProgress < holdCutoff
              ? 0
              : (yogaPoseProgress - holdCutoff) / (1 - holdCutoff);
          const t = blendT * blendT * (3 - 2 * blendT);
          rightLegX = curr + (next - curr) * t;
        }
        else if (workoutStyle === "box" || workoutStyle === "punch")
          rightLegX = 0.06 - workoutPhase * 0.14;
        else if (workoutStyle === "squat") {
          // Both legs flex together in squat
          rightLegX = 0.1 + Math.max(0, -workoutPhase) * 0.85;
        } else if (workoutStyle === "bench_press") {
          rightLegX = 0.04 + Math.sin(motionFrame * 0.08 + Math.PI / 2) * 0.02;
        } else if (workoutStyle === "deadlift") {
          rightLegX = 0.18 + Math.max(0, -workoutPhase) * 0.35;
        } else if (workoutStyle === "curl") {
          rightLegX = 0.02;
        } else if (workoutStyle === "kettlebell") {
          rightLegX = 0.08 + Math.max(0, -workoutPhase) * 0.55;
        } else if (workoutStyle === "cable") {
          // Split stance opposite leg — slightly back
          rightLegX = -0.12 + Math.abs(workoutPhase) * 0.04;
        } else rightLegX = -workoutPhase * 0.18;
      } else if (isQaWorking) {
        // Counter-phase sway opposite the left leg.
        rightLegX = 0.02 + Math.sin(motionFrame * 0.05 + Math.PI) * 0.015;
      } else if (agent.state === "sitting") {
        const isLoungeSitLocal = agent.interactionTarget === "lounge";
        rightLegX = isLoungeSitLocal ? 0.72 : 1.05;
        legsHardStatic = true;
      } else if (isIdle && idleAnim.type === 4) {
        // Stretch - slight leg movement
        rightLegX = -Math.sin(idleProgress * Math.PI) * 0.05 * idleSmooth;
      }
      rightLegRef.current.rotation.x = rightLegX;
      if (legsHardStatic) {
        rightLegRef.current.rotation.y = 0;
        rightLegRef.current.rotation.z = 0;
      }
    }

    // ──────────────────────────────────────────────────────────────
    // Bone-rotation smoothing — exponential lerp from last frame's
    // value toward this frame's computed target. This prevents the
    // "snap/break" effect users saw at pose transitions (walk →
    // workout, yoga pose 2 → 3, bike → run, etc.). The smoothing
    // factor is high enough (~0.45) that rep-rate sin motion tracks
    // closely, but low enough to absorb large-arc discontinuities
    // across ~3 frames so the shoulder cap never visibly separates
    // from the upper-arm cylinder mid-transition.
    // ──────────────────────────────────────────────────────────────
    const SMOOTH = 0.45;
    // While seated the arms/legs are HARD-STATIC (no inter-frame lerp) —
    // any residual drift reads as the agent "mexendo a perna" which the
    // user explicitly does NOT want on chair or sofa.
    const armsHardStatic = agent.state === "sitting";
    if (leftArmRef.current) {
      if (armsHardStatic) {
        const rot = leftArmRef.current.rotation;
        leftArmTargetRef.current.x = rot.x;
        leftArmTargetRef.current.y = rot.y;
        leftArmTargetRef.current.z = rot.z;
      } else {
        const rot = leftArmRef.current.rotation;
        const prev = leftArmTargetRef.current;
        rot.x = prev.x + (rot.x - prev.x) * SMOOTH;
        rot.y = prev.y + (rot.y - prev.y) * SMOOTH;
        rot.z = prev.z + (rot.z - prev.z) * SMOOTH;
        prev.x = rot.x;
        prev.y = rot.y;
        prev.z = rot.z;
      }
    }
    if (rightArmRef.current) {
      if (armsHardStatic) {
        const rot = rightArmRef.current.rotation;
        rightArmTargetRef.current.x = rot.x;
        rightArmTargetRef.current.y = rot.y;
        rightArmTargetRef.current.z = rot.z;
      } else {
        const rot = rightArmRef.current.rotation;
        const prev = rightArmTargetRef.current;
        rot.x = prev.x + (rot.x - prev.x) * SMOOTH;
        rot.y = prev.y + (rot.y - prev.y) * SMOOTH;
        rot.z = prev.z + (rot.z - prev.z) * SMOOTH;
        prev.x = rot.x;
        prev.y = rot.y;
        prev.z = rot.z;
      }
    }
    if (leftLegRef.current) {
      if (legsHardStatic) {
        // Snap — no lerp while seated so the thigh never visibly drifts.
        leftLegTargetRef.current = leftLegRef.current.rotation.x;
      } else {
        const rot = leftLegRef.current.rotation;
        const prev = leftLegTargetRef.current;
        rot.x = prev + (rot.x - prev) * SMOOTH;
        leftLegTargetRef.current = rot.x;
      }
    }
    if (rightLegRef.current) {
      if (legsHardStatic) {
        rightLegTargetRef.current = rightLegRef.current.rotation.x;
      } else {
        const rot = rightLegRef.current.rotation;
        const prev = rightLegTargetRef.current;
        rot.x = prev + (rot.x - prev) * SMOOTH;
        rightLegTargetRef.current = rot.x;
      }
    }

    const isSitting = agent.state === "sitting";
    const working =
      isSitting || isWorkout || isDancing || agent.status === "working";
    const isError = agent.status === "error";
    const isAway = agent.state === "away";
    // Seated agents must look completely still — no pulsing ring, no nameplate
    // bounce, nothing that reads as an idle animation. We still keep the
    // colour cue (green dot / green ring) because that's a static signal, not
    // an animation. `pulseActive` is the flag that gates every continuous
    // sin-based oscillation around the agent so the chair/sofa poses read as
    // truly static.
    const pulseActive = working && !isSitting;

    if (statusDotMatRef.current) {
      statusDotMatRef.current.color.set(
        isError ? "#ef4444" : working ? "#22c55e" : "#f59e0b",
      );
    }

    if (pulseRingRef.current && pulseRingMatRef.current) {
      if (isSitting) {
        // Freeze the ring completely while seated — no sin() drive at all.
        pulseRingRef.current.scale.setScalar(1.16);
        pulseRingMatRef.current.color.set(
          isError ? "#ef4444" : "#22c55e",
        );
        pulseRingMatRef.current.opacity = 0.22;
        pulseRingRef.current.visible = true;
      } else {
        const pulse =
          (Math.sin(agent.frame * (isError ? 0.15 : pulseActive ? 0.08 : 0.05)) +
            1) /
          2;
        const scale = isError
          ? 1.24 + pulse * 0.52
          : pulseActive
            ? 1.18 + pulse * 0.74
            : 1.08 + pulse * 0.18;
        pulseRingRef.current.scale.setScalar(scale);
        pulseRingMatRef.current.color.set(
          isError ? "#ef4444" : working ? "#22c55e" : "#38bdf8",
        );
        pulseRingMatRef.current.opacity = isError
          ? 0.68 - pulse * 0.24
          : pulseActive
            ? 0.52 - pulse * 0.4
            : 0.18 + pulse * 0.08;
        pulseRingRef.current.visible = true;
      }
    }

    if (nameplateRef.current) {
      if (isSitting) {
        // Nameplate sits still while seated — no scale pulse, no bob.
        nameplateRef.current.scale.set(1.02, 1.02, 1);
        nameplateRef.current.position.y = 0;
      } else {
        const pulse =
          (Math.sin(agent.frame * (isError ? 0.16 : pulseActive ? 0.09 : 0.05)) +
            1) /
          2;
        const scale = isError
          ? 1.035 + pulse * 0.03
          : pulseActive
            ? 1.02 + pulse * 0.025
            : 1.01 + pulse * 0.01;
        nameplateRef.current.scale.set(scale, scale, 1);
        nameplateRef.current.position.y = pulseActive
          ? pulse * 0.012
          : pulse * 0.008;
      }
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

    // "zzz" bubble floats above agents who are away OR dozing on the lounge.
    const showSleepBubble = isAway || isLoungeSit;
    if (awayBubbleRef.current) {
      awayBubbleRef.current.visible = showSleepBubble;
      if (showSleepBubble) {
        // Gentle bob + faint pulse so the bubble reads as "sleeping".
        const bob = Math.sin(frameValue * 0.04) * 0.04;
        awayBubbleRef.current.position.y = bob;
      }
    }
    if (bodyMatRef.current) bodyMatRef.current.opacity = isAway ? 0.45 : 1;
    // v41 perf: only traverse the mesh tree when `isAway` actually flips.
    // Previously this ran EVERY FRAME for EVERY agent — the single biggest hot
    // path in the scene (each traverse walks ~40 meshes per agent).
    if (groupRef.current && lastAwayRef.current !== isAway) {
      lastAwayRef.current = isAway;
      const opacity = isAway ? 0.45 : 1;
      groupRef.current.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshLambertMaterial
        ) {
          child.material.transparent = isAway;
          child.material.opacity = opacity;
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
  const showGlasses = resolvedAppearance.accessories.glasses;
  const showHeadset = resolvedAppearance.accessories.headset;
  const showBackpack = resolvedAppearance.accessories.backpack;
  const showScarf = resolvedAppearance.accessories.scarf;
  const showWatch = resolvedAppearance.accessories.watch;
  const accessoryColor = topColor;
  const sleeveColor = topStyle === "jacket" || topStyle === "vest" ? "#dbe4ff" : topColor;
  const cuffColor = topStyle === "hoodie" || topStyle === "sweater" ? "#d1d5db" : sleeveColor;
  const topAccentColor = topStyle === "jacket" ? "#1f2937" : cuffColor;
  const hasSleeves = topStyle !== "tank" && topStyle !== "vest";

  const faceTexture = useMemo(() => {
    // v42 polish: richer face texture with subtle contour shading so the head
    // reads as a proper face instead of a flat-colored square.
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Base skin fill
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, 128, 128);

    // Subtle vertical gradient — lighter forehead, warmer chin
    const topGradient = ctx.createLinearGradient(0, 0, 0, 128);
    topGradient.addColorStop(0, "rgba(255,240,220,0.22)");
    topGradient.addColorStop(0.45, "rgba(255,255,255,0)");
    topGradient.addColorStop(1, "rgba(196,122,84,0.14)");
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, 128, 128);

    // Soft side shading for a rounded-head illusion
    const sideGradient = ctx.createLinearGradient(0, 0, 128, 0);
    sideGradient.addColorStop(0, "rgba(90,60,40,0.18)");
    sideGradient.addColorStop(0.18, "rgba(90,60,40,0)");
    sideGradient.addColorStop(0.82, "rgba(90,60,40,0)");
    sideGradient.addColorStop(1, "rgba(90,60,40,0.18)");
    ctx.fillStyle = sideGradient;
    ctx.fillRect(0, 0, 128, 128);

    // Warm cheek blush
    ctx.fillStyle = "rgba(224,124,108,0.28)";
    ctx.beginPath();
    ctx.ellipse(36, 78, 11, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(92, 78, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Forehead highlight
    ctx.fillStyle = "rgba(255,245,225,0.16)";
    ctx.beginPath();
    ctx.ellipse(64, 28, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chin highlight (subtle jawline hint)
    ctx.fillStyle = "rgba(180,110,80,0.12)";
    ctx.beginPath();
    ctx.ellipse(64, 108, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose — soft shadow on one side + bridge highlight
    ctx.fillStyle = "rgba(170,100,70,0.25)";
    ctx.fillRect(66, 58, 4, 18);
    ctx.fillStyle = "rgba(255,235,210,0.28)";
    ctx.fillRect(60, 58, 4, 18);
    // Nose tip shading
    ctx.fillStyle = "rgba(170,100,70,0.32)";
    ctx.beginPath();
    ctx.ellipse(64, 78, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

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
      {/* v42 polish: layered soft shadow — inner dense, outer diffused */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 18]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* ── Skirt (single piece covering both legs) ── */}
      {bottomStyle === "skirt" ? (
        <group>
          {/* v42: slightly flared skirt with hem line */}
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.21, 0.1, 0.105]} />
            <meshLambertMaterial color={trouserColor} />
          </mesh>
          <mesh position={[0, 0.082, 0]}>
            <boxGeometry args={[0.215, 0.015, 0.108]} />
            <meshLambertMaterial color={cuffColor} />
          </mesh>
          <group ref={rightLegRef} position={[-0.045, 0.04, 0]}>
            <mesh>
              <cylinderGeometry args={[0.023, 0.022, 0.08, 12]} />
              <meshLambertMaterial color={skin} />
            </mesh>
            {/* Shoe: sole + upper */}
            <mesh position={[0, -0.075, 0.008]}>
              <boxGeometry args={[0.07, 0.025, 0.12]} />
              <meshLambertMaterial color="#17191d" />
            </mesh>
            <mesh position={[0, -0.055, 0.008]}>
              <boxGeometry args={[0.068, 0.035, 0.115]} />
              <meshLambertMaterial color={shoeColor} />
            </mesh>
          </group>
          <group ref={leftLegRef} position={[0.045, 0.04, 0]}>
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
          <group ref={rightLegRef} position={[-0.045, 0.1, 0]}>
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
            {/* v42 polish: dark shoe sole + colored upper */}
            <mesh position={[0, -0.11, 0.008]}>
              <boxGeometry args={[0.072, 0.022, 0.122]} />
              <meshLambertMaterial color="#17191d" />
            </mesh>
            <mesh position={[0, -0.09, 0.008]}>
              <boxGeometry args={[0.07, 0.032, 0.118]} />
              <meshLambertMaterial color={shoeColor} />
            </mesh>
            {/* Toe cap detail */}
            <mesh position={[0, -0.085, 0.05]}>
              <boxGeometry args={[0.068, 0.03, 0.022]} />
              <meshLambertMaterial color="#1f2937" />
            </mesh>
          </group>
          <group ref={leftLegRef} position={[0.045, 0.1, 0]}>
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
      {/* v42 polish: refined torso with a slight waist taper via a secondary
          lower band. The primary torso still owns bodyMatRef so the opacity
          fade for "away" agents keeps working. */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.185, 0.16, 0.105]} />
        <meshLambertMaterial ref={bodyMatRef} color={topColor} />
      </mesh>
      {/* Waist cap — slightly narrower, gives torso a softer silhouette */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.1]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      {/* Shoulder rounding — subtle caps that connect torso to arms */}
      <mesh position={[-0.095, 0.355, 0]}>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      <mesh position={[0.095, 0.355, 0]}>
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshLambertMaterial color={topColor} />
      </mesh>
      {/* Subtle shirt neckline — crew collar */}
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
      {/* ── Watch on left wrist ── */}
      {showWatch ? (
        <mesh position={[0.12, 0.12, 0.018]}>
          <boxGeometry args={[0.035, 0.015, 0.035]} />
          <meshLambertMaterial color="#334155" />
        </mesh>
      ) : null}
      {/* ── Scarf ── */}
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
      <group ref={rightArmRef} position={[-0.12, 0.28, 0]}>
        {/* v42 polish: shoulder cap (rounded sphere) gives anatomy */}
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
        {/* v42 polish: rounded hand */}
        <mesh position={[0, -0.175, 0]}>
          <sphereGeometry args={[0.03, 14, 12]} />
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
      <group ref={leftArmRef} position={[0.12, 0.28, 0]}>
        {/* v42 polish: shoulder cap */}
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
        {/* v42 polish: rounded hand */}
        <mesh position={[0, -0.175, 0]}>
          <sphereGeometry args={[0.03, 14, 12]} />
          <meshLambertMaterial color={skin} />
        </mesh>
      </group>
      {/* v42 polish: cylindrical neck for rounded look */}
      <mesh position={[0, 0.405, 0]}>
        <cylinderGeometry args={[0.036, 0.04, 0.055, 14]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      {/* v42 polish: slightly taller head with chin softening block below */}
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[0.16, 0.16, 0.14]} />
        <meshLambertMaterial attach="material-0" color={skin} />
        <meshLambertMaterial attach="material-1" color={skin} />
        <meshLambertMaterial attach="material-2" color={skin} />
        <meshLambertMaterial attach="material-3" color={skin} />
        <meshLambertMaterial attach="material-4" map={faceTexture} />
        <meshLambertMaterial attach="material-5" color={skin} />
      </mesh>
      {/* Chin softening — small rounded bottom of head */}
      <mesh position={[0, 0.4, 0.012]}>
        <boxGeometry args={[0.12, 0.04, 0.11]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      {/* v42 polish: left & right ears */}
      <mesh position={[-0.082, 0.475, 0]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      <mesh position={[0.082, 0.475, 0]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshLambertMaterial color={skin} />
      </mesh>
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
      {/* v42 polish: softer brows (slightly arched via wider rectangle) */}
      <mesh ref={leftBrowRef} position={[-0.04, 0.52, 0.074]}>
        <boxGeometry args={[0.042, 0.012, 0.01]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
      <mesh ref={rightBrowRef} position={[0.04, 0.52, 0.074]}>
        <boxGeometry args={[0.042, 0.012, 0.01]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
      {/* v42 polish: eye whites behind the pupil for depth */}
      <mesh position={[-0.04, 0.475, 0.07]}>
        <boxGeometry args={[0.034, 0.034, 0.006]} />
        <meshBasicMaterial color="#f5f1e8" />
      </mesh>
      <mesh position={[0.04, 0.475, 0.07]}>
        <boxGeometry args={[0.034, 0.034, 0.006]} />
        <meshBasicMaterial color="#f5f1e8" />
      </mesh>
      {/* Iris ring — warm brown */}
      <mesh position={[-0.04, 0.475, 0.073]}>
        <boxGeometry args={[0.026, 0.026, 0.004]} />
        <meshBasicMaterial color="#6b3e22" />
      </mesh>
      <mesh position={[0.04, 0.475, 0.073]}>
        <boxGeometry args={[0.026, 0.026, 0.004]} />
        <meshBasicMaterial color="#6b3e22" />
      </mesh>
      {/* Pupil (animated) */}
      <mesh ref={leftEyeRef} position={[-0.04, 0.475, 0.076]}>
        <boxGeometry args={[0.018, 0.022, 0.004]} />
        <meshBasicMaterial color="#10101c" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.04, 0.475, 0.076]}>
        <boxGeometry args={[0.018, 0.022, 0.004]} />
        <meshBasicMaterial color="#10101c" />
      </mesh>
      {/* Catchlight highlights */}
      <mesh ref={leftEyeHighlightRef} position={[-0.033, 0.482, 0.078]}>
        <boxGeometry args={[0.008, 0.008, 0.003]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh ref={rightEyeHighlightRef} position={[0.047, 0.482, 0.078]}>
        <boxGeometry args={[0.008, 0.008, 0.003]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
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
      {/* v42 polish: nicer mouth with slight depth */}
      <mesh ref={mouthRef} position={[0, 0.436, 0.074]}>
        <boxGeometry args={[0.044, 0.014, 0.006]} />
        <meshBasicMaterial color="#a85560" />
      </mesh>
      {/* Upper-lip shadow (subtle, behind mouth) */}
      <mesh position={[0, 0.444, 0.073]}>
        <boxGeometry args={[0.036, 0.006, 0.003]} />
        <meshBasicMaterial color="#7c3f45" />
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
        <Billboard position={[0, 1.35, 0]}>
          {/* Soft cloud-shaped sleep bubble */}
          <mesh position={[0, 0, -0.002]}>
            <planeGeometry args={[0.38, 0.22]} />
            <meshBasicMaterial color="#121622" transparent opacity={0.82} />
          </mesh>
          <mesh position={[0, 0, -0.001]}>
            <planeGeometry args={[0.36, 0.20]} />
            <meshBasicMaterial color="#1e2438" transparent opacity={0.9} />
          </mesh>
          {/* Z Z Z — ascending sizes so it reads as "floating up" */}
          <Text
            position={[-0.09, -0.025, 0.001]}
            fontSize={0.09}
            color="#7a93c2"
            anchorX="center"
            anchorY="middle"
          >
            z
          </Text>
          <Text
            position={[0.0, 0.005, 0.001]}
            fontSize={0.11}
            color="#a8bfe6"
            anchorX="center"
            anchorY="middle"
          >
            Z
          </Text>
          <Text
            position={[0.105, 0.04, 0.001]}
            fontSize={0.13}
            color="#d6e4ff"
            anchorX="center"
            anchorY="middle"
          >
            Z
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
