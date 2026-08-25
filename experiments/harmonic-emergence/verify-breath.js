// Headless replica of breath-processor.js's sequencer, checking the things this
// instrument actually controls.
//
//   node verify-breath.js
//
// Note what is NOT in here, deliberately. Nothing below checks anything about a
// person: not that breathing at 6/min does anything, not that a session produces a
// state, not that the practitioner followed the pace. This instrument has no sensor
// and makes no measurement, so the only honest claims are about the cue itself --
// does it land where the protocol says, does it stay continuous, does abort work
// from everywhere. Whether any of it matters to a nervous system is a question this
// project has no instrument to answer, same as the three before it.
//
// Replica rather than import, following verify.js and verify-embedded.js: the worklet
// is loaded as a blob and cannot be imported here. The sequencer is small and the
// arithmetic is duplicated exactly.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, 'breath.json'), 'utf8'));
const SAFETY = cfg.safety;
const DT = 128 / 48000;            // one render block, same granularity as the worklet

class Pacer {
  constructor(protocol) {
    const cap = (c) => [
      Math.max(0, c[0]),
      Math.min(Math.max(0, c[1]), SAFETY.maxInhaleHoldSeconds),
      Math.max(0, c[2]),
      Math.min(Math.max(0, c[3]), SAFETY.maxExhaleHoldSeconds)
    ];
    this.queue = protocol.phases.map(p => ({
      name: p.name,
      from: cap(p.from),
      to: cap(p.to ?? p.from),
      seconds: p.untilUserInput ? Infinity : p.seconds,
      untilUserInput: !!p.untilUserInput
    }));
    this.abortName = protocol.abortTo ?? this.queue[this.queue.length - 1].name;
    this.qi = 0; this.phaseT = 0; this.u = 0;
    this.breaths = 0; this.elapsed = 0;
    this.finished = false; this.aborting = false; this.pending = false;
  }

  static cycleOpensAndClosesAtRest(c) {
    const pureRetention = c[0] === 0 && c[1] === 0 && c[2] === 0;
    return (c[0] > 0 || pureRetention) && (c[3] > 0 || c[2] > 0 || pureRetention);
  }

  cycle() {
    const p = this.queue[this.qi];
    if (!p) return [4, 0, 6, 0];
    const t = p.untilUserInput ? 0 : Math.max(0, Math.min(1, this.phaseT / p.seconds));
    const c = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) c[i] = p.from[i] + (p.to[i] - p.from[i]) * t;
    return c;
  }

  advance() { if (!this.finished) this.pending = true; }

  applyPending() {
    this.pending = false;
    this.qi++; this.phaseT = 0; this.u = 0;
    if (this.qi >= this.queue.length) { this.qi = this.queue.length - 1; this.finished = true; }
  }

  tryApplyPending() {
    if (!this.pending) return false;
    if (this.qi < this.queue.length - 1) this.applyPending();
    else { this.pending = false; this.finished = true; }
    return true;
  }

  abort() {
    if (this.aborting) return;
    const cur = this.cycle();
    const idx = this.queue.findIndex(p => p.name === this.abortName);
    const target = this.queue[idx >= 0 ? idx : this.queue.length - 1];
    this.queue = [
      { name: 'coming down', from: cur, to: target.from.slice(),
        seconds: SAFETY.abortGlideSeconds, untilUserInput: false },
      { ...target, from: target.from.slice(), to: target.to.slice() }
    ];
    this.qi = 0; this.phaseT = 0; this.pending = false;
    this.aborting = true; this.finished = false;
  }

  // one block: compute from current u, then advance -- same order as the worklet
  step() {
    const c = this.cycle();
    const total = Math.max(0.05, c[0] + c[1] + c[2] + c[3]);
    const b1 = c[0] / total;
    const b2 = (c[0] + c[1]) / total;
    const b3 = (c[0] + c[1] + c[2]) / total;

    let seg, p;
    if (this.u < b1)      { seg = 'inhale';     p = b1 > 0 ? this.u / b1 : 1; }
    else if (this.u < b2) { seg = 'inhaleHold'; p = (b2 - b1) > 0 ? (this.u - b1) / (b2 - b1) : 1; }
    else if (this.u < b3) { seg = 'exhale';     p = (b3 - b2) > 0 ? (this.u - b2) / (b3 - b2) : 1; }
    else                  { seg = 'exhaleHold'; p = (1 - b3) > 0 ? (this.u - b3) / (1 - b3) : 1; }

    let openness;
    if (seg === 'inhale')          openness = 0.5 - 0.5 * Math.cos(Math.PI * p);
    else if (seg === 'inhaleHold') openness = 1;
    else if (seg === 'exhale')     openness = 0.5 + 0.5 * Math.cos(Math.PI * p);
    else                           openness = 0;

    const curp = this.queue[this.qi];
    let wrapped = false;

    if (!(this.pending && openness < 1e-3 && this.tryApplyPending())) {
      const pureRetention = c[0] === 0 && c[1] === 0 && c[2] === 0;
      if (!pureRetention) {
        this.u += DT / total;
        if (this.u >= 1) {
          while (this.u >= 1) { this.u -= 1; this.breaths++; wrapped = true; }
          this.tryApplyPending();
        }
      }
    }

    this.phaseT += DT; this.elapsed += DT;
    if (curp && !curp.untilUserInput && this.phaseT >= curp.seconds) this.pending = true;
    return { seg, openness, cycle: c, total, wrapped, phase: curp ? curp.name : '' };
  }
}

