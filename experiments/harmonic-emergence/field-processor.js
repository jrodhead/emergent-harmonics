// Harmonic Kuramoto field.
//
// Each voice i is a phase oscillator theta_i sitting near lattice node n_i.
// Its reduced phase phi_i = theta_i / n_i is the phase of the fundamental that
// voice implies. Coupling acts on the reduced phases, so what the ensemble
// synchronises on is not a common frequency but a common *fundamental* -- which
// means locking produces exact integer ratios rather than a unison.
//
//   phi_i' = f0*2pi*(1 + delta_i) - K_eff * r * sin(phi_i - Psi) + noise
//   theta_i' = n_i * phi_i'
//   r e^{i Psi} = (1/N) sum_j e^{i phi_j}
//
// r is the order parameter: how completely the voices agree on a fundamental
// that none of them plays. An incoherent ensemble of N does not sit at r=0 but at
// the finite-size floor 1/sqrt(N) ~ 0.24, so the self-reinforcement term counts
// only order in EXCESS of that floor, squared:
//
//   K_eff = K + G * ((r - r0)/(1 - r0))^2 ,  r0 = 1/sqrt(N)
//
// Feeding back raw r instead leaves the loop switched on while the field is still
// disordered, which washes out the lower branch and the field never has a state it
// could fail to hold. With the floor subtracted the system is genuinely bistable:
// for K below about 1.2 both the locked and the incoherent state are stable, so
// coherence persists on its own and a hard enough perturbation destroys it for good.
//
// theta_i is wrapped modulo 2*pi*n_i, not 2*pi, so that phi_i is single-valued.
// The coupling term is unaffected either way; the order parameter is not.

class FieldProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const cfg = options.processorOptions;

    this.N = cfg.partials.length;
    this.n = Float64Array.from(cfg.partials, p => p.n);
    this.amp = Float64Array.from(cfg.partials, p => cfg.coef / p.n);
    this.gL = new Float64Array(this.N);
    this.gR = new Float64Array(this.N);
    for (let i = 0; i < this.N; i++) {
      const a = (cfg.partials[i].pan + 1) * Math.PI / 4;   // equal power
      this.gL[i] = Math.cos(a);
      this.gR[i] = Math.sin(a);
    }

    this.theta = new Float64Array(this.N);
    this.delta = new Float64Array(this.N);
    this.freq  = new Float64Array(this.N);
    this.phi   = new Float64Array(this.N);

    this.f0 = cfg.f0;
    this.f0target = cfg.f0;
    this.out = cfg.out;

    this.K = cfg.params.K;
    this.G = cfg.params.G;
    this.T = cfg.params.T;
    this.D = cfg.params.D;
    this.glide = cfg.params.glideMs;
    this.kickAmt = cfg.params.kick;
    this.running = true;

    this.r = 0; this.psi = 0; this.t = 0; this.blocks = 0;
    this.r0 = 1 / Math.sqrt(this.N);          // incoherent floor for N oscillators
    this.reseed();
    this.scramble(1);

    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'param') {
        this[m.key] = m.value;
        if (m.key === 'D') this.reseed();
      } else if (m.type === 'f0') {
        this.f0target = m.value;
        if (m.kick) this.scramble(Math.min(1, m.kick * this.kickAmt));
      } else if (m.type === 'scramble') {
        this.scramble(m.amount ?? 1);
      } else if (m.type === 'running') {
        this.running = m.value;
      }
    };
  }

  // Natural frequencies are drawn once and then drift slowly: the disorder the
  // field has to overcome is itself a moving target.
  reseed() {
    for (let i = 0; i < this.N; i++) this.delta[i] = (Math.random() * 2 - 1) * this.D;
  }

  scramble(amount) {
    for (let i = 0; i < this.N; i++) {
      const span = 2 * Math.PI * this.n[i];
      this.theta[i] = (this.theta[i] + Math.random() * span * amount) % span;
    }
  }

  order() {
    let sx = 0, sy = 0;
    for (let i = 0; i < this.N; i++) {
      const p = this.theta[i] / this.n[i];
      this.phi[i] = p;
      sx += Math.cos(p); sy += Math.sin(p);
    }
    sx /= this.N; sy /= this.N;
    this.r = Math.sqrt(sx * sx + sy * sy);
    this.psi = Math.atan2(sy, sx);
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const dt = 1 / sampleRate;

    if (!this.running) { L.fill(0); R.fill(0); return true; }

    this.order();
    const r = this.r, psi = this.psi;
    const e = (r - this.r0) / (1 - this.r0);
    const Keff = this.K + this.G * (e > 0 ? e * e : 0);

    // Environment breathes on two slow periods that are themselves harmonic
    // subdivisions of the fundamental: f0/1024 and f0/4096.
    this.t += n * dt;
    const breath = 1
      + 0.8 * Math.sin(2 * Math.PI * (this.f0 / 1024) * this.t)
      + 0.4 * Math.sin(2 * Math.PI * (this.f0 / 4096) * this.t);
    const Teff = this.T * Math.max(0, breath);
    const noiseScale = Math.sqrt(2 * Teff * dt);

    // slow random walk of the natural frequencies
    for (let i = 0; i < this.N; i++) {
      this.delta[i] += (Math.random() * 2 - 1) * this.D * 0.004;
      if (this.delta[i] >  this.D * 1.5) this.delta[i] =  this.D * 1.5;
      if (this.delta[i] < -this.D * 1.5) this.delta[i] = -this.D * 1.5;
    }

    const glideCoef = 1 - Math.exp(-1000 / (this.glide * sampleRate));

    for (let s = 0; s < n; s++) {
      this.f0 += (this.f0target - this.f0) * glideCoef;
      const w0 = 2 * Math.PI * this.f0;
      let l = 0, rr = 0;

      for (let i = 0; i < this.N; i++) {
        const ni = this.n[i];
        const span = 2 * Math.PI * ni;
        const phi = this.theta[i] / ni;

        // reduced-phase velocity, then lifted back to the partial
        const dphi = w0 * (1 + this.delta[i]) - Keff * r * Math.sin(phi - psi);
        let th = this.theta[i] + ni * (dphi * dt + noiseScale * (Math.random() * 2 - 1) * 1.732);
        th %= span;
        if (th < 0) th += span;
        this.theta[i] = th;

        const v = Math.sin(th) * this.amp[i];
        l += v * this.gL[i];
        rr += v * this.gR[i];

        if (s === 0) this.freq[i] = ni * dphi / (2 * Math.PI);
      }

      L[s] = l * this.out;
      R[s] = rr * this.out;
    }

    if ((this.blocks++ & 7) === 0) {
      this.port.postMessage({
        r, psi, f0: this.f0, Keff,
        phi: Array.from(this.phi),
        freq: Array.from(this.freq)
      });
    }
    return true;
  }
}

registerProcessor('field', FieldProcessor);
