<script setup lang="ts">
// The hero: every day of both GitHub accounts as a glowing tower (one column per week, one row per weekday).
// Height = contributions (log scale), colour = who made them (cyan personal → gold work).
// `progress` (0..1, from the hero's scroll) flies the camera from a skyline overview through 2017 → today.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Day } from "~/shared/contributions";

const props = defineProps<{ days: Day[]; progress: number; /** skip the grow-in and camera easing */ instant?: boolean }>();
const emit = defineEmits<{
  hover: [day: { date: string; personal: number; work: number; x: number; y: number } | null];
  focus: [year: number];
  failed: [];
}>();

const host = ref<HTMLDivElement>();
const reduced = useReducedMotion();

const BG = new THREE.Color("#0b0b10");
const PERSONAL = new THREE.Color("#44bce3");
const WORK = new THREE.Color("#f2c94c");
const EMPTY = new THREE.Color("#1b1f2c");
const COL = 1; // world units per week
const ROW = 1; // per weekday

let renderer: THREE.WebGLRenderer | undefined;
let composer: EffectComposer | undefined;
let bloom: UnrealBloomPass | undefined;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let towers: THREE.InstancedMesh | undefined;
let towerMat: THREE.ShaderMaterial | undefined;
let raf = 0;
let ro: ResizeObserver | undefined;
let clock: THREE.Clock;
let weeks = 1;
let instanceDays: Day[] = [];
let yearStarts: { year: number; x: number }[] = [];
let peakX = 0; // middle of the busiest year: the opening shot
const pointer = new THREE.Vector2(9, 9);
const parallax = { x: 0, y: 0 };
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
let visible = true;
let io: IntersectionObserver | undefined;

// ---------- shaders ----------
const towerVert = /* glsl */ `
  attribute float aDelay;
  uniform float uGrow;
  uniform float uTime;
  varying vec3 vColor;
  varying float vY;
  varying float vTop;
  varying float vDist;
  varying float vShine;
  void main() {
    float g = clamp((uGrow - aDelay) / 0.9, 0.0, 1.0);
    g = 1.0 - pow(1.0 - g, 3.0);
    vec3 p = vec3(position.x, position.y * g, position.z);
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vY = position.y;
    vTop = step(0.5, normal.y);
    vColor = instanceColor;
    vShine = 0.5 + 0.5 * sin(uTime * 1.6 + aDelay * 23.0);
    vec4 mv = viewMatrix * world;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const towerFrag = /* glsl */ `
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vColor;
  varying float vY;
  varying float vTop;
  varying float vDist;
  varying float vShine;
  void main() {
    vec3 c = vColor * (0.12 + 0.75 * pow(vY, 1.8));
    c += vColor * vTop * (0.35 + 0.35 * vShine);
    float f = smoothstep(uFogNear, uFogFar, vDist);
    gl_FragColor = vec4(mix(c, uFog, f), 1.0);
  }
`;
const groundFrag = /* glsl */ `
  uniform vec3 uFog;
  uniform vec3 uLine;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorld;
  varying float vDist;
  void main() {
    vec2 g = abs(fract(vWorld.xz - 0.5) - 0.5) / fwidth(vWorld.xz);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    vec2 g4 = abs(fract(vWorld.xz / 8.0 - 0.5) - 0.5) / fwidth(vWorld.xz / 8.0);
    float major = 1.0 - min(min(g4.x, g4.y), 1.0);
    vec3 c = uFog + uLine * (line * 0.05 + major * 0.12);
    float f = smoothstep(uFogNear, uFogFar, vDist);
    gl_FragColor = vec4(mix(c, uFog, f), 1.0);
  }
`;
const groundVert = /* glsl */ `
  varying vec3 vWorld;
  varying float vDist;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mv = viewMatrix * w;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

// ---------- layout ----------
/** Monday-based weekday 0..6 and week index since the first week */
function layout(days: Day[]) {
  const first = new Date(`${days[0]![0]}T00:00:00Z`);
  const firstDow = (first.getUTCDay() + 6) % 7;
  return days.map(([date]) => {
    const d = new Date(`${date}T00:00:00Z`);
    const dayIndex = Math.round((d.getTime() - first.getTime()) / 86400000) + firstDow;
    return { week: Math.floor(dayIndex / 7), dow: dayIndex % 7 };
  });
}

const heightFor = (n: number) => (n === 0 ? 0.06 : 0.4 + Math.log1p(n) * 2.1);

function colorFor(p: number, w: number, out: THREE.Color) {
  if (p + w === 0) return out.copy(EMPTY);
  out.copy(PERSONAL).lerp(WORK, w / (p + w));
  // busier days glow hotter (bloom picks up the brightest)
  return out.multiplyScalar(0.55 + Math.min(1, Math.log1p(p + w) / 5) * 0.65);
}