const P = cfg.protocols;
const fmt = (c) => '[' + c.map(x => x.toFixed(2)).join(', ') + ']';
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; return 'FAIL — ' + msg; } return 'ok'; };

const DEFAULT_SET = cfg.voice.sets[cfg.voice.default];
console.log(`voice sets: ${Object.keys(cfg.voice.sets).join(', ')} — default "${cfg.voice.default}"`
  + ` (${DEFAULT_SET.partials.length} partials of ${cfg.voice.f0} Hz)`);
console.log(`safety caps: inhaleHold<=${SAFETY.maxInhaleHoldSeconds}s exhaleHold<=${SAFETY.maxExhaleHoldSeconds}s session<=${SAFETY.maxSessionMinutes}min\n`);

console.log('1. segment timing — do the four segments last exactly what the protocol asks?');
{
  // steady phase, so measured segment durations should match the spec directly
  for (const [label, spec] of [['resonance 4-0-6-0', [4, 0, 6, 0]], ['box 4-4-4-4', [4, 4, 4, 4]]]) {
    const pacer = new Pacer({ phases: [{ name: 'x', seconds: 600, from: spec, to: spec }] });
    const acc = { inhale: 0, inhaleHold: 0, exhale: 0, exhaleHold: 0 };
    let cycles = 0;
    // discard the first partial cycle, then measure five whole ones
    while (!pacer.step().wrapped) { /* align to a cycle boundary */ }
    while (cycles < 5) { const r = pacer.step(); acc[r.seg] += DT; if (r.wrapped) cycles++; }
    const meas = [acc.inhale, acc.inhaleHold, acc.exhale, acc.exhaleHold].map(x => x / 5);
    const worst = Math.max(...meas.map((m, i) => Math.abs(m - spec[i])));
    console.log(`   ${label.padEnd(18)} measured ${fmt(meas)}  worst error ${(worst * 1000).toFixed(1)} ms  ${check(worst < 0.01, 'segment drift > 10 ms')}`);
  }
}

