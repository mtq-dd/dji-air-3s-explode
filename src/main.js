/* ============================================================
 * DJI Air 3S — Interactive Exploded View
 * 所有几何体由代码程序化生成，不依赖任何外部模型文件
 * ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* ------------------------------------------------------------
 * 0. 常量
 * ---------------------------------------------------------- */
const CYAN = 0x2fd4ff;
const AMBER = 0xffb545;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------
 * 1. 部件数据
 * ---------------------------------------------------------- */
const PARTS = {
  body: {
    name: '机身主体',
    en: 'Airframe',
    count: '×1',
    desc:
      '承载飞控、图传与云台的主结构件。前部集成感知阵列，尾部为电池仓；四支机臂通过折叠铰链与机身相连，收纳时向内收拢。',
    specs: [
      ['展开尺寸', '266.4 × 325.5 × 106.2 mm'],
      ['折叠尺寸', '214 × 100.6 × 89.4 mm'],
      ['起飞重量', '724 g'],
      ['最大抗风', '12 m/s（5 级）'],
      ['结构形式', '折叠四轴 / 复合材质']
    ]
  },
  gimbal: {
    name: '三轴云台相机',
    en: '3-Axis Gimbal Camera',
    count: '×1',
    desc:
      '双摄同体设计：1 英寸广角主摄负责大光比与夜景，1/1.3 英寸中长焦提供 3 倍视角，两枚传感器共用一套三轴机械增稳结构。',
    specs: [
      ['广角传感器', '1 英寸 CMOS · 24 mm 等效'],
      ['广角光圈', 'f/1.8'],
      ['中长焦传感器', '1/1.3 英寸 CMOS · 70 mm 等效'],
      ['中长焦光圈', 'f/2.8'],
      ['有效像素', '5000 万 / 4800 万'],
      ['增稳范围', '俯仰 −90° ~ +60°'],
      ['视频规格', '4K/60fps HDR · 4K/120fps']
    ]
  },
  battery: {
    name: '智能飞行电池',
    en: 'Intelligent Battery',
    count: '×1',
    desc:
      '尾部整体式电池仓，兼作机身顶盖。内置电芯管理芯片，支持自放电保护与 PD 快充，四颗电量灯直接指示剩余电量。',
    specs: [
      ['容量', '4276 mAh'],
      ['能量', '77 Wh'],
      ['最长飞行时间', '45 分钟'],
      ['充电方式', 'PD 快充 / 集电管家'],
      ['安装方式', '尾部滑入式仓盖']
    ]
  },
  armFront: {
    name: '前机臂总成',
    en: 'Front Arm Assembly',
    count: '×2',
    desc:
      '前向展开式折叠臂，根部为阻尼铰链，臂体内走线并集成天线。末端带电机座与起落支撑。',
    specs: [
      ['数量', '2 支'],
      ['构型', '前向展开折叠臂'],
      ['铰链', '阻尼折叠 / 自动回位'],
      ['集成', '天线 · 电机座 · 起落架']
    ]
  },
  armRear: {
    name: '后机臂总成',
    en: 'Rear Arm Assembly',
    count: '×2',
    desc:
      '后向展开式折叠臂，与前臂呈 X 型对称布局。臂体内部为动力线与信号线通道，末端同样集成电机座。',
    specs: [
      ['数量', '2 支'],
      ['构型', '后向展开折叠臂'],
      ['布局', 'X 型四轴对称'],
      ['集成', '动力走线 · 电机座']
    ]
  },
  motor: {
    name: '无刷电机',
    en: 'Brushless Motor',
    count: '×4',
    desc:
      '四枚无刷直流电机按对角线对称布置，由机身内的电子调速器驱动。转向两两相反，以抵消桨叶反扭。',
    specs: [
      ['数量', '4 枚'],
      ['类型', '无刷直流电机'],
      ['布局', '对角线对称 · 正反桨配对'],
      ['调速', 'ESC 集成于机身'],
      ['安装', '臂端电机座']
    ]
  },
  prop: {
    name: '折叠螺旋桨',
    en: 'Folding Propellers',
    count: '×4',
    desc:
      '三叶折叠低噪桨，起飞时靠离心力自动展开，收纳时向后收拢贴合臂体。桨夹带象限标识，需按正反桨对位安装。',
    specs: [
      ['数量', '4 组 × 3 叶'],
      ['类型', '折叠低噪桨'],
      ['展开轴距', '325.5 mm'],
      ['特性', '快拆 / 正反桨标识'],
      ['收纳', '离心展开 · 手动收拢']
    ]
  },
  sensing: {
    name: '感知系统',
    en: 'Sensing Array',
    count: '×1',
    desc:
      'Air 系列首次在前向加入激光雷达，与全向双目视觉、下视 ToF 共同构成避障与定位体系，夜间同样可用。',
    specs: [
      ['前向', '激光雷达 LiDAR'],
      ['全向', '双目视觉避障'],
      ['下视', 'ToF 辅助定高'],
      ['补光', '夜间辅助照明灯'],
      ['图传', 'O4 · 最高 20 km']
    ]
  }
};

const ORDER = ['body', 'gimbal', 'battery', 'armFront', 'armRear', 'motor', 'prop', 'sensing'];

/* ------------------------------------------------------------
 * 2. 材质与纹理
 * ---------------------------------------------------------- */
function makeNoiseTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 168 + Math.random() * 87;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.5, 2.5);
  t.anisotropy = 4;
  return t;
}
const NOISE = makeNoiseTexture();

const mkStd = (opts) => new THREE.MeshStandardMaterial(opts);
const mkPhys = (opts) => new THREE.MeshPhysicalMaterial(opts);

const M = {
  shell: () =>
    mkStd({
      color: 0x272c34,
      metalness: 0.40,
      roughness: 0.52,
      roughnessMap: NOISE,
      envMapIntensity: 0.65
    }),
  shellDark: () =>
    mkStd({
      color: 0x101317,
      metalness: 0.55,
      roughness: 0.38,
      roughnessMap: NOISE,
      envMapIntensity: 0.6
    }),
  shellLight: () =>
    mkStd({
      color: 0x353c46,
      metalness: 0.5,
      roughness: 0.34,
      roughnessMap: NOISE,
      envMapIntensity: 0.75
    }),
  plastic: () =>
    mkStd({ color: 0x1a1d23, metalness: 0.15, roughness: 0.72, envMapIntensity: 0.5 }),
  metal: () =>
    mkStd({ color: 0xaab4c0, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.3 }),
  metalDark: () =>
    mkStd({ color: 0x606b78, metalness: 1.0, roughness: 0.34, envMapIntensity: 1.1 }),
  copper: () =>
    mkStd({ color: 0xb87333, metalness: 1.0, roughness: 0.35, envMapIntensity: 1.2 }),
  glass: () =>
    mkPhys({
      color: 0x040a12,
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.1
    }),
  lens: () =>
    mkPhys({
      color: 0x0b2233,
      metalness: 0.4,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 0.85
    }),
  led: () =>
    mkStd({
      color: 0x9dffc4,
      emissive: 0x35ff8a,
      emissiveIntensity: 1.6,
      metalness: 0,
      roughness: 0.4
    }),
  ledDim: () =>
    mkStd({
      color: 0x2a3a33,
      emissive: 0x114d2c,
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.5
    })
};

/* ------------------------------------------------------------
 * 3. 几何体工具
 * ---------------------------------------------------------- */

/** 超椭圆截面放样：沿 X 轴生成机身 / 外壳这类渐变体 */
function loftGeometry(sections, radial = 36) {
  const pos = [];
  const uvs = [];
  const idx = [];
  const stride = radial + 1;

  for (let s = 0; s < sections.length; s++) {
    const { x, w, h, cy = 0, e = 3.0 } = sections[s];
    const p = 2 / e;
    for (let i = 0; i <= radial; i++) {
      const t = (i / radial) * Math.PI * 2;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const z = w * Math.sign(ct) * Math.pow(Math.abs(ct), p);
      const y = cy + h * Math.sign(st) * Math.pow(Math.abs(st), p);
      pos.push(x, y, z);
      uvs.push(i / radial, s / (sections.length - 1));
    }
  }

  for (let s = 0; s < sections.length - 1; s++) {
    for (let i = 0; i < radial; i++) {
      const a = s * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }

  const bodyCount = pos.length / 3;

  // 端盖（独立顶点，保持硬边）
  const cap = (si, flip) => {
    const sec = sections[si];
    const { x, w, h, cy = 0, e = 3.0 } = sec;
    const p = 2 / e;
    const base = pos.length / 3;
    pos.push(x, cy, 0);
    uvs.push(0.5, 0.5);
    for (let i = 0; i <= radial; i++) {
      const t = (i / radial) * Math.PI * 2;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const z = w * Math.sign(ct) * Math.pow(Math.abs(ct), p);
      const y = cy + h * Math.sign(st) * Math.pow(Math.abs(st), p);
      pos.push(x, y, z);
      uvs.push(0.5 + z / (w * 2), 0.5 + y / (h * 2));
    }
    for (let i = 0; i < radial; i++) {
      if (flip) idx.push(base, base + 1 + i, base + 2 + i);
      else idx.push(base, base + 2 + i, base + 1 + i);
    }
  };
  cap(0, false);
  cap(sections.length - 1, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // 缝合 UV 接缝处的法线，避免出现一条硬边
  const nrm = geo.attributes.normal;
  for (let s = 0; s < sections.length; s++) {
    const first = s * stride;
    const last = first + radial;
    nrm.setXYZ(last, nrm.getX(first), nrm.getY(first), nrm.getZ(first));
  }
  nrm.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/** 沿任意方向生成扁平锥管（机臂） */
function beamGeometry(from, to, rFrom, rTo, flatten = 0.62, seg = 12) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const dirN = dir.clone().normalize();
  const up0 = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dirN.dot(up0)) > 0.98) up0.set(0, 0, 1);
  const up = up0.clone().sub(dirN.clone().multiplyScalar(dirN.dot(up0))).normalize();
  const side = new THREE.Vector3().crossVectors(dirN, up).normalize();

  const geo = new THREE.CylinderGeometry(rTo, rFrom, len, seg, 1, false);
  geo.scale(1, 1, flatten);
  const mtx = new THREE.Matrix4().makeBasis(side, dirN, up);
  mtx.setPosition(new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5));
  geo.applyMatrix4(mtx);
  return geo;
}