function yearLabel(year: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.font = "800 132px Unbounded, Fira Sans, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(60, 240, 185, 0.85)";
  ctx.fillText(String(year), 8, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 2.25),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function build(days: Day[]) {
  if (!days.length) return;
  const cells = layout(days);
  weeks = cells.at(-1)!.week + 1;
  instanceDays = days;

  const geo = new THREE.BoxGeometry(0.8, 1, 0.8);
  geo.translate(0, 0.5, 0);
  const delays = new Float32Array(days.length);
  towerMat = new THREE.ShaderMaterial({
    vertexShader: towerVert,
    fragmentShader: towerFrag,
    uniforms: {
      uGrow: { value: reduced.value || props.instant ? 99 : 0 },
      uTime: { value: 0 },
      uFog: { value: BG },
      uFogNear: { value: 40 },
      uFogFar: { value: 150 },
    },
  });
  towers = new THREE.InstancedMesh(geo, towerMat, days.length);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const col = new THREE.Color();
  days.forEach(([, p, w], i) => {
    const { week, dow } = cells[i]!;
    pos.set(week * COL, 0, (dow - 3) * ROW);
    scale.set(1, heightFor(p + w), 1);
    m.compose(pos, quat, scale);
    towers!.setMatrixAt(i, m);
    towers!.setColorAt(i, colorFor(p, w, col));
    // grow in as a wave from the newest week backwards, so the hero's first view (the overview) fills right away
    delays[i] = ((weeks - week) / weeks) * 2.2 + Math.random() * 0.25;
  });
  geo.setAttribute("aDelay", new THREE.InstancedBufferAttribute(delays, 1));
  towers.instanceMatrix.needsUpdate = true;
  towers.instanceColor!.needsUpdate = true;
  towers.frustumCulled = false;
  scene.add(towers);

  // glowing year numbers on the floor, in front of each year's first week
  yearStarts = [];
  let lastYear = 0;
  days.forEach(([date], i) => {
    const y = Number(date.slice(0, 4));
    if (y === lastYear) return;
    lastYear = y;
    const x = cells[i]!.week * COL;
    yearStarts.push({ year: y, x });
    const label = yearLabel(y);
    label.position.set(x + 3.2, 0.02, 6.4);
    scene.add(label);
  });

  // the opening shot frames the busiest year
  const totals = new Map<number, number>();
  for (const [date, p, w] of days) totals.set(Number(date.slice(0, 4)), (totals.get(Number(date.slice(0, 4))) ?? 0) + p + w);
  const peakYear = [...totals].sort((a, b) => b[1] - a[1])[0]![0];
  const ys = yearStarts.findIndex((s) => s.year === peakYear);
  const ye = yearStarts[ys + 1]?.x ?? weeks * COL;
  peakX = (yearStarts[ys]!.x + ye) / 2;

  // ground grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(weeks * COL + 400, 400),
    new THREE.ShaderMaterial({
      vertexShader: groundVert,
      fragmentShader: groundFrag,
      uniforms: { uFog: { value: BG }, uLine: { value: new THREE.Color("#44bce3") }, uFogNear: { value: 30 }, uFogFar: { value: 140 } },
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((weeks * COL) / 2, -0.01, 0);
  scene.add(ground);

  // star dust far above and behind the city
  const n = 1400;
  const stars = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    stars[i * 3] = Math.random() * (weeks + 200) - 100;
    stars[i * 3 + 1] = 20 + Math.random() * 90;
    stars[i * 3 + 2] = -60 - Math.random() * 120;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#9fb3d1", size: 0.35, transparent: true, opacity: 0.7, depthWrite: false })));

  placeCamera(props.progress, true);
}

// ---------- camera path ----------
const smooth = (t: number) => t * t * (3 - 2 * t);
function target(p: number) {
  const W = weeks * COL;
  // low, close and to the right, so the skyline fills the right of the screen next to the title
  const narrow = camera.aspect < 1;
  // phones: the title + stats take the top two thirds, so the skyline sits low in the frame
  const overviewPos = narrow ? new THREE.Vector3(peakX + 26, 6, 40) : new THREE.Vector3(peakX + 30, 15, 34);
  const overviewLook = narrow ? new THREE.Vector3(peakX - 4, 17, -2) : new THREE.Vector3(peakX - 22, 8, -4);
  const fly = (x: number) => ({ pos: new THREE.Vector3(x - 16, 9, 19), look: new THREE.Vector3(x + 10, 1.5, -2) });
  const start = fly(0);
  const end = fly(W);
  const outroPos = new THREE.Vector3(W - 40, 34, 70);
  const outroLook = new THREE.Vector3(W - 70, 0, 0);

  if (p < 0.14) {
    const t = smooth(p / 0.14);
    return { pos: overviewPos.clone().lerp(start.pos, t), look: overviewLook.clone().lerp(start.look, t) };
  }
  if (p < 0.9) {
    const f = fly(((p - 0.14) / 0.76) * W);
    return f;
  }
  const t = smooth((p - 0.9) / 0.1);
  return { pos: end.pos.clone().lerp(outroPos, t), look: end.look.clone().lerp(outroLook, t) };
}

function placeCamera(p: number, snap = false) {
  if (!camera || !weeks) return;
  const t = target(p);
  t.pos.x += parallax.x * 3;
  t.pos.y += parallax.y * 2;
  if (snap) {
    camPos.copy(t.pos);
    camLook.copy(t.look);
  } else {
    camPos.lerp(t.pos, 0.08);
    camLook.lerp(t.look, 0.08);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  // fog starts a bit past what the camera is looking at, wherever that is
  if (towerMat) {
    const d = camPos.distanceTo(camLook);
    towerMat.uniforms.uFogNear!.value = d * 0.9;
    towerMat.uniforms.uFogFar!.value = d * 0.9 + 110;
  }
}

let lastFocusYear = 0;
function reportFocus() {
  if (!yearStarts.length) return;
  const x = camLook.x - 10;
  let y = yearStarts[0]!.year;
  for (const s of yearStarts) if (s.x <= x) y = s.year;
  if (y !== lastFocusYear) {
    lastFocusYear = y;
    emit("focus", y);
  }
}

// ---------- hover ----------
let lastHover = -1;
function pick(clientX: number, clientY: number) {
  if (!towers || !renderer) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(towers, false)[0];
  const i = hit?.instanceId ?? -1;
  if (i === lastHover) {
    if (i >= 0) emitHover(i, clientX, clientY);
    return;
  }
  lastHover = i;
  if (i < 0) return emit("hover", null);
  emitHover(i, clientX, clientY);
}
function emitHover(i: number, x: number, y: number) {
  const [date, personal, work] = instanceDays[i]!;
  emit("hover", { date, personal, work, x, y });
}
function onPointerMove(e: PointerEvent) {
  if (e.pointerType !== "mouse") return;
  parallax.x = (e.clientX / innerWidth - 0.5) * 2;
  parallax.y = (e.clientY / innerHeight - 0.5) * -2;
  pick(e.clientX, e.clientY);
}
function onPointerLeave() {
  lastHover = -1;
  emit("hover", null);
}

// ---------- loop ----------
function resize() {
  if (!renderer || !host.value) return;
  const w = host.value.clientWidth;
  const h = host.value.clientHeight;
  const small = w < 768;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.75));
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  if (bloom) bloom.enabled = !small;
  camera.aspect = w / h;
  camera.fov = small ? 62 : 48;
  camera.updateProjectionMatrix();
}

function frame() {
  raf = requestAnimationFrame(frame);
  if (!visible || !renderer) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  if (towerMat) {
    towerMat.uniforms.uTime!.value += dt;
    if (!reduced.value && towerMat.uniforms.uGrow!.value < 4) towerMat.uniforms.uGrow!.value += dt;
  }
  placeCamera(props.progress, reduced.value || props.instant);
  reportFocus();
  composer ? composer.render() : renderer.render(scene, camera);
}

onMounted(() => {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    emit("failed");
    return;
  }
  renderer.setClearColor(BG);
  renderer.domElement.className = "city-canvas";
  host.value!.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = BG;
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
  clock = new THREE.Clock();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.42);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  resize();
  ro = new ResizeObserver(resize);
  ro.observe(host.value!);
  io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; clock.getDelta(); });
  io.observe(host.value!);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  host.value!.addEventListener("pointerleave", onPointerLeave);
  build(props.days);
  raf = requestAnimationFrame(frame);
});

watch(() => props.days, (d) => { if (scene && !towers) build(d); });

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  ro?.disconnect();
  io?.disconnect();
  window.removeEventListener("pointermove", onPointerMove);
  host.value?.removeEventListener("pointerleave", onPointerLeave);
  scene?.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material & { map?: THREE.Texture };
    mat?.map?.dispose();
    mat?.dispose?.();
  });
  composer?.dispose();
  renderer?.dispose();
});
</script>

<template>
  <div ref="host" class="city" />
</template>

<style scoped>
.city { position: absolute; inset: 0; }
.city :deep(.city-canvas) { display: block; width: 100%; height: 100%; }
</style>