console.log('\n2. zero-duration segments — skipped entirely, and the apex stays smooth');
{
  const spec = [1.2, 0, 1.2, 0];        // circular breathing: no retentions at all
  const pacer = new Pacer({ phases: [{ name: 'x', seconds: 300, from: spec, to: spec }] });
  const seen = new Set();
  let prev = null, maxStep = 0, apexStep = 0;
  for (let i = 0; i < 20000; i++) {
    const r = pacer.step();
    seen.add(r.seg);
    if (prev !== null) {
      const d = Math.abs(r.openness - prev);
      maxStep = Math.max(maxStep, d);
      if (r.openness > 0.98) apexStep = Math.max(apexStep, d);
    }
    prev = r.openness;
  }
  const noHolds = !seen.has('inhaleHold') && !seen.has('exhaleHold');
  console.log(`   segments visited: ${[...seen].join(', ')}`);
  console.log(`   zero-duration holds never entered:      ${check(noHolds, 'a zero-length segment consumed time')}`);
  console.log(`   largest openness step anywhere: ${maxStep.toFixed(5)}   ${check(maxStep < 0.02, 'openness jumped — discontinuity')}`);
  console.log(`   largest step within 2% of the apex: ${apexStep.toFixed(6)}  ${check(apexStep < maxStep, 'apex is not the smoothest point — raised cosine is not flattening')}`);
  console.log('   (a raised cosine has zero derivative at both ends, so the inhale->exhale');
  console.log('    turnaround is the slowest-moving point in the cycle rather than a corner)');
}

console.log('\n3. ramps — a phase interpolates from one cycle to the other, rate and shape together');
{
  const pacer = new Pacer(P['ramp-test']);
  const marks = [];
  let last = null;
  for (let i = 0; i < Math.floor(240 / DT); i++) {
    const r = pacer.step();
    if (r.phase === 'ramp') { if (!last) marks.push(['ramp start', r.cycle, r.total]); last = r; }
  }
  marks.push(['ramp end', last.cycle, last.total]);
  for (const [name, c, t] of marks)
    console.log(`   ${name.padEnd(11)} cycle ${fmt(c)}  period ${t.toFixed(2)}s  rate ${(60 / t).toFixed(1)}/min`);
  const startOk = Math.abs(marks[0][2] - 10) < 0.2;
  const endOk = Math.abs(marks[1][2] - 2.4) < 0.2;
  console.log(`   6/min at the start, 25/min at the end:  ${check(startOk && endOk, 'ramp endpoints wrong')}`);
}

console.log('\n4. abort — glides from wherever it is, never snaps, always lands in the abort phase');
{
  let worstJump = 0, allLanded = true;
  for (const key of Object.keys(P)) {
    const proto = P[key];
    for (let phaseIdx = 0; phaseIdx < proto.phases.length; phaseIdx++) {
      for (const frac of [0.05, 0.35, 0.7, 0.95]) {
        const pacer = new Pacer(proto);
        // walk into the requested phase, then to the requested point in the breath
        while (pacer.qi < phaseIdx) { pacer.step(); if (pacer.queue[pacer.qi].untilUserInput) pacer.advance(); }
        while (pacer.u < frac) pacer.step();
        const before = pacer.step();
        pacer.abort();
        const after = pacer.step();
        worstJump = Math.max(worstJump, Math.abs(after.openness - before.openness));
        // run out the glide plus a little, and confirm where it ended up
        for (let i = 0; i < Math.floor((SAFETY.abortGlideSeconds + 30) / DT); i++) pacer.step();
        const landed = pacer.queue[pacer.qi].name === (proto.abortTo ?? proto.phases[proto.phases.length - 1].name);
        if (!landed) allLanded = false;
      }
    }
  }
  console.log(`   tested every phase of every protocol at four points in the breath`);
  console.log(`   largest openness jump at the moment of abort: ${worstJump.toFixed(5)}  ${check(worstJump < 0.02, 'abort snapped the cue')}`);
  console.log(`   always ends in the declared abort phase:      ${check(allLanded, 'abort did not land in abortTo')}`);
}