/** 三叶折叠桨的单叶形状 */
function bladeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.032, 0.072);
  s.bezierCurveTo(0.16, 0.145, 0.32, 0.125, 0.455, 0.058);
  s.quadraticCurveTo(0.515, 0.026, 0.492, -0.008);
  s.bezierCurveTo(0.34, -0.062, 0.155, -0.07, 0.045, -0.062);
  s.quadraticCurveTo(0.016, -0.022, 0.032, 0.072);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 14,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.004, 0);
  return geo;
}
const BLADE_GEO = bladeGeometry();

/** 文字贴图（机身侧标） */
function textTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(190,206,220,0.62)';
  ctx.font = '600 46px "Helvetica Neue", Arial, sans-serif';
  ctx.letterSpacing = '10px';
  ctx.fillText(lines[0], 256, 48);
  ctx.fillStyle = 'rgba(140,160,180,0.4)';
  ctx.font = '400 22px ui-monospace, Consolas, monospace';
  ctx.letterSpacing = '6px';
  ctx.fillText(lines[1], 256, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------
 * 4. 场景基础
 * ---------------------------------------------------------- */
const stage = document.getElementById('stage');
const labelLayer = document.getElementById('labelLayer');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
scene.fog = new THREE.Fog(0x05070c, 11, 26);

const camera = new THREE.PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.1, 140);
const CAM_END = new THREE.Vector3(4.72, 2.72, 5.78);
const CAM_START = new THREE.Vector3(10.6, 7.0, 11.6);
camera.position.copy(CAM_START);

const QS = new URLSearchParams(location.search);
if (QS.has('cam')) {
  const a = QS.get('cam').split(',').map(Number);
  if (a.length === 3) CAM_END.set(a[0], a[1], a[2]);
}
if (QS.has('nointro')) camera.position.copy(CAM_END);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.20, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.rotateSpeed = 0.72;
controls.zoomSpeed = 0.78;
controls.panSpeed = 0.6;
controls.minDistance = 3.0;
controls.maxDistance = 17;
controls.maxPolarAngle = Math.PI * 0.52;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;

// 环境反射
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.06);
scene.environment = envRT.texture;
pmrem.dispose();

// 灯光
scene.add(new THREE.HemisphereLight(0x9dc8ff, 0x070a10, 0.28));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
keyLight.position.set(4.5, 8.6, 5.6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd2e8ff, 0.5);
fillLight.position.set(-5.5, 2.5, -3.5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffb545, 0.42);
rimLight.position.set(-2, -3, 6);
scene.add(rimLight);

const p1 = new THREE.PointLight(0xd8f2ff, 24, 16, 2);
p1.position.set(-3.8, 2.2, 3.4);
scene.add(p1);

const p2 = new THREE.PointLight(0x4a7cff, 14, 16, 2);
p2.position.set(2.8, -1.4, -2.6);
scene.add(p2);

