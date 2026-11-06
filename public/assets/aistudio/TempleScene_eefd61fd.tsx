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

type Props = {
  friendSeats: number[];
  ownSeat: number | null;
  pose: TemplePose;
  bowSequence: number;
  meritSequence: number;
  profile: TempleProfile | null;
  hall: TempleHall;
  timePeriod: TempleTimePeriod;
  wishLanterns: TempleLantern[];
  onSeatSelect: (seat: number | null) => void;
};

type SceneTheme = {
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
};

type MonkRig = {
  root: THREE.Group;
  upperBody: THREE.Group;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftHandGroup: THREE.Group;
  rightHandGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Mesh;
  rightKnee: THREE.Mesh;
  robeMaterial: THREE.MeshStandardMaterial;
  robeShadowMaterial: THREE.MeshStandardMaterial;
  maleHairGroup: THREE.Group;
  femaleHairGroup: THREE.Group;
  nameTag: THREE.Sprite;
};

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
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.castShadow = true;
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

  const stage = makeMaterial(0x603a25);
  addBox(altarGroup, 3.5, 0.34, 1.65, stage, 0, 0.25, -4.9);
  addBox(altarGroup, 3.25, 0.055, 1.48, gold, 0, 0.46, -4.9);
  const pedestal = makeMaterial(0xc08d38, 0.38, { metalness: 0.58 });
  addCylinder(altarGroup, 0.95, 1.1, 0.25, pedestal, 0, 0.64, -4.88, 32);
  addCylinder(altarGroup, 0.79, 0.93, 0.23, gold, 0, 0.86, -4.88, 32);

  const statueGold = makeMaterial(0xe4b84f, 0.32, { metalness: 0.56, emissive: 0x4e2e08, emissiveIntensity: 0.22 });
  const statueLight = makeMaterial(0xf0cd73, 0.34, { metalness: 0.45 });
  const buddha = new THREE.Group();
  buddha.position.set(0, 0.83, -4.92);
  altarGroup.add(buddha);
  const lotusLegs = addMesh(buddha, new THREE.SphereGeometry(0.62, 28, 18), statueGold, new THREE.Vector3(0, 0.27, 0.03));
  lotusLegs.scale.set(1.1, 0.34, 0.74);
  const robeBody = addMesh(buddha, new THREE.CylinderGeometry(0.34, 0.58, 0.84, 28), statueGold, new THREE.Vector3(0, 0.82, 0));
  robeBody.scale.set(1, 1, 0.82);
  addMesh(buddha, new THREE.CylinderGeometry(0.12, 0.14, 0.18, 16), statueGold, new THREE.Vector3(0, 1.3, 0));
  addMesh(buddha, new THREE.SphereGeometry(0.3, 28, 20), statueLight, new THREE.Vector3(0, 1.57, 0.02));
  addMesh(buddha, new THREE.SphereGeometry(0.095, 16, 12), statueGold, new THREE.Vector3(0, 1.86, 0.02));
  for (const side of [-1, 1]) {
    addMesh(buddha, new THREE.SphereGeometry(0.07, 12, 10), statueGold, new THREE.Vector3(side * 0.29, 1.56, 0));
    const sleeve = addMesh(buddha, new THREE.SphereGeometry(0.27, 16, 12), statueGold, new THREE.Vector3(side * 0.39, 0.78, 0.08));
    sleeve.scale.set(0.72, 1.35, 0.82);
    const hand = addMesh(buddha, new THREE.SphereGeometry(0.14, 16, 12), statueLight, new THREE.Vector3(side * 0.19, 0.43, 0.42));
    hand.scale.set(1, 0.48, 0.82);
  }
  const eyeMaterial = makeMaterial(0x4d3218, 0.7);
  for (const side of [-1, 1]) {
    const eye = addMesh(buddha, new THREE.SphereGeometry(0.025, 8, 8), eyeMaterial, new THREE.Vector3(side * 0.105, 1.6, 0.295));
    eye.scale.set(1.2, 0.48, 0.7);
  }
  const buddhaSmile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, 1.49, 0.31),
    new THREE.Vector3(-0.025, 1.47, 0.322),
    new THREE.Vector3(0.025, 1.47, 0.322),
    new THREE.Vector3(0.06, 1.49, 0.31),
  ]);
  addMesh(buddha, new THREE.TubeGeometry(buddhaSmile, 10, 0.007, 5, false), eyeMaterial, new THREE.Vector3(0, 0, 0));

  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xf3cb72, transparent: true, opacity: 0.6 });
  const halo = addMesh(altarGroup, new THREE.TorusGeometry(1.14, 0.035, 12, 72), haloMaterial, new THREE.Vector3(0, 2.65, -5.14));
  halo.rotation.y = Math.PI;
  const haloInnerMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4a2, transparent: true, opacity: 0.45 });
  const haloInner = addMesh(altarGroup, new THREE.TorusGeometry(0.96, 0.012, 8, 72), haloInnerMaterial, new THREE.Vector3(0, 2.65, -5.15));
  haloInner.rotation.y = Math.PI;
  const altarGlow = new THREE.PointLight(0xffca65, 1.5, 12);
  altarGlow.position.set(0, 2.7, -3.4);
  world.add(altarGlow);

  const wax = makeMaterial(0xf0d49a, 0.7);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffae42 });
  for (const x of [-1.18, 1.18]) {
    addCylinder(altarGroup, 0.13, 0.16, 0.07, gold, x, 0.5, -4.3, 16);
    addCylinder(altarGroup, 0.045, 0.055, 0.24, gold, x, 0.65, -4.3, 12);
    addCylinder(altarGroup, 0.09, 0.11, 0.055, gold, x, 0.79, -4.3, 16);
    addCylinder(altarGroup, 0.09, 0.09, 0.34, wax, x, 0.98, -4.3, 16);
    const flame = addMesh(altarGroup, new THREE.ConeGeometry(0.075, 0.23, 10), flameMaterial, new THREE.Vector3(x, 1.25, -4.3));
    flame.userData.isFlame = true;
    candleFlames.push(flame);
    const light = new THREE.PointLight(0xff9f3a, 1.25, 8, 2);
    light.position.set(x, 1.31, -4.28);
    world.add(light);
    candleLights.push(light);
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
  const altarGlowMaterial = altarGlow;

  return {
    roomGroup,
    forestGroup,
    seatGroup,
    altarGroup,
    forestFloor,
    raycastFloor,
    hemisphere,
    ambient,
    keyLight,
    altarGlow: altarGlowMaterial,
    statueGold,
    statueLight,
    haloMaterial,
    haloInnerMaterial,
    floorMaterial: floor,
    woodMaterials: [wood, woodLight, darkWood, red, green, wall, wallPanel, gold],
    seatMaterials: [cushionBottom, cushionTop, petalMaterial, petalLight, cushionGold],
    forestMaterials: [forestGround, rockMaterial, mossMaterial, ...pineMaterials, trunkMaterial, forestLine],
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
    context.fillStyle = "rgba(35, 27, 21, .86)";
    context.beginPath();
    context.roundRect(6, 8, 372, 96, 22);
    context.fill();
    context.strokeStyle = "rgba(235, 205, 139, .8)";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#f6dfad";
    context.font = "500 42px 'Noto Serif KR', serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(name, 192, 57, 330);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, sizeAttenuation: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.94, 0.27, 1);
  sprite.position.set(0, 2.12, 0);
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
  const robe = makeMaterial(self ? colors.main : 0xaaa79e, 0.84);
  const robeShadow = makeMaterial(self ? colors.shadow : 0x85837b, 0.9);
  const skin = makeMaterial(0xe9b58e, 0.85);
  const hair = makeMaterial(0x322c28, 0.95);
  const faceLine = makeMaterial(0x59473d, 0.9);
  const root = new THREE.Group();
  root.position.copy(position);
  scene.add(root);

  const upperBody = new THREE.Group();
  upperBody.position.y = 0.78;
  root.add(upperBody);
  const body = addMesh(upperBody, new THREE.CylinderGeometry(0.24, 0.4, 0.72, 18), robe, new THREE.Vector3(0, -0.08, 0));
  body.castShadow = true;
  addMesh(upperBody, new THREE.TorusGeometry(0.25, 0.025, 8, 24), robeShadow, new THREE.Vector3(0, 0.23, 0));
  const head = addMesh(upperBody, new THREE.SphereGeometry(0.34, 24, 18), skin, new THREE.Vector3(0, 0.52, 0.02));
  head.scale.set(1, 1.08, 0.95);
  const maleHairGroup = new THREE.Group();
  const femaleHairGroup = new THREE.Group();
  upperBody.add(maleHairGroup, femaleHairGroup);
  addMesh(maleHairGroup, new THREE.SphereGeometry(0.095, 12, 10), hair, new THREE.Vector3(0, 0.86, 0.01));
  const femaleCap = addMesh(femaleHairGroup, new THREE.SphereGeometry(0.26, 18, 12), hair, new THREE.Vector3(0, 0.77, -0.02));
  femaleCap.scale.set(1.06, 0.58, 0.9);
  for (const side of [-1, 1]) {
    const lock = addMesh(femaleHairGroup, new THREE.SphereGeometry(0.12, 12, 10), hair, new THREE.Vector3(side * 0.22, 0.54, 0.08));
    lock.scale.set(0.72, 1.5, 0.78);
  }
  const flowerPin = makeMaterial(0xd98b91, 0.5);
  const hairFlower = addMesh(femaleHairGroup, new THREE.SphereGeometry(0.055, 10, 8), flowerPin, new THREE.Vector3(0.19, 0.77, 0.2));
  hairFlower.scale.set(1, 0.8, 0.6);
  maleHairGroup.visible = profile?.gender !== "female";
  femaleHairGroup.visible = profile?.gender === "female";
  for (const side of [-1, 1]) {
    addMesh(upperBody, new THREE.SphereGeometry(0.065, 10, 8), skin, new THREE.Vector3(side * 0.32, 0.48, 0.015));
    const eye = addMesh(upperBody, new THREE.SphereGeometry(0.027, 8, 8), faceLine, new THREE.Vector3(side * 0.115, 0.54, 0.315));
    eye.scale.set(1.2, 0.42, 0.6);
  }
  const blush = new THREE.MeshBasicMaterial({ color: 0xe88d83, transparent: true, opacity: 0.48 });
  for (const side of [-1, 1]) {
    const cheek = addMesh(upperBody, new THREE.SphereGeometry(0.055, 12, 10), blush, new THREE.Vector3(side * 0.19, 0.44, 0.306));
    cheek.scale.set(1.15, 0.72, 0.38);
  }
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, 0.41, 0.32),
    new THREE.Vector3(-0.035, 0.385, 0.337),
    new THREE.Vector3(0.035, 0.385, 0.337),
    new THREE.Vector3(0.075, 0.41, 0.32),
  ]);
  addMesh(upperBody, new THREE.TubeGeometry(smileCurve, 12, 0.009, 5, false), faceLine, new THREE.Vector3(0, 0, 0));

  const armGeometry = new THREE.SphereGeometry(1, 14, 12);
  const leftArm = addMesh(upperBody, armGeometry, robe, new THREE.Vector3(-0.3, -0.16, 0.04));
  const rightArm = addMesh(upperBody, armGeometry, robe, new THREE.Vector3(0.3, -0.16, 0.04));
  leftArm.scale.set(0.15, 0.25, 0.16);
  rightArm.scale.set(0.15, 0.25, 0.16);
  const leftHandGroup = new THREE.Group();
  const rightHandGroup = new THREE.Group();
  leftHandGroup.position.set(-0.16, -0.32, 0.2);
  rightHandGroup.position.set(0.16, -0.32, 0.2);
  upperBody.add(leftHandGroup, rightHandGroup);
  for (const [handGroup, side] of [[leftHandGroup, -1], [rightHandGroup, 1]] as const) {
    const palm = addMesh(handGroup, new THREE.SphereGeometry(0.09, 12, 10), skin, new THREE.Vector3(0, 0, 0));
    palm.scale.set(1.45, 0.42, 1.15);
    for (let finger = 0; finger < 4; finger += 1) {
      const fingertip = addMesh(
        handGroup,
        new THREE.SphereGeometry(0.035, 8, 8),
        skin,
        new THREE.Vector3(side * (finger - 1.5) * 0.055, -0.004, 0.095 + (finger === 1 || finger === 2 ? 0.015 : 0)),
      );
      fingertip.scale.set(0.78, 0.78, 1.6);
    }
  }

  const legGeometry = new THREE.SphereGeometry(1, 14, 10);
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.17, 0.02);
  root.add(leftLeg);
  const leftFoot = addMesh(leftLeg, legGeometry, robeShadow, new THREE.Vector3(-0.08, 0, 0.06));
  leftFoot.scale.set(0.19, 0.1, 0.36);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.17, 0.02);
  root.add(rightLeg);
  const rightFoot = addMesh(rightLeg, legGeometry, robeShadow, new THREE.Vector3(0.08, 0, 0.06));
  rightFoot.scale.set(0.19, 0.1, 0.36);
  const leftKnee = addMesh(root, new THREE.SphereGeometry(0.19, 14, 12), robe, new THREE.Vector3(-0.2, 0.14, 0.24));
  const rightKnee = addMesh(root, new THREE.SphereGeometry(0.19, 14, 12), robe, new THREE.Vector3(0.2, 0.14, 0.24));
  leftKnee.scale.set(1.28, 0.66, 1.5);
  rightKnee.scale.set(1.28, 0.66, 1.5);
  const lap = addMesh(root, new THREE.SphereGeometry(0.35, 18, 14), robeShadow, new THREE.Vector3(0, 0.21, 0.12));
  lap.scale.set(1.22, 0.52, 1.02);
  const nameTag = makeNameTag(self ? profile?.name ?? "" : "");
  root.add(nameTag);

  return { root, upperBody, leftArm, rightArm, leftHandGroup, rightHandGroup, leftLeg, rightLeg, leftKnee, rightKnee, robeMaterial: robe, robeShadowMaterial: robeShadow, maleHairGroup, femaleHairGroup, nameTag };
}