console.log('\n5. safety caps are applied at load, not read from the protocol');
{
  const greedy = { phases: [{ name: 'x', seconds: 60, from: [2, 90, 1, 300], to: [2, 90, 1, 300] }] };
  const pacer = new Pacer(greedy);
  const c = pacer.queue[0].from;
  console.log(`   protocol asked for [2, 90, 1, 300] -> loaded as ${fmt(c)}`);
  console.log(`   inhaleHold capped: ${check(c[1] === SAFETY.maxInhaleHoldSeconds, 'inhale hold not capped')}`);
  console.log(`   exhaleHold capped: ${check(c[3] === SAFETY.maxExhaleHoldSeconds, 'exhale hold not capped')}`);
  console.log('   (a retention is where the practitioner is deliberately overriding the urge to');
  console.log('    breathe, so it is the one segment a fixed number has to govern rather than feel)');
}

console.log('\n6. every shipped cycle opens and closes at rest');
{
  let allOk = true;
  for (const key of Object.keys(P)) {
    const bad = [];
    for (const ph of P[key].phases)
      for (const c of [ph.from, ph.to ?? ph.from])
        if (!Pacer.cycleOpensAndClosesAtRest(c)) bad.push(`${ph.name} ${fmt(c)}`);
    if (bad.length) allOk = false;
    console.log(`   ${key.padEnd(11)} ${bad.length ? 'INVALID: ' + bad.join('; ') : 'all cycles start and end at openness 0'}`);
  }
  console.log(`   ${check(allOk, 'a cycle cannot be entered or left continuously')}`);
}

console.log('\n7. openness stays in range and continuous across every shipped protocol');
{
  for (const key of Object.keys(P)) {
    const pacer = new Pacer(P[key]);
    let prev = null, maxStep = 0, lo = 1, hi = 0;
    for (let i = 0; i < Math.floor(1500 / DT); i++) {
      const r = pacer.step();
      if (pacer.queue[pacer.qi].untilUserInput && pacer.phaseT > 20) pacer.advance();
      if (prev !== null) maxStep = Math.max(maxStep, Math.abs(r.openness - prev));
      prev = r.openness; lo = Math.min(lo, r.openness); hi = Math.max(hi, r.openness);
    }
    console.log(`   ${key.padEnd(11)} range [${lo.toFixed(3)}, ${hi.toFixed(3)}]  max step ${maxStep.toFixed(5)}  ${check(lo >= 0 && hi <= 1 && maxStep < 0.02, 'openness out of range or discontinuous')}`);
  }
}

console.log('\n8. partial sets — critical-band spacing, and the unsounded fundamental');
{
  // Roughness is what you hear when two partials fall inside one auditory filter, and
  // Glasberg & Moore's ERB is the filter width. Only the DEFAULT set has to be resolved:
  // the others ship as A/B references and are allowed to be rough on purpose -- that
  // being the whole point of having something to compare against.
  const V = cfg.voice, f0 = V.f0;
  const erb = f => 24.7 * (4.37 * f / 1000 + 1);
  const gcd = (x, y) => y ? gcd(y, x % y) : x;
  for (const [name, S] of Object.entries(V.sets)) {
    const ns = S.partials;
    let worst = Infinity, rough = 0;
    for (let i = 0; i < ns.length - 1; i++) {
      const a = ns[i] * f0, b = ns[i + 1] * f0;
      const r = (b - a) / erb((a + b) / 2);
      worst = Math.min(worst, r);
      if (r < 1) rough++;
    }
    const g = ns.reduce(gcd);
    const isDefault = name === V.default;
    const tag = isDefault ? '(default)' : '(reference)';
    console.log(`   ${name.padEnd(7)} ${tag.padEnd(12)} ${String(ns.length).padStart(2)} partials  ${ns[0] * f0}-${ns[ns.length - 1] * f0} Hz`
      + `  narrowest ${worst.toFixed(2)} ERB  unresolved ${rough}/${ns.length - 1}`);
    if (isDefault) console.log(`   ${' '.repeat(20)}${check(rough === 0, 'the default set has partials inside one critical band')}`);
    if (g !== 1) { failures++; console.log(`   ${' '.repeat(20)}FAIL — GCD is ${g}, so this set implies ${g * f0} Hz, not ${f0}`); }
  }
  console.log(`   every set has GCD 1, so all of them imply the same unsounded ${f0} Hz —`);
  console.log(`   ${f0} Hz is never played and neither are partials 1-5; it is what the ear infers,`);
  console.log('   and it is the one thing carried over from v1 intact.');
}

