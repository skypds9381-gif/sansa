import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type TemplePose = "meditate" | "prayer" | "bow";
export type TempleLantern = { id: number; wish: string; left: number };
export type TempleHall = "main" | "pureLand" | "mountain";
export type TempleTimePeriod = "dawn" | "day" | "sunset" | "night";
export type TempleProfile = {
  gender: "male" | "female";
  name: string;
  robeColor: "gray" | "ink" | "ochre" | "orange";
  vow: "quiet" | "healing" | "family" | "wish";
};

export type CameraPreset = "monk" | "hall" | "altar";
export type BuddhaScaleMode = "normal" | "grand3x";
export type CompanionPractitioner = {
  id: string;
  seatIndex: number;
  gender: "male" | "female";
  name: string;
  robeColor: "gray" | "ink" | "ochre" | "orange";
  vow: "quiet" | "healing" | "family" | "wish";
};

type Props = {
  companions: CompanionPractitioner[];
  friendSeats?: number[];
  ownSeat: number | null;
  pose: TemplePose;
  bowSequence: number;
  meritSequence: number;
  profile: TempleProfile | null;
  hall: TempleHall;
  timePeriod: TempleTimePeriod;
  wishLanterns: TempleLantern[];
  onSeatSelect: (seat: number | null) => void;
  cameraPreset?: CameraPreset;
  zoomAction?: { id: number; type: "in" | "out" | "reset" } | null;
  candleSequence?: number;
  incenseSequence?: number;
  buddhaScale?: BuddhaScaleMode;
};

type SceneTheme = {
  buddhaEnsemble: THREE.Group;
  roomGroup: THREE.Group;
  forestGroup: THREE.Group;
  seatGroup: THREE.Group;
  altarGroup: THREE.Group;
  forestFloor: THREE.Mesh;
  raycastFloor: THREE.Mesh;
  hemisphere: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  altarGlow: THREE.PointLight;
  statueGold: THREE.MeshStandardMaterial;
  statueLight: THREE.MeshStandardMaterial;
  haloMaterial: THREE.MeshBasicMaterial;
  haloInnerMaterial: THREE.MeshBasicMaterial;
  floorMaterial: THREE.MeshStandardMaterial;
  woodMaterials: THREE.MeshStandardMaterial[];
  seatMaterials: THREE.MeshStandardMaterial[];
  forestMaterials: THREE.MeshStandardMaterial[];
  aisleCandles: THREE.PointLight[];
  smokePuffs: THREE.Mesh[];
};

type MonkRig = {
  root: THREE.Group;
  upperBody: THREE.Group;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftHandGroup: THREE.Group;
  rightHandGroup: THREE.Group;
  standingLegsGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  seatedGroup: THREE.Group;
  kneelingGroup: THREE.Group;
  leftKnee: THREE.Mesh;
  rightKnee: THREE.Mesh;
  lap: THREE.Mesh;
  offeringCandleGroup: THREE.Group;
  offeringIncenseGroup: THREE.Group;
  robeMaterial: THREE.MeshStandardMaterial;
  robeShadowMaterial: THREE.MeshStandardMaterial;
  maleHairGroup: THREE.Group;
  femaleHairGroup: THREE.Group;
  nameTag: THREE.Sprite;
  isSeated: boolean;
};

type CandleOfferingState = "idle" | "walkingToAltar" | "lightingCandle" | "returningToSeat";
type IncenseOfferingState = "idle" | "walkingToAltar" | "lightingIncense" | "returningToSeat";

type SceneApi = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
  floor: THREE.Mesh;
  seatMeshes: THREE.Object3D[];
  seatPositions: THREE.Vector3[];
  self: MonkRig;
  friends: MonkRig[];
  target: THREE.Vector3;
  targetSeat: number | null;
  lastSyncedSeat: number | null;
  ignoreNextNullSync: boolean;
  selectedGlow: THREE.Mesh;
  wishGroup: THREE.Group;
  wishRibbons: THREE.Mesh[];
  candleLights: THREE.PointLight[];
  candleFlames: THREE.Mesh[];
  theme: SceneTheme;
  profileSignature: string;
  moktakGroup: THREE.Group;
  moktakMallet: THREE.Group;
  meritWave: THREE.Mesh;
  meritStartedAt: number;
  lastMeritSequence: number;
  hall: TempleHall;
  timePeriod: TempleTimePeriod;
  bowStartedAt: number;
  lastBowSequence: number;
  pendingBow: boolean;
  candleFlareStartedAt: number;
  lastCandleSequence: number;
  candleOfferingState: CandleOfferingState;
  candleOfferingStartTime: number;
  candleOfferingReturnPos: THREE.Vector3;
  candleOfferingFlared: boolean;
  lastIncenseSequence: number;
  incenseOfferingState: IncenseOfferingState;
  incenseOfferingStartTime: number;
  incenseOfferingReturnPos: THREE.Vector3;
  incenseOfferingFlared: boolean;
  incenseFlareStartedAt: number;
};

const seatColumns = 4;
const seatRows = 5;
const seatX = [-3.15, -1.05, 1.05, 3.15];
const seatZ = [-1.25, 0.25, 1.75, 3.25, 4.75];

function makeMaterial(color: number, roughness = 0.8, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function addMesh<T extends THREE.BufferGeometry>(
  parent: THREE.Object3D,
  geometry: T,
  material: THREE.Material,
  position: THREE.Vector3,
  castShadow = false,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  if (castShadow) {
    mesh.castShadow = true;
  }
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  return addMesh(parent, new THREE.BoxGeometry(width, height, depth), material, new THREE.Vector3(x, y, z));
}

function addCylinder(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radialSegments = 20,
) {
  return addMesh(parent, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material, new THREE.Vector3(x, y, z));
}

function addWoodColumn(scene: THREE.Object3D, x: number, z: number, wood: THREE.Material, red: THREE.Material, green: THREE.Material, gold: THREE.Material) {
  addCylinder(scene, 0.17, 0.21, 4.8, red, x, 2.42, z, 18);
  addCylinder(scene, 0.205, 0.205, 0.12, gold, x, 4.76, z, 18);
  addCylinder(scene, 0.23, 0.23, 0.22, green, x, 4.9, z, 18);
  addCylinder(scene, 0.29, 0.29, 0.14, red, x, 5.08, z, 18);
  addCylinder(scene, 0.29, 0.34, 0.22, wood, x, 0.13, z, 18);
}

function addPineTree(parent: THREE.Object3D, x: number, z: number, scale: number, trunk: THREE.Material, pine: THREE.MeshStandardMaterial[]) {
  addCylinder(parent, 0.1 * scale, 0.17 * scale, 2.4 * scale, trunk, x, 1.1 * scale, z, 10);
  for (let tier = 0; tier < 4; tier += 1) {
    const height = 1.65 * scale;
    const radius = (1.05 - tier * 0.16) * scale;
    const crown = addMesh(parent, new THREE.ConeGeometry(radius, height, 9), pine[tier % pine.length], new THREE.Vector3(x, (2.05 + tier * 0.88) * scale, z));
    crown.castShadow = true;
  }
}

function createMoktak(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.position.set(-2.35, 0, 4.65);
  scene.add(group);
  const wood = makeMaterial(0x754327, 0.38, { metalness: 0.12 });
  const darkWood = makeMaterial(0x291913, 0.45);
  const gold = makeMaterial(0xe0b75f, 0.42, { metalness: 0.5 });
  const body = addMesh(group, new THREE.SphereGeometry(0.34, 24, 16), wood, new THREE.Vector3(0, 0.31, 0));
  body.scale.set(1.05, 0.68, 0.82);
  const rim = addMesh(group, new THREE.TorusGeometry(0.105, 0.018, 8, 24), darkWood, new THREE.Vector3(0, 0.38, 0.275));
  rim.scale.set(1.15, 0.72, 0.4);
  const centerMark = addMesh(group, new THREE.SphereGeometry(0.035, 10, 8), gold, new THREE.Vector3(0, 0.54, 0.2));
  centerMark.scale.set(1, 0.42, 0.5);

  const mallet = new THREE.Group();
  mallet.position.set(0.37, 0.68, 0.03);
  group.add(mallet);
  const handle = addCylinder(mallet, 0.027, 0.034, 0.4, wood, 0, -0.19, 0, 10);
  handle.castShadow = true;
  const head = addMesh(mallet, new THREE.SphereGeometry(0.085, 12, 10), wood, new THREE.Vector3(0, -0.4, 0));
  head.scale.set(1, 0.8, 1.15);

  const wave = addMesh(
    scene,
    new THREE.TorusGeometry(0.36, 0.025, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd675, transparent: true, opacity: 0, depthWrite: false }),
    new THREE.Vector3(-2.35, 0.045, 4.65),
  );
  wave.rotation.x = -Math.PI / 2;
  wave.visible = false;
  return { group, mallet, wave };
}

