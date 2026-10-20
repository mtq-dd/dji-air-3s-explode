/* ============================================================
 * 程序化音效引擎
 * ------------------------------------------------------------
 * 全部用 Web Audio 合成，不加载任何音频文件——
 * 单文件页面（含 file:// 双击打开、WebView assets 内嵌）一样能出声。
 *
 * 声音构成：
 *   1. 电机 / 桨叶  锯齿波 + 带通噪声，基频与转速绑定（rpm 越高越尖）
 *   2. 桨叶拍打     低频 LFO 调幅，制造"嗡嗡"的拍频感
 *   3. 风噪         白噪声 + 低通，跟垂直速度绑定
 *   4. 提示音       开机自检 / 就绪 / 返航 / 低电量 / 触地 / UI 点击
 *
 * 自动播放策略：AudioContext 必须在用户手势后创建/恢复，
 * 因此对外暴露 unlock()，由页面在首次 pointerdown / keydown 时调用。
 * ============================================================ */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* 确定性伪随机白噪声（避免每帧 Math.random 抖动） */
function makeNoise(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 20260120;
  for (let i = 0; i < len; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return buf;
}

export function createAudio() {
  const A = {
    ctx: null,
    on: true,
    ready: false,
    lastWarn: 0
  };

  /* ---------- 图搭建 ---------- */
  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    comp.connect(master);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.connect(comp);

    const bus = panner || comp;   // 一次性音效的落点

    /* --- 电机总线 --- */
    const rotorGain = ctx.createGain();
    rotorGain.gain.value = 0;

    const rotorLP = ctx.createBiquadFilter();
    rotorLP.type = 'lowpass';
    rotorLP.frequency.value = 2400;
    rotorLP.Q.value = 0.4;
    rotorGain.connect(rotorLP);
    rotorLP.connect(bus);

    // 两个略微失谐的锯齿波，叠出无刷电机的"啸叫"
    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 90;
    const oscB = ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscB.frequency.value = 137;
    const oscAGain = ctx.createGain();
    oscAGain.gain.value = 0.34;
    const oscBGain = ctx.createGain();
    oscBGain.gain.value = 0.16;
    oscA.connect(oscAGain).connect(rotorGain);
    oscB.connect(oscBGain).connect(rotorGain);

    // 气动噪声：带通扫频
    const noiseBuf = makeNoise(ctx);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    const rotorBP = ctx.createBiquadFilter();
    rotorBP.type = 'bandpass';
    rotorBP.frequency.value = 700;
    rotorBP.Q.value = 0.9;
    const rotorNoiseGain = ctx.createGain();
    rotorNoiseGain.gain.value = 0;
    noiseSrc.connect(rotorBP).connect(rotorNoiseGain).connect(rotorGain);

    // 拍频：用 LFO 调制总音量，转速越快拍得越密
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0;
    lfo.connect(lfoGain).connect(rotorGain.gain);

    /* --- 风噪总线（与转速解耦，单独立一条） --- */
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    const windLP = ctx.createBiquadFilter();
    windLP.type = 'lowpass';
    windLP.frequency.value = 420;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windLP).connect(windGain).connect(bus);

    const t = ctx.currentTime;
    oscA.start(t);
    oscB.start(t);
    lfo.start(t);
    noiseSrc.start(t);
    windSrc.start(t);

    A.ctx = ctx;
    A.master = master;
    A.bus = bus;
    A.panner = panner;
    A.rotorGain = rotorGain;
    A.rotorLP = rotorLP;
    A.rotorBP = rotorBP;
    A.rotorNoiseGain = rotorNoiseGain;
    A.oscA = oscA;
    A.oscB = oscB;
    A.lfo = lfo;
    A.lfoGain = lfoGain;
    A.windGain = windGain;
    A.windLP = windLP;
    A.ready = true;

    applyVolume(0.55);
    return ctx;
  }

  function applyVolume(v) {
    if (!A.ctx) return;
    const target = A.on ? v : 0.0001;
    A.master.gain.setTargetAtTime(target, A.ctx.currentTime, 0.05);
  }

  /* ---------- 基础音型 ---------- */
  function tone({ freq = 880, to = null, dur = 0.12, type = 'sine', gain = 0.18, delay = 0 }) {
    if (!A.ctx) return;
    const ctx = A.ctx;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(24, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(A.bus);
    o.start(t0);
    o.stop(t0 + dur + 0.06);
  }

  function breath({ dur = 0.3, freq = 500, q = 0.9, gain = 0.16, delay = 0, type = 'bandpass' }) {
    if (!A.ctx) return;
    const ctx = A.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = A.noiseBuffer || (A.noiseBuffer = makeNoise(ctx, 1));
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(A.bus);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /* ---------- 对外：生命周期 ---------- */
  function unlock() {
    if (!A.ctx) build();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    if (A.ctx) applyVolume(0.55);
  }

  function setEnabled(on) {
    A.on = !!on;
    if (on) unlock();
    else if (A.ctx) applyVolume(0.55);
    if (!on && A.ctx) A.master.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.04);
    try { localStorage.setItem('air3s.sound', on ? '1' : '0'); } catch (e) { /* 隐私模式忽略 */ }
    return A.on;
  }

  /* ---------- 对外：一次性事件 ---------- */
  const fx = {
    /** 开机自检：三声上行 + 电调轻响 */
    powerOn() {
      if (!A.ctx) return;
      tone({ freq: 523, dur: 0.09, type: 'triangle', gain: 0.10 });
      tone({ freq: 659, dur: 0.09, type: 'triangle', gain: 0.10, delay: 0.12 });
      tone({ freq: 880, dur: 0.12, type: 'triangle', gain: 0.10, delay: 0.24 });
      breath({ dur: 0.18, freq: 1800, q: 2.4, gain: 0.05, delay: 0.02 });
    },

    /** 自检通过：两声短促确认音 */
    ready() {
      tone({ freq: 1046, dur: 0.06, type: 'sine', gain: 0.10, delay: 0.02 });
      tone({ freq: 1318, dur: 0.08, type: 'sine', gain: 0.09, delay: 0.10 });
    },

    /** 关机：下行两声 */
    powerOff() {
      tone({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.09 });
      tone({ freq: 349, dur: 0.14, type: 'triangle', gain: 0.08, delay: 0.11 });
      breath({ dur: 0.14, freq: 1400, q: 2.0, gain: 0.04, delay: 0.16 });
    },

    /** 解锁电机：上扬扫频 + 起桨风噪 */
    takeoff() {
      tone({ freq: 180, to: 620, dur: 0.85, type: 'sawtooth', gain: 0.07 });
      breath({ dur: 1.05, freq: 900, q: 0.8, gain: 0.10 });
      tone({ freq: 1174, dur: 0.07, type: 'sine', gain: 0.07, delay: 0.95 });
    },

    /** 开始降落：下行提示 */
    descend() {
      tone({ freq: 880, to: 440, dur: 0.32, type: 'triangle', gain: 0.09 });
    },

    /** 返航：两声等长提示 */
    rth() {
      tone({ freq: 880, dur: 0.10, type: 'square', gain: 0.06 });
      tone({ freq: 880, dur: 0.10, type: 'square', gain: 0.06, delay: 0.16 });
    },

    /** 悬停确认 */
    hold() {
      tone({ freq: 988, dur: 0.07, type: 'sine', gain: 0.07 });
    },

    /** 低电量：三连警告 */
    lowBattery() {
      [0, 0.16, 0.32].forEach((d) =>
        tone({ freq: 1318, dur: 0.07, type: 'square', gain: 0.07, delay: d })
      );
    },

    /** 触地：低频闷响 + 沙沙声 */
    thud(strength = 1) {
      tone({ freq: 96, to: 38, dur: 0.30, type: 'sine', gain: 0.24 * strength });
      breath({ dur: 0.22, freq: 260, q: 0.7, gain: 0.12 * strength, type: 'lowpass' });
    },

    /** 停桨坠落触地：更重，带金属撞击 */
    crash() {
      tone({ freq: 120, to: 30, dur: 0.5, type: 'sine', gain: 0.30 });
      breath({ dur: 0.4, freq: 900, q: 0.6, gain: 0.20 });
      tone({ freq: 2400, to: 900, dur: 0.18, type: 'square', gain: 0.05 });
    },

    /** 部件选中：清脆一声 */
    select() {
      tone({ freq: 1568, dur: 0.035, type: 'sine', gain: 0.05 });
    },

    /** 拆解：气动"咔哒"+ 短风 */
    explode() {
      breath({ dur: 0.2, freq: 1200, q: 1.6, gain: 0.07 });
      tone({ freq: 320, to: 180, dur: 0.12, type: 'triangle', gain: 0.05 });
    },

    /** UI 点击 */
    click() {
      tone({ freq: 1320, dur: 0.025, type: 'sine', gain: 0.035 });
    },

    /** 指令被拒绝 */
    deny() {
      tone({ freq: 220, dur: 0.09, type: 'square', gain: 0.05 });
      tone({ freq: 180, dur: 0.12, type: 'square', gain: 0.04, delay: 0.10 });
    }
  };

  /* ---------- 对外：每帧更新 ---------- */
  function update(dt, s) {
    if (!A.ctx || !A.ready || !A.on) return;
    const now = A.ctx.currentTime;
    const rpm = clamp(s.rpm || 0, 0, 1.2);
    const vSpeed = Math.abs(s.vSpeed || 0);

    // 电机：音量、基频、噪声带通一起跟转速走
    A.rotorGain.gain.setTargetAtTime(rpm * 0.16, now, 0.06);
    A.oscA.frequency.setTargetAtTime(72 + rpm * 236, now, 0.05);
    A.oscB.frequency.setTargetAtTime(108 + rpm * 358, now, 0.05);
    A.rotorBP.frequency.setTargetAtTime(420 + rpm * 1500, now, 0.06);
    A.rotorNoiseGain.gain.setTargetAtTime(rpm * 0.5, now, 0.07);
    A.rotorLP.frequency.setTargetAtTime(1500 + rpm * 2600, now, 0.08);

    // 拍频：转速越高拍得越密，幅度随音量收缩
    A.lfo.frequency.setTargetAtTime(11 + rpm * 26, now, 0.1);
    A.lfoGain.gain.setTargetAtTime(rpm * 0.05, now, 0.1);

    // 风噪：跟着垂直速度
    A.windGain.gain.setTargetAtTime(clamp(vSpeed * 0.02, 0, 0.07), now, 0.1);
    A.windLP.frequency.setTargetAtTime(320 + vSpeed * 260, now, 0.1);

    // 声像：机身左右移动时略微偏
    if (A.panner) A.panner.pan.setTargetAtTime(clamp((s.pan || 0) * 0.45, -0.8, 0.8), now, 0.15);
  }

  function suspend() {
    if (A.ctx && A.ctx.state === 'running') A.ctx.suspend();
  }

  function resume() {
    if (A.ctx && A.ctx.state === 'suspended' && A.on) A.ctx.resume();
  }

  return {
    unlock,
    setEnabled,
    suspend,
    resume,
    isEnabled: () => A.on,
    // 调试用：确认音频图真的在跑（不依赖耳朵）
    debug: () => ({
      state: A.ctx ? A.ctx.state : 'none',
      vol: A.master ? +A.master.gain.value.toFixed(4) : 0,
      rotor: A.rotorGain ? +A.rotorGain.gain.value.toFixed(4) : 0,
      freq: A.oscA ? Math.round(A.oscA.frequency.value) : 0,
      wind: A.windGain ? +A.windGain.gain.value.toFixed(4) : 0
    }),
    update,
    ...fx,
    get ctx() { return A.ctx; }
  };
}
