"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
  mergeVertices,
  toCreasedNormals,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cn } from "@/lib/utils";

// The traced logo path is inlined (it is ~2 KB) and parsed synchronously, so
// building the mesh involves no network fetch, no loader cache, and no
// Suspense — the class of failures where the canvas silently stayed empty
// waiting on /logo-utopia.svg can't happen at all.
const LOGO_SVG_SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M48.574,0.002L45.714,0.610L43.467,1.606L41.628,2.841L40.442,3.901L38.342,6.353L37.102,8.396L36.063,10.847L34.147,18.406L32.940,22.084L31.666,24.944L29.672,28.008L27.941,29.727L24.672,31.732L20.586,33.184L16.091,34.104L13.034,34.954L9.962,36.329L8.124,37.551L6.666,38.836L5.418,40.266L3.617,43.330L2.584,46.599L2.321,50.685L2.966,54.567L4.191,57.427L6.079,60.083L8.124,62.000L10.575,63.607L13.231,64.796L16.091,65.636L20.177,66.516L23.650,67.737L25.693,68.814L27.224,69.889L29.475,72.136L31.510,75.201L32.937,78.265L34.369,82.351L35.856,87.867L36.879,90.523L38.728,93.587L40.607,95.723L43.058,97.709L45.714,99.117L48.779,99.942L51.230,100.000L53.069,99.769L54.499,99.360L57.155,98.118L59.792,96.039L61.509,93.996L63.520,90.319L65.862,82.351L67.725,77.448L70.131,73.158L72.281,70.706L74.724,68.807L77.176,67.566L81.058,66.327L85.961,65.236L88.779,64.169L91.477,62.576L93.762,60.491L95.394,58.244L96.795,55.180L97.440,52.728L97.679,48.846L97.222,45.578L96.040,42.309L94.363,39.653L92.291,37.610L89.638,35.964L86.982,34.899L79.423,33.211L75.746,31.989L72.477,30.150L69.938,27.600L67.705,23.922L66.685,21.471L65.425,17.589L64.145,12.482L63.112,9.621L61.445,6.558L59.464,4.105L56.951,2.049L54.499,0.798L51.230,0.000Z M49.596,16.144L47.349,16.454L45.101,17.321L43.467,18.328L41.628,20.076L39.518,23.105L36.317,30.421L35.514,31.890L34.069,33.829L31.414,36.210L23.855,40.411L21.337,42.718L20.476,43.943L19.493,45.986L18.877,48.642L18.839,50.276L19.287,53.341L20.094,55.384L21.100,57.018L22.425,58.581L24.059,59.980L26.715,61.580L31.005,63.732L32.231,64.539L33.865,66.071L35.106,67.642L36.112,69.316L39.754,77.244L40.928,79.082L41.972,80.308L43.671,81.823L46.327,83.253L48.779,83.855L50.822,83.912L53.273,83.486L54.499,83.033L56.338,82.037L58.161,80.512L60.332,77.652L63.845,69.889L65.301,67.437L66.348,66.117L69.004,63.704L71.047,62.483L76.155,59.950L78.515,57.835L79.708,55.997L80.519,53.954L80.947,51.707L80.986,49.868L80.754,47.825L80.151,45.782L79.091,43.739L77.624,41.900L75.542,40.202L68.391,36.185L66.843,34.954L65.123,33.113L63.026,29.643L60.101,22.901L59.104,21.266L57.768,19.664L55.725,17.929L53.886,16.929L51.639,16.278Z" fill="#1c1c1c" fill-rule="evenodd"/></svg>`;

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
  const data = useMemo(() => new SVGLoader().parse(LOGO_SVG_SOURCE), []);
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

  // Self-heal: remount the whole canvas after a short pause. Covers failed
  // WebGL context creation and lost contexts after tab/GPU churn.
  const retry = useCallback(() => {
    if (retries.current >= MAX_RETRIES) return;
    retries.current += 1;
    console.warn(`[logo-3d] canvas failed, remounting (attempt ${retries.current})`);
    setTimeout(() => setAttempt((a) => a + 1), 800);
  }, []);

  return (
    <>
      <LogoErrorBoundary key={attempt} onError={retry}>
        <Canvas
          className="!absolute inset-0"
          dpr={[1, 1.5]}
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
          <LogoMesh onHoverChange={setHovered} />
          <Rig />
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
