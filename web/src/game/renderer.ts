import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  BattleFeedItem,
  BattleStateView,
  BattleTeamView,
  SoldierLook,
} from '@shared/types';

interface TeamVisual {
  slot: number;
  castle: THREE.Group;
  castleBody: THREE.Group;
  shield: THREE.Mesh;
  shieldWire: THREE.Mesh;
  ring: THREE.Mesh;
  banner: THREE.Mesh;
  bannerBaseY: number;
  soldiers: THREE.InstancedMesh;
  soldierTarget: number;
  soldierCount: number;
  soldierOffsets: THREE.Vector3[];
  layoutScale: number;
  center: THREE.Vector3;
  position: THREE.Vector3;
  primary: THREE.Color;
  secondary: THREE.Color;
  alive: boolean;
  shieldStrength: number;
  winnerBeam: THREE.Mesh | null;
  lastImpactAt: number;
}

interface Effect {
  object: THREE.Object3D;
  born: number;
  duration: number;
  update: (progress: number, dt: number) => void;
  dispose?: () => void;
}

export interface StageRendererHandle {
  setState: (state: BattleStateView) => void;
  applyFeed: (item: BattleFeedItem) => void;
  dispose: () => void;
  isReady: () => boolean;
}

const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const MAX_SOLDIERS_PER_TEAM = 56;

