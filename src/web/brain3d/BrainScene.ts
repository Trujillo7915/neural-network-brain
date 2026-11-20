import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import type { NeuronNode } from '../../domain/entities/NeuronNode.js';
import type { BrainLobeCode } from '../../domain/value-objects/BrainLobe.js';
import { BRAIN_LOBES } from '../../domain/value-objects/BrainLobe.js';
import { EDGE_ORIGIN_COLORS, resolveNeuronColor, type ColorMode } from './brainColorTokens.js';
import {
  createBrainstemGeometry,
  createCerebellumGeometry,
  createCorpusCallosumGeometry,
  createHemisphereGeometry,
} from './brainGeometry.js';

export interface HoverInfo {
  readonly node: NeuronNode;
  readonly screenX: number;
  readonly screenY: number;
}

export interface BrainSceneCallbacks {
  readonly onSelectNode: (nodeId: string | null) => void;
  readonly onHoverNode: (info: HoverInfo | null) => void;
}

interface PulseParticle {
  readonly mesh: THREE.Mesh;
  readonly curve: THREE.QuadraticBezierCurve3;
  progress: number;
  readonly speed: number;
}

interface EdgeVisual {
  readonly line: THREE.Line;
  readonly sourceId: string;
  readonly targetId: string;
  readonly baseOpacity: number;
}

export class BrainScene {
  private readonly container: HTMLElement;
  private readonly callbacks: BrainSceneCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly brainRoot = new THREE.Group();
  private readonly cortexGroup = new THREE.Group();
  private readonly neuronsGroup = new THREE.Group();
  private readonly edgesGroup = new THREE.Group();
  private readonly pulsesGroup = new THREE.Group();
  private readonly dustGroup = new THREE.Group();

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(-999, -999);
  private readonly neuronMeshes = new Map<string, THREE.Mesh>();
  private readonly neuronDataMap = new Map<string, NeuronNode>();
  private readonly edgeVisuals: EdgeVisual[] = [];
  private readonly pulses: PulseParticle[] = [];

  private currentSnapshot: BrainSnapshot | null = null;
  private colorMode: ColorMode = 'lobe';
  private selectedNodeId: string | null = null;
  private highlightedIds: ReadonlySet<string> | null = null;
  private hoveredNodeId: string | null = null;
  private autoRotate = true;
  private pulseSpeedMultiplier = 1.0;