function createTemple(world: THREE.Scene, seatMeshes: THREE.Object3D[], seatPositions: THREE.Vector3[], candleLights: THREE.PointLight[], candleFlames: THREE.Mesh[]) {
  const roomGroup = new THREE.Group();
  const seatGroup = new THREE.Group();
  const forestGroup = new THREE.Group();
  const altarGroup = new THREE.Group();
  world.add(roomGroup, seatGroup, forestGroup);
  roomGroup.add(altarGroup);
  const scene = roomGroup;
  const wood = makeMaterial(0x4b2b1d);
  const woodLight = makeMaterial(0x7b4930);
  const darkWood = makeMaterial(0x2d1d17);
  const red = makeMaterial(0x8c3328);
  const green = makeMaterial(0x1f5141);
  const gold = makeMaterial(0xd0a44c, 0.42, { metalness: 0.65 });
  const floor = makeMaterial(0x805638, 0.42);
  const plankLine = makeMaterial(0x4a2d20);
  const wall = makeMaterial(0x40291f);
  const wallPanel = makeMaterial(0x63402b);

  world.background = new THREE.Color(0x1b1715);
  world.fog = new THREE.Fog(0x1b1715, 16, 29);
  const hemisphere = new THREE.HemisphereLight(0xffe6bd, 0x33231a, 1.25);
  world.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xffedcf, 0.62);
  world.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffd99b, 2.3);
  keyLight.position.set(-4, 8, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -9;
  keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -8;
  world.add(keyLight);

  const floorMesh = addMesh(scene, new THREE.PlaneGeometry(11, 28), floor, new THREE.Vector3(0, 0, 6.5));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  for (let row = 0; row <= 56; row += 1) {
    addBox(scene, 11, 0.018, 0.025, plankLine, 0, 0.014, -7 + row * 0.48);
  }
  for (let column = 0; column < 8; column += 1) {
    const seam = addBox(scene, 0.018, 0.018, 28, plankLine, -4.8 + column * 1.37, 0.014, 6.5);
    seam.material = plankLine;
  }

  const forestGround = makeMaterial(0x29372d, 0.98);
  const rockMaterial = makeMaterial(0x565c52, 0.95);
  const mossMaterial = makeMaterial(0x334638, 0.96);
  const pineMaterials = [
    makeMaterial(0x143c31, 0.94),
    makeMaterial(0x1b4a36, 0.94),
    makeMaterial(0x20533a, 0.94),
  ];
  const trunkMaterial = makeMaterial(0x493326, 0.96);
  const forestFloor = addMesh(forestGroup, new THREE.PlaneGeometry(11, 28), forestGround, new THREE.Vector3(0, -0.035, 6.5));
  forestFloor.rotation.x = -Math.PI / 2;
  const forestLine = makeMaterial(0x1d2c24, 1);
  for (let row = 0; row <= 56; row += 1) {
    addBox(forestGroup, 11, 0.025, 0.035, forestLine, 0, -0.018, -7 + row * 0.48);
  }
  for (const x of [-4.85, 4.85]) {
    for (const z of [-5.8, -2.6, 0.8, 4.3, 7.8, 11.3, 14.8, 18.1]) {
      addPineTree(forestGroup, x, z, z > 14 ? 1.05 : 0.78 + ((Math.round(z * 10) % 3) * 0.08), trunkMaterial, pineMaterials);
    }
  }
  for (const [x, z, size] of [[-4.25, -5.3, 0.82], [4.1, -3.2, 0.95], [-4.4, 1.1, 0.72], [4.25, 4.6, 0.82], [-4.3, 8.3, 0.9], [4.2, 12.5, 0.76], [-3.9, 16.8, 1.1]] as const) {
    const boulder = addMesh(forestGroup, new THREE.DodecahedronGeometry(size, 1), rockMaterial, new THREE.Vector3(x, size * 0.45, z));
    boulder.scale.set(1.25, 0.72, 0.86);
    boulder.rotation.set(0.08, size, -0.12);
    addMesh(forestGroup, new THREE.DodecahedronGeometry(size * 0.52, 0), mossMaterial, new THREE.Vector3(x - 0.16, size * 0.75, z + 0.04));
  }

  for (const x of [-5.3, 5.3]) {
    addBox(scene, 0.18, 1.2, 28, wall, x, 0.6, 6.5);
    addBox(scene, 0.22, 0.14, 28, red, x, 1.26, 6.5);
    addBox(scene, 0.16, 0.075, 28, gold, x, 1.38, 6.5);
    addBox(scene, 0.12, 0.12, 28, wood, x, 4.85, 6.5);
    for (let z = -6.2; z <= 19.8; z += 1.15) {
      addBox(scene, 0.1, 3.35, 0.09, woodLight, x, 3.05, z);
    }
  }
  addBox(scene, 10.6, 5.6, 0.25, wall, 0, 2.8, -6.45);
  for (const x of [-4.7, 4.7]) {
    for (const z of [-5.1, -1.3, 2.5, 6.3, 10.1, 13.9, 17.7]) addWoodColumn(scene, x, z, woodLight, red, green, gold);
  }

  for (let panel = 0; panel < 5; panel += 1) {
    const x = -4.2 + panel * 2.1;
    addBox(scene, 1.7, 1.25, 0.09, wallPanel, x, 2.7, -6.27);
    addBox(scene, 0.045, 1.5, 0.12, gold, x - 0.86, 2.7, -6.18);
    addBox(scene, 0.045, 1.5, 0.12, gold, x + 0.86, 2.7, -6.18);
    for (let line = 0; line < 4; line += 1) {
      addBox(scene, 0.025, 1.1, 0.05, woodLight, x - 0.55 + line * 0.36, 2.7, -6.17);
    }
  }
  addBox(scene, 10.5, 0.16, 0.28, red, 0, 5.74, 4.75);
  addBox(scene, 10.6, 0.1, 0.26, green, 0, 5.88, 4.65);
  addBox(scene, 10.55, 0.035, 0.3, gold, 0, 5.64, 4.72);
  addBox(scene, 10.6, 0.4, 0.5, darkWood, 0, 5.75, -5.85);
  addBox(scene, 10.7, 0.26, 28, darkWood, 0, 6.12, 6.5);
  for (let rafter = 0; rafter < 25; rafter += 1) {
    const x = -5 + rafter * (10 / 24);
    const beam = addBox(scene, 0.12, 0.17, 28, rafter % 3 === 0 ? red : woodLight, x, 5.82, 6.5);
    beam.rotation.x = -0.045;
    addBox(scene, 0.18, 0.11, 0.24, rafter % 2 === 0 ? green : gold, x, 5.7, 19.9);
  }
  for (let crossbeam = 0; crossbeam < 8; crossbeam += 1) {
    const z = -4.8 + crossbeam * 3.15;
    addBox(scene, 10.3, 0.2, 0.23, crossbeam % 2 === 0 ? red : green, 0, 5.63, z);
    addBox(scene, 10.35, 0.055, 0.27, gold, 0, 5.5, z);
  }

  // --- Grand Altar & 3x Buddha Statue (수미단 & 대형 부처님 존상) ---
  const stage = makeMaterial(0x603a25);
  // Broad, majestic ceremonial altar stage
  addBox(altarGroup, 7.8, 0.38, 2.8, stage, 0, 0.19, -5.0);
  addBox(altarGroup, 7.4, 0.08, 2.6, gold, 0, 0.42, -5.0);
  addBox(altarGroup, 7.9, 0.06, 2.85, darkWood, 0, 0.03, -5.0);

  // Grand multi-tiered lotus pedestal (수미단 연화대좌)
  const pedestal = makeMaterial(0xc08d38, 0.38, { metalness: 0.58 });
  addCylinder(altarGroup, 2.2, 2.65, 0.36, pedestal, 0, 0.62, -5.1, 36);
  addCylinder(altarGroup, 1.85, 2.2, 0.28, gold, 0, 0.92, -5.1, 36);

  // Sculpted golden lotus petals encircling the pedestal
  const petalMat = makeMaterial(0xdaa53f, 0.35, { metalness: 0.5 });
  for (let p = 0; p < 18; p += 1) {
    const angle = (p / 18) * Math.PI * 2;
    const px = Math.sin(angle) * 2.12;
    const pz = -5.1 + Math.cos(angle) * 2.12;
    const petal = addMesh(altarGroup, new THREE.ConeGeometry(0.3, 0.55, 6), petalMat, new THREE.Vector3(px, 0.96, pz));
    petal.rotation.y = angle;
    petal.rotation.x = 0.35;
  }

  // --- Authentic Korean Joseon Amitabha Buddha Statue (금동 아미타여래좌상 - 사용자 제공 사진 정밀 고증) ---
  const statueGold = makeMaterial(0xdfaf3e, 0.30, { metalness: 0.54, emissive: 0x422606, emissiveIntensity: 0.22 });
  const statueGoldShine = makeMaterial(0xf4ce64, 0.22, { metalness: 0.64 });
  const statueGoldShadow = makeMaterial(0xa67022, 0.44, { metalness: 0.44 });
  const statueAccent = statueGoldShine;
  const statueLight = statueGoldShine;
  const statueDarkBronze = makeMaterial(0x2a221b, 0.75, { metalness: 0.26 });
  const urnaWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.95 });
  const cintamaniRed = makeMaterial(0xb45309, 0.2, { metalness: 0.45, emissive: 0x78350f, emissiveIntensity: 0.35 });
  const lipTone = makeMaterial(0xa6523a, 0.40, { metalness: 0.38 });
  const eyeMaterial = makeMaterial(0x291d14, 0.65, { metalness: 0.4 });

  const buddhaEnsemble = new THREE.Group();
  // Base rests on top of the su-mi-dan lotus pedestal (y = 1.05, z = -5.12)
  buddhaEnsemble.position.set(0, 1.05, -5.12);
  buddhaEnsemble.scale.set(1.68, 1.68, 1.68);
  altarGroup.add(buddhaEnsemble);

  const buddha = new THREE.Group();
  buddha.position.set(0, 0, 0);
  buddhaEnsemble.add(buddha);

  // 1. Full Lotus Cross-Legged Base & Flowing Kasaya Folds (결가부좌, 結跏趺坐 & 군의 자락)
  // Main lap mass
  const lotusLap = addMesh(buddha, new THREE.SphereGeometry(0.78, 32, 22), statueGold, new THREE.Vector3(0, 0.26, 0.04));
  lotusLap.scale.set(1.36, 0.36, 0.88);

  // Left & right knees extending wide and stable
  for (const [side, kneeX] of [[-1, -0.72], [1, 0.72]] as const) {
    const knee = addMesh(buddha, new THREE.SphereGeometry(0.36, 22, 16), statueGold, new THREE.Vector3(kneeX, 0.24, 0.16));
    knee.scale.set(1.18, 0.58, 1.38);
    knee.rotation.y = side * 0.32;
  }

  // Heavy, stylized horizontal U-shaped drapery folds across the shins (사진 속 깊은 옷주름)
  for (let f = 0; f < 4; f += 1) {
    const foldZ = 0.26 + f * 0.085;
    const foldY = 0.33 - f * 0.052;
    const foldRadiusX = 0.52 - f * 0.038;
    const foldMesh = addMesh(
      buddha,
      new THREE.TorusGeometry(foldRadiusX, 0.024, 8, 32, Math.PI * 0.8),
      statueGoldShine,
      new THREE.Vector3(0, foldY, foldZ)
    );
    foldMesh.rotation.x = Math.PI * 0.52;
    foldMesh.rotation.z = Math.PI * 0.1;
    foldMesh.scale.set(1.2, 0.6, 1);
  }

  // Lower hem pooling in front over the pedestal
  const robeHem = addMesh(buddha, new THREE.CylinderGeometry(0.75, 0.88, 0.14, 28), statueGoldShadow, new THREE.Vector3(0, 0.07, 0.08));
  robeHem.scale.set(1.35, 0.9, 0.78);

  // 2. Majestic Torso & Outer Robe (통견의, 通肩衣 - 양 어깨를 모두 덮는 유려한 대의)
  const torso = addMesh(buddha, new THREE.CylinderGeometry(0.36, 0.64, 0.92, 32), statueGold, new THREE.Vector3(0, 0.84, 0.01));
  torso.scale.set(1.12, 1, 0.84);

  // Both shoulders covered in graceful golden robe (통견)
  for (const [side, shX] of [[-1, -0.48], [1, 0.48]] as const) {
    const shoulder = addMesh(buddha, new THREE.SphereGeometry(0.24, 18, 14), statueGold, new THREE.Vector3(shX, 1.15, 0.02));
    shoulder.scale.set(0.96, 1.05, 0.96);
  }

  // Outer robe collar lapels framing the V-neck chest
  for (const [side, lapelX] of [[-1, -0.22], [1, 0.22]] as const) {
    const lapel = addMesh(
      buddha,
      new THREE.CylinderGeometry(0.032, 0.045, 0.56, 12),
      statueGoldShine,
      new THREE.Vector3(lapelX, 0.96, 0.28)
    );
    lapel.rotation.z = side * -0.38;
    lapel.rotation.x = 0.22;
  }

  // Inner Undergarment (승각기, 僧脚崎) across upper abdomen
  const innerChestBand = addMesh(
    buddha,
    new THREE.BoxGeometry(0.44, 0.08, 0.05),
    statueGoldShine,
    new THREE.Vector3(0, 0.82, 0.31)
  );
  innerChestBand.rotation.x = 0.12;

  // Traditional ribbon tie / knot on inner garment (승각기 나비 매듭과 주름)
  addMesh(
    buddha,
    new THREE.SphereGeometry(0.038, 12, 10),
    statueGoldShine,
    new THREE.Vector3(0, 0.74, 0.33)
  );
  for (const side of [-1, 1]) {
    const loop = addMesh(
      buddha,
      new THREE.TorusGeometry(0.042, 0.012, 8, 16),
      statueGoldShine,
      new THREE.Vector3(side * 0.065, 0.74, 0.335)
    );
    loop.rotation.z = side * 0.35;
    loop.rotation.y = side * 0.2;

    const streamer = addMesh(
      buddha,
      new THREE.CylinderGeometry(0.012, 0.018, 0.14, 8),
      statueGoldShine,
      new THREE.Vector3(side * 0.042, 0.65, 0.34)
    );
    streamer.rotation.z = side * 0.18;
  }
  const chestPleat = addMesh(
    buddha,
    new THREE.TorusGeometry(0.12, 0.014, 8, 24, Math.PI),
    statueGoldShadow,
    new THREE.Vector3(0, 0.72, 0.325)
  );
  chestPleat.rotation.x = Math.PI * 0.95;

  // 3. Right Hand: Raised Amitabha Mudra (오른손 아미타인 / 설법인 - 가슴 높이로 들어 엄지와 중지를 맞댐)
  const rightUpperArm = addMesh(buddha, new THREE.CylinderGeometry(0.12, 0.14, 0.48, 16), statueGold, new THREE.Vector3(0.44, 0.90, 0.12));
  rightUpperArm.rotation.z = 0.42;
  rightUpperArm.rotation.x = 0.32;

  const rightForearm = addMesh(buddha, new THREE.CylinderGeometry(0.09, 0.11, 0.46, 16), statueGold, new THREE.Vector3(0.32, 0.88, 0.32));
  rightForearm.rotation.x = 0.78;
  rightForearm.rotation.z = -0.36;

  // Flowing sleeve drapery cascading down from right forearm towards lap (사진 속 아래로 흘러내리는 소맷자락)
  const rightSleeveFlow = addMesh(
    buddha,
    new THREE.ConeGeometry(0.18, 0.52, 12),
    statueGoldShadow,
    new THREE.Vector3(0.48, 0.65, 0.26)
  );
  rightSleeveFlow.rotation.z = 0.35;
  rightSleeveFlow.rotation.x = -0.15;
  rightSleeveFlow.scale.set(0.65, 1, 1.2);

  // Right Hand Group at chest height (x ~ 0.20, y ~ 1.06, z ~ 0.42)
  const rightHandGroup = new THREE.Group();
  rightHandGroup.position.set(0.20, 1.06, 0.42);
  buddha.add(rightHandGroup);

  const rightPalm = addMesh(rightHandGroup, new THREE.SphereGeometry(0.065, 14, 12), statueGoldShine, new THREE.Vector3(0, 0, 0));
  rightPalm.scale.set(0.85, 1.2, 0.45);

  // Thumb and Middle Finger touching to form the sacred circle (아미타인 고리)
  const rightThumb = addMesh(
    rightHandGroup,
    new THREE.CylinderGeometry(0.012, 0.015, 0.09, 8),
    statueGoldShine,
    new THREE.Vector3(-0.038, 0.02, 0.04)
  );
  rightThumb.rotation.z = -0.85;
  rightThumb.rotation.x = 0.65;

  const rightMiddle = addMesh(
    rightHandGroup,
    new THREE.CylinderGeometry(0.011, 0.013, 0.11, 8),
    statueGoldShine,
    new THREE.Vector3(-0.02, 0.07, 0.04)
  );
  rightMiddle.rotation.z = 0.65;
  rightMiddle.rotation.x = -0.35;

  // Index finger extended gracefully upward
  const rightIndex = addMesh(
    rightHandGroup,
    new THREE.CylinderGeometry(0.011, 0.013, 0.13, 8),
    statueGoldShine,
    new THREE.Vector3(-0.045, 0.12, 0.01)
  );
  rightIndex.rotation.z = -0.18;
  rightIndex.rotation.x = 0.22;

  // Ring and little fingers curved upward and slightly back
  const rightRing = addMesh(
    rightHandGroup,
    new THREE.CylinderGeometry(0.010, 0.012, 0.11, 8),
    statueGoldShine,
    new THREE.Vector3(0.015, 0.11, -0.01)
  );
  rightRing.rotation.z = 0.15;
  rightRing.rotation.x = 0.35;

  const rightPinky = addMesh(
    rightHandGroup,
    new THREE.CylinderGeometry(0.009, 0.011, 0.09, 8),
    statueGoldShine,
    new THREE.Vector3(0.042, 0.08, -0.015)
  );
  rightPinky.rotation.z = 0.35;
  rightPinky.rotation.x = 0.45;

  // 4. Left Hand: Lap Amitabha Mudra (왼손 아미타인 - 무릎 위에서 손바닥을 위로 하여 엄지와 중지를 맞댐)
  const leftUpperArm = addMesh(buddha, new THREE.CylinderGeometry(0.12, 0.14, 0.50, 16), statueGold, new THREE.Vector3(-0.44, 0.88, 0.12));
  leftUpperArm.rotation.z = -0.36;
  leftUpperArm.rotation.x = 0.20;

  const leftForearm = addMesh(buddha, new THREE.CylinderGeometry(0.09, 0.11, 0.44, 16), statueGold, new THREE.Vector3(-0.20, 0.52, 0.30));
  leftForearm.rotation.z = 1.38;
  leftForearm.rotation.x = 0.22;

  // Left sleeve drape pooling to left knee
  const leftSleeveFlow = addMesh(
    buddha,
    new THREE.ConeGeometry(0.18, 0.48, 12),
    statueGoldShadow,
    new THREE.Vector3(-0.46, 0.42, 0.24)
  );
  leftSleeveFlow.rotation.z = -0.38;
  leftSleeveFlow.scale.set(0.65, 1, 1.2);

  // Left Hand Group above lap (x ~ 0.06, y ~ 0.44, z ~ 0.40)
  const leftHandGroup = new THREE.Group();
  leftHandGroup.position.set(0.06, 0.44, 0.40);
  buddha.add(leftHandGroup);

  const leftPalm = addMesh(leftHandGroup, new THREE.SphereGeometry(0.065, 14, 12), statueGoldShine, new THREE.Vector3(0, 0, 0));
  leftPalm.scale.set(1.2, 0.55, 0.9);

  // Thumb and Middle Finger touching in ring (왼손 아미타인 고리)
  const leftThumb = addMesh(
    leftHandGroup,
    new THREE.CylinderGeometry(0.011, 0.013, 0.08, 8),
    statueGoldShine,
    new THREE.Vector3(-0.02, 0.04, -0.01)
  );
  leftThumb.rotation.z = 0.65;
  leftThumb.rotation.x = -0.45;

  const leftMiddle = addMesh(
    leftHandGroup,
    new THREE.CylinderGeometry(0.010, 0.012, 0.10, 8),
    statueGoldShine,
    new THREE.Vector3(0.02, 0.04, 0.04)
  );
  leftMiddle.rotation.z = -0.65;
  leftMiddle.rotation.x = 0.35;

  const leftIndex = addMesh(
    leftHandGroup,
    new THREE.CylinderGeometry(0.010, 0.012, 0.11, 8),
    statueGoldShine,
    new THREE.Vector3(0.07, 0.02, 0.06)
  );
  leftIndex.rotation.y = 0.45;
  leftIndex.rotation.z = -0.25;

  const leftRing = addMesh(
    leftHandGroup,
    new THREE.CylinderGeometry(0.010, 0.012, 0.10, 8),
    statueGoldShine,
    new THREE.Vector3(0.05, 0.01, 0.09)
  );
  leftRing.rotation.y = 0.25;

  const leftPinky = addMesh(
    leftHandGroup,
    new THREE.CylinderGeometry(0.009, 0.011, 0.08, 8),
    statueGoldShine,
    new THREE.Vector3(0.02, 0.005, 0.11)
  );
  leftPinky.rotation.y = 0.15;

  // 5. Three Auspicious Neck Rings (삼도, 三道)
  addMesh(buddha, new THREE.CylinderGeometry(0.14, 0.17, 0.22, 24), statueGold, new THREE.Vector3(0, 1.28, 0.01));
  for (let ring = 0; ring < 3; ring += 1) {
    const ringY = 1.22 + ring * 0.055;
    const neckFold = addMesh(buddha, new THREE.TorusGeometry(0.155 - ring * 0.007, 0.012, 8, 32), statueGoldShine, new THREE.Vector3(0, ringY, 0.015));
    neckFold.rotation.x = Math.PI / 2;
  }

  // 6. Dignified Head & Noble Features (존용, 尊容 - 사진 속 온화하고 자비로운 상호)
  const head = addMesh(buddha, new THREE.SphereGeometry(0.31, 32, 28), statueGold, new THREE.Vector3(0, 1.58, 0.02));
  head.scale.set(0.96, 1.08, 0.98);

  // Ushnisha (육계, 肉髻 - 높은 원추형 지혜의 상투)
  const ushnisha = addMesh(buddha, new THREE.SphereGeometry(0.14, 24, 18), statueDarkBronze, new THREE.Vector3(0, 1.88, 0.02));
  ushnisha.scale.set(0.96, 0.82, 0.92);

  // Central Hairline Semicircular Jewel (중앙계주, 半月形 髻珠 - 사진 속 이마 바로 위 금빛 반달 계주)
  const hairlineJewel = addMesh(
    buddha,
    new THREE.SphereGeometry(0.046, 16, 12),
    statueGoldShine,
    new THREE.Vector3(0, 1.76, 0.28)
  );
  hairlineJewel.scale.set(1.4, 0.75, 0.8);

  // Crown Jewel (정상계주, 頂上 寶珠)
  addMesh(buddha, new THREE.SphereGeometry(0.042, 16, 12), cintamaniRed, new THREE.Vector3(0, 1.96, 0.04));

  // Canonical Snail Hair Curls (나발, 螺髮 - 사진 속 흑갈색 소라형 머리칼)
  for (let layer = 0; layer < 4; layer += 1) {
    const radius = 0.305 - layer * 0.052;
    const curlY = 1.68 + layer * 0.068;
    const count = 18 - layer * 3;
    for (let c = 0; c < count; c += 1) {
      const angle = (c / count) * Math.PI * 2;
      const cx = Math.sin(angle) * radius;
      const cz = Math.cos(angle) * (radius * 0.95);
      // Skip right where the central jewel is placed
      if (layer === 1 && Math.abs(cx) < 0.06 && cz > 0.2) continue;
      addMesh(buddha, new THREE.SphereGeometry(0.032, 10, 8), statueDarkBronze, new THREE.Vector3(cx, curlY, cz + 0.02));
    }
  }

  // Forehead Urna (백호, 白毫 - 미간의 광명 구슬)
  const urna = addMesh(buddha, new THREE.SphereGeometry(0.022, 14, 12), urnaWhite, new THREE.Vector3(0, 1.66, 0.308));
  urna.scale.set(1, 1, 1.3);

  // Eyebrows (수려한 호형 눈썹)
  for (const side of [-1, 1]) {
    const brow = addMesh(
      buddha,
      new THREE.TorusGeometry(0.072, 0.007, 6, 20, Math.PI * 0.55),
      statueGoldShadow,
      new THREE.Vector3(side * 0.095, 1.645, 0.28)
    );
    brow.rotation.z = side * -0.45;
    brow.rotation.x = 0.55;

    // Meditative Compassionate Half-Closed Eyes (반개한 자비안)
    const eyelid = addMesh(
      buddha,
      new THREE.TorusGeometry(0.044, 0.008, 8, 20, Math.PI * 0.78),
      statueGoldShine,
      new THREE.Vector3(side * 0.105, 1.605, 0.288)
    );
    eyelid.rotation.z = side * -0.15;
    eyelid.rotation.x = 0.42;

    const pupil = addMesh(
      buddha,
      new THREE.SphereGeometry(0.022, 10, 8),
      eyeMaterial,
      new THREE.Vector3(side * 0.105, 1.585, 0.298)
    );
    pupil.scale.set(1.4, 0.45, 0.7);
    pupil.rotation.x = 0.35;
  }

  // Defined Straight Nose Bridge (비량, 鼻梁)
  const noseBridge = addMesh(buddha, new THREE.CylinderGeometry(0.016, 0.034, 0.12, 10), statueGold, new THREE.Vector3(0, 1.55, 0.315));
  noseBridge.rotation.x = -0.18;
  const noseTip = addMesh(buddha, new THREE.SphereGeometry(0.026, 12, 10), statueGold, new THREE.Vector3(0, 1.505, 0.335));
  noseTip.scale.set(1.15, 0.85, 1.1);

  // Serene Compassionate Lips with Archaic Smile (자비로운 미소)
  const upperLip = addMesh(buddha, new THREE.SphereGeometry(0.038, 14, 10), lipTone, new THREE.Vector3(0, 1.455, 0.318));
  upperLip.scale.set(1.45, 0.38, 0.65);
  const lowerLip = addMesh(buddha, new THREE.SphereGeometry(0.036, 14, 10), lipTone, new THREE.Vector3(0, 1.435, 0.315));
  lowerLip.scale.set(1.35, 0.45, 0.7);

  // Elongated Dignified Earlobes (이하수, 耳垂 - 어깨까지 드리운 긴 귀)
  for (const side of [-1, 1]) {
    const ear = addMesh(buddha, new THREE.CylinderGeometry(0.036, 0.024, 0.28, 12), statueGold, new THREE.Vector3(side * 0.32, 1.52, 0.01));
    ear.rotation.z = side * -0.15;
    const earLobe = addMesh(buddha, new THREE.SphereGeometry(0.036, 10, 8), statueGold, new THREE.Vector3(side * 0.335, 1.38, 0.01));
    earLobe.scale.set(1, 1.3, 0.8);
  }

  buddha.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // --- Traditional Korean Boat-Shaped Mandorla (주형 거신광배, 舟形 擧身光背) ---
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xf3cb72, transparent: true, opacity: 0.72 });
  const haloInnerMaterial = new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.58 });
  const flameEdgeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 });

  const mandorlaGroup = new THREE.Group();
  mandorlaGroup.position.set(0, 0, -0.12);
  buddhaEnsemble.add(mandorlaGroup);

  // 1. Grand Body Mandorla (거신광배 외륜)
  const halo = addMesh(mandorlaGroup, new THREE.TorusGeometry(1.08, 0.028, 16, 96), haloMaterial, new THREE.Vector3(0, 0.98, 0));
  halo.rotation.y = Math.PI;

  const haloInner = addMesh(mandorlaGroup, new THREE.TorusGeometry(0.91, 0.016, 12, 96), haloInnerMaterial, new THREE.Vector3(0, 0.98, -0.005));
  haloInner.rotation.y = Math.PI;

  // 2. Radiating Lotus Head Halo (연화 두광, 蓮花頭光)
  const headHalo = addMesh(mandorlaGroup, new THREE.TorusGeometry(0.48, 0.015, 12, 72), haloInnerMaterial, new THREE.Vector3(0, 1.58, 0.008));
  headHalo.rotation.y = Math.PI;

  // Radiating 16 Golden Lotus Rays in Head Halo (두광 연화 광배살)
  for (let r = 0; r < 16; r += 1) {
    const rayAngle = (r / 16) * Math.PI * 2;
    const ray = addMesh(mandorlaGroup, new THREE.CylinderGeometry(0.005, 0.005, 0.44, 6), haloInnerMaterial, new THREE.Vector3(0, 1.58, 0.005));
    ray.position.x = Math.sin(rayAngle) * 0.25;
    ray.position.y = 1.58 + Math.cos(rayAngle) * 0.25;
    ray.rotation.z = -rayAngle;
  }

  // 3. Flame Crests Rising Around Perimeter (광배 화염문, 火焰文)
  for (let fl = 0; fl < 24; fl += 1) {
    const angle = (fl / 24) * Math.PI * 1.85 + Math.PI * 0.075;
    const fx = Math.sin(angle) * 1.09;
    const fy = 0.98 + Math.cos(angle) * 1.09;
    const flameTongue = addMesh(mandorlaGroup, new THREE.ConeGeometry(0.042, 0.15, 6), flameEdgeMat, new THREE.Vector3(fx, fy, -0.008));
    flameTongue.rotation.z = -angle + Math.PI;
  }

  const altarGlow = new THREE.PointLight(0xffca65, 3.2, 24);
  altarGlow.position.set(0, 2.8, -3.4);
  world.add(altarGlow);

  // --- Altar Candles & Ceremonial Lotus Candle Stands (공양 촛대 & 촛불 어레이) ---
  const wax = makeMaterial(0xf4dcab, 0.7);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffae42 });

  // 1. Two Primary Grand Brass Altar Candelabras (중앙 황금 촛대)
  for (const x of [-2.4, 2.4]) {
    addCylinder(altarGroup, 0.16, 0.22, 0.1, gold, x, 0.48, -4.1, 16);
    addCylinder(altarGroup, 0.055, 0.07, 0.35, gold, x, 0.68, -4.1, 12);
    addCylinder(altarGroup, 0.12, 0.15, 0.07, gold, x, 0.88, -4.1, 16);
    addCylinder(altarGroup, 0.11, 0.11, 0.48, wax, x, 1.15, -4.1, 16);
    const flame = addMesh(altarGroup, new THREE.ConeGeometry(0.09, 0.28, 12), flameMaterial, new THREE.Vector3(x, 1.48, -4.1));
    flame.userData.isFlame = true;
    candleFlames.push(flame);
    const light = new THREE.PointLight(0xff9f3a, 1.6, 10, 2);
    light.position.set(x, 1.54, -4.08);
    world.add(light);
    candleLights.push(light);
  }

  // 2. Ceremonial Foreground Offering Table & Grand Lotus Candlestick Stand (불전 중앙 헌공단 & 황금 연화 촛대)
  // Highly visible dedicated altar table positioned directly in front of the altar stage for offerings
  addBox(altarGroup, 2.6, 0.58, 0.88, darkWood, 0, 0.29, -3.15);
  addBox(altarGroup, 2.66, 0.05, 0.94, gold, 0, 0.58, -3.15);
  addBox(altarGroup, 2.3, 0.44, 0.04, red, 0, 0.28, -2.69);

  // Central Sacred Golden Lotus Candlestick Stand (중앙 황금 대연화 촛대)
  addCylinder(altarGroup, 0.22, 0.16, 0.08, gold, 0, 0.64, -3.15, 24);
  const altarLotusPetalMat = makeMaterial(0xcc6072, 0.55);
  // Sculpted blooming lotus petals encircling the stand
  for (let p = 0; p < 8; p += 1) {
    const angle = (p / 8) * Math.PI * 2;
    const petal = addMesh(
      altarGroup,
      new THREE.SphereGeometry(0.08, 12, 8),
      altarLotusPetalMat,
      new THREE.Vector3(Math.sin(angle) * 0.16, 0.67, -3.15 + Math.cos(angle) * 0.16)
    );
    petal.scale.set(0.65, 0.4, 1.25);
    petal.rotation.y = -angle + Math.PI / 2;
    petal.rotation.x = 0.35;
  }
  // Large temple candle body
  addCylinder(altarGroup, 0.09, 0.09, 0.28, wax, 0, 0.79, -3.15, 18);
  // Sacred glowing golden flame
  const centralFlame = addMesh(altarGroup, new THREE.ConeGeometry(0.075, 0.24, 12), flameMaterial, new THREE.Vector3(0, 0.99, -3.15));
  centralFlame.userData.isFlame = true;
  candleFlames.push(centralFlame);

  const centralLight = new THREE.PointLight(0xffae38, 2.2, 8.5, 2);
  centralLight.position.set(0, 1.05, -3.1);
  world.add(centralLight);
  candleLights.push(centralLight);

  // Left & right companion lotus candle holders across the offering table
  for (const vx of [-0.75, 0.75]) {
    addCylinder(altarGroup, 0.14, 0.1, 0.05, gold, vx, 0.63, -3.15, 16);
    addCylinder(altarGroup, 0.07, 0.07, 0.22, wax, vx, 0.74, -3.15, 14);
    const sideFlame = addMesh(altarGroup, new THREE.ConeGeometry(0.055, 0.18, 10), flameMaterial, new THREE.Vector3(vx, 0.89, -3.15));
    sideFlame.userData.isFlame = true;
    candleFlames.push(sideFlame);

    const sideLight = new THREE.PointLight(0xff9a36, 1.4, 6.0, 2);
    sideLight.position.set(vx, 0.94, -3.12);
    world.add(sideLight);
    candleLights.push(sideLight);
  }

  // Traditional Korean Bronze Incense Burner (청동 대향로 靑銅大香爐) with 3 sacred incense sticks & rising smoke
  const bronzeMat = makeMaterial(0x4e3a24, 0.42, { metalness: 0.72, roughness: 0.38 });
  const bronzeGoldMat = makeMaterial(0xcaa246, 0.35, { metalness: 0.65 });
  const ashMat = makeMaterial(0x8a8885, 0.92);
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3b11 });

  // 3 Curved Bronze Tripod Legs (삼족 三足)
  for (let leg = 0; leg < 3; leg += 1) {
    const lAngle = (leg / 3) * Math.PI * 2;
    const legMesh = addMesh(
      altarGroup,
      new THREE.CylinderGeometry(0.022, 0.016, 0.10, 8),
      bronzeMat,
      new THREE.Vector3(Math.sin(lAngle) * 0.12, 0.63, -2.86 + Math.cos(lAngle) * 0.12)
    );
    legMesh.rotation.z = Math.sin(lAngle) * 0.22;
    legMesh.rotation.x = Math.cos(lAngle) * 0.22;
  }

  // Stout Bronze Bowl Body & Flanged Rim
  addCylinder(altarGroup, 0.17, 0.13, 0.12, bronzeMat, 0, 0.70, -2.86, 20);
  addCylinder(altarGroup, 0.19, 0.18, 0.03, bronzeGoldMat, 0, 0.76, -2.86, 20);
  // Consecrated White/Gray Incense Ash (고운 향회 香灰)
  addCylinder(altarGroup, 0.16, 0.16, 0.015, ashMat, 0, 0.765, -2.86, 18);

  // 3 Sacred Incense Sticks (삼지향 三枝香 - 계향·정향·혜향) planted upright in the ash
  for (let s = -1; s <= 1; s += 1) {
    const sx = s * 0.038;
    const stick = addCylinder(altarGroup, 0.004, 0.004, 0.18, makeMaterial(0x5a2b16, 0.8), sx, 0.84, -2.86, 6);
    stick.rotation.z = s * 0.06;
    // Burning glowing red ember tip
    const ember = addMesh(altarGroup, new THREE.SphereGeometry(0.012, 8, 6), emberMat, new THREE.Vector3(sx + s * 0.008, 0.93, -2.86));
    ember.userData.isIncenseEmber = true;
  }

  const incenseBurnerLight = new THREE.PointLight(0xff5511, 0.85, 4.0);
  incenseBurnerLight.position.set(0, 0.96, -2.86);
  world.add(incenseBurnerLight);

  // Dynamic Rising Spiritual Smoke Particles (청정하게 피어오르는 향 연기)
  const smokePuffs: THREE.Mesh[] = [];
  const smokeGeo = new THREE.SphereGeometry(0.042, 8, 8);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xefede9,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });

  for (let i = 0; i < 36; i += 1) {
    const puff = new THREE.Mesh(smokeGeo, smokeMat.clone());
    puff.position.set(0, 0.94, -2.86);
    puff.userData = {
      birthOffset: (i / 36) * 3.8,
      lifespan: 3.8,
      speedY: 0.36 + (i % 5) * 0.04,
      swirlSpeed: 1.1 + (i % 4) * 0.35,
      driftRadius: 0.03 + (i % 6) * 0.014,
      initialScale: 0.38 + (i % 3) * 0.15,
    };
    altarGroup.add(puff);
    smokePuffs.push(puff);
  }

  // Aisle candle lights to ensure monks are surrounded by warm amber glow
  const aisleCandles: THREE.PointLight[] = [];
  const aislePositions = [
    [-3.8, 1.2, 0.5],
    [3.8, 1.2, 0.5],
    [-3.8, 1.2, 3.5],
    [3.8, 1.2, 3.5],
    [0, 2.2, 1.8],
  ];
  for (const [ax, ay, az] of aislePositions) {
    const warmLight = new THREE.PointLight(0xffa24b, 0.75, 7.5, 2);
    warmLight.position.set(ax, ay, az);
    world.add(warmLight);
    candleLights.push(warmLight);
    aisleCandles.push(warmLight);
  }

  const lotusBase = addCylinder(altarGroup, 0.58, 0.66, 0.12, pedestal, 0, 0.99, -4.92, 32);
  lotusBase.castShadow = true;
  addCylinder(altarGroup, 0.48, 0.56, 0.06, gold, 0, 1.08, -4.92, 32);
  const lotusPetalMaterials = [makeMaterial(0xd58b77, 0.55), makeMaterial(0xe4b84f, 0.48, { metalness: 0.38 })];
  for (let petal = 0; petal < 12; petal += 1) {
    const angle = (petal / 12) * Math.PI * 2;
    const flowerPetal = addMesh(
      altarGroup,
      new THREE.SphereGeometry(1, 14, 10),
      lotusPetalMaterials[petal % lotusPetalMaterials.length],
      new THREE.Vector3(Math.cos(angle) * 0.48, 1.1, -4.92 + Math.sin(angle) * 0.48),
    );
    flowerPetal.scale.set(0.15, 0.075, 0.31);
    flowerPetal.rotation.y = -angle + Math.PI / 2;
  }

  const cushionBottom = makeMaterial(0x742c29, 0.74);
  const cushionTop = makeMaterial(0x9b3d32, 0.7);
  const petalMaterial = makeMaterial(0xb34b3c, 0.62);
  const petalLight = makeMaterial(0xd16f4c, 0.58);
  const cushionGold = makeMaterial(0xe1b764, 0.5, { metalness: 0.35 });
  const baseGeometry = new THREE.CylinderGeometry(0.59, 0.68, 0.18, 32);
  const topGeometry = new THREE.CylinderGeometry(0.48, 0.55, 0.16, 32);
  const petalGeometry = new THREE.SphereGeometry(1, 12, 10);
  const centerGeometry = new THREE.CylinderGeometry(0.25, 0.29, 0.09, 24);
  const seatRingGeometry = new THREE.TorusGeometry(0.48, 0.016, 8, 48);

  for (let row = 0; row < seatRows; row += 1) {
    for (let column = 0; column < seatColumns; column += 1) {
      const seatIndex = row * seatColumns + column;
      const x = seatX[column];
      const z = seatZ[row];
      seatPositions.push(new THREE.Vector3(x, 0.29, z));
      const base = addMesh(seatGroup, baseGeometry, cushionBottom, new THREE.Vector3(x, 0.12, z));
      const top = addMesh(seatGroup, topGeometry, cushionTop, new THREE.Vector3(x, 0.27, z));
      base.userData.seatIndex = seatIndex;
      top.userData.seatIndex = seatIndex;
      seatMeshes.push(base, top);
      for (let petal = 0; petal < 10; petal += 1) {
        const angle = (petal / 10) * Math.PI * 2;
        const flowerPetal = addMesh(
          seatGroup,
          petalGeometry,
          petal % 2 === 0 ? petalMaterial : petalLight,
          new THREE.Vector3(x + Math.sin(angle) * 0.43, 0.27, z + Math.cos(angle) * 0.43),
        );
        flowerPetal.scale.set(0.2, 0.075, 0.34);
        flowerPetal.rotation.y = angle;
        flowerPetal.castShadow = false;
        flowerPetal.userData.seatIndex = seatIndex;
        seatMeshes.push(flowerPetal);
      }
      const center = addMesh(seatGroup, centerGeometry, cushionTop, new THREE.Vector3(x, 0.37, z));
      center.userData.seatIndex = seatIndex;
      seatMeshes.push(center);
      const embroidery = addMesh(seatGroup, seatRingGeometry, cushionGold, new THREE.Vector3(x, 0.355, z));
      embroidery.rotation.x = -Math.PI / 2;
      embroidery.userData.seatIndex = seatIndex;
      seatMeshes.push(embroidery);
    }
  }

  const raycastFloor = addMesh(
    world,
    new THREE.PlaneGeometry(11, 28),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.Vector3(0, -0.005, 6.5),
  );
  raycastFloor.rotation.x = -Math.PI / 2;

  return {
    buddhaEnsemble,
    roomGroup,
    forestGroup,
    seatGroup,
    altarGroup,
    forestFloor,
    raycastFloor,
    hemisphere,
    ambient,
    keyLight,
    altarGlow,
    statueGold,
    statueLight,
    haloMaterial,
    haloInnerMaterial,
    floorMaterial: floor,
    woodMaterials: [wood, woodLight, darkWood, red, green, wall, wallPanel, gold],
    seatMaterials: [cushionBottom, cushionTop, petalMaterial, petalLight, cushionGold],
    forestMaterials: [forestGround, rockMaterial, mossMaterial, ...pineMaterials, trunkMaterial, forestLine],
    aisleCandles,
    smokePuffs,
  } satisfies SceneTheme;
}