function visualSeed(slot: number): number {
  return slot * 7919 + 13;
}

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createFieldTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 60, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#2a7d58');
  gradient.addColorStop(0.65, '#1a573d');
  gradient.addColorStop(1, '#0e3527');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Çim şeritleri
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let index = 0; index < 12; index += 1) {
    ctx.fillStyle = index % 2 === 0 ? '#174a35' : '#2a7a54';
    ctx.fillRect((index * size) / 12, 0, size / 12, size);
  }
  ctx.restore();

  // Saha çizgileri
  ctx.strokeStyle = 'rgba(190, 255, 225, 0.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.31, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(190, 255, 225, 0.09)';
  ctx.stroke();

  // Merkez yıldızı
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = 'rgba(167, 243, 208, 0.14)';
  ctx.beginPath();
  for (let index = 0; index < 5; index += 1) {
    const angle = (index * Math.PI * 2) / 5 - Math.PI / 2;
    const innerAngle = angle + Math.PI / 5;
    const outer = size * 0.055;
    const inner = size * 0.022;
    if (index === 0) ctx.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    else ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.lineTo(Math.cos(innerAngle) * inner, Math.sin(innerAngle) * inner);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Hafif doku
  const random = seededRandom(7);
  for (let index = 0; index < 2200; index += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.008 + random() * 0.02})`;
    ctx.fillRect(random() * size, random() * size, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a2233');
  gradient.addColorStop(0.45, '#071522');
  gradient.addColorStop(0.75, '#050c14');
  gradient.addColorStop(1, '#02050a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBannerTexture(symbol: string, primary: string, secondary: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = secondary;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 250);
  ctx.lineTo(256, 160);
  ctx.lineTo(256, 250);
  ctx.lineTo(0, 320);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(7, 7, 242, 306);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(128, 140, 92, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '140px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol || '⭐', 128, 146);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function paintGeometry(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function soldierGeometry(
  look: SoldierLook,
  primaryHex: string,
  secondaryHex: string,
): THREE.BufferGeometry {
  const primary = new THREE.Color(primaryHex);
  const secondary = new THREE.Color(secondaryHex);
  const bodyRadius = look === 'guard' ? 0.2 : look === 'archer' ? 0.15 : 0.18;
  const bodyHeight = look === 'knight' ? 0.46 : 0.4;
  const body = paintGeometry(
    new THREE.CapsuleGeometry(bodyRadius, bodyHeight, 4, 8).translate(0, 0.3 + bodyHeight / 2, 0),
    primary,
  );
  const head = paintGeometry(
    new THREE.SphereGeometry(look === 'archer' ? 0.14 : 0.16, 10, 8).translate(0, 0.3 + bodyHeight + 0.17, 0),
    new THREE.Color(0xf1c9a5),
  );
  const helmet = paintGeometry(
    new THREE.ConeGeometry(look === 'warrior' ? 0.23 : 0.19, 0.28, 8).translate(0, 0.3 + bodyHeight + 0.3, 0),
    secondary,
  );
  const pieces: THREE.BufferGeometry[] = [body, head, helmet];
  if (look === 'guard') {
    pieces.push(
      paintGeometry(
        new THREE.BoxGeometry(0.12, 0.34, 0.26).translate(0.23, 0.44, 0.02),
        secondary,
      ),
    );
  }
  if (look === 'archer') {
    const bow = new THREE.TorusGeometry(0.18, 0.02, 4, 12, Math.PI).translate(0.22, 0.45, 0);
    bow.rotateY(Math.PI / 2);
    pieces.push(paintGeometry(bow, secondary));
  }
  if (look === 'knight') {
    pieces.push(
      paintGeometry(
        new THREE.BoxGeometry(0.05, 0.4, 0.34).translate(-0.14, 0.3 + bodyHeight / 2, 0.2),
        secondary,
      ),
    );
  }
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged ?? body;
}

function fortressGeometry(
  look: string,
  primary: string,
  secondary: string,
  symbol: string,
): {
  group: THREE.Group;
  shield: THREE.Mesh;
  shieldWire: THREE.Mesh;
  ring: THREE.Mesh;
  banner: THREE.Mesh;
  bannerBaseY: number;
} {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x46536a, roughness: 0.82, metalness: 0.1 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x2a3648, roughness: 0.92 });
  const trim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primary),
    roughness: 0.45,
    metalness: 0.25,
    emissive: new THREE.Color(primary),
    emissiveIntensity: 0.12,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(secondary),
    roughness: 0.6,
    metalness: 0.15,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf5c76b,
    roughness: 0.35,
    metalness: 0.7,
    emissive: 0x3a2a08,
  });

  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Taban
  const base = add(
    new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.95, 0.65, 8), stoneDark),
  );
  base.position.y = 0.32;
  const baseTrim = add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.16, 8), trim));
  baseTrim.position.y = 0.72;

  const keepWidth = look === 'fortress' ? 3.4 : 2.7;
  const keepHeight = look === 'tower' ? 3.5 : 2.3;
  const keepDepth = look === 'fortress' ? 3.0 : 2.4;
  const keep = add(new THREE.Mesh(new THREE.BoxGeometry(keepWidth, keepHeight, keepDepth), stone));
  keep.position.y = 0.75 + keepHeight / 2;

  const keepTop = add(
    new THREE.Mesh(new THREE.BoxGeometry(keepWidth + 0.3, 0.22, keepDepth + 0.3), stoneDark),
  );
  keepTop.position.y = 0.75 + keepHeight + 0.1;

  // Mazgallar
  for (let index = 0; index < 4; index += 1) {
    for (let side = 0; side < 2; side += 1) {
      const battlement = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.3), trim));
      const offset = (side === 0 ? -1 : 1) * (keepWidth / 2 - 0.2);
      battlement.position.set(offset, 0.75 + keepHeight + 0.3, (index - 1.5) * 0.5);
    }
  }

  // Kapı
  const gate = add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.25, 0.22), stoneDark));
  gate.position.set(0, 1.4, keepDepth / 2 + 0.08);
  const gateFrame = add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.28), accent));
  gateFrame.position.set(0, 2.05, keepDepth / 2 + 0.1);

  // Kuleler
  const towerCount = look === 'fortress' ? 6 : look === 'tower' ? 2 : 4;
  const towerRadius = look === 'fortress' ? 3.0 : 2.55;
  for (let index = 0; index < towerCount; index += 1) {
    const angle = (index / towerCount) * Math.PI * 2 + Math.PI / 4;
    const towerHeight = look === 'tower' ? 3.9 : 2.7 + (index % 2) * 0.3;
    const tower = add(
      new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, towerHeight, 8), stone),
    );
    tower.position.set(
      Math.cos(angle) * towerRadius,
      0.75 + towerHeight / 2,
      Math.sin(angle) * towerRadius,
    );
    const towerTrim = add(
      new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.16, 8), trim),
    );
    towerTrim.position.set(
      Math.cos(angle) * towerRadius,
      0.75 + towerHeight,
      Math.sin(angle) * towerRadius,
    );
    const roof = add(
      new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.9, 8), accent),
    );
    roof.position.set(
      Math.cos(angle) * towerRadius,
      0.75 + towerHeight + 0.5,
      Math.sin(angle) * towerRadius,
    );
  }

  if (look === 'tower') {
    const spire = add(new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 4), accent));
    spire.position.y = 0.75 + keepHeight + 1.3;
    spire.rotation.y = Math.PI / 4;
    const finial = add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), gold));
    finial.position.y = 0.75 + keepHeight + 2.7;
  } else if (look === 'fortress') {
    for (const x of [-1.1, 1.1]) {
      const turret = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 2.2, 8), accent));
      turret.position.set(x, 0.75 + 2.2, -keepDepth / 2 + 0.5);
      const cap = add(new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 8), trim));
      cap.position.set(x, 0.75 + 3.6, -keepDepth / 2 + 0.5);
    }
  } else {
    const crown = add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 8), trim));
    crown.position.y = 0.75 + keepHeight + 0.7;
    const crownTop = add(new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.85, 8), accent));
    crownTop.position.y = 0.75 + keepHeight + 1.35;
  }

  // Bayrak
  const poleHeight = 0.75 + keepHeight + 2.2;
  const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, poleHeight, 6), stoneDark));
  pole.position.y = poleHeight / 2;
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(1, 0);
  flagShape.lineTo(0.8, 0.5);
  flagShape.lineTo(1, 1);
  flagShape.lineTo(0, 1);
  flagShape.closePath();
  const bannerGeometry = new THREE.ShapeGeometry(flagShape, 8);
  const bannerTexture = createBannerTexture(symbol, primary, secondary);
  const bannerMaterial = new THREE.MeshStandardMaterial({
    map: bannerTexture,
    emissiveMap: bannerTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.05,
  });
  const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
  banner.scale.set(1.15, 1.45, 1);
  banner.position.set(0.05, poleHeight - 1.55, 0);
  banner.castShadow = true;
  group.add(banner);

  // Takım halkası
  const ring = add(
    new THREE.Mesh(
      new THREE.RingGeometry(2.95, 3.35, 64),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(primary),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;

  // Kalkan
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 24, 18),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(primary),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shield.position.y = 2;
  shield.visible = false;
  group.add(shield);

  const shieldWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.55, 1),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(secondary),
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shieldWire.position.y = 2;
  shieldWire.visible = false;
  group.add(shieldWire);

  // Statik kale parçalarını malzemeye göre birleştir: çizim çağrılarını
  // ciddi biçimde azaltır ve OBS'te akıcı kalır.
  const animated = new Set<THREE.Object3D>([shield, shieldWire, ring, banner]);
  const staticMeshes: THREE.Mesh[] = [];
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && !animated.has(object)) {
      staticMeshes.push(object as THREE.Mesh);
    }
  });
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const mesh of staticMeshes) {
    mesh.updateMatrix();
    const material = mesh.material as THREE.Material;
    const clone = mesh.geometry.clone();
    clone.applyMatrix4(mesh.matrix);
    const bucket = byMaterial.get(material) ?? [];
    bucket.push(clone);
    byMaterial.set(material, bucket);
    group.remove(mesh);
    mesh.geometry.dispose();
  }
  for (const [material, geometries] of byMaterial) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return { group, shield, shieldWire, ring, banner, bannerBaseY: banner.position.y };
}

function castlePlacement(index: number, count: number): { x: number; z: number; angle: number } {
  const offset = count <= 2 ? 0 : Math.PI / count;
  const angle = offset + (index / count) * Math.PI * 2;
  const radiusX = count >= 8 ? 8.4 : 7.1;
  const radiusZ = count >= 8 ? 9.5 : 8.3;
  return {
    x: Math.cos(angle) * radiusX,
    z: Math.sin(angle) * radiusZ,
    angle,
  };
}

function makeSoldierOffsets(
  index: number,
  random: () => number,
): THREE.Vector3[] {
  void index;
  const offsets: THREE.Vector3[] = [];
  for (let i = 0; i < MAX_SOLDIERS_PER_TEAM; i += 1) {
    const spread = (random() - 0.5) * 2.2;
    const distance = 2.2 + random() * 2.6;
    offsets.push(new THREE.Vector3(spread, 0, distance));
  }
  return offsets;
}


export function createStageRenderer(canvas: HTMLCanvasElement): StageRendererHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.error('Stage renderer başlatılamadı:', error);
    (window as unknown as { __stageError?: string }).__stageError = String(error);
    return null;
  }

  renderer.setPixelRatio(1);
  renderer.setSize(DESIGN_WIDTH, DESIGN_HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040910);
  scene.fog = new THREE.FogExp2(0x040910, 0.017);

  const camera = new THREE.PerspectiveCamera(40, DESIGN_WIDTH / DESIGN_HEIGHT, 0.1, 200);
  const CAMERA_BASE = new THREE.Vector3(0, 31, 39);
  camera.position.copy(CAMERA_BASE);
  camera.lookAt(0, 1.4, 0);

  // Işıklar
  scene.add(new THREE.AmbientLight(0xdfefff, 0.5));
  scene.add(new THREE.HemisphereLight(0x9ad9ff, 0x123326, 1.6));
  const keyLight = new THREE.DirectionalLight(0xfff0d8, 3.2);
  keyLight.position.set(11, 26, 16);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -18;
  keyLight.shadow.camera.right = 18;
  keyLight.shadow.camera.top = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.bias = -0.0008;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x2ec4a0, 1.8);
  rimLight.position.set(-12, 10, -18);
  scene.add(rimLight);

  const skyTexture = createSkyTexture();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 20),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(sky);

  const arena = new THREE.Group();
  scene.add(arena);

  // Tribünler
  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1724,
    roughness: 0.9,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  for (let tier = 0; tier < 3; tier += 1) {
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(13.4 + tier * 2.6, 13.9 + tier * 2.6, 1.5, 10, 1, true),
      standMaterial,
    );
    stand.position.y = -0.4 + tier * 1.35;
    stand.receiveShadow = true;
    arena.add(stand);
  }
  const upperStand = new THREE.Mesh(
    new THREE.CylinderGeometry(21.2, 22.4, 4.2, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x08111b, roughness: 1, side: THREE.DoubleSide }),
  );
  upperStand.position.y = 2.2;
  arena.add(upperStand);

  // Tribün kalabalığı
  const crowdCount = 900;
  const crowdPositions = new Float32Array(crowdCount * 3);
  const crowdColors = new Float32Array(crowdCount * 3);
  const crowdRandom = seededRandom(99);
  const crowdPalette = [0x4ade80, 0x38bdf8, 0xfbbf24, 0xf87171, 0xa78bfa, 0xe2e8f0];
  for (let index = 0; index < crowdCount; index += 1) {
    const angle = crowdRandom() * Math.PI * 2;
    const tier = index % 3;
    const radius = 13.9 + tier * 2.6 + crowdRandom() * 1.5;
    crowdPositions[index * 3] = Math.cos(angle) * radius;
    crowdPositions[index * 3 + 1] = 0.15 + tier * 1.35 + crowdRandom() * 0.9;
    crowdPositions[index * 3 + 2] = Math.sin(angle) * radius;
    const color = new THREE.Color(crowdPalette[Math.floor(crowdRandom() * crowdPalette.length)]);
    crowdColors[index * 3] = color.r * 0.55;
    crowdColors[index * 3 + 1] = color.g * 0.55;
    crowdColors[index * 3 + 2] = color.b * 0.55;
  }
  const crowdGeometry = new THREE.BufferGeometry();
  crowdGeometry.setAttribute('position', new THREE.BufferAttribute(crowdPositions, 3));
  crowdGeometry.setAttribute('color', new THREE.BufferAttribute(crowdColors, 3));
  const crowdMaterial = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const crowd = new THREE.Points(crowdGeometry, crowdMaterial);
  arena.add(crowd);

  const fieldTexture = createFieldTexture();
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(11.9, 12.9, 1.25, 10),
    new THREE.MeshStandardMaterial({ color: 0x101a22, roughness: 0.9, metalness: 0.15 }),
  );
  platform.position.y = -0.62;
  platform.receiveShadow = true;
  platform.castShadow = true;
  arena.add(platform);

  const field = new THREE.Mesh(
    new THREE.CircleGeometry(11.35, 72),
    new THREE.MeshStandardMaterial({
      map: fieldTexture,
      roughness: 0.88,
      metalness: 0.02,
      emissive: new THREE.Color(0x0c3b29),
      emissiveIntensity: 0.35,
    }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.03;
  field.receiveShadow = true;
  arena.add(field);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(11.55, 0.07, 8, 120),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.1;
  arena.add(rim);

  // Işık kuleleri
  const pylonMaterial = new THREE.MeshStandardMaterial({
    color: 0x223041,
    roughness: 0.6,
    metalness: 0.5,
  });
  const pylonGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    // Ön tarafa denk gelen direkler sahneyi kapatmasın.
    if (Math.sin(angle) > 0.55) continue;
    const pylon = new THREE.Group();
    pylon.position.set(Math.cos(angle) * 15.6, 0, Math.sin(angle) * 15.9);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 4.4, 6), pylonMaterial);
    mast.position.y = 2.2;
    mast.castShadow = true;
    pylon.add(mast);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.18), pylonGlowMaterial);
    glow.position.y = 4.35;
    pylon.add(glow);
    const glowLight = new THREE.PointLight(0x7dd3fc, 8, 12, 2);
    glowLight.position.y = 4.2;
    pylon.add(glowLight);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.y = 4.3;
    halo.lookAt(0, 4.3, 0);
    pylon.add(halo);
    arena.add(pylon);
  }

  // Yıldız tozu
  const starCount = 220;
  const starPositions = new Float32Array(starCount * 3);
  const starRandom = seededRandom(42);
  for (let index = 0; index < starCount; index += 1) {
    const radius = 16 + starRandom() * 26;
    const angle = starRandom() * Math.PI * 2;
    starPositions[index * 3] = Math.cos(angle) * radius;
    starPositions[index * 3 + 1] = 2 + starRandom() * 22;
    starPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0xa7f3d0,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(stars);

  const teamVisuals = new Map<number, TeamVisual>();
  const soldierGeometries = new Map<string, THREE.BufferGeometry>();
  let teamFingerprint = '';
  let currentState: BattleStateView | null = null;
  let effects: Effect[] = [];
  let disposed = false;
  let confettiCooldown = 0;

  const getSoldierGeometry = (
    look: SoldierLook,
    primary: string,
    secondary: string,
  ): THREE.BufferGeometry => {
    const key = `${look}:${primary}:${secondary}`;
    let geometry = soldierGeometries.get(key);
    if (!geometry) {
      geometry = soldierGeometry(look, primary, secondary);
      soldierGeometries.set(key, geometry);
    }
    return geometry;
  };



  const buildTeams = (state: BattleStateView) => {
    // Eski takım görsellerini temizle
    for (const visual of teamVisuals.values()) {
      arena.remove(visual.castle);
      arena.remove(visual.soldiers);
      visual.castle.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
          else material?.dispose();
        }
      });
      (visual.soldiers.material as THREE.Material).dispose();
    }
    teamVisuals.clear();

    state.teams.forEach((team, index) => {
      const placement = castlePlacement(index, state.teams.length);
      const fortress = fortressGeometry(
        team.castleLook,
        team.primaryColor,
        team.secondaryColor,
        team.symbol,
      );
      const group = new THREE.Group();
      group.position.set(placement.x, 0, placement.z);
      group.rotation.y = Math.atan2(-placement.x, -placement.z);
      const layoutScale = state.teams.length >= 8 ? 0.62 : 1;
      group.scale.setScalar(layoutScale);
      group.add(fortress.group);
      arena.add(group);

      const geometry = getSoldierGeometry(team.soldierLook, team.primaryColor, team.secondaryColor);
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.55,
        metalness: 0.2,
        emissive: new THREE.Color(team.primaryColor),
        emissiveIntensity: 0.18,
      });
      const soldiers = new THREE.InstancedMesh(geometry, material, MAX_SOLDIERS_PER_TEAM);
      soldiers.count = 0;
      soldiers.frustumCulled = false;
      soldiers.castShadow = false;
      arena.add(soldiers);

      const visual: TeamVisual = {
        slot: team.slot,
        castle: group,
        castleBody: fortress.group,
        shield: fortress.shield,
        shieldWire: fortress.shieldWire,
        ring: fortress.ring,
        banner: fortress.banner,
        bannerBaseY: fortress.bannerBaseY,
        soldiers,
        soldierTarget: Math.min(MAX_SOLDIERS_PER_TEAM, Math.max(0, Math.round(team.soldiers / 3.2))),
        soldierCount: 0,
        soldierOffsets: makeSoldierOffsets(
          team.slot,
          seededRandom(visualSeed(team.slot)),
        ),
        layoutScale,
        center: new THREE.Vector3(placement.x, 0, placement.z),
        position: new THREE.Vector3(placement.x, 0, placement.z),
        primary: new THREE.Color(team.primaryColor),
        secondary: new THREE.Color(team.secondaryColor),
        alive: team.alive,
        shieldStrength: 0,
        winnerBeam: null,
        lastImpactAt: 0,
      };
      teamVisuals.set(team.slot, visual);
    });
  };

  const fingerprintOf = (state: BattleStateView): string =>
    state.teams
      .map(
        (team) =>
          `${team.slot}:${team.primaryColor}:${team.secondaryColor}:${team.symbol}:${team.soldierLook}:${team.castleLook}`,
      )
      .join('|');

  const addEffect = (effect: Effect) => {
    effects.push(effect);
    scene.add(effect.object);
  };

  const spawnBurst = (
    team: BattleTeamView,
    position: THREE.Vector3,
    colorHex: string,
    count = 36,
    power = 6,
    gold = false,
  ) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const color = new THREE.Color(colorHex);
    const goldColor = new THREE.Color(0xf5c76b);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = position.x + (Math.random() - 0.5) * 0.8;
      positions[index * 3 + 1] = position.y + Math.random() * 0.8;
      positions[index * 3 + 2] = position.z + (Math.random() - 0.5) * 0.8;
      const chosen = gold && index % 2 === 0 ? goldColor : color;
      colors[index * 3] = chosen.r;
      colors[index * 3 + 1] = chosen.g;
      colors[index * 3 + 2] = chosen.b;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * power,
          2 + Math.random() * power,
          (Math.random() - 0.5) * power,
        ),
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: undefined,
    });
    const points = new THREE.Points(geometry, material);
    const born = performance.now();
    addEffect({
      object: points,
      born,
      duration: 1100,
      update: (progress, dt) => {
        const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let index = 0; index < count; index += 1) {
          velocities[index].y -= 6.5 * dt;
          positionAttribute.setXYZ(
            index,
            positionAttribute.getX(index) + velocities[index].x * dt,
            Math.max(0.05, positionAttribute.getY(index) + velocities[index].y * dt),
            positionAttribute.getZ(index) + velocities[index].z * dt,
          );
        }
        positionAttribute.needsUpdate = true;
        material.opacity = Math.max(0, 1 - progress);
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    });
    void team;
  };

  const spawnShockwave = (position: THREE.Vector3, colorHex: string, radius = 4) => {
    const geometry = new THREE.RingGeometry(0.4, 0.62, 48);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.set(position.x, 0.14, position.z);
    ring.rotation.x = -Math.PI / 2;
    addEffect({
      object: ring,
      born: performance.now(),
      duration: 900,
      update: (progress) => {
        const scale = 1 + progress * radius;
        ring.scale.set(scale, scale, scale);
        material.opacity = Math.max(0, 0.9 * (1 - progress));
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    });
  };

  const spawnBeam = (position: THREE.Vector3, colorHex: string) => {
    const geometry = new THREE.CylinderGeometry(0.22, 0.55, 18, 12, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(geometry, material);
    beam.position.set(position.x, 9.5, position.z);
    addEffect({
      object: beam,
      born: performance.now(),
      duration: 700,
      update: (progress) => {
        material.opacity = Math.max(0, 0.75 * (1 - progress));
        beam.scale.x = 0.6 + progress * 1.4;
        beam.scale.z = 0.6 + progress * 1.4;
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    });
  };

  const spawnWinnerBeam = (team: BattleTeamView) => {
    const visual = teamVisuals.get(team.slot);
    if (!visual) return;
    if (visual.winnerBeam) {
      scene.remove(visual.winnerBeam);
      visual.winnerBeam = null;
    }
    const geometry = new THREE.CylinderGeometry(2.4, 4.2, 22, 24, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(team.primaryColor),
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(geometry, material);
    beam.position.set(visual.center.x, 11, visual.center.z);
    scene.add(beam);
    visual.winnerBeam = beam;
    spawnBurst(team, new THREE.Vector3(visual.center.x, 5, visual.center.z), team.primaryColor, 70, 8, true);
    spawnShockwave(visual.position, team.primaryColor, 8);
  };

  const updateSoldiers = (visual: TeamVisual, team: BattleTeamView, time: number, dt: number) => {
    const desired = Math.min(MAX_SOLDIERS_PER_TEAM, Math.max(0, Math.round(team.soldiers / 3.2)));
    visual.soldierTarget = team.alive ? desired : 0;
    visual.soldierCount += (visual.soldierTarget - visual.soldierCount) * Math.min(1, dt * 2.2);
    const count = Math.max(0, Math.round(visual.soldierCount));
    visual.soldiers.count = count;
    if (count === 0) return;
    const direction = new THREE.Vector3(-visual.center.x, 0, -visual.center.z).normalize();
    const side = new THREE.Vector3(-direction.z, 0, direction.x);
    const dummy = new THREE.Object3D();
    const running = currentState?.phase === 'running';
    const advance = running ? 0.35 + Math.sin(time * 0.5 + visual.slot) * 0.12 : 0;
    for (let index = 0; index < count; index += 1) {
      const offset = visual.soldierOffsets[index] ?? new THREE.Vector3();
      const bob = Math.sin(time * 3.2 + index * 0.9) * 0.05;
      const distance = offset.z * (1 + advance) * visual.layoutScale;
      dummy.position.set(
        visual.center.x + direction.x * distance + side.x * offset.x * visual.layoutScale,
        0.3 + bob,
        visual.center.z + direction.z * distance + side.z * offset.x * visual.layoutScale,
      );
      dummy.rotation.y = Math.atan2(direction.x, direction.z) + (index % 5 - 2) * 0.06;
      const scale =
        (team.soldierLook === 'guard' ? 1.22 : team.soldierLook === 'archer' ? 1.05 : 1.15) *
        visual.layoutScale;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      visual.soldiers.setMatrixAt(index, dummy.matrix);
    }
    visual.soldiers.instanceMatrix.needsUpdate = true;
  };

  const syncState = (state: BattleStateView) => {
    const previous = currentState;
    const fingerprint = fingerprintOf(state);
    if (!previous || fingerprint !== teamFingerprint) {
      buildTeams(state);
      teamFingerprint = fingerprint;
    }
    const now = performance.now();
    for (const team of state.teams) {
      const visual = teamVisuals.get(team.slot);
      if (!visual) continue;
      const previousTeam = previous?.teams.find((candidate) => candidate.slot === team.slot);
      visual.alive = team.alive;
      visual.shieldStrength = team.shieldStrength;
      const hpRatio = team.maxCastleHp > 0 ? team.castleHp / team.maxCastleHp : 0;
      visual.castleBody.position.y = team.alive ? -0.1 * (1 - hpRatio) : -0.25;
      visual.castleBody.rotation.z = team.alive ? 0 : 0.16;
      visual.shield.visible = team.shieldStrength > 0.005;
      visual.shieldWire.visible = visual.shield.visible;
      (visual.shield.material as THREE.MeshBasicMaterial).opacity = team.shieldStrength * 1.15;
      (visual.shieldWire.material as THREE.MeshBasicMaterial).opacity = team.shieldStrength * 0.9;
      (visual.ring.material as THREE.MeshBasicMaterial).opacity = team.alive ? 0.42 + team.shieldStrength : 0.08;
      (visual.ring.material as THREE.MeshBasicMaterial).color = visual.primary;

      if (previousTeam) {
        const hpDrop = previousTeam.castleHp - team.castleHp;
        if (
          hpDrop > Math.max(2, team.maxCastleHp * 0.008) &&
          now - visual.lastImpactAt > 320
        ) {
          visual.lastImpactAt = now;
          spawnBurst(
            team,
            new THREE.Vector3(visual.center.x, 2.8, visual.center.z),
            hpDrop > team.maxCastleHp * 0.05 ? team.secondaryColor : '#ffb86b',
            Math.min(42, 12 + Math.round(hpDrop / 12)),
            4.5,
          );
        }
        if (!team.alive && previousTeam.alive) {
          spawnBurst(
            team,
            new THREE.Vector3(visual.center.x, 2, visual.center.z),
            team.primaryColor,
            80,
            9,
            true,
          );
          spawnShockwave(visual.position, team.primaryColor, 9);
        }
        if (previousTeam.shieldStrength === 0 && team.shieldStrength > 0) {
          spawnShockwave(visual.position, '#7dd3fc', 5);
        }
      }
    }

    if (state.phase === 'finished' && state.winnerSlot) {
      const winner = state.teams.find((team) => team.slot === state.winnerSlot);
      if (winner) {
        const visual = teamVisuals.get(winner.slot);
        if (visual && !visual.winnerBeam) spawnWinnerBeam(winner);
      }
    } else {
      for (const visual of teamVisuals.values()) {
        if (visual.winnerBeam) {
          scene.remove(visual.winnerBeam);
          visual.winnerBeam.geometry.dispose();
          (visual.winnerBeam.material as THREE.Material).dispose();
          visual.winnerBeam = null;
        }
      }
    }
    currentState = state;
  };

  const applyFeed = (item: BattleFeedItem) => {
    if (!currentState) return;
    const team = item.teamSlot
      ? currentState.teams.find((candidate) => candidate.slot === item.teamSlot)
      : undefined;
    if (!team) return;
    const visual = teamVisuals.get(team.slot);
    if (!visual) return;
    if (item.kind === 'gift') {
      spawnBeam(visual.position, '#fbbf24');
      spawnBurst(team, new THREE.Vector3(visual.center.x, 3.5, visual.center.z), '#fbbf24', 50, 7, true);
      for (const enemy of currentState.teams) {
        if (!enemy.alive || enemy.slot === team.slot) continue;
        const enemyVisual = teamVisuals.get(enemy.slot);
        if (enemyVisual) {
          spawnBurst(enemy, new THREE.Vector3(enemyVisual.center.x, 2.6, enemyVisual.center.z), '#f97316', 26, 5);
        }
      }
    } else if (item.kind === 'like') {
      spawnShockwave(visual.position, '#7dd3fc', 6);
      spawnBurst(team, new THREE.Vector3(visual.center.x, 2.4, visual.center.z), '#7dd3fc', 24, 3.5);
    } else if (item.kind === 'comment') {
      spawnBurst(team, new THREE.Vector3(visual.center.x, 2, visual.center.z), '#6ee7b7', 22, 3.5);
    } else if (item.kind === 'castle_down') {
      spawnBurst(team, new THREE.Vector3(visual.center.x, 2, visual.center.z), '#f97316', 60, 8, true);
      spawnShockwave(visual.position, '#f97316', 8);
    } else if (item.kind === 'round_start') {
      for (const candidate of currentState.teams) {
        const candidateVisual = teamVisuals.get(candidate.slot);
        if (!candidateVisual) continue;
        spawnShockwave(candidateVisual.position, candidate.primaryColor, 2.4);
      }
    }
  };

  let lastFrame = performance.now();
  const clockStart = performance.now();

  const animate = () => {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const time = (now - clockStart) / 1000;

    if (currentState) {
      for (const team of currentState.teams) {
        const visual = teamVisuals.get(team.slot);
        if (!visual) continue;
        updateSoldiers(visual, team, time, dt);
        visual.banner.rotation.y = Math.sin(time * 1.6 + team.slot) * 0.16;
        visual.banner.position.y = visual.bannerBaseY + Math.sin(time * 1.2 + team.slot) * 0.03;
        if (team.shieldStrength > 0.005) {
          const pulse = 1 + Math.sin(time * 4) * 0.02;
          visual.shield.scale.setScalar(pulse);
          visual.shieldWire.rotation.y = time * 0.4;
          visual.shieldWire.rotation.x = time * 0.2;
        }
        if (visual.winnerBeam) {
          const material = visual.winnerBeam.material as THREE.MeshBasicMaterial;
          material.opacity = 0.1 + Math.sin(time * 3) * 0.035;
          visual.winnerBeam.rotation.y = time * 0.2;
        }
      }
      if (currentState.phase === 'finished' && currentState.winnerSlot) {
        confettiCooldown -= dt;
        if (confettiCooldown <= 0) {
          confettiCooldown = 0.6;
          const winner = currentState.teams.find((team) => team.slot === currentState?.winnerSlot);
          const visual = winner ? teamVisuals.get(winner.slot) : null;
          if (winner && visual) {
            spawnBurst(
              winner,
              new THREE.Vector3(
                visual.center.x + (Math.random() - 0.5) * 4,
                7 + Math.random() * 3,
                visual.center.z + (Math.random() - 0.5) * 4,
              ),
              Math.random() > 0.5 ? winner.primaryColor : '#fbbf24',
              16,
              3,
              true,
            );
          }
        }
      }
    }

    camera.position.x = CAMERA_BASE.x + Math.sin(time * 0.12) * 0.6;
    camera.position.y = CAMERA_BASE.y + Math.sin(time * 0.18) * 0.3;
    camera.position.z = CAMERA_BASE.z;
    camera.lookAt(0, 1.4, 0);
    stars.rotation.y = time * 0.006;

    for (const effect of effects) {
      const progress = Math.min(1, (now - effect.born) / effect.duration);
      effect.update(progress, dt);
      if (progress >= 1) {
        scene.remove(effect.object);
        effect.dispose?.();
      }
    }
    effects = effects.filter((effect) => now - effect.born < effect.duration);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);

  return {
    setState: syncState,
    applyFeed,
    isReady: () => true,
    dispose: () => {
      disposed = true;
      for (const effect of effects) {
        scene.remove(effect.object);
        effect.dispose?.();
      }
      effects = [];
      for (const visual of teamVisuals.values()) {
        arena.remove(visual.castle);
        arena.remove(visual.soldiers);
        visual.castle.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
            else material?.dispose();
          }
        });
        (visual.soldiers.material as THREE.Material).dispose();
      }
      teamVisuals.clear();
      for (const geometry of soldierGeometries.values()) geometry.dispose();
      soldierGeometries.clear();
      fieldTexture.dispose();
      platform.geometry.dispose();
      (platform.material as THREE.Material).dispose();
      field.geometry.dispose();
      (field.material as THREE.Material).dispose();
      starGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      skyTexture.dispose();
      (sky.material as THREE.Material).dispose();
      crowdGeometry.dispose();
      (crowd.material as THREE.Material).dispose();
      standMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
