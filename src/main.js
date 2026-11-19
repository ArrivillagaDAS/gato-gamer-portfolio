import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GamerCat } from './cat/GamerCat.js';
import { createCustomizer } from './ui/customizer.js';
import { createHud } from './ui/hud.js';
import { loadLook, saveLook } from './state.js';
import { Physics } from './physics/Physics.js';
import { buildRoom } from './world/Room.js';
import { buildMaze, MAZE_ORIGIN } from './world/Maze.js';
import { CatController } from './player/CatController.js';
import { FollowCamera } from './camera/FollowCamera.js';
import { Input } from './input/Input.js';
import { WireGame } from './minigame/WireGame.js';
import { Music } from './audio/Music.js';
import { createJukeboxMenu } from './ui/jukeboxMenu.js';
import { createCredits } from './ui/credits.js';
import './style.css';

const SHOWROOM_CAT_H = 0.7;  // alto del gato en la vitrina
const ROOM_CAT_H = 0.32;     // alto real (m) dentro del cuarto

const canvas = document.getElementById('scene');
const isMobile = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile || devicePixelRatio < 2 });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 60);

// ======================= VITRINA (personalización) =======================
const showroom = new THREE.Scene();
showroom.background = new THREE.Color(0x0f0e15);
showroom.fog = new THREE.Fog(0x0f0e15, 4, 9);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.2;
controls.maxDistance = 3.5;
controls.maxPolarAngle = Math.PI * 0.48;

showroom.add(new THREE.HemisphereLight(0xd8d4ff, 0x2a2040, 1.4));
{
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 4, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
  key.shadow.camera.right = key.shadow.camera.top = 1.5;
  showroom.add(key);
  const rimA = new THREE.PointLight(0xff4fd8, 2.5, 5); rimA.position.set(-1.2, 0.8, -1); showroom.add(rimA);
  const rimB = new THREE.PointLight(0x38e1ff, 2, 5); rimB.position.set(1.2, 0.6, -1.2); showroom.add(rimB);
}
const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 0.95, 0.08, 48),
  new THREE.MeshStandardMaterial({ color: 0x1b1828, roughness: 0.85 }),
);
stage.position.y = -0.04; stage.receiveShadow = true; showroom.add(stage);
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff4fd8 }));
ring.rotation.x = Math.PI / 2; ring.position.y = 0.001; showroom.add(ring);
{
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: 0x14121d, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; floor.receiveShadow = true; showroom.add(floor);
}

const view = { target: new THREE.Vector3(), camPos: new THREE.Vector3() };
function frameShowroom() {
  if (innerWidth >= 820) { view.target.set(-0.38, 0.32, 0); view.camPos.set(0.9, 0.75, 1.75); }
  else { view.target.set(0, -0.12, 0); view.camPos.set(1.2, 0.85, 2.6); } // gato arriba, panel abajo
}
controls.addEventListener('start', () => { controls.dragging = true; spin = 0; view.camPos.copy(camera.position); });
controls.addEventListener('end', () => { controls.dragging = false; view.camPos.copy(camera.position); });

// ======================= MUNDO (cuarto + laberinto) =======================
const world = new THREE.Scene();
const ZONES = {
  room: { bg: 0x0f0e15, fog: [7, 16], hemi: [0xa99eff, 0x2a1d3a, 1.1], center: new THREE.Vector3(0, 0, 0) },
  maze: { bg: 0xa9dcff, fog: [9, 22], hemi: [0xe6f6ff, 0x4f8a3a, 1.5], center: MAZE_ORIGIN.clone() },
};
world.background = new THREE.Color(ZONES.room.bg);
world.fog = new THREE.Fog(ZONES.room.bg, ...ZONES.room.fog);
const hemi = new THREE.HemisphereLight(...ZONES.room.hemi);
world.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6d0, 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 16 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
world.add(sun, sun.target);

let room = null, maze = null, physics = null, player = null;
let zone = 'room';
const follow = new FollowCamera(camera, canvas);
const input = new Input(document.body);
const hud = createHud(document.getElementById('world'));

function setZone(name) {
  zone = name;
  const z = ZONES[name];
  world.background.set(z.bg);
  world.fog.color.set(z.bg); [world.fog.near, world.fog.far] = z.fog;
  hemi.color.set(z.hemi[0]); hemi.groundColor.set(z.hemi[1]); hemi.intensity = z.hemi[2];
  sun.position.copy(z.center).add(new THREE.Vector3(3, 6, 4));
  sun.target.position.copy(z.center);
  sun.intensity = name === 'room' ? 1.8 : 2.6; // el jardín está a pleno sol
  sun.color.set(name === 'room' ? 0xffe6d0 : 0xfff2d6);
  const ext = name === 'room' ? 4.5 : 6;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext });
  sun.shadow.camera.updateProjectionMatrix();
  // solo se dibuja (y se ilumina) la zona activa
  room.group.visible = name === 'room';
  maze.group.visible = name === 'maze';
  follow.bounds = name === 'room' ? room.bounds : null;
  follow.occluders = name === 'room' ? room.occluders : [];
  follow.minPitch = name === 'maze' ? 0.6 : 0.42;
  follow.pitch = Math.max(follow.pitch, follow.minPitch);
  hud.setFish(name === 'maze' ? maze : null);
}