const robeColors: Record<TempleProfile["robeColor"], { main: number; shadow: number }> = {
  gray: { main: 0xb5b3aa, shadow: 0x85837b },
  ink: { main: 0x514f4b, shadow: 0x383735 },
  ochre: { main: 0xa17a4d, shadow: 0x765633 },
  orange: { main: 0xb9683c, shadow: 0x874329 },
};

function makeNameTag(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "rgba(25, 20, 16, 0.88)";
    context.beginPath();
    context.roundRect(6, 8, 372, 96, 20);
    context.fill();
    context.strokeStyle = "rgba(235, 205, 139, 0.85)";
    context.lineWidth = 3;
    context.stroke();
    context.strokeStyle = "rgba(180, 140, 80, 0.35)";
    context.lineWidth = 1;
    context.strokeRect(12, 14, 360, 84);

    context.fillStyle = "#faebd0";
    const fontSize = name.length > 4 ? 33 : 42;
    context.font = `600 ${fontSize}px 'Noto Serif KR', 'Batang', serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(name, 192, 57, 330);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, sizeAttenuation: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.92, 0.27, 1);
  sprite.position.set(0, 1.45, 0);
  sprite.visible = name.length > 0;
  return sprite;
}

function profileSignature(profile: TempleProfile | null) {
  return profile ? `${profile.gender}:${profile.name}:${profile.robeColor}:${profile.vow}` : "guest";
}

function updateNoviceProfile(rig: MonkRig, profile: TempleProfile | null) {
  const colors = robeColors[profile?.robeColor ?? "gray"];
  rig.robeMaterial.color.set(colors.main);
  rig.robeShadowMaterial.color.set(colors.shadow);
  rig.maleHairGroup.visible = profile?.gender !== "female";
  rig.femaleHairGroup.visible = profile?.gender === "female";

  const material = rig.nameTag.material as THREE.SpriteMaterial;
  material.map?.dispose();
  const replacement = makeNameTag(profile?.name ?? "");
  const replacementMaterial = replacement.material as THREE.SpriteMaterial;
  material.map = replacementMaterial.map;
  material.needsUpdate = true;
  replacementMaterial.map = null;
  replacementMaterial.dispose();
  replacement.geometry.dispose();
  rig.nameTag.visible = Boolean(profile?.name);
}

function createNovice(scene: THREE.Scene, position: THREE.Vector3, self = false, profile: TempleProfile | null = null): MonkRig {
  const colors = robeColors[profile?.robeColor ?? "gray"];
  const robe = makeMaterial(colors.main, 0.84);
  const robeShadow = makeMaterial(colors.shadow, 0.9);
  // Warm apricot Korean skin tone
  const skin = makeMaterial(0xf7cfb2, 0.85);
  const hair = makeMaterial(0x322c28, 0.95);
  const faceLine = makeMaterial(0x59473d, 0.9);
  const sockWhite = makeMaterial(0xf3ece0, 0.82);

  const root = new THREE.Group();
  root.position.copy(position);
  scene.add(root);

  // Upper body
  const upperBody = new THREE.Group();
  upperBody.position.y = 0.44;
  root.add(upperBody);

  const body = addMesh(upperBody, new THREE.CylinderGeometry(0.24, 0.38, 0.58, 18), robe, new THREE.Vector3(0, 0, 0));
  body.castShadow = true;
  addMesh(upperBody, new THREE.TorusGeometry(0.24, 0.024, 8, 24), robeShadow, new THREE.Vector3(0, 0.22, 0));

  // Head
  const head = addMesh(upperBody, new THREE.SphereGeometry(0.33, 24, 18), skin, new THREE.Vector3(0, 0.5, 0.02));
  head.scale.set(1, 1.06, 0.96);

  const maleHairGroup = new THREE.Group();
  const femaleHairGroup = new THREE.Group();
  upperBody.add(maleHairGroup, femaleHairGroup);

  // Male novice shaved head topknot
  addMesh(maleHairGroup, new THREE.SphereGeometry(0.09, 12, 10), hair, new THREE.Vector3(0, 0.82, 0.01));

  // Female novice hair
  const femaleCap = addMesh(femaleHairGroup, new THREE.SphereGeometry(0.26, 18, 12), hair, new THREE.Vector3(0, 0.74, -0.02));
  femaleCap.scale.set(1.06, 0.58, 0.9);
  for (const side of [-1, 1]) {
    const lock = addMesh(femaleHairGroup, new THREE.SphereGeometry(0.12, 12, 10), hair, new THREE.Vector3(side * 0.22, 0.52, 0.08));
    lock.scale.set(0.72, 1.5, 0.78);
  }
  const flowerPin = makeMaterial(0xd98b91, 0.5);
  const hairFlower = addMesh(femaleHairGroup, new THREE.SphereGeometry(0.055, 10, 8), flowerPin, new THREE.Vector3(0.19, 0.74, 0.2));
  hairFlower.scale.set(1, 0.8, 0.6);
  maleHairGroup.visible = profile?.gender !== "female";
  femaleHairGroup.visible = profile?.gender === "female";

  // Ears & Eyes
  for (const side of [-1, 1]) {
    addMesh(upperBody, new THREE.SphereGeometry(0.065, 10, 8), skin, new THREE.Vector3(side * 0.31, 0.47, 0.015));
    const eye = addMesh(upperBody, new THREE.SphereGeometry(0.027, 8, 8), faceLine, new THREE.Vector3(side * 0.115, 0.52, 0.31));
    eye.scale.set(1.2, 0.42, 0.6);
  }

  // Rosy cheek blush (healthy and warm)
  const blush = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.52 });
  for (const side of [-1, 1]) {
    const cheek = addMesh(upperBody, new THREE.SphereGeometry(0.058, 12, 10), blush, new THREE.Vector3(side * 0.185, 0.43, 0.30));
    cheek.scale.set(1.2, 0.75, 0.4);
  }

  // Gentle smile
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 0.4, 0.31),
    new THREE.Vector3(-0.03, 0.375, 0.325),
    new THREE.Vector3(0.03, 0.375, 0.325),
    new THREE.Vector3(0.07, 0.4, 0.31),
  ]);
  addMesh(upperBody, new THREE.TubeGeometry(smileCurve, 12, 0.009, 5, false), faceLine, new THREE.Vector3(0, 0, 0));

  // Arms
  const armGeometry = new THREE.SphereGeometry(1, 14, 12);
  const leftArm = addMesh(upperBody, armGeometry, robe, new THREE.Vector3(-0.28, -0.06, 0.04));
  const rightArm = addMesh(upperBody, armGeometry, robe, new THREE.Vector3(0.28, -0.06, 0.04));
  leftArm.scale.set(0.14, 0.24, 0.15);
  rightArm.scale.set(0.14, 0.24, 0.15);

  const leftHandGroup = new THREE.Group();
  const rightHandGroup = new THREE.Group();
  leftHandGroup.position.set(-0.08, -0.22, 0.22);
  rightHandGroup.position.set(0.08, -0.22, 0.22);
  upperBody.add(leftHandGroup, rightHandGroup);

  for (const [handGroup, side] of [[leftHandGroup, -1], [rightHandGroup, 1]] as const) {
    const palm = addMesh(handGroup, new THREE.SphereGeometry(0.085, 12, 10), skin, new THREE.Vector3(0, 0, 0));
    palm.scale.set(1.4, 0.42, 1.15);
    for (let finger = 0; finger < 4; finger += 1) {
      const fingertip = addMesh(
        handGroup,
        new THREE.SphereGeometry(0.032, 8, 8),
        skin,
        new THREE.Vector3(side * (finger - 1.5) * 0.05, -0.004, 0.09 + (finger === 1 || finger === 2 ? 0.015 : 0)),
      );
      fingertip.scale.set(0.78, 0.78, 1.5);
    }
  }

  // --- Radiant Handheld Lotus Votive Candle for Offerings (동자승이 두 손으로 경건히 받쳐 드는 대형 연화 공양초) ---
  const offeringCandleGroup = new THREE.Group();
  offeringCandleGroup.position.set(0, 0.08, 0.40);
  upperBody.add(offeringCandleGroup);

  const candleGold = makeMaterial(0xdaa53f, 0.3, { metalness: 0.65 });
  const candleWax = makeMaterial(0xfff7e6, 0.6);
  const candleLotusPink = makeMaterial(0xf472b6, 0.45, { emissive: 0x881e4a, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0xff7b00, transparent: true, opacity: 0.88 });
  const flameInnerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 1. Golden lotus petal pedestal cup (황금 연화 받침잔)
  addCylinder(offeringCandleGroup, 0.14, 0.085, 0.06, candleGold, 0, 0, 0, 18);
  // 10 Blooming sculpted lotus petals encircling the cup
  for (let p = 0; p < 10; p += 1) {
    const angle = (p / 10) * Math.PI * 2;
    const petal = addMesh(
      offeringCandleGroup,
      new THREE.SphereGeometry(0.065, 10, 8),
      candleLotusPink,
      new THREE.Vector3(Math.sin(angle) * 0.12, 0.03, Math.cos(angle) * 0.12)
    );
    petal.scale.set(0.65, 0.45, 1.25);
    petal.rotation.y = -angle + Math.PI / 2;
    petal.rotation.x = 0.38;
  }

  // 2. Thick white temple candle body (백색 사찰 공양 양초)
  addCylinder(offeringCandleGroup, 0.076, 0.076, 0.19, candleWax, 0, 0.115, 0, 16);

  // 3. Vibrant Dual-Layer Glowing Sacred Flame (백색 속불꽃 + 황금빛 겉불꽃)
  const outerFlame = addMesh(offeringCandleGroup, new THREE.ConeGeometry(0.075, 0.26, 12), flameOuterMat, new THREE.Vector3(0, 0.30, 0));
  outerFlame.userData.isFlame = true;
  const innerFlame = addMesh(offeringCandleGroup, new THREE.ConeGeometry(0.042, 0.17, 10), flameInnerMat, new THREE.Vector3(0, 0.27, 0));
  innerFlame.userData.isFlame = true;

  // 4. Warm radiant point light casting sacred amber glow onto monk's face, hands & robes
  const carryLight = new THREE.PointLight(0xffa838, 2.6, 4.8);
  carryLight.position.set(0, 0.34, 0);
  offeringCandleGroup.add(carryLight);
  offeringCandleGroup.visible = false;

  // --- Sacred Handheld Incense Sticks for Incense Offering (경건히 받쳐 든 공양 삼지향) ---
  const offeringIncenseGroup = new THREE.Group();
  offeringIncenseGroup.position.set(0, 0.08, 0.38);
  upperBody.add(offeringIncenseGroup);

  const incenseStickMat = makeMaterial(0x5a2d18, 0.75);
  const incenseEmberMat = new THREE.MeshBasicMaterial({ color: 0xff3b11 });
  const incenseSmokeMat = new THREE.MeshBasicMaterial({ color: 0xefede9, transparent: true, opacity: 0.35 });

  // Golden miniature lotus incense holder in hands
  addCylinder(offeringIncenseGroup, 0.06, 0.035, 0.04, candleGold, 0, 0, 0, 14);
  // 3 Sacred incense sticks with glowing red burning ember tips
  for (let s = -1; s <= 1; s += 1) {
    const sx = s * 0.022;
    const stick = addCylinder(offeringIncenseGroup, 0.0045, 0.0045, 0.24, incenseStickMat, sx, 0.12, 0, 6);
    stick.rotation.z = s * 0.07;
    // Red glowing ember
    addMesh(offeringIncenseGroup, new THREE.SphereGeometry(0.012, 8, 6), incenseEmberMat, new THREE.Vector3(sx + s * 0.008, 0.24, 0));
    // Soft smoke puff
    const puff = addMesh(offeringIncenseGroup, new THREE.SphereGeometry(0.025, 8, 6), incenseSmokeMat, new THREE.Vector3(sx + s * 0.008, 0.27, 0));
    puff.scale.set(0.8, 1.4, 0.8);
  }
  const incenseCarryLight = new THREE.PointLight(0xff5511, 1.6, 3.2);
  incenseCarryLight.position.set(0, 0.26, 0);
  offeringIncenseGroup.add(incenseCarryLight);
  offeringIncenseGroup.visible = false;

  // --- 가부좌 (Cross-legged sitting posture) ---
  const seatedGroup = new THREE.Group();
  root.add(seatedGroup);

  // Wide crossed lap covering the cushion
  const lap = addMesh(seatedGroup, new THREE.SphereGeometry(0.38, 20, 16), robe, new THREE.Vector3(0, 0.14, 0.08));
  lap.scale.set(1.36, 0.46, 1.08);

  // Left & right crossed knees resting gently on the lotus cushion
  const leftKnee = addMesh(seatedGroup, new THREE.SphereGeometry(0.2, 16, 12), robe, new THREE.Vector3(-0.28, 0.12, 0.15));
  const rightKnee = addMesh(seatedGroup, new THREE.SphereGeometry(0.2, 16, 12), robe, new THREE.Vector3(0.28, 0.12, 0.15));
  leftKnee.scale.set(1.22, 0.65, 1.4);
  rightKnee.scale.set(1.22, 0.65, 1.4);
  leftKnee.rotation.y = -0.35;
  rightKnee.rotation.y = 0.35;

  // White beoseon (korean traditional sock) feet peeking softly under robe
  const beoseonLeft = addMesh(seatedGroup, new THREE.SphereGeometry(0.065, 10, 8), sockWhite, new THREE.Vector3(-0.11, 0.06, 0.28));
  beoseonLeft.scale.set(1.2, 0.6, 1.6);
  beoseonLeft.rotation.y = 0.4;
  const beoseonRight = addMesh(seatedGroup, new THREE.SphereGeometry(0.065, 10, 8), sockWhite, new THREE.Vector3(0.11, 0.06, 0.28));
  beoseonRight.scale.set(1.2, 0.6, 1.6);
  beoseonRight.rotation.y = -0.4;

  // --- 꿇어앉기 다리 (Kneeling posture for authentic five-point prostrations: 오체투지 꿇은 다리) ---
  const kneelingGroup = new THREE.Group();
  root.add(kneelingGroup);
  kneelingGroup.visible = false;

  // Hips & Thighs resting down toward heels
  const kneelingThighs = addMesh(kneelingGroup, new THREE.CylinderGeometry(0.24, 0.28, 0.36, 16), robe, new THREE.Vector3(0, 0.16, -0.05));
  kneelingThighs.rotation.x = 0.38;

  // Left & right forward knees resting directly on the cushion
  const leftKneel = addMesh(kneelingGroup, new THREE.SphereGeometry(0.14, 14, 10), robe, new THREE.Vector3(-0.15, 0.11, 0.14));
  leftKneel.scale.set(1.0, 0.72, 1.3);
  const rightKneel = addMesh(kneelingGroup, new THREE.SphereGeometry(0.14, 14, 10), robe, new THREE.Vector3(0.15, 0.11, 0.14));
  rightKneel.scale.set(1.0, 0.72, 1.3);

  // Left & right shins extending backwards from knees to feet
  for (const side of [-1, 1]) {
    const shin = addMesh(kneelingGroup, new THREE.CylinderGeometry(0.095, 0.08, 0.32, 12), robe, new THREE.Vector3(side * 0.15, 0.08, -0.04));
    shin.rotation.x = Math.PI / 2;
  }

  // White beoseon (traditional Korean socks) resting flat with soles pointing up behind the monk
  const beoseonKneelL = addMesh(kneelingGroup, new THREE.SphereGeometry(0.055, 10, 8), sockWhite, new THREE.Vector3(-0.11, 0.05, -0.22));
  beoseonKneelL.scale.set(1.0, 0.55, 1.4);
  const beoseonKneelR = addMesh(kneelingGroup, new THREE.SphereGeometry(0.055, 10, 8), sockWhite, new THREE.Vector3(0.11, 0.05, -0.22));
  beoseonKneelR.scale.set(1.0, 0.55, 1.4);

  // --- Standing / Walking Legs (used during walking and standing Hapjang) ---
  const standingLegsGroup = new THREE.Group();
  root.add(standingLegsGroup);
  standingLegsGroup.visible = false;

  const legGeometry = new THREE.SphereGeometry(1, 14, 10);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.22, 0.02);
  standingLegsGroup.add(leftLeg);
  const leftFoot = addMesh(leftLeg, legGeometry, robeShadow, new THREE.Vector3(-0.06, -0.06, 0.06));
  leftFoot.scale.set(0.17, 0.12, 0.34);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.22, 0.02);
  standingLegsGroup.add(rightLeg);
  const rightFoot = addMesh(rightLeg, legGeometry, robeShadow, new THREE.Vector3(0.06, -0.06, 0.06));
  rightFoot.scale.set(0.17, 0.12, 0.34);

  const nameTag = makeNameTag(profile?.name ?? "");
  root.add(nameTag);

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !(obj instanceof THREE.Sprite)) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root,
    upperBody,
    head,
    leftArm,
    rightArm,
    leftHandGroup,
    rightHandGroup,
    standingLegsGroup,
    leftLeg,
    rightLeg,
    seatedGroup,
    kneelingGroup,
    offeringCandleGroup,
    offeringIncenseGroup,
    leftKnee,
    rightKnee,
    lap,
    robeMaterial: robe,
    robeShadowMaterial: robeShadow,
    maleHairGroup,
    femaleHairGroup,
    nameTag,
    isSeated: true,
  };
}

// Helper to make a canvas wish streamer texture
function makeWishTexture(wishText: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Warm Hanji background
    ctx.fillStyle = "#fdf5e6";
    ctx.fillRect(0, 0, 256, 768);

    // Hanji border
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 748);

    ctx.strokeStyle = "#e8c976";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 224, 736);

    // Header stamp
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.roundRect(88, 32, 80, 36, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px 'Noto Serif KR', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("발원(發願)", 128, 50);

    // Vertical / wrapped wish text in Korean
    ctx.fillStyle = "#271b14";
    ctx.font = "500 24px 'Noto Serif KR', serif";
    const cleanWish = wishText.trim() || "마음의 평안과 소원 성취";
    const chars = Array.from(cleanWish);
    let y = 110;
    for (let i = 0; i < Math.min(chars.length, 16); i += 1) {
      ctx.fillText(chars[i], 128, y);
      y += 34;
    }

    // Seal at bottom
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.arc(128, 680, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef3c7";
    ctx.font = "bold 22px serif";
    ctx.fillText("산사", 128, 680);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateLanterns(group: THREE.Group, lanterns: TempleLantern[]) {
  group.children.forEach((child) => child.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  }));
  group.clear();

  const darkWood = makeMaterial(0x382218, 0.45);
  const goldMetal = makeMaterial(0xeab308, 0.35, { metalness: 0.72 });
  const glowingCoreMat = new THREE.MeshBasicMaterial({ color: 0xffe6a3 });

  // Lotus petal tiers
  const outerPetalMat = makeMaterial(0xd94676, 0.45, { emissive: 0x591328, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  const midPetalMat = makeMaterial(0xf472b6, 0.4, { emissive: 0x752144, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  const innerPetalMat = makeMaterial(0xfde047, 0.4, { emissive: 0x8a620b, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const calyxMat = makeMaterial(0x166534, 0.55);

  const crimsonSilk = makeMaterial(0xb91c1c, 0.65);
  const goldSilk = makeMaterial(0xd97706, 0.55, { metalness: 0.4 });

  const ribbons: THREE.Mesh[] = [];

  // Default temple festival ceiling lanterns if user hasn't added many, or along with user lanterns
  const allLanterns = lanterns.length > 0
    ? lanterns
    : [
        { id: 101, wish: "온 누리에 평화와 자비가 깃들기를", left: 20 },
        { id: 102, wish: "가족의 평안과 건강을 발원합니다", left: 50 },
        { id: 103, wish: "모든 중생 번뇌 소멸하고 지혜롭기를", left: 80 },
      ];

  allLanterns.forEach((lantern, index) => {
    const x = (lantern.left / 100 - 0.5) * 8.6;
    const z = -0.3 + (index % 3) * 0.65;
    const yCenter = 4.75;

    const lanternRoot = new THREE.Group();
    lanternRoot.position.set(x, yCenter, z);
    lanternRoot.userData.lanternId = lantern.id;
    group.add(lanternRoot);

    // 1. Ceiling hanging cord & brass ring
    addCylinder(lanternRoot, 0.012, 0.012, 0.44, goldSilk, 0, 0.68, 0, 8);
    const topRing = addMesh(lanternRoot, new THREE.TorusGeometry(0.045, 0.012, 8, 20), goldMetal, new THREE.Vector3(0, 0.46, 0));
    topRing.rotation.x = Math.PI / 2;

    // 2. Korean traditional octagonal wooden cap (팔모 정자 갓)
    addCylinder(lanternRoot, 0.04, 0.32, 0.12, darkWood, 0, 0.38, 0, 8);
    addCylinder(lanternRoot, 0.33, 0.33, 0.04, goldMetal, 0, 0.31, 0, 8);

    // 3. Glowing lantern heart (inside candle bulb)
    addMesh(lanternRoot, new THREE.SphereGeometry(0.18, 16, 12), glowingCoreMat, new THREE.Vector3(0, 0.08, 0));

    // 4. Exquisite 3-tier layered lotus petals (피어나는 연꽃 봉오리)
    // Tier 1: Outer wide petals (8 petals)
    for (let p = 0; p < 8; p += 1) {
      const angle = (p / 8) * Math.PI * 2;
      const petal = addMesh(
        lanternRoot,
        new THREE.SphereGeometry(1, 14, 10),
        outerPetalMat,
        new THREE.Vector3(Math.cos(angle) * 0.24, 0.04, Math.sin(angle) * 0.24),
      );
      petal.scale.set(0.15, 0.06, 0.34);
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = 0.22;
    }

    // Tier 2: Mid petals (8 petals offset by 22.5 deg)
    for (let p = 0; p < 8; p += 1) {
      const angle = (p / 8) * Math.PI * 2 + Math.PI / 8;
      const petal = addMesh(
        lanternRoot,
        new THREE.SphereGeometry(1, 14, 10),
        midPetalMat,
        new THREE.Vector3(Math.cos(angle) * 0.18, 0.14, Math.sin(angle) * 0.18),
      );
      petal.scale.set(0.13, 0.05, 0.28);
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = 0.15;
    }

    // Tier 3: Inner golden blooming petals (6 petals)
    for (let p = 0; p < 6; p += 1) {
      const angle = (p / 6) * Math.PI * 2;
      const petal = addMesh(
        lanternRoot,
        new THREE.SphereGeometry(1, 12, 10),
        innerPetalMat,
        new THREE.Vector3(Math.cos(angle) * 0.11, 0.21, Math.sin(angle) * 0.11),
      );
      petal.scale.set(0.1, 0.04, 0.2);
      petal.rotation.y = -angle + Math.PI / 2;
      petal.rotation.x = 0.08;
    }

    // 5. Lower Calyx & Gold base rim
    addCylinder(lanternRoot, 0.2, 0.14, 0.08, calyxMat, 0, -0.09, 0, 8);
    addCylinder(lanternRoot, 0.14, 0.14, 0.035, goldMetal, 0, -0.14, 0, 8);

    // 6. Traditional silk norigae knot & dangling silk tassels
    const knot = addMesh(lanternRoot, new THREE.SphereGeometry(0.065, 12, 10), crimsonSilk, new THREE.Vector3(0, -0.22, 0));
    knot.scale.set(0.8, 1.3, 0.8);

    for (let t = 0; t < 5; t += 1) {
      const offset = (t - 2) * 0.036;
      addCylinder(lanternRoot, 0.007, 0.01, 0.36 - Math.abs(offset) * 1.5, t % 2 === 0 ? crimsonSilk : goldSilk, offset, -0.42, 0, 6);
    }

    // 7. Fluttering Hanji Wish Streamer (한지 소원지) with real wish calligraphy
    const wishTex = makeWishTexture(lantern.wish);
    const hanjiMaterial = new THREE.MeshStandardMaterial({
      map: wishTex,
      roughness: 0.88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    });

    const ribbonGeo = new THREE.PlaneGeometry(0.28, 0.88, 4, 16);
    const ribbonPositions = ribbonGeo.attributes.position;
    for (let v = 0; v < ribbonPositions.count; v += 1) {
      const vy = ribbonPositions.getY(v);
      const wave = Math.sin((vy + 0.44) * Math.PI * 2.4) * 0.03;
      ribbonPositions.setX(v, ribbonPositions.getX(v) + wave);
    }
    ribbonGeo.computeVertexNormals();

    const ribbon = addMesh(lanternRoot, ribbonGeo, hanjiMaterial, new THREE.Vector3(0.14, -0.62, 0.08));
    ribbon.rotation.set(0.04, 0.3, -0.06);
    ribbon.userData.ribbonPhase = index * 1.1;
    ribbon.userData.baseRotationZ = ribbon.rotation.z;
    ribbon.userData.wish = lantern.wish;
    ribbons.push(ribbon);

    // Warm lantern light glow
    const glow = new THREE.PointLight(0xffbe5c, 0.55, 3.2, 2);
    glow.position.set(0, 0.08, 0);
    lanternRoot.add(glow);
  });

  return ribbons;
}

const timePalettes: Record<TempleTimePeriod, { background: number; fog: number; sky: number; ground: number; ambient: number; sunlight: number; sunColor: number; candle: number }> = {
  dawn: { background: 0x152637, fog: 0x3c596a, sky: 0x9bb7d5, ground: 0x344353, ambient: 0.82, sunlight: 1.05, sunColor: 0xb5d5f3, candle: 0.92 },
  day: { background: 0x33281e, fog: 0x765633, sky: 0xffe6be, ground: 0x453222, ambient: 1.15, sunlight: 2.45, sunColor: 0xffd18a, candle: 0.78 },
  sunset: { background: 0x321c1b, fog: 0xa65739, sky: 0xf6a37a, ground: 0x4d3025, ambient: 0.9, sunlight: 1.85, sunColor: 0xff895d, candle: 1.02 },
  // Night mode: warm ambient candlelight wash with cozy amber hues so meditator faces never look cold/pale
  night: { background: 0x0c121e, fog: 0x161e2b, sky: 0x241d18, ground: 0x1f1610, ambient: 0.92, sunlight: 0.42, sunColor: 0xffb066, candle: 2.2 },
};

function applyEnvironment(scene: THREE.Scene, theme: SceneTheme, candleLights: THREE.PointLight[], hall: TempleHall, period: TempleTimePeriod) {
  const palette = timePalettes[period];
  const mountain = hall === "mountain";
  const pureLand = hall === "pureLand";
  const background = mountain ? (period === "night" ? 0x07121a : period === "sunset" ? 0x593a34 : 0x243b31) : palette.background;
  const fogColor = mountain ? (period === "night" ? 0x14252a : period === "sunset" ? 0x82604c : 0x516556) : pureLand && period !== "night" ? 0x825c72 : palette.fog;

  scene.background = new THREE.Color(background);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.set(fogColor);
    scene.fog.near = mountain ? 6 : 16;
    scene.fog.far = mountain ? 25 : 29;
  }
  theme.roomGroup.visible = !mountain;
  theme.forestGroup.visible = mountain;
  theme.altarGroup.visible = !mountain;

  theme.hemisphere.color.set(mountain ? (period === "night" ? 0x8497a7 : 0xc3d0b1) : pureLand ? 0xffd7e5 : palette.sky);
  theme.hemisphere.groundColor.set(mountain ? 0x293830 : pureLand ? 0x4c3548 : palette.ground);
  theme.hemisphere.intensity = mountain ? palette.ambient * 0.78 : pureLand ? palette.ambient * 1.05 : palette.ambient;
  theme.ambient.color.set(mountain ? 0xd2dec4 : pureLand ? 0xffcfdf : (period === "night" ? 0xffca85 : palette.sky));
  theme.ambient.intensity = mountain ? palette.ambient * 0.45 : pureLand ? palette.ambient * 0.6 : palette.ambient * 0.65;
  theme.keyLight.color.set(mountain ? (period === "night" ? 0x91a7bc : 0xc3d8b7) : pureLand ? 0xffbad5 : palette.sunColor);
  theme.keyLight.intensity = mountain ? palette.sunlight * 0.58 : pureLand ? palette.sunlight * 0.82 : palette.sunlight;
  theme.altarGlow.color.set(pureLand ? 0xffa4cd : 0xffca65);
  theme.altarGlow.intensity = mountain ? 0 : (period === "night" ? 2.6 : pureLand ? 1.9 : 1.5);
  theme.altarGlow.visible = !mountain;

  theme.statueGold.color.set(pureLand ? 0xeac88a : 0xe4b84f);
  theme.statueGold.emissive.set(pureLand ? 0x5c304a : 0x4e2e08);
  theme.statueLight.color.set(pureLand ? 0xf2d0d5 : 0xf0cd73);
  theme.haloMaterial.color.set(pureLand ? 0xffb7da : 0xf3cb72);
  theme.haloInnerMaterial.color.set(pureLand ? 0xe5c7ff : 0xffe4a2);

  const woodColor = period === "night" ? 0x5a4138 : period === "dawn" ? 0x6a4c39 : 0x7b4930;
  theme.woodMaterials[1].color.set(woodColor);
  theme.floorMaterial.color.set(mountain ? 0x29372d : pureLand ? 0x63434d : period === "night" ? 0x604638 : 0x805638);
  theme.seatMaterials[0].color.set(pureLand ? 0x69364c : mountain ? 0x38483a : 0x742c29);
  theme.seatMaterials[1].color.set(pureLand ? 0x9d597c : mountain ? 0x60724f : 0x9b3d32);
  theme.seatMaterials[2].color.set(pureLand ? 0xa65b94 : mountain ? 0x536d48 : 0xb34b3c);
  theme.seatMaterials[3].color.set(pureLand ? 0xd37ea2 : mountain ? 0x728451 : 0xd16f4c);
  theme.seatMaterials[4].color.set(pureLand ? 0xe1b4c9 : mountain ? 0xb7a16d : 0xe1b764);
  theme.forestMaterials[0].color.set(period === "night" ? 0x172b24 : 0x29372d);
  theme.forestMaterials[1].color.set(period === "night" ? 0x343d39 : 0x565c52);
  theme.forestMaterials[2].color.set(period === "night" ? 0x263a32 : 0x334638);

  candleLights.forEach((light) => {
    light.visible = !mountain;
    light.color.set(pureLand ? 0xff9fca : 0xff9f3a);
    light.intensity = palette.candle;
    light.userData.environmentIntensity = palette.candle;
  });
}

function syncFriendMonks(
  scene: THREE.Scene,
  friends: MonkRig[],
  seatPositions: THREE.Vector3[],
  companions: CompanionPractitioner[] = []
) {
  // 1. Remove friends whose id is no longer in companions
  const desiredMap = new Map(companions.map((c) => [c.id, c]));
  for (let i = friends.length - 1; i >= 0; i -= 1) {
    const friend = friends[i];
    const compId = friend.root.userData.companionId as string | undefined;
    if (!compId || !desiredMap.has(compId)) {
      scene.remove(friend.root);
      friend.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
        if (obj instanceof THREE.Sprite) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      friends.splice(i, 1);
    }
  }

  // 2. Add or update companion monks
  const existingMap = new Map(friends.map((f) => [f.root.userData.companionId as string, f]));
  for (const comp of companions) {
    const existing = existingMap.get(comp.id);
    if (!existing) {
      if (seatPositions[comp.seatIndex]) {
        const position = seatPositions[comp.seatIndex].clone();
        position.y = 0.28;
        const rig = createNovice(scene, position, false, comp);
        rig.root.userData.companionId = comp.id;
        rig.root.userData.seatIndex = comp.seatIndex;
        rig.root.rotation.y = Math.PI;
        rig.isSeated = true;
        rig.seatedGroup.visible = true;
        rig.standingLegsGroup.visible = false;
        rig.kneelingGroup.visible = false;
        rig.upperBody.position.y = 0.44;
        friends.push(rig);
      }
    } else {
      if (existing.root.userData.seatIndex !== comp.seatIndex && seatPositions[comp.seatIndex]) {
        const position = seatPositions[comp.seatIndex].clone();
        position.y = 0.28;
        existing.root.position.copy(position);
        existing.root.userData.seatIndex = comp.seatIndex;
      }
    }
  }
}

export default function TempleScene({
  companions,
  friendSeats,
  ownSeat,
  pose,
  bowSequence,
  meritSequence,
  profile,
  hall,
  timePeriod,
  wishLanterns,
  onSeatSelect,
  cameraPreset = "hall",
  zoomAction = null,
  candleSequence = 0,
  incenseSequence = 0,
  buddhaScale = "normal",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({
    companions,
    friendSeats,
    ownSeat,
    pose,
    bowSequence,
    meritSequence,
    profile,
    hall,
    timePeriod,
    wishLanterns,
    onSeatSelect,
    cameraPreset,
    zoomAction,
    candleSequence,
    incenseSequence,
    buddhaScale,
  });
  const apiRef = useRef<SceneApi | null>(null);
  propsRef.current = {
    companions,
    friendSeats,
    ownSeat,
    pose,
    bowSequence,
    meritSequence,
    profile,
    hall,
    timePeriod,
    wishLanterns,
    onSeatSelect,
    cameraPreset,
    zoomAction,
    candleSequence,
    incenseSequence,
    buddhaScale,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const mobileView = window.innerWidth < 700;
    const camera = new THREE.PerspectiveCamera(mobileView ? 46 : 38, 1, 0.1, 60);
    // Bring camera significantly closer: characters, cushions, and altar appear prominent and clear
    camera.position.set(0, mobileView ? 2.9 : 2.5, mobileView ? 7.6 : 7.0);
    camera.lookAt(0, 1.0, 1.4);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = true;
    // Allow zooming all the way in to see the monk's face, hands, and cushions up close
    controls.minDistance = 1.0;
    controls.maxDistance = 15.0;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 1.0, 1.4);

    const seatMeshes: THREE.Object3D[] = [];
    const seatPositions: THREE.Vector3[] = [];
    const candleLights: THREE.PointLight[] = [];
    const candleFlames: THREE.Mesh[] = [];
    const theme = createTemple(scene, seatMeshes, seatPositions, candleLights, candleFlames);
    applyEnvironment(scene, theme, candleLights, propsRef.current.hall, propsRef.current.timePeriod);
    const moktak = createMoktak(scene);

    const selectedGlow = addMesh(
      scene,
      new THREE.TorusGeometry(0.78, 0.025, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd77d, transparent: true, opacity: 0.9 }),
      new THREE.Vector3(0, 0.035, 0),
    );
    selectedGlow.rotation.x = -Math.PI / 2;
    selectedGlow.visible = false;

    // Golden lotus click ripple ring on floor when walking (산사 특유의 발걸음 파문 이펙트)
    const rippleGeometry = new THREE.RingGeometry(0.05, 0.12, 32);
    const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0xffd978, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial);
    rippleMesh.rotation.x = -Math.PI / 2;
    rippleMesh.position.y = 0.025;
    rippleMesh.visible = false;
    scene.add(rippleMesh);
    let rippleStartTime = 0;

    const wishGroup = new THREE.Group();
    scene.add(wishGroup);
    const wishRibbons = updateLanterns(wishGroup, propsRef.current.wishLanterns);

    const self = createNovice(scene, new THREE.Vector3(0, 0, 5.75), true, propsRef.current.profile);

    // Friends seated peacefully in 가부좌 facing the Buddha and altar (불상을 향해 정좌)
    const activeCompanions = propsRef.current.companions ?? [];
    const friends = activeCompanions.map((comp) => {
      const position = seatPositions[comp.seatIndex].clone();
      position.y = 0.28;
      const rig = createNovice(scene, position, false, comp);
      rig.root.userData.companionId = comp.id;
      rig.root.userData.seatIndex = comp.seatIndex;
      rig.root.rotation.y = Math.PI; // Reverently face the Buddha statue at negative Z
      rig.isSeated = true;
      rig.seatedGroup.visible = true;
      rig.standingLegsGroup.visible = false;
      rig.kneelingGroup.visible = false;
      rig.upperBody.position.y = 0.44;
      return rig;
    });

    const floor = theme.raycastFloor;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const target = new THREE.Vector3(0, 0, 5.75);
    const animationStart = performance.now();
    let lastFrameTime = performance.now();
    let walkCycle = 0;
    let targetSeat = propsRef.current.ownSeat;
    let lastSyncedSeat = propsRef.current.ownSeat;
    let ignoreNextNullSync = false;
    let bowStartedAt = -10;
    let lastBowSequence = propsRef.current.bowSequence;
    let meritStartedAt = -10;
    let lastMeritSequence = propsRef.current.meritSequence;
    let animationFrame = 0;

    if (propsRef.current.ownSeat !== null) {
      target.copy(seatPositions[propsRef.current.ownSeat]);
      self.root.position.copy(target);
      self.root.rotation.y = Math.PI; // Reverently face the Buddha statue
      selectedGlow.position.set(target.x, 0.035, target.z);
      selectedGlow.visible = true;
    }

    const api: SceneApi = {
      scene,
      camera,
      renderer,
      controls,
      raycaster,
      floor,
      seatMeshes,
      seatPositions,
      self,
      friends,
      target,
      targetSeat,
      lastSyncedSeat,
      ignoreNextNullSync,
      selectedGlow,
      wishGroup,
      wishRibbons,
      candleLights,
      candleFlames,
      theme,
      profileSignature: profileSignature(propsRef.current.profile),
      moktakGroup: moktak.group,
      moktakMallet: moktak.mallet,
      meritWave: moktak.wave,
      meritStartedAt,
      lastMeritSequence,
      hall: propsRef.current.hall,
      timePeriod: propsRef.current.timePeriod,
      bowStartedAt,
      lastBowSequence,
      pendingBow: false,
      candleFlareStartedAt: -10,
      lastCandleSequence: propsRef.current.candleSequence,
      candleOfferingState: "idle",
      candleOfferingStartTime: -10,
      candleOfferingReturnPos: target.clone(),
      candleOfferingFlared: false,
      lastIncenseSequence: propsRef.current.incenseSequence ?? 0,
      incenseOfferingState: "idle",
      incenseOfferingStartTime: -10,
      incenseOfferingReturnPos: target.clone(),
      incenseOfferingFlared: false,
      incenseFlareStartedAt: -10,
    };
    apiRef.current = api;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.fov = width < 700 ? 46 : 38;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const cameraTargetPos = new THREE.Vector3();
    const controlsTargetPos = new THREE.Vector3();
    let isCameraAnimating = false;
    let lastCameraPreset = propsRef.current.cameraPreset;
    let lastZoomActionId = propsRef.current.zoomAction?.id ?? 0;

    controls.addEventListener("start", () => {
      isCameraAnimating = false;
    });

    const clickScene = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const seatHit = raycaster.intersectObjects(seatMeshes, false).find((hit) => {
        const seatIndex = hit.object.userData.seatIndex;
        const occupiedSeats = propsRef.current.companions?.map((c) => c.seatIndex) ?? (propsRef.current.friendSeats ?? []);
        return Number.isInteger(seatIndex)
          && !occupiedSeats.includes(seatIndex as number)
          && propsRef.current.ownSeat !== seatIndex;
      });
      if (seatHit) {
        const seatIndex = seatHit.object.userData.seatIndex as number;
        target.copy(seatPositions[seatIndex]);
        api.targetSeat = seatIndex;
        api.ignoreNextNullSync = false;
        propsRef.current.onSeatSelect(seatIndex);
        return;
      }
      const floorHit = raycaster.intersectObject(floor, false)[0];
      if (!floorHit) return;
      target.set(
        THREE.MathUtils.clamp(floorHit.point.x, -4.2, 4.2),
        0,
        THREE.MathUtils.clamp(floorHit.point.z, -6, 6),
      );
      rippleMesh.position.set(target.x, 0.025, target.z);
      rippleMesh.scale.set(1, 1, 1);
      rippleMaterial.opacity = 0.85;
      rippleMesh.visible = true;
      rippleStartTime = performance.now();
      api.targetSeat = null;
      api.ignoreNextNullSync = propsRef.current.ownSeat !== null;
      selectedGlow.visible = false;
      propsRef.current.onSeatSelect(null);
    };
    canvas.addEventListener("click", clickScene);

    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const elapsed = (performance.now() - animationStart) / 1000;
      const currentProps = propsRef.current;

      if (rippleMesh.visible) {
        const rippleProgress = (performance.now() - rippleStartTime) / 600;
        if (rippleProgress < 1) {
          const scale = 1 + rippleProgress * 4.2;
          rippleMesh.scale.set(scale, scale, 1);
          rippleMaterial.opacity = (1 - rippleProgress) * 0.85;
        } else {
          rippleMesh.visible = false;
        }
      }

      if (currentProps.cameraPreset !== lastCameraPreset) {
        lastCameraPreset = currentProps.cameraPreset;
        if (currentProps.cameraPreset === "monk") {
          const monkPos = self.root.position;
          cameraTargetPos.set(monkPos.x * 0.4, 1.35, monkPos.z + 2.3);
          controlsTargetPos.set(monkPos.x, 0.65, monkPos.z - 0.35);
          isCameraAnimating = true;
        } else if (currentProps.cameraPreset === "hall") {
          cameraTargetPos.set(0, mobileView ? 2.9 : 2.5, mobileView ? 7.6 : 7.0);
          controlsTargetPos.set(0, 1.0, 1.4);
          isCameraAnimating = true;
        } else if (currentProps.cameraPreset === "altar") {
          const isGrand = currentProps.buddhaScale === "grand3x";
          cameraTargetPos.set(0, isGrand ? 2.6 : 2.15, isGrand ? -0.6 : -1.7);
          controlsTargetPos.set(0, isGrand ? 3.2 : 2.25, -5.1);
          isCameraAnimating = true;
        }
      }

      if (currentProps.zoomAction && currentProps.zoomAction.id !== lastZoomActionId) {
        lastZoomActionId = currentProps.zoomAction.id;
        const type = currentProps.zoomAction.type;
        const dir = camera.position.clone().sub(controls.target);
        if (type === "in") {
          if (dir.length() > 1.2) {
            camera.position.sub(dir.multiplyScalar(0.25));
          }
        } else if (type === "out") {
          if (dir.length() < 14) {
            camera.position.add(dir.multiplyScalar(0.25));
          }
        } else if (type === "reset") {
          cameraTargetPos.set(0, mobileView ? 2.9 : 2.5, mobileView ? 7.6 : 7.0);
          controlsTargetPos.set(0, 1.0, 1.4);
          isCameraAnimating = true;
        }
      }

      if (isCameraAnimating) {
        camera.position.lerp(cameraTargetPos, 0.08);
        controls.target.lerp(controlsTargetPos, 0.08);
        if (camera.position.distanceTo(cameraTargetPos) < 0.03 && controls.target.distanceTo(controlsTargetPos) < 0.03) {
          camera.position.copy(cameraTargetPos);
          controls.target.copy(controlsTargetPos);
          isCameraAnimating = false;
        }
      }

      const targetBuddhaScale = currentProps.buddhaScale === "grand3x" ? 2.85 : 1.68;
      theme.buddhaEnsemble.scale.lerp(
        new THREE.Vector3(targetBuddhaScale, targetBuddhaScale, targetBuddhaScale),
        0.08
      );

      if (api.hall !== currentProps.hall || api.timePeriod !== currentProps.timePeriod) {
        api.hall = currentProps.hall;
        api.timePeriod = currentProps.timePeriod;
        applyEnvironment(scene, theme, candleLights, currentProps.hall, currentProps.timePeriod);
      }

      const currentProfileSignature = profileSignature(currentProps.profile);
      if (api.profileSignature !== currentProfileSignature) {
        api.profileSignature = currentProfileSignature;
        updateNoviceProfile(self, currentProps.profile);
      }

      if (api.lastSyncedSeat !== currentProps.ownSeat) {
        if (api.ignoreNextNullSync && currentProps.ownSeat === null) {
          api.ignoreNextNullSync = false;
          api.lastSyncedSeat = null;
        } else {
          api.lastSyncedSeat = currentProps.ownSeat;
          api.targetSeat = currentProps.ownSeat;
          if (currentProps.ownSeat !== null) {
            target.copy(seatPositions[currentProps.ownSeat]);
            selectedGlow.position.set(target.x, 0.035, target.z);
            selectedGlow.visible = true;
          } else {
            target.set(0, 0, 5.75);
            selectedGlow.visible = false;
          }
        }
      }

      if (api.lastBowSequence !== currentProps.bowSequence) {
        api.lastBowSequence = currentProps.bowSequence;
        const distToTarget = Math.hypot(target.x - self.root.position.x, target.z - self.root.position.z);
        if (distToTarget > 0.12) {
          api.pendingBow = true;
        } else {
          api.bowStartedAt = elapsed;
          api.pendingBow = false;
        }
      }
      if (api.lastMeritSequence !== currentProps.meritSequence) {
        api.lastMeritSequence = currentProps.meritSequence;
        api.meritStartedAt = elapsed;
      }
      if (api.lastCandleSequence !== currentProps.candleSequence) {
        api.lastCandleSequence = currentProps.candleSequence;
        // Start full ceremonial candle offering: monk stands up and walks directly to Buddha altar table
        api.candleOfferingReturnPos.copy(
          currentProps.ownSeat !== null ? seatPositions[currentProps.ownSeat] : self.root.position
        );
        api.candleOfferingState = "walkingToAltar";
        api.candleOfferingStartTime = elapsed;
        api.candleOfferingFlared = false;
        // Walk directly in front of the central foreground offering table
        target.set(0, 0, -2.25);
      }

      if (api.lastIncenseSequence !== (currentProps.incenseSequence ?? 0)) {
        api.lastIncenseSequence = currentProps.incenseSequence ?? 0;
        // Start full ceremonial incense offering: monk stands up and walks directly to Buddha altar table
        api.incenseOfferingReturnPos.copy(
          currentProps.ownSeat !== null ? seatPositions[currentProps.ownSeat] : self.root.position
        );
        api.incenseOfferingState = "walkingToAltar";
        api.incenseOfferingStartTime = elapsed;
        api.incenseOfferingFlared = false;
        target.set(0, 0, -2.25);
      }

      // Delta time calculation for smooth constant-speed walking and physics
      const now = performance.now();
      const delta = Math.min(0.08, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const dx = target.x - self.root.position.x;
      const dz = target.z - self.root.position.z;
      const horizontalDistance = Math.hypot(dx, dz);
      const isWalking = horizontalDistance > 0.06;

      // Handle transitions between ceremonial offering states (Candle & Incense)
      const isRitualOffering = api.candleOfferingState !== "idle" || api.incenseOfferingState !== "idle";

      if (api.candleOfferingState === "walkingToAltar" || api.incenseOfferingState === "walkingToAltar") {
        // Dramatic 3/4 front-side perspective framing monk's hands, sacred offering, altar and Buddha statue without ANY obstruction!
        cameraTargetPos.set(mobileView ? 1.35 : 1.55, mobileView ? 1.5 : 1.45, mobileView ? -1.25 : -1.35);
        controlsTargetPos.set(0, 1.05, -2.85);
        isCameraAnimating = true;

        if (!isWalking) {
          if (api.candleOfferingState === "walkingToAltar") {
            api.candleOfferingState = "lightingCandle";
            api.candleOfferingStartTime = elapsed;
            api.candleOfferingFlared = false;
          } else if (api.incenseOfferingState === "walkingToAltar") {
            api.incenseOfferingState = "lightingIncense";
            api.incenseOfferingStartTime = elapsed;
            api.incenseOfferingFlared = false;
          }
        }
      } else if (api.candleOfferingState === "lightingCandle" || api.incenseOfferingState === "lightingIncense") {
        cameraTargetPos.set(mobileView ? 1.35 : 1.55, mobileView ? 1.5 : 1.45, mobileView ? -1.25 : -1.35);
        controlsTargetPos.set(0, 1.05, -2.85);
        isCameraAnimating = true;
      } else if (api.candleOfferingState === "returningToSeat" || api.incenseOfferingState === "returningToSeat") {
        if (!isWalking) {
          if (api.candleOfferingState === "returningToSeat") api.candleOfferingState = "idle";
          if (api.incenseOfferingState === "returningToSeat") api.incenseOfferingState = "idle";
          // Smoothly return camera to chosen preset
          if (currentProps.cameraPreset === "hall") {
            cameraTargetPos.set(0, mobileView ? 2.9 : 2.5, mobileView ? 7.6 : 7.0);
            controlsTargetPos.set(0, 1.0, 1.4);
            isCameraAnimating = true;
          } else if (currentProps.cameraPreset === "monk") {
            const monkPos = self.root.position;
            cameraTargetPos.set(monkPos.x * 0.4, 1.35, monkPos.z + 2.3);
            controlsTargetPos.set(monkPos.x, 0.65, monkPos.z - 0.35);
            isCameraAnimating = true;
          }
        }
      }

      if (api.pendingBow && !isWalking && !isRitualOffering) {
        api.pendingBow = false;
        api.bowStartedAt = elapsed;
      }

      // Walking vs Seated/Standing Movement
      if (isWalking) {
        const walkSpeed = 2.0; // 2.0 meters per second constant realistic walking speed
        const moveDist = Math.min(horizontalDistance, walkSpeed * delta);
        const ratio = moveDist / horizontalDistance;

        self.root.position.x += dx * ratio;
        self.root.position.z += dz * ratio;

        // Smooth facing rotation towards walking target
        const walkAngle = Math.atan2(dx, dz);
        let diffAngle = (walkAngle - self.root.rotation.y) % (Math.PI * 2);
        if (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        if (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        self.root.rotation.y += diffAngle * Math.min(1, delta * 12);

        // Walking leg stride animation
        walkCycle += delta * 9.5;
        self.standingLegsGroup.visible = true;
        self.seatedGroup.visible = false;
        self.kneelingGroup.visible = false;

        self.leftLeg.rotation.x = Math.sin(walkCycle) * 0.52;
        self.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.52;
        self.root.position.y = THREE.MathUtils.lerp(self.root.position.y, target.y + Math.abs(Math.sin(walkCycle)) * 0.038, 0.3);
        self.upperBody.position.set(0, 0.72, 0);
        self.upperBody.rotation.set(0, 0, 0);

        // If walking to altar with candle or incense, both hands reverently present the offering in front of chest!
        if (api.candleOfferingState === "walkingToAltar") {
          self.offeringCandleGroup.visible = true;
          self.offeringIncenseGroup.visible = false;
          self.offeringCandleGroup.position.set(0, 0.08 + Math.abs(Math.sin(walkCycle)) * 0.02, 0.40);
          self.leftArm.position.set(-0.2, 0.02, 0.18);
          self.rightArm.position.set(0.2, 0.02, 0.18);
          self.leftArm.rotation.set(0.55, 0.35, -0.2);
          self.rightArm.rotation.set(0.55, -0.35, 0.2);
          self.leftHandGroup.position.set(-0.06, -0.04, 0.36);
          self.rightHandGroup.position.set(0.06, -0.04, 0.36);
          self.leftHandGroup.rotation.set(0.15, 0.4, 0);
          self.rightHandGroup.rotation.set(0.15, -0.4, 0);
        } else if (api.incenseOfferingState === "walkingToAltar") {
          self.offeringCandleGroup.visible = false;
          self.offeringIncenseGroup.visible = true;
          self.offeringIncenseGroup.position.set(0, 0.08 + Math.abs(Math.sin(walkCycle)) * 0.02, 0.38);
          self.leftArm.position.set(-0.22, 0.04, 0.15);
          self.rightArm.position.set(0.22, 0.04, 0.15);
          self.leftArm.rotation.set(0.48, 0.32, -0.25);
          self.rightArm.rotation.set(0.48, -0.32, 0.25);
          self.leftHandGroup.position.set(-0.03, 0.01, 0.34);
          self.rightHandGroup.position.set(0.03, 0.01, 0.34);
          self.leftHandGroup.rotation.set(0.2, 0.3, 0.05);
          self.rightHandGroup.rotation.set(0.2, -0.3, -0.05);
        } else {
          self.offeringCandleGroup.visible = false;
          self.offeringIncenseGroup.visible = false;
          self.leftArm.position.set(-0.28, -0.06, 0.04);
          self.rightArm.position.set(0.28, -0.06, 0.04);
          self.leftArm.rotation.set(-Math.sin(walkCycle) * 0.28, 0, 0);
          self.rightArm.rotation.set(Math.sin(walkCycle) * 0.28, 0, 0);
          self.leftHandGroup.position.set(-0.08, -0.22, 0.22);
          self.rightHandGroup.position.set(0.08, -0.22, 0.22);
          self.leftHandGroup.rotation.set(0, 0, 0);
          self.rightHandGroup.rotation.set(0, 0, 0);
        }
      } else {
        self.root.position.x = target.x;
        self.root.position.z = target.z;
        self.root.position.y = THREE.MathUtils.lerp(self.root.position.y, target.y, 0.2);
        self.leftLeg.rotation.x = 0;
        self.rightLeg.rotation.x = 0;

        // Smoothly face the Buddha statue and altar (Math.PI)
        let diffAngle = (Math.PI - self.root.rotation.y) % (Math.PI * 2);
        if (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        if (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        self.root.rotation.y += diffAngle * Math.min(1, delta * 8);
      }

      const activePose = currentProps.pose;
      const isSeatedOnCushion = currentProps.ownSeat !== null && !isWalking && !isRitualOffering;

      // Authentic Buddhist Five-Point Prostration (정통 오체투지 & 접족례)
      // Cycle: 4.8s total duration per prostration
      const bowDuration = 4.8;
      const isBowing = activePose === "bow" && !isWalking && !isRitualOffering && (elapsed - api.bowStartedAt >= 0) && (elapsed - api.bowStartedAt < bowDuration * 3.2);
      const bowElapsed = isBowing ? (elapsed - api.bowStartedAt) % bowDuration : 0;
      const bowPhase = isBowing ? bowElapsed / bowDuration : 0;

      if (!isWalking) {
        if (api.candleOfferingState === "lightingCandle") {
          const offeringElapsed = elapsed - api.candleOfferingStartTime;
          self.root.position.set(0, 0, -2.25);
          self.root.rotation.y = Math.PI; // Reverently face the Buddha statue and altar
          self.standingLegsGroup.visible = true;
          self.seatedGroup.visible = false;
          self.kneelingGroup.visible = false;
          self.upperBody.position.set(0, 0.72, 0);

          if (offeringElapsed < 0.8) {
            // Phase 1: Pausing reverently before the altar table, holding glowing lotus candle
            self.offeringCandleGroup.visible = true;
            self.offeringIncenseGroup.visible = false;
            self.offeringCandleGroup.position.set(0, 0.08, 0.40);
            self.upperBody.rotation.set(0.12, 0, 0);

            self.leftArm.position.set(-0.2, 0.02, 0.18);
            self.rightArm.position.set(0.2, 0.02, 0.18);
            self.leftArm.rotation.set(0.55, 0.35, -0.2);
            self.rightArm.rotation.set(0.55, -0.35, 0.2);
            self.leftHandGroup.position.set(-0.06, -0.04, 0.36);
            self.rightHandGroup.position.set(0.06, -0.04, 0.36);
            self.leftHandGroup.rotation.set(0.15, 0.4, 0);
            self.rightHandGroup.rotation.set(0.15, -0.4, 0);
          } else if (offeringElapsed < 2.5) {
            // Phase 2: Reaching forward over altar table and offering the lotus candle onto the altar
            self.offeringCandleGroup.visible = true;
            self.offeringIncenseGroup.visible = false;
            const reachT = (offeringElapsed - 0.8) / 1.7;
            const reachP = THREE.MathUtils.smoothstep(reachT, 0, 1);

            self.upperBody.rotation.set(0.12 + Math.sin(reachT * Math.PI) * 0.18, 0, 0);

            self.leftArm.position.set(-0.2 + reachP * 0.04, 0.02 - reachP * 0.06, 0.18 + reachP * 0.28);
            self.rightArm.position.set(0.2 - reachP * 0.04, 0.02 - reachP * 0.06, 0.18 + reachP * 0.28);
            self.leftHandGroup.position.set(-0.06, -0.04 - reachP * 0.08, 0.36 + reachP * 0.35);
            self.rightHandGroup.position.set(0.06, -0.04 - reachP * 0.08, 0.36 + reachP * 0.35);
            self.offeringCandleGroup.position.set(0, 0.08 - reachP * 0.14, 0.40 + reachP * 0.46);

            if (reachT >= 0.45 && !api.candleOfferingFlared) {
              api.candleOfferingFlared = true;
              api.candleFlareStartedAt = elapsed;
            }
          } else if (offeringElapsed < 4.2) {
            // Phase 3: Candle placed on the altar stand, hands together in deep Hapjang, bowing deeply before Buddha
            self.offeringCandleGroup.visible = false;
            self.offeringIncenseGroup.visible = false;
            const bowT = (offeringElapsed - 2.5) / 1.7;
            self.upperBody.rotation.set(0.12 + Math.sin(bowT * Math.PI) * 0.36, 0, 0);

            self.leftArm.position.set(-0.24, 0.06, 0.12);
            self.rightArm.position.set(0.24, 0.06, 0.12);
            self.leftArm.rotation.set(0.42, 0.36, -0.32);
            self.rightArm.rotation.set(0.42, -0.36, 0.32);
            self.leftHandGroup.position.set(-0.02, 0.02, 0.34);
            self.rightHandGroup.position.set(0.02, 0.02, 0.34);
            self.leftHandGroup.rotation.set(0.24, 0.35, 0.05);
            self.rightHandGroup.rotation.set(0.24, -0.35, -0.05);
          } else {
            // Ritual at altar finished: start walking back to original seat
            api.candleOfferingState = "returningToSeat";
            target.copy(api.candleOfferingReturnPos);
          }
        } else if (api.incenseOfferingState === "lightingIncense") {
          const incenseElapsed = elapsed - api.incenseOfferingStartTime;
          self.root.position.set(0, 0, -2.25);
          self.root.rotation.y = Math.PI; // Reverently face the Buddha statue and altar
          self.standingLegsGroup.visible = true;
          self.seatedGroup.visible = false;
          self.kneelingGroup.visible = false;
          self.upperBody.position.set(0, 0.72, 0);

          if (incenseElapsed < 0.8) {
            // Phase 1: Pausing reverently before the incense burner holding burning incense sticks
            self.offeringIncenseGroup.visible = true;
            self.offeringCandleGroup.visible = false;
            self.offeringIncenseGroup.position.set(0, 0.08, 0.38);
            self.upperBody.rotation.set(0.12, 0, 0);

            self.leftArm.position.set(-0.22, 0.04, 0.15);
            self.rightArm.position.set(0.22, 0.04, 0.15);
            self.leftArm.rotation.set(0.48, 0.32, -0.25);
            self.rightArm.rotation.set(0.48, -0.32, 0.25);
            self.leftHandGroup.position.set(-0.03, 0.01, 0.34);
            self.rightHandGroup.position.set(0.03, 0.01, 0.34);
            self.leftHandGroup.rotation.set(0.2, 0.3, 0.05);
            self.rightHandGroup.rotation.set(0.2, -0.3, -0.05);
          } else if (incenseElapsed < 2.5) {
            // Phase 2: Reaching forward over altar table and inserting incense sticks into the bronze incense burner
            self.offeringIncenseGroup.visible = true;
            self.offeringCandleGroup.visible = false;
            const reachT = (incenseElapsed - 0.8) / 1.7;
            const reachP = THREE.MathUtils.smoothstep(reachT, 0, 1);

            self.upperBody.rotation.set(0.12 + Math.sin(reachT * Math.PI) * 0.22, 0, 0);

            self.leftArm.position.set(-0.22 + reachP * 0.04, 0.04 - reachP * 0.08, 0.15 + reachP * 0.30);
            self.rightArm.position.set(0.22 - reachP * 0.04, 0.04 - reachP * 0.08, 0.15 + reachP * 0.30);
            self.leftHandGroup.position.set(-0.03, 0.01 - reachP * 0.10, 0.34 + reachP * 0.36);
            self.rightHandGroup.position.set(0.03, 0.01 - reachP * 0.10, 0.34 + reachP * 0.36);
            self.offeringIncenseGroup.position.set(0, 0.08 - reachP * 0.15, 0.38 + reachP * 0.44);

            if (reachT >= 0.45 && !api.incenseOfferingFlared) {
              api.incenseOfferingFlared = true;
              api.incenseFlareStartedAt = elapsed;
            }
          } else if (incenseElapsed < 4.2) {
            // Phase 3: Incense inserted, hands together in deep Hapjang, bowing reverently before Buddha
            self.offeringIncenseGroup.visible = false;
            self.offeringCandleGroup.visible = false;
            const bowT = (incenseElapsed - 2.5) / 1.7;
            self.upperBody.rotation.set(0.12 + Math.sin(bowT * Math.PI) * 0.36, 0, 0);

            self.leftArm.position.set(-0.24, 0.06, 0.12);
            self.rightArm.position.set(0.24, 0.06, 0.12);
            self.leftArm.rotation.set(0.42, 0.36, -0.32);
            self.rightArm.rotation.set(0.42, -0.36, 0.32);
            self.leftHandGroup.position.set(-0.02, 0.02, 0.34);
            self.rightHandGroup.position.set(0.02, 0.02, 0.34);
            self.leftHandGroup.rotation.set(0.24, 0.35, 0.05);
            self.rightHandGroup.rotation.set(0.24, -0.35, -0.05);
          } else {
            // Ritual finished: return to cushion
            api.incenseOfferingState = "returningToSeat";
            target.copy(api.incenseOfferingReturnPos);
          }
        } else if (isBowing) {
          // ALWAYS hide cross-legged sitting posture during prostrations!
          self.seatedGroup.visible = false;
          self.root.rotation.y = Math.PI;

          let foldProgress = 0;
          let liftHands = 0;
          let flipHands = 0;

          if (bowPhase < 0.14) {
            // 1. Standing upright in Hapjang (직립 합장 - 부처님 전에 경배를 준비)
            self.standingLegsGroup.visible = true;
            self.kneelingGroup.visible = false;
            self.upperBody.position.set(0, 0.72, 0);
            self.upperBody.rotation.set(0.08, 0, 0);

            // Hapjang mudra at chest
            self.leftArm.position.set(-0.24, 0.06, 0.12);
            self.rightArm.position.set(0.24, 0.06, 0.12);
            self.leftArm.rotation.set(0.42, 0.36, -0.32);
            self.rightArm.rotation.set(0.42, -0.36, 0.32);
            self.leftHandGroup.position.set(-0.02, 0.02, 0.34);
            self.rightHandGroup.position.set(0.02, 0.02, 0.34);
            self.leftHandGroup.rotation.set(0.24, 0.35, 0.05);
            self.rightHandGroup.rotation.set(0.24, -0.35, -0.05);
          } else if (bowPhase < 0.34) {
            // 2. Kneeling down onto knees (무릎 꿇기)
            const t = (bowPhase - 0.14) / 0.20;
            const kneelP = THREE.MathUtils.smoothstep(t, 0, 1);
            self.standingLegsGroup.visible = kneelP < 0.5;
            self.kneelingGroup.visible = kneelP >= 0.5;
            self.upperBody.position.set(0, THREE.MathUtils.lerp(0.72, 0.44, kneelP), 0);
            self.upperBody.rotation.set(THREE.MathUtils.lerp(0.08, 0.18, kneelP), 0, 0);

            // Hands begin to lower gracefully toward cushion in front of knees
            self.leftArm.position.set(THREE.MathUtils.lerp(-0.24, -0.26, kneelP), THREE.MathUtils.lerp(0.06, -0.04, kneelP), THREE.MathUtils.lerp(0.12, 0.18, kneelP));
            self.rightArm.position.set(THREE.MathUtils.lerp(0.24, 0.26, kneelP), THREE.MathUtils.lerp(0.06, -0.04, kneelP), THREE.MathUtils.lerp(0.12, 0.18, kneelP));
            self.leftArm.rotation.set(THREE.MathUtils.lerp(0.42, 0.75, kneelP), THREE.MathUtils.lerp(0.36, 0.15, kneelP), THREE.MathUtils.lerp(-0.32, -0.15, kneelP));
            self.rightArm.rotation.set(THREE.MathUtils.lerp(0.42, 0.75, kneelP), THREE.MathUtils.lerp(-0.36, -0.15, kneelP), THREE.MathUtils.lerp(0.32, 0.15, kneelP));
            self.leftHandGroup.position.set(THREE.MathUtils.lerp(-0.02, -0.12, kneelP), THREE.MathUtils.lerp(0.02, -0.18, kneelP), THREE.MathUtils.lerp(0.34, 0.28, kneelP));
            self.rightHandGroup.position.set(THREE.MathUtils.lerp(0.02, 0.12, kneelP), THREE.MathUtils.lerp(0.02, -0.18, kneelP), THREE.MathUtils.lerp(0.34, 0.28, kneelP));
            self.leftHandGroup.rotation.set(THREE.MathUtils.lerp(0.24, 0.1, kneelP), THREE.MathUtils.lerp(0.35, 0.05, kneelP), THREE.MathUtils.lerp(0.05, 0, kneelP));
            self.rightHandGroup.rotation.set(THREE.MathUtils.lerp(0.24, 0.1, kneelP), THREE.MathUtils.lerp(-0.35, -0.05, kneelP), THREE.MathUtils.lerp(-0.05, 0, kneelP));
          } else if (bowPhase < 0.54) {
            // 3. Five-Point Contact: Forehead, elbows, knees touching cushion (오체투지 접지)
            self.standingLegsGroup.visible = false;
            self.kneelingGroup.visible = true;
            const t = (bowPhase - 0.34) / 0.20;
            foldProgress = THREE.MathUtils.smoothstep(t, 0, 1);
            self.upperBody.position.set(0, THREE.MathUtils.lerp(0.44, 0.22, foldProgress), THREE.MathUtils.lerp(0, 0.18, foldProgress));
            self.upperBody.rotation.set(THREE.MathUtils.lerp(0.18, 1.52, foldProgress), 0, 0);

            // Arms and hands reach forward flat onto cushion beside forehead
            self.leftArm.position.set(-0.25 - foldProgress * 0.03, -0.04 - foldProgress * 0.08, 0.18 + foldProgress * 0.14);
            self.rightArm.position.set(0.25 + foldProgress * 0.03, -0.04 - foldProgress * 0.08, 0.18 + foldProgress * 0.14);
            self.leftArm.rotation.set(0.75 + foldProgress * 0.55, 0.15, -0.15);
            self.rightArm.rotation.set(0.75 + foldProgress * 0.55, -0.15, 0.15);
            self.leftHandGroup.position.set(-0.12 - foldProgress * 0.04, -0.18 + foldProgress * 0.14, 0.28 + foldProgress * 0.16);
            self.rightHandGroup.position.set(0.12 + foldProgress * 0.04, -0.18 + foldProgress * 0.14, 0.28 + foldProgress * 0.16);
            self.leftHandGroup.rotation.set(0.1 - foldProgress * 1.5, 0, 0);
            self.rightHandGroup.rotation.set(0.1 - foldProgress * 1.5, 0, 0);
          } else if (bowPhase < 0.72) {
            // 4. Jeopjongnye: Forehead rests on cushion, palms flip face-up and elevate reverently (접족례 接足禮)
            self.standingLegsGroup.visible = false;
            self.kneelingGroup.visible = true;
            self.upperBody.position.set(0, 0.22, 0.18);
            self.upperBody.rotation.set(1.52, 0, 0);

            const t = (bowPhase - 0.54) / 0.18;
            flipHands = THREE.MathUtils.smoothstep(t, 0, 0.32);
            liftHands = Math.sin(t * Math.PI) * 0.075;

            self.leftArm.position.set(-0.28, -0.12, 0.32);
            self.rightArm.position.set(0.28, -0.12, 0.32);
            self.leftArm.rotation.set(1.3, 0.15, -0.15);
            self.rightArm.rotation.set(1.3, -0.15, 0.15);

            self.leftHandGroup.position.set(-0.16, -0.04 + liftHands, 0.44);
            self.rightHandGroup.position.set(0.16, -0.04 + liftHands, 0.44);
            // Palms flip to face upward (Math.PI) and lift
            self.leftHandGroup.rotation.set(-1.4 + flipHands * Math.PI, 0, -flipHands * 0.15);
            self.rightHandGroup.rotation.set(-1.4 + flipHands * Math.PI, 0, flipHands * 0.15);
          } else if (bowPhase < 0.86) {
            // 5. Pushing back up to kneeling posture (일어나 꿇어앉기)
            self.standingLegsGroup.visible = false;
            self.kneelingGroup.visible = true;
            const t = (bowPhase - 0.72) / 0.14;
            const riseP = THREE.MathUtils.smoothstep(t, 0, 1);

            self.upperBody.position.set(0, THREE.MathUtils.lerp(0.22, 0.44, riseP), THREE.MathUtils.lerp(0.18, 0, riseP));
            self.upperBody.rotation.set(THREE.MathUtils.lerp(1.52, 0.12, riseP), 0, 0);

            // Hands return from cushion back to chest in Hapjang
            self.leftArm.position.set(THREE.MathUtils.lerp(-0.28, -0.24, riseP), THREE.MathUtils.lerp(-0.12, 0.06, riseP), THREE.MathUtils.lerp(0.32, 0.12, riseP));
            self.rightArm.position.set(THREE.MathUtils.lerp(0.28, 0.24, riseP), THREE.MathUtils.lerp(-0.12, 0.06, riseP), THREE.MathUtils.lerp(0.32, 0.12, riseP));
            self.leftArm.rotation.set(THREE.MathUtils.lerp(1.3, 0.42, riseP), THREE.MathUtils.lerp(0.15, 0.36, riseP), THREE.MathUtils.lerp(-0.15, -0.32, riseP));
            self.rightArm.rotation.set(THREE.MathUtils.lerp(1.3, 0.42, riseP), THREE.MathUtils.lerp(-0.15, -0.36, riseP), THREE.MathUtils.lerp(0.15, 0.32, riseP));
            self.leftHandGroup.position.set(THREE.MathUtils.lerp(-0.16, -0.02, riseP), THREE.MathUtils.lerp(-0.04, 0.02, riseP), THREE.MathUtils.lerp(0.44, 0.34, riseP));
            self.rightHandGroup.position.set(THREE.MathUtils.lerp(0.16, 0.02, riseP), THREE.MathUtils.lerp(-0.04, 0.02, riseP), THREE.MathUtils.lerp(0.44, 0.34, riseP));
            self.leftHandGroup.rotation.set(THREE.MathUtils.lerp(-1.4, 0.24, riseP), THREE.MathUtils.lerp(0, 0.35, riseP), THREE.MathUtils.lerp(0, 0.05, riseP));
            self.rightHandGroup.rotation.set(THREE.MathUtils.lerp(-1.4, 0.24, riseP), THREE.MathUtils.lerp(0, -0.35, riseP), THREE.MathUtils.lerp(0, -0.05, riseP));
          } else {
            // 6. Rising all the way back to standing Hapjang (직립 합장으로 완전 기립)
            const t = (bowPhase - 0.86) / 0.14;
            const standP = THREE.MathUtils.smoothstep(t, 0, 1);
            self.standingLegsGroup.visible = standP >= 0.4;
            self.kneelingGroup.visible = standP < 0.4;
            self.upperBody.position.set(0, THREE.MathUtils.lerp(0.44, 0.72, standP), 0);
            self.upperBody.rotation.set(THREE.MathUtils.lerp(0.12, 0.08, standP), 0, 0);

            self.leftArm.position.set(-0.24, 0.06, 0.12);
            self.rightArm.position.set(0.24, 0.06, 0.12);
            self.leftArm.rotation.set(0.42, 0.36, -0.32);
            self.rightArm.rotation.set(0.42, -0.36, 0.32);
            self.leftHandGroup.position.set(-0.02, 0.02, 0.34);
            self.rightHandGroup.position.set(0.02, 0.02, 0.34);
            self.leftHandGroup.rotation.set(0.24, 0.35, 0.05);
            self.rightHandGroup.rotation.set(0.24, -0.35, -0.05);
          }
        } else {
          // Not bowing: Calm meditation or prayer or standing
          self.kneelingGroup.visible = false;
          self.upperBody.position.z = 0;
          self.upperBody.rotation.x = 0;

          if (isSeatedOnCushion) {
            self.seatedGroup.visible = true;
            self.standingLegsGroup.visible = false;
            self.upperBody.position.y = 0.44 + Math.sin(elapsed * 1.5) * 0.006;

            if (activePose === "prayer") {
              // 합장 (合掌 - Anjali Mudra: Palms together at heart level)
              self.leftArm.position.set(-0.24, 0.06, 0.12);
              self.rightArm.position.set(0.24, 0.06, 0.12);
              self.leftArm.rotation.set(0.42, 0.36, -0.32);
              self.rightArm.rotation.set(0.42, -0.36, 0.32);
              self.leftHandGroup.position.set(-0.02, 0.02, 0.34);
              self.rightHandGroup.position.set(0.02, 0.02, 0.34);
              self.leftHandGroup.rotation.set(0.24, 0.35, 0.05);
              self.rightHandGroup.rotation.set(0.24, -0.35, -0.05);
            } else {
              // Meditate (선정인 - Dhyana Mudra: Hands gently cupped in lap)
              self.leftArm.position.set(-0.24, -0.06, 0.06);
              self.rightArm.position.set(0.24, -0.06, 0.06);
              self.leftArm.rotation.set(0.18, 0.12, -0.15);
              self.rightArm.rotation.set(0.18, -0.12, 0.15);
              self.leftHandGroup.position.set(-0.05, -0.22, 0.25);
              self.rightHandGroup.position.set(0.05, -0.22, 0.25);
              self.leftHandGroup.rotation.set(-0.22, 0.12, -0.18);
              self.rightHandGroup.rotation.set(-0.22, -0.12, 0.18);
            }
          } else {
            // Standing calmly off-cushion
            self.standingLegsGroup.visible = true;
            self.seatedGroup.visible = false;
            self.upperBody.position.y = 0.72;
            self.leftArm.position.set(-0.28, -0.06, 0.04);
            self.rightArm.position.set(0.28, -0.06, 0.04);
            self.leftArm.rotation.set(0, 0, 0);
            self.rightArm.rotation.set(0, 0, 0);
            self.leftHandGroup.position.set(-0.08, -0.22, 0.22);
            self.rightHandGroup.position.set(0.08, -0.22, 0.22);
            self.leftHandGroup.rotation.set(0, 0, 0);
            self.rightHandGroup.rotation.set(0, 0, 0);
          }
        }
      }

      // Fellow monks: all seated serenely in 가부좌 facing the Buddha and altar
      friends.forEach((friend, index) => {
        friend.root.rotation.y = Math.PI; // Face the Buddha statue and altar
        friend.upperBody.position.y = 0.44 + Math.sin(elapsed * 1.5 + index * 1.3) * 0.007;
        // Half friend monks in 선정인, half in 합장
        if (index % 2 === 0) {
          friend.leftHandGroup.position.set(-0.02, 0.02, 0.34);
          friend.rightHandGroup.position.set(0.02, 0.02, 0.34);
          friend.leftHandGroup.rotation.set(0.24, 0.35, 0.05);
          friend.rightHandGroup.rotation.set(0.24, -0.35, -0.05);
        } else {
          friend.leftHandGroup.position.set(-0.05, -0.22, 0.25);
          friend.rightHandGroup.position.set(0.05, -0.22, 0.25);
          friend.leftHandGroup.rotation.set(-0.22, 0.12, -0.18);
          friend.rightHandGroup.rotation.set(-0.22, -0.12, 0.18);
        }
      });

      // Dynamic candle flickering and candle offering flare
      const flareProgress = (elapsed - api.candleFlareStartedAt) / 2.2;
      const isCandleFlaring = flareProgress >= 0 && flareProgress <= 1.0;
      const flareBoost = isCandleFlaring ? Math.sin(flareProgress * Math.PI) * 1.8 : 0;

      candleLights.forEach((light, index) => {
        const envIntensity = (light.userData.environmentIntensity as number) || 1.0;
        const flicker = Math.sin(elapsed * 8 + index * 2.3) * 0.14 + Math.sin(elapsed * 17 + index) * 0.06;
        light.intensity = envIntensity * (0.85 + flicker) + flareBoost * 0.9;
      });
      candleFlames.forEach((flame, index) => {
        const flicker = Math.sin(elapsed * 13 + index * 2) * 0.08;
        const scaleBoost = flareBoost * 0.35;
        flame.scale.set(1 + flicker + scaleBoost, 1 + Math.sin(elapsed * 17 + index) * 0.15 + scaleBoost * 1.2, 1 + flicker + scaleBoost);
        flame.rotation.z = Math.sin(elapsed * 9 + index) * 0.08;
      });

      // Spiritual Incense Smoke Particle Curl & Rise Simulation (피어오르는 그윽한 향 연기)
      const incenseProgress = (elapsed - api.incenseFlareStartedAt) / 4.2;
      const isIncenseFlaring = incenseProgress >= 0 && incenseProgress <= 1.0;
      const smokeBoost = isIncenseFlaring ? Math.sin(incenseProgress * Math.PI) * 2.2 : 0;

      theme.smokePuffs.forEach((puff, idx) => {
        const data = puff.userData;
        const totalLife = (data.lifespan as number) || 3.8;
        const age = ((elapsed + ((data.birthOffset as number) || 0)) % totalLife) / totalLife; // 0 to 1
        const yRise = Math.pow(age, 0.78) * 1.95;
        const swirl = elapsed * ((data.swirlSpeed as number) || 1.2) + idx * 0.45;
        const drift = ((data.driftRadius as number) || 0.04) * (1 + age * 3.6) * (1 + smokeBoost * 0.35);

        puff.position.x = Math.sin(swirl) * drift;
        puff.position.y = 0.94 + yRise;
        puff.position.z = -2.86 + Math.cos(swirl) * (drift * 0.65);

        const scale = (((data.initialScale as number) || 0.4) + age * 2.8) * (1 + smokeBoost * 0.45);
        puff.scale.set(scale, scale * 1.35, scale);

        const mat = puff.material as THREE.MeshBasicMaterial;
        const alpha = Math.sin(age * Math.PI) * (0.28 + smokeBoost * 0.32);
        mat.opacity = Math.max(0, Math.min(0.68, alpha));
      });

      // Hanji wish ribbons swaying in gentle temple breeze
      api.wishRibbons.forEach((ribbon) => {
        const phase = (ribbon.userData.ribbonPhase as number) || 0;
        const baseRotation = (ribbon.userData.baseRotationZ as number) || -0.06;
        ribbon.rotation.z = baseRotation + Math.sin(elapsed * 1.8 + phase) * 0.14;
        ribbon.rotation.x = 0.04 + Math.sin(elapsed * 1.2 + phase) * 0.06;
      });

      // Moktak strike animation & golden soundwave
      const strikeProgress = (elapsed - api.meritStartedAt) / 0.72;
      if (strikeProgress >= 0 && strikeProgress <= 1) {
        const swing = Math.sin(strikeProgress * Math.PI);
        api.moktakMallet.rotation.z = -0.38 + swing * 0.92;
        api.moktakMallet.rotation.x = swing * 0.12;
        api.meritWave.visible = true;
        api.meritWave.scale.setScalar(0.6 + strikeProgress * 3.1);
        (api.meritWave.material as THREE.MeshBasicMaterial).opacity = (1 - strikeProgress) * 0.85;
      } else {
        api.moktakMallet.rotation.z = -0.38;
        api.moktakMallet.rotation.x = 0;
        api.meritWave.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("click", clickScene);
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    if (api.lastSyncedSeat === ownSeat) return;
    if (api.ignoreNextNullSync && ownSeat === null) {
      api.ignoreNextNullSync = false;
      api.lastSyncedSeat = null;
      return;
    }
    api.lastSyncedSeat = ownSeat;
    api.targetSeat = ownSeat;
    if (ownSeat !== null) {
      api.target.copy(api.seatPositions[ownSeat]);
      api.selectedGlow.position.set(api.target.x, 0.035, api.target.z);
      api.selectedGlow.visible = true;
    } else {
      api.target.set(0, 0, 5.75);
      api.selectedGlow.visible = false;
    }
  }, [ownSeat]);

  useEffect(() => {
    const api = apiRef.current;
    if (api) api.wishRibbons = updateLanterns(api.wishGroup, wishLanterns);
  }, [wishLanterns]);

  useEffect(() => {
    const api = apiRef.current;
    if (api) syncFriendMonks(api.scene, api.friends, api.seatPositions, companions);
  }, [companions]);

  return <canvas ref={canvasRef} className="temple-canvas" aria-label="360도 회전하고 확대할 수 있는 3D 목조 법당" />;
}
