// Three-population harmonic Kuramoto field, hierarchically coupled.
//
// Each of three populations is a copy of v2's field: eight phase oscillators near
// nodes of its OWN lattice, coupled to its OWN mean reduced phase so it locks onto
// its own fundamental. That is the "identity coupling" K, and it is fixed above
// criticality -- every population is a stable, organised whole by default, entirely
// independent of the other two. This is segregation: not noise, structure.
//
//   phi_ki' = 2pi*f0eff_k*(1+delta_ki) - K_eff_k * r_k * sin(phi_ki - psi_k) + noise
//
// f0eff_k is what makes this hierarchical rather than a bare copy of v2 three times
// over. A first draft tried to close the gap between populations with a second PHASE
// coupling term, on the model of v2's own coupling -- and it did nothing at any
// realistic permeability, because v2's trick only works when the things being
// synchronised already share nearly the same frequency (locking a spread of natural
// frequencies within a few percent of each other). These three populations are
// mistuned from one another by design -- 36, 50.9, 58.2 Hz, tens of Hz apart -- so a
// phase term just averages three independently-spinning phasors into noise. What
// closes a frequency gap that large is a pull on the frequency itself:
//
//   f0eff_k' = homeRate * (f0home_k - f0eff_k)  -  Theta_eff * (f0eff_k - fBar)
//
// fBar is the weighted mean of all three f0eff's and a fourth, silent phantom voice
// (envFreq) whose frequency is set from outside -- in the browser, from live
// microphone pitch-tracking; in verify-embedded.js, from a synthetic "room". Weak
// Theta loses to homeRate and every population's effective fundamental just sits at
// its own home value: segregation. Past a critical Theta the pull to consensus wins
// and the three (four, with the room) fundamentals collapse together -- a single
// emergent identity none of them started with. S measures how close together they
// currently are, normalised the same way v2 normalises r:
//
//   S = 1 / (1 + spread(f0eff, envFreq) / scaleHz)
//   Theta_eff = Theta + G2 * excess(S)^2,   excess(x) = max(0, (x-S0)/(1-S0))
//
// so embeddedness is self-reinforcing the same way v2's coherence is: being close
// makes the pull to get closer stronger. But unlike v2's r, this self-reinforcement
// is tuned strong enough (relative to homeRate) that once past its critical Theta,
// the locked state does not need Theta to hold it -- turning permeability back down
// to zero does NOT re-segregate the field. verify-embedded.js confirms this: it is a
// one-way door, a genuine asymmetry v2 doesn't have. What DOES undo it is a direct
// 'reindividuate' message, which is not physics the field does to itself -- it is
// the one intervention this design gives from outside, deliberately not reachable by
// the permeability knob alone. Once f0eff_k moves, the population's own unchanged
// internal coupling re-locks its eight oscillators around wherever it now is --
// exactly the mechanism v2 already uses to glide to a new key-pressed fundamental,
// just driven continuously instead of by a keypress.
//
// The room is never sounded. It is one more voice in the census, exactly the way the
// fundamental in v1/v2 was present in the coupling math and absent from the air.

class EmbeddedProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const cfg = options.processorOptions;

    this.n = Float64Array.from(cfg.partials);
    this.NP = this.n.length;                 // oscillators per population
    this.K3 = cfg.f0.length;                 // number of populations (3)
    this.amp = Float64Array.from(this.n, ni => cfg.coef / ni);

    // jitter: a small deterministic low-discrepancy spread, independent of S, so a
    // little spatial detail survives even when the populations fully collapse to centre
    this.jitter = Float64Array.from(this.n, (_, i) => (((i * 0.6180339887) % 1) - 0.5) * 0.35);

    this.f0home = Float64Array.from(cfg.f0);
    this.f0eff = Float64Array.from(cfg.f0);        // what the oscillators actually track
    this.pan0 = Float64Array.from(cfg.pan);
    this.out = cfg.out;

    this.homeRate = cfg.params.homeRate;
    this.scaleHz = cfg.params.scaleHz;

    this.theta = []; this.delta = []; this.freq = []; this.phi = [];
    for (let k = 0; k < this.K3; k++) {
      this.theta.push(new Float64Array(this.NP));
      this.delta.push(new Float64Array(this.NP));
      this.freq.push(new Float64Array(this.NP));
      this.phi.push(new Float64Array(this.NP));
    }
    this.r = new Float64Array(this.K3);
    this.psi = new Float64Array(this.K3);
    this.gL = []; this.gR = [];
    for (let k = 0; k < this.K3; k++) { this.gL.push(new Float64Array(this.NP)); this.gR.push(new Float64Array(this.NP)); }

    this.K = cfg.params.K;
    this.G = cfg.params.G;
    this.T = cfg.params.T;
    this.D = cfg.params.D;
    this.Theta = cfg.params.Theta;
    this.G2 = cfg.params.G2;
    this.envWeight = cfg.params.envWeight;
    this.envFloor = cfg.params.envFloor;
    this.pulseMs = cfg.params.pulseMs;
    this.running = true;

    this.r0pop = 1 / Math.sqrt(this.NP);
    this.t = 0; this.blocks = 0;

    // the room: a silent phantom voice, phase-only. freq/clarity arrive by message.
    // Its rest frequency is the mean of the home fundamentals, not an arbitrary
    // constant -- an "unheard" room contributes zero net pull rather than a hidden
    // bias, which matters for S0 below.
    const meanHome = this.f0home.reduce((a, b) => a + b, 0) / this.K3;
    this.envFreq = meanHome;
    this.envFreqTarget = meanHome;
    this.envClarity = 0;
    this.envClarityTarget = 0;
    this.pulseBoost = 0;
    this.pulseFreqTarget = null;

    // S0: the segregated floor, measured by running the ACTUAL consensus formula at
    // rest (f0eff = home, room silent) rather than a hand-derived approximation that
    // could drift out of sync with it. Any mismatch there is exactly what makes
    // "segregated" fail to be a true fixed point -- see the header note.
    this.S0 = this.consensus().S;

    this.reseed();
    this.scramble(1);

    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'param') { this[m.key] = m.value; if (m.key === 'D') this.reseed(); }
      else if (m.type === 'env') { this.envFreqTarget = m.freq; this.envClarityTarget = m.clarity; }
      else if (m.type === 'contextPulse') { this.pulseFreqTarget = m.freq; this.pulseBoost = 1; }
      else if (m.type === 'scramble') this.scramble(m.amount ?? 1);
      else if (m.type === 'reindividuate') this.f0eff.set(this.f0home);
      else if (m.type === 'running') this.running = m.value;
    };
  }

  reseed() {
    for (let k = 0; k < this.K3; k++)
      for (let i = 0; i < this.NP; i++) this.delta[k][i] = (Math.random() * 2 - 1) * this.D;
  }

  scramble(amount) {
    for (let k = 0; k < this.K3; k++) {
      for (let i = 0; i < this.NP; i++) {
        const span = 2 * Math.PI * this.n[i];
        this.theta[k][i] = (this.theta[k][i] + Math.random() * span * amount) % span;
      }
    }
  }

  order() {
    for (let k = 0; k < this.K3; k++) {
      let sx = 0, sy = 0;
      for (let i = 0; i < this.NP; i++) {
        const p = this.theta[k][i] / this.n[i];
        this.phi[k][i] = p;
        sx += Math.cos(p); sy += Math.sin(p);
      }
      sx /= this.NP; sy /= this.NP;
      this.r[k] = Math.sqrt(sx * sx + sy * sy);
      this.psi[k] = Math.atan2(sy, sx);
    }
  }

  // Between-population consensus, in frequency rather than phase -- see the header
  // note on why phase coupling can't close a tens-of-Hz gap. fBar/S/Theta_eff feed
  // the f0eff relaxation in process(); wEnv is exposed for display.
  consensus() {
    const wEnv = Math.min(1, this.envFloor + this.envWeight * this.envClarity + this.pulseBoost);
    let sum = 0, w = 0;
    for (let k = 0; k < this.K3; k++) sum += this.f0eff[k];
    w = this.K3;
    sum += wEnv * this.envFreq; w += wEnv;
    const fBar = sum / w;
    let variance = 0;
    for (let k = 0; k < this.K3; k++) variance += (this.f0eff[k] - fBar) ** 2;
    variance += wEnv * (this.envFreq - fBar) ** 2;
    variance /= w;
    const S = 1 / (1 + Math.sqrt(variance) / this.scaleHz);
    this.wEnv = wEnv;
    return { fBar, S };
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const dt = 1 / sampleRate;

    if (!this.running) { L.fill(0); R.fill(0); return true; }

    // smooth the externally-driven room state so its phase rate never kinks
    const envCoef = 1 - Math.exp(-n * dt / 0.08);
    this.envFreq += (this.envFreqTarget - this.envFreq) * envCoef;
    this.envClarity += (this.envClarityTarget - this.envClarity) * envCoef;
    if (this.pulseFreqTarget != null) { this.envFreq += (this.pulseFreqTarget - this.envFreq) * 0.5; }
    this.pulseBoost *= Math.exp(-n * dt * 1000 / this.pulseMs);
    if (this.pulseBoost < 0.01) { this.pulseBoost = 0; this.pulseFreqTarget = null; }

    this.order();
    const r = this.r, psi = this.psi;
    const KeffPop = new Float64Array(this.K3);
    for (let k = 0; k < this.K3; k++) {
      const e = (r[k] - this.r0pop) / (1 - this.r0pop);
      KeffPop[k] = this.K + this.G * (e > 0 ? e * e : 0);
    }

    const { fBar, S } = this.consensus();
    this.S = S;
    const eS = (S - this.S0) / (1 - this.S0);
    const ThetaEff = this.Theta + this.G2 * (eS > 0 ? eS * eS : 0);

    // frequency-domain relaxation: each population's effective fundamental drifts
    // between its own home value and the consensus, at a rate set by permeability.
    // One Euler step per block is plenty -- this moves on a multi-second timescale.
    const blockDt = n * dt;
    for (let k = 0; k < this.K3; k++) {
      this.f0eff[k] += blockDt * (this.homeRate * (this.f0home[k] - this.f0eff[k]) - ThetaEff * (this.f0eff[k] - fBar));
    }

    // stereo collapse: populations pull toward centre as S rises; jitter never does
    for (let k = 0; k < this.K3; k++) {
      const basePan = this.pan0[k] * (1 - S);
      for (let i = 0; i < this.NP; i++) {
        const p = Math.max(-1, Math.min(1, basePan + this.jitter[i]));
        const a = (p + 1) * Math.PI / 4;
        this.gL[k][i] = Math.cos(a); this.gR[k][i] = Math.sin(a);
      }
    }

    // environment breathes on two slow periods harmonic to the interior population's
    // own fundamental, exactly as v2's does -- the same lattice still governs the
    // rhythm of what coherence has to be held against.
    this.t += n * dt;
    const f0i = this.f0home[0];
    const breath = 1
      + 0.8 * Math.sin(2 * Math.PI * (f0i / 1024) * this.t)
      + 0.4 * Math.sin(2 * Math.PI * (f0i / 4096) * this.t);
    const Teff = this.T * Math.max(0, breath);
    const noiseScale = Math.sqrt(2 * Teff * dt);
    for (let k = 0; k < this.K3; k++)
      for (let i = 0; i < this.NP; i++) {
        this.delta[k][i] += (Math.random() * 2 - 1) * this.D * 0.004;
        if (this.delta[k][i] >  this.D * 1.5) this.delta[k][i] =  this.D * 1.5;
        if (this.delta[k][i] < -this.D * 1.5) this.delta[k][i] = -this.D * 1.5;
      }

    for (let s = 0; s < n; s++) {
      let l = 0, rr = 0;
      for (let k = 0; k < this.K3; k++) {
        const w0 = 2 * Math.PI * this.f0eff[k];
        for (let i = 0; i < this.NP; i++) {
          const ni = this.n[i];
          const span = 2 * Math.PI * ni;
          const phi = this.theta[k][i] / ni;

          const dphi = w0 * (1 + this.delta[k][i])
            - KeffPop[k] * r[k] * Math.sin(phi - psi[k]);

          let th = this.theta[k][i] + ni * (dphi * dt + noiseScale * (Math.random() * 2 - 1) * 1.732);
          th %= span; if (th < 0) th += span;
          this.theta[k][i] = th;

          const v = Math.sin(th) * this.amp[i];
          l += v * this.gL[k][i];
          rr += v * this.gR[k][i];
          if (s === 0) this.freq[k][i] = ni * dphi / (2 * Math.PI);
        }
      }
      L[s] = l * this.out;
      R[s] = rr * this.out;
    }

    if ((this.blocks++ & 7) === 0) {
      this.port.postMessage({
        r: Array.from(r), psi: Array.from(psi), S, fBar,
        f0eff: Array.from(this.f0eff), ThetaEff, wEnv: this.wEnv, envFreq: this.envFreq,
        phi: this.phi.map(a => Array.from(a)),
        freq: this.freq.map(a => Array.from(a))
      });
    }
    return true;
  }
}

registerProcessor('embedded', EmbeddedProcessor);
