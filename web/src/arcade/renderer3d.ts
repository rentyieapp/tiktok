import * as THREE from 'three';
import { HORSE_RACERS, type ArcadeGameDef, type ArcadePlayer, type ArcadeStateView } from '@shared/arcade';

interface Actor {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  label: THREE.Sprite;
  labelText: string;
  bar: THREE.Sprite;
  barCanvas: HTMLCanvasElement;
  barTexture: THREE.CanvasTexture;
  lastHp: number;
  lastScore: number;
  baseScale: number;
  shadow: THREE.Mesh;
  shield: THREE.Mesh;
}

interface Kart {
  group: THREE.Group;
  body: THREE.Mesh;
  label: THREE.Sprite;
  labelText: string;
  wheels: THREE.Mesh[];
  lastProgress: number;
}

interface PressCard {
  group: THREE.Group;
  mesh: THREE.Mesh;
  label: THREE.Sprite;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  lastName: string;
  lastScore: number;
}

interface HorseActor {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
  label: THREE.Sprite;
  lastProgress: number;
}

interface Podium {
  group: THREE.Group;
  face: THREE.Mesh;
  letter: string;
}

export interface Arcade3DHandle {
  setState: (state: ArcadeStateView) => void;
  dispose: () => void;
}

const W = 540;
const H = 960;

function mat(color: string | number, options: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.05,
    ...options,
  });
}

function softMat(color: string | number, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0,
    transparent: opacity < 1,
    opacity,
  });
}

function shadowMesh(radius: number): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(radius, 24);
  const material = new THREE.MeshBasicMaterial({
    color: 0x3a2530,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

function makeTextTexture(
  name: string,
  color: string,
  width = 0,
  height = 84,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const label = name.slice(0, 18);
  const font = '800 38px system-ui, -apple-system, sans-serif';
  ctx.font = font;
  const measured = Math.ceil(ctx.measureText(label).width);
  canvas.width = width > 0 ? width : Math.min(430, Math.max(150, measured + 78));
  canvas.height = height;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, 20);
  ctx.fill();
  ctx.strokeStyle = `${color}aa`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(14, 18, 12, h - 36, 6);
  ctx.fill();
  ctx.fillStyle = '#17161d';
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 40, h / 2 + 1, w - 54);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeBarTexture(color: string): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 192, 24);
  ctx.fillStyle = 'rgba(24,22,30,0.18)';
  ctx.beginPath();
  ctx.roundRect(0, 4, 192, 16, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 4, 192, 16, 8);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, texture };
}

function paintBar(
  canvas: HTMLCanvasElement,
  texture: THREE.CanvasTexture,
  color: string,
  hp: number,
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 192, 24);
  ctx.fillStyle = 'rgba(24,22,30,0.18)';
  ctx.beginPath();
  ctx.roundRect(0, 4, 192, 16, 8);
  ctx.fill();
  ctx.fillStyle = hp > 55 ? color : hp > 25 ? '#e3a008' : '#e5484d';
  ctx.beginPath();
  ctx.roundRect(0, 4, Math.max(0, (192 * hp) / 100), 16, 8);
  ctx.fill();
  texture.needsUpdate = true;
}

function addLabel(group: THREE.Object3D, texture: THREE.Texture, y: number, scale = 1): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 999;
  const image = texture.image as HTMLCanvasElement | undefined;
  const aspect = image && image.height > 0 ? image.width / image.height : 3.2;
  const spriteHeight = 0.54 * scale;
  sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
  sprite.position.y = y;
  group.add(sprite);
  return sprite;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
    const sprite = child as THREE.Sprite;
    if (sprite.material?.map) sprite.material.map.dispose();
  });
}


function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}


function createSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  gradient.addColorStop(0, '#f3dfc2');
  gradient.addColorStop(1, '#e3c8a4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  for (let index = 0; index < 1800; index += 1) {
    ctx.fillStyle = `rgba(120,82,44,${0.03 + Math.random() * 0.08})`;
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillRect(x, y, 1.5 + Math.random() * 2, 1 + Math.random() * 1.5);
  }
  ctx.strokeStyle = 'rgba(150,110,70,0.12)';
  ctx.lineWidth = 2;
  for (let index = 1; index < 5; index += 1) {
    ctx.beginPath();
    ctx.arc(256, 256, index * 52, 0, Math.PI * 2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeBannerTexture(label: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 420;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 420);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#2b1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 420);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 236, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 64);
  ctx.font = '120px system-ui, sans-serif';
  ctx.fillText('★', 128, 230);
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.globalAlpha = 0.7;
  ctx.fillText('SON KALAN', 128, 340);
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createArcade3DRenderer(
  canvas: HTMLCanvasElement,
  game: ArcadeGameDef,
): Arcade3DHandle | null {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    return new Arcade3DRenderer(renderer, game);
  } catch {
    return null;
  }
}

class Arcade3DRenderer implements Arcade3DHandle {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly actors = new Map<string, Actor>();
  private readonly karts = new Map<string, Kart>();
  private readonly horseLanes = new Map<number, HorseActor>();
  private lastActionEffectId = '';
  private actionEffects: Array<{ group: THREE.Group; born: number; life: number }> = [];
  private readonly townBuildings = new Map<string, { group: THREE.Group; floors: number }>();
  private melonGroup: THREE.Group | null = null;
  private melonBands: THREE.Mesh[] = [];
  private eggCracks: THREE.Mesh[] = [];
  private goldCoins: THREE.Mesh[] = [];
  private goldMagnet: THREE.Group | null = null;
  private readonly cards = new Map<string, PressCard>();
  private readonly podiums: Podium[] = [];
  private readonly dynamic: Array<(state: ArcadeStateView, time: number, dt: number) => void> = [];
  private state: ArcadeStateView | null = null;
  private disposed = false;
  private frame = 0;
  private lastWinner: string | null = null;
  private baseCamera = new THREE.Vector3();
  private lookTarget = new THREE.Vector3(0, 2, 0);
  private screenCanvas: HTMLCanvasElement | null = null;
  private screenTexture: THREE.CanvasTexture | null = null;
  private screenKey = '';
  private wheelGroup: THREE.Group | null = null;
  private wheelCanvas: HTMLCanvasElement | null = null;
  private wheelTexture: THREE.CanvasTexture | null = null;
  private wheelKey = '';
  private wheelAngle = 0;
  private wheelSpinId = -1;
  private wheelSpinBase = 0;
  private wheelPointer: THREE.Object3D | null = null;
  private tugMarker: THREE.Group | null = null;
  private versusWall: THREE.Group | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    private readonly game: ArcadeGameDef,
  ) {
    this.renderer = renderer;
    this.renderer.setSize(W, H, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 80);
    this.scene.background = new THREE.Color(game.soft);
    this.scene.fog = new THREE.Fog(new THREE.Color(game.soft), 18, 38);
    this.buildLights();
    this.buildScene();
    this.camera.position.copy(this.baseCamera);
    this.camera.lookAt(this.lookTarget);
    this.animate();
  }

  setState(state: ArcadeStateView): void {
    this.state = state;
    this.sync();
    this.paintScreen();
    if (state.phase === 'finished' && state.winner?.playerId !== this.lastWinner) {
      this.lastWinner = state.winner?.playerId ?? null;
      this.spawnConfetti();
    }
    if (state.phase !== 'finished') this.lastWinner = null;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    disposeObject(this.scene);
    this.renderer.dispose();
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff8ee, 0xcdbba9, 1.8));
    const key = new THREE.DirectionalLight(0xfff2df, 2.6);
    key.position.set(6, 11, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0004;
    this.scene.add(key);

    const fill = new THREE.PointLight(this.game.accent, 22, 24, 2);
    fill.position.set(-5, 5, 5);
    this.scene.add(fill);
    const warm = new THREE.PointLight(0xffc96b, 16, 20, 2);
    warm.position.set(5, 4, 2);
    this.scene.add(warm);
  }

  private buildScene(): void {
    switch (this.game.mode) {
      case 'dance':
        this.buildDance();
        break;
      case 'press':
        this.buildPress();
        break;
      case 'circle':
        this.buildCircle();
        break;
      case 'quiz':
        this.buildQuiz();
        break;
      case 'word':
        this.buildWord();
        break;
      case 'battle':
        this.buildBattle();
        break;
      case 'race':
        this.buildRace();
        break;
      case 'wheel':
        this.buildWheel();
        break;
      case 'tug':
        this.buildTug();
        break;
      case 'versus':
        this.buildVersus();
        break;
      case 'horse':
        this.buildHorse();
        break;
      case 'melon':
        this.buildMelon();
        break;
      case 'town':
        this.buildTown();
        break;
      case 'gold':
        this.buildGold();
        break;
    }
    this.buildAmbientParticles();
  }

  private buildDance(): void {
    this.baseCamera.set(0, 6.4, 17.0);
    this.lookTarget.set(0, 2.7, 0);
    const cultural = this.game.key === 'horon' || this.game.key === 'sira' || this.game.key === 'ramwong';
    const darkStage = this.game.key === 'latina' || this.game.key === 'concert';
    const backColor = this.game.key === 'horon'
      ? 0xfff1e6
      : this.game.key === 'sira'
        ? 0xf5e6d3
        : this.game.key === 'latina'
          ? 0x1e1b4b
          : this.game.key === 'concert'
            ? 0x111827
            : this.game.key === 'ramwong'
              ? 0xfff7ed
              : 0xf7dfe9;
    const floorColor = cultural ? 0x6b3f2a : darkStage ? 0x251b2e : 0x322635;
    const archColor = this.game.key === 'horon' ? '#fca5a5' : this.game.key === 'sira' ? '#e7c9a9' : this.game.key === 'ramwong' ? '#fdba74' : darkStage ? '#7c3aed' : '#f3b5cd';

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 15),
      new THREE.MeshBasicMaterial({ color: backColor }),
    );
    back.position.set(0, 6, -7);
    this.scene.add(back);

    for (let index = 0; index < 5; index += 1) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(4.0 + index * 0.2, 0.1, 8, 60, Math.PI),
        mat(index % 2 === 0 ? archColor : '#ffffff', { roughness: 0.4 }),
      );
      arch.position.set(0, 4.4, -6.2 + index * 0.12);
      arch.rotation.z = Math.PI;
      this.scene.add(arch);
    }

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(5.1, 5.3, 0.32, 64),
      new THREE.MeshPhysicalMaterial({
        color: floorColor,
        roughness: darkStage ? 0.22 : 0.55,
        metalness: 0.35,
        clearcoat: 0.6,
      }),
    );
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(5.1, 0.11, 12, 80),
      new THREE.MeshStandardMaterial({
        color: 0xffd7e8,
        emissive: this.game.accent,
        emissiveIntensity: 0.5,
        roughness: 0.25,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.08;
    this.scene.add(rim);

    // Sahne kenarındaki ince ışıklar.
    // DJ kabini ve hoparlörler: az oyunculu yayınlarda sahne boş kalmasın.
    const booth = new THREE.Group();
    booth.position.set(0, 0, -3.3);
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 1.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2c2230, roughness: 0.45, metalness: 0.15 }),
    );
    desk.position.y = 0.55;
    desk.castShadow = true;
    booth.add(desk);
    const deskFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.55),
      new THREE.MeshStandardMaterial({
        color: this.game.accent,
        emissive: this.game.accent,
        emissiveIntensity: 0.55,
      }),
    );
    deskFace.position.set(0, 0.55, 0.61);
    booth.add(deskFace);
    for (const x of [-1.1, 1.1]) {
      const deck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.46, 0.12, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.3 }),
      );
      deck.position.set(x, 1.14, 0);
      booth.add(deck);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.03, 24),
        new THREE.MeshStandardMaterial({ color: 0x17161d, roughness: 0.3, metalness: 0.5 }),
      );
      disc.position.set(x, 1.22, 0);
      booth.add(disc);
    }
    for (const x of [-3.7, 3.7]) {
      const speaker = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.5, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x322731, roughness: 0.6 }),
      );
      speaker.position.set(x, 1.25, 0);
      speaker.castShadow = true;
      booth.add(speaker);
      const cone = new THREE.Mesh(
        new THREE.CircleGeometry(0.33, 20),
        new THREE.MeshStandardMaterial({ color: 0x17161d, roughness: 0.4 }),
      );
      cone.position.set(x, 1.55, 0.62);
      booth.add(cone);
    }
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 160;
    const signCtx = signCanvas.getContext('2d')!;
    signCtx.fillStyle = '#2c2230';
    signCtx.fillRect(0, 0, 512, 160);
    signCtx.strokeStyle = this.game.accent;
    signCtx.lineWidth = 8;
    signCtx.strokeRect(10, 10, 492, 140);
    signCtx.fillStyle = '#ffffff';
    signCtx.font = '900 64px system-ui, sans-serif';
    signCtx.textAlign = 'center';
    signCtx.fillText(this.game.shortName.toLocaleUpperCase('tr'), 256, 100);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1),
      new THREE.MeshBasicMaterial({ map: signTexture, fog: false, toneMapped: false }),
    );
    sign.position.set(0, 5.5, -5.8);
    this.scene.add(sign);
    this.scene.add(booth);
    if (cultural) {
      booth.visible = false;
    }

    if (this.game.key === 'sira') {
      const rug = new THREE.Mesh(
        new THREE.PlaneGeometry(7.6, 4.2),
        new THREE.MeshStandardMaterial({ color: 0x9f2d2d, roughness: 0.95 }),
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.08, 2.8);
      this.scene.add(rug);
      for (let index = 0; index < 7; index += 1) {
        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.2 }),
        );
        lantern.position.set(-3 + index, 5.8 - (index % 2) * 0.4, -1.5 + (index % 3) * 0.7);
        this.scene.add(lantern);
      }
    }
    if (this.game.key === 'ramwong' || this.game.key === 'horon') {
      for (let index = 0; index < 9; index += 1) {
        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xfb923c, emissiveIntensity: 1.1 }),
        );
        lantern.position.set(-5 + index * 1.2, 6.4 + Math.sin(index) * 0.4, -2.4);
        this.scene.add(lantern);
      }
    }
    if (this.game.key === 'concert') {
      for (let index = 0; index < 14; index += 1) {
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 6),
          new THREE.MeshBasicMaterial({ color: index % 2 ? 0x7c3aed : 0x22d3ee }),
        );
        light.position.set(-6.5 + index * 1, 8.2, -3.6);
        this.scene.add(light);
      }
    }
    if (this.game.key === 'sira') {
      const saz = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat(0xb45309, { roughness: 0.5 }));
      body.scale.set(1, 0.8, 0.6);
      saz.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.9, 8), mat(0x7c2d12, { roughness: 0.6 }));
      neck.position.y = 1;
      saz.add(neck);
      saz.position.set(-3.4, 1.2, 2.4);
      saz.rotation.z = 0.35;
      this.scene.add(saz);
    }
    if (this.game.key === 'horon' || this.game.key === 'ramwong') {
      for (const x of [-3.7, 3.7]) {
        const drum = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.45, 18),
          mat(0x9a3412, { roughness: 0.7 }),
        );
        drum.position.set(x, 0.7, 2.2);
        drum.rotation.z = Math.PI / 2;
        this.scene.add(drum);
      }
    }

    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const lightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 2.2, 0.06),
        new THREE.MeshStandardMaterial({
          color: this.game.accent,
          emissive: this.game.accent,
          emissiveIntensity: 0.8,
        }),
      );
      lightBar.position.set(Math.cos(angle) * 5.25, 1.1, Math.sin(angle) * 5.25);
      this.scene.add(lightBar);
    }

    const ball = new THREE.Group();
    ball.position.set(0, 8.4, -0.4);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.65,
        roughness: 0.16,
        emissive: 0xffe3ef,
        emissiveIntensity: 0.35,
      }),
    );
    ball.add(sphere);
    const ballLight = new THREE.PointLight(0xffb3d1, 14, 10, 2);
    ballLight.position.set(0, -0.4, 0.5);
    ball.add(ballLight);
    for (let index = 0; index < 22; index += 1) {
      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0xffd6e7,
          metalness: 0.9,
          roughness: 0.08,
          emissive: 0xff7aa9,
          emissiveIntensity: 0.3,
        }),
      );
      const phi = Math.acos(1 - (2 * (index + 0.5)) / 22);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      mirror.position.setFromSphericalCoords(0.64, phi, theta);
      mirror.lookAt(0, 0, 0);
      ball.add(mirror);
    }
    this.scene.add(ball);
    if (cultural) ball.visible = false;
    this.dynamic.push((_state, time) => {
      ball.rotation.y = time * 0.32;
      ball.rotation.z = Math.sin(time * 0.2) * 0.08;
    });

    for (let index = 0; index < 3; index += 1) {
      const beamColor = [0xff77ad, 0x70a5ff, 0xffcf6b][index]!;
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 8.5, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: beamColor,
          transparent: true,
          opacity: 0.035,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      beam.position.set([-2.6, 0, 2.6][index]!, 4.9, 0.6);
      beam.rotation.z = [-0.24, 0, 0.24][index]!;
      this.scene.add(beam);
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(1.4, 32),
        new THREE.MeshBasicMaterial({
          color: beamColor,
          transparent: true,
          opacity: 0.09,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set([-2.6, 0, 2.6][index]!, 0.12, 0.6);
      this.scene.add(pool);
      const spotlight = new THREE.SpotLight(
        beamColor,
        30,
        18,
        Math.PI / 7,
        0.55,
        1.4,
      );
      spotlight.position.set([-5, 5, 2][index]!, 8.5, 3);
      spotlight.target.position.set(0, 0, 0);
      this.scene.add(spotlight, spotlight.target);
      this.dynamic.push((_state, time) => {
        const angle = time * (0.22 + index * 0.04) + (index * Math.PI * 2) / 3;
        spotlight.target.position.set(Math.cos(angle) * 3, 0, Math.sin(angle) * 3);
      });
    }
  }

  private buildPress(): void {
    this.baseCamera.set(0, 6.0, 17.2);
    this.lookTarget.set(0, 1.9, 0);
    this.scene.background = new THREE.Color('#fff8ea');

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 18), softMat('#f2e4cf'));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), mat('#f7ead6'));
    wall.position.set(0, 5, -5.2);
    this.scene.add(wall);

    for (let index = 0; index < 6; index += 1) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), mat('#c9ad8b'));
      shelf.position.set(-7 + index * 2.7, 4 + (index % 2) * 0.8, -4.9);
      this.scene.add(shelf);
      for (let book = 0; book < 3; book += 1) {
        const stack = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.08 + book * 0.03, 0.3),
          mat(['#d97706', '#0f8a72', '#2563eb'][book]!),
        );
        stack.position.set(-7.3 + index * 2.7, 4.12 + (index % 2) * 0.8 + book * 0.09, -4.9);
        this.scene.add(stack);
      }
    }

    const machine = new THREE.Group();
    machine.position.set(3.25, 0, -1.2);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.6, 2.3),
      new THREE.MeshStandardMaterial({
        color: 0x3a3038,
        roughness: 0.42,
        metalness: 0.35,
      }),
    );
    body.position.y = 1.8;
    body.castShadow = true;
    machine.add(body);
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 256;
    const signCtx = signCanvas.getContext('2d')!;
    const signGradient = signCtx.createLinearGradient(0, 0, 512, 256);
    signGradient.addColorStop(0, '#2e2637');
    signGradient.addColorStop(1, '#4a3a3d');
    signCtx.fillStyle = signGradient;
    signCtx.fillRect(0, 0, 512, 256);
    signCtx.strokeStyle = '#f6c453';
    signCtx.lineWidth = 8;
    signCtx.strokeRect(14, 14, 484, 228);
    signCtx.fillStyle = '#ffe6ad';
    signCtx.font = '900 68px system-ui, sans-serif';
    signCtx.textAlign = 'center';
    signCtx.fillText('MATBAA', 256, 124);
    signCtx.fillStyle = 'rgba(255,255,255,0.55)';
    signCtx.font = '600 26px system-ui, sans-serif';
    signCtx.fillText('PROFİL BASKI ATÖLYESİ', 256, 178);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.9),
      new THREE.MeshBasicMaterial({ map: signTexture, fog: false, toneMapped: false }),
    );
    screen.position.set(0, 2.9, 1.18);
    machine.add(screen);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.5), mat('#f3d7ad'));
    mouth.position.set(-0.1, 1.55, 1.35);
    machine.add(mouth);
    const arm = new THREE.Group();
    arm.position.set(-0.6, 3.2, 0.7);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mat('#e5484d'));
    lever.position.y = -0.25;
    arm.add(lever);
    const armBar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), mat('#f3d7ad'));
    armBar.rotation.z = Math.PI / 2;
    armBar.position.set(-0.55, -0.45, 0);
    arm.add(armBar);
    machine.add(arm);
    this.scene.add(machine);
    this.dynamic.push((_state, time) => {
      arm.rotation.z = Math.max(0, Math.sin(time * 2.2)) * 0.4;
    });

    const conveyor = new THREE.Group();
    conveyor.position.set(0, 0.75, 1.8);
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.22, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xb7a084, roughness: 0.8 }),
    );
    belt.castShadow = true;
    conveyor.add(belt);
    for (let index = 0; index < 16; index += 1) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.72, 10),
        mat('#8f7860'),
      );
      roller.rotation.z = Math.PI / 2;
      roller.position.set(-4.3 + index * 0.57, 0.12, 0);
      conveyor.add(roller);
    }
    this.scene.add(conveyor);

    this.dynamic.push((_state, time) => {
      conveyor.children.forEach((child, index) => {
        if (index === 0) return;
        child.rotation.x = time * 0.8;
      });
    });
  }

  private buildCircle(): void {
    this.baseCamera.set(0, 6.0, 16.6);
    this.lookTarget.set(0, 2.2, 0);
    this.scene.background = new THREE.Color('#eef9f3');
    this.scene.fog = new THREE.Fog(0xeef9f3, 18, 34);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7.2, 0.3, 64),
      new THREE.MeshStandardMaterial({ color: 0xe7f1e8, roughness: 0.85 }),
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const courtyard = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0xf2f8ef, roughness: 0.95 }),
    );
    courtyard.rotation.x = -Math.PI / 2;
    courtyard.position.y = -0.19;
    courtyard.receiveShadow = true;
    this.scene.add(courtyard);

    for (let ring = 1; ring <= 3; ring += 1) {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(3.1 + ring * 1.25, 0.035, 8, 96),
        new THREE.MeshStandardMaterial({
          color: 0x8cb8a8,
          roughness: 0.6,
          transparent: true,
          opacity: 0.55,
        }),
      );
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.03;
      this.scene.add(torus);
    }

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.35, 0.45, 32),
      mat('#d6c6a5'),
    );
    pedestal.position.y = 0.22;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    const lantern = new THREE.Group();
    lantern.position.y = 2.1;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 12), mat('#c7962e'));
    stem.position.y = 0.7;
    lantern.add(stem);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffe3a0,
        emissive: 0xffc857,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    );
    glow.position.y = 1.55;
    lantern.add(glow);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.045, 8, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffe7a9,
        emissive: 0xffc857,
        emissiveIntensity: 1,
      }),
    );
    halo.position.y = 1.55;
    halo.rotation.x = Math.PI / 2;
    lantern.add(halo);
    const lanternLight = new THREE.PointLight(0xffc857, 18, 12, 2);
    lanternLight.position.y = 1.55;
    lantern.add(lanternLight);
    this.scene.add(lantern);
    this.dynamic.push((_state, time) => {
      glow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.035);
      halo.rotation.z = time * 0.4;
      lanternLight.intensity = 16 + Math.sin(time * 2) * 1.5;
    });

    for (let index = 0; index < 7; index += 1) {
      const angle = Math.PI + 0.16 + (index / 6) * (Math.PI - 0.32);
      const trunk = new THREE.Group();
      trunk.position.set(Math.cos(angle) * 7.1, 0, Math.sin(angle) * 7.1);
      const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.2, 8), mat('#9b7b55'));
      stemMesh.position.y = 1.1;
      stemMesh.castShadow = true;
      trunk.add(stemMesh);
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(0.85 - leaf * 0.12, 12, 10),
          mat(leaf % 2 === 0 ? '#6f9f7c' : '#87b393'),
        );
        foliage.position.set(
          Math.cos(leaf * 2.1) * 0.45,
          2.2 + leaf * 0.24,
          Math.sin(leaf * 2.1) * 0.45,
        );
        foliage.castShadow = true;
        trunk.add(foliage);
      }
      this.scene.add(trunk);
    }

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(5.8, 0.12, 10, 80, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xcbd9ca, roughness: 0.7 }),
    );
    arch.position.set(0, 0, -4.5);
    arch.rotation.z = Math.PI;
    this.scene.add(arch);
  }

  private buildQuiz(): void {
    this.baseCamera.set(0, 5.4, 15.0);
    this.lookTarget.set(0, 2.2, 0);
    this.scene.background = new THREE.Color('#edf4ff');
    this.scene.fog = new THREE.Fog(0xedf4ff, 18, 36);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), softMat('#e5eefb'));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.7, 0.35, 64),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
    );
    stage.position.y = -0.05;
    stage.receiveShadow = true;
    this.scene.add(stage);
    const stageRim = new THREE.Mesh(
      new THREE.TorusGeometry(5.5, 0.07, 8, 80),
      new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        emissive: 0x2563eb,
        emissiveIntensity: 0.45,
      }),
    );
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.y = 0.16;
    this.scene.add(stageRim);

    const frame = new THREE.Group();
    frame.position.set(0, 4.3, -4.9);
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024;
    this.screenCanvas.height = 552;
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.screenTexture.anisotropy = 4;
    this.screenTexture.generateMipmaps = false;
    this.screenTexture.minFilter = THREE.LinearFilter;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 4.1),
      new THREE.MeshBasicMaterial({ map: this.screenTexture, fog: false, toneMapped: false }),
    );
    screen.position.z = 0.45;
    screen.renderOrder = 2;
    (screen.material as THREE.MeshBasicMaterial).depthTest = false;
    (screen.material as THREE.MeshBasicMaterial).depthWrite = false;
    frame.add(screen);
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(8.1, 4.6, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    border.position.z = -0.6;
    // frame.add(border);
    for (let index = 0; index < 6; index += 1) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x9bc3ff,
          emissiveIntensity: 1.8,
        }),
      );
      light.position.set(-3.5 + index * 1.4, 2.35, 0.2);
      frame.add(light);
    }
    this.scene.add(frame);

    for (let index = 0; index < 4; index += 1) {
      const letter = String.fromCharCode(65 + index);
      const podium = new THREE.Group();
      const col = index % 2;
      const row = Math.floor(index / 2);
      podium.position.set(-2.5 + col * 5, 0.5, 1.4 + row * 1.8);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.95, 0.9, 24),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.4,
        }),
      );
      base.position.y = 0.45;
      base.castShadow = true;
      podium.add(base);
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.58, 24),
        new THREE.MeshStandardMaterial({
          color: 0x2563eb,
          emissive: 0x2563eb,
          emissiveIntensity: 0.18,
          roughness: 0.4,
        }),
      );
      face.position.set(0, 0.55, 0.81);
      podium.add(face);
      const texture = makeTextTexture(letter, '#2563eb', 128, 64);
      const letterSprite = addLabel(podium, texture, 1.35, 0.7);
      letterSprite.position.z = 0.2;
      this.scene.add(podium);
      this.podiums.push({ group: podium, face, letter });
    }

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.9, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    );
    desk.position.set(0, 0.45, 3.4);
    desk.castShadow = true;
    this.scene.add(desk);
  }

  private buildWord(): void {
    this.baseCamera.set(0, 5.4, 15.2);
    this.lookTarget.set(0, 2.2, 0);
    this.scene.background = new THREE.Color('#f7f0ff');
    this.scene.fog = new THREE.Fog(0xf7f0ff, 18, 36);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), softMat('#efe6ff'));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.7, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    );
    desk.position.set(0, 0.35, 1.8);
    desk.castShadow = true;
    this.scene.add(desk);

    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 2.6),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
      }),
    );
    paper.rotation.x = -Math.PI / 2;
    paper.position.set(0, 0.72, 1.8);
    this.scene.add(paper);

    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024;
    this.screenCanvas.height = 552;
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.screenTexture.anisotropy = 4;
    this.screenTexture.generateMipmaps = false;
    this.screenTexture.minFilter = THREE.LinearFilter;
    const wordFrame = new THREE.Group();
    wordFrame.position.set(0, 4.3, -5.1);
    const wordScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 3.9),
      new THREE.MeshBasicMaterial({ map: this.screenTexture, fog: false, toneMapped: false }),
    );
    wordScreen.position.z = 0.45;
    wordScreen.renderOrder = 2;
    (wordScreen.material as THREE.MeshBasicMaterial).depthTest = false;
    (wordScreen.material as THREE.MeshBasicMaterial).depthWrite = false;
    wordFrame.add(wordScreen);
    const wordBorder = new THREE.Mesh(
      new THREE.BoxGeometry(7.7, 4.4, 0.22),
      mat('#ffffff'),
    );
    wordBorder.position.z = -0.6;
    wordFrame.add(wordBorder);
    this.scene.add(wordFrame);

    const letters = ['H', 'A', 'R', 'F'];
    letters.forEach((letter, index) => {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.1, 1.1),
        new THREE.MeshStandardMaterial({
          color: ['#7c3aed', '#a855f7', '#d8b4fe', '#6d28d9'][index]!,
          roughness: 0.38,
        }),
      );
      block.position.set(-2.5 + index * 1.65, 1.35, -2.8);
      block.rotation.y = (index - 1.5) * 0.16;
      block.castShadow = true;
      this.scene.add(block);
      const texture = makeTextTexture(letter, '#7c3aed', 128, 64);
      addLabel(block, texture, 0.84, 0.72);
    });

    for (let index = 0; index < 5; index += 1) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.8, 0.4),
        mat('#d8c8e8'),
      );
      shelf.position.set(-7 + index * 3.4, 1.5, -4.7);
      this.scene.add(shelf);
    }

    const pencil = new THREE.Group();
    const pencilBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.5 }),
    );
    pencilBody.rotation.z = Math.PI / 2.6;
    pencil.add(pencilBody);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf3d7ad }),
    );
    tip.rotation.z = Math.PI / 2.6;
    tip.position.set(1.55, 1.05, 0);
    pencil.add(tip);
    pencil.position.set(0.4, 1.15, 2.2);
    this.scene.add(pencil);
  }

  private buildBattle(): void {
    const stick = this.game.key === 'stick';
    const manor = this.game.key === 'manor';
    this.baseCamera.set(0, stick ? 6.6 : 7.4, stick ? 15.5 : 17.3);
    this.lookTarget.set(0, 1.6, 0);
    const battleBg = manor ? '#171126' : stick ? '#e7fbff' : '#fff7ec';
    this.scene.background = new THREE.Color(battleBg);
    this.scene.fog = new THREE.Fog(new THREE.Color(battleBg), 18, 36);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7.2, 64),
      new THREE.MeshStandardMaterial(
        stick
          ? { color: 0xd6f4fa, roughness: 0.9 }
          : { map: createSandTexture(), roughness: 0.95 },
      ),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: stick ? 0xe7fbff : 0xfff7ec, roughness: 0.95 }),
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.08;
    outerGround.receiveShadow = true;
    this.scene.add(outerGround);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.1, 10, 80),
      new THREE.MeshStandardMaterial({
        color: stick ? 0x0e7490 : 0xb45309,
        emissive: stick ? 0x22d3ee : 0xd97706,
        emissiveIntensity: 0.4,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    this.scene.add(ring);

    if (stick) {
      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 5.2, 12),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x67e8f9,
            emissiveIntensity: 0.3,
            roughness: 0.4,
          }),
        );
        pillar.position.set(Math.cos(angle) * 6.6, 2.6, Math.sin(angle) * 6.6);
        this.scene.add(pillar);
      }
      for (let index = 0; index < 4; index += 1) {
        const bar = new THREE.Mesh(
          new THREE.TorusGeometry(4.5 + index * 0.9, 0.04, 6, 64),
          new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x22d3ee,
            emissiveIntensity: 0.55,
            transparent: true,
            opacity: 0.55,
          }),
        );
        bar.rotation.x = Math.PI / 2;
        bar.position.y = 0.1 + index * 0.05;
        this.scene.add(bar);
      }
      const dojoWall = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 10),
        new THREE.MeshStandardMaterial({ color: 0xdff8fb, roughness: 0.9 }),
      );
      dojoWall.position.set(0, 5, -6.2);
      this.scene.add(dojoWall);
      const dojoCanvas = document.createElement('canvas');
      dojoCanvas.width = 512;
      dojoCanvas.height = 160;
      const dojoCtx = dojoCanvas.getContext('2d')!;
      dojoCtx.fillStyle = '#0e7490';
      dojoCtx.fillRect(0, 0, 512, 160);
      dojoCtx.strokeStyle = '#a5f3fc';
      dojoCtx.lineWidth = 8;
      dojoCtx.strokeRect(12, 12, 488, 136);
      dojoCtx.fillStyle = '#ffffff';
      dojoCtx.font = '900 58px system-ui, sans-serif';
      dojoCtx.textAlign = 'center';
      dojoCtx.fillText('STICK DOJO', 256, 102);
      const dojoTexture = new THREE.CanvasTexture(dojoCanvas);
      dojoTexture.colorSpace = THREE.SRGBColorSpace;
      const dojoSign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 1.06),
        new THREE.MeshBasicMaterial({ map: dojoTexture, fog: false, toneMapped: false }),
      );
      dojoSign.position.set(0, 4.6, -5.9);
      this.scene.add(dojoSign);
      for (let index = 0; index < 3; index += 1) {
        const gate = new THREE.Group();
        gate.position.set(-4 + index * 4, 0, -4.8);
        const postLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x22d3ee, emissiveIntensity: 0.35 }));
        postLeft.position.set(-1.2, 1.6, 0);
        const postRight = postLeft.clone();
        postRight.position.x = 1.2;
        const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x22d3ee, emissiveIntensity: 0.45 }));
        top.position.y = 3.05;
        gate.add(postLeft, postRight, top);
        this.scene.add(gate);
      }
      for (let index = 0; index < 18; index += 1) {
        const fan = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 6),
          mat(['#0e7490', '#22d3ee', '#ffffff', '#f0abfc'][index % 4]!),
        );
        fan.position.set(-6 + (index % 12) * 1.05, 1.1 + Math.floor(index / 12) * 0.4, -4.5);
        this.scene.add(fan);
      }
    } else {
      for (let index = 0; index < 7; index += 1) {
        const angle = Math.PI + 0.18 + (index / 6) * (Math.PI - 0.36);
        const column = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.42, 5.8, 12),
          new THREE.MeshStandardMaterial({ color: 0xf5e6d1, roughness: 0.8 }),
        );
        column.position.set(Math.cos(angle) * 7.1, 2.9, Math.sin(angle) * 7.1);
        column.castShadow = true;
        this.scene.add(column);
        const capital = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.28, 1.2),
          new THREE.MeshStandardMaterial({ color: 0xf8ecd9, roughness: 0.75 }),
        );
        capital.position.set(Math.cos(angle) * 7.1, 5.8, Math.sin(angle) * 7.1);
        this.scene.add(capital);
      }
      for (let index = 0; index < 3; index += 1) {
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(1.3, 2.4),
          new THREE.MeshBasicMaterial({
            map: makeBannerTexture(['ARENA', 'USTA', 'SAVAŞ'][index]!, ['#b91c1c', '#d97706', '#0f766e'][index]!),
            side: THREE.DoubleSide,
            fog: false,
            toneMapped: false,
          }),
        );
        banner.position.set(-3 + index * 3, 5.2, -5.4);
        this.scene.add(banner);
      }
      for (let index = 0; index < 16; index += 1) {
        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.5, 0.9),
          new THREE.MeshStandardMaterial({
            color: ['#e7c9a9', '#d9b28f', '#f1d6ba'][index % 3],
            roughness: 0.9,
          }),
        );
        stand.position.set(-8.5 + (index % 8) * 2.3, 0.25 + Math.floor(index / 8) * 0.32, -6.4);
        this.scene.add(stand);
        const fan = new THREE.Mesh(
          new THREE.SphereGeometry(0.17, 8, 6),
          mat(['#b91c1c', '#f59e0b', '#0f766e', '#7c3aed'][index % 4]!),
        );
        fan.position.set(-8.5 + (index % 8) * 2.3, 0.72 + Math.floor(index / 8) * 0.32, -6.4);
        this.scene.add(fan);
      }
    }

    const centerMark = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.3, 48),
      new THREE.MeshBasicMaterial({
        color: stick ? 0x0e7490 : 0xb45309,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      }),
    );
    centerMark.rotation.x = -Math.PI / 2;
    centerMark.position.y = 0.04;
    this.scene.add(centerMark);
  }

  private buildRace(): void {
    const hillMode = this.game.key === 'hill';
    const grandPrix = this.game.key === 'grandprix';
    const animalMode = this.game.key === 'animal';
    const crowdMode = this.game.key === 'crowd';
    const balloonMode = this.game.key === 'balloon';
    this.baseCamera.set(0, 7.8, 14.5);
    this.lookTarget.set(0, 0.8, -2.5);
    const sky = hillMode ? '#ecfdf5' : grandPrix ? '#fff1f2' : animalMode ? '#fefce8' : crowdMode ? '#ecfeff' : balloonMode ? '#fdf2f8' : '#eef7ff';
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(new THREE.Color(sky), 26, 52);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 44), softMat(hillMode || animalMode ? '#bbf7d0' : grandPrix ? '#fecdd3' : crowdMode ? '#cffafe' : balloonMode ? '#fce7f3' : '#dcebdc'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -4;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Düz piksel pisti: 5 şerit, start ve finish arası.
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 27),
      new THREE.MeshStandardMaterial({
        color: hillMode ? 0x9a6b3f : animalMode ? 0x8b6b3f : grandPrix ? 0x2b2b33 : crowdMode ? 0x475569 : 0x3d3d4a,
        roughness: 0.88,
      }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.04, -2);
    road.receiveShadow = true;
    this.scene.add(road);

    for (const x of [-6.45, 6.45]) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.03, 27),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc }),
      );
      line.position.set(x, 0.08, -2);
      this.scene.add(line);
    }
    for (let lane = 1; lane < 5; lane += 1) {
      const x = -6.5 + lane * 2.6;
      for (let index = 0; index < 18; index += 1) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.02, 0.8),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.7 }),
        );
        dash.position.set(x, 0.08, 9 - index * 1.45);
        this.scene.add(dash);
      }
    }

    for (let index = 0; index < 13; index += 1) {
      const startTile = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.025, 0.7),
        new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xffffff : 0x24242c, roughness: 0.6 }),
      );
      startTile.position.set(-6 + index, 0.1, 8.2);
      this.scene.add(startTile);
    }
    for (let index = 0; index < 13; index += 1) {
      const finishTile = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.025, 0.7),
        new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0x24242c : 0xffffff, roughness: 0.6 }),
      );
      finishTile.position.set(-6 + index, 0.1, -15);
      this.scene.add(finishTile);
    }

    // Finish gantry: pistin iki yanında, ortayı kapatmaz.
    const finishGroup = new THREE.Group();
    for (const x of [-6.8, 6.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.4, 0.28), mat('#2b2a33'));
      post.position.set(x, 2.2, -15);
      finishGroup.add(post);
    }
    const finishBar = new THREE.Mesh(
      new THREE.BoxGeometry(13.9, 0.24, 0.24),
      mat('#2b2a33'),
    );
    finishBar.position.set(0, 4.35, -15);
    finishGroup.add(finishBar);
    const finishCanvas = document.createElement('canvas');
    finishCanvas.width = 1024;
    finishCanvas.height = 160;
    const finishCtx = finishCanvas.getContext('2d')!;
    finishCtx.fillStyle = '#fffaf4';
    finishCtx.fillRect(0, 0, 1024, 160);
    for (let index = 0; index < 32; index += 1) {
      finishCtx.fillStyle = index % 2 === 0 ? '#24242c' : '#ffffff';
      finishCtx.fillRect(index * 32, 0, 32, 22);
      finishCtx.fillRect(index * 32, 138, 32, 22);
    }
    finishCtx.fillStyle = '#24242c';
    finishCtx.font = '900 58px system-ui, sans-serif';
    finishCtx.textAlign = 'center';
    finishCtx.fillText(hillMode ? 'Z İ R V E' : grandPrix ? 'F I N I S H' : animalMode ? 'F I N I S H' : 'F I N I S', 512, 102);
    const finishTexture = new THREE.CanvasTexture(finishCanvas);
    finishTexture.colorSpace = THREE.SRGBColorSpace;
    const finishBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(13.2, 2.1),
      new THREE.MeshBasicMaterial({ map: finishTexture, fog: false, toneMapped: false, side: THREE.DoubleSide }),
    );
    finishBanner.position.set(0, 3.35, -15);
    finishGroup.add(finishBanner);
    this.scene.add(finishGroup);

    // Start ışıkları.
    for (const x of [-7.2, 7.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.6, 0.24), mat('#2b2a33'));
      post.position.set(x, 1.8, 9.2);
      this.scene.add(post);
      for (let index = 0; index < 3; index += 1) {
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 10, 8),
          new THREE.MeshStandardMaterial({
            color: index < 2 ? 0xef4444 : 0x22c55e,
            emissive: index < 2 ? 0xef4444 : 0x22c55e,
            emissiveIntensity: 0.9,
          }),
        );
        light.position.set(x, 2.5 + index * 0.42, 9.2);
        this.scene.add(light);
      }
    }

    // Yan tribünler ve ağaçlar.
    for (const side of [-1, 1]) {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.4, 20),
        mat('#efe0c9'),
      );
      stand.position.set(side * 9.6, 0.7, -3);
      stand.receiveShadow = true;
      this.scene.add(stand);
      for (let index = 0; index < 28; index += 1) {
        const fan = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 6),
          mat(['#e0558f', '#2563eb', '#0f8a72', '#d97706', '#7c3aed'][index % 5]!),
        );
        fan.position.set(side * 9.2, 1.5 + (index % 3) * 0.34, 6 - Math.floor(index / 3) * 1.1);
        this.scene.add(fan);
      }
    }
    for (let index = 0; index < 8; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const tree = new THREE.Group();
      tree.position.set(side * 12.6, 0, 7 - Math.floor(index / 2) * 5);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 8), mat('#8b6a46'));
      trunk.position.y = 0.8;
      tree.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), mat('#72a982'));
      leaves.position.y = 2.0;
      tree.add(leaves);
      this.scene.add(tree);
    }

    this.dynamic.push((state, time) => {
      const players = state.players ?? [];
      const average =
        players.length > 0
          ? players.reduce((sum, player) => sum + player.progress, 0) / players.length
          : 0;
      const packZ = 7.6 - (average / 100) * 21.5;
      this.camera.position.set(Math.sin(time * 0.08) * 0.3, 11, packZ + 21);
      this.camera.lookAt(0, 0.7, packZ - 6);
    });
  }


  private buildWheel(): void {
    this.baseCamera.set(0, 5.7, 14.6);
    this.lookTarget.set(0, 3.25, 0);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff1dc }),
    );
    back.position.set(0, 7, -7.5);
    this.scene.add(back);

    for (let index = 0; index < 12; index += 1) {
      const ray = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 14),
        new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? 0xffdcaa : 0xffe9cc,
          transparent: true,
          opacity: 0.55,
        }),
      );
      ray.position.set(-8 + index * 1.45, 7, -7.3);
      ray.rotation.z = (index - 5.5) * 0.12;
      this.scene.add(ray);
    }

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 5.2, 0.36, 64),
      mat(0xf5e2c2, { roughness: 0.9 }),
    );
    stage.position.y = -0.05;
    stage.receiveShadow = true;
    this.scene.add(stage);
    const stageRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.7, 0.08, 8, 80),
      mat(0xd97706, { roughness: 0.35, metalness: 0.25 }),
    );
    stageRing.rotation.x = Math.PI / 2;
    stageRing.position.y = 0.16;
    this.scene.add(stageRing);

    const wheel = new THREE.Group();
    wheel.position.set(0, 3.65, 0);
    this.wheelGroup = wheel;

    this.wheelCanvas = document.createElement('canvas');
    this.wheelCanvas.width = 1024;
    this.wheelCanvas.height = 1024;
    this.wheelTexture = new THREE.CanvasTexture(this.wheelCanvas);
    this.wheelTexture.colorSpace = THREE.SRGBColorSpace;
    this.wheelTexture.anisotropy = 4;
    this.wheelTexture.generateMipmaps = false;
    this.wheelTexture.minFilter = THREE.LinearFilter;

    const face = new THREE.Mesh(
      new THREE.CircleGeometry(2.78, 96),
      new THREE.MeshBasicMaterial({ map: this.wheelTexture, fog: false, toneMapped: false }),
    );
    face.position.z = 0.2;
    wheel.add(face);

    const backPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(2.9, 2.9, 0.34, 64),
      mat(0xf0cf9e, { roughness: 0.5 }),
    );
    backPlate.rotation.x = Math.PI / 2;
    backPlate.position.z = 0;
    wheel.add(backPlate);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.2, 12, 64),
      mat(0xd97706, { roughness: 0.32, metalness: 0.35 }),
    );
    rim.position.z = 0.16;
    wheel.add(rim);

    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 10, 8),
        new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0xfff3b0 : 0xffffff }),
      );
      bulb.position.set(Math.cos(angle) * 3.12, Math.sin(angle) * 3.12, 0.28);
      wheel.add(bulb);
    }

    const hub = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 40),
      mat(0xfff7ea, { roughness: 0.4 }),
    );
    hub.position.z = 0.24;
    wheel.add(hub);
    this.scene.add(wheel);

    const pointer = new THREE.Group();
    const dowel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10),
      mat(0x7c3aed, { roughness: 0.35 }),
    );
    dowel.position.y = 0.28;
    pointer.add(dowel);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.62, 3),
      mat(0xe0558f, { roughness: 0.35 }),
    );
    tip.rotation.z = Math.PI;
    tip.position.y = -0.08;
    pointer.add(tip);
    pointer.position.set(0, 6.78, 0.5);
    this.scene.add(pointer);
    this.wheelPointer = pointer;

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.8, 1.2, 20),
      mat(0x7c3aed, { roughness: 0.5 }),
    );
    podium.position.set(-4.1, 0.6, 1.6);
    podium.castShadow = true;
    this.scene.add(podium);
    const ticketSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    );
    ticketSign.position.set(-4.1, 1.65, 1.6);
    this.scene.add(ticketSign);

    this.dynamic.push((state, time, dt) => {
      if (!this.wheelGroup || !state.players) return;
      const spin = state.wheel?.spin ?? null;
      const key = `${state.players.map((player) => `${player.id}:${player.name}`).join('|')}:${spin?.id ?? 0}:${spin?.segment ?? -1}`;
      if (key !== this.wheelKey) {
        this.wheelKey = key;
        this.paintWheel(state);
      }
      const count = Math.max(1, Math.min(24, state.players.length || 8));
      const step = (Math.PI * 2) / count;
      if (spin) {
        if (spin.id !== this.wheelSpinId) {
          this.wheelSpinId = spin.id;
          this.wheelSpinBase = this.wheelAngle;
        }
        const progress = Math.max(0, Math.min(1, (Date.now() - spin.startedAt) / Math.max(1, spin.endsAt - spin.startedAt)));
        const eased = 1 - Math.pow(1 - progress, 3);
        const turns = Math.PI * 2 * (4 + (spin.id % 3));
        const final = this.wheelSpinBase + turns + (Math.PI * 2 - (spin.segment + 0.5) * step);
        this.wheelAngle = this.wheelSpinBase + (final - this.wheelSpinBase) * eased;
      } else {
        this.wheelAngle += dt * 0.18;
      }
      this.wheelGroup.rotation.z = this.wheelAngle;
      if (this.wheelPointer) {
        this.wheelPointer.rotation.z = Math.sin(time * 9) * 0.05;
        this.wheelPointer.position.x = Math.sin(time * 1.4) * 0.04;
      }
      this.lookTarget.set(0, 3.4, 0);
    });
  }

  private paintWheel(state: ArcadeStateView): void {
    if (!this.wheelCanvas || !this.wheelTexture) return;
    const canvas = this.wheelCanvas;
    const ctx = canvas.getContext('2d')!;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12;
    ctx.clearRect(0, 0, size, size);

    const players = state.players;
    const count = Math.max(6, Math.min(24, players.length || 8));
    const step = (Math.PI * 2) / count;
    const palette = ['#e0558f', '#2563eb', '#0f8a72', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d'];
    const labels = ['ŞANS', 'BİLET', 'YAYIN', 'HEDİYE', 'ÇARK', 'SÜRPRİZ', 'KALABALIK', 'BONUS'];
    const winnerSegment = state.wheel?.spin?.segment ?? -1;

    ctx.save();
    ctx.translate(center, center);
    for (let index = 0; index < count; index += 1) {
      const start = -Math.PI / 2 + index * step;
      const end = start + step;
      const player = players[index];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = player?.color ?? palette[index % palette.length]!;
      ctx.fill();
      if (index === winnerSegment) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (let index = 0; index < count; index += 1) {
      const start = -Math.PI / 2 + index * step;
      const angle = start + step / 2;
      const player = players[index];
      const label = player?.name ?? labels[index % labels.length]!;
      const flip = Math.cos(angle) < 0;
      ctx.save();
      ctx.rotate(angle + (flip ? Math.PI : 0));
      ctx.textAlign = flip ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      const textX = flip ? -(radius - 42) : radius - 42;
      ctx.font = `800 ${count > 16 ? 19 : 24}px system-ui, sans-serif`;
      ctx.fillText(label.slice(0, 14), textX, 0);
      if (player) {
        ctx.font = '700 16px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fillText(`${Math.round(player.score)} bilet`, textX, 22);
      }
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 108, 0, Math.PI * 2);
    ctx.fillStyle = '#fffaf1';
    ctx.fill();
    ctx.strokeStyle = 'rgba(217,119,6,0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = '#4a2c06';
    ctx.font = '900 37px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ÇARK', 0, -12);
    ctx.fillStyle = '#d97706';
    ctx.font = '800 17px system-ui, sans-serif';
    ctx.fillText('BİLET TOPLA', 0, 28);
    ctx.restore();
    this.wheelTexture.needsUpdate = true;
  }

  private buildTug(): void {
    this.baseCamera.set(0, 5.1, 14.8);
    this.lookTarget.set(0, 1.5, 0);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 18),
      new THREE.MeshBasicMaterial({ color: 0xfff2ee }),
    );
    back.position.set(0, 6.5, -7);
    this.scene.add(back);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 26),
      new THREE.MeshStandardMaterial({ color: 0xf6e3d3, roughness: 0.96 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const redZone = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xfecaca, transparent: true, opacity: 0.32 }),
    );
    redZone.rotation.x = -Math.PI / 2;
    redZone.position.set(-3.2, 0.02, 0);
    this.scene.add(redZone);
    const blueZone = redZone.clone();
    (blueZone.material as THREE.MeshBasicMaterial) = new THREE.MeshBasicMaterial({
      color: 0xbfdbfe,
      transparent: true,
      opacity: 0.32,
    });
    blueZone.position.x = 3.2;
    this.scene.add(blueZone);

    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 10.2, 10),
      mat(0x8a5a2b, { roughness: 0.85 }),
    );
    rope.rotation.z = Math.PI / 2;
    rope.position.y = 1.08;
    this.scene.add(rope);

    const marker = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.35, 10),
      mat(0xffffff, { roughness: 0.35 }),
    );
    pole.position.y = 0.7;
    marker.add(pole);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.04),
      mat(0x7c3aed, { roughness: 0.35 }),
    );
    flag.position.set(0.28, 1.15, 0);
    marker.add(flag);
    marker.position.set(0, 1.05, 0);
    this.scene.add(marker);
    this.tugMarker = marker;

    const banner = (label: string, color: number, x: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 512, 160);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, 488, 136);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 54px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 256, 100);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.25, 0.72),
        new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false }),
      );
      sign.position.set(x, 3.6, -2.6);
      this.scene.add(sign);
    };
    banner('KIRMIZI', 0xdc2626, -2.85);
    banner('MAVİ', 0x2563eb, 2.85);

    this.dynamic.push((state, time) => {
      const position = state.tug?.position ?? 0;
      if (this.tugMarker) {
        this.tugMarker.position.x = position * 2.7;
        this.tugMarker.rotation.z = Math.sin(time * 3.4) * 0.035;
      }
      this.lookTarget.set(position * 0.9, 1.7, 0);
      this.camera.position.x = this.baseCamera.x + position * 0.4;
    });
  }


  private buildVersus(): void {
    this.baseCamera.set(4.0, 5.9, 16.2);
    this.lookTarget.set(0, 1.9, 0);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff1f6 }),
    );
    back.position.set(0, 7, -8);
    this.scene.add(back);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 26),
      new THREE.MeshStandardMaterial({ color: 0xf8e7ec, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    for (let index = -4; index <= 4; index += 1) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.02, 8),
        new THREE.MeshBasicMaterial({ color: index === 0 ? 0xdb2777 : 0xffffff, transparent: true, opacity: index === 0 ? 0.55 : 0.75 }),
      );
      line.position.set(index * 1.15, 0.025, 0);
      this.scene.add(line);
    }

    const wall = new THREE.Group();
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 3.7, 6.2),
      mat(0xe8d6dd, { roughness: 0.55 }),
    );
    panel.position.y = 1.9;
    panel.castShadow = true;
    wall.add(panel);
    const girlsStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.49, 3.7, 0.2),
      mat(0xdb2777, { roughness: 0.4 }),
    );
    girlsStripe.position.set(0, 1.9, 3.1);
    wall.add(girlsStripe);
    const boysStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.49, 3.7, 0.2),
      mat(0x2563eb, { roughness: 0.4 }),
    );
    boysStripe.position.set(0, 1.9, -3.1);
    wall.add(boysStripe);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.16, 6.4),
      mat(0xf3c7d8, { roughness: 0.4 }),
    );
    cap.position.y = 3.78;
    wall.add(cap);
    wall.position.set(0, 0, 0);
    this.scene.add(wall);
    this.versusWall = wall;

    const banner = (label: string, color: number, x: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, 512, 160);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, 488, 136);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 256, 100);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 0.64),
        new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false }),
      );
      sign.position.set(x, 3.6, -3.0);
      this.scene.add(sign);
    };
    if (this.game.key === 'clash') {
      banner('KIRMIZI', 0xdc2626, -2.4);
      banner('MAVI', 0x2563eb, 2.4);
    } else {
      banner('KIZLAR', 0xdb2777, -2.4);
      banner('ERKEKLER', 0x2563eb, 2.4);
    }

    const blueLight = new THREE.PointLight(0x60a5fa, 20, 22, 2);
    blueLight.position.set(5, 5, 3);
    this.scene.add(blueLight);

    this.dynamic.push((state, time) => {
      const position = state.wall?.position ?? 0;
      if (this.versusWall) {
        this.versusWall.position.x = -position * 2.2;
        this.versusWall.rotation.z = Math.sin(time * 2.2) * 0.008;
        this.versusWall.rotation.y = Math.sin(time * 1.5) * 0.006;
      }
      this.lookTarget.set(-position * 0.45, 1.9, 0);
    });
  }


  private buildHorse(): void {
    this.baseCamera.set(11.5, 10.8, 10.2);
    this.lookTarget.set(0, 1.1, -4.2);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff8e7 }),
    );
    back.position.set(0, 8, -10);
    this.scene.add(back);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 28),
      new THREE.MeshStandardMaterial({ color: 0xf5e6c9, roughness: 0.96 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const track = new THREE.Mesh(
      new THREE.PlaneGeometry(11.4, 22),
      new THREE.MeshStandardMaterial({ color: 0xe7c493, roughness: 0.95 }),
    );
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0.02, -1);
    this.scene.add(track);

    for (let index = 0; index <= 10; index += 1) {
      const x = (index - 5) * 1.0;
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.02, 22),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
      );
      line.position.set(x, 0.04, -1);
      this.scene.add(line);
    }

    const fin = (label: string, z: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#3b2412';
      ctx.fillRect(0, 0, 512, 160);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, 0, 512, 14);
      ctx.fillRect(0, 146, 512, 14);
      ctx.fillStyle = '#fff7e7';
      ctx.font = '900 64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 256, 104);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 1.06),
        new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false }),
      );
      sign.position.set(0, 4.7, z);
      this.scene.add(sign);
    };
    fin('FİNİŞ', 11.2);
    fin('START', -9.8);

    for (const z of [11.2, -9.8]) {
      for (const x of [-5.6, 5.6]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, 5.2, 12),
          mat(0x7c4a22, { roughness: 0.6 }),
        );
        post.position.set(x, 2.6, z);
        post.castShadow = true;
        this.scene.add(post);
      }
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(11.4, 0.22, 0.22),
        mat(0x7c4a22, { roughness: 0.6 }),
      );
      bar.position.set(0, 5.1, z);
      this.scene.add(bar);
    }

    HORSE_RACERS.forEach((racer, index) => {
      const x = (racer.id - 5.5) * 1.0;
      const group = new THREE.Group();
      group.position.set(x, 0, -9.2);
      group.scale.setScalar(0.78);

      const shadow = shadowMesh(0.46);
      group.add(shadow);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 1.3),
        mat(racer.color, { roughness: 0.55 }),
      );
      body.position.y = 1.05;
      body.castShadow = true;
      group.add(body);

      const neck = new THREE.Mesh(
        new THREE.BoxGeometry(0.27, 0.62, 0.34),
        mat(racer.color, { roughness: 0.55 }),
      );
      neck.position.set(0, 1.42, -0.62);
      neck.rotation.x = -0.35;
      group.add(neck);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.58),
        mat(racer.color, { roughness: 0.5 }),
      );
      head.position.set(0, 1.67, -0.92);
      head.rotation.x = -0.18;
      group.add(head);

      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.28, 0.7),
        mat(0x3b2412, { roughness: 0.9 }),
      );
      mane.position.set(0, 1.7, -0.55);
      group.add(mane);

      const saddle = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.12, 0.46),
        mat(0xfef3c7, { roughness: 0.7 }),
      );
      saddle.position.set(0, 1.34, 0.1);
      group.add(saddle);

      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.5, 0.1),
        mat(0x3b2412, { roughness: 0.9 }),
      );
      tail.position.set(0, 1.1, 0.72);
      tail.rotation.x = -0.4;
      group.add(tail);

      const legs: THREE.Mesh[] = [];
      for (const [legX, legZ] of [
        [-0.18, -0.42],
        [0.18, -0.42],
        [-0.18, 0.42],
        [0.18, 0.42],
      ] as Array<[number, number]>) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.055, 0.8, 8),
          mat(0x5b3a24, { roughness: 0.8 }),
        );
        leg.position.set(legX, 0.42, legZ);
        leg.castShadow = true;
        group.add(leg);
        legs.push(leg);
      }

      const number = addLabel(group, makeTextTexture(`${racer.id} ${racer.name}`, racer.color), 2.35, 0.82);
      number.position.z = 0.2;

      this.scene.add(group);
      this.horseLanes.set(racer.id, {
        group,
        body,
        head,
        legs,
        label: number,
        lastProgress: 0,
      });
      void index;
    });

    this.dynamic.push((state, time) => {
      const lanes = state.horse?.lanes ?? [];
      let leaderProgress = 0;
      let leaderZ = 9.2;
      lanes.forEach((lane) => {
        const actor = this.horseLanes.get(lane.id);
        if (!actor) return;
        const z = -9.2 + (lane.progress / 100) * 18.8;
        actor.group.position.z = z;
        const speed = Math.max(0.04, Math.abs(lane.progress - actor.lastProgress));
        actor.lastProgress = lane.progress;
        actor.legs.forEach((leg, index) => {
          leg.rotation.x = Math.sin(time * 15 + index * 1.7 + lane.id) * (0.3 + Math.min(0.35, speed * 0.02));
        });
        actor.body.position.y = 1.05 + Math.sin(time * 12 + lane.id) * 0.035;
        actor.head.rotation.z = Math.sin(time * 6 + lane.id) * 0.04;
        if (lane.progress > leaderProgress) {
          leaderProgress = lane.progress;
          leaderZ = z;
        }
      });
      this.lookTarget.set(0, 1.1, -4.2 + Math.max(-1.5, Math.min(1.5, leaderZ * 0.12)));
    });
  }

  private animateHorses(state: ArcadeStateView, time: number): void {
    if (this.game.mode !== 'horse') return;
    const lanes = state.horse?.lanes ?? [];
    lanes.forEach((lane) => {
      const actor = this.horseLanes.get(lane.id);
      if (!actor) return;
      actor.label.visible = true;
      actor.group.rotation.y = 0;
      actor.body.rotation.z = Math.sin(time * 3 + lane.id) * 0.02;
    });
  }


  private buildTown(): void {
    this.baseCamera.set(12.5, 9.8, 19.5);
    this.lookTarget.set(0, 2.4, -1);
    this.scene.background = new THREE.Color('#e8f8fb');
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 26),
      new THREE.MeshStandardMaterial({ color: this.game.key === 'brick' ? 0xdbeafe : 0xbfe6da, roughness: 0.95 }),
    );
    this.scene.add(ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    for (let index = -2; index <= 2; index += 1) {
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.02, 26),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }),
      );
      road.position.set(index * 2.2, 0.03, 0);
      this.scene.add(road);
    }
    this.dynamic.push((_state, time) => {
      this.lookTarget.set(0, 2.3 + Math.sin(time * 0.4) * 0.08, -1);
    });
  }

  private syncTown(state: ArcadeStateView): void {
    const seen = new Set<string>();
    state.players.forEach((player, index) => {
      seen.add(player.id);
      const x = (index % 5 - 2) * 2.2;
      const z = Math.floor(index / 5) * 3.6 - 3.6;
      const floors = Math.max(1, Math.min(12, Math.ceil(player.progress / 8.2) + 1));
      let building = this.townBuildings.get(player.id);
      if (building && building.floors !== floors) {
        this.scene.remove(building.group);
        disposeObject(building.group);
        this.townBuildings.delete(player.id);
        building = undefined;
      }
      if (!building) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        for (let floor = 0; floor < floors; floor += 1) {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 0.72, 1.35),
            mat(floor % 2 === 0 ? player.color : '#f8fafc', { roughness: 0.55 }),
          );
          mesh.position.y = 0.36 + floor * 0.72;
          mesh.castShadow = true;
          group.add(mesh);
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.18, 0.03),
            new THREE.MeshBasicMaterial({ color: 0xfff3b0 }),
          );
          win.position.set(0, 0.36 + floor * 0.72, 0.69);
          group.add(win);
        }
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.6, 4), mat(player.color));
        roof.position.y = 0.72 * floors + 0.28;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
        addLabel(group, makeTextTexture(player.name, player.color), 0.72 * floors + 0.9, 0.7);
        this.scene.add(group);
        this.townBuildings.set(player.id, { group, floors });
      }
    });
    for (const [id, building] of this.townBuildings) {
      if (seen.has(id)) continue;
      this.scene.remove(building.group);
      disposeObject(building.group);
      this.townBuildings.delete(id);
    }
  }

  private buildMelon(): void {
    this.baseCamera.set(0, 5.6, 14.5);
    this.lookTarget.set(0, 2.1, 0);
    this.scene.background = new THREE.Color('#fff4dc');
    const counter = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xe8d3b0, roughness: 0.9 }));
    counter.position.set(0, 0.25, 0);
    counter.receiveShadow = true;
    this.scene.add(counter);
    const board = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 4.2), new THREE.MeshStandardMaterial({ color: 0xc99a61, roughness: 0.8 }));
    board.position.set(0, 0.54, 0);
    this.scene.add(board);
    const melon = new THREE.Group();
    melon.position.set(0, 2.1, 0);
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.05, 36, 24), new THREE.MeshStandardMaterial({ color: this.game.key === 'egg' ? 0xfef3c7 : 0x4d9f45, roughness: 0.35 }));
    body.scale.set(1.08, 0.96, 1);
    body.castShadow = true;
    melon.add(body);
    for (let index = 0; index < 7; index += 1) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.055, 6, 32), new THREE.MeshStandardMaterial({ color: this.game.key === 'egg' ? 0xfde68a : 0x1f6b2a, roughness: 0.5 }));
      stripe.rotation.y = (index / 7) * Math.PI;
      stripe.scale.set(1.08, 0.96, 1);
      melon.add(stripe);
    }
    this.scene.add(melon);
    this.melonGroup = melon;
    this.melonBands = [];
    for (let index = 0; index < 14; index += 1) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(2.13 + index * 0.02, 0.055, 6, 36),
        new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xfbbf24 : 0xf472b6, roughness: 0.55 }),
      );
      band.rotation.x = Math.PI / 2;
      band.rotation.z = (index / 14) * Math.PI;
      band.position.y = -1.4 + index * 0.21;
      band.visible = true;
      melon.add(band);
      this.melonBands.push(band);
    }
    if (this.game.key === 'egg') {
      this.eggCracks = [];
      for (let index = 0; index < 7; index += 1) {
        const crack = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.7 + (index % 3) * 0.25, 0.03),
          new THREE.MeshBasicMaterial({ color: 0x78350f }),
        );
        const angle = -0.8 + index * 0.27;
        crack.position.set(Math.sin(angle) * 1.45, 0.4 + (index % 4) * 0.3, 2.02);
        crack.rotation.z = angle * 0.7;
        crack.visible = false;
        melon.add(crack);
        this.eggCracks.push(crack);
      }
    }
    this.dynamic.push((state, time) => {
      const tension = state.melon?.tension ?? 0;
      const visible = Math.ceil(tension / 7.2);
      this.melonBands.forEach((band, index) => {
        band.visible = true;
        band.rotation.z += 0.002;
      });
      this.eggCracks.forEach((crack, index) => {
        crack.visible = tension > 12 + index * 9;
      });
      const action = state.lastAction;
      const kicked = action && state.now - action.at < 320 && action.kind !== 'comment';
      if (this.melonGroup) {
        this.melonGroup.position.x = kicked ? Math.sin(time * 55) * 0.07 : 0;
      }
      this.melonGroup?.rotation.set(Math.sin(time * 4) * 0.012 * (tension / 100), time * 0.08, Math.cos(time * 5) * 0.01 * (tension / 100));
      if (this.melonGroup) this.melonGroup.scale.setScalar(1 + tension * 0.0012);
    });
  }

  private buildGold(): void {
    this.baseCamera.set(0, 8.2, 18.5);
    this.lookTarget.set(0, 2.8, 0);
    this.scene.background = new THREE.Color('#fff7db');
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), new THREE.MeshStandardMaterial({ color: 0xe9d8b0, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const vault = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 5), mat(this.game.key === 'chest' ? 0x6b3f2a : 0x2b2a33, { roughness: 0.6 }));
    vault.position.set(0, 1.7, -5.2);
    vault.castShadow = true;
    this.scene.add(vault);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.2, 32), mat(0xd6a33a, { metalness: 0.55, roughness: 0.3 }));
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 1.8, -0.25);
    this.scene.add(door);
    for (let index = 0; index < 65; index += 1) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 12), new THREE.MeshStandardMaterial({ color: 0xf6c945, metalness: 0.45, roughness: 0.28 }));
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3.2;
      coin.position.set(Math.cos(angle) * radius, 0.4 + Math.random() * 0.6, Math.sin(angle) * radius);
      coin.castShadow = true;
      this.scene.add(coin);
      this.goldCoins.push(coin);
    }
    const magnet = new THREE.Group();
    magnet.position.set(0, 7.0, 2.0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1.5), mat(0xdc2626));
    magnet.add(top);
    for (const x of [-1.1, 1.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 1.4), mat(0x2563eb));
      leg.position.set(x, -1.3, 0);
      magnet.add(leg);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 1.42), mat(0xe5e7eb, { metalness: 0.5, roughness: 0.25 }));
      tip.position.set(x, -2.18, 0);
      magnet.add(tip);
    }
    this.scene.add(magnet);
    this.goldMagnet = magnet;
    this.dynamic.push((state, time) => {
      const pull = state.gold?.pulled ?? 0;
      this.goldCoins.forEach((coin, index) => {
        const angle = time * 0.35 + index;
        const radius = 3.2 * (1 - pull / 130);
        coin.position.x += (Math.cos(angle) * radius - coin.position.x) * 0.02;
        coin.position.z += (Math.sin(angle) * radius - coin.position.z) * 0.02;
        coin.position.y += (1.2 + pull * 0.03 - coin.position.y) * 0.015;
        coin.rotation.y += 0.04 + pull * 0.0006;
      });
      this.goldMagnet?.rotation.set(0, Math.sin(time * 0.6) * 0.2, 0);
    });
  }

  private buildAmbientParticles(): void {
    const count = 90;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color(this.game.accent);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 15;
      positions[index * 3 + 1] = Math.random() * 8 + 0.4;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 12;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.09,
        transparent: true,
        opacity: 0.55,
        vertexColors: true,
        depthWrite: false,
      }),
    );
    this.scene.add(particles);
    this.dynamic.push((_state, time) => {
      particles.rotation.y = time * 0.02;
      particles.position.y = Math.sin(time * 0.25) * 0.12;
    });
  }

  private paintScreen(): void {
    if (!this.screenCanvas || !this.screenTexture || !this.state) return;
    const key = `${this.state.prompt?.id ?? 0}:${this.state.prompt?.reveal ? 1 : 0}:${this.state.phase}`;
    if (key === this.screenKey) return;
    this.screenKey = key;
    const ctx = this.screenCanvas.getContext('2d')!;
    const w = this.screenCanvas.width;
    const h = this.screenCanvas.height;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    if (this.game.mode === 'word') {
      gradient.addColorStop(0, '#241047');
      gradient.addColorStop(1, '#4c1d95');
    } else {
      gradient.addColorStop(0, '#0e1e38');
      gradient.addColorStop(1, '#1c3b63');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.game.accent;
    ctx.fillRect(0, 0, w, 14);

    // yumuşak dekoratif halkalar
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 3;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.12, 100 + index * 44, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.game.mode === 'word' ? '#d8b4fe' : '#9fd0ff';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.game.name.toLocaleUpperCase('tr'), 54, 68);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 58px system-ui, sans-serif';
    const prompt = this.state.prompt;
    const category = prompt?.title ?? this.game.category;
    ctx.fillText(category, 54, 126);

    if (this.game.mode === 'word' && prompt) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(54, 168, 138, 138, 22);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 92px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prompt.letter ?? '?', 123, 270);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 34px system-ui, sans-serif';
      wrapText(ctx, prompt.question, 224, 210, 700, 42);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.fillText('Cevabını sohbete yaz · doğru cevap yeşil yanar', 224, 320);
    } else if (prompt) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 42px system-ui, sans-serif';
      wrapText(ctx, prompt.question, 54, 194, 900, 46);
      if (prompt.options) {
        prompt.options.forEach((option, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = 54 + col * 460;
          const y = 332 + row * 78;
          const correct = prompt.reveal && prompt.answerIndex === index;
          ctx.fillStyle = correct ? 'rgba(34,160,107,0.55)' : 'rgba(255,255,255,0.10)';
          ctx.beginPath();
          ctx.roundRect(x, y, 430, 60, 14);
          ctx.fill();
          ctx.strokeStyle = correct ? '#7ee2b8' : 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = correct ? '#9af0ca' : '#9fd0ff';
          ctx.font = '800 24px system-ui, sans-serif';
          ctx.fillText(['A', 'B', 'C', 'D'][index]!, x + 18, y + 38);
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 22px system-ui, sans-serif';
          ctx.fillText(option.slice(0, 34), x + 54, y + 38);
        });
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('CANLI · sohbetten cevapla', w - 54, h - 34);
    this.screenTexture.needsUpdate = true;
  }

  private sync(): void {
    const state = this.state;
    if (!state) return;
    this.spawnActionEffect(state);
    if (this.game.mode === 'wheel' || this.game.mode === 'horse') return;
    if (this.game.mode === 'town') {
      this.syncTown(state);
      return;
    }
    if (this.game.mode === 'melon' || this.game.mode === 'gold') return;
    if (this.game.mode === 'press') {
      this.syncPressCards(state);
    } else if (this.game.mode === 'race') {
      this.syncKarts(state);
    } else {
      this.syncActors(state);
    }
    this.syncPodiums(state);
  }

  private syncActors(state: ArcadeStateView): void {
    const seen = new Set<string>();
    state.players.forEach((player, index) => {
      seen.add(player.id);
      let actor = this.actors.get(player.id);
      if (!actor) {
        actor = this.createActor(player);
        this.actors.set(player.id, actor);
        this.scene.add(actor.group);
      }
      actor.label.position.y = 2.55 + (index % 2) * 0.38;
      if (actor.labelText !== player.name) {
        actor.labelText = player.name;
        const old = actor.label.material.map;
        actor.label.material.map = makeTextTexture(player.name, player.color);
        actor.label.material.needsUpdate = true;
        old?.dispose();
      }
      if (actor.lastHp >= 0 && player.hp < actor.lastHp) {
        this.spawnHit(actor.group.position, player.color);
      }
      if (actor.lastHp !== player.hp) {
        paintBar(actor.barCanvas, actor.barTexture, player.color, player.hp);
        actor.lastHp = player.hp;
      }
      actor.bar.visible = this.game.mode === 'battle' && !player.eliminated;
      actor.group.visible = !player.eliminated || this.game.mode === 'battle';
      actor.label.visible = !player.eliminated;
      const action = state.lastAction;
      const shieldActive =
        this.game.key === 'manor' &&
        action?.playerId === player.id &&
        action.kind === 'gift' &&
        state.now - action.at < 900;
      actor.shield.visible = shieldActive;
      if (shieldActive) actor.shield.scale.setScalar(1 + Math.sin(state.now / 80) * 0.08);
      actor.group.scale.setScalar(actor.baseScale * (player.eliminated ? 0.6 : 1));
      if (player.eliminated) actor.group.rotation.z = Math.PI / 2;
      else actor.group.rotation.z = 0;
    });
    for (const [id, actor] of this.actors) {
      if (seen.has(id)) continue;
      this.scene.remove(actor.group);
      disposeObject(actor.group);
      this.actors.delete(id);
    }
  }

  private syncKarts(state: ArcadeStateView): void {
    const seen = new Set<string>();
    state.players.forEach((player, index) => {
      seen.add(player.id);
      let kart = this.karts.get(player.id);
      if (!kart) {
        kart = this.createKart(player);
        kart.label.position.y = 2.05 + (index % 2) * 0.38;
        this.karts.set(player.id, kart);
        this.scene.add(kart.group);
      }
      if (kart.labelText !== player.name) {
        kart.labelText = player.name;
        const old = kart.label.material.map;
        kart.label.material.map = makeTextTexture(player.name, player.color);
        kart.label.material.needsUpdate = true;
        old?.dispose();
      }
      kart.group.visible = true;
    });
    for (const [id, kart] of this.karts) {
      if (seen.has(id)) continue;
      this.scene.remove(kart.group);
      disposeObject(kart.group);
      this.karts.delete(id);
    }
  }

  private syncPressCards(state: ArcadeStateView): void {
    const seen = new Set<string>();
    state.players.forEach((player) => {
      seen.add(player.id);
      let card = this.cards.get(player.id);
      if (!card) {
        card = this.createPressCard(player);
        this.cards.set(player.id, card);
        this.scene.add(card.group);
      }
      if (card.lastName !== player.name || card.lastScore !== Math.round(player.score)) {
        this.paintPressCard(card, player);
        card.lastName = player.name;
        card.lastScore = Math.round(player.score);
      }
    });
    for (const [id, card] of this.cards) {
      if (seen.has(id)) continue;
      this.scene.remove(card.group);
      disposeObject(card.group);
      this.cards.delete(id);
    }
  }

  private syncPodiums(state: ArcadeStateView): void {
    if (this.podiums.length === 0) return;
    const prompt = state.prompt;
    this.podiums.forEach((podium, index) => {
      const material = podium.face.material as THREE.MeshStandardMaterial;
      const correct = prompt?.reveal && prompt.answerIndex === index;
      material.color.set(correct ? '#22a06b' : '#2563eb');
      material.emissive.set(correct ? '#22a06b' : '#2563eb');
      material.emissiveIntensity = correct ? 0.8 : prompt && !prompt.reveal ? 0.25 : 0.12;
      podium.group.rotation.y = Math.sin(Date.now() / 1800 + index) * 0.06;
    });
  }

  private createActor(player: ArcadePlayer): Actor {
    const group = new THREE.Group();
    const color =
      this.game.mode === 'tug'
        ? player.side === 'blue'
          ? '#2563eb'
          : '#dc2626'
        : this.game.mode === 'versus'
          ? player.side === 'boys'
            ? '#2563eb'
            : '#db2777'
          : player.color;
    const shadow = shadowMesh(0.42);
    group.add(shadow);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, this.game.key === 'stick' ? 0.68 : 0.42, 5, 10),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.05,
      }),
    );
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf2c7a5, roughness: 0.7 }),
    );
    head.position.y = 1.55;
    head.castShadow = true;
    group.add(head);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2228, roughness: 0.4 });
    for (const eyeX of [-0.075, 0.075]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), eyeMaterial);
      eye.position.set(eyeX, 1.59, 0.205);
      group.add(eye);
    }
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.012, 5, 12, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x9b4f58 }),
    );
    smile.position.set(0, 1.49, 0.21);
    smile.rotation.z = Math.PI;
    group.add(smile);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: this.game.mode === 'battle' ? '#3a2a1e' : '#2b2228',
        roughness: 0.8,
      }),
    );
    hair.position.y = 1.6;
    group.add(hair);

    const armGeometry = new THREE.CylinderGeometry(0.07, 0.075, 0.48, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.29, 1.05, 0);
    leftArm.rotation.z = 0.28;
    leftArm.castShadow = true;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.29, 1.05, 0);
    rightArm.rotation.z = -0.28;
    rightArm.castShadow = true;
    group.add(rightArm);

    const legGeometry = new THREE.CylinderGeometry(0.08, 0.085, 0.42, 8);
    const leftLeg = new THREE.Mesh(legGeometry, new THREE.MeshStandardMaterial({ color: 0x2e2633, roughness: 0.8 }));
    leftLeg.position.set(-0.12, 0.35, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.12;
    group.add(rightLeg);

    if (this.game.key === 'gladiator') {
      const helmet = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.32, 10),
        new THREE.MeshStandardMaterial({ color: 0xc8a45a, metalness: 0.55, roughness: 0.3 }),
      );
      helmet.position.y = 1.82;
      group.add(helmet);
      const sword = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.7, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xdfe5eb, metalness: 0.85, roughness: 0.2 }),
      );
      sword.position.set(0.46, 1.15, 0.1);
      sword.rotation.z = -0.2;
      group.add(sword);
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 }),
      );
      shield.rotation.z = Math.PI / 2;
      shield.position.set(-0.42, 1.04, 0.08);
      group.add(shield);
    }

    if (this.game.key === 'stick') {
      const stickHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.4 }),
      );
      stickHead.position.y = 1.5;
      group.add(stickHead);
      body.scale.set(0.65, 1, 0.65);
      head.visible = false;
      hair.visible = false;
    }

    if (this.game.mode === 'circle') {
      const robe = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.9, 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
      robe.position.y = 0.45;
      group.add(robe);
      body.visible = false;
      leftLeg.visible = false;
      rightLeg.visible = false;
    }

    if (this.game.mode === 'quiz' || this.game.mode === 'word') {
      group.scale.setScalar(0.7);
    }

    const label = addLabel(group, makeTextTexture(player.name, color), 2.62, 1.05);
    const { canvas, texture } = makeBarTexture(color);
    const barMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const bar = new THREE.Sprite(barMaterial);
    bar.scale.set(1.05, 0.14, 1);
    bar.position.y = 1.88;
    bar.visible = false;
    group.add(bar);

    const shield = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = 0.08;
    shield.visible = false;
    group.add(shield);

    return {
      group,
      shield,
      body,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      label,
      labelText: player.name,
      bar,
      barCanvas: canvas,
      barTexture: texture,
      lastHp: -1,
      lastScore: -1,
      baseScale: player.platform === 'twitch' ? 0.95 : 1,
      shadow,
    };
  }

  private createKart(player: ArcadePlayer): Kart {
    const hillMode = this.game.key === 'hill';
    const grandPrix = this.game.key === 'grandprix';
    const animalMode = this.game.key === 'animal';
    const crowdMode = this.game.key === 'crowd';
    const balloonMode = this.game.key === 'balloon';
    const group = new THREE.Group();
    const shadow = shadowMesh(0.55);
    group.add(shadow);
    const body = new THREE.Mesh(
      hillMode
        ? new THREE.BoxGeometry(1.25, 0.62, 1.72)
        : grandPrix
          ? new THREE.BoxGeometry(0.9, 0.3, 1.85)
          : animalMode
            ? new THREE.CapsuleGeometry(0.34, 0.85, 6, 10)
            : crowdMode
              ? new THREE.CapsuleGeometry(0.3, 0.7, 6, 10)
              : balloonMode
                ? new THREE.SphereGeometry(0.62, 18, 14)
                : new THREE.BoxGeometry(1.15, 0.46, 1.6),
      new THREE.MeshStandardMaterial({ color: player.color, roughness: 0.35, metalness: 0.15 }),
    );
    body.position.y = animalMode ? 0.72 : crowdMode ? 0.82 : balloonMode ? 1.25 : hillMode ? 0.5 : grandPrix ? 0.38 : 0.45;
    if (animalMode || crowdMode) body.rotation.z = Math.PI / 2;
    if (balloonMode) body.scale.set(1, 1.2, 1);
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(
      hillMode
        ? new THREE.BoxGeometry(0.78, 0.5, 0.82)
        : grandPrix
          ? new THREE.BoxGeometry(0.48, 0.25, 0.5)
          : animalMode
            ? new THREE.SphereGeometry(0.34, 14, 10)
            : crowdMode
              ? new THREE.SphereGeometry(0.28, 14, 10)
              : balloonMode
                ? new THREE.BoxGeometry(0.5, 0.36, 0.5)
                : new THREE.BoxGeometry(0.68, 0.38, 0.68),
      new THREE.MeshStandardMaterial({ color: animalMode ? player.color : hillMode ? player.color : 0xf8fafc, roughness: 0.25 }),
    );
    cabin.position.set(0, animalMode ? 0.9 : crowdMode ? 1.28 : balloonMode ? 0.5 : hillMode ? 0.84 : grandPrix ? 0.56 : 0.7, animalMode ? -0.8 : crowdMode ? -0.62 : 0.12);
    group.add(cabin);
    if (animalMode) {
      for (const [x, z] of [[-0.45, 0.45], [0.45, 0.45], [-0.45, -0.45], [0.45, -0.45]] as const) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), mat(0x3f2a1d));
        leg.position.set(x, 0.32, z);
        group.add(leg);
      }
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), mat(player.color));
      ear.position.set(0, 1.35, -0.9);
      group.add(ear);
    }
    if (crowdMode) {
      for (const x of [-0.32, 0.32]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.7, 8), mat(0x1f2937));
        leg.position.set(x, 0.35, 0);
        group.add(leg);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.55, 8), mat(player.color));
        arm.position.set(x * 1.8, 1.0, 0);
        arm.rotation.z = x > 0 ? -0.65 : 0.65;
        group.add(arm);
      }
    }
    if (grandPrix) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.32), new THREE.MeshStandardMaterial({ color: 0x2b2b33 }));
      wing.position.set(0, 0.5, 0.92);
      group.add(wing);
    }
    if (hillMode) {
      const rollBar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
      rollBar.position.set(0, 1.18, 0.28);
      group.add(rollBar);
    }
    const wheelGeometry = new THREE.CylinderGeometry(hillMode ? 0.26 : 0.19, hillMode ? 0.26 : 0.19, 0.12, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x23232b, roughness: 0.8 });
    const wheels: THREE.Mesh[] = [];
    for (const x of [-0.63, 0.63]) {
      for (const z of [-0.52, 0.52]) {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.26, z);
        group.add(wheel);
        wheels.push(wheel);
      }
    }
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.07, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.5 }),
    );
    spoiler.position.set(0, 0.72, 0.58);
    group.add(spoiler);
    const label = addLabel(group, makeTextTexture(player.name, player.color), 2.15, 0.95);
    return {
      group,
      body,
      label,
      labelText: player.name,
      wheels,
      lastProgress: -1,
    };
  }

  private createPressCard(player: ArcadePlayer): PressCard {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 1.58),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, side: THREE.DoubleSide }),
    );
    mesh.castShadow = true;
    group.add(mesh);
    const label = addLabel(group, makeTextTexture(player.name, player.color), 1.0, 0.6);
    label.visible = false;
    return {
      group,
      mesh,
      label,
      texture,
      canvas,
      lastName: '',
      lastScore: -1,
    };
  }

  private paintPressCard(card: PressCard, player: ArcadePlayer): void {
    const ctx = card.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 320);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 320, 22);
    ctx.fill();
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(128, 128, 58, 0, Math.PI * 2);
    ctx.fill();
    const initials = player.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toLocaleUpperCase('tr');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 128, 132);
    ctx.fillStyle = '#2b2a33';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(player.name.slice(0, 14), 128, 230);
    ctx.fillStyle = '#8a8794';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(`${Math.round(player.score)} baskı`, 128, 268);
    card.texture.needsUpdate = true;
  }

  private animate = (): void => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    const state = this.state;

    for (const fn of this.dynamic) fn(state ?? ({} as ArcadeStateView), time, dt);
    if (state) {
      this.animateActors(state, time, dt);
      this.animateKarts(state, time);
      this.animateHorses(state, time);
      this.animateCards(state, time);
    }
    this.updateActionEffects(time);
    this.animateCamera(time);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };


  private spawnActionEffect(state: ArcadeStateView): void {
    const action = state.lastAction;
    if (!action || action.id === this.lastActionEffectId) return;
    this.lastActionEffectId = action.id;
    const player = state.players.find((entry) => entry.id === action.playerId);
    if (!player) return;
    const actor = this.actors.get(player.id);
    const kart = this.karts.get(player.id);
    const origin = actor
      ? actor.group.position.clone().add(new THREE.Vector3(0, 1.3, 0))
      : kart
        ? kart.group.position.clone().add(new THREE.Vector3(0, 1.2, 0))
        : new THREE.Vector3(0, 2.4, 1);
    const color = new THREE.Color(player.color);
    const group = new THREE.Group();
    group.position.copy(origin);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 900;
    group.add(ring);
    const count = action.kind === 'gift' ? 12 : action.kind === 'like' ? 7 : 4;
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(action.kind === 'gift' ? 0.09 : 0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthTest: false }),
      );
      const angle = (index / count) * Math.PI * 2;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * (0.7 + Math.random() * 0.8),
        0.9 + Math.random() * 1.1,
        Math.sin(angle) * (0.7 + Math.random() * 0.8),
      );
      particle.renderOrder = 901;
      group.add(particle);
    }
    this.scene.add(group);
    this.actionEffects.push({ group, born: this.clock.elapsedTime, life: action.kind === 'gift' ? 1.15 : 0.8 });
  }

  private updateActionEffects(time: number): void {
    for (let index = this.actionEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.actionEffects[index]!;
      const age = time - effect.born;
      if (age >= effect.life) {
        this.scene.remove(effect.group);
        disposeObject(effect.group);
        this.actionEffects.splice(index, 1);
        continue;
      }
      const ratio = age / effect.life;
      effect.group.children.forEach((child, childIndex) => {
        if (childIndex === 0) {
          const ring = child as THREE.Mesh;
          ring.scale.setScalar(1 + ratio * 2.5);
          (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - ratio);
        } else {
          const particle = child as THREE.Mesh;
          const velocity = particle.userData.velocity as THREE.Vector3;
          particle.position.addScaledVector(velocity, 0.025);
          velocity.y -= 0.045;
          (particle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - ratio);
        }
      });
    }
  }

  private animateCamera(time: number): void {
    if (this.game.mode === 'race') return;
    if (this.game.mode === 'tug') {
      this.camera.position.x = this.baseCamera.x + this.lookTarget.x * 0.45 + Math.sin(time * 0.3) * 0.08;
      this.camera.position.y = this.baseCamera.y + Math.sin(time * 0.4) * 0.06;
      this.camera.position.z = this.baseCamera.z;
      this.camera.lookAt(this.lookTarget);
      return;
    }
    if (this.game.mode === 'versus') {
      this.camera.position.x = this.baseCamera.x + this.lookTarget.x * 0.35 + Math.sin(time * 0.25) * 0.06;
      this.camera.position.y = this.baseCamera.y + Math.sin(time * 0.35) * 0.05;
      this.camera.position.z = this.baseCamera.z;
      this.camera.lookAt(this.lookTarget);
      return;
    }
    if (this.game.mode === 'horse') {
      this.camera.position.x = this.baseCamera.x + Math.sin(time * 0.18) * 0.18;
      this.camera.position.y = this.baseCamera.y + Math.sin(time * 0.24) * 0.1;
      this.camera.position.z = this.baseCamera.z;
      this.camera.lookAt(this.lookTarget);
      return;
    }
    this.camera.position.x = this.baseCamera.x + Math.sin(time * 0.12) * 0.35;
    this.camera.position.y = this.baseCamera.y + Math.sin(time * 0.18) * 0.12;
    this.camera.position.z = this.baseCamera.z;
    this.camera.lookAt(this.lookTarget);
  }

  private animateActors(state: ArcadeStateView, time: number, _dt: number): void {
    const players = state.players;
    if (players.length === 0) return;
    const mode = this.game.mode;

    players.forEach((player, index) => {
      const actor = this.actors.get(player.id);
      if (!actor) return;
      if (mode === 'dance') {
        const culturalDance = ['horon', 'sira', 'latina', 'concert', 'ramwong'].includes(this.game.key);
        let x: number;
        let z: number;
        if (culturalDance) {
          const angle = (index / Math.max(1, players.length)) * Math.PI * 2;
          x = Math.cos(angle) * 2.25;
          z = Math.sin(angle) * 1.75 + 1.1;
        } else {
          const row = index % 2;
          const rowIndex = Math.floor(index / 2);
          const rowCount = row === 0 ? Math.ceil(players.length / 2) : Math.floor(players.length / 2);
          x = (rowIndex - (rowCount - 1) / 2) * 1.35;
          z = row === 0 ? 1.9 : 0.55;
        }
        actor.group.position.set(x, 0.1 + Math.abs(Math.sin(time * 2.1 + index)) * 0.18, z);
        actor.group.rotation.y = Math.sin(time * 0.9 + index) * 0.22;
        actor.leftArm.rotation.z = 1.15 + Math.sin(time * 4 + index) * 0.55;
        actor.rightArm.rotation.z = -1.15 - Math.sin(time * 4 + index + 1) * 0.55;
        actor.body.rotation.z = Math.sin(time * 2.2 + index) * 0.07;
        actor.head.position.y = 1.55 + Math.sin(time * 2 + index) * 0.025;
      } else if (mode === 'circle') {
        const ring = index % 2;
        const perRing = Math.ceil(players.length / 2);
        const angle = (index / perRing) * Math.PI * 2 + time * (0.16 - ring * 0.03);
        const radius = 2.15 + ring * 0.95;
        actor.group.position.set(
          Math.cos(angle) * radius,
          0.12,
          Math.sin(angle) * radius,
        );
        actor.group.rotation.y = -angle + Math.PI / 2;
        actor.leftArm.rotation.z = 0.3;
        actor.rightArm.rotation.z = -0.3;
        actor.body.rotation.z = Math.sin(time * 1.6 + index) * 0.04;
      } else if (mode === 'battle') {
        const angle = (index / players.length) * Math.PI * 2;
        const radius = 3.15 + (index % 2) * 0.28;
        const lunge = player.hp < 30 ? 0.2 : 0;
        actor.group.position.set(
          Math.cos(angle) * (radius - lunge),
          0.1,
          Math.sin(angle) * (radius - lunge),
        );
        actor.group.rotation.y = -angle + Math.PI / 2;
        actor.leftArm.rotation.z = 0.8 + Math.sin(time * 3 + index) * 0.35;
        actor.rightArm.rotation.z = -0.8 - Math.sin(time * 3.4 + index) * 0.5;
        actor.group.rotation.z = player.eliminated ? Math.PI / 2 : Math.sin(time * 2 + index) * 0.035;
        if (player.hp < actor.lastHp && actor.lastHp >= 0) {
          this.spawnHit(actor.group.position, player.color);
        }
      } else if (mode === 'versus') {
        const side = player.side === 'boys' ? 'boys' : 'girls';
        const team = players.filter((entry) => (entry.side === 'boys' ? 'boys' : 'girls') === side);
        const order = Math.max(0, team.findIndex((entry) => entry.id === player.id));
        const push = state.wall?.position ?? 0;
        const baseX = side === 'girls' ? -2.9 : 2.9;
        const x = baseX - push * 1.9 + (order % 2 === 0 ? -0.16 : 0.16);
        const z = (order - (team.length - 1) / 2) * 1.02;
        actor.group.position.set(x, 0.1, z);
        actor.group.rotation.y = side === 'girls' ? Math.PI / 2 : -Math.PI / 2;
        actor.group.rotation.z = (side === 'girls' ? -0.16 : 0.16) + Math.sin(time * 2.6 + order) * 0.025;
        actor.leftArm.rotation.z = 1.2 + Math.sin(time * 3 + order) * 0.15;
        actor.rightArm.rotation.z = -1.2 - Math.sin(time * 3 + order) * 0.15;
        actor.body.rotation.x = side === 'girls' ? -0.1 : 0.1;
      } else if (mode === 'tug') {
        const side = player.side ?? (index % 2 === 0 ? 'red' : 'blue');
        const team = players.filter((entry) => (entry.side ?? 'red') === side);
        const order = Math.max(0, team.findIndex((entry) => entry.id === player.id));
        const pull = state.tug?.position ?? 0;
        const baseX = side === 'red' ? -2.55 : 2.55;
        const x = baseX + pull * 1.65 + (order % 2 === 0 ? -0.18 : 0.18);
        const z = (order - (team.length - 1) / 2) * 1.02;
        actor.group.position.set(x, 0.1, z);
        actor.group.rotation.y = side === 'red' ? Math.PI / 2 : -Math.PI / 2;
        actor.group.rotation.z = (side === 'red' ? 0.16 : -0.16) + Math.sin(time * 2.4 + order) * 0.02;
        actor.leftArm.rotation.z = 1.15 + Math.sin(time * 3 + order) * 0.18;
        actor.rightArm.rotation.z = -1.15 - Math.sin(time * 3 + order) * 0.18;
        actor.body.rotation.x = side === 'red' ? 0.12 : -0.12;
      } else {
        // quiz / word: yarışmacılar sahnenin arkasında izleyici olarak durur.
        const angle = -Math.PI * 0.85 + (index / Math.max(1, players.length - 1)) * Math.PI * 1.7;
        const radius = 4.6;
        actor.group.position.set(
          Math.cos(angle) * radius,
          0.12 + (index % 2) * 0.16,
          Math.sin(angle) * radius - 1.1,
        );
        actor.group.rotation.y = -angle - Math.PI / 2;
        actor.group.scale.setScalar(actor.baseScale * 0.56);
        actor.leftArm.rotation.z = 0.2;
        actor.rightArm.rotation.z = -0.2;
        actor.body.rotation.z = Math.sin(time * 1.4 + index) * 0.03;
      }
    });
  }

  private animateKarts(state: ArcadeStateView, time: number): void {
    const players = state.players;
    const count = Math.max(1, players.length);
    players.forEach((player, index) => {
      const kart = this.karts.get(player.id);
      if (!kart) return;
      const lane = index % 5;
      const laneX = -5.2 + lane * 2.6;
      const rowOffset = Math.floor(index / 5) * 0.9;
      const x = laneX + Math.sin(time * 2 + index) * 0.05;
      const z = 7.6 - (player.progress / 100) * 21.5 - rowOffset;
      kart.group.position.set(x, 0.12, z);
      kart.group.rotation.y = Math.PI;
      const speed = Math.max(0.04, player.progress - kart.lastProgress);
      kart.wheels.forEach((wheel) => {
        wheel.rotation.x += speed * 0.45;
      });
      kart.body.rotation.z = Math.sin(time * 10 + index) * 0.012;
      kart.lastProgress = player.progress;
    });
  }

  private animateCards(state: ArcadeStateView, time: number): void {
    if (this.game.mode !== 'press') return;
    const players = [...state.players].sort((a, b) => b.score - a.score).slice(0, 8);
    players.forEach((player, index) => {
      const card = this.cards.get(player.id);
      if (!card) return;
      const column = index % 4;
      const row = Math.floor(index / 4);
      card.group.position.set(-2.4 + column * 1.65, 1.22 + row * 1.72, -1.2 + row * 0.2);
      card.group.rotation.y = -0.12 + column * 0.08;
      card.group.rotation.z = Math.sin(time * 1.2 + index) * 0.02;
      card.mesh.rotation.z = Math.sin(time * 1.4 + index) * 0.015;
      card.mesh.position.y = Math.sin(time * 1.6 + index) * 0.025;
    });
  }

  private spawnConfetti(): void {
    const colors = [0xe0558f, 0x2563eb, 0x0f8a72, 0xd97706, 0x7c3aed, 0xf6c453];
    const pieces: THREE.Mesh[] = [];
    for (let index = 0; index < 90; index += 1) {
      const piece = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.12, 0.03),
        new THREE.MeshBasicMaterial({ color: colors[index % colors.length]! }),
      );
      piece.position.set((Math.random() - 0.5) * 6, 5 + Math.random() * 3, (Math.random() - 0.5) * 4);
      piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.scene.add(piece);
      pieces.push(piece);
    }
    const started = performance.now();
    const fall = () => {
      if (this.disposed) return;
      const progress = Math.min(1, (performance.now() - started) / 3400);
      for (const piece of pieces) {
        piece.position.y -= 0.06;
        piece.position.x += Math.sin(progress * 10 + piece.id) * 0.006;
        piece.rotation.x += 0.05;
        piece.rotation.z += 0.04;
      }
      if (progress < 1) requestAnimationFrame(fall);
      else {
        pieces.forEach((piece) => {
          this.scene.remove(piece);
          piece.geometry.dispose();
          (piece.material as THREE.Material).dispose();
        });
      }
    };
    fall();
  }

  private spawnHit(position: THREE.Vector3, color: string): void {
    const geometry = new THREE.RingGeometry(0.1, 0.16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position).add(new THREE.Vector3(0, 1.1, 0));
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    const born = performance.now();
    const animateRing = () => {
      if (this.disposed) return;
      const progress = Math.min(1, (performance.now() - born) / 480);
      ring.scale.setScalar(1 + progress * 5);
      material.opacity = 0.9 * (1 - progress);
      if (progress < 1) requestAnimationFrame(animateRing);
      else {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
      }
    };
    animateRing();
  }
}