console.log('\n9. the A/B sets are level-matched, so the comparison is about timbre');
{
  // A 4 dB difference decides a listening comparison on loudness alone. Both sets are
  // rendered over a full breath and their cycle RMS compared; trims in breath.json are
  // what bring them together, and this check is what catches them drifting apart.
  const V = cfg.voice, SR = 48000, BLOCK = 128;
  function cycleRMS(S) {
    const ns = S.partials, NP = ns.length;
    const th = new Float64Array(NP);
    for (let i = 0; i < NP; i++) th[i] = 2 * Math.PI * ((i * 0.6180339887) % 1);
    const gp = new Float64Array(NP);
    let sumSq = 0, cnt = 0, peak = 0;
    const cb = Math.floor(10 * SR / BLOCK);
    for (let b = 0; b < cb * 2; b++) {
      const u = (b % cb) / cb;
      const open = u < 0.4 ? 0.5 - 0.5 * Math.cos(Math.PI * (u / 0.4))
                           : 0.5 + 0.5 * Math.cos(Math.PI * ((u - 0.4) / 0.6));
      const cutoff = S.cutoffEmpty + (S.cutoffFull - S.cutoffEmpty) * open;
      const g = new Float64Array(NP); let sum = 0;
      for (let i = 0; i < NP; i++) { const w = 1 / (1 + Math.pow(ns[i] / cutoff, S.rolloff)); g[i] = w / ns[i]; sum += g[i]; }
      const norm = 1 / sum, amp = (S.ampFloor + (1 - S.ampFloor) * open) * (S.trim ?? 1);
      for (let i = 0; i < NP; i++) g[i] *= norm * amp;
      for (let s = 0; s < BLOCK; s++) {
        const mix = (s + 1) / BLOCK; let acc = 0;
        for (let i = 0; i < NP; i++) {
          const gi = gp[i] + (g[i] - gp[i]) * mix;
          th[i] += 2 * Math.PI * V.f0 * ns[i] / SR;
          if (th[i] > 2 * Math.PI) th[i] -= 2 * Math.PI;
          acc += Math.sin(th[i]) * gi;
        }
        acc *= V.out; sumSq += acc * acc; cnt++; peak = Math.max(peak, Math.abs(acc));
      }
      for (let i = 0; i < NP; i++) gp[i] = g[i];
    }
    return { rms: Math.sqrt(sumSq / cnt), peak };
  }
  const measured = {};
  for (const [name, S] of Object.entries(V.sets)) {
    measured[name] = cycleRMS(S);
    console.log(`   ${name.padEnd(7)} cycle RMS ${(20 * Math.log10(measured[name].rms)).toFixed(2)} dBFS   peak ${measured[name].peak.toFixed(3)}   trim ${(S.trim ?? 1)}`);
  }
  const vals = Object.values(measured).map(m => 20 * Math.log10(m.rms));
  const spread = Math.max(...vals) - Math.min(...vals);
  const anyClip = Object.values(measured).some(m => m.peak >= 0.99);
  console.log(`   spread across sets: ${spread.toFixed(2)} dB  ${check(spread < 1.0, 'sets differ in loudness enough to bias an A/B')}`);
  console.log(`   none clip: ${check(!anyClip, 'a set peaks at or above full scale')}`);
}

