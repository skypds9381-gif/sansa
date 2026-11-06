import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { templeAudio } from '../utils/audio';

export interface MonkActor {
  id: string;
  name: string;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  handsMesh: THREE.Group;
  haloMesh: THREE.Mesh;
  targetPos: THREE.Vector3;
  isMoving: boolean;
  cushionIndex: number | null;
  state: 'idle' | 'walking' | 'sitting' | 'praying' | 'bowing';
  walkTime: number;
  bowProgress: number;
  isUser?: boolean;
}

export interface CushionSlot {
  index: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  occupiedBy: string | null;
}

export class SansaTemple3D {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animFrameId = 0;
  private clock = new THREE.Clock();

  // Actors & World
  public player: MonkActor | null = null;
  public pilgrims: MonkActor[] = [];
  public cushions: CushionSlot[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private floorMesh: THREE.Mesh | null = null;
  private targetMarker: THREE.Mesh | null = null;

  // Altar candles & incense
  private candleLights: THREE.PointLight[] = [];
  private incenseSmokeParticles: THREE.Points | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private altarLight: THREE.PointLight | null = null;
  public currentTimeOfDay: 'dawn' | 'morning' | 'sunset' | 'night' = 'morning';
  public currentHall: 'daewoong' | 'geungnak' | 'sansin' = 'daewoong';

  // Event callbacks
  public onPlayerStateChange?: (state: MonkActor['state'], cushionIdx: number | null) => void;
  public onNotification?: (msg: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#14100c');
    this.scene.fog = new THREE.FogExp2('#14100c', 0.022);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 7.5, 12);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below ground
    this.controls.minDistance = 3;
    this.controls.maxDistance = 22;
    this.controls.target.set(0, 1.2, 0);

    // 5. Build Temple Environment
    this.setupLighting();
    this.buildTempleArchitecture();
    this.buildBuddhaAltar();
    this.buildCushionGrid();
    this.createTargetMarker();
    this.setupIncenseParticles();

    // 6. Spawn Player and Fellow Silent Monks
    this.spawnPlayer();
    this.spawnFellowMonks();

    // 7. Input listeners
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('resize', this.onWindowResize);

    // 8. Start Game Loop
    this.tick();
  }

  // --- LIGHTING ---
  private setupLighting() {
    // 따뜻한 사찰 내부 환경광
    this.hemiLight = new THREE.HemisphereLight('#fde68a', '#292524', 0.65);
    this.scene.add(this.hemiLight);

    // 창문/문으로 스며드는 온화한 아침 햇살 (Key Directional Light)
    this.sunLight = new THREE.DirectionalLight('#fed7aa', 1.8);
    this.sunLight.position.set(6, 12, 8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    const d = 12;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // 불단 위 성스러운 금빛 조명
    this.altarLight = new THREE.PointLight('#f59e0b', 2.2, 10, 1.5);
    this.altarLight.position.set(0, 4.5, -6.5);
    this.scene.add(this.altarLight);

    // 촛불 포인트라이트
    const candle1 = new THREE.PointLight('#fbbf24', 1.2, 5, 2);
    candle1.position.set(-1.8, 1.8, -6.2);
    this.candleLights.push(candle1);
    this.scene.add(candle1);

    const candle2 = new THREE.PointLight('#fbbf24', 1.2, 5, 2);
    candle2.position.set(1.8, 1.8, -6.2);
    this.candleLights.push(candle2);
    this.scene.add(candle2);
  }

  // --- TEXTURES ---
  private createWoodFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 고풍스러운 전통 대청마루 원목 질감
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 512, 512);

    // 마루 널빤지 분할선
    const plankHeight = 64;
    for (let y = 0; y < 512; y += plankHeight) {
      ctx.fillStyle = (y / plankHeight) % 2 === 0 ? '#542105' : '#3d1602';
      ctx.fillRect(0, y, 512, plankHeight - 2);

      // 나무결 텍스처
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const lineY = y + 8 + i * 9;
        ctx.moveTo(0, lineY);
        ctx.bezierCurveTo(150, lineY + (Math.random() * 4 - 2), 350, lineY + (Math.random() * 4 - 2), 512, lineY);
        ctx.stroke();
      }

