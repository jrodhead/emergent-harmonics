// Breath pacer.
//
// The whole instrument reduces to one control value, `openness`, running 0..1:
// 0 is empty lungs, 1 is full. Everything audible is a function of it, and the
// four segments of a breath cycle are just four ways of moving it:
//
//   inhale      0 -> 1     openness = 0.5 - 0.5*cos(pi*p)
//   inhaleHold  held at 1
//   exhale      1 -> 0     openness = 0.5 + 0.5*cos(pi*p)
//   exhaleHold  held at 0
//
// The raised cosine matters for a specific reason. Its derivative is zero at BOTH
// ends, so inhale arrives at 1 having already come to rest, and exhale leaves 1 the
// same way. That means a cycle with no retentions at all -- {1.2, 0, 1.2, 0}, the
// circular breathing the whole holotropic family is built on -- turns around at the
// apex smoothly, with no discontinuity and no click, without needing a crossfade or
// a special case. Zero-duration segments fall out of the boundary arithmetic rather
// than being handled.
//
// Cycle position is an INTEGRATED normalised phase u, advanced by dt/total each
// block, not computed from absolute time. Same reason an oscillator integrates phase
// rather than evaluating sin(2*pi*f*t): the cycle duration changes continuously
// during a ramp, and evaluating from elapsed time would make the current breath jump
// whenever the period moved. Integrating keeps u continuous, so a breath in progress
// smoothly speeds up instead of skipping.
//
// A phase interpolates from one four-tuple to another, so a ramp changes rate and
// shape together. `from == to` is a steady phase; there is no separate case.
//
// Phase changes are deferred until openness is already at the bottom. Within a phase
// openness is continuous by construction -- the segment boundaries and u both move
// continuously, and the raised cosine meets its neighbours at matching values at
// every internal boundary. Across a phase edge it is not: u is carried over while the
// boundaries jump to a different shape, so the same u can land mid-inhale on one side
// and mid-hold on the other. Switching only when openness < 1e-2 removes the problem
// at its root instead of requiring adjacent protocol phases to declare matching
// cycles, which would still not cover a phase that is a pure retention. The cost is
// that an advance takes effect at the end of the current breath rather than instantly,
// which is also the more natural reading of the gesture.
//
// Abort is the exception and switches immediately: it is a safety control, and it is
// already continuous because the glide it builds starts from the exact cycle that is
// playing, so openness does not move at the switch.
//
// The cue is deliberately permissive rather than imperative. There are no transients
// anywhere in the signal path -- no ticks, no attacks, no onsets marking where a
// breath "should" start. Brightness rises and falls continuously, so being off the
// pace produces no click, no beat, and no sense of having missed something. You can
// breathe with it or around it. That is a design requirement, not an aesthetic: the
// premise of this piece is that the practitioner's own interoception is the authority,
// and a strict metronome contradicts that by implying the instrument knows better.
//
// Nothing here senses, scores, or adapts to the person. There is no input.

class BreathProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const cfg = options.processorOptions;
    const v = cfg.voice;

    // Oscillators are allocated over the UNION of every named partial set, and a set is
    // just a mask plus its own cutoffs over that union. Switching sets is therefore a
    // change of target gain, never a reallocation and never a change of oscillator
    // frequency -- so a swap mid-breath is a short gain glide with no discontinuity,
    // which is what makes an honest A/B possible while the cue is running.
    this.sets = v.sets;
    this.setNames = Object.keys(v.sets);
    this.n = [...new Set(this.setNames.flatMap(k => v.sets[k].partials))].sort((a, b) => a - b);
    this.N = this.n.length;
    for (const k of this.setNames) {
      const mask = new Uint8Array(this.N);
      const inSet = new Set(v.sets[k].partials);
      for (let i = 0; i < this.N; i++) mask[i] = inSet.has(this.n[i]) ? 1 : 0;
      v.sets[k]._mask = mask;
    }
    this.active = v.default in v.sets ? v.default : this.setNames[0];
    // Initial phases are spread rather than all starting at zero. Every partial here
    // is an exact harmonic of the same f0, so aligned phases would re-align on every
    // period of the fundamental and the sum would be an impulse train -- a large
    // crest factor and an audible buzz on top of the intended smooth spectrum. A
    // golden-ratio spread decorrelates them deterministically, so the same page always
    // sounds the same.
    this.theta = new Float64Array(this.N);
    for (let i = 0; i < this.N; i++) this.theta[i] = 2 * Math.PI * ((i * 0.6180339887) % 1);
    this.gain = new Float64Array(this.N);      // last block's ending gain
    this.smooth = new Float64Array(this.N);    // one-pole target, makes a swap glide
    this.gL = new Float64Array(this.N);
    this.gR = new Float64Array(this.N);

    this.f0 = v.f0;
    this.widthEmpty = v.widthEmpty;
    this.widthFull = v.widthFull;
    this.out = v.out;
    this.crossfadeMs = v.crossfadeMs ?? 25;

    // Breath layer: pink noise through a swept bandpass, amplitude driven by AIRFLOW
    // rather than lung volume -- see the note in breath.json. Kellet's economy pink
    // filter (six one-pole sections summed) is flat to within a fraction of a dB across
    // the band that matters here and costs almost nothing.
    // Defaulted rather than assumed: a missing config section should cost the breath
    // layer, not the whole instrument. A throw here happens on the audio thread and
    // silently kills the processor -- no sound, no messages, and the page left showing
    // whatever its placeholder state was.
    this.noise = cfg.noise ?? {
      centerEmpty: 320, centerFull: 1500, inhaleTilt: 1, exhaleTilt: 1,
      Q: 1.2, flowRef: 1.3, flowGamma: 0.8, gain: 0
    };
    this.layers = { drone: cfg.layers?.drone ?? 1, noise: cfg.layers?.noise ?? 0 };
    this.pb = new Float64Array(7);
    this.svfLow = 0; this.svfBand = 0;
    this.fcSmooth = this.noise.centerEmpty;
    this.nAmpSmooth = 0;

    this.safety = cfg.safety;
    this.queue = [];
    this.qi = 0;
    this.phaseT = 0;
    this.u = 0;
    this.breaths = 0;
    this.elapsed = 0;
    this.running = false;
    this.finished = false;
    this.aborting = false;
    this.blocks = 0;
    this.openness = 0;
    this.segment = 'exhaleHold';

    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'load') this.load(m.protocol);
      else if (m.type === 'running') this.running = m.value;
      else if (m.type === 'voice') { if (m.name in this.sets) this.active = m.name; }
      else if (m.type === 'layers') {
        if (typeof m.drone === 'number') this.layers.drone = m.drone;
        if (typeof m.noise === 'number') this.layers.noise = m.noise;
      }
      else if (m.type === 'advance') this.advance();
      else if (m.type === 'extend') this.extend(m.seconds ?? 60);
      else if (m.type === 'abort') this.abort();
    };
  }

  // Safety caps are applied here, at load, to every phase of whatever protocol is
  // handed over -- not read from the protocol and not exposed as a parameter. A
  // protocol asking for a 60 s empty-lung retention gets 20 s and is not consulted.
  load(protocol) {
    const cap = (c) => [
      Math.max(0, c[0]),
      Math.min(Math.max(0, c[1]), this.safety.maxInhaleHoldSeconds),
      Math.max(0, c[2]),
      Math.min(Math.max(0, c[3]), this.safety.maxExhaleHoldSeconds)
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

  // A cycle has to begin and end at openness 0, or deferring transitions to the
  // bottom cannot keep them continuous. Since the segment order is fixed, that means
  // it must open with an inhale and close with an exhale or an empty hold -- or be a
  // pure retention, which sits at 0 throughout and connects to anything. The invalid
  // shapes are ones like "hold full without inhaling first", which are not practices.
  static cycleOpensAndClosesAtRest(c) {
    const pureRetention = c[0] === 0 && c[1] === 0 && c[2] === 0;
    const opensAtRest = c[0] > 0 || pureRetention;
    const closesAtRest = c[3] > 0 || c[2] > 0 || pureRetention;
    return opensAtRest && closesAtRest;
  }

  // Current interpolated cycle. An untilUserInput phase does not interpolate --
  // there is no duration to interpolate across -- so it holds at `from`.
  cycle() {
    const p = this.queue[this.qi];
    if (!p) return [4, 0, 6, 0];
    const t = p.untilUserInput ? 0 : Math.max(0, Math.min(1, this.phaseT / p.seconds));
    const c = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) c[i] = p.from[i] + (p.to[i] - p.from[i]) * t;
    return c;
  }

  // Requests the next phase; it lands at the bottom of the current breath. For a
  // retention that is immediate, since openness is already 0 -- which is what you
  // want, because the gesture there means "I need to breathe now".
  advance() {
    if (!this.finished) this.pending = true;
  }

  applyPending() {
    this.pending = false;
    this.qi++;
    this.phaseT = 0;
    this.u = 0;
    if (this.qi >= this.queue.length) { this.qi = this.queue.length - 1; this.finished = true; }
  }

  tryApplyPending() {
    if (!this.pending) return false;
    if (this.qi < this.queue.length - 1) this.applyPending();
    else { this.pending = false; this.finished = true; }
    return true;
  }

  extend(seconds) {
    const p = this.queue[this.qi];
    if (p && !p.untilUserInput) p.seconds += seconds;
  }

  // Abort never cuts to silence and never snaps the rate. It builds a glide phase
  // whose `from` is whatever cycle is playing at this instant and whose `to` is the
  // abort phase's opening cycle, then continues into the abort phase itself. So the
  // pace decelerates into slow breathing from wherever it was.
  abort() {
    if (this.aborting) return;
    const cur = this.cycle();
    const idx = this.queue.findIndex(p => p.name === this.abortName);
    const target = this.queue[idx >= 0 ? idx : this.queue.length - 1];
    this.queue = [
      { name: 'coming down', from: cur, to: target.from.slice(),
        seconds: this.safety.abortGlideSeconds, untilUserInput: false },
      { ...target, from: target.from.slice(), to: target.to.slice() }
    ];
    this.qi = 0; this.phaseT = 0; this.pending = false;
    this.aborting = true; this.finished = false;
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const dt = 1 / sampleRate;
    const blockDt = n * dt;

    if (!this.running || this.queue.length === 0) { L.fill(0); R.fill(0); return true; }

    // ---- sequencer -------------------------------------------------------
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

    // Airflow: d(openness)/dt, analytic from the raised cosine. Zero at both ends of
    // inhale and exhale and zero throughout both retentions, which is what makes the
    // breath layer fall silent during a hold without being told to.
    let flow = 0;
    if (seg === 'inhale' && c[0] > 0)      flow = 0.5 * Math.PI * Math.sin(Math.PI * p) / c[0];
    else if (seg === 'exhale' && c[2] > 0) flow = 0.5 * Math.PI * Math.sin(Math.PI * p) / c[2];

    this.segment = seg;
    this.openness = openness;
    this.flow = flow;

    const cur = this.queue[this.qi];

    // A queued phase change lands here, at the bottom of the breath, where both the
    // outgoing and incoming cycles sit at openness 0. The wrap below is a backstop for
    // the case where a cycle is short enough that one block steps clean over the
    // window; a valid cycle is also at rest the instant it wraps.
    if (!(this.pending && openness < 1e-3 && this.tryApplyPending())) {
      // A pure retention has no cycle to traverse; freezing u keeps openness pinned
      // at 0 and stops it from counting phantom breaths.
      const pureRetention = c[0] === 0 && c[1] === 0 && c[2] === 0;
      if (!pureRetention) {
        this.u += blockDt / total;
        if (this.u >= 1) {
          while (this.u >= 1) { this.u -= 1; this.breaths++; }
          this.tryApplyPending();
        }
      }
    }

    this.phaseT += blockDt;
    this.elapsed += blockDt;
    if (cur && !cur.untilUserInput && this.phaseT >= cur.seconds) this.pending = true;
    if (this.elapsed > this.safety.maxSessionMinutes * 60 && !this.aborting) this.abort();

    // ---- voice -----------------------------------------------------------
    // Brightness is a smooth low-pass in partial-index space whose cutoff tracks
    // openness, so "full" is a wide bright spectrum and "empty" is a low hum, with a
    // small deliberate amplitude swell reinforcing it.
    //
    // Normalised by the L1 norm, not L2. L2 would hold RMS constant, but these are
    // exact harmonics of a common fundamental, so their peaks coincide periodically no
    // matter how the phases start and the true worst case is the sum of magnitudes.
    // Dividing by that makes |output| <= out * amp arithmetically, for any phase
    // relationship -- no limiter, and therefore no distortion products that would put
    // frequencies in the air that nobody chose.
    const S = this.sets[this.active];
    const mask = S._mask;
    const cutoff = S.cutoffEmpty + (S.cutoffFull - S.cutoffEmpty) * openness;
    let sum = 0;
    const g = new Float64Array(this.N);
    for (let i = 0; i < this.N; i++) {
      if (!mask[i]) continue;                  // not in the active set: gain 0, glides down
      const ni = this.n[i];
      const w = 1 / (1 + Math.pow(ni / cutoff, S.rolloff));
      g[i] = w / ni;
      sum += g[i];
    }
    const norm = sum > 1e-9 ? 1 / sum : 0;
    // trim is the per-set level match; <= 1 always, so the L1 peak bound survives it
    const amp = (S.ampFloor + (1 - S.ampFloor) * openness) * (S.trim ?? 1);
    const width = this.widthEmpty + (this.widthFull - this.widthEmpty) * openness;

    // One-pole toward the computed gains. During normal breathing this is invisible
    // (25 ms against seconds of motion); its job is to turn a set-swap into a glide.
    // The smoothed vector is a convex combination of vectors whose L1 sums are each
    // <= 1, and L1 is convex, so the peak bound holds through a swap as well.
    const sc = 1 - Math.exp(-blockDt * 1000 / this.crossfadeMs);
    for (let i = 0; i < this.N; i++) {
      g[i] *= norm * amp;
      this.smooth[i] += (g[i] - this.smooth[i]) * sc;
      g[i] = this.smooth[i];
      // deterministic low-discrepancy pan, spread widening as the breath fills
      const pan = ((((i * 0.6180339887) % 1) - 0.5) * 2) * width;
      const a = (pan + 1) * Math.PI / 4;
      this.gL[i] = Math.cos(a);
      this.gR[i] = Math.sin(a);
    }

    // ---- breath layer ------------------------------------------------------
    const NZ = this.noise;
    // Centre sweeps logarithmically with lung volume, then tilts by direction so an
    // inhale and an exhale at the same volume are not acoustic mirror images.
    const fcBase = NZ.centerEmpty * Math.pow(NZ.centerFull / NZ.centerEmpty, openness);
    const fcTarget = fcBase * (seg === 'inhale' ? NZ.inhaleTilt
                             : seg === 'exhale' ? NZ.exhaleTilt : 1);
    const nAmpTarget = this.layers.noise
      * Math.pow(Math.min(1, Math.abs(flow) / NZ.flowRef), NZ.flowGamma) * NZ.gain;
    // smooth both so a segment boundary cannot step the filter or the level
    const nsc = 1 - Math.exp(-blockDt * 1000 / this.crossfadeMs);
    this.fcSmooth += (fcTarget - this.fcSmooth) * nsc;
    const nAmp0 = this.nAmpSmooth;
    this.nAmpSmooth += (nAmpTarget - this.nAmpSmooth) * nsc;
    const svfF = Math.min(0.9, 2 * Math.sin(Math.PI * this.fcSmooth / sampleRate));
    const svfQ = 1 / NZ.Q;
    const droneLvl = this.layers.drone;

    // per-sample linear ramp from last block's gains: no steps, no zipper noise
    const step = 1 / n;
    for (let s = 0; s < n; s++) {
      const mix = (s + 1) * step;
      let l = 0, r = 0;
      for (let i = 0; i < this.N; i++) {
        const gi = this.gain[i] + (g[i] - this.gain[i]) * mix;
        this.theta[i] += 2 * Math.PI * this.f0 * this.n[i] * dt;
        if (this.theta[i] > 2 * Math.PI) this.theta[i] -= 2 * Math.PI;
        const val = Math.sin(this.theta[i]) * gi;
        l += val * this.gL[i];
        r += val * this.gR[i];
      }
      l *= droneLvl; r *= droneLvl;

      const nAmp = nAmp0 + (this.nAmpSmooth - nAmp0) * mix;
      if (nAmp > 1e-6) {
        const w = Math.random() * 2 - 1;
        const b = this.pb;
        b[0] = 0.99886 * b[0] + w * 0.0555179;
        b[1] = 0.99332 * b[1] + w * 0.0750759;
        b[2] = 0.96900 * b[2] + w * 0.1538520;
        b[3] = 0.86650 * b[3] + w * 0.3104856;
        b[4] = 0.55000 * b[4] + w * 0.5329522;
        b[5] = -0.7616 * b[5] - w * 0.0168980;
        const pink = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11;
        b[6] = w * 0.115926;
        // Chamberlin state-variable filter, bandpass tap
        this.svfLow += svfF * this.svfBand;
        const high = pink - this.svfLow - svfQ * this.svfBand;
        this.svfBand += svfF * high;
        const bp = this.svfBand * nAmp;
        l += bp; r += bp;                      // centred: it is your own breath
      }

      L[s] = l * this.out;
      R[s] = r * this.out;
    }
    for (let i = 0; i < this.N; i++) this.gain[i] = g[i];

    if ((this.blocks++ & 7) === 0) {
      this.port.postMessage({
        phase: cur ? cur.name : '', qi: this.qi, phases: this.queue.length,
        phaseT: this.phaseT, phaseSeconds: cur ? cur.seconds : 0,
        untilUserInput: cur ? cur.untilUserInput : false,
        segment: seg, openness, flow, cycle: c, total, u: this.u, voice: this.active,
        layers: this.layers,
        breaths: this.breaths, elapsed: this.elapsed,
        finished: this.finished, aborting: this.aborting, pending: this.pending
      });
    }
    return true;
  }
}

registerProcessor('breath', BreathProcessor);
