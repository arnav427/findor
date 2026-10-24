import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Box,
  RotateCcw,
  Eye,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  ShieldCheck,
  Search,
  Sliders,
} from 'lucide-react';
import { ItemReport } from '../types';

// Pre-allocated module-scope math objects (Zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _partTargetPos = new THREE.Vector3();

interface InspectablePartMeta {
  id: string;
  name: string;
  traitLabel: string;
  verificationHint: string;
  baseOffset: THREE.Vector3;
  explodeVector: THREE.Vector3;
}

interface Item3DViewerModalProps {
  isOpen: boolean;
  onClose?: () => void;
  report: ItemReport | null;
  allReports?: ItemReport[];
  onSelectReport?: (rep: ItemReport) => void;
  onStartClaim?: (rep: ItemReport) => void;
  onStartHandover?: (rep: ItemReport) => void;
  onSendToCanvas?: (rep: ItemReport) => void;
  onExpandFullscreen?: (rep: ItemReport) => void;
  embedded?: boolean;
  heightClassName?: string;
}

type CameraPreset = 'isometric' | 'front' | 'top' | 'back' | 'closeup';

function parseItemColorHex(colorName?: string): number {
  const raw = (colorName || '').toLowerCase();
  if (raw.includes('rose') || raw.includes('red') || raw.includes('crimson') || raw.includes('burgundy')) {
    return 0xb91c1c;
  }
  if (raw.includes('navy') || raw.includes('blue') || raw.includes('cobalt') || raw.includes('indigo')) {
    return 0x1e3a8a;
  }
  if (raw.includes('emerald') || raw.includes('green') || raw.includes('olive') || raw.includes('teal')) {
    return 0x047857;
  }
  if (raw.includes('amber') || raw.includes('gold') || raw.includes('yellow') || raw.includes('tan') || raw.includes('brown')) {
    return 0x92400e;
  }
  if (raw.includes('silver') || raw.includes('white') || raw.includes('platinum')) {
    return 0xd1d5db;
  }
  if (raw.includes('black') || raw.includes('obsidian') || raw.includes('onyx')) {
    return 0x1e293b;
  }
  // Default Space Gray / Slate Titanium
  return 0x475569;
}