function updateLanterns(group: THREE.Group, lanterns: TempleLantern[]) {
  group.children.forEach((child) => child.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  }));
  group.clear();
  const frame = makeMaterial(0x763729, 0.58, { metalness: 0.28 });
  const paper = makeMaterial(0xffc864, 0.58, { emissive: 0xff8a26, emissiveIntensity: 1.15, transparent: true, opacity: 0.93, side: THREE.DoubleSide });
  const petalOuter = makeMaterial(0xb8484a, 0.54, { emissive: 0x401015, emissiveIntensity: 0.14, side: THREE.DoubleSide });
  const petalInner = makeMaterial(0xe48679, 0.5, { emissive: 0x54211b, emissiveIntensity: 0.12, side: THREE.DoubleSide });
  const tassel = makeMaterial(0xc34137, 0.62, { metalness: 0.12 });
  const tasselGold = makeMaterial(0xe5bd67, 0.45, { metalness: 0.5 });
  const hanji = makeMaterial(0xf0dfb8, 0.86, { side: THREE.DoubleSide, roughness: 0.92 });
  const ribbons: THREE.Mesh[] = [];

  lanterns.forEach((lantern, index) => {
    const x = (lantern.left / 100 - 0.5) * 9.2;
    const z = -0.4 + (index % 3) * 0.5;
    const string = addCylinder(group, 0.012, 0.012, 0.48, tasselGold, x, 5.34, z, 6);
    string.userData.lanternId = lantern.id;
    addCylinder(group, 0.055, 0.24, 0.16, frame, x, 5.08, z, 8);
    addCylinder(group, 0.2, 0.2, 0.055, tasselGold, x, 4.99, z, 8);
    const body = addCylinder(group, 0.19, 0.19, 0.42, paper, x, 4.77, z, 8);
    body.userData.lanternId = lantern.id;
    addCylinder(group, 0.2, 0.22, 0.065, frame, x, 4.55, z, 8);
    for (let rib = 0; rib < 8; rib += 1) {
      const angle = (rib / 8) * Math.PI * 2;
      addCylinder(group, 0.009, 0.009, 0.4, tasselGold, x + Math.cos(angle) * 0.19, 4.77, z + Math.sin(angle) * 0.19, 5);
    }

    for (let layer = 0; layer < 2; layer += 1) {
      for (let petal = 0; petal < 8; petal += 1) {
        const angle = (petal / 8) * Math.PI * 2 + layer * Math.PI / 8;
        const leaf = addMesh(
          group,
          new THREE.SphereGeometry(1, 12, 10),
          layer === 0 ? petalOuter : petalInner,
          new THREE.Vector3(x + Math.cos(angle) * (0.18 + layer * 0.055), 4.53 + layer * 0.075, z + Math.sin(angle) * (0.18 + layer * 0.055)),
        );
        leaf.scale.set(0.14 + layer * 0.018, 0.055, 0.28 + layer * 0.02);
        leaf.rotation.y = -angle + Math.PI / 2;
      }
    }

    for (let strand = 0; strand < 5; strand += 1) {
      const offset = (strand - 2) * 0.045;
      addCylinder(group, 0.009, 0.012, 0.42 - Math.abs(offset) * 2, strand === 2 ? tasselGold : tassel, x + offset, 4.31, z + 0.02, 6);
    }
    const tasselKnot = addMesh(group, new THREE.SphereGeometry(0.07, 10, 8), tassel, new THREE.Vector3(x, 4.1, z + 0.02));
    tasselKnot.scale.set(0.72, 1.4, 0.72);

    const ribbonGeometry = new THREE.PlaneGeometry(0.27, 0.82, 4, 14);
    const positions = ribbonGeometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const y = positions.getY(vertex);
      const wave = Math.sin((y + 0.41) * Math.PI * 2.2) * 0.035;
      positions.setX(vertex, positions.getX(vertex) + wave);
    }
    ribbonGeometry.computeVertexNormals();
    const ribbon = addMesh(group, ribbonGeometry, hanji, new THREE.Vector3(x + 0.27, 4.83, z + 0.18));
    ribbon.rotation.set(0.04, 0.36, -0.08);
    ribbon.userData.ribbonPhase = index * 0.9;
    ribbon.userData.baseRotationZ = ribbon.rotation.z;
    ribbon.userData.wish = lantern.wish;
    ribbons.push(ribbon);

    const glow = new THREE.PointLight(0xffb74f, 0.3, 2.2, 2);
    glow.position.set(x, 4.78, z);
    group.add(glow);
  });
  return ribbons;
}