async function ensureWorld() {
  if (room) return;
  physics = await Physics.create();
  room = await buildRoom(world, physics, {
    onLaserCatch: (n) => hud.toast(`¡Atrapaste el láser! x${n}`),
    onJukebox: () => { input.setEnabled(false); hud.prompt(null); jukeboxMenu.show(); },
    onArcade: () => setTimeout(openArcade, 350),
  });
  maze = buildMaze(world, physics);
  player = new CatController(physics, cat, input);
  player.spawn(room.spawn);
}

// ======================= estado general =======================
let mode = 'custom';
let spin = 0.35;
let busy = false; // durante la transición del túnel

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  // en el cuarto, lente más abierta para ver el diseño completo (más aún en móvil vertical)
  camera.fov = mode === 'custom' ? 36 : innerWidth < innerHeight ? 62 : 52;
  camera.updateProjectionMatrix();
  if (mode === 'custom') frameShowroom();
}
resize();
camera.position.copy(view.camPos);
controls.target.copy(view.target);
addEventListener('resize', resize);

const loading = document.getElementById('loading');
const cat = new GamerCat({ height: SHOWROOM_CAT_H });
await cat.load();
showroom.add(cat.root);
const look = loadLook();
cat.applyLook(look);
loading.classList.add('done');

// ======================= música y arcade =======================
const music = new Music();
const jukeboxMenu = createJukeboxMenu(music, { onClose: () => { if (mode === 'room') input.setEnabled(true); } });
const credits = createCredits({ onClose: () => { if (mode === 'room') input.setEnabled(true); } });
document.getElementById('credits-btn').addEventListener('click', () => { input.setEnabled(false); hud.prompt(null); credits.show(); });
const wire = new WireGame(cat, {
  onExit: () => {
    mode = 'room';
    hudEl.hidden = false;
    input.setEnabled(true);
    resize();
  },
});
function openArcade() {
  if (mode !== 'room' || busy) return;
  mode = 'arcade';
  input.setEnabled(false);
  hud.prompt(null);
  hudEl.hidden = true;
  wire.open();
}
addEventListener('resize', () => wire.active && wire.resize());

// tocar al gato en la vitrina = saludo
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (mode !== 'custom' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  if (ray.intersectObject(cat.root, true).length) cat.react();
});

// ======================= transiciones =======================
const ui = document.getElementById('ui');
const hudEl = document.getElementById('world');

async function enterRoom() {
  customizer.hide();
  loading.textContent = 'Preparando el cuarto…';
  loading.classList.remove('done');
  await ensureWorld();
  mode = 'room';
  controls.enabled = false;
  world.add(cat.root);
  cat.root.scale.setScalar(ROOM_CAT_H / SHOWROOM_CAT_H);
  setZone('room');
  player.spawn(room.spawn);
  player.yaw = -Math.PI / 2; // de cara a la cámara
  follow.enabled = true;
  // cámara desde el lado del escritorio mirando a la ventana, el rascador y el arcade
  follow.yaw = -Math.PI / 2 - 0.35; follow.pitch = 0.72; follow.distance = 3.0;
  follow.snap(cat.root.position);
  input.setEnabled(true);
  hudEl.hidden = false;
  canvas.classList.add('grab');
  resize();
  loading.classList.add('done');
  hud.toast('Arrastra para mirar alrededor · busca el arenero', 4200);
}

function backToShowroom() {
  if (busy) return;
  mode = 'custom';
  input.setEnabled(false);
  follow.enabled = false;
  hudEl.hidden = true;
  canvas.classList.remove('grab');
  hud.prompt(null);
  showroom.add(cat.root);
  cat.root.scale.setScalar(1);
  cat.root.position.set(0, 0, 0);
  cat.root.rotation.set(0, 0, 0);
  player.override = null; player.frozen = 0;
  cat.play('Idle');
  controls.enabled = true;
  resize();
  customizer.show();
}

