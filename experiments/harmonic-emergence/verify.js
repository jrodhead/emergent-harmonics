// Headless replica of field-processor.js, used to check that the field actually
// does what the design claims: a phase transition, hysteresis, a losable state,
// and exact integer ratios once locked.
//
//   node verify.js
//
// Runs at a reduced sample rate -- the dynamics are slow compared to audio, and
// the results are rate-independent.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const field = JSON.parse(readFileSync(join(here, 'field.json'), 'utf8'));
const n = field.partials.map(p => p.n);
const N = n.length, f0 = field.f0, sr = 12000, dt = 1 / sr;
const R0 = 1 / Math.sqrt(N);
const excess = r => { const e = (r - R0) / (1 - R0); return e > 0 ? e * e : 0; };

function run({ K, G, T, D, seconds, theta, delta }) {
  theta = theta || n.map(ni => Math.random() * 2 * Math.PI * ni);
  delta = delta || n.map(() => (Math.random() * 2 - 1) * D);
  const steps = Math.floor(seconds * sr);
  let acc = 0, cnt = 0;
  for (let s = 0; s < steps; s++) {
    let sx = 0, sy = 0;
    for (let i = 0; i < N; i++) { const p = theta[i] / n[i]; sx += Math.cos(p); sy += Math.sin(p); }
    sx /= N; sy /= N;
    const r = Math.hypot(sx, sy), psi = Math.atan2(sy, sx);
    const Keff = K + G * excess(r), ns = Math.sqrt(2 * T * dt);
    for (let i = 0; i < N; i++) {
      const phi = theta[i] / n[i];
      const dphi = 2 * Math.PI * f0 * (1 + delta[i]) - Keff * r * Math.sin(phi - psi);
      let th = theta[i] + n[i] * (dphi * dt + ns * (Math.random() * 2 - 1) * 1.732);
      th %= 2 * Math.PI * n[i]; if (th < 0) th += 2 * Math.PI * n[i];
      theta[i] = th;
    }
    if (s > steps * 0.5) { acc += r; cnt++; }
  }
  return { r: acc / cnt, theta, delta };
}
const scramble = th => th.map((t, i) => (t + Math.random() * 2 * Math.PI * n[i]) % (2 * Math.PI * n[i]));

const { G, T, D } = field.params;
console.log(`N=${N} partials, f0=${f0} Hz, incoherent floor 1/sqrt(N) = ${R0.toFixed(3)}`);
console.log(`defaults: G=${G} T=${T} D=${D}\n`);

console.log('1. hysteresis — the same K gives two different states depending on history');
{
  const delta = n.map(() => (Math.random() * 2 - 1) * D);
  const Ks = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4];
  let st = { theta: null };
  const up = [], down = [];
  for (const K of Ks) { st = run({ K, G, T, D, seconds: 8, theta: st.theta, delta }); up.push([K, st.r]); }
  for (const K of [...Ks].reverse()) { st = run({ K, G, T, D, seconds: 8, theta: st.theta, delta }); down.push([K, st.r]); }
  console.log('   rising  ', up.map(([k, r]) => `${k.toFixed(1)}:${r.toFixed(2)}`).join(' '));
  console.log('   falling ', down.map(([k, r]) => `${k.toFixed(1)}:${r.toFixed(2)}`).join(' '));
}

console.log('\n2. the locked state can be destroyed — and below the critical K it stays destroyed');
for (const K of [0, 0.6, 1.2, 2.0]) {
  let s = run({ K: 2.4, G, T, D, seconds: 10 });
  s = run({ K, G, T, D, seconds: 8, theta: s.theta, delta: s.delta });
  const before = s.r;
  const after = run({ K, G, T, D, seconds: 12, theta: scramble(s.theta), delta: s.delta });
  console.log(`   K=${K.toFixed(1)}  r ${before.toFixed(2)} -> scramble -> ${after.r.toFixed(2)}  ${after.r > 0.75 ? 'healed' : 'stayed broken'}`);
}

console.log('\n3. temperature melts coherence (K=0.6, inside the bistable region)');
{
  let st = run({ K: 2.4, G, T: 0.03, D, seconds: 10 });
  for (const t of [0.03, 0.1, 0.2, 0.35]) {
    st = run({ K: 0.6, G, T: t, D, seconds: 10, theta: st.theta, delta: st.delta });
    console.log(`   T=${t.toFixed(2)}  r=${st.r.toFixed(3)}  ${st.r < 0.4 ? 'melted' : st.r < 0.75 ? 'degrading' : 'holding'}`);
  }
}

console.log('\n4. once locked, are the ratios exactly integer?');
{
  const st = run({ K: 2.4, G, T, D, seconds: 12 });
  const before = st.theta.map((t, i) => t / n[i]);
  const st2 = run({ K: 2.4, G, T, D, seconds: 2, theta: st.theta, delta: st.delta });
  const after = st2.theta.map((t, i) => t / n[i]);
  let worst = 0;
  for (let i = 0; i < N; i++) {
    let d = after[i] - before[i];
    d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const driftHz = d / (2 * Math.PI * 2);
    worst = Math.max(worst, Math.abs(1200 * Math.log2((f0 + driftHz) / f0)));
  }
  console.log(`   r=${st2.r.toFixed(3)}, worst spread of implied fundamentals over 2 s: ${worst.toFixed(2)} cents`);
}