  private animationFrameId = 0;
  private lastTimestamp = 0;
  private pointerDownPos = { x: 0, y: 0 };
  private cameraTween: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    elapsed: number;
    duration: number;
  } | null = null;

  private readonly selectionHalo: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, callbacks: BrainSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(6.8, 2.3, 7.4);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.6;
    this.controls.maxDistance = 15;
    this.controls.enablePan = true;

    this.setupLighting();

    this.brainRoot.add(
      this.cortexGroup,
      this.dustGroup,
      this.edgesGroup,
      this.neuronsGroup,
      this.pulsesGroup,
    );
    this.scene.add(this.brainRoot);

    const haloGeo = new THREE.RingGeometry(0.18, 0.25, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.selectionHalo = new THREE.Mesh(haloGeo, haloMat);
    this.selectionHalo.visible = false;
    this.brainRoot.add(this.selectionHalo);

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  setSnapshot(snapshot: BrainSnapshot, colorMode: ColorMode): void {
    this.currentSnapshot = snapshot;
    this.colorMode = colorMode;
    this.pulseSpeedMultiplier = snapshot.growthStage.pulseSpeed;

    this.rebuildCortex(snapshot);
    this.rebuildCorticalDust(snapshot);
    this.rebuildNeuronsAndEdges(snapshot);
    this.applyVisualStates();
  }

  setColorMode(colorMode: ColorMode): void {
    this.colorMode = colorMode;
    if (!this.currentSnapshot) return;
    for (const node of this.currentSnapshot.nodes) {
      const mesh = this.neuronMeshes.get(node.id);
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const hex = resolveNeuronColor(node.lobe, node.source, colorMode);
      mat.color.set(hex);
      mat.emissive.set(hex);
    }
  }

  setSelection(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    this.applyVisualStates();
    if (nodeId) {
      const node = this.neuronDataMap.get(nodeId);
      if (node) {
        this.focusPoint(new THREE.Vector3(node.position.x, node.position.y, node.position.z));
      }
    }
  }

  setHighlightedIds(ids: ReadonlySet<string> | null): void {
    this.highlightedIds = ids;
    this.applyVisualStates();
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  focusLobe(lobe: BrainLobeCode | null): void {
    if (!lobe) {
      this.resetCamera();
      return;
    }
    const meta = BRAIN_LOBES[lobe];
    const scale = this.currentSnapshot?.growthStage.cortexScale ?? 1;
    this.tweenCamera(
      new THREE.Vector3(
        meta.cameraPosition[0] * scale,
        meta.cameraPosition[1] * scale,
        meta.cameraPosition[2] * scale,
      ),
      new THREE.Vector3(
        meta.cameraTarget[0] * scale,
        meta.cameraTarget[1] * scale,
        meta.cameraTarget[2] * scale,
      ),
    );
  }

  resetCamera(): void {
    this.tweenCamera(new THREE.Vector3(6.8, 2.3, 7.4), new THREE.Vector3(0, -0.15, 0));
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.resizeObserver.disconnect();
    this.unbindEvents();
    this.clearGroup(this.cortexGroup);
    this.clearGroup(this.dustGroup);
    this.clearGroup(this.neuronsGroup);
    this.clearGroup(this.edgesGroup);
    this.clearGroup(this.pulsesGroup);
    this.selectionHalo.geometry.dispose();
    (this.selectionHalo.material as THREE.Material).dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.72);
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    keyLight.position.set(6, 8, 7);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
    rimLight.position.set(-7, 3, -6);

    const underFill = new THREE.PointLight(0xd97706, 0.6, 18);
    underFill.position.set(0, -4.5, 2.5);

    this.scene.add(ambient, keyLight, rimLight, underFill);
  }

  private rebuildCortex(snapshot: BrainSnapshot): void {
    this.clearGroup(this.cortexGroup);
    const { cortexScale, sulciDepth, cortexOpacity, wireframeOpacity } = snapshot.growthStage;

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#94a3b8'),
      emissive: new THREE.Color('#1e293b'),
      emissiveIntensity: 0.25 + snapshot.morphology.cortexDensity * 0.35,
      roughness: 0.42,
      metalness: 0.08,
      transparent: true,
      opacity: cortexOpacity,
      depthWrite: false,
      side: THREE.FrontSide,
    });

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#cbd5e1'),
      wireframe: true,
      transparent: true,
      opacity: wireframeOpacity * 0.35,
      depthWrite: false,
    });

    const leftGeo = createHemisphereGeometry('left', sulciDepth);
    const rightGeo = createHemisphereGeometry('right', sulciDepth);
    const cerebellumGeo = createCerebellumGeometry(sulciDepth);
    const brainstemGeo = createBrainstemGeometry();
    const callosumGeo = createCorpusCallosumGeometry();

    const parts = [leftGeo, rightGeo, cerebellumGeo];
    for (const geo of parts) {
      const solid = new THREE.Mesh(geo, glassMaterial.clone());
      const wire = new THREE.Mesh(geo.clone(), wireMaterial.clone());
      wire.scale.setScalar(1.004);
      this.cortexGroup.add(solid, wire);
    }

    const stemMat = glassMaterial.clone();
    stemMat.opacity = cortexOpacity * 0.85;
    this.cortexGroup.add(new THREE.Mesh(brainstemGeo, stemMat));

    const callosumMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f59e0b'),
      emissive: new THREE.Color('#b45309'),
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.14 + snapshot.morphology.cortexDensity * 0.18,
      depthWrite: false,
    });
    this.cortexGroup.add(new THREE.Mesh(callosumGeo, callosumMat));
    this.cortexGroup.scale.setScalar(cortexScale);
  }

  private rebuildCorticalDust(snapshot: BrainSnapshot): void {
    this.clearGroup(this.dustGroup);
    // Ambient neural tissue points scale visibly with data volume
    const pointCount = Math.min(2600, 220 + snapshot.nodes.length * 6);
    const positions = new Float32Array(pointCount * 3);
    const scale = snapshot.growthStage.cortexScale;

    for (let i = 0; i < pointCount; i += 1) {
      const t = (i * 2654435761) >>> 0;
      const side = (i & 1) === 0 ? -1 : 1;
      const u = ((t % 1000) / 1000) * 2 - 1;
      const theta = (((t >>> 10) % 1000) / 1000) * Math.PI * 2;
      const r = 0.65 + (((t >>> 20) % 1000) / 1000) * 0.34;
      const sinP = Math.sqrt(Math.max(0, 1 - u * u));

      const px = side * (0.22 + Math.abs(sinP * Math.cos(theta)) * 1.95 * r) * scale;
      const py = u * 1.55 * r * scale;
      const pz = sinP * Math.sin(theta) * 2.45 * r * scale;
      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.026,
      transparent: true,
      opacity: 0.18 + snapshot.morphology.cortexDensity * 0.25,
      depthWrite: false,
    });
    this.dustGroup.add(new THREE.Points(geo, mat));
  }

  private rebuildNeuronsAndEdges(snapshot: BrainSnapshot): void {
    this.clearGroup(this.neuronsGroup);
    this.clearGroup(this.edgesGroup);
    this.clearGroup(this.pulsesGroup);
    this.neuronMeshes.clear();
    this.neuronDataMap.clear();
    this.edgeVisuals.length = 0;
    this.pulses.length = 0;

    const unitSphere = new THREE.SphereGeometry(1, 18, 14);
    for (const node of snapshot.nodes) {
      this.neuronDataMap.set(node.id, node);
      const colorHex = resolveNeuronColor(node.lobe, node.source, this.colorMode);
      const radius = Math.min(0.115, 0.052 + node.degree * 0.0055 + node.confidence * 0.018);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        emissive: new THREE.Color(colorHex),
        emissiveIntensity: 0.45 + node.confidence * 0.35,
        roughness: 0.28,
        metalness: 0.15,
        transparent: true,
        opacity: 0.96,
      });

      const mesh = new THREE.Mesh(unitSphere.clone(), mat);
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.scale.setScalar(radius);
      mesh.userData = { nodeId: node.id, baseRadius: radius };
      this.neuronsGroup.add(mesh);
      this.neuronMeshes.set(node.id, mesh);
    }
    unitSphere.dispose();

    const pulseGeo = new THREE.SphereGeometry(0.026, 8, 8);
    const maxPulses = Math.min(75, snapshot.edges.length);

    snapshot.edges.forEach((edge, idx) => {
      const src = this.neuronDataMap.get(edge.sourceId);
      const tgt = this.neuronDataMap.get(edge.targetId);
      if (!src || !tgt) return;

      const start = new THREE.Vector3(src.position.x, src.position.y, src.position.z);
      const end = new THREE.Vector3(tgt.position.x, tgt.position.y, tgt.position.z);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      // Curve gently through interior white matter / corpus callosum
      mid.multiplyScalar(src.hemisphere !== tgt.hemisphere ? 0.58 : 0.84);
      mid.y += 0.14;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(16);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const edgeColor = EDGE_ORIGIN_COLORS[edge.origin] ?? '#94a3b8';
      const baseOpacity = edge.origin === 'agentic-memory' ? 0.46 : 0.24;

      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(edgeColor),
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      this.edgesGroup.add(line);
      this.edgeVisuals.push({ line, sourceId: edge.sourceId, targetId: edge.targetId, baseOpacity });

      if (idx < maxPulses) {
        const pulseMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(edgeColor),
          transparent: true,
          opacity: 0.85,
        });
        const pulseMesh = new THREE.Mesh(pulseGeo.clone(), pulseMat);
        this.pulsesGroup.add(pulseMesh);
        this.pulses.push({
          mesh: pulseMesh,
          curve,
          progress: (idx * 0.173) % 1,
          speed: 0.14 + (idx % 5) * 0.04,
        });
      }
    });
    pulseGeo.dispose();
  }

  private applyVisualStates(): void {
    const selectedNeighbors = new Set<string>();
    if (this.selectedNodeId) {
      selectedNeighbors.add(this.selectedNodeId);
      for (const edge of this.edgeVisuals) {
        if (edge.sourceId === this.selectedNodeId) selectedNeighbors.add(edge.targetId);
        if (edge.targetId === this.selectedNodeId) selectedNeighbors.add(edge.sourceId);
      }
    }

    for (const [id, mesh] of this.neuronMeshes.entries()) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const baseRadius = Number(mesh.userData.baseRadius ?? 0.08);
      const matchesFilter = !this.highlightedIds || this.highlightedIds.has(id);
      const inSelectedPath = !this.selectedNodeId || selectedNeighbors.has(id);
      const isSelected = id === this.selectedNodeId;
      const isHovered = id === this.hoveredNodeId;

      if (isSelected) {
        mat.opacity = 1;
        mat.emissiveIntensity = 1.25;
        mesh.scale.setScalar(baseRadius * 1.32);
      } else if (isHovered) {
        mat.opacity = 1;
        mat.emissiveIntensity = 1.0;
        mesh.scale.setScalar(baseRadius * 1.2);
      } else if (matchesFilter && inSelectedPath) {
        mat.opacity = 0.96;
        mat.emissiveIntensity = 0.62;
        mesh.scale.setScalar(baseRadius);
      } else {
        mat.opacity = 0.15;
        mat.emissiveIntensity = 0.12;
        mesh.scale.setScalar(baseRadius * 0.8);
      }
    }

    for (const ev of this.edgeVisuals) {
      const mat = ev.line.material as THREE.LineBasicMaterial;
      const touchesSelected =
        this.selectedNodeId !== null &&
        (ev.sourceId === this.selectedNodeId || ev.targetId === this.selectedNodeId);
      const matchesFilter =
        !this.highlightedIds ||
        (this.highlightedIds.has(ev.sourceId) && this.highlightedIds.has(ev.targetId));

      if (touchesSelected) {
        mat.opacity = 0.92;
      } else if (this.selectedNodeId !== null) {
        mat.opacity = 0.05;
      } else if (matchesFilter) {
        mat.opacity = ev.baseOpacity;
      } else {
        mat.opacity = 0.04;
      }
    }

    if (this.selectedNodeId) {
      const node = this.neuronDataMap.get(this.selectedNodeId);
      if (node) {
        this.selectionHalo.position.set(node.position.x, node.position.y, node.position.z);
        this.selectionHalo.visible = true;
      }
    } else {
      this.selectionHalo.visible = false;
    }
  }

  private focusPoint(target: THREE.Vector3): void {
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const endPos = target.clone().addScaledVector(direction, 6.0);
    this.tweenCamera(endPos, target);
  }

  private tweenCamera(endPos: THREE.Vector3, endTarget: THREE.Vector3): void {
    this.cameraTween = {
      startPos: this.camera.position.clone(),
      endPos,
      startTarget: this.controls.target.clone(),
      endTarget,
      elapsed: 0,
      duration: 0.62,
    };
  }

  private animate = (timestamp: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    if (this.cameraTween) {
      this.cameraTween.elapsed += dt;
      const t = Math.min(1, this.cameraTween.elapsed / this.cameraTween.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.cameraTween.startPos, this.cameraTween.endPos, ease);
      this.controls.target.lerpVectors(this.cameraTween.startTarget, this.cameraTween.endTarget, ease);
      if (t >= 1) {
        this.cameraTween = null;
      }
    } else if (this.autoRotate && !this.selectedNodeId) {
      this.brainRoot.rotation.y += dt * 0.095;
    }

    for (const p of this.pulses) {
      p.progress = (p.progress + dt * p.speed * this.pulseSpeedMultiplier) % 1;
      p.curve.getPoint(p.progress, p.mesh.position);
    }

    if (this.selectionHalo.visible) {
      this.selectionHalo.lookAt(this.camera.position);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
    this.autoRotate = false;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.neuronMeshes.values()], false);
    const hitId = (hits[0]?.object.userData.nodeId as string | undefined) ?? null;

    if (hitId !== this.hoveredNodeId) {
      this.hoveredNodeId = hitId;
      this.renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
      this.applyVisualStates();
    }

    if (hitId) {
      const node = this.neuronDataMap.get(hitId);
      if (node) {
        this.callbacks.onHoverNode({
          node,
          screenX: event.clientX - rect.left,
          screenY: event.clientY - rect.top,
        });
      }
    } else {
      this.callbacks.onHoverNode(null);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const moved = Math.hypot(
      event.clientX - this.pointerDownPos.x,
      event.clientY - this.pointerDownPos.y,
    );
    if (moved > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.neuronMeshes.values()], false);
    const hitId = (hits[0]?.object.userData.nodeId as string | undefined) ?? null;
    this.callbacks.onSelectNode(hitId);
  };

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerup', this.onPointerUp);
  }

  private unbindEvents(): void {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerup', this.onPointerUp);
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0]!;
      group.remove(child);
      if ('geometry' in child && child.geometry instanceof THREE.BufferGeometry) {
        child.geometry.dispose();
      }
      if ('material' in child) {
        const mat = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
  }
}
