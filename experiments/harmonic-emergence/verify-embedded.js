// Headless replica of embedded-processor.js. Checks the things the design claims
// about a hierarchical field: that segregation is organised rather than noisy, that
// embeddedness is a genuine threshold in the frequency-domain order parameter S (not
// just single-oscillator sync, which v2 already covers), that within-population
// order survives the transition, that it is a ONE-WAY door -- past threshold,
// dropping permeability back to zero does not undo it, only an explicit
// 'reindividuate' does -- and that above threshold the shared identity actually
// bends toward what the room is doing, more so the clearer the room is.
//
//   node verify-embedded.js

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, 'embedded.json'), 'utf8'));
const n = cfg.partials;
const NP = n.length;
const K3 = cfg.populations.length;
const f0home = cfg.populations.map(p => p.f0);
const sr = 4000, dt = 1 / sr;   // dynamics here are slow (seconds); this is plenty
const r0pop = 1 / Math.sqrt(NP);
const { K, G, T, D, G2, homeRate, scaleHz, envFloor } = cfg.params;
const excess = (x, x0) => { const e = (x - x0) / (1 - x0); return e > 0 ? e * e : 0; };

const meanHome = f0home.reduce((a, b) => a + b, 0) / K3;
const spreadHome = Math.sqrt(f0home.reduce((a, b) => a + (b - meanHome) ** 2, 0) / K3);

// same consensus formula the processor uses, exposed standalone so S0 can be
// measured from it directly instead of hand-derived (see embedded-processor.js's
// header note on why any mismatch there is a real bug, not a rounding error)
function consensusOf(f0eff, envFreq, wEnv) {
  const sum = f0eff.reduce((a, b) => a + b, 0) + wEnv * envFreq;
  const w = K3 + wEnv;
  const fBar = sum / w;
  let variance = f0eff.reduce((a, f) => a + (f - fBar) ** 2, 0) + wEnv * (envFreq - fBar) ** 2;
  variance /= w;
  return { fBar, S: 1 / (1 + Math.sqrt(variance) / scaleHz) };
}
const S0 = consensusOf(f0home, meanHome, envFloor).S;

function fresh() {
  const theta = f0home.map(() => n.map(ni => Math.random() * 2 * Math.PI * ni));
  const delta = f0home.map(() => n.map(() => (Math.random() * 2 - 1) * D));
  const f0eff = f0home.slice();
  return { theta, delta, f0eff };
}

// state carries {theta, delta, f0eff}; env is a fixed synthetic room {freq, clarity}
function run({ Theta, env, seconds, state }) {
  const { theta, delta, f0eff } = state ?? fresh();
  const steps = Math.floor(seconds * sr);
  const wEnv = Math.min(1, envFloor + (env?.clarity ?? 0));
  const envFreq = env?.freq ?? meanHome;   // an unheard room defaults to neutral, not an arbitrary pitch
  let accS = 0, accR = new Float64Array(K3), cnt = 0, lastS = S0;
  for (let s = 0; s < steps; s++) {
    const r = new Float64Array(K3), psi = new Float64Array(K3);
    for (let k = 0; k < K3; k++) {
      let sx = 0, sy = 0;
      for (let i = 0; i < NP; i++) { const p = theta[k][i] / n[i]; sx += Math.cos(p); sy += Math.sin(p); }
      sx /= NP; sy /= NP;
      r[k] = Math.hypot(sx, sy); psi[k] = Math.atan2(sy, sx);
    }
    const { fBar, S } = consensusOf(f0eff, envFreq, wEnv);
    lastS = S;
    const ThetaEff = Theta + G2 * excess(S, S0);

    for (let k = 0; k < K3; k++) f0eff[k] += dt * (homeRate * (f0home[k] - f0eff[k]) - ThetaEff * (f0eff[k] - fBar));

    const ns = Math.sqrt(2 * T * dt);
    for (let k = 0; k < K3; k++) {
      const Keff = K + G * excess(r[k], r0pop);
      const w0 = 2 * Math.PI * f0eff[k];
      for (let i = 0; i < NP; i++) {
        const phi = theta[k][i] / n[i];
        const dphi = w0 * (1 + delta[k][i]) - Keff * r[k] * Math.sin(phi - psi[k]);
        let th = theta[k][i] + n[i] * (dphi * dt + ns * (Math.random() * 2 - 1) * 1.732);
        th %= 2 * Math.PI * n[i]; if (th < 0) th += 2 * Math.PI * n[i];
        theta[k][i] = th;
      }
    }
    if (s > steps * 0.6) { accS += S; for (let k = 0; k < K3; k++) accR[k] += r[k]; cnt++; }
  }
  return { theta, delta, f0eff, S: accS / cnt, lastS, r: Array.from(accR, x => x / cnt) };
}

