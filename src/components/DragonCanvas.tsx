import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/chinese_dragon.glb";
const DRAGON_LENGTH = 24;
const INTRO_SECONDS = 2.6;

const PATH_POINTS = [
  new THREE.Vector3(28, 10, -12),
  new THREE.Vector3(14, 4, 4),
  new THREE.Vector3(2, 6, -4),
  new THREE.Vector3(-12, 1, 5),
  new THREE.Vector3(-18, -4, -6),
  new THREE.Vector3(-6, -1, 7),
  new THREE.Vector3(8, 4, -3),
  new THREE.Vector3(22, 9, -10),
];

const path = new THREE.CatmullRomCurve3(PATH_POINTS, false, "catmullrom", 0.35);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

function Dragon({ reducedMotion }: { reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(MODEL_URL, false, true);
  const wrapRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, wrapRef);
  const { camera, pointer } = useThree();

  const { inner, headForward } = useMemo(() => {
    const model = scene.getObjectByName("Sketchfab_model") ?? scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = DRAGON_LENGTH / size.z;

    const eyes = model.getObjectByName("dragon_MI_b09_00_drg_eye_0");
    const eyeZ = eyes ? new THREE.Box3().setFromObject(eyes).getCenter(new THREE.Vector3()).z : center.z + size.z / 2;
    const headForward = eyeZ >= center.z ? 1 : -1;

    model.position.sub(center);
    const inner = new THREE.Group();
    inner.scale.setScalar(scale);
    inner.add(model);
    const spinner = new THREE.Group();
    spinner.rotation.y = headForward === 1 ? 0 : Math.PI;
    spinner.add(inner);
    return { inner: spinner, headForward };
  }, [scene]);

  const elapsed = useRef(0);
  const { invalidate } = useThree();

  useEffect(() => {
    const action = Object.values(actions)[0];
    action?.play();
    if (action) action.timeScale = reducedMotion ? 0 : 1.15;
    if (reducedMotion) invalidate();
  }, [actions, reducedMotion, invalidate]);

  useFrame((_, delta) => {
    const group = wrapRef.current;
    if (!group) return;

    if (!reducedMotion) elapsed.current += delta;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const scroll = scrollable > 0 ? THREE.MathUtils.clamp(window.scrollY / scrollable, 0, 1) : 0;
    const intro = reducedMotion ? 0.35 : easeOutCubic(Math.min(elapsed.current / INTRO_SECONDS, 1));
    const u = THREE.MathUtils.clamp(0.02 + intro * 0.1 + scroll * 0.85, 0, 1);

    const pos = path.getPointAt(u);
    const ahead = path.getPointAt(Math.min(u + 0.01, 1));
    const fitX = THREE.MathUtils.clamp(camera.aspect / 1.3, 0.22, 1);
    const fitY = THREE.MathUtils.clamp((camera.aspect - 0.4) / 0.8, 0.55, 1);
    const fitScale = THREE.MathUtils.clamp(0.4 + camera.aspect * 0.6, 0.55, 1);
    group.scale.setScalar(fitScale);
    const edgeBias = (1 - fitX) * 9;
    pos.x = pos.x * fitX + edgeBias;
    pos.y *= fitY;
    pos.z -= (1 - fitX) * 10;
    ahead.x = ahead.x * fitX + edgeBias;
    ahead.y *= fitY;
    ahead.z -= (1 - fitX) * 10;
    group.position.lerp(pos, reducedMotion ? 1 : 0.35);
    const target = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      ahead.clone().sub(pos).normalize(),
    );
    group.quaternion.slerp(target, reducedMotion ? 1 : 0.06);

    camera.position.x += (pointer.x * 1.8 - camera.position.x) * 0.05;
    camera.position.y += (pointer.y * 1.2 - camera.position.y) * 0.05;
    camera.lookAt(0, 1, 0);
  });

  return (
    <group ref={wrapRef}>
      <primitive object={inner} />
    </group>
  );
}

export default function DragonCanvas() {
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const onVisibility = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <Canvas
      frameloop={reducedMotion ? "never" : running ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.35;
      }}
      camera={{ position: [0, 0, 22], fov: 42 }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={1.6} />
      <hemisphereLight intensity={1.1} color="#ffffff" groundColor="#c9b8a8" />
      <directionalLight position={[6, 12, 8]} intensity={3.2} />
      <directionalLight position={[-8, -4, -6]} intensity={1.2} color="#ffd9c4" />
      <pointLight position={[-8, -4, 10]} intensity={90} color="#ff5a3c" />
      <Suspense fallback={null}>
        <Dragon reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);