/** Cavar en el arenero: animación + túnel + aparecer en el otro lado. */
function dig(to) {
  if (busy) return;
  busy = true;
  hud.prompt(null);
  player.perform('Idle_Eating', 1.6);
  hud.sand(true);
  setTimeout(() => hud.tunnel(to === 'maze' ? 'Cavando un túnel…' : 'De vuelta al cuarto…'), 700);
  setTimeout(() => {
    hud.sand(false);
    if (to === 'maze') {
      setZone('maze');
      player.spawn(maze.spawn);
      player.yaw = Math.PI * 0.75;
      follow.yaw = Math.PI * 0.75 + Math.PI; follow.pitch = 0.95; follow.distance = 3.4;
    } else {
      setZone('room');
      player.spawn(room.litter.exitPoint);
      player.yaw = Math.PI * 0.75;
      follow.yaw = Math.PI * 0.75 + Math.PI; follow.pitch = 0.72; follow.distance = 3.0;
    }
    player.perform('Jump_Loop', 0.35);
    follow.snap(cat.root.position);
  }, 1500);
  setTimeout(() => {
    busy = false;
    if (to === 'maze') hud.toast(`Encuentra los ${maze.total} pescados dorados y la salida`, 4500);
    else hud.toast(maze.collected === maze.total ? '¡Laberinto completado!' : `Llevas ${maze.collected}/${maze.total}. ¡El arenero sigue abierto!`, 3500);
  }, 2400);
}

const customizer = createCustomizer(ui, {
  look,
  onChange(next) {
    const accessoryAdded = (next.headset && !cat.look.headset) || (next.collar && !cat.look.collar);
    cat.applyLook(next);
    saveLook(next);
    if (accessoryAdded) cat.react();
  },
  onEnter(final) {
    saveLook(final);
    enterRoom();
  },
  onCredits: () => credits.show(),
});
document.getElementById('edit-cat').addEventListener('click', backToShowroom);
addEventListener('keydown', (e) => { if (mode === 'room' && e.code === 'Escape' && !jukeboxMenu.open && !credits.open) backToShowroom(); });

// ======================= lógica de interacción =======================
const feet = new THREE.Vector3();
function interactions() {
  feet.copy(cat.root.position);
  let act = null, label = null;
  if (zone === 'room' && player.grounded && room.litter.inner.containsPoint(feet)) {
    label = 'Cavar un túnel'; act = () => dig('maze');
  } else if (zone === 'maze' && player.grounded && maze.exitInner.containsPoint(feet)) {
    label = 'Volver al cuarto'; act = () => dig('room');
  } else if (zone === 'room') {
    const it = room.interactables.find((i) => Math.hypot(i.pos.x - feet.x, i.pos.z - feet.z) < i.radius && feet.y < 0.4);
    if (it) { label = it.label; act = () => { it.action(); player.perform('Headbutt', 0.45); }; }
  }
  hud.prompt(busy || jukeboxMenu.open ? null : label);
  if (!input.consumeAction() || busy || player.frozen > 0 || jukeboxMenu.open) return;
  if (act) { act(); return; }
  // cabezazo: empuja lo que haya delante (¡tira la taza del escritorio!)
  player.perform('Headbutt', 0.45);
  setTimeout(() => {
    const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const n = physics.pushNear(player.frontPoint(0.22), dir, { radius: 0.34, strength: 3.2, lift: 0.4 });
    if (n) hud.toast(n > 1 ? `¡${n} cosas al suelo!` : '¡Pum!', 1200);
  }, 200);
}

// acceso de depuración solo en desarrollo
if (import.meta.env.DEV) window.__game = { get follow() { return follow; }, get player() { return player; }, get room() { return room; }, get maze() { return maze; }, camera, cat, dig, renderer, world, get physics() { return physics; }, music, wire, openArcade, jukeboxMenu };

// ======================= bucle =======================
const clock = new THREE.Clock();
const ctx = { catPos: new THREE.Vector3(), catGrounded: false, cameraPos: camera.position, onFish: null, musicLevels: [] };
ctx.onFish = (n, total) => hud.fishCollected(n, total);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  renderer.toneMapping = mode === 'room' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  ctx.musicLevels = music.levels();

  if (mode === 'arcade') {
    cat.update(dt, t); // mantiene vivos los LEDs de los accesorios (materiales compartidos)
    wire.update(dt, t);
    renderer.render(wire.scene, wire.camera);
    return;
  }

  if (mode === 'custom') {
    cat.update(dt, t);
    cat.root.rotation.y += spin * dt;
    ring.material.color.setHSL((t * 0.08) % 1, 1, 0.55);
    const k = 1 - Math.exp(-dt * 3);
    controls.target.lerp(view.target, k);
    if (!controls.dragging && camera.position.distanceTo(view.camPos) > 0.01) camera.position.lerp(view.camPos, k * 0.6);
    controls.update();
    renderer.render(showroom, camera);
    return;
  }

  player.camYaw = follow.yaw;
  physics.step(dt, (h) => player.fixedStep(h));
  player.update(dt, physics.acc / (1 / 60));
  cat.update(dt, t);
  ctx.catPos.copy(cat.root.position);
  ctx.catGrounded = player.grounded;
  if (zone === 'room') room.update(t, dt, ctx); else maze.update(t, dt, ctx);
  interactions();
  follow.update(dt, cat.root.position);
  renderer.render(world, camera);
});