/* --- 地面网格 --- */
const floorMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uColor: { value: new THREE.Color(CYAN) },
    uTime: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uTime;

    float gridLine( vec2 uv, float scale ) {
      vec2 c = uv * scale;
      vec2 g = abs( fract( c - 0.5 ) - 0.5 ) / fwidth( c );
      return 1.0 - min( min( g.x, g.y ), 1.0 );
    }

    void main() {
      float r = length( vUv - 0.5 ) * 2.0;
      float fade = smoothstep( 1.0, 0.02, r );
      float g1 = gridLine( vUv, 26.0 ) * 0.16;
      float g2 = gridLine( vUv, 6.5 ) * 0.34;

      vec2 d = vUv - 0.5;
      float ang = atan( d.y, d.x );
      float sweep = smoothstep( 0.86, 1.0, sin( ang * 2.0 + uTime * 0.35 ) ) * 0.35;

      float a = ( g1 + g2 ) * fade + sweep * fade * 0.35;
      float glow = pow( max( 0.0, 1.0 - r ), 7.0 ) * 0.16;

      vec3 col = uColor * ( a * 1.25 ) + vec3( 0.04, 0.20, 0.38 ) * glow;
      gl_FragColor = vec4( col, clamp( a + glow * 0.9, 0.0, 1.0 ) );
    }`
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.15;
scene.add(floor);

/* --- 星尘粒子 --- */
const starCount = 620;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 7 + Math.random() * 13;
  const th = Math.random() * Math.PI * 2;
  const ph = Math.acos(THREE.MathUtils.randFloatSpread(2) * 0.9);
  starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
  starPos[i * 3 + 1] = r * Math.cos(ph) * 0.6 + 1.2;
  starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({
    color: 0x8ed8ff,
    size: 0.036,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
);
scene.add(stars);

/* ------------------------------------------------------------
 * 5. 无人机建模
 * ---------------------------------------------------------- */
const drone = new THREE.Group();
drone.position.y = 0.52;
scene.add(drone);

const instances = [];   // { id, group, mats, dir, p, label }
const labelList = [];   // 所有标签，用于屏幕空间避让
const pickables = [];   // 可拾取网格
const propGroups = [];  // 四组螺旋桨（飞行时旋转）
const batteryLeds = []; // 电池电量灯材质
let labelRenderer;

function makeLabel(id, pos) {
  const p = PARTS[id];
  const div = document.createElement('div');
  div.className = 'lbl';
  div.innerHTML = `<div class="lbl-in"><span class="d"></span><b>${p.name}</b><i>${p.en}</i></div>`;
  const obj = new CSS2DObject(div);
  obj.position.copy(pos);
  return { obj, div, inner: div.firstElementChild, id, w: 0 };
}

/** 把一个部件组挂到机身上 */
function mount(id, group, dir, labelPos) {
  group.userData.partId = id;
  drone.add(group);

  const matSet = new Set();
  group.traverse((o) => {
    if (o.isMesh) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => matSet.add(m));
      o.userData.partId = id;
      pickables.push(o);
    }
  });

  const mats = [...matSet];
  mats.forEach((m) => {
    m.userData.baseColor = m.color.clone();
    m.userData.baseEnv = m.envMapIntensity !== undefined ? m.envMapIntensity : 1;
    m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
    m.userData.baseEmissiveIntensity = m.emissiveIntensity !== undefined ? m.emissiveIntensity : 1;
    m.userData.isGlowable = !!m.emissive && m.emissive.getHex() === 0;
  });

  const inst = { id, group, mats, dir: new THREE.Vector3(...dir), p: 0, label: null };

  if (labelPos) {
    const lb = makeLabel(id, new THREE.Vector3(...labelPos));
    group.add(lb.obj);
    inst.label = lb;
    labelList.push(lb);
  }

  instances.push(inst);
  return inst;
}

/* ---------- 5.1 机身主体 ---------- */
function buildBody() {
  const g = new THREE.Group();

  const sections = [
    { x: 1.112, w: 0.300, h: 0.170, cy: 0.025 },
    { x: 1.098, w: 0.352, h: 0.203, cy: 0.027 },
    { x: 1.020, w: 0.402, h: 0.235, cy: 0.030 },
    { x: 0.900, w: 0.438, h: 0.262, cy: 0.030 },
    { x: 0.760, w: 0.458, h: 0.286, cy: 0.030 },
    { x: 0.560, w: 0.470, h: 0.305, cy: 0.028 },
    { x: 0.320, w: 0.474, h: 0.318, cy: 0.025 },
    { x: 0.030, w: 0.470, h: 0.326, cy: 0.020 },
    { x: -0.280, w: 0.458, h: 0.320, cy: 0.020 },
    { x: -0.590, w: 0.434, h: 0.302, cy: 0.020 },
    { x: -0.850, w: 0.390, h: 0.266, cy: 0.020 },
    { x: -1.010, w: 0.316, h: 0.212, cy: 0.020 },
    { x: -1.078, w: 0.212, h: 0.132, cy: 0.020 }
  ];


  const hull = new THREE.Mesh(loftGeometry(sections, 40), M.shell());
  g.add(hull);

  // 底部承力板
  const belly = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.055, 0.62, 3, 0.024), M.shellDark());
  belly.position.set(0.06, -0.316, 0);
  g.add(belly);

  // 尾部电池仓底板（拆掉电池后可见）
  const bay = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.02, 0.74, 3, 0.008), M.shellDark());
  bay.position.set(-0.44, 0.326, 0);
  g.add(bay);

  // 尾部散热格栅
  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.03, 0.30, 2, 0.006), M.metalDark());
    fin.position.set(-1.055 + i * 0.03, 0.0, 0);
    g.add(fin);
  }

  // 顶部散热孔
  for (let i = 0; i < 4; i++) {
    const slot = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.012, 0.052, 2, 0.005), M.plastic());
    slot.position.set(0.44 + i * 0.13, 0.318 - i * 0.004, 0);
    g.add(slot);
  }

  // 侧面进气格栅
  for (const sz of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const grille = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.018, 0.01, 2, 0.004), M.plastic());
      grille.position.set(0.60 - i * 0.005, 0.055 - i * 0.048, sz * 0.468);
      g.add(grille);
    }
  }

  // 侧面机型标识
  const tex = textTexture(['AIR 3S', 'DJI']);
  for (const sz of [1, -1]) {
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.115, 0.012, 2, 0.005), M.shellDark());
    plate.position.set(-0.05, 0.03, sz * 0.466);
    g.add(plate);

    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.40, 0.10),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.9
      })
    );
    decal.position.set(-0.05, 0.03, sz * 0.4735);
    if (sz < 0) decal.rotation.y = Math.PI;
    g.add(decal);
  }

  // 云台吊挂基座
  const gimbalBase = new THREE.Mesh(new RoundedBoxGeometry(0.30, 0.10, 0.34, 3, 0.03), M.shellDark());
  gimbalBase.position.set(0.60, -0.315, 0);
  g.add(gimbalBase);

  // 折叠铰链座（四角）
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.20, 18), M.shellDark());
      hinge.position.set(sx * (sx > 0 ? 0.55 : 0.47), 0.135, sz * 0.40);
      g.add(hinge);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.215, 12), M.metalDark());
      cap.position.copy(hinge.position);
      g.add(cap);
    }
  }

  return g;
}

/* ---------- 5.2 三轴云台相机 ---------- */
function buildGimbal() {
  const g = new THREE.Group();

  // 减震吊架
  const yoke = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.26, 0.24, 3, 0.05), M.shellDark());
  yoke.position.set(0.56, -0.35, 0);
  g.add(yoke);

  // 吊挂底板（贴合机身腹部）
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.075, 0.32, 3, 0.024), M.shellDark());
  plate.position.set(0.785, -0.262, 0);
  g.add(plate);

  // 横滚臂
  const rollArm = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.075, 0.075, 3, 0.03), M.shellDark());
  rollArm.position.set(0.63, -0.37, 0.10);
  g.add(rollArm);

  // 相机本体
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.345, 0.275, 0.475, 5, 0.055), M.shellDark());
  head.position.set(0.75, -0.395, 0);
  g.add(head);

  // 前脸面板
  const face = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.238, 0.44, 3, 0.026), M.plastic());
  face.position.set(0.92, -0.393, 0);
  g.add(face);

  // 双镜头
  const lensZ = [-0.115, 0.115];
  lensZ.forEach((lz, i) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.097, 0.085, 32), M.metalDark());
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.95, -0.388, lz);
    g.add(barrel);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.089, 0.010, 10, 36), M.metal());
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0.99, -0.388, lz);
    g.add(ring);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.014, 32), M.lens());
    glass.rotation.z = Math.PI / 2;
    glass.position.set(0.991, -0.388, lz);
    g.add(glass);

    // 镜片内部光学元件
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.043, 0.03, 24), M.glass());
    inner.rotation.z = Math.PI / 2;
    inner.position.set(0.977, -0.388, lz);
    g.add(inner);

    const glare = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 18),
      new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.22, depthWrite: false })
    );
    glare.rotation.y = Math.PI / 2;
    glare.position.set(0.998, -0.365, lz + 0.028);
    g.add(glare);
  });

  // 传感器标识条
  const strip = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.028, 0.46, 2, 0.008), M.metalDark());
  strip.position.set(0.95, -0.502, 0);
  g.add(strip);

  // 底部散热片
  for (let i = 0; i < 6; i++) {
    const finMesh = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.012, 0.014, 2, 0.004), M.metalDark());
    finMesh.position.set(0.755, -0.543, -0.13 + i * 0.052);
    g.add(finMesh);
  }

  return g;
}

/* ---------- 5.3 智能电池 ---------- */
function buildBattery() {
  const g = new THREE.Group();
  const cx = -0.44;
  const cy = 0.368;

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.17, 0.765, 4, 0.048), M.shell());
  body.position.set(cx, cy, 0);
  g.add(body);

  const top = new THREE.Mesh(new RoundedBoxGeometry(0.80, 0.042, 0.71, 4, 0.022), M.shell());
  top.position.set(cx, cy + 0.083, 0);
  g.add(top);

  // 电量指示灯
  for (let i = 0; i < 4; i++) {
    const led = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.008, 0.026, 2, 0.003), i < 3 ? M.led() : M.ledDim());
    led.position.set(cx - 0.10, cy + 0.107, -0.215 + i * 0.055);
    g.add(led);
    batteryLeds.push(led.material);
  }

  // 电源按键
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 24), M.metalDark());
  btn.position.set(cx + 0.16, cy + 0.106, 0);
  g.add(btn);

  // 侧边卡扣
  for (const sz of [1, -1]) {
    const clip = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.05, 0.028, 3, 0.012), M.shellDark());
    clip.position.set(cx, cy + 0.02, sz * 0.382);
    g.add(clip);
  }

  // 金属触点
  for (let i = 0; i < 4; i++) {
    const pin = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.02, 0.014, 2, 0.004), M.copper());
    pin.position.set(cx - 0.375, cy - 0.068, -0.09 + i * 0.06);
    g.add(pin);
  }

  return g;
}

/* ---------- 5.4 机臂 ---------- */
function buildArm(front, right) {
  const g = new THREE.Group();
  const sx = front ? 1 : -1;
  const sz = right ? 1 : -1;

  const shoulder = new THREE.Vector3((front ? 0.55 : -0.47) * 1, 0.145, 0.40 * sz);
  const motorPos = new THREE.Vector3((front ? 1.00 : -0.965) * 1, 0.165, 1.02 * sz);

  const beam = new THREE.Mesh(beamGeometry(shoulder, motorPos, 0.098, 0.062, 0.60, 14), M.shell());
  g.add(beam);

  // 肩部加强块
  const block = new THREE.Mesh(new RoundedBoxGeometry(0.20, 0.155, 0.13, 3, 0.04), M.shellDark());
  block.position.copy(shoulder);
  block.lookAt(motorPos.clone().setY(shoulder.y));
  g.add(block);

  // 电机座
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.128, 0.115, 28), M.shellLight());
  seat.position.set(motorPos.x, 0.155, motorPos.z);
  g.add(seat);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.012, 8, 30), M.metalDark());
  ring.rotation.x = Math.PI / 2;
  ring.position.set(motorPos.x, 0.105, motorPos.z);
  g.add(ring);

  // 起落支撑
  const legTop = new THREE.Vector3(motorPos.x * 1.015, 0.10, motorPos.z * 1.015);
  const legBot = new THREE.Vector3(motorPos.x * 1.05, -0.545, motorPos.z * 1.05);
  const leg = new THREE.Mesh(beamGeometry(legTop, legBot, 0.05, 0.036, 0.9, 10), M.shellDark());
  g.add(leg);

  const foot = new THREE.Mesh(new RoundedBoxGeometry(0.10, 0.045, 0.13, 3, 0.02), M.plastic());
  foot.position.set(legBot.x, legBot.y - 0.01, legBot.z);
  g.add(foot);

  // 天线走线装饰
  const cable = new THREE.Mesh(
    beamGeometry(
      new THREE.Vector3(shoulder.x, shoulder.y - 0.055, shoulder.z),
      new THREE.Vector3(motorPos.x, motorPos.y - 0.055, motorPos.z),
      0.018,
      0.014,
      1,
      6
    ),
    M.plastic()
  );
  g.add(cable);

  // 桨叶收拢支架标识
  const mark = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.005, 6, 20), M.metalDark());
  mark.rotation.x = Math.PI / 2;
  mark.position.set(motorPos.x, 0.215, motorPos.z);
  g.add(mark);

  g.userData.motorPos = motorPos;
  return g;
}

/* ---------- 5.5 无刷电机 ---------- */
function buildMotor(pos, spin) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.132, 0.055, 30), M.metalDark());
  base.position.set(pos.x, 0.245, pos.z);
  g.add(base);

  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.122, 0.10, 30), M.shellDark());
  can.position.set(pos.x, 0.315, pos.z);
  g.add(can);

  // 转子散热槽
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const slot = new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.072, 0.028, 2, 0.005), M.plastic());
    slot.position.set(pos.x + Math.cos(a) * 0.108, 0.315, pos.z + Math.sin(a) * 0.108);
    slot.rotation.y = -a;
    g.add(slot);
  }

  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.118, 0.05, 30), M.metalDark());
  bell.position.set(pos.x, 0.39, pos.z);
  g.add(bell);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.03, 0.04, 18), M.metal());
  cap.position.set(pos.x, 0.432, pos.z);
  g.add(cap);

  const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.008, 8, 30), M.metalDark());
  ringTop.rotation.x = Math.PI / 2;
  ringTop.position.set(pos.x, 0.362, pos.z);
  g.add(ringTop);

  g.userData.spin = spin;
  return g;
}

/* ---------- 5.6 螺旋桨 ---------- */
function buildProp(pos, dir) {
  const g = new THREE.Group();

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.05, 28), M.shellDark());
  hub.position.set(pos.x, 0.452, pos.z);
  g.add(hub);

  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.022, 22), M.metal());
  hubCap.position.set(pos.x, 0.482, pos.z);
  g.add(hubCap);

  const blades = [];
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(BLADE_GEO, M.plastic());
    const holder = new THREE.Group();
    holder.position.set(pos.x, 0.452, pos.z);
    holder.rotation.y = (i * Math.PI * 2) / 3;
    holder.userData.base = holder.rotation.y;
    blade.rotation.x = 0.26;
    holder.add(blade);
    g.add(holder);
    blades.push(holder);
  }

  // 高速旋转时的桨盘虚影（透明度随转速上升）
  const disc = new THREE.Mesh(
    new THREE.RingGeometry(0.085, 0.545, 56, 1),
    new THREE.MeshBasicMaterial({
      color: 0xcfeaff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(pos.x, 0.452, pos.z);
  disc.visible = false;
  g.add(disc);

  g.userData.blades = blades;
  g.userData.disc = disc;
  g.userData.dir = dir || 1;
  return g;
}

/* ---------- 5.7 感知系统 ---------- */
function buildSensing() {
  const g = new THREE.Group();
  const fx = 1.102;

  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.235, 0.52, 3, 0.02), M.glass());
  bar.position.set(fx, 0.035, 0);
  g.add(bar);

  // 前向视觉双摄
  for (const sz of [1, -1]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.022, 24), M.metalDark());
    ring.rotation.z = Math.PI / 2;
    ring.position.set(fx + 0.028, 0.03, sz * 0.165);
    g.add(ring);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.026, 22), M.lens());
    lens.rotation.z = Math.PI / 2;
    lens.position.set(fx + 0.032, 0.03, sz * 0.165);
    g.add(lens);
  }

  // 激光雷达窗口
  const lidar = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.088, 0.115, 3, 0.012), M.lens());
  lidar.position.set(fx + 0.03, 0.035, 0);
  g.add(lidar);

  const lidarRing = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.104, 0.132, 3, 0.01), M.metalDark());
  lidarRing.position.set(fx + 0.024, 0.035, 0);
  g.add(lidarRing);

  // 补光灯
  for (const sz of [1, -1]) {
    const lightDot = new THREE.Mesh(new THREE.CircleGeometry(0.017, 16), M.led());
    lightDot.rotation.y = Math.PI / 2;
    lightDot.position.set(fx + 0.035, -0.06, sz * 0.215);
    g.add(lightDot);
  }

  return g;
}

/* ------------------------------------------------------------
 * 6. 组装
 * ---------------------------------------------------------- */
const gimbalHeadWorld = new THREE.Vector3(0.745, -0.47, 0);

mount('body', buildBody(), [0, 0, 0], [0.1, 0.62, 0.5]);
mount('gimbal', buildGimbal(), [0.04, -0.58, 0], [0.98, -0.62, 0.40]);
mount('battery', buildBattery(), [0, 0.58, 0], [-0.80, 0.44, 0.34]);

const armDefs = [
  { front: true, right: true, label: [0.86, 0.42, 0.78] },
  { front: true, right: false, label: null },
  { front: false, right: true, label: [-0.88, 0.44, 0.80] },
  { front: false, right: false, label: null }
];

const motorPts = [];

armDefs.forEach((d) => {
  const arm = buildArm(d.front, d.right);
  const mp = arm.userData.motorPos.clone();
  const radial = new THREE.Vector3(mp.x, 0, mp.z).normalize();
  mount(
    d.front ? 'armFront' : 'armRear',
    arm,
    [radial.x * 0.52, 0.40, radial.z * 0.52],
    d.label
  );
  motorPts.push({ pos: mp, radial });
});

mount('sensing', buildSensing(), [0.62, 0.12, 0], [1.18, 0.40, -0.44]);

let motorLabelled = false;
let propLabelled = false;

motorPts.forEach((m, i) => {
  mount(
    'motor',
    buildMotor(m.pos, i % 2 === 0 ? 1 : -1),
    [m.radial.x * 0.30, 0.78, m.radial.z * 0.30],
    motorLabelled ? null : [m.pos.x + 0.02, 0.70, m.pos.z + 0.04]
  );
  motorLabelled = true;

  const propGroup = buildProp(m.pos, i % 2 === 0 ? 1 : -1);
  propGroups.push(propGroup);
  mount(
    'prop',
    propGroup,
    [m.radial.x * 0.30, 1.16, m.radial.z * 0.30],
    propLabelled ? null : [m.pos.x + 0.12, 0.58, m.pos.z + 0.50]
  );
  propLabelled = true;
});

/* ------------------------------------------------------------
 * 7. 后处理
 * ---------------------------------------------------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.30,
  0.42,
  0.86
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// CSS2D 标签层
labelRenderer = new CSS2DRenderer({ element: labelLayer });
labelRenderer.setSize(window.innerWidth, window.innerHeight);

/* ------------------------------------------------------------
 * 8. 状态与交互
 * ---------------------------------------------------------- */
const state = {
  exploded: new Set(),
  selected: null,
  hovered: null,
  showLabels: true,
  spin: true,
  intro: 0,
  fitTarget: 1,
  flight: false
};

/* 把包围盒 8 个角投影到 NDC，反算刚好装进画面的缩放（精确适配任意屏幕比例） */
const _fitV = new THREE.Vector3();
function updateFit(explodedSet) {
  const saved = instances.map((i) => i.group.position.clone());
  instances.forEach((i) => {
    const on = explodedSet.has(i.id) ? 1 : 0;
    i.group.position.set(i.dir.x * on, i.dir.y * on, i.dir.z * on);
  });
  drone.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(drone);
  instances.forEach((i, k) => i.group.position.copy(saved[k]));
  drone.updateMatrixWorld(true);

  const camSave = camera.position.clone();
  const zoomSave = camera.zoom;
  camera.position.copy(CAM_END);
  camera.lookAt(controls.target);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  let maxN = 0;
  for (let i = 0; i < 8; i++) {
    _fitV.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    _fitV.project(camera);
    maxN = Math.max(maxN, Math.abs(_fitV.x), Math.abs(_fitV.y));
  }

  camera.position.copy(camSave);
  camera.zoom = zoomSave;
  camera.updateProjectionMatrix();

  const portrait = window.innerWidth / window.innerHeight < 0.95;
  const short = !portrait && window.innerHeight < 860;
  const margin = portrait
    ? (state.flight ? 0.92 : 0.82)
    : (state.flight ? (short ? 0.78 : 0.88) : 0.92);
  state.fitTarget = THREE.MathUtils.clamp((margin / Math.max(maxN, 0.05)), 0.12, 1.06);
}

const el = (id) => document.getElementById(id);
const partListEl = el('partList');
const tooltip = el('tooltip');
const statusText = el('statusText');

// 侧栏清单
const rowMap = new Map();
ORDER.forEach((id, i) => {
  const p = PARTS[id];
  const li = document.createElement('li');
  li.className = 'part-row';
  li.dataset.id = id;
  li.innerHTML = `
    <span class="num">${String(i + 1).padStart(2, '0')}</span>
    <span class="meta"><b>${p.name}</b><i>${p.en}</i></span>
    <span class="chip">${p.count}</span>`;
  li.addEventListener('click', () => selectPart(id, true));
  li.addEventListener('mouseenter', () => setHover(id));
  li.addEventListener('mouseleave', () => setHover(null));
  partListEl.appendChild(li);
  rowMap.set(id, li);
});

function setStatus() {
  if (!statusText) return;
  const n = state.exploded.size;
  if (n === 0) statusText.textContent = '组装态 · 8 个部件就绪';
  else if (n === ORDER.length) statusText.textContent = '全拆解 · 8/8';
  else statusText.textContent = `拆解中 · ${n}/8`;
}

function setGlow(m, amount) {
  if (!m.userData.isGlowable) return;
  if (amount <= 0.001) {
    m.emissive.copy(m.userData.baseEmissive);
    m.emissiveIntensity = m.userData.baseEmissiveIntensity;
  } else {
    m.emissive.setHex(CYAN);
    m.emissiveIntensity = amount;
  }
}

function applyHighlight() {
  for (const inst of instances) {
    const isSel = inst.id === state.selected;
    const dim = state.selected !== null && !isSel;
    const exploded = state.exploded.has(inst.id);

    for (const m of inst.mats) {
      if (isSel) {
        m.color.copy(m.userData.baseColor).multiplyScalar(1.45);
        m.envMapIntensity = m.userData.baseEnv * 1.35;
        setGlow(m, 0.075);
      } else if (dim) {
        m.color.copy(m.userData.baseColor).multiplyScalar(0.42);
        m.envMapIntensity = m.userData.baseEnv * 0.25;
        setGlow(m, 0);
      } else {
        m.color.copy(m.userData.baseColor);
        m.envMapIntensity = m.userData.baseEnv;
        setGlow(m, 0);
      }
    }
  }
}

function renderInfo(id) {
  const empty = el('infoEmpty');
  const bodyEl = el('infoBody');
  const p = PARTS[id];
  if (!p) {
    empty.hidden = false;
    bodyEl.hidden = true;
    return;
  }
  empty.hidden = true;
  bodyEl.hidden = false;
  el('infoIndex').textContent = `${String(ORDER.indexOf(id) + 1).padStart(2, '0')} / 08`;
  el('infoCat').textContent = p.count;
  el('infoTitle').textContent = p.name;
  el('infoEn').textContent = p.en;
  el('infoDesc').textContent = p.desc;
  el('infoSpecs').innerHTML = p.specs
    .map(([k, v]) => `<div class="spec-row"><span>${k}</span><b>${v}</b></div>`)
    .join('');
  el('btnPartToggle').textContent = state.exploded.has(id) ? '归位此部件' : '拆解此部件';
  el('btnPartToggle').classList.toggle('on', state.exploded.has(id));
}

function selectPart(id, explode) {
  state.selected = id;
  if (explode && id) state.exploded.add(id);
  rowMap.forEach((row, key) => row.classList.toggle('active', key === id));
  applyHighlight();
  renderInfo(id);

  // 可选：Android / iOS WebView 原生桥接
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.onPartSelected === 'function') {
      window.AndroidBridge.onPartSelected(id, PARTS[id] ? PARTS[id].name : '');
    }
  } catch (e) { /* 浏览器环境忽略 */ }
  syncToggleButtons();
  setStatus();
}

function clearSelection() {
  state.selected = null;
  rowMap.forEach((row) => row.classList.remove('active'));
  applyHighlight();
  renderInfo(null);
  setStatus();
}

function setHover(id) {
  if (state.hovered === id) return;
  state.hovered = id;
  document.body.style.cursor = id ? 'pointer' : 'default';
}

function syncToggleButtons() {
  applyHighlight();
  updateFit(state.exploded);
  el('btnExplode').classList.toggle('on', state.exploded.size > 0);
  el('btnExplode').querySelector('.lbl-txt').textContent =
    state.exploded.size === ORDER.length ? '全部归位' : '全部拆解';
}

/* --- 按钮 --- */
el('btnExplode').addEventListener('click', () => {
  if (state.exploded.size === ORDER.length) {
    state.exploded.clear();
  } else {
    ORDER.forEach((id) => state.exploded.add(id));
  }
  syncToggleButtons();
  renderInfo(state.selected);
  setStatus();
  controls.autoRotate = false;
  el('btnSpin').classList.remove('on');
  state.spin = false;
});

el('btnReset').addEventListener('click', () => {
  state.exploded.clear();
  clearSelection();
  syncToggleButtons();
  controls.autoRotate = true;
  state.spin = true;
  el('btnSpin').classList.add('on');
  controls.target.set(0, 0.20, 0);
  document.getElementById('btnReset').blur();
});

el('btnLabels').addEventListener('click', () => {
  state.showLabels = !state.showLabels;
  el('btnLabels').classList.toggle('on', state.showLabels);
});

el('btnSpin').addEventListener('click', () => {
  state.spin = !state.spin;
  controls.autoRotate = state.spin;
  el('btnSpin').classList.toggle('on', state.spin);
});

el('btnPartToggle').addEventListener('click', () => {
  const id = state.selected;
  if (!id) return;
  if (state.exploded.has(id)) state.exploded.delete(id);
  else state.exploded.add(id);
  syncToggleButtons();
  renderInfo(id);
  setStatus();
});

document.addEventListener('keydown', (e) => {
  if (state.flight) {
    const k = e.key.toLowerCase();
    if (k === 't') execCommand('takeoff');
    if (k === 'l') execCommand('land');
    if (k === 'h') execCommand('rth');
    if (k === 'x') execCommand('estop');
    if (k === 'escape') setFlightMode(false);
    return;
  }
  if (e.key === 'Escape') clearSelection();
  if (e.key === ' ') {
    e.preventDefault();
    el('btnExplode').click();
  }
});

controls.addEventListener('start', () => {
  if (state.spin) {
    controls.autoRotate = false;
    state.spin = false;
    el('btnSpin').classList.remove('on');
  }
});

/* --- 拾取 --- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = { x: 0, y: 0 };
let pointerActive = false;

function updatePointer(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function findPartId(obj) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.partId) return o.userData.partId;
    o = o.parent;
  }
  return null;
}

function pick() {
  if (state.flight) return null; // 飞行模式下不做拆解拾取，避免误触
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  for (const h of hits) {
    if (!h.object.visible) continue;
    const id = findPartId(h.object);
    if (id) return id;
  }
  return null;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  updatePointer(e);
  pointerActive = true;

  if (e.buttons === 0) {
    const id = pick();
    setHover(id);
    if (id) {
      tooltip.textContent = PARTS[id].name;
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top = e.clientY + 'px';
      tooltip.classList.add('on');
    } else {
      tooltip.classList.remove('on');
    }
  } else {
    tooltip.classList.remove('on');
  }
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
  tooltip.classList.remove('on');
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const dx = e.clientX - downPos.x;
  const dy = e.clientY - downPos.y;
  if (Math.hypot(dx, dy) > 5) return; // 拖拽视角，不算点击

  updatePointer(e);
  const id = pick();
  if (id) {
    if (state.selected === id) {
      // 再次点击同一部件 → 切换拆解状态
      if (state.exploded.has(id)) state.exploded.delete(id);
      else state.exploded.add(id);
      renderInfo(id);
      syncToggleButtons();
      setStatus();
    } else {
      selectPart(id, true);
    }
  } else {
    clearSelection();
  }
});

renderer.domElement.addEventListener('pointerleave', () => {
  tooltip.classList.remove('on');
  setHover(null);
});

/* --- 尺寸 --- */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  labelRenderer.setSize(w, h);
  applyViewportBias();
  updateFit(state.exploded);
}
window.addEventListener('resize', onResize);

/* 标签屏幕空间避让：同列向下错开，避免互相压住 */
const _lv = new THREE.Vector3();
function layoutLabels() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const items = [];
  for (const l of labelList) {
    if (!l.div.classList.contains('on')) {
      l.inner.style.transform = '';
      continue;
    }
    if (!l.w) l.w = l.inner.offsetWidth || 120;
    l.obj.getWorldPosition(_lv).project(camera);
    items.push({ l, x: (_lv.x * 0.5 + 0.5) * W, y: (-_lv.y * 0.5 + 0.5) * H });
  }
  items.sort((a, b) => a.y - b.y);
  const placed = [];
  for (const it of items) {
    let cy = it.y;
    for (let guard = 0; guard < 10; guard++) {
      let hit = null;
      for (const p of placed) {
        if (Math.abs(p.x - it.x) < (p.w + it.l.w) / 2 + 8 && Math.abs(p.cy - cy) < 21) {
          hit = p;
          break;
        }
      }
      if (!hit) break;
      cy = hit.cy + 22;
    }
    placed.push({ x: it.x, cy, w: it.l.w });
    it.l.inner.style.transform = `translateY(${(cy - it.y).toFixed(1)}px)`;
  }
}

/* ------------------------------------------------------------
 * 8.5 飞行控制层：指令 → 状态机 → 动效 → 遥测
 * 说明：这一层是"可视化 + 状态机"的仿真，不是真机飞控。
 *      真机接入见 android/DroneCommandBridge.kt 与 README。
 * ---------------------------------------------------------- */
const ALT_VIS = 0.16;        // 1 m 高度对应的场景位移（示意比例，非真实比例）
const TAKEOFF_ALT = 5.0;     // 演示起飞高度 m
const CLIMB_RATE = 2.0;      // 爬升速率 m/s
const DESCEND_RATE = 1.5;    // 下降速率 m/s
const RTH_ALT = 6.0;         // 返航高度 m

const FLIGHT = {
  mode: 'OFF',   // OFF 未上电 / BOOT 自检 / READY 地面待机 / SPINUP 起桨 / CLIMB 爬升 / HOVER 悬停 / DESCEND 降落 / RTH 返航 / CUT 停桨
  power: false,
  rpm: 0,
  rpmTarget: 0,
  spinAngle: 0,
  alt: 0,
  altCmd: 0,
  vSpeed: 0,
  lift: 0,
  pos: new THREE.Vector2(0, 0),   // 相对起降点的水平位移（场景单位）
  vel: new THREE.Vector2(0, 0),
  tiltX: 0,
  tiltZ: 0,
  battery: 86,
  flightTime: 0,
  phaseT: 0,
  gps: 18,
  rssi: -62,
  rthStage: 0,
  warnedLow: false
};

const MODE_TEXT = {
  OFF: ['未上电', 'off'],
  BOOT: ['系统自检', 'boot'],
  READY: ['地面待机', 'ready'],
  SPINUP: ['电机起转', 'busy'],
  CLIMB: ['爬升中', 'air'],
  HOVER: ['定点悬停', 'air'],
  DESCEND: ['下降着陆', 'air'],
  RTH: ['自动返航', 'air'],
  CUT: ['停桨坠落', 'danger']
};

const isAirborne = () =>
  FLIGHT.alt > 0.05 || ['CLIMB', 'HOVER', 'DESCEND', 'RTH', 'CUT'].includes(FLIGHT.mode);

/* --- 地面投影标记（起飞后才显现） --- */
function makeMarkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const cx = 128;
  const grd = g.createRadialGradient(cx, cx, 44, cx, cx, 124);
  grd.addColorStop(0, 'rgba(47,212,255,0)');
  grd.addColorStop(0.70, 'rgba(47,212,255,0.06)');
  grd.addColorStop(0.88, 'rgba(47,212,255,0.42)');
  grd.addColorStop(1, 'rgba(47,212,255,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(cx, cx, 124, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = 'rgba(110,228,255,0.85)';
  g.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.beginPath();
    g.arc(cx, cx, 108, a - 0.2, a + 0.2);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const groundMark = new THREE.Mesh(
  new THREE.PlaneGeometry(2.9, 2.9),
  new THREE.MeshBasicMaterial({
    map: makeMarkTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
groundMark.rotation.x = -Math.PI / 2;
groundMark.position.y = -1.135;
scene.add(groundMark);

// 起桨后从机身往下打的补光，让地面跟着亮起来
const flightLight = new THREE.PointLight(0x2fd4ff, 0, 7, 2);
flightLight.position.set(0, 0.1, 0);
scene.add(flightLight);

/* --- 指令台 UI --- */
const cmdButtons = new Map();
document.querySelectorAll('#cmds .cmd').forEach((b) => cmdButtons.set(b.dataset.cmd, b));

function setCmdEnabled(cmd, on) {
  const b = cmdButtons.get(cmd);
  if (!b) return;
  b.disabled = !on;
  b.classList.toggle('is-off', !on);
}

function pushLog(msg, kind = 'info') {
  const box = el('log');
  if (!box) return;
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const li = document.createElement('div');
  li.className = `log-line ${kind}`;
  li.innerHTML = `<i>${hh}:${mm}:${ss}</i><span>${msg}</span>`;
  box.appendChild(li);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function publicState() {
  return {
    mode: FLIGHT.mode,
    powered: FLIGHT.power,
    altitude: +FLIGHT.alt.toFixed(2),
    battery: Math.round(FLIGHT.battery),
    speed: +Math.hypot(FLIGHT.vel.x, FLIGHT.vel.y).toFixed(2),
    flightTime: Math.round(FLIGHT.flightTime)
  };
}

function emitBridge(cmd, res) {
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.onFlightEvent === 'function') {
      window.AndroidBridge.onFlightEvent(cmd, FLIGHT.mode, JSON.stringify(publicState()));
    }
  } catch (e) { /* 浏览器环境忽略 */ }
}

/* --- 指令实现 --- */
function doCommand(cmd) {
  if (!state.flight) return { ok: false, reason: '控制台未接管' };

  switch (cmd) {
    case 'power': {
      if (isAirborne()) return { ok: false, reason: '空中禁止关机 · 请先降落' };
      if (FLIGHT.mode === 'BOOT') return { ok: false, reason: '系统自检中，请稍候' };
      if (!FLIGHT.power) {
        if (FLIGHT.battery <= 5) return { ok: false, reason: '电量低于 5% · 无法开机' };
        FLIGHT.power = true;
        FLIGHT.mode = 'BOOT';
        FLIGHT.phaseT = 0;
        return { ok: true, msg: '开机 · 电调 / IMU / 指南针自检' };
      }
      FLIGHT.power = false;
      FLIGHT.mode = 'OFF';
      FLIGHT.alt = 0;
      FLIGHT.altCmd = 0;
      FLIGHT.rpmTarget = 0;
      FLIGHT.flightTime = 0;
      return { ok: true, msg: '关机 · 电源已切断' };
    }

    case 'takeoff': {
      if (FLIGHT.mode !== 'READY') return { ok: false, reason: FLIGHT.power ? '当前状态不可起飞' : '请先开机' };
      if (FLIGHT.battery <= 12) return { ok: false, reason: '电量不足 12% · 禁止起飞' };
      FLIGHT.mode = 'SPINUP';
      FLIGHT.phaseT = 0;
      FLIGHT.altCmd = 0;
      return { ok: true, msg: '解锁电机 · 螺旋桨起转' };
    }

    case 'land': {
      if (!isAirborne()) return { ok: false, reason: '当前已在地面' };
      if (FLIGHT.mode === 'CUT') return { ok: false, reason: '已停桨 · 无法接管' };
      if (FLIGHT.mode === 'DESCEND') return { ok: true, msg: '已在下降着陆中' };
      FLIGHT.mode = 'DESCEND';
      FLIGHT.altCmd = 0;
      FLIGHT.rthStage = 0;
      FLIGHT.phaseT = 0;
      return { ok: true, msg: '降落 · 垂直下降' };
    }

    case 'rth': {
      if (!isAirborne()) return { ok: false, reason: '当前已在地面' };
      if (FLIGHT.mode === 'CUT') return { ok: false, reason: '已停桨 · 无法返航' };
      if (FLIGHT.mode === 'RTH') return { ok: true, msg: '已在返航途中' };
      FLIGHT.mode = 'RTH';
      FLIGHT.rthStage = 0;
      FLIGHT.phaseT = 0;
      return { ok: true, msg: `返航 · 爬升至 ${RTH_ALT.toFixed(1)} m 后返回起降点` };
    }

    case 'hold': {
      if (!isAirborne()) return { ok: false, reason: '当前已在地面' };
      if (FLIGHT.mode === 'CUT') return { ok: false, reason: '已停桨' };
      if (FLIGHT.mode === 'HOVER') return { ok: true, msg: '当前已处于定点悬停' };
      FLIGHT.mode = 'HOVER';
      FLIGHT.altCmd = FLIGHT.alt;
      FLIGHT.vel.set(0, 0);
      FLIGHT.rthStage = 0;
      FLIGHT.phaseT = 0;
      return { ok: true, msg: '悬停 · 保持当前高度与位置' };
    }

    case 'estop': {
      if (!isAirborne()) return { ok: false, reason: '当前已在地面' };
      if (FLIGHT.mode === 'CUT') return { ok: false, reason: '已停桨' };
      FLIGHT.mode = 'CUT';
      FLIGHT.rpmTarget = 0;
      FLIGHT.vSpeed = 0;
      FLIGHT.phaseT = 0;
      return { ok: true, msg: '紧急停桨 · 电机断电（演示）', kind: 'warn' };
    }

    default:
      return { ok: false, reason: '未知指令' };
  }
}

let pendingCmd = null;   // 等待真机回执的指令（用于失败回滚）

function execCommand(cmd) {
  const before = {
    mode: FLIGHT.mode,
    alt: FLIGHT.alt,
    altCmd: FLIGHT.altCmd,
    power: FLIGHT.power,
    battery: FLIGHT.battery
  };
  const res = doCommand(cmd);
  if (res.ok) {
    pushLog(res.msg, res.kind || 'ok');
    pendingCmd = { cmd, before, at: performance.now() };
  } else {
    pushLog(res.reason, 'warn');
  }
  emitBridge(cmd, res);
  renderTelemetry();
  return res;
}

/* --- 遥测面板 --- */
function renderTelemetry() {
  if (!el('deckMode')) return;
  const [label, cls] = MODE_TEXT[FLIGHT.mode];
  el('deckMode').textContent = label;
  el('deckDot').className = `deck-dot ${cls}`;

  el('tAlt').textContent = FLIGHT.alt.toFixed(1);
  el('tSpd').textContent = (Math.hypot(FLIGHT.vel.x, FLIGHT.vel.y) * 1.4).toFixed(1);
  el('tBat').textContent = String(Math.round(FLIGHT.battery));
  el('tBat').classList.toggle('low', FLIGHT.battery <= 20);

  const s = Math.floor(FLIGHT.flightTime);
  el('tTime').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  el('tGps').textContent = FLIGHT.power ? String(FLIGHT.gps) : '0';
  el('tRssi').textContent = FLIGHT.power
    ? `−${Math.abs(Math.round(FLIGHT.rssi + Math.sin(elapsed * 0.7) * 3))}`
    : '—';

  const air = isAirborne();
  setCmdEnabled('power', !air && FLIGHT.mode !== 'BOOT');
  setCmdEnabled('takeoff', FLIGHT.mode === 'READY' && FLIGHT.battery > 12);
  setCmdEnabled('land', air && FLIGHT.mode !== 'CUT' && FLIGHT.mode !== 'DESCEND');
  setCmdEnabled('rth', air && FLIGHT.mode !== 'CUT' && FLIGHT.mode !== 'RTH');
  setCmdEnabled('hold', air && FLIGHT.mode !== 'CUT');
  setCmdEnabled('estop', air && FLIGHT.mode !== 'CUT' && FLIGHT.mode !== 'DESCEND');

  const txt = el('cmdPowerTxt');
  if (txt) txt.textContent = FLIGHT.power ? '关机' : '开机';

  if (state.flight && statusText) statusText.textContent = `飞行控制 · ${label}`;
}

/* --- 电量灯 --- */
function restoreLeds() {
  batteryLeds.forEach((m) => {
    m.color.copy(m.userData.baseColor);
    if (m.userData.baseEmissive) m.emissive.copy(m.userData.baseEmissive);
    m.emissiveIntensity = m.userData.baseEmissiveIntensity;
  });
}

function updateLeds() {
  if (!state.flight) return;   // 拆解模式下保持电池灯原样
  const lit = FLIGHT.power && FLIGHT.mode !== 'CUT' ? Math.max(1, Math.ceil(FLIGHT.battery / 25)) : 0;
  const low = FLIGHT.battery <= 20;

  batteryLeds.forEach((m, i) => {
    let on = i < lit;
    // 自检阶段逐颗点亮
    if (FLIGHT.mode === 'BOOT') on = Math.floor(FLIGHT.phaseT * 7) % 6 > i;
    m.color.setHex(on ? (low ? 0xffb545 : 0x9dffc4) : 0x18211d);
    m.emissive.setHex(on ? (low ? 0xff8a1e : 0x35ff8a) : 0x0a1410);
    m.emissiveIntensity = on ? (FLIGHT.mode === 'BOOT' ? 2.8 : 1.9) : 0.06;
  });
}

/* --- 每帧推进 --- */
let fitAcc = 0;
let tlmAcc = 0;

function updateFlight(dt) {
  FLIGHT.phaseT += dt;

  /* 状态机 */
  switch (FLIGHT.mode) {
    case 'BOOT':
      if (FLIGHT.phaseT > 1.15) {
        FLIGHT.mode = 'READY';
        FLIGHT.phaseT = 0;
        pushLog('自检完成 · 飞控就绪', 'ok');
      }
      break;

    case 'SPINUP':
      FLIGHT.rpmTarget = 0.55;
      if (FLIGHT.phaseT > 1.05) {
        FLIGHT.mode = 'CLIMB';
        FLIGHT.altCmd = TAKEOFF_ALT;
        FLIGHT.rpmTarget = 1;
        FLIGHT.phaseT = 0;
        pushLog(`起飞 · 目标高度 ${TAKEOFF_ALT.toFixed(1)} m`, 'ok');
      }
      break;

    case 'CLIMB':
      FLIGHT.rpmTarget = 1;
      if (FLIGHT.alt >= FLIGHT.altCmd - 0.03) {
        FLIGHT.alt = FLIGHT.altCmd;
        FLIGHT.mode = 'HOVER';
        pushLog('到达目标高度 · 定点悬停', 'ok');
      }
      break;

    case 'DESCEND':
      FLIGHT.rpmTarget = 0.72;
      if (FLIGHT.alt <= 0.03) {
        FLIGHT.alt = 0;
        FLIGHT.altCmd = 0;
        FLIGHT.mode = 'READY';
        FLIGHT.rpmTarget = 0;
        FLIGHT.vel.set(0, 0);
        FLIGHT.rthStage = 0;
        pushLog('已着陆 · 电机停转', 'ok');
      }
      break;

    case 'RTH':
      FLIGHT.rpmTarget = 1;
      if (FLIGHT.rthStage === 0) {
        FLIGHT.altCmd = Math.max(RTH_ALT, FLIGHT.alt);
        if (FLIGHT.alt >= FLIGHT.altCmd - 0.03) {
          FLIGHT.rthStage = 1;
          pushLog('到达返航高度 · 水平返回起降点', 'info');
        }
      } else if (FLIGHT.rthStage === 1) {
        if (Math.hypot(FLIGHT.pos.x, FLIGHT.pos.y) < 0.05) {
          FLIGHT.pos.set(0, 0);
          FLIGHT.vel.set(0, 0);
          FLIGHT.rthStage = 2;
          FLIGHT.mode = 'DESCEND';
          FLIGHT.altCmd = 0;
          pushLog('已回到起降点上空 · 自动降落', 'info');
        }
      }
      break;

    case 'CUT':
      FLIGHT.rpmTarget = 0;
      break;
  }

  /* 高度：正常限速升降 / 停桨自由落体 */
  if (FLIGHT.mode === 'CUT') {
    FLIGHT.vSpeed -= 14 * dt;
    FLIGHT.alt = Math.max(0, FLIGHT.alt + FLIGHT.vSpeed * dt);
    if (FLIGHT.alt <= 0) {
      FLIGHT.alt = 0;
      FLIGHT.altCmd = 0;
      FLIGHT.mode = 'OFF';
      FLIGHT.power = false;
      FLIGHT.rpmTarget = 0;
      FLIGHT.vSpeed = 0;
      FLIGHT.flightTime = 0;
      pushLog('已坠地 · 机体断电（演示）', 'err');
    }
  } else if (FLIGHT.mode !== 'OFF') {
    const d = FLIGHT.altCmd - FLIGHT.alt;
    const rate = d >= 0 ? CLIMB_RATE : DESCEND_RATE;
    const step = Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    FLIGHT.alt += step;
    FLIGHT.vSpeed = dt > 0 ? step / dt : 0;
  }

  /* 水平：返航段主动回原点，其余缓慢收敛 */
  if (FLIGHT.mode === 'RTH' && FLIGHT.rthStage === 1) {
    const dx = -FLIGHT.pos.x;
    const dz = -FLIGHT.pos.y;
    const dist = Math.hypot(dx, dz) || 1;
    const spd = Math.min(1.3, 0.4 + dist * 1.1);
    FLIGHT.vel.set((dx / dist) * spd, (dz / dist) * spd);
    FLIGHT.pos.x += FLIGHT.vel.x * dt;
    FLIGHT.pos.y += FLIGHT.vel.y * dt;
  } else {
    FLIGHT.vel.multiplyScalar(Math.exp(-6 * dt));
  }

  /* 高度 → 场景位移 + 悬停微浮动 */
  const bob = FLIGHT.mode === 'HOVER' || FLIGHT.mode === 'RTH' ? Math.sin(elapsed * 2.3) * 0.01 : 0;
  FLIGHT.lift = FLIGHT.alt * ALT_VIS + bob;

  /* 姿态：跟着水平速度轻微倾斜 */
  const tiltZ = THREE.MathUtils.clamp(-FLIGHT.vel.x * 0.15, -0.16, 0.16);
  const tiltX = THREE.MathUtils.clamp(FLIGHT.vel.y * 0.15, -0.16, 0.16);
  FLIGHT.tiltZ += (tiltZ - FLIGHT.tiltZ) * (1 - Math.exp(-4 * dt));
  FLIGHT.tiltX += (tiltX - FLIGHT.tiltX) * (1 - Math.exp(-4 * dt));

  /* 转速与桨叶 */
  FLIGHT.rpm += (FLIGHT.rpmTarget - FLIGHT.rpm) * (1 - Math.exp(-4.5 * dt));
  FLIGHT.spinAngle += FLIGHT.rpm * 74 * dt;
  for (const g of propGroups) {
    const dir = g.userData.dir;
    for (const h of g.userData.blades) h.rotation.y = h.userData.base + FLIGHT.spinAngle * dir;
    const disc = g.userData.disc;
    const op = FLIGHT.rpm * 0.13;
    disc.visible = op > 0.004;
    disc.material.opacity = op;
    disc.rotation.z += dt * 0.7 * dir;
  }

  /* 地面投影 + 补光 */
  const liftN = THREE.MathUtils.clamp(FLIGHT.lift / 1.2, 0, 1);
  groundMark.position.set(FLIGHT.pos.x, -1.135, FLIGHT.pos.y);
  groundMark.material.opacity = FLIGHT.power ? 0.05 + 0.20 * liftN : 0;
  groundMark.scale.setScalar(0.70 + liftN * 0.34);
  groundMark.rotation.z += dt * 0.12;

  flightLight.position.set(FLIGHT.pos.x, 0.12 + FLIGHT.lift, FLIGHT.pos.y);
  flightLight.intensity = 0.8 + FLIGHT.rpm * 3.6;

  /* 电量与飞行时长 */
  if (FLIGHT.power) {
    const drain = isAirborne() ? 0.62 : 0.05;
    FLIGHT.battery = Math.max(0, FLIGHT.battery - drain * dt);
    if (isAirborne()) FLIGHT.flightTime += dt;
    if (!FLIGHT.warnedLow && FLIGHT.battery <= 20) {
      FLIGHT.warnedLow = true;
      pushLog('低电量 20% · 建议尽快返航', 'warn');
    }
    if (FLIGHT.battery <= 0.5 && isAirborne() && FLIGHT.mode !== 'CUT') {
      FLIGHT.mode = 'DESCEND';
      FLIGHT.altCmd = 0;
      pushLog('电量耗尽 · 强制降落', 'err');
    }
  }

  updateLeds();
  updateGroundView(dt);

  /* 遥测刷新 10Hz */
  tlmAcc += dt;
  if (tlmAcc >= 0.1) {
    tlmAcc = 0;
    if (state.flight) renderTelemetry();
  }
}

/* 飞行时相机跟随高度，并定期重算取景，避免飞出画面 */
function updateGroundView(dt) {
  if (!state.flight) return;
  const ty = viewBaseY() + FLIGHT.lift * 0.85;
  controls.target.y += (ty - controls.target.y) * (1 - Math.exp(-2.5 * dt));
  fitAcc += dt;
  if (fitAcc > 0.28) {
    fitAcc = 0;
    updateFit(state.exploded);
  }
}

/* --- 模式切换 --- */
function resetFlight() {
  FLIGHT.mode = 'OFF';
  FLIGHT.power = false;
  FLIGHT.rpm = 0;
  FLIGHT.rpmTarget = 0;
  FLIGHT.spinAngle = 0;
  FLIGHT.alt = 0;
  FLIGHT.altCmd = 0;
  FLIGHT.vSpeed = 0;
  FLIGHT.lift = 0;
  FLIGHT.pos.set(0, 0);
  FLIGHT.vel.set(0, 0);
  FLIGHT.flightTime = 0;
  FLIGHT.phaseT = 0;
  FLIGHT.rthStage = 0;
  FLIGHT.tiltX = 0;
  FLIGHT.tiltZ = 0;
  FLIGHT.warnedLow = false;
  if (FLIGHT.battery < 10) FLIGHT.battery = 86;
  drone.rotation.set(0, 0, 0);
}

function setFlightMode(on) {
  if (on === state.flight) return true;

  if (on) {
    // 拆解状态收起，避免"零件散了还起飞"
    state.exploded.clear();
    clearSelection();
    syncToggleButtons();
    setStatus();

    state.showLabels = false;
    el('btnLabels').classList.remove('on');
    state.spin = false;
    controls.autoRotate = false;
    el('btnSpin').classList.remove('on');

    resetFlight();
    state.flight = true;
    document.body.classList.add('flight-mode');
    el('btnFlight').classList.add('on');
    el('deck').classList.add('on');
    el('deck').setAttribute('aria-hidden', 'false');
    el('log').innerHTML = '';

    pushLog('控制台已接管 · 等待「开机」指令', 'info');
    renderTelemetry();
    updateFit(state.exploded);
    return true;
  }

  if (isAirborne()) {
    pushLog('空中无法退出控制台 · 请先降落', 'warn');
    return false;
  }

  resetFlight();
  state.flight = false;
  document.body.classList.remove('flight-mode');
  el('btnFlight').classList.remove('on');
  el('deck').classList.remove('on');
  el('deck').setAttribute('aria-hidden', 'true');

  restoreLeds();
  state.showLabels = true;
  el('btnLabels').classList.add('on');
  state.spin = true;
  controls.autoRotate = true;
  el('btnSpin').classList.add('on');

  applyViewportBias();
  updateFit(state.exploded);
  renderInfo(null);
  setStatus();
  return true;
}

/* --- 指令台事件绑定 --- */
cmdButtons.forEach((btn, cmd) => {
  btn.addEventListener('click', () => {
    execCommand(cmd);
    btn.blur();
  });
});

el('btnFlight').addEventListener('click', () => setFlightMode(!state.flight));
el('btnDeckClose').addEventListener('click', () => setFlightMode(false));

/* --- 对外指令接口（供 Kotlin / iframe / 外部指令源调用） --- */
window.DroneCmd = {
  exec: (cmd) => execCommand(String(cmd || '').toLowerCase()),
  state: () => publicState(),
  enter: (on) => setFlightMode(on !== false),
  isMounted: () => state.flight
};

/* 真机回执：失败时回滚本地状态，避免"UI 说起飞了、飞机没动" */
window.DroneNative = {
  onResult(cmd, ok, msg) {
    if (ok) {
      pendingCmd = null;
      if (msg) pushLog(`真机回执 · ${msg}`, 'ok');
      return;
    }
    pushLog(`真机拒绝 · ${msg || cmd}`, 'err');
    if (pendingCmd && pendingCmd.cmd === cmd && performance.now() - pendingCmd.at < 8000) {
      const b = pendingCmd.before;
      FLIGHT.mode = b.mode;
      FLIGHT.alt = b.alt;
      FLIGHT.altCmd = b.altCmd;
      FLIGHT.power = b.power;
      FLIGHT.battery = b.battery;
      pendingCmd = null;
      renderTelemetry();
    }
  }
};

/* ------------------------------------------------------------
 * 9. 动画循环
 * ---------------------------------------------------------- */
const clock = new THREE.Clock();
let elapsed = 0;
const tmpTarget = new THREE.Vector3();

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // 入场镜头
  if (state.intro < 1) {
    state.intro = Math.min(1, state.intro + dt / 1.7);
    const t = easeOutCubic(state.intro);
    camera.position.lerpVectors(CAM_START, CAM_END, t);
  }

  // 拆解进度（逐部件指数缓动）
  let anyExploded = false;
  let maxP = 0;
  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    const want = state.exploded.has(inst.id) ? 1 : 0;
    const k = 1 - Math.exp(-8.0 * dt);
    inst.p += (want - inst.p) * k;
    const p = easeOutCubic(inst.p);
    inst.group.position.set(inst.dir.x * p, inst.dir.y * p, inst.dir.z * p);
    if (inst.p > maxP) maxP = inst.p;

    if (inst.label) {
      const show =
        state.showLabels &&
        (state.exploded.has(inst.id) || state.selected === inst.id || state.hovered === inst.id);
      inst.label.div.classList.toggle('on', show);
    }
  }

  // 飞行控制推进（转速 / 高度 / 姿态 / 遥测）
  updateFlight(dt);

  // 拆解时整体下沉 + 飞行时抬升，并保持构图居中不裁切
  drone.position.x = FLIGHT.pos.x;
  drone.position.z = FLIGHT.pos.y;
  drone.position.y = 0.52 - 0.26 * maxP + FLIGHT.lift;
  drone.rotation.x += (FLIGHT.tiltX - drone.rotation.x) * (1 - Math.exp(-6 * dt));
  drone.rotation.z += (FLIGHT.tiltZ - drone.rotation.z) * (1 - Math.exp(-6 * dt));
  camera.zoom += (state.fitTarget - camera.zoom) * (1 - Math.exp(-3.4 * dt));
  camera.updateProjectionMatrix();

  // 选中部件的边缘辉光呼吸
  const pulse = 0.085 + Math.sin(elapsed * 2.4) * 0.025;
  for (const inst of instances) {
    if (inst.id !== state.selected) continue;
    for (const m of inst.mats) {
      if (m.userData.isGlowable) m.emissiveIntensity = pulse;
    }
  }

  // 环境动效
  stars.rotation.y = elapsed * 0.012;
  floorMat.uniforms.uTime.value = elapsed;
  p1.intensity = 24 + Math.sin(elapsed * 0.9) * 4;
  p2.intensity = 14 + Math.cos(elapsed * 1.3) * 3;

  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
  layoutLabels();
}

/* 竖屏时下移观察点，让模型整体上移，避开底部面板 */
function viewBaseY() {
  return window.innerWidth / window.innerHeight < 0.95 ? -0.45 : 0.2;
}
function applyViewportBias() {
  controls.target.set(0, viewBaseY(), 0);
}
applyViewportBias();

/* 组件初始化完成 */
updateFit(state.exploded);
document.body.style.cursor = 'default';
renderInfo(null);
setStatus();

/* 调试/演示参数：?nointro=1&explode=1&sel=gimbal&cam=2,1.5,3.5 */
if (QS.has('nointro')) {
  const ld = el('loader');
  if (ld) { ld.classList.add('done'); ld.style.display = 'none'; }
  state.intro = 1;
  state.spin = false;
  controls.autoRotate = false;
  el('btnSpin').classList.remove('on');
}
if (QS.has('explode')) {
  ORDER.forEach((id) => state.exploded.add(id));
  syncToggleButtons();
  setStatus();
}
if (QS.has('sel') && PARTS[QS.get('sel')]) selectPart(QS.get('sel'), QS.has('explode'));

/* 演示参数：?fly=1 进入控制台，&cmd=power,takeoff 按序执行指令 */
if (QS.has('fly')) {
  setFlightMode(true);
  const c = QS.get('cmd');
  if (c) {
    c.split(',').forEach((cmd, i) => {
      setTimeout(() => execCommand(cmd.trim()), 150 + i * 2200);
    });
  }
}

/* 演示预设：?scenario=air 直接快进到指定飞行状态（用于截图/演示，不影响交互） */
if (QS.has('scenario')) {
  const step = 1 / 60;
  const run = (sec) => {
    for (let i = 0; i < Math.round(sec / step); i++) {
      elapsed += step;
      updateFlight(step);
    }
  };
  const sc = QS.get('scenario');
  setFlightMode(true);
  execCommand('power');
  run(2);
  if (sc !== 'ready') {
    execCommand('takeoff');
    run(9);
  }
  if (sc === 'rth') {
    execCommand('rth');
    run(3.5);
  }
  if (sc === 'cut') {
    execCommand('estop');
    run(0.7);
  }
  camera.zoom = state.fitTarget;
  camera.updateProjectionMatrix();
  drone.position.set(FLIGHT.pos.x, 0.52 + FLIGHT.lift, FLIGHT.pos.y);
}

/* 供 WebView / iframe 调用的全局接口 */
window.__selectPart = (id) => {
  if (PARTS[id]) selectPart(id, true);
};
window.__explodeAll = () => el('btnExplode').click();
window.__deselect = () => {
  if (state.flight) return setFlightMode(false); // 空中会拒绝退出
  const had = state.selected !== null;
  clearSelection();
  return had;
};

animate();

setTimeout(() => {
  const loader = el('loader');
  if (loader) loader.classList.add('done');
}, 420);
