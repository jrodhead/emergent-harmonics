# Field — plan and reasoning

The second version of the same premise. Where *Ascension* is a fixed schedule of 26
events, this is a running dynamical system with no schedule at all. It exists because
the first one failed its own argument, in a specific way.

---

## What was wrong with v1

Every theory the first passage invoked requires the state at time *t* to depend on the
state at *t−1*. But every event's time and frequency was determined before the first
sample played. Phase IV *depicted* self-reference — the difference tones really did
reproduce the opening voice — but nothing in the system listened to them or responded.
It played identically every time, which means it had no state, which means there was
nothing there to integrate.

Worse, it asserted the conclusion. I claimed phase III was binding, but the binding was
mine: I typed exact integers into a file. The partials did not find each other. They
were placed.

## The fix: make the harmonic series something the system discovers

Eighteen phase oscillators. Each sits near a node of the 36 Hz lattice but is mistuned
off it by disorder **D**, so left alone they drift apart and the texture is an
inharmonic cloud.

Coupling them the ordinary way would be wrong. Standard Kuramoto coupling drives a
population toward a *common frequency* — a unison, which destroys the harmonic structure
rather than creating it. What I want is for them to lock into exact integer *ratios*.

So the coupling acts not on each oscillator's phase but on its **reduced phase**:

```
phi_i = theta_i / n_i
```

which is the phase of the fundamental that voice implies. Two oscillators agree when
their implied fundamentals agree — and that condition is exactly frequency ratio
n_i : n_j. Coupling on phi therefore synchronises the ensemble onto a shared
fundamental, which forces exact integer ratios as a consequence:

```
phi_i' = 2*pi*f0*(1 + delta_i)  -  K_eff * r * sin(phi_i - Psi)  +  noise
theta_i' = n_i * phi_i'
r * e^{i*Psi} = (1/N) * sum_j e^{i*phi_j}
```

This is mean-field Kuramoto lifted onto the harmonic lattice, so it is O(N) per sample
and keeps the classic second-order phase transition at a critical coupling. Below K_c
the field stays incoherent; above it, synchrony appears spontaneously.

**The order parameter is the missing fundamental.** In v1 the missing fundamental was a
psychoacoustic trick in the last six seconds. Here `r` — the length of the mean vector
of the implied fundamentals — *is* the degree to which eighteen voices agree on a pitch
none of them plays. The concept and the state variable turned out to be the same object,
which is the moment the design stopped fighting me.

One implementation note that matters: `theta_i` is wrapped modulo `2*pi*n_i` rather than
`2*pi`, so that `phi_i` is single-valued. The coupling term is invariant either way; the
order parameter is not.

## Making the state losable

`K_eff = K + G*r` was the obvious way to make coherence self-reinforcing. It does not
work, and the reason is worth recording: an incoherent ensemble of N oscillators does not
sit at r = 0 but at the finite-size floor `1/sqrt(N)`, here 0.236. Feeding back raw `r`
leaves the loop switched on while the field is still disordered, the lower branch washes
out, and the system has no state it could fail to hold.

Counting only order in *excess* of that floor, squared:

```
K_eff = K + G * ((r - r0)/(1 - r0))^2 ,   r0 = 1/sqrt(N)
```

produces a genuine saddle-node. Below about K = 1.2 both the locked and the incoherent
state are stable at the same parameter values.

This is the part that answers "nothing can fail." The field can now be in one of two
states under identical settings, and which one it is in depends on what has happened to
it. That is the minimum condition for saying it has a history.

## The membrane

The oscillator bank and a bed of broadband noise are mixed together and passed through a
comb filter with delay 1/f0 — 27.8 ms at 36 Hz. That loop reinforces exactly the partials
of the fundamental and cancels everything else, so the noise is not filtered by a curve
someone drew: it is filtered by the fundamental's own period. Components of the
environment that happen to be harmonic are admitted and absorbed; the rest is rejected.

The membrane's feedback tracks `r`, so the boundary is weak while the field is
disordered and firms up as identity coheres. This was the layer v1 skipped entirely —
it started at integration, when every account of a minimal organism makes the
inside/outside distinction prior to it. And it makes the fundamental causally present in
the signal path while still never being sounded.

## Nested time

Temperature is modulated by two very slow oscillators at f0/1024 (28 s) and f0/4096
(114 s) — harmonic subdivisions of the same fundamental, so the same integer lattice
governs the rhythm of the environment and the pitches of the field. v1 generated its
time unit once from the opening beat and then abandoned it; every duration after that
was a number I typed.

The rest of the temporal structure is not composed at all. Near the transition,
oscillators drift in and out of lock and produce slow amplitude fluctuations at the
mismatch frequencies. Those beat patterns are the field's own timescales, and they change
as it approaches coherence.

## Keys perturb, they do not trigger

A key sets a new target fundamental — glided over 800 ms, so the voices *slide*, going
transiently inharmonic and re-locking. That is entrainment as a process rather than a
schedule, and it is the frequency-domain motion v1 gave up when it banned attacks.

A press also scrambles phases in proportion to the size of the jump. So a key is a
disturbance the field has to recover from, and whether it recovers depends on where K is.
Below the critical coupling, pressing a key can end the coherent state permanently.

---

## Verified, not asserted

`node verify.js` replicates the processor's dynamics headlessly and checks the four
claims. Results at the shipped defaults (G = 2.5, T = 0.03, D = 0.006, N = 18):

**Hysteresis.** Rising K, the field is incoherent at 0.0–0.6 (r ≈ 0.09–0.18) and locks
by K = 0.9 (r ≈ 0.96). Falling back down it stays locked all the way to K = 0
(r ≈ 0.95). Same K, two states, decided by history.

**The state is losable.** Scrambling a locked field at K = 0 drops it to r = 0.26 and it
does not return. At K = 1.2 and above the same scramble heals completely within seconds.
Below the critical coupling, damage is permanent.

**Temperature melts it.** Holding K = 0.6 inside the bistable region: r = 0.94 at
T = 0.03, still 0.94 at T = 0.10, degrading to 0.61 at T = 0.20, melted to 0.34 at
T = 0.35. Coherence is maintained against the environment, up to a point.

**The ratios are exact.** Locked at r = 0.98, the eighteen implied fundamentals stay
within **1.1 cents** of each other over two seconds. The harmonic series is arrived at,
not imposed — the integers in `field.json` say where each voice starts, not where it ends
up.

---

## What is still missing

Honesty about the remaining gaps, since that is what produced this version.

**The listener is still outside the loop.** The field is coupled to itself and to a noise
bed, but not to the room. Microphone input as environment would close that, and it is the
change I would make next.

**Nothing is modelled.** The field maintains and repairs a state, which is homeostasis,
not prediction. There is no internal representation of the environment and therefore
nothing that could be surprised. Every serious modern account of these questions is built
on prediction error, and the field has none.

**Eighteen oscillators is a small number.** The finite-size floor at 0.236 is large enough
that the transition is visibly noisy, and near K_c the field flickers. That flicker is
honest physics rather than a bug, but a system of a few hundred voices would have a much
sharper transition and a much cleaner claim.

**And it is still not conscious.** The premise remains a premise. What changed between
v1 and v2 is that this one is a dynamical system with an attractor, a memory, a boundary
and a failure mode, rather than a recording that describes those things. That is a real
distinction, and it is audible, which is the only part of this I would actually defend.