      // 널빤지 틈새 그림자
      ctx.fillStyle = '#1c0a01';
      ctx.fillRect(0, y + plankHeight - 2, 512, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // --- TEMPLE ARCHITECTURE ---
  private buildTempleArchitecture() {
    // 1. 대청마루 바닥
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createWoodFloorTexture(),
      roughness: 0.35,
      metalness: 0.1,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.floorMesh.name = 'temple_floor';
    this.scene.add(this.floorMesh);

    // 2. 단청 목조 기둥들 (Pillars)
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.38, 8, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#7f1d1d', // 단청 주홍기둥
      roughness: 0.6,
      metalness: 0.1
    });

    const pillarCoords = [
      [-6, -6], [6, -6],
      [-6, 0], [6, 0],
      [-6, 6], [6, 6]
    ];

    pillarCoords.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 4, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;

      // 기둥 주초석 (Stone Base)
      const baseGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.3, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.9 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(x, 0.15, z);
      this.scene.add(base);

      // 상부 익공/단청 결구 (Bracket)
      const capGeo = new THREE.BoxGeometry(1.0, 0.4, 1.0);
      const capMat = new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.5 }); // 단청 녹색
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(x, 7.8, z);
      this.scene.add(cap);

      this.scene.add(pillar);
    });

    // 3. 사찰 후면 벽 및 창호지 창살 (Rear Altar Wall)
    const wallGeo = new THREE.BoxGeometry(24, 8, 0.4);
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#292524',
      roughness: 0.8
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 4, -8);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // 좌우 벽체
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-8, 4, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(8, 4, 0);
    this.scene.add(rightWall);

    // 4. 서까래 대들보 및 천장 처마 (Beams & Rafters)
    const beamGeo = new THREE.BoxGeometry(16, 0.5, 0.5);
    const beamMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.7 });
    for (let z = -6; z <= 6; z += 3) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 7.6, z);
      this.scene.add(beam);
    }

    // 5. 처마에 매달린 은은한 연등들 (Ceiling Lotus Lanterns)
    this.buildCeilingLanterns();
  }

  // --- CEILING LOTUS LANTERNS (전통 팔모 연꽃 연등) ---
  private buildCeilingLanterns() {
    const colors = [
      { hex: '#f472b6', emissive: '#db2777' }, // 연분홍
      { hex: '#fbbf24', emissive: '#d97706' }, // 황금빛
      { hex: '#34d399', emissive: '#059669' }, // 비취연두
      { hex: '#c084fc', emissive: '#9333ea' }, // 자주빛
      { hex: '#38bdf8', emissive: '#0284c7' }  // 청련
    ];

    for (let x = -5; x <= 5; x += 2.5) {
      for (let z = -3; z <= 4; z += 3.5) {
        const c = colors[Math.floor(Math.random() * colors.length)];
        const lanternGroup = new THREE.Group();

        // 1. 연등 팔각 지붕 갓 (Octagonal Lantern Canopy)
        const roofGeo = new THREE.ConeGeometry(0.42, 0.22, 8);
        const roofMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.5 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 0.35;
        lanternGroup.add(roof);

        // 2. 등 몸통 (속에서 빛나는 한지 등불)
        const bodyGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.45, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: c.hex,
          emissive: c.emissive,
          emissiveIntensity: 0.6,
          roughness: 0.3,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        lanternGroup.add(body);

        // 3. 연꽃 잎 층 (Layered Lotus Petals)
        const petalGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
        petalGeo.scale(0.8, 1, 0.3);
        const petalMat = new THREE.MeshStandardMaterial({
          color: c.hex,
          emissive: c.emissive,
          emissiveIntensity: 0.4,
          roughness: 0.25
        });

        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const petal = new THREE.Mesh(petalGeo, petalMat);
          petal.position.set(Math.cos(angle) * 0.34, -0.05, Math.sin(angle) * 0.34);
          petal.rotation.y = angle;
          petal.rotation.x = 0.4;
          lanternGroup.add(petal);
        }

        // 4. 하단 술 & 소원지 (Hanging Tassel & Wish Paper Ribbon)
        const tasselGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.25, 6);
        const tasselMat = new THREE.MeshStandardMaterial({ color: '#dc2626' }); // 붉은 노리개 술
        const tassel = new THREE.Mesh(tasselGeo, tasselMat);
        tassel.position.y = -0.35;
        lanternGroup.add(tassel);

        // 하늘거리는 한지 소원지 리본
        const ribbonGeo = new THREE.PlaneGeometry(0.16, 0.55);
        const ribbonMat = new THREE.MeshBasicMaterial({ color: '#fef08a', side: THREE.DoubleSide });
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.set(0, -0.7, 0);
        lanternGroup.add(ribbon);

        // 매단 줄
        const stringGeo = new THREE.CylinderGeometry(0.012, 0.012, 1.2, 4);
        const stringMat = new THREE.MeshBasicMaterial({ color: '#78350f' });
        const string = new THREE.Mesh(stringGeo, stringMat);
        string.position.set(x, 6.8, z);
        this.scene.add(string);

        lanternGroup.position.set(x, 6.1, z);
        this.scene.add(lanternGroup);
      }
    }
  }

  // --- BUDDHA ALTAR ---
  private buildBuddhaAltar() {
    const altarGroup = new THREE.Group();

    // 1. 수미단 (Altar Table Platform)
    const tableGeo = new THREE.BoxGeometry(7, 1.2, 2.4);
    const tableMat = new THREE.MeshStandardMaterial({
      color: '#451a03',
      roughness: 0.4,
      metalness: 0.15
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.6, -6.8);
    table.receiveShadow = true;
    table.castShadow = true;
    altarGroup.add(table);

    // 수미단 상판 붉은 융단
    const clothGeo = new THREE.BoxGeometry(6.8, 0.05, 2.3);
    const clothMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.8 });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.set(0, 1.22, -6.8);
    altarGroup.add(cloth);

    // 2. 연화대좌 (Lotus Throne for Buddha)
    const throneGeo = new THREE.CylinderGeometry(1.6, 1.9, 0.7, 24);
    const throneMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      metalness: 0.5,
      roughness: 0.35
    });
    const throne = new THREE.Mesh(throneGeo, throneMat);
    throne.position.set(0, 1.6, -6.8);
    altarGroup.add(throne);

    // 3. 황금 불상 (Golden Buddha Statue)
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      metalness: 0.85,
      roughness: 0.22,
      emissive: '#d97706',
      emissiveIntensity: 0.15
    });

    // 불상 가부좌 하체
    const lowerBodyGeo = new THREE.CylinderGeometry(0.9, 1.3, 0.8, 20);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, goldMat);
    lowerBody.position.set(0, 2.35, -6.8);
    lowerBody.castShadow = true;
    altarGroup.add(lowerBody);

    // 불상 상체
    const torsoGeo = new THREE.CylinderGeometry(0.65, 0.75, 1.2, 16);
    const torso = new THREE.Mesh(torsoGeo, goldMat);
    torso.position.set(0, 3.25, -6.8);
    torso.castShadow = true;
    altarGroup.add(torso);

    // 불상 머리
    const headGeo = new THREE.SphereGeometry(0.48, 20, 20);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0, 4.25, -6.8);
    altarGroup.add(head);

    // 육계 (Topknot Usnisa)
    const topknotGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const topknot = new THREE.Mesh(topknotGeo, goldMat);
    topknot.position.set(0, 4.75, -6.8);
    altarGroup.add(topknot);

    // 불상 후광 광배 (Golden Aureole / Mandorla)
    const aureoleGeo = new THREE.RingGeometry(0.7, 1.8, 32);
    const aureoleMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const aureole = new THREE.Mesh(aureoleGeo, aureoleMat);
    aureole.position.set(0, 3.8, -7.3);
    altarGroup.add(aureole);

    // 4. 촛대 2개 & 향로 (Candles & Incense Burner)
    [-1.8, 1.8].forEach(x => {
      const candleBaseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 12);
      const candleBaseMat = new THREE.MeshStandardMaterial({ color: '#78350f', metalness: 0.6 });
      const candleBase = new THREE.Mesh(candleBaseGeo, candleBaseMat);
      candleBase.position.set(x, 1.45, -6.2);
      altarGroup.add(candleBase);

      const candleStickGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
      const candleStickMat = new THREE.MeshStandardMaterial({ color: '#b91c1c' });
      const stick = new THREE.Mesh(candleStickGeo, candleStickMat);
      stick.position.set(x, 1.85, -6.2);
      altarGroup.add(stick);

      // 불꽃 구
      const flameGeo = new THREE.SphereGeometry(0.08, 8, 8);
      flameGeo.scale(1, 2, 1);
      const flameMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, 2.22, -6.2);
      altarGroup.add(flame);
    });

    // 중앙 청동 향로
    const burnerGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.35, 16);
    const burnerMat = new THREE.MeshStandardMaterial({ color: '#78350f', metalness: 0.7, roughness: 0.3 });
    const burner = new THREE.Mesh(burnerGeo, burnerMat);
    burner.position.set(0, 1.42, -6.1);
    altarGroup.add(burner);

    this.scene.add(altarGroup);
  }

  // --- CUSHION GRID (방석) ---
  private buildCushionGrid() {
    const cushionGeo = new THREE.CylinderGeometry(0.55, 0.58, 0.16, 24);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: '#78350f', // 원목빛 황토 방석
      roughness: 0.85,
    });

    const rows = 4;
    const cols = 5;
    const spacingX = 2.4;
    const spacingZ = 2.4;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -1.8;

    let index = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const posX = startX + c * spacingX;
        const posZ = startZ + r * spacingZ;

        const mesh = new THREE.Mesh(cushionGeo, cushionMat.clone());
        mesh.position.set(posX, 0.08, posZ);
        mesh.receiveShadow = true;
        mesh.userData = { isCushion: true, index };

        // 연화 문양 링 (Embroidered Lotus trim)
        const trimGeo = new THREE.TorusGeometry(0.48, 0.025, 8, 24);
        const trimMat = new THREE.MeshBasicMaterial({ color: '#d97706' });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.rotation.x = Math.PI / 2;
        trim.position.set(0, 0.085, 0);
        mesh.add(trim);

        this.scene.add(mesh);
        this.cushions.push({
          index,
          position: new THREE.Vector3(posX, 0, posZ),
          mesh,
          occupiedBy: null
        });

        index++;
      }
    }
  }

  // --- INCENSE SMOKE PARTICLES ---
  private setupIncenseParticles() {
    const count = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = 1.6 + (i / count) * 1.5;
      positions[i * 3 + 2] = -6.1 + (Math.random() - 0.5) * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#d6d3d1',
      size: 0.09,
      transparent: true,
      opacity: 0.45,
    });

    this.incenseSmokeParticles = new THREE.Points(geometry, material);
    this.scene.add(this.incenseSmokeParticles);
  }

  // --- DESTINATION MARKER ---
  private createTargetMarker() {
    const ringGeo = new THREE.RingGeometry(0.35, 0.42, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.targetMarker = new THREE.Mesh(ringGeo, ringMat);
    this.targetMarker.rotation.x = -Math.PI / 2;
    this.targetMarker.position.set(0, 0.02, 0);
    this.scene.add(this.targetMarker);
  }

  // --- 3D MONK ACTOR GENERATOR ---
  private createMonkMesh(robeColorHex: string, isUser = false): {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    headMesh: THREE.Mesh;
    handsMesh: THREE.Group;
    haloMesh: THREE.Mesh;
  } {
    const monkGroup = new THREE.Group();

    // 1. 승복 몸통 (Body Robe)
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.52, 0.85, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: robeColorHex,
      roughness: 0.75,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.45;
    bodyMesh.castShadow = true;
    monkGroup.add(bodyMesh);

    // 흰색 동정 (Collar)
    const collarGeo = new THREE.TorusGeometry(0.36, 0.04, 8, 16);
    const collarMat = new THREE.MeshStandardMaterial({ color: '#f5f5f4' });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.88;
    monkGroup.add(collar);

    // 2. 동자승 머리 (Head)
    const headGeo = new THREE.SphereGeometry(0.34, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: '#fed7aa', // 맑은 살구빛
      roughness: 0.6,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.25;
    headMesh.castShadow = true;
    monkGroup.add(headMesh);

    // 귀
    const earGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const leftEar = new THREE.Mesh(earGeo, headMat);
    leftEar.position.set(-0.34, 1.25, 0);
    monkGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, headMat);
    rightEar.position.set(0.34, 1.25, 0);
    monkGroup.add(rightEar);

    // 감은 평온한 눈 (Peaceful eyes)
    const eyeGeo = new THREE.TorusGeometry(0.05, 0.015, 6, 8, Math.PI);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#451a03' });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.26, 0.31);
    leftEye.rotation.z = Math.PI;
    monkGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.26, 0.31);
    rightEye.rotation.z = Math.PI;
    monkGroup.add(rightEye);

    // 볼터치 (Blush)
    const blushGeo = new THREE.CircleGeometry(0.06, 12);
    const blushMat = new THREE.MeshBasicMaterial({ color: '#f87171', transparent: true, opacity: 0.5 });
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.18, 1.18, 0.3);
    monkGroup.add(leftBlush);
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.18, 1.18, 0.3);
    monkGroup.add(rightBlush);

    // 3. 합장하는 두 손 (Praying Hands)
    const handsMesh = new THREE.Group();
    const handGeo = new THREE.SphereGeometry(0.1, 8, 8);
    handGeo.scale(0.8, 1.4, 0.8);
    const handMat = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.6 });
    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(-0.06, 0, 0);
    handsMesh.add(leftHand);
    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(0.06, 0, 0);
    handsMesh.add(rightHand);

    handsMesh.position.set(0, 0.72, 0.42);
    monkGroup.add(handsMesh);

    // 4. 후광 링 (Halo ring - especially for user)
    const haloGeo = new THREE.RingGeometry(0.48, 0.56, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isUser ? 0.75 : 0.3
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, 1.35, -0.05);
    monkGroup.add(haloMesh);

    return { group: monkGroup, bodyMesh, headMesh, handsMesh, haloMesh };
  }

  // --- SPAWN ACTORS ---
  private spawnPlayer() {
    const { group, bodyMesh, headMesh, handsMesh, haloMesh } = this.createMonkMesh('#78716c', true);
    
    // 시작 위치: 중앙 방석 (index 7)
    const initialCushion = this.cushions[7];
    group.position.copy(initialCushion.position);
    initialCushion.occupiedBy = 'player';

    this.player = {
      id: 'player',
      name: '나의 동자승',
      group,
      bodyMesh,
      headMesh,
      handsMesh,
      haloMesh,
      targetPos: initialCushion.position.clone(),
      isMoving: false,
      cushionIndex: 7,
      state: 'sitting',
      walkTime: 0,
      bowProgress: 0,
      isUser: true
    };

    this.scene.add(group);
  }

  private spawnFellowMonks() {
    // 산사의 시적인 닉네임들 ("다정한 이끼", "느린 발걸음" 등)
    const monkData = [
      { name: '다정한 이끼', cushionIdx: 2, color: '#57534e' },
      { name: '느린 발걸음', cushionIdx: 4, color: '#a8a29e' },
      { name: '유유자적한 구름', cushionIdx: 11, color: '#78716c' },
      { name: '고요한 소나무', cushionIdx: 13, color: '#d97706' },
      { name: '맑은 바람', cushionIdx: 16, color: '#44403c' },
      { name: '달빛 산책', cushionIdx: 18, color: '#78716c' },
    ];

    monkData.forEach((m, idx) => {
      const cushion = this.cushions[m.cushionIdx];
      if (!cushion) return;

      const { group, bodyMesh, headMesh, handsMesh, haloMesh } = this.createMonkMesh(m.color, false);
      group.position.copy(cushion.position);
      cushion.occupiedBy = `pilgrim-${idx}`;

      const pilgrim: MonkActor = {
        id: `pilgrim-${idx}`,
        name: m.name,
        group,
        bodyMesh,
        headMesh,
        handsMesh,
        haloMesh,
        targetPos: cushion.position.clone(),
        isMoving: false,
        cushionIndex: m.cushionIdx,
        state: 'sitting',
        walkTime: Math.random() * 10,
        bowProgress: 0,
        isUser: false
      };

      this.pilgrims.push(pilgrim);
      this.scene.add(group);
    });
  }

  // --- ACTIONS ---
  public movePlayerTo(worldPos: THREE.Vector3, cushionIdx: number | null = null) {
    if (!this.player) return;

    // 이전 방석 비우기
    if (this.player.cushionIndex !== null) {
      const oldCushion = this.cushions[this.player.cushionIndex];
      if (oldCushion) oldCushion.occupiedBy = null;
    }

    this.player.targetPos.copy(worldPos);
    this.player.targetPos.y = 0;
    this.player.isMoving = true;
    this.player.state = 'walking';
    this.player.cushionIndex = cushionIdx;

    // 마커 표시
    if (this.targetMarker) {
      this.targetMarker.position.set(worldPos.x, 0.02, worldPos.z);
      (this.targetMarker.material as THREE.MeshBasicMaterial).opacity = 0.8;
    }

    templeAudio.playWindChime(0.3);
    this.onPlayerStateChange?.('walking', cushionIdx);
  }

  public sitPlayerOnCushion(index: number) {
    const cushion = this.cushions[index];
    if (!cushion) return;

    if (cushion.occupiedBy && cushion.occupiedBy !== 'player') {
      this.onNotification?.('다른 도반이 이미 정진 중인 방석입니다.');
      return;
    }

    this.movePlayerTo(cushion.position, index);
  }

  public performPlayerAction(action: 'pray' | 'bow' | 'stand' | 'sit') {
    if (!this.player || this.player.isMoving) return;

    if (action === 'pray') {
      this.player.state = 'praying';
      templeAudio.playWindChime(0.5);
      this.onNotification?.('주변 도반들에게 마음속 깊이 합장 인사를 올렸습니다.');
      this.onPlayerStateChange?.('praying', this.player.cushionIndex);
    } else if (action === 'bow') {
      this.player.state = 'bowing';
      this.player.bowProgress = 0;
      templeAudio.playMoktak(0.8);
      this.onNotification?.('부처님 전에 정성스레 절을 올립니다.');
      this.onPlayerStateChange?.('bowing', this.player.cushionIndex);
    } else if (action === 'sit') {
      this.player.state = 'sitting';
      this.onPlayerStateChange?.('sitting', this.player.cushionIndex);
    } else if (action === 'stand') {
      this.player.state = 'idle';
      if (this.player.cushionIndex !== null) {
        this.cushions[this.player.cushionIndex].occupiedBy = null;
        this.player.cushionIndex = null;
      }
      this.onPlayerStateChange?.('idle', null);
    }
  }

  // --- TIME OF DAY SYSTEM (새벽 / 아침 / 노을 / 밤) ---
  public setTimeOfDay(time: 'dawn' | 'morning' | 'sunset' | 'night') {
    this.currentTimeOfDay = time;

    if (time === 'dawn') {
      // 새벽 05:00 - 자줏빛 새벽안개 & 청량함
      this.scene.background = new THREE.Color('#161329');
      (this.scene.fog as THREE.FogExp2).color.set('#161329');
      if (this.sunLight) {
        this.sunLight.color.set('#c4b5fd');
        this.sunLight.intensity = 1.1;
        this.sunLight.position.set(8, 6, 8);
      }
      if (this.hemiLight) {
        this.hemiLight.color.set('#a5b4fc');
        this.hemiLight.groundColor.set('#1e1b4b');
        this.hemiLight.intensity = 0.5;
      }
      this.onNotification?.('새벽 5시 예불: 서늘한 새벽 안개와 푸른 여명이 법당에 스며듭니다.');
    } else if (time === 'morning') {
      // 아침 09:00 - 따스한 황금 햇살
      this.scene.background = new THREE.Color('#1c1917');
      (this.scene.fog as THREE.FogExp2).color.set('#1c1917');
      if (this.sunLight) {
        this.sunLight.color.set('#fed7aa');
        this.sunLight.intensity = 1.9;
        this.sunLight.position.set(6, 12, 8);
      }
      if (this.hemiLight) {
        this.hemiLight.color.set('#fde68a');
        this.hemiLight.groundColor.set('#292524');
        this.hemiLight.intensity = 0.65;
      }
      this.onNotification?.('상쾌한 아침: 따사로운 햇살이 창살을 뚫고 대청마루를 비춥니다.');
    } else if (time === 'sunset') {
      // 노을 18:00 - 단청과 어우러지는 붉은 저녁놀
      this.scene.background = new THREE.Color('#3b1308');
      (this.scene.fog as THREE.FogExp2).color.set('#3b1308');
      if (this.sunLight) {
        this.sunLight.color.set('#ea580c');
        this.sunLight.intensity = 2.2;
        this.sunLight.position.set(12, 4, 6);
      }
      if (this.hemiLight) {
        this.hemiLight.color.set('#fb923c');
        this.hemiLight.groundColor.set('#451a03');
        this.hemiLight.intensity = 0.6;
      }
      this.onNotification?.('저녁 노을: 붉은 노을빛이 단청 처마와 부처님 광배를 곱게 물들입니다.');
    } else if (time === 'night') {
      // 깊은 밤 22:00 - 은은한 촛불과 푸른 달빛
      this.scene.background = new THREE.Color('#09090b');
      (this.scene.fog as THREE.FogExp2).color.set('#09090b');
      if (this.sunLight) {
        this.sunLight.color.set('#38bdf8');
        this.sunLight.intensity = 0.38;
        this.sunLight.position.set(4, 14, 4);
      }
      if (this.hemiLight) {
        this.hemiLight.color.set('#1e293b');
        this.hemiLight.groundColor.set('#020617');
        this.hemiLight.intensity = 0.25;
      }
      this.onNotification?.('깊은 산사의 밤: 촛불과 달빛만 고요히 번뇌를 비추고 있습니다.');
    }
  }

  // --- TEMPLE HALL THEMES (대웅전 / 극락전 / 산신각) ---
  public setHallTheme(hall: 'daewoong' | 'geungnak' | 'sansin') {
    this.currentHall = hall;
    if (hall === 'daewoong') {
      this.onNotification?.('대웅전(大雄殿): 본존불 석가모니 부처님을 모신 주 법당입니다.');
    } else if (hall === 'geungnak') {
      this.onNotification?.('극락전(極樂殿): 아미타 부처님의 자비로 마음의 상처를 치유하는 기도당입니다.');
    } else if (hall === 'sansin') {
      this.onNotification?.('산신각(山神閣): 깊은 소나무 숲속에서 자연과 하나 되는 고요한 전각입니다.');
    }
  }

  // --- INPUT HANDLING ---
  private onPointerDown = (event: PointerEvent) => {
    // Only handle primary click
    if (event.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. 방석 클릭 감지
    const cushionMeshes = this.cushions.map(c => c.mesh);
    const cushionHits = this.raycaster.intersectObjects(cushionMeshes, true);

    if (cushionHits.length > 0) {
      let hitObj: THREE.Object3D | null = cushionHits[0].object;
      while (hitObj && !hitObj.userData.isCushion) {
        hitObj = hitObj.parent;
      }
      if (hitObj && hitObj.userData.isCushion) {
        this.sitPlayerOnCushion(hitObj.userData.index);
        return;
      }
    }

    // 2. 바닥 클릭 감지 (이동)
    if (this.floorMesh) {
      const floorHits = this.raycaster.intersectObject(this.floorMesh);
      if (floorHits.length > 0) {
        const point = floorHits[0].point;
        this.movePlayerTo(point, null);
      }
    }
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // --- GAME TICK LOOP ---
  private tick = () => {
    this.animFrameId = requestAnimationFrame(this.tick);
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.controls.update();

    // 촛불 일렁임
    this.candleLights.forEach((light, i) => {
      light.intensity = 1.0 + Math.sin(time * 8 + i * 2) * 0.25;
    });

    // 향 연기 상승 애니메이션
    if (this.incenseSmokeParticles) {
      const positions = this.incenseSmokeParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += 0.008; // Y rise
        positions[i * 3] += Math.sin(time * 2 + i) * 0.0015; // X sway
        if (positions[i * 3 + 1] > 3.2) {
          positions[i * 3 + 1] = 1.6;
          positions[i * 3] = (Math.random() - 0.5) * 0.1;
        }
      }
      this.incenseSmokeParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 타겟 마커 페이드아웃
    if (this.targetMarker) {
      const mat = this.targetMarker.material as THREE.MeshBasicMaterial;
      if (mat.opacity > 0) {
        mat.opacity = Math.max(0, mat.opacity - delta * 1.5);
      }
    }

    // 플레이어 이동 및 애니메이션 처리
    this.updateActor(this.player, delta, time);

    // 다른 조용한 도반들 애니메이션 (가끔 고개 끄덕이거나 합장)
    this.pilgrims.forEach(monk => {
      this.updateActor(monk, delta, time);
      // 간헐적 자세 변화
      if (Math.random() < 0.001) {
        monk.state = monk.state === 'sitting' ? 'praying' : 'sitting';
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  private updateActor(actor: MonkActor | null, delta: number, time: number) {
    if (!actor) return;

    // 1. 이동 중일 때 (Walking)
    if (actor.isMoving) {
      const dist = actor.group.position.distanceTo(actor.targetPos);
      if (dist > 0.08) {
        // 부드러운 전진 이동
        actor.group.position.lerp(actor.targetPos, Math.min(1, delta * 3.5));

        // 걷는 방향을 자연스럽게 바라보기
        const lookTarget = actor.targetPos.clone();
        lookTarget.y = actor.group.position.y;
        actor.group.lookAt(lookTarget);

        // 아장아장 걷는 동자승 바운스 (Wobble)
        actor.walkTime += delta * 12;
        actor.group.position.y = Math.abs(Math.sin(actor.walkTime)) * 0.12;
        actor.group.rotation.z = Math.sin(actor.walkTime) * 0.08;
      } else {
        // 목적지 도착
        actor.group.position.copy(actor.targetPos);
        actor.group.position.y = 0;
        actor.group.rotation.z = 0;
        actor.isMoving = false;

        if (actor.cushionIndex !== null) {
          actor.state = 'sitting';
          this.cushions[actor.cushionIndex].occupiedBy = actor.id;
          // 불단 쪽(Z 음수 방향)을 경건하게 바라보기
          actor.group.rotation.y = Math.PI;
        } else {
          actor.state = 'idle';
        }

        if (actor.isUser) {
          this.onPlayerStateChange?.(actor.state, actor.cushionIndex);
        }
      }
    }

    // 2. 오체투지(五體投地) 절하기 애니메이션 (True Buddhist Prostration)
    if (actor.state === 'bowing') {
      actor.bowProgress += delta * 1.4; // 경건하고 침착한 절하기 속도
      const sinP = Math.sin(actor.bowProgress);

      // 상체를 깊이 숙여 이마가 바닥 방석에 닿도록 엎드림
      actor.bodyMesh.rotation.x = sinP * (Math.PI * 0.42);
      actor.bodyMesh.position.y = 0.45 - sinP * 0.22;
      actor.bodyMesh.position.z = sinP * 0.25;

      // 머리가 방석 표면에 완전히 닿는 모션 (이마를 방석에 대고)
      actor.headMesh.position.y = 1.25 - sinP * 0.82;
      actor.headMesh.position.z = sinP * 0.65;

      // 두 손이 바닥에 닿고 부처님 발을 받드는 '접족례(接足禮)' 뒤집기
      actor.handsMesh.position.y = 0.72 - sinP * 0.55;
      actor.handsMesh.position.z = 0.42 + sinP * 0.42;
      actor.handsMesh.rotation.x = sinP * Math.PI * 0.9;

      if (actor.bowProgress >= Math.PI) {
        // 절 한 번 완료 후 합장하며 가부좌 복귀
        actor.state = 'sitting';
        actor.bodyMesh.rotation.x = 0;
        actor.bodyMesh.position.set(0, 0.45, 0);
        actor.headMesh.position.set(0, 1.25, 0);
        actor.handsMesh.position.set(0, 0.72, 0.42);
        actor.handsMesh.rotation.x = 0;
        if (actor.isUser) {
          this.onPlayerStateChange?.('sitting', actor.cushionIndex);
        }
      }
    }

    // 3. 평온한 숨쉬기 미세 호흡 (Idle/Sitting Breathing)
    if (actor.state === 'sitting' || actor.state === 'praying') {
      const breath = Math.sin(time * 2 + (actor.isUser ? 0 : 2)) * 0.03;
      actor.bodyMesh.scale.set(1 + breath, 1 + breath, 1 + breath);
      actor.haloMesh.rotation.z = time * 0.5;
    }
  }

  // 정리 (Cleanup)
  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
