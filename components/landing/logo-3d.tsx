"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
  mergeVertices,
  toCreasedNormals,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cn } from "@/lib/utils";

const LOGO_SVG = "/logo-utopia.svg";

function LogoMesh({
  onHoverChange,
}: {
  onHoverChange: (hovered: boolean) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const spin = useRef({ value: 0, target: 0 });
  useCursor(hovered);
  const data = useLoader(SVGLoader, LOGO_SVG);
  const gl = useThree((state) => state.gl);

  // Track the cursor across the whole window (R3F's own pointer only updates
  // while it is over the canvas). Coordinates are normalised against the
  // canvas centre, so the logo keeps turning toward the cursor even when it
  // is far outside this section.
  const pointerRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      pointerRef.current.x = THREE.MathUtils.clamp(x, -2, 2);
      pointerRef.current.y = THREE.MathUtils.clamp(-y, -2, 2);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl]);

  // Extrude the traced SVG (outer shape + centre hole) into a solid, then
  // recentre and normalise it to roughly 2 world units so the camera framing
  // is independent of the SVG's viewBox.
  const geometry = useMemo(() => {
    const shapes: THREE.Shape[] = [];
    for (const path of data.paths) {
      shapes.push(...SVGLoader.createShapes(path));
    }

    let geom: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 18,
      bevelEnabled: true,
      bevelThickness: 3,
      bevelSize: 2.5,
      bevelSegments: 14,
      curveSegments: 32,
    });

    // SVG Y grows downward; flip so the mark is upright.
    geom.scale(1, -1, 1);
    geom.computeBoundingBox();
    const box = geom.boundingBox!;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    geom.translate(-center.x, -center.y, -center.z);
    const norm = 2.2 / Math.max(size.x, size.y);
    geom.scale(norm, norm, norm);

    // ExtrudeGeometry comes back non-indexed, i.e. flat-shaded: every bevel
    // facet reflects the environment as its own wide band, which reads as
    // thick, chunky highlights on the edges. Weld the vertices and smooth the
    // normals (30 deg crease keeps genuinely hard corners) so reflections
    // sweep continuously around the bevel instead.
    geom = mergeVertices(geom, 1e-4);
    geom = toCreasedNormals(geom, THREE.MathUtils.degToRad(30));
    return geom;
  }, [data]);

  // Animated pastel gradient: a glossy MeshPhysicalMaterial whose base colour is
  // replaced in the fragment shader by a flowing pink -> yellow -> blue palette.
  // Driving it off local position + uTime makes the gradient move *inside* the
  // mark while PBR clearcoat + env reflections stay intact.
  // Uniforms live in a ref because useFrame mutates uTime every frame.
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uPink: { value: new THREE.Color("#ffbcdb").convertSRGBToLinear() },
    uYellow: { value: new THREE.Color("#fff0a6").convertSRGBToLinear() },
    uBlue: { value: new THREE.Color("#a8c8ff").convertSRGBToLinear() },
  });

  const material = useMemo(() => {
    const uniforms = uniformsRef.current;

    const material = new THREE.MeshPhysicalMaterial({
      metalness: 0,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
      sheen: 0.6,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color("#ffffff"),
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uPink = uniforms.uPink;
      shader.uniforms.uYellow = uniforms.uYellow;
      shader.uniforms.uBlue = uniforms.uBlue;

      shader.vertexShader =
        "varying vec3 vLocalPos;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n  vLocalPos = position;"
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "void main() {",
          /* glsl */ `
          uniform float uTime;
          uniform vec3 uPink;
          uniform vec3 uYellow;
          uniform vec3 uBlue;
          varying vec3 vLocalPos;

          vec3 pastel(float u) {
            u = fract(u);
            if (u < 1.0 / 3.0) return mix(uPink, uYellow, u * 3.0);
            if (u < 2.0 / 3.0) return mix(uYellow, uBlue, (u - 1.0 / 3.0) * 3.0);
            return mix(uBlue, uPink, (u - 2.0 / 3.0) * 3.0);
          }

          void main() {
        `
        )
        .replace(
          "#include <color_fragment>",
          /* glsl */ `
          #include <color_fragment>
          float flow = (vLocalPos.x * 0.55 + vLocalPos.y * 0.45)
            + 0.35 * sin(vLocalPos.y * 2.1 + uTime * 0.8)
            + 0.35 * sin(vLocalPos.x * 1.9 - uTime * 0.6);
          diffuseColor.rgb = pastel(flow * 0.22 + uTime * 0.06);
        `
        );
    };
    material.customProgramCacheKey = () => "utopia-animated-pastel";

    return material;
  }, []);

  const handleOver = () => {
    setHovered(true);
    onHoverChange(true);
    spin.current.target += Math.PI;
  };
  const handleOut = () => {
    setHovered(false);
    onHoverChange(false);
  };

  // Pointer parallax on the outer group; hover spin + zoom on the inner group
  // so the two rotations never fight each other.
  useFrame((state, delta) => {
    uniformsRef.current.uTime.value = state.clock.elapsedTime;

    if (groupRef.current) {
      const targetY = pointerRef.current.x * 0.35;
      const targetX = -pointerRef.current.y * 0.25;
      groupRef.current.rotation.y +=
        (targetY - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x +=
        (targetX - groupRef.current.rotation.x) * 0.05;
    }

    if (spinGroupRef.current) {
      const s = spin.current;
      s.value += (s.target - s.value) * Math.min(1, delta * 1.6);
      if (Math.abs(s.target - s.value) < 0.001) s.value = s.target;
      spinGroupRef.current.rotation.y = s.value;

      const targetScale = hovered ? 1.22 : 1;
      const current = spinGroupRef.current.scale.x;
      const next = current + (targetScale - current) * Math.min(1, delta * 6);
      spinGroupRef.current.scale.setScalar(next);
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0}>
      <group ref={groupRef}>
        <group ref={spinGroupRef}>
          <mesh
            geometry={geometry}
            material={material}
            castShadow
            raycast={() => null}
          />
        </group>
        {/* Invisible hover hitbox. It lives OUTSIDE the spin group so it never
            turns edge-on to the camera mid-spin (which would drop the hover),
            and it covers the centre hole so hover doesn't flicker. Sized to
            cover the mark at full zoom. */}
        <mesh onPointerOver={handleOver} onPointerOut={handleOut}>
          <circleGeometry args={[1.4, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </Float>
  );
}

// Studio-style environment: a soft neutral backdrop so nothing reflects pure
// black, a large top key, angled side softboxes, and a frontal ring to give the
// glossy clearcoat clean, sweeping highlights.
function Rig() {
  return (
    <Environment resolution={512}>
      <Lightformer
        form="rect"
        intensity={0.55}
        position={[0, 0, -9]}
        scale={[40, 40, 1]}
        color="#eef1f6"
      />
      <Lightformer
        form="rect"
        intensity={2.6}
        position={[0, 5, -1]}
        scale={[10, 2, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={1.5}
        rotation={[0, -Math.PI / 3, 0]}
        position={[6, 1, 1]}
        scale={[1.5, 10, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={1.5}
        rotation={[0, Math.PI / 3, 0]}
        position={[-6, 1, 1]}
        scale={[1.5, 10, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="ring"
        intensity={1.5}
        position={[0, 0, 6]}
        scale={4}
        color="#ffffff"
      />
    </Environment>
  );
}

// If the SVG fetch or WebGL setup throws, swallow the error and ask the parent
// to remount instead of leaving a permanently blank canvas.
class LogoErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const MAX_RETRIES = 3;

export function Logo3D() {
  const [hovered, setHovered] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retries = useRef(0);

  // Self-heal: clear the cached (possibly rejected) SVG load and remount the
  // whole canvas after a short pause. Covers failed fetches, failed WebGL
  // context creation, and lost contexts after tab/GPU churn.
  const retry = useCallback(() => {
    if (retries.current >= MAX_RETRIES) return;
    retries.current += 1;
    useLoader.clear(SVGLoader, LOGO_SVG);
    setTimeout(() => setAttempt((a) => a + 1), 800);
  }, []);

  return (
    <>
      <LogoErrorBoundary key={attempt} onError={retry}>
        <Canvas
          className="!absolute inset-0"
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 5], fov: 32 }}
          onCreated={({ gl }) => {
            retries.current = 0;
            gl.domElement.addEventListener("webglcontextlost", (event) => {
              event.preventDefault();
              retry();
            });
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 4, 5]} intensity={1.2} />
          <Suspense fallback={null}>
            <LogoMesh onHoverChange={setHovered} />
            <Rig />
          </Suspense>
        </Canvas>
      </LogoErrorBoundary>
      {/* Tagline revealed in the centre hole of the mark while it spins. */}
      <div
        aria-hidden={!hovered}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      >
        <p
          className={cn(
            "max-w-[13rem] text-center font-display text-sm font-medium leading-snug tracking-tight text-ink transition-all duration-500 ease-out",
            hovered
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-90 blur-[2px]"
          )}
        >
          The world&apos;s largest source of ground level spatial data
        </p>
      </div>
    </>
  );
}

export default Logo3D;