const timePalettes: Record<TempleTimePeriod, { background: number; fog: number; sky: number; ground: number; ambient: number; sunlight: number; sunColor: number; candle: number }> = {
  dawn: { background: 0x152637, fog: 0x3c596a, sky: 0x9bb7d5, ground: 0x344353, ambient: 0.82, sunlight: 1.05, sunColor: 0xb5d5f3, candle: 0.92 },
  day: { background: 0x33281e, fog: 0x765633, sky: 0xffe6be, ground: 0x453222, ambient: 1.15, sunlight: 2.45, sunColor: 0xffd18a, candle: 0.78 },
  sunset: { background: 0x321c1b, fog: 0xa65739, sky: 0xf6a37a, ground: 0x4d3025, ambient: 0.9, sunlight: 1.85, sunColor: 0xff895d, candle: 1.02 },
  night: { background: 0x090f1d, fog: 0x1d293b, sky: 0x839ac5, ground: 0x222334, ambient: 0.52, sunlight: 0.68, sunColor: 0xa7c2ef, candle: 1.55 },
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
  theme.ambient.color.set(mountain ? 0xd2dec4 : pureLand ? 0xffcfdf : palette.sky);
  theme.ambient.intensity = mountain ? palette.ambient * 0.45 : pureLand ? palette.ambient * 0.6 : palette.ambient * 0.62;
  theme.keyLight.color.set(mountain ? (period === "night" ? 0x91a7bc : 0xc3d8b7) : pureLand ? 0xffbad5 : palette.sunColor);
  theme.keyLight.intensity = mountain ? palette.sunlight * 0.58 : pureLand ? palette.sunlight * 0.82 : palette.sunlight;
  theme.altarGlow.color.set(pureLand ? 0xffa4cd : 0xffca65);
  theme.altarGlow.intensity = mountain ? 0 : (period === "night" ? 2.2 : pureLand ? 1.9 : 1.5);
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

export default function TempleScene({ friendSeats, ownSeat, pose, bowSequence, meritSequence, profile, hall, timePeriod, wishLanterns, onSeatSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ friendSeats, ownSeat, pose, bowSequence, meritSequence, profile, hall, timePeriod, wishLanterns, onSeatSelect });
  const apiRef = useRef<SceneApi | null>(null);
  propsRef.current = { friendSeats, ownSeat, pose, bowSequence, meritSequence, profile, hall, timePeriod, wishLanterns, onSeatSelect };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const mobileView = window.innerWidth < 700;
    const camera = new THREE.PerspectiveCamera(mobileView ? 58 : 38, 1, 0.1, 60);
    camera.position.set(0, mobileView ? 5.1 : 5, mobileView ? 17.6 : 12.5);
    camera.lookAt(0, 1.6, -0.3);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = true;
    controls.minDistance = 5.2;
    controls.maxDistance = 30;
    controls.minPolarAngle = 0.32;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 1.6, -0.3);

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

    const wishGroup = new THREE.Group();
    scene.add(wishGroup);
    const wishRibbons = updateLanterns(wishGroup, propsRef.current.wishLanterns);

    const self = createNovice(scene, new THREE.Vector3(0, 0, 5.75), true, propsRef.current.profile);
    const friends = propsRef.current.friendSeats.map((seatIndex) => {
      const position = seatPositions[seatIndex].clone();
      position.y = 0.3;
      return createNovice(scene, position);
    });

    const floor = theme.raycastFloor;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const target = new THREE.Vector3(0, 0, 5.75);
    const animationStart = performance.now();
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
    };
    apiRef.current = api;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.fov = width < 700 ? 58 : 38;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const clickScene = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const seatHit = raycaster.intersectObjects(seatMeshes, false).find((hit) => {
        const seatIndex = hit.object.userData.seatIndex;
        return Number.isInteger(seatIndex)
          && !propsRef.current.friendSeats.includes(seatIndex as number)
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
        api.bowStartedAt = elapsed;
      }
      if (api.lastMeritSequence !== currentProps.meritSequence) {
        api.lastMeritSequence = currentProps.meritSequence;
        api.meritStartedAt = elapsed;
      }

      const distance = self.root.position.distanceTo(target);
      const walking = distance > 0.055;
      if (walking) {
        self.root.position.lerp(target, Math.min(1, 0.055 + elapsed * 0.0006));
        const direction = target.clone().sub(self.root.position);
        if (direction.lengthSq() > 0.001) self.root.rotation.y = Math.atan2(direction.x, direction.z);
        self.leftLeg.rotation.x = Math.sin(elapsed * 10) * 0.48;
        self.rightLeg.rotation.x = -Math.sin(elapsed * 10) * 0.48;
        self.root.position.y = THREE.MathUtils.lerp(self.root.position.y, target.y + Math.abs(Math.sin(elapsed * 10)) * 0.045, 0.2);
      } else {
        self.root.position.x = target.x;
        self.root.position.z = target.z;
        self.root.position.y = THREE.MathUtils.lerp(self.root.position.y, target.y, 0.18);
        self.leftLeg.rotation.x = 0;
        self.rightLeg.rotation.x = 0;
      }

      const activePose = currentProps.pose;
      const praying = currentProps.pose === "prayer" && currentProps.ownSeat !== null;
      const bowElapsed = elapsed - api.bowStartedAt;
      const bowActive = currentProps.pose === "bow" && bowElapsed < 6.8;
      const kneelProgress = bowActive
        ? THREE.MathUtils.smoothstep(bowElapsed, 0.18, 1.35) * (1 - THREE.MathUtils.smoothstep(bowElapsed, 5.2, 6.8))
        : 0;
      const prostrationProgress = bowActive
        ? THREE.MathUtils.smoothstep(bowElapsed, 0.92, 2.08) * (1 - THREE.MathUtils.smoothstep(bowElapsed, 4.55, 6.15))
        : 0;
      if (import.meta.env.DEV) {
        canvas.dataset.bowProgress = prostrationProgress.toFixed(2);
        canvas.dataset.bowActive = String(bowActive);
      }

      if (bowActive) {
        self.root.position.y = THREE.MathUtils.lerp(target.y, 0.03, kneelProgress);
        self.leftKnee.visible = kneelProgress > 0.18;
        self.rightKnee.visible = kneelProgress > 0.18;
        self.leftLeg.position.y = 0.17 - kneelProgress * 0.1;
        self.rightLeg.position.y = 0.17 - kneelProgress * 0.1;
        self.leftLeg.position.z = 0.02 - kneelProgress * 0.12;
        self.rightLeg.position.z = 0.02 - kneelProgress * 0.12;
      } else {
        self.leftKnee.visible = false;
        self.rightKnee.visible = false;
        self.leftLeg.position.set(-0.14, 0.17, 0.02);
        self.rightLeg.position.set(0.14, 0.17, 0.02);
      }

      self.leftArm.position.set(-0.3 + prostrationProgress * 0.04, -0.16 + prostrationProgress * 0.18, 0.04 + prostrationProgress * 0.1);
      self.rightArm.position.set(0.3 - prostrationProgress * 0.04, -0.16 + prostrationProgress * 0.18, 0.04 + prostrationProgress * 0.1);
      const leftHandTarget = praying ? new THREE.Vector3(-0.025, -0.13, 0.34) : new THREE.Vector3(-0.16, -0.32, 0.2);
      const rightHandTarget = praying ? new THREE.Vector3(0.025, -0.13, 0.34) : new THREE.Vector3(0.16, -0.32, 0.2);
      const bowHandLeft = new THREE.Vector3(-0.2, 0.05, 0.23);
      const bowHandRight = new THREE.Vector3(0.2, 0.05, 0.23);
      self.leftHandGroup.position.lerpVectors(leftHandTarget, bowActive ? bowHandLeft : leftHandTarget, prostrationProgress);
      self.rightHandGroup.position.lerpVectors(rightHandTarget, bowActive ? bowHandRight : rightHandTarget, prostrationProgress);
      self.leftHandGroup.rotation.x = -1.48 * prostrationProgress;
      self.rightHandGroup.rotation.x = -1.48 * prostrationProgress;
      self.leftHandGroup.rotation.z = -0.16 * prostrationProgress;
      self.rightHandGroup.rotation.z = 0.16 * prostrationProgress;
      self.upperBody.rotation.x = 1.48 * prostrationProgress;
      self.upperBody.position.y = (0.78 - 0.56 * prostrationProgress) + (walking ? Math.abs(Math.sin(elapsed * 10)) * 0.035 : Math.sin(elapsed * 1.6) * 0.012);
      friends.forEach((friend, index) => {
        friend.upperBody.position.y = 0.78 + Math.sin(elapsed * 1.4 + index) * 0.01;
      });
      candleLights.forEach((light, index) => {
        light.intensity = 0.78 + Math.sin(elapsed * 8 + index * 2.3) * 0.18 + Math.sin(elapsed * 17 + index) * 0.07;
      });
      candleFlames.forEach((flame, index) => {
        const flicker = Math.sin(elapsed * 13 + index * 2) * 0.08;
        flame.scale.set(1 + flicker, 1 + Math.sin(elapsed * 17 + index) * 0.15, 1 + flicker);
        flame.rotation.z = Math.sin(elapsed * 9 + index) * 0.08;
      });
      api.wishRibbons.forEach((ribbon) => {
        const phase = ribbon.userData.ribbonPhase as number;
        const baseRotation = ribbon.userData.baseRotationZ as number;
        ribbon.rotation.z = baseRotation + Math.sin(elapsed * 1.7 + phase) * 0.12;
        ribbon.rotation.x = 0.04 + Math.sin(elapsed * 1.1 + phase) * 0.05;
      });

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

  return <canvas ref={canvasRef} className="temple-canvas" aria-label="360도 회전하고 확대할 수 있는 3D 목조 법당" />;
}