function createProceduralSurfaceTexture(
  renderer: THREE.WebGLRenderer,
  label: string,
  subLabel: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Accent frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, 464, 464);

  // Badge header
  ctx.fillStyle = accentHex;
  ctx.fillRect(42, 48, 428, 54);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('FINDORA 3D ITEM VERIFICATION', 62, 83);

  // Item title & trait
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(label.slice(0, 24), 48, 170);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px monospace';
  ctx.fillText(subLabel.slice(0, 32), 48, 215);

  // Simulated micro-serial / verification barcode
  ctx.fillStyle = '#38bdf8';
  for (let x = 48; x < 440; x += 14) {
    const w = (x % 28 === 0) ? 8 : 4;
    ctx.fillRect(x, 380, w, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.65)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.25)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Item3DViewerModal: React.FC<Item3DViewerModalProps> = ({
  isOpen,
  onClose,
  report,
  allReports = [],
  onSelectReport,
  onStartClaim,
  onStartHandover,
  onSendToCanvas,
  onExpandFullscreen,
  embedded = false,
  heightClassName = 'h-[540px]',
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const activeReport = report || allReports[0] || null;

  const [explodedAmount, setExplodedAmount] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [customFinishHex, setCustomFinishHex] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<InspectablePartMeta | null>(null);
  const [checkedParts, setCheckedParts] = useState<Record<string, boolean>>({});
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Refs synced into the WebGL loop without tearing down the canvas
  const explodedRef = useRef<number>(0);
  const presetRef = useRef<CameraPreset>('isometric');
  const presetTransitionActiveRef = useRef<boolean>(false);
  const autoRotateRef = useRef<boolean>(true);
  const requestRenderRef = useRef<(() => void) | null>(null);

  // Reset inspection state when switching items
  useEffect(() => {
    setCustomFinishHex(null);
    setExplodedAmount(0);
    explodedRef.current = 0;
    setSelectedPart(null);
    setCheckedParts({});
    setCameraPreset('isometric');
    presetRef.current = 'isometric';
    presetTransitionActiveRef.current = true;
    requestRenderRef.current?.();
  }, [activeReport?.id]);

  // Keyboard shortcut 'H' to collapse/expand bottom control dock & 'Escape' to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !embedded && onClose) {
        onClose();
      } else if (e.key === 'h' || e.key === 'H') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          document.activeElement?.tagName !== 'SELECT'
        ) {
          setDockCollapsed((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, embedded, onClose]);

  const inspectablePartsList = useMemo<InspectablePartMeta[]>(() => {
    if (!activeReport) return [];
    const cat = activeReport.category;
    const titleLower = activeReport.title.toLowerCase();

    if (
      cat === 'Electronics' &&
      (titleLower.includes('headphone') ||
        titleLower.includes('earbud') ||
        titleLower.includes('airpod') ||
        titleLower.includes('sony'))
    ) {
      return [
        {
          id: 'headband-arch',
          name: '1. Acoustic Headband Arch',
          traitLabel: `${activeReport.color} Spring Steel & Soft Cushion Arch`,
          verificationHint: 'Check upper arch padding for wear or initials.',
          baseOffset: new THREE.Vector3(0, 1.05, 0),
          explodeVector: new THREE.Vector3(0, 0.55, 0),
        },
        {
          id: 'left-earcup',
          name: '2. Left Acoustic Earcup Shell',
          traitLabel: `${activeReport.brand || 'Studio'} Matte Outer Housing (L)`,
          verificationHint: activeReport.distinguishingFeatures || 'Inspect left outer shell for surface marks.',
          baseOffset: new THREE.Vector3(-0.78, 0.55, 0),
          explodeVector: new THREE.Vector3(-0.55, 0, 0),
        },
        {
          id: 'right-earcup',
          name: '3. Right Acoustic Earcup & Touch Sensor',
          traitLabel: 'Capacitive Touch Pad & Mic Grille (R)',
          verificationHint: 'Verify touch control plate and copper mic ring.',
          baseOffset: new THREE.Vector3(0.78, 0.55, 0),
          explodeVector: new THREE.Vector3(0.55, 0, 0),
        },
        {
          id: 'ear-cushions',
          name: '4. Memory Foam Ear Cushions',
          traitLabel: 'Acoustic Seal Cushions & Inner Mesh',
          verificationHint: 'Check inside L/R fabric scrim for serial tag.',
          baseOffset: new THREE.Vector3(0, 0.55, 0),
          explodeVector: new THREE.Vector3(0, -0.25, 0.45),
        },
        {
          id: 'hinge-swivels',
          name: '5. Brushed Metal Folding Hinges',
          traitLabel: 'Dual-Axis Machined Swivel Joints',
          verificationHint: 'Inspect hinge joints for custom tape or micro-scratches.',
          baseOffset: new THREE.Vector3(0, 0.88, 0),
          explodeVector: new THREE.Vector3(0, 0.25, -0.4),
        },
      ];
    }

    if (cat === 'Electronics') {
      // Laptop / MacBook / Tablet 7-part composite model
      return [
        {
          id: 'chassis-base',
          name: '1. CNC Unibody Lower Chassis',
          traitLabel: `${activeReport.color} Anodized Aluminum Deck`,
          verificationHint: `Check bottom laser-etched serial & ${activeReport.buildingName} custody tag.`,
          baseOffset: new THREE.Vector3(0, 0.08, 0),
          explodeVector: new THREE.Vector3(0, -0.35, 0),
        },
        {
          id: 'keyboard-well',
          name: '2. Backlit Tactile Keyboard Matrix',
          traitLabel: 'Recessed Matte Black Keycap Array',
          verificationHint: 'Inspect keycaps for shine or language layout.',
          baseOffset: new THREE.Vector3(0, 0.145, -0.12),
          explodeVector: new THREE.Vector3(0, 0.28, -0.1),
        },
        {
          id: 'trackpad-zone',
          name: '3. Haptic Glass Trackpad & Palmrest',
          traitLabel: 'Precision Glass Surface & Palmrest Flanks',
          verificationHint: activeReport.distinguishingFeatures || 'Check palmrest corners for stickers or wear.',
          baseOffset: new THREE.Vector3(0, 0.146, 0.44),
          explodeVector: new THREE.Vector3(0, 0.18, 0.45),
        },
        {
          id: 'display-lid',
          name: '4. Clamshell Display Housing',
          traitLabel: `${activeReport.brand || 'Pro'} Top Shell & Hinged Lid`,
          verificationHint: 'Inspect exterior top cover for decals, cases, or dents.',
          baseOffset: new THREE.Vector3(0, 0.82, -0.68),
          explodeVector: new THREE.Vector3(0, 0.55, -0.55),
        },
        {
          id: 'retina-panel',
          name: '5. Optical Display Glass & Bezel',
          traitLabel: 'Anti-Reflective Glass Panel & Camera Notch',
          verificationHint: 'Verify lock-screen alias or screen protector alignment.',
          baseOffset: new THREE.Vector3(0, 0.82, -0.64),
          explodeVector: new THREE.Vector3(0, 0.45, 0.25),
        },
        {
          id: 'sticker-badge',
          name: '6. Distinguishing Sticker / Asset Decal',
          traitLabel: activeReport.distinguishingFeatures || 'Custom Identifying Decal',
          verificationHint: 'Primary visual trait used in multi-signal matching.',
          baseOffset: new THREE.Vector3(-0.56, 0.15, 0.44),
          explodeVector: new THREE.Vector3(-0.45, 0.35, 0.5),
        },
      ];
    }

    if (cat === 'Keys') {
      return [
        {
          id: 'split-ring',
          name: '1. Tempered Steel Split Keyring',
          traitLabel: '32mm Brushed Nickel Split Ring',
          verificationHint: 'Check ring clasp and attached fobs.',
          baseOffset: new THREE.Vector3(0, 0.85, 0),
          explodeVector: new THREE.Vector3(0, 0.5, 0),
        },
        {
          id: 'primary-key',
          name: '2. Primary Brass / Nickel Dorm Key',
          traitLabel: 'Precision Milled Bitting Teeth Profile',
          verificationHint: 'Key tooth pattern and stamped bow code.',
          baseOffset: new THREE.Vector3(-0.28, 0.42, 0),
          explodeVector: new THREE.Vector3(-0.55, -0.15, 0.2),
        },
        {
          id: 'secondary-key',
          name: '3. Secondary Locker / Lab Key',
          traitLabel: 'Anodized Head Secondary Key',
          verificationHint: 'Check stamped room code on key shoulder.',
          baseOffset: new THREE.Vector3(0.28, 0.42, 0),
          explodeVector: new THREE.Vector3(0.55, -0.15, -0.2),
        },
        {
          id: 'lanyard-fob',
          name: '4. Distinguishing Keychain Fob / Tag',
          traitLabel: activeReport.distinguishingFeatures || `${activeReport.color} Campus Tag`,
          verificationHint: 'Inspect custom lanyard strap or engraved token.',
          baseOffset: new THREE.Vector3(0, 0.48, 0.22),
          explodeVector: new THREE.Vector3(0, -0.35, 0.55),
        },
      ];
    }

    if (cat === 'Water bottles') {
      return [
        {
          id: 'flask-body',
          name: '1. Double-Wall Insulated Cylinder',
          traitLabel: `${activeReport.color} Powder-Coated Stainless Body`,
          verificationHint: activeReport.distinguishingFeatures || 'Inspect lower boot for dents or stickers.',
          baseOffset: new THREE.Vector3(0, 0.68, 0),
          explodeVector: new THREE.Vector3(0, 0, 0),
        },
        {
          id: 'neck-collar',
          name: '2. Brushed Steel Thermal Collar',
          traitLabel: 'Threaded Stainless Rim & Seal',
          verificationHint: 'Check rim condition and internal gasket.',
          baseOffset: new THREE.Vector3(0, 1.42, 0),
          explodeVector: new THREE.Vector3(0, 0.35, 0),
        },
        {
          id: 'cap-assembly',
          name: '3. Leakproof Chug Cap & Carry Loop',
          traitLabel: 'Molded Polymer Cap with Pivoting Bail Handle',
          verificationHint: 'Verify cap style (straw vs chug) and carabiner wear.',
          baseOffset: new THREE.Vector3(0, 1.62, 0),
          explodeVector: new THREE.Vector3(0, 0.75, 0),
        },
        {
          id: 'silicone-boot',
          name: '4. Protective Base Boot & Sticker Band',
          traitLabel: 'Non-Slip Base Bumper & Vinyl Decal Zone',
          verificationHint: 'Check bottom stamp and vinyl sticker placement.',
          baseOffset: new THREE.Vector3(0, 0.16, 0),
          explodeVector: new THREE.Vector3(0, -0.4, 0.35),
        },
      ];
    }

    // Default: Wallet / ID / Bag / General Multi-Part Item (5 parts)
    return [
      {
        id: 'outer-shell',
        name: '1. Primary Exterior Body / Cover',
        traitLabel: `${activeReport.color} Textured Outer Shell`,
        verificationHint: activeReport.distinguishingFeatures || 'Check exterior grain and stitching.',
        baseOffset: new THREE.Vector3(0, 0.48, 0),
        explodeVector: new THREE.Vector3(0, 0, -0.35),
      },
      {
        id: 'inner-compartment',
        name: '2. Interior Card & ID Compartment',
        traitLabel: 'Multi-Slot Divider & Lining',
        verificationHint: 'Private ownership verification compartment.',
        baseOffset: new THREE.Vector3(0, 0.48, 0.12),
        explodeVector: new THREE.Vector3(0, 0.25, 0.25),
      },
      {
        id: 'metal-clasp',
        name: '3. Metallic Emblem & Closure Hardware',
        traitLabel: `${activeReport.brand || 'Precision'} Brushed Metal Accent`,
        verificationHint: 'Inspect clasp hardware and embossed brand mark.',
        baseOffset: new THREE.Vector3(0, 0.56, 0.22),
        explodeVector: new THREE.Vector3(0, 0.45, 0.55),
      },
      {
        id: 'id-window',
        name: '4. Credential / Asset Tag Insert',
        traitLabel: 'Protected Verification Badge Slot',
        verificationHint: `Reported near ${activeReport.approximateLocationLabel}.`,
        baseOffset: new THREE.Vector3(0.28, 0.48, 0.18),
        explodeVector: new THREE.Vector3(0.48, -0.2, 0.4),
      },
    ];
  }, [activeReport]);

  // Mount & manage the Three.js scene
  useEffect(() => {
    if (!isOpen || !canvasMountRef.current || !activeReport) return;

    const container = canvasMountRef.current;
    container.innerHTML = '';

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x0b1120);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x0b1120, 0.065);

    // 2. Mandatory RoomEnvironment + PMREMGenerator reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(2.5, 1.85, 2.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.52, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.2;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;

    // 4. Balanced 3-Point Studio Lighting Rig (Warm Key + Cool Hemisphere Fill + Rim)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(3.5, 5.5, 3.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    const d = 2.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.15);
    rimLight.position.set(-3.2, 2.8, -2.8);
    scene.add(rimLight);

    // 5. Grounding Studio Pedestal & Radial Contact Shadow (Offset >= 0.02 to prevent Z-fighting)
    const pedestalGeo = new THREE.CylinderGeometry(1.65, 1.78, 0.12, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.65,
      metalness: 0.25,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.set(0, -0.06, 0);
    pedestalMesh.receiveShadow = true;
    scene.add(pedestalMesh);

    const ringGeo = new THREE.RingGeometry(1.52, 1.56, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.003, 0);
    scene.add(ringMesh);

    const shadowTex = createRadialContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.set(0, 0.006, 0);
    scene.add(contactShadow);

    // 6. Build Composite 3–12 Part Procedural Object Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const primaryColorHex =
      customFinishHex !== null ? customFinishHex : parseItemColorHex(activeReport.color);

    const primaryMetalMat = new THREE.MeshPhysicalMaterial({
      color: primaryColorHex,
      metalness: 0.78,
      roughness: 0.24,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
      wireframe: wireframeMode,
    });

    const secondaryMatteMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.2,
      roughness: 0.72, // differs by >= 0.25 from primaryMetalMat
      wireframe: wireframeMode,
    });

    const accentChromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.94,
      roughness: 0.12,
      wireframe: wireframeMode,
    });

    const screenTex = createProceduralSurfaceTexture(
      renderer,
      activeReport.title,
      `${activeReport.category} · ${activeReport.color}`,
      activeReport.type === 'lost' ? '#e11d48' : '#10b981'
    );

    const screenGlassMat = new THREE.MeshPhysicalMaterial({
      map: screenTex,
      roughness: 0.12,
      metalness: 0.1,
      clearcoat: 0.9,
      wireframe: wireframeMode,
    });

    const stickerMat = new THREE.MeshStandardMaterial({
      color: activeReport.type === 'lost' ? 0xf43f5e : 0x10b981,
      roughness: 0.4,
      metalness: 0.1,
      wireframe: wireframeMode,
    });

    const partGroups: Array<{
      meta: InspectablePartMeta;
      group: THREE.Group;
    }> = [];

    const clickableMeshes: THREE.Mesh[] = [];

    const registerPartMesh = (mesh: THREE.Mesh, meta: InspectablePartMeta) => {
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      mesh.userData.partMeta = meta;
      mesh.layers.enable(1);
      clickableMeshes.push(mesh);
    };

    const cat = activeReport.category;
    const titleLower = activeReport.title.toLowerCase();

    if (
      cat === 'Electronics' &&
      (titleLower.includes('headphone') ||
        titleLower.includes('earbud') ||
        titleLower.includes('airpod') ||
        titleLower.includes('sony'))
    ) {
      // Composite Studio Headphones (5 distinct multi-geometry groups)
      inspectablePartsList.forEach((meta, idx) => {
        const pg = new THREE.Group();
        pg.position.copy(meta.baseOffset);

        if (idx === 0) {
          const archGeo = new THREE.TorusGeometry(0.75, 0.075, 18, 42, Math.PI);
          const archMesh = new THREE.Mesh(archGeo, primaryMetalMat);
          registerPartMesh(archMesh, meta);
          pg.add(archMesh);
        } else if (idx === 1) {
          const cupGeo = new THREE.CylinderGeometry(0.34, 0.3, 0.22, 32);
          cupGeo.rotateZ(Math.PI / 2);
          const cupMesh = new THREE.Mesh(cupGeo, primaryMetalMat);
          registerPartMesh(cupMesh, meta);
          pg.add(cupMesh);
        } else if (idx === 2) {
          const cupGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.22, 32);
          cupGeo.rotateZ(Math.PI / 2);
          const cupMesh = new THREE.Mesh(cupGeo, primaryMetalMat);
          registerPartMesh(cupMesh, meta);
          pg.add(cupMesh);

          const sensorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 28);
          sensorGeo.rotateZ(Math.PI / 2);
          const sensorMesh = new THREE.Mesh(sensorGeo, stickerMat);
          sensorMesh.position.set(0.12, 0, 0);
          registerPartMesh(sensorMesh, meta);
          pg.add(sensorMesh);
        } else if (idx === 3) {
          const padGeo = new THREE.TorusGeometry(0.24, 0.08, 16, 32);
          padGeo.rotateY(Math.PI / 2);
          const padL = new THREE.Mesh(padGeo, secondaryMatteMat);
          padL.position.set(-0.62, 0, 0);
          registerPartMesh(padL, meta);
          pg.add(padL);

          const padR = new THREE.Mesh(padGeo, secondaryMatteMat);
          padR.position.set(0.62, 0, 0);
          registerPartMesh(padR, meta);
          pg.add(padR);
        } else {
          const hingeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.28, 16);
          const hingeL = new THREE.Mesh(hingeGeo, accentChromeMat);
          hingeL.position.set(-0.75, 0, 0);
          registerPartMesh(hingeL, meta);
          pg.add(hingeL);

          const hingeR = new THREE.Mesh(hingeGeo, accentChromeMat);
          hingeR.position.set(0.75, 0, 0);
          registerPartMesh(hingeR, meta);
          pg.add(hingeR);
        }

        rootGroup.add(pg);
        partGroups.push({ meta, group: pg });
      });
    } else if (cat === 'Electronics') {
      // Composite 6-Part Laptop Model
      inspectablePartsList.forEach((meta, idx) => {
        const pg = new THREE.Group();
        pg.position.copy(meta.baseOffset);

        if (idx === 0) {
          // 1. Base deck
          const baseGeo = new THREE.BoxGeometry(1.75, 0.09, 1.22);
          const baseMesh = new THREE.Mesh(baseGeo, primaryMetalMat);
          registerPartMesh(baseMesh, meta);
          pg.add(baseMesh);
        } else if (idx === 1) {
          // 2. Keyboard matrix
          const kbGeo = new THREE.BoxGeometry(1.48, 0.025, 0.56);
          const kbMesh = new THREE.Mesh(kbGeo, secondaryMatteMat);
          registerPartMesh(kbMesh, meta);
          pg.add(kbMesh);
        } else if (idx === 2) {
          // 3. Glass trackpad
          const tpGeo = new THREE.BoxGeometry(0.56, 0.02, 0.34);
          const tpMesh = new THREE.Mesh(tpGeo, accentChromeMat);
          registerPartMesh(tpMesh, meta);
          pg.add(tpMesh);
        } else if (idx === 3) {
          // 4. Display clamshell housing
          const lidGeo = new THREE.BoxGeometry(1.75, 1.12, 0.05);
          const lidMesh = new THREE.Mesh(lidGeo, primaryMetalMat);
          lidMesh.rotation.x = -0.18;
          registerPartMesh(lidMesh, meta);
          pg.add(lidMesh);
        } else if (idx === 4) {
          // 5. Screen glass panel with procedural texture
          const panelGeo = new THREE.PlaneGeometry(1.62, 1.0);
          const panelMesh = new THREE.Mesh(panelGeo, screenGlassMat);
          panelMesh.rotation.x = -0.18;
          registerPartMesh(panelMesh, meta);
          pg.add(panelMesh);
        } else {
          // 6. Distinguishing sticker / asset badge
          const badgeGeo = new THREE.BoxGeometry(0.28, 0.022, 0.18);
          const badgeMesh = new THREE.Mesh(badgeGeo, stickerMat);
          registerPartMesh(badgeMesh, meta);
          pg.add(badgeMesh);
        }

        rootGroup.add(pg);
        partGroups.push({ meta, group: pg });
      });
    } else if (cat === 'Keys') {
      // Composite 4-Part Keyring Assembly
      inspectablePartsList.forEach((meta, idx) => {
        const pg = new THREE.Group();
        pg.position.copy(meta.baseOffset);

        if (idx === 0) {
          const ringGeo2 = new THREE.TorusGeometry(0.28, 0.035, 16, 36);
          const ringMesh2 = new THREE.Mesh(ringGeo2, accentChromeMat);
          registerPartMesh(ringMesh2, meta);
          pg.add(ringMesh2);
        } else if (idx === 1) {
          const bowGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24);
          bowGeo.rotateX(Math.PI / 2);
          const bowMesh = new THREE.Mesh(bowGeo, primaryMetalMat);
          bowMesh.position.set(0, 0.22, 0);
          registerPartMesh(bowMesh, meta);
          pg.add(bowMesh);

          const bladeGeo = new THREE.BoxGeometry(0.09, 0.55, 0.03);
          const bladeMesh = new THREE.Mesh(bladeGeo, accentChromeMat);
          bladeMesh.position.set(0, -0.12, 0);
          registerPartMesh(bladeMesh, meta);
          pg.add(bladeMesh);
        } else if (idx === 2) {
          const bowGeo = new THREE.BoxGeometry(0.28, 0.24, 0.045);
          const bowMesh = new THREE.Mesh(bowGeo, stickerMat);
          bowMesh.position.set(0, 0.2, 0);
          registerPartMesh(bowMesh, meta);
          pg.add(bowMesh);

          const bladeGeo = new THREE.BoxGeometry(0.08, 0.48, 0.03);
          const bladeMesh = new THREE.Mesh(bladeGeo, accentChromeMat);
          bladeMesh.position.set(0, -0.1, 0);
          registerPartMesh(bladeMesh, meta);
          pg.add(bladeMesh);
        } else {
          const fobGeo = new THREE.BoxGeometry(0.36, 0.62, 0.08);
          const fobMesh = new THREE.Mesh(fobGeo, secondaryMatteMat);
          registerPartMesh(fobMesh, meta);
          pg.add(fobMesh);
        }

        rootGroup.add(pg);
        partGroups.push({ meta, group: pg });
      });
    } else if (cat === 'Water bottles') {
      // Composite 4-Part Insulated Bottle
      inspectablePartsList.forEach((meta, idx) => {
        const pg = new THREE.Group();
        pg.position.copy(meta.baseOffset);

        if (idx === 0) {
          const cylGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.15, 36);
          const cylMesh = new THREE.Mesh(cylGeo, primaryMetalMat);
          registerPartMesh(cylMesh, meta);
          pg.add(cylMesh);
        } else if (idx === 1) {
          const neckGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.22, 32);
          const neckMesh = new THREE.Mesh(neckGeo, accentChromeMat);
          registerPartMesh(neckMesh, meta);
          pg.add(neckMesh);
        } else if (idx === 2) {
          const capGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 32);
          const capMesh = new THREE.Mesh(capGeo, secondaryMatteMat);
          registerPartMesh(capMesh, meta);
          pg.add(capMesh);

          const loopGeo = new THREE.TorusGeometry(0.22, 0.03, 12, 24, Math.PI);
          const loopMesh = new THREE.Mesh(loopGeo, secondaryMatteMat);
          loopMesh.position.set(0, 0.1, 0);
          registerPartMesh(loopMesh, meta);
          pg.add(loopMesh);
        } else {
          const bootGeo = new THREE.CylinderGeometry(0.44, 0.43, 0.28, 36);
          const bootMesh = new THREE.Mesh(bootGeo, stickerMat);
          registerPartMesh(bootMesh, meta);
          pg.add(bootMesh);
        }

        rootGroup.add(pg);
        partGroups.push({ meta, group: pg });
      });
    } else {
      // Composite 4-Part Wallet / ID / Backpack / General Item
      inspectablePartsList.forEach((meta, idx) => {
        const pg = new THREE.Group();
        pg.position.copy(meta.baseOffset);

        if (idx === 0) {
          const shellGeo = new THREE.BoxGeometry(1.35, 0.92, 0.22);
          const shellMesh = new THREE.Mesh(shellGeo, primaryMetalMat);
          registerPartMesh(shellMesh, meta);
          pg.add(shellMesh);
        } else if (idx === 1) {
          const innerGeo = new THREE.BoxGeometry(1.24, 0.82, 0.1);
          const innerMesh = new THREE.Mesh(innerGeo, secondaryMatteMat);
          registerPartMesh(innerMesh, meta);
          pg.add(innerMesh);
        } else if (idx === 2) {
          const claspGeo = new THREE.BoxGeometry(0.42, 0.16, 0.06);
          const claspMesh = new THREE.Mesh(claspGeo, accentChromeMat);
          registerPartMesh(claspMesh, meta);
          pg.add(claspMesh);
        } else {
          const cardGeo = new THREE.PlaneGeometry(0.62, 0.42);
          const cardMesh = new THREE.Mesh(cardGeo, screenGlassMat);
          registerPartMesh(cardMesh, meta);
          pg.add(cardMesh);
        }

        rootGroup.add(pg);
        partGroups.push({ meta, group: pg });
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. High-Performance Raycasting on Click
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const hitMeta = hits[0].object.userData.partMeta as InspectablePartMeta | undefined;
        if (hitMeta) {
          setSelectedPart(hitMeta);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onControlsStart = () => {
      presetTransitionActiveRef.current = false;
    };
    controls.addEventListener('start', onControlsStart);

    // 8. Paced Animation & Damping Loop (Software WebGL Safe)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function applyCameraPresetTarget(preset: CameraPreset) {
      if (preset === 'front') {
        _targetCamPos.set(0, 0.75, 3.35);
        _targetLookAt.set(0, 0.55, 0);
      } else if (preset === 'top') {
        _targetCamPos.set(0, 3.65, 0.25);
        _targetLookAt.set(0, 0.45, 0);
      } else if (preset === 'back') {
        _targetCamPos.set(0, 0.85, -3.35);
        _targetLookAt.set(0, 0.55, 0);
      } else if (preset === 'closeup') {
        _targetCamPos.set(1.25, 0.95, 1.45);
        _targetLookAt.set(0, 0.52, 0);
      } else {
        _targetCamPos.set(2.5, 1.85, 2.75);
        _targetLookAt.set(0, 0.52, 0);
      }
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const dampFactor = 1 - Math.exp(-8 * delta);

      // Smoothly damp exploded view separation
      const exp = explodedRef.current;
      for (let i = 0; i < partGroups.length; i++) {
        const item = partGroups[i];
        _partTargetPos
          .copy(item.meta.baseOffset)
          .addScaledVector(item.meta.explodeVector, exp);
        item.group.position.lerp(_partTargetPos, dampFactor);
      }

      // Smoothly damp camera preset transitions
      if (presetTransitionActiveRef.current) {
        applyCameraPresetTarget(presetRef.current);
        camera.position.lerp(_targetCamPos, dampFactor);
        controls.target.lerp(_targetLookAt, dampFactor);
        if (camera.position.distanceToSquared(_targetCamPos) < 0.002) {
          presetTransitionActiveRef.current = false;
        }
      }

      if (autoRotateRef.current && !isSoftwareGl) {
        rootGroup.rotation.y += delta * 0.35;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      envTarget.dispose();
      screenTex.dispose();
      shadowTex.dispose();
      primaryMetalMat.dispose();
      secondaryMatteMat.dispose();
      accentChromeMat.dispose();
      screenGlassMat.dispose();
      stickerMat.dispose();
      pedestalGeo.dispose();
      pedestalMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      renderer.dispose();
    };
  }, [isOpen, activeReport, customFinishHex, wireframeMode, inspectablePartsList]);

  if (!isOpen || !activeReport) return null;

  const verifiedCount = Object.values(checkedParts).filter(Boolean).length;

  return (
    <div
      role={embedded ? 'region' : 'dialog'}
      aria-modal={embedded ? undefined : 'true'}
      aria-label={`3D Object Inspector for ${activeReport.title}`}
      className={
        embedded
          ? `relative w-full ${heightClassName} rounded-2xl border border-slate-800 bg-slate-950 text-white overflow-hidden flex flex-col justify-between shadow-lg`
          : 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-white overflow-hidden flex flex-col justify-between'
      }
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* TOP-LEFT / TOP-CENTER MINIMAL SPEC BADGE & ITEM SWITCHER (Solid rgba surface, no backdrop-filter over WebGL) */}
      <div className="relative z-10 p-4 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
        <div
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          className="pointer-events-auto border border-slate-800 rounded-2xl p-3.5 max-w-xl space-y-2 shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-bold uppercase tracking-wider text-[10px]">
              <Box className="w-3.5 h-3.5" />
              3D Object View &amp; Item Verification
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                activeReport.type === 'lost'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {activeReport.type} Report · {activeReport.id}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              {verifiedCount}/{inspectablePartsList.length} Traits Checked
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {activeReport.title}
              </h2>
              <p className="text-xs text-slate-400">
                {activeReport.category} · Color: {activeReport.color} · Near{' '}
                {activeReport.approximateLocationLabel}
              </p>
            </div>

            {allReports.length > 1 && onSelectReport && (
              <select
                aria-label="Switch item in 3D viewer"
                value={activeReport.id}
                onChange={(e) => {
                  const found = allReports.find((r) => r.id === e.target.value);
                  if (found) onSelectReport(found);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {allReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.type.toUpperCase()}] {r.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected 3D Part Inspection Readout */}
          {selectedPart ? (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/60 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-indigo-300">{selectedPart.name}</div>
                <div className="text-[11px] text-slate-300 truncate">{selectedPart.traitLabel}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Check Hint: {selectedPart.verificationHint}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCheckedParts((prev) => ({
                    ...prev,
                    [selectedPart.id]: !prev[selectedPart.id],
                  }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  checkedParts[selectedPart.id]
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {checkedParts[selectedPart.id] ? '✓ Trait Verified' : 'Mark Checked'}
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">
              Tip: Drag to rotate 360°, scroll to zoom, click any 3D part or use the Exploded View slider below to check item traits.
            </div>
          )}
        </div>

        {/* Top-Right Close & Action Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {onSendToCanvas && (
            <button
              type="button"
              onClick={() => {
                onSendToCanvas(activeReport);
                onClose?.();
              }}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-indigo-300 hover:border-indigo-500 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{embedded ? 'Find Matches (Zone 3)' : 'Send to Canvas'}</span>
            </button>
          )}
          {onStartClaim && (
            <button
              type="button"
              onClick={() => {
                onStartClaim(activeReport);
                onClose?.();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{activeReport.type === 'found' ? 'Start Claim (Zone 4)' : 'Find Matches'}</span>
            </button>
          )}
          {onStartHandover && (
            <button
              type="button"
              onClick={() => {
                onStartHandover(activeReport);
                onClose?.();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Handover (Zone 6)</span>
            </button>
          )}
          {embedded && onExpandFullscreen && (
            <button
              type="button"
              onClick={() => onExpandFullscreen(activeReport)}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fullscreen 3D</span>
            </button>
          )}
          {!embedded && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Close 3D View</span>
            </button>
          )}
        </div>
      </div>

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (<= 15% Viewport Footprint, Solid rgba Surface) */}
      <div className="relative z-10 w-full flex flex-col items-center pb-4 px-4 pointer-events-none">
        <div className="w-full max-w-[920px] pointer-events-auto flex flex-col items-center">
          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-t-xl border border-b-0 border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>▴ Show 3D Inspection Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>▾ Hide Controls (Zen Mode · H)</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)' }}
              className="w-full border border-slate-800 rounded-2xl p-3.5 shadow-2xl space-y-3"
            >
              {/* Row 1: Exploded View Slider, Camera Angle Presets & Finish Swatches */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
                {/* Exploded View Slider */}
                <div className="md:col-span-4 flex items-center gap-2.5 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span>Exploded Check</span>
                      <span className="font-mono tabular-nums text-indigo-400">
                        {Math.round(explodedAmount * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={explodedAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setExplodedAmount(val);
                        explodedRef.current = val;
                      }}
                      className="w-full accent-indigo-500 mt-0.5"
                    />
                  </div>
                </div>

                {/* Camera Angle Presets */}
                <div className="md:col-span-5 flex flex-wrap items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  {(
                    [
                      { id: 'isometric', label: '3D Orbit' },
                      { id: 'front', label: 'Front' },
                      { id: 'top', label: 'Top' },
                      { id: 'back', label: 'Back/Serial' },
                      { id: 'closeup', label: 'Detail' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCameraPreset(p.id);
                        presetRef.current = p.id;
                        presetTransitionActiveRef.current = true;
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        cameraPreset === p.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Color Finish Swatches & Rotation / Wireframe Toggles */}
                <div className="md:col-span-3 flex items-center justify-between gap-1.5 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: 0x475569, label: 'Space Gray' },
                      { hex: 0x1e293b, label: 'Matte Black' },
                      { hex: 0x1e3a8a, label: 'Navy' },
                      { hex: 0xb91c1c, label: 'Crimson' },
                      { hex: 0xd1d5db, label: 'Silver' },
                    ].map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        title={`Preview ${sw.label} finish`}
                        onClick={() => setCustomFinishHex(sw.hex)}
                        style={{ backgroundColor: `#${sw.hex.toString(16).padStart(6, '0')}` }}
                        className={`w-4 h-4 rounded-full border ${
                          customFinishHex === sw.hex
                            ? 'border-white scale-110 ring-2 ring-indigo-500'
                            : 'border-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !autoRotate;
                        setAutoRotate(next);
                        autoRotateRef.current = next;
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-semibold ${
                        autoRotate ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                      title="Toggle 360° turntable rotation"
                    >
                      Spin
                    </button>
                    <button
                      type="button"
                      onClick={() => setWireframeMode((w) => !w)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold ${
                        wireframeMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                      title="Toggle mesh wireframe inspection"
                    >
                      Mesh
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Interactive Component & Distinguishing Feature Check Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {inspectablePartsList.map((part) => {
                  const isSelected = selectedPart?.id === part.id;
                  const isChecked = Boolean(checkedParts[part.id]);
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        setSelectedPart(part);
                        if (explodedAmount < 0.35) {
                          setExplodedAmount(0.45);
                          explodedRef.current = 0.45;
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-left shrink-0 flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/90 border-indigo-500 text-white'
                          : isChecked
                          ? 'bg-emerald-950/50 border-emerald-700/70 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isChecked ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <span className="text-[11px] font-semibold whitespace-nowrap">
                        {part.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