console.log(`3 populations x ${NP} partials, home f0 = ${f0home.map(f => f.toFixed(2)).join(', ')} Hz`);
console.log(`within-population floor 1/sqrt(${NP}) = ${r0pop.toFixed(3)}   home spread = ${spreadHome.toFixed(2)} Hz -> S0 = ${S0.toFixed(3)}`);
console.log(`defaults: K=${K} G=${G} T=${T} D=${D} Theta_G2=${G2} homeRate=${homeRate} scaleHz=${scaleHz}\n`);

console.log('1. segregated by default (Theta=0): three organised, mutually illegible identities');
{
  const st = run({ Theta: 0, env: null, seconds: 20 });
  console.log(`   S=${st.S.toFixed(3)} (floor ${S0.toFixed(3)})   r_k=${st.r.map(x => x.toFixed(3)).join(', ')}   f0eff=${st.f0eff.map(x => x.toFixed(2)).join(', ')}`);
  console.log(`   ${st.S < S0 + 0.05 && Math.min(...st.r) > 0.7 ? 'segregated AND organised, as designed' : 'FAIL'}`);
}

console.log('\n2. embeddedness is a threshold in S, not a ramp -- and r_k survives it');
{
  const Thetas = [0, 0.5, 1.0, 1.5, 1.8, 2.0, 2.1, 2.2, 2.4, 2.7, 3.2, 4.0];
  let state = fresh();
  const rows = [];
  for (const Theta of Thetas) {
    const st = run({ Theta, env: null, seconds: 8, state });
    state = st;
    rows.push({ Theta, S: st.S, r: st.r, f0eff: Array.from(st.f0eff) });
  }
  for (const row of rows)
    console.log(`   Theta=${row.Theta.toFixed(2)}  S=${row.S.toFixed(3)}  r_k=${row.r.map(x => x.toFixed(2)).join(',')}  f0eff=${row.f0eff.map(x => x.toFixed(1)).join(',')}`);
  const minR = Math.min(...rows.flatMap(r => r.r));
  console.log(`   worst within-population r across the whole sweep: ${minR.toFixed(3)} (organisation ${minR > 0.7 ? 'held' : 'DEGRADED'} throughout)`);
}

console.log('\n3. a one-way door: past critical Theta, turning permeability back to 0 does NOT re-segregate the field');
{
  const Thetas = [0, 0.5, 1.0, 1.5, 1.8, 2.0, 2.2, 2.7, 3.2, 4.0];
  let state = fresh();
  const up = [], down = [];
  for (const Theta of Thetas) { const st = run({ Theta, env: null, seconds: 6, state }); state = st; up.push([Theta, st.S]); }
  for (const Theta of [...Thetas].reverse()) { const st = run({ Theta, env: null, seconds: 6, state }); state = st; down.push([Theta, st.S]); }
  console.log('   rising  ', up.map(([t, s]) => `${t.toFixed(1)}:${s.toFixed(2)}`).join(' '));
  console.log('   falling ', down.map(([t, s]) => `${t.toFixed(1)}:${s.toFixed(2)}`).join(' '));
  const heldAtZero = down[down.length - 1][1];
  console.log(`   S at Theta=0 after having been embedded: ${heldAtZero.toFixed(3)} -- ${heldAtZero > S0 + 0.2 ? 'STILL EMBEDDED: permeability alone cannot undo it' : 'released, unexpectedly'}`);
}