console.log('\n10. the rendered signal has no transients — the cue is an offer, not a metronome');
{
  // Replica of the processor's voice section, rendered at audio rate. A click is a
  // discontinuity, so the test is the largest sample-to-sample step in the output:
  // for a band-limited sum whose highest partial is max(partials) * f0, the steepest a
  // legitimate signal can be is bounded, and anything above that is an artefact.
  const V = cfg.voice, S = DEFAULT_SET, SR = 48000, BLOCK = 128;
  const ns = S.partials.slice();
  const NP = ns.length;
  const topHz = Math.max(...ns) * V.f0;
  const bound = 2 * Math.PI * topHz / SR;      // max slope of a unit sine at the top partial

  function render(protocol, seconds, abortAt) {
    const pacer = new Pacer(protocol);
    const theta = new Float64Array(NP), gPrev = new Float64Array(NP);
    for (let i = 0; i < NP; i++) theta[i] = 2 * Math.PI * ((i * 0.6180339887) % 1);
    let maxStep = 0, peak = 0, prev = 0, t = 0;
    const blocks = Math.floor(seconds * SR / BLOCK);
    for (let b = 0; b < blocks; b++) {
      if (abortAt && Math.abs(t - abortAt) < BLOCK / SR) pacer.abort();
      const r = pacer.step();
      const cutoff = S.cutoffEmpty + (S.cutoffFull - S.cutoffEmpty) * r.openness;
      const g = new Float64Array(NP);
      let sum = 0;
      for (let i = 0; i < NP; i++) { const w = 1 / (1 + Math.pow(ns[i] / cutoff, S.rolloff)); g[i] = w / ns[i]; sum += g[i]; }
      const norm = sum > 1e-9 ? 1 / sum : 0;
      const amp = (S.ampFloor + (1 - S.ampFloor) * r.openness) * (S.trim ?? 1);
      for (let i = 0; i < NP; i++) g[i] *= norm * amp;
      for (let s = 0; s < BLOCK; s++) {
        const mix = (s + 1) / BLOCK;
        let acc = 0;
        for (let i = 0; i < NP; i++) {
          const gi = gPrev[i] + (g[i] - gPrev[i]) * mix;
          theta[i] += 2 * Math.PI * V.f0 * ns[i] / SR;
          if (theta[i] > 2 * Math.PI) theta[i] -= 2 * Math.PI;
          acc += Math.sin(theta[i]) * gi;
        }
        acc *= V.out;
        if (b > 2) maxStep = Math.max(maxStep, Math.abs(acc - prev));
        prev = acc; peak = Math.max(peak, Math.abs(acc));
        t += 1 / SR;
      }
      for (let i = 0; i < NP; i++) gPrev[i] = g[i];
    }
    return { maxStep, peak };
  }

  const cases = [
    ['resonance, 6/min', { phases: [{ name: 'x', seconds: 600, from: [4, 0, 6, 0], to: [4, 0, 6, 0] }] }, 25, null],
    ['circular, 25/min', { phases: [{ name: 'x', seconds: 600, from: [1.2, 0, 1.2, 0], to: [1.2, 0, 1.2, 0] }] }, 25, null],
    ['box, all four segs', { phases: [{ name: 'x', seconds: 600, from: [4, 4, 4, 4], to: [4, 4, 4, 4] }] }, 34, null],
    ['phase change', P['box'], 30, null],
    ['abort mid-breath', P['ramp-test'], 30, 12.0]
  ];
  for (const [label, proto, secs, abortAt] of cases) {
    const { maxStep, peak } = render(proto, secs, abortAt);
    const ratio = maxStep / (bound * peak);
    console.log(`   ${label.padEnd(20)} peak ${peak.toFixed(3)}  max step ${maxStep.toFixed(5)}  ${ratio.toFixed(2)}x the band-limit  ${check(ratio < 1.5 && peak < 0.99, 'transient or clipping in the output')}`);
  }
  console.log(`   (band limit is one sample of a ${topHz} Hz sine at the measured peak; a click`);
  console.log('    from a gain jump or a segment discontinuity would read well above 1x)');
}

console.log(failures === 0
  ? '\nall checks passed.'
  : `\n${failures} CHECK(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