console.log('\n4. context-alignment: does the shared identity bend toward the room, and only once permeable, and more when the room is clearer?');
{
  const roomFreq = 45.0;   // incommensurate with all three population fundamentals
  for (const Theta of [1.0, 2.5]) {
    for (const clarity of [0, 1]) {
      const st = run({ Theta, env: { freq: roomFreq, clarity }, seconds: 12, state: fresh() });
      const meanEff = st.f0eff.reduce((a, b) => a + b, 0) / K3;
      console.log(`   Theta=${Theta.toFixed(2)} clarity=${clarity}  S=${st.lastS.toFixed(3)}  f0eff=${st.f0eff.map(x => x.toFixed(2)).join(',')}  mean=${meanEff.toFixed(2)} Hz (home mean ${meanHome.toFixed(2)}, room ${roomFreq})`);
    }
  }
  console.log('   below threshold: mean should sit near the home mean regardless of clarity.');
  console.log('   above threshold: mean should move toward the room, and move further at clarity=1 than clarity=0.');
}

console.log('\n5. reindividuate: the one intervention that DOES release a locked field');
{
  let state = fresh();
  state = run({ Theta: 4.0, env: null, seconds: 8, state });
  const lockedS = consensusOf(state.f0eff, meanHome, envFloor).S;
  state.f0eff = f0home.slice();   // exactly what the processor's 'reindividuate' message does
  const afterReset = run({ Theta: 0, env: null, seconds: 6, state });
  console.log(`   locked at S=${lockedS.toFixed(3)}, Theta then dropped to 0 AND reindividuated -> S=${afterReset.S.toFixed(3)} (floor ${S0.toFixed(3)})`);
  console.log(`   ${afterReset.S < S0 + 0.05 ? 'released -- back to segregated, as designed' : 'FAIL: reindividuate did not release it'}`);
}

console.log('\n6. the one-way door is a TUNING CHOICE: it exists only above a critical G2/homeRate');
{
  // The f0eff relaxation is one-directional -- f0eff drives the oscillator bank, and
  // nothing in the bank feeds back into f0eff -- so this sweep can skip the oscillators
  // entirely and integrate the relaxation alone. Same equation as run(), minus the
  // phases, which is what makes it cheap enough to sweep.
  const dtR = 1 / 20000;
  const relax = (Theta, g2, f0eff, seconds) => {
    for (let s = 0; s < seconds / dtR; s++) {
      const { fBar, S } = consensusOf(f0eff, meanHome, envFloor);
      const ThetaEff = Theta + g2 * excess(S, S0);
      for (let k = 0; k < K3; k++) f0eff[k] += dtR * (homeRate * (f0home[k] - f0eff[k]) - ThetaEff * (f0eff[k] - fBar));
    }
    return consensusOf(f0eff, meanHome, envFloor).S;
  };
  let firstHeld = null, lastFell = null;
  for (const g2 of [80, 100, 102, 104, 108, 112, 120, 140]) {
    const f = f0home.slice();
    relax(4.0, g2, f, 6);                          // drive it to embedded
    const locked = consensusOf(f, meanHome, envFloor).S;
    const released = relax(0, g2, f, 10);          // then drop permeability to zero
    const held = released > S0 + 0.2;
    if (held) { if (firstHeld === null) firstHeld = g2; }
    else lastFell = g2;                            // bracket from the values actually tested
    console.log(`   G2=${String(g2).padStart(3)} (G2/homeRate=${(g2 / homeRate).toFixed(1).padStart(4)})  locked S=${locked.toFixed(3)} -> released S=${released.toFixed(3)}  ${held ? 'HELD (one-way)' : 'fell back (reversible)'}`);
  }
  console.log(`   critical ratio is between ${(lastFell / homeRate).toFixed(1)} and ${(firstHeld / homeRate).toFixed(1)}; shipped ratio is ${(G2 / homeRate).toFixed(1)}.`);
  console.log('   Below it the curve is an ordinary reversible one and reindividuate has nothing to do.');
  console.log('   The one-way door is therefore a consequence of tuning, not a property of embeddedness -- see PLAN-v3.md section 7.');
}
