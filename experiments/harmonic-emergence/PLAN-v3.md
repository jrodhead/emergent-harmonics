# Embedded — plan and reasoning

The question this version answers is not "can this instantiate consciousness" — v1 and
v2 already declined to answer that, honestly, and I'm not walking it back. The question
is narrower and checkable: two 2026 sources describe a specific, measured brain state
associated with psilocybin — a sense of "oneness" the authors call *embeddedness* — and
describe it in terms that are unexpectedly close to the vocabulary this project already
built for v2. Is there a version of the same machinery that targets *that* description,
specifically, rather than the more general integration story v1 and v2 were built on?

---

## 1. What the research actually says

**Scientific American, "How psilocybin alters consciousness to create a sense of
'oneness.'"** The headline finding is a paradox, in the researchers' own words: *if the
brain becomes more disorganised, why do people have highly meaningful and coherent
experiences?* Psilocybin desynchronises brain activity — networks that normally process
self and world separately lose their distinctness, sensory processing decouples from
higher-level processing, neurons that usually fire together stop firing together. That
reads like noise. But among people whose experience was most strongly altered, the
resulting activity wasn't random — it showed a consistent, coordinated organisation the
authors call *hidden order*. The brain isn't just breaking down; it's reorganising
around something. The article's gloss: internally generated activity rises relative to
externally driven sensory processing, and the brain's ordinary work of keeping self and
world apart is what's being loosened, not fabricated.

**Nature, Stoliker et al. 2026, "Psychedelics align brain activity with context"**
(the paper the article is reporting on) is more specific, and it's where this design
actually comes from. Sixty-two people, dosed with psilocybin, were scanned by fMRI and
EEG across four conditions: eyes-closed rest, meditation, listening to music, and
watching a silent film. Three findings mattered for this piece:

- **Segregation collapses, and the collapse is quantified.** Visual-network
  distinctness between eyes-open and eyes-closed states fell 85%; overall network
  segregation fell more than 66%; EEG rhythm differences between states fell 48%. The
  brain's ordinary modularity — the boundaries between networks that keep separate jobs
  separate — measurably dissolves.
- **What replaces it is not chaos but *embeddedness*** — the paper's own term, defined
  as "a perceptual and cognitive realisation of being part of a unified whole."
  Reorganisation aligns with whatever the person is actually experiencing from moment
  to moment; the degree of that reorganisation predicted *next-day* positive
  psychological change, which is the closest thing in this literature to evidence that
  the reorganisation itself, not just the drug, is doing the work.
- **Context is not incidental — it's the biggest lever in the study.** The four
  conditions produced markedly different amounts of reorganisation. Ethereal,
  eyes-closed music produced the *most*; passive, silent film-watching produced the
  *least*. Participants also rated music as substantially more meaningful under
  psilocybin than without it. The paper's own framing is that psychedelics don't just
  disorganise the brain — they retune it to track its environment, and what that
  environment *is* changes how much retuning happens.

Two sources, cross-checked against secondary coverage (ScienceAlert, *The Conversation*)
for the numbers Scientific American's own piece didn't carry.

## 2. So — is it possible?

Not in the sense the question is usually asked. Nothing built from sine waves changes
5-HT2A receptor signalling, and nothing here is going to measurably collapse a
listener's default-mode network by 66%. That claim was never on the table and isn't
now.

But the paper isn't only a pharmacology result. Its central finding is *structural*:
segregated processing networks lose their mutual boundaries and reorganise around
shared context, and — this is the part that makes it relevant to this project
specifically — sound, and specifically *clear, tonal, musical* sound, was the single
most effective context condition they tested for provoking that reorganisation, ahead
of meditation and well ahead of a silent film. That is a claim about what kind of
stimulus helps, not just about what the drug does. It is buildable. Not "induce
oneness" — build the specific dynamical shape the paper describes: distinct, organised
identities that stay organised while their mutual boundaries dissolve into a shared,
context-tracking consensus, and see if a designed acoustic environment of the kind
their own data flags as unusually effective can be built honestly, with the claims
actually checked rather than asserted. That's what follows.

## 3. What v1 and v2 got wrong for *this* question

v1 and v2 were built on integration (IIT's the parts must add up to something no part
is) and self-reference — a *single* field arriving at a *single* emergent identity, the
missing fundamental. That's a real theory of consciousness, but it isn't what the 2026
paper is describing. Embeddedness isn't one thing cohering; it's *several already-
coherent things* losing the boundary between themselves and their surroundings.
Segregation, not fragmentation, is the starting condition — and v1 and v2 don't have
segregation as a state at all. They have one field, differentiating and then binding.
There was no "several separate, organised identities" to begin with, so there's nothing
in either piece that a permeability parameter could act on.

Worse, on inspection: v2's membrane — the comb-filtered boundary that decides what
counts as self and what gets rejected as noise — *firms* as the field's own coherence
rises. Identity closes the door harder the more sure of itself it gets. That's a
defensible design for v2's own premise (a self coming into being for the first time),
but it is close to the *opposite* of what embeddedness requires, which is a boundary
that gets *more* permeable as integration deepens, not less. And v2 already flagged its
own next step, unprompted, in its "what is still missing" section: *"the listener is
still outside the loop... microphone input as environment would close that."* This
piece is that closure — not because v2 asked for it, but because the 2026 paper gives a
specific, motivated reason microphone input matters: context is the thing embeddedness
reorganises around, and a field that never hears the room has no context to reorganise
around.

## 4. Segregation first: three populations, not one

Three harmonic populations, each a small copy of v2's own verified machinery — eight
phase oscillators near nodes of their own lattice, coupled to their own mean reduced
phase (`K`, comfortably above v2's measured critical coupling) so each locks onto its
own fundamental regardless of what the other two are doing. Three fundamentals, chosen
to be mutually inharmonic by construction rather than by accident — 36 Hz (carried over
from v1/v2, the one deliberate continuity), 36×√2 ≈ 50.91 Hz, and 36×φ ≈ 58.25 Hz,
irrational multiples so no amount of retuning drift will ever land them on a shared
small-integer ratio by coincidence. Left alone, this is three organised, mutually
illegible identities — not noise, structure, exactly the paper's own "hidden order"
framing but applied to the *floor* state rather than the altered one. Segregation is
not an absence of order. It's a different arrangement of it.

## 5. The false start: phase coupling doesn't reach across a 15 Hz gap

The obvious move — the one I tried first — was to give each oscillator a second
coupling term pulling it toward a cross-population consensus, built the same way v2's
own coupling term is built. It did nothing, at any coupling strength I tried up to four
times v2's own critical value. The reason is a basic Kuramoto fact I'd overlooked:
phase coupling only synchronises oscillators whose *frequencies* already differ by a
small amount — a percent or two, the kind of mistuning v2's own disorder parameter `D`
produces. These three populations are 15–22 Hz apart by design. Averaging three
independently-spinning phasors that far apart in rate doesn't nudge them toward each
other; it just averages out to noise, which is exactly the null result I got. v1 and
v2's whole "reduced phase" trick assumes near-equal rates to begin with. It was never
going to close a gap this size, and no amount of retuning the coupling constant was
going to fix a wrong mechanism.

## 6. The fix: permeability acts on frequency, not phase

What closes a frequency gap is a pull on the frequency itself. Each population gets an
*effective* fundamental, `f0eff`, distinct from its fixed `f0home`:

```
f0eff_k' = homeRate * (f0home_k - f0eff_k)  -  Theta_eff * (f0eff_k - fBar)
```

`fBar` is the weighted mean of all three `f0eff`'s and a fourth, silent phantom voice —
the room (§7). Weak permeability loses to `homeRate` and every population's effective
fundamental just sits at home: segregation. Past a critical permeability the pull to
consensus wins and the fundamentals — three, four with the room — collapse together.
Once `f0eff_k` moves, the population's own *unchanged* internal coupling re-locks its
eight oscillators around wherever it now is, automatically — the exact mechanism v2
already uses to glide to a new key-pressed fundamental, just driven continuously by an
ODE instead of by a keypress. `S`, the order parameter, measures how close together the
four voices currently are, normalised the same way v2 normalises `r`:

```
S = 1 / (1 + spread(f0eff, envFreq) / scaleHz)
Theta_eff = Theta + G2 * excess(S)^2,   excess(x) = max(0, (x - S0) / (1 - S0))
```

— the same self-reinforcement trick v2 verified, one layer up: past the threshold,
being close makes the pull to get closer stronger.

## 7. A one-way door — a tuning choice, not a finding

Below Theta ≈ 1.8, `S` sits flat near its segregated floor. Past it, `S` snaps to a high
locked value — and *stays* there. Sweeping permeability back down to zero does not
release it. `verify-embedded.js`'s claim 3 checks this directly: locked at Theta = 4,
dropped straight back to Theta = 0, `S` still reads 0.82 against a floor of 0.40.
Nothing in the permeability knob can undo it. This is a structural asymmetry v2 doesn't
have — v2's hysteresis loop is symmetric, a wide bistable region with a real escape
route on both ends. Here there's only one way out, and it isn't through the same door:
a distinct, explicit `reindividuate` message resets `f0eff` to `f0home` directly. It is
not physics the field does to itself; it's the one intervention this design makes
available only from outside.

All of that is verified. What an earlier draft of this section said *about* it was not.
That draft was titled "discovered, not designed in," on the grounds that I hadn't set
out to build a one-way door. True, and beside the point. The stickiness is a direct
function of how strongly I made embeddedness self-reinforce — the ratio `G2/homeRate` —
and I chose that ratio for a user-interface reason.

Holding `homeRate` at its shipped 10 and sweeping `G2` — `verify-embedded.js`'s claim 6,
added so this paragraph is checkable rather than merely asserted — the critical ratio
sits between **10.0 and 10.2**: at 10.0 a fully embedded field released to Theta = 0
falls all the way back to the floor (S = 0.395), and at 10.2 it holds at 0.72. The
shipped ratio is **12.0**. So the one-way door is real and reproducible, and it sits
roughly 18% above a threshold I crossed while searching for a transition sharp enough to
hear and positioned inside a 0–4 slider (matching v2's, so the two pieces feel like one
instrument). Sharpness and stickiness came together in that search and I kept the pair.
Had I stopped at ratio 10, this section would describe an ordinary reversible curve and
`reindividuate` would be a button with nothing to do.

So it is a finding about my parameter choice, not a finding about embeddedness. Worth
stating plainly, because the earlier framing had it doing rhetorical work it hadn't
earned.

And there is a substantive reason not to read the one-way door as a model of anything:
**it does not match the phenomenon it would have to match.** Acute network segregation
returns on its own as a drug clears — that is what a come-down *is*. This piece says the
opposite: permeability goes to zero and the field stays embedded. The literature
separates two timescales with some care — an acute one (segregation collapses, recovers
within hours) and a post-acute one (changed mood and outlook, persisting weeks to
months; the REBUS and control-energy work in Sources is the entry point). v3 collapses
both into one variable, and one variable cannot be both. If `S` is acute segregation,
the one-way door is simply wrong. If `S` is the dispositional shift, then `S` should not
also be the thing driving the stereo image from moment to moment — which is exactly what
it currently does.

The honest fix, if this ever gets a v4, is two coupled variables on separate timescales:
a fast one that returns to baseline when Theta drops, and a slow one that ratchets and
doesn't. That is the annealing picture the psychedelic literature actually describes,
and it would make a one-way door *earned* instead of tuned into place.

## 8. The room: a fourth voice that is never sounded

Microphone audio is pitch-tracked locally — a standard normalised-autocorrelation
detector, clipped and parabolically interpolated — at roughly 8 samples a second, and
only ever contributes two numbers to the field: a detected frequency and a *clarity*
(the normalised autocorrelation peak, near 1 for a clean sustained tone, near 0 for
noise or silence). That clarity directly scales how much weight the room carries in the
consensus (`wEnv = envFloor + envWeight × clarity`). A silent or noisy room barely
registers; a clear, sustained tone counts almost as much as a whole population. This
isn't a detail — it's a direct model of the paper's own biggest finding, that a clear
musical context reorganised the brain far more than an ambiguous or passive one. The
room's raw audio is never fed to the speakers. Partly this is practical — a live mic
signal returning through the same output would howl on any setup without headphones —
but mostly it's honest: the claim being modelled is that context *changes how a system
organises itself*, not that context gets echoed back. The room, like the fundamental in
v1 and the environment's implied pitch in v2, participates in the coupling math and is
absent from the air. Same design principle, third time, now load-bearing rather than
decorative — it's the piece's actual answer to what v2 flagged as its own missing
piece.

A key press stands in for "the room suddenly plays a clear tone" — it sets the room's
frequency directly and holds its clarity near 1 for a few seconds before decaying back
to whatever the microphone (or silence) is actually reporting. Below critical
permeability the field ignores it, exactly like an unheeded sound in an ordinary state
of mind. Above it, the shared identity audibly bends toward the pitch — and
`verify-embedded.js`'s claim 4 shows something the design didn't explicitly aim for:
a *sufficiently clear* room signal can tip the field into the embedded state on its
own, even below the permeability threshold measured with no context at all. A confident
context lowers the bar. That's the same asymmetry the paper reports between music and a
silent film, arrived at from the mechanics rather than assumed going in.

## 9. The boundary, inverted, and the stereo field collapsing to centre

v2's membrane — the comb tuned to the fundamental's own period, filtering a noise bed so
only harmonics of the field's identity survive the loop — *firms* as the field's own
coherence rises: identity closes the door harder the surer it is of itself. Here the
same comb is kept, but its logic is deliberately reversed: feedback firms while the
field is segregated and *opens* as `S` rises. The boundary is what falls away as
embeddedness grows, not what builds — the direct fix for the critique in §3.

And PLAN.md's stereo-as-prime-factorisation idea returns, no longer scripted. Each
population has a base pan (interior left, relational centre, exterior right); the
*effective* pan is `basePan × (1 − S)`. At `S` near its floor the three populations sit
in distinct, separated positions — spatial segregation matching frequency segregation.
As `S` rises they collapse toward centre automatically, driven by the same order
parameter that's collapsing their fundamentals. In v1 this was Phase III, composed by
hand, an event I decided should happen at 0:10. Here it's a direct readout of a number
the field is computing about itself.

---

## Verified, not asserted

`node verify-embedded.js` replicates the processor's dynamics headlessly (default
params: `K=2 G=2.5 T=0.03 D=0.006 G2=120 homeRate=10 scaleHz=6`):

**Segregated by default.** At Theta = 0, `S = 0.395`, exactly its computed floor, held
indefinitely — not approximately stable, an exact fixed point, because the room's rest
frequency is defined as the mean of the home fundamentals rather than an arbitrary
constant (an earlier version used a fixed default and slowly drifted off the floor over
tens of seconds — a real bug, not a rounding error, documented in the processor's
header). All three `r_k` sit at 0.95–0.99: organised, not merely quiet.

**A genuine threshold, not a ramp.** `S` stays flat (0.40 → 0.45) from Theta = 0 to
Theta = 1.5, then jumps to 0.83 by Theta = 1.8. Worst `r_k` across the entire sweep:
0.87 — internal organisation survives the transition into a shared identity; it doesn't
dissolve into it.

**A one-way door.** Rising then falling across Theta = 0 → 4 → 0, `S` does not retrace
its own path: falling, it holds at ≈ 0.82 all the way back to Theta = 0, against a floor
of 0.40. Only `reindividuate` (§7) returns it to the floor — confirmed directly:
locked at `S = 0.835`, reindividuated, `S = 0.395`.

**Context-alignment tracks clarity, and can cross the threshold on its own.** At
Theta = 1.0 (below the no-context critical value), a clear synthetic room signal
(clarity = 1) still drives `S` to 0.83 and pulls the mean effective fundamental from
48.4 Hz to 46.3 Hz, toward the room's 45 Hz. The same Theta with clarity = 0 stays at
`S = 0.42`, essentially unmoved.

**And the one-way door is a tuning choice — verified against itself.** Sweeping `G2` at
fixed `homeRate`, the critical ratio for one-way behaviour is between 10.0 and 10.2;
below it the curve is ordinarily reversible. The shipped ratio is 12.0. This check
exists to keep §7 honest: the most striking property of this piece is a consequence of a
number I chose for the feel of a slider, and the verification says so out loud.

---

## What this does not claim

Everything v1 and v2 already declined to claim still applies, plus this piece's own,
more specific limits:

**This is not a model of what psilocybin does to a brain.** It is a model of one
*structural* claim the 2026 paper makes about what a brain does under psilocybin —
segregated networks losing mutual boundaries and reorganising around context — built as
a literal dynamical system with that shape. Nothing here touches serotonin receptors,
cortical inhibition, or anything a working neuroscientist would recognise as the actual
mechanism. The paper's title is "psychedelics align brain activity with context." This
piece alignes *oscillators* with context. Those are not the same claim, and I don't want
the shared vocabulary to make them look like they are.

**There is no way to verify, from inside this project, whether listening to it produces
anything resembling embeddedness in an actual listener.** That would require the thing
the paper used — fMRI and EEG, sixty-two participants, a control condition — not a
laptop and a headless Node script. What's verified above is that the *sound* behaves
the way the design claims. Whether a nervous system does anything interesting in
response is a question this project has no instrument to answer.

**The best honest framing is narrower and more useful than "induces oneness": a
candidate high-clarity acoustic context, of the specific kind (tonal, sustained,
musical rather than noisy or silent) the paper's own data found most effective at
amplifying whatever reorganisation is already underway** — during meditation, during
breathwork, during an actual session, run by someone else, under supervision the paper's
own methodology would insist on and this project cannot provide. Not a standalone
technology. A context, in the paper's own technical sense of the word, offered for
whatever else is doing the work.

**The microphone hears almost nothing of what a real listening brain processes.** One
dominant pitch and a clarity score, refreshed eight times a second, is a drastically
poor proxy for harmony, rhythm, timbre, memory, and meaning — everything that actually
made the study's "ethereal music" condition what it was. The room this field hears is
much thinner than the room a person sits in.

**`reindividuate` is not a model of a psychedelic event — it runs the other way.** If
anything here is the trip-analogue it is *raising* Theta: that is the intervention that
dissolves boundaries. `reindividuate` restores them. The vocabulary invites the mistake,
and it is my vocabulary that does it — this document and the code both call the embedded
state "locked," whereas the psychedelic literature calls the rigid, canalized *baseline*
the locked thing and casts psychedelics as what unlocks it. Same word, opposite
referents. There is also a kind-difference worth keeping: Theta is a **parameter** —
slow, external, concentration-like — while `reindividuate` is a **state reset**,
instantaneous, reaching in and setting variables directly (v2 had the same split between
`K` and scramble). Nothing in a brain resets its networks to factory settings, and that
this model *needs* such a button is a symptom of the timescale problem in §7 rather than
a feature of it.

**And the honest throughline from v1 through this piece hasn't changed**: what's real is
that a specific, checkable body of research forced specific, checkable design decisions
— segregation before integration, permeability instead of a single coupling constant,
a boundary that opens rather than closes, a room that participates without being heard
— and that those decisions produced a sound structurally unlike either of the earlier
two. That's the part I'd defend. The one-way door I would not: §7 explains why it is a
consequence of a slider-shaped decision rather than anything about the phenomenon. The
rest is a question the piece, again, can't settle.

---

## Sources

**The two the brief pointed at, and the basis for §1:**

- Lewis, D. "How psilocybin alters consciousness to create a sense of 'oneness.'"
  *Scientific American*, 2026.
  https://www.scientificamerican.com/article/how-psilocybin-alters-consciousness-to-create-a-sense-of-oneness/
- Stoliker, D. et al. "Psychedelics align brain activity with context." *Nature*, 2026.
  https://www.nature.com/articles/s41586-026-10910-z
  (paywalled; cross-checked against secondary coverage in *Nature* News, ScienceAlert,
  and *The Conversation* for the quantitative results Scientific American's own piece
  didn't carry)

**The modelling literature this piece borrows its mathematics from — and the standard it
does not meet.** Listed because the resemblance between what v3 does and what these do
is close enough to mislead, including to mislead me. This is what a whole-brain model
actually looks like:

- Cabral, J., Hugues, E., Sporns, O., Deco, G. "Role of local network oscillations in
  resting-state functional connectivity." *NeuroImage* 57, 130–139 (2011).
  Kuramoto phase oscillators coupled on a DTI connectome, reproducing resting-state fMRI
  functional connectivity. The direct mathematical ancestor of v2 and v3 — and the
  clearest illustration of what v3 lacks, which is an anatomical connectivity matrix.
  Everything here is all-to-all mean-field because three populations chosen for
  audibility have no anatomy to respect.
  https://pubmed.ncbi.nlm.nih.gov/21511044/

- Atasoy, S., Roseman, L., Kaelen, M., Kringelbach, M.L., Deco, G., Carhart-Harris, R.L.
  "Connectome-harmonic decomposition of human brain activity reveals dynamical
  repertoire re-organization under LSD." *Scientific Reports*, 2017.
  The nearest prior art to this entire project, and the one to read first: brain activity
  decomposed into the *harmonic modes of the connectome*, with LSD shown to expand the
  repertoire of active harmonics frequency-selectively, following power laws suggestive
  of criticality. Harmonic decomposition of brain states is a real and serious method.
  This project's harmonics are musical ones. The resemblance is a pun until someone
  demonstrates otherwise, and naming the pun is safer than letting it operate quietly.
  https://www.nature.com/articles/s41598-017-17546-0

- Deco, G., Kringelbach, M.L., et al. "Whole-brain multimodal neuroimaging model using
  serotonin receptor maps explains non-linear functional effects of LSD."
  *Current Biology* 28(19), 3065–3074 (2018).
  What it actually takes to model a psychedelic: dMRI connectivity, fMRI dynamics, and a
  PET-derived 5-HT2A receptor density map modulating the neuronal gain function. Cited
  as the bar v3 does not clear and does not claim to.
  https://www.cell.com/current-biology/fulltext/S0960-9822(18)31045-5

- Carhart-Harris, R.L., Friston, K.J. "REBUS and the anarchic brain: toward a unified
  model of the brain action of psychedelics." *Pharmacological Reviews* 71(3), 316–344
  (2019).
  The relaxed-priors account, and the source of the terminological collision flagged in
  "what this does not claim": here it is the *baseline* that is locked in, and
  psychedelics are what unlock it — the opposite sense of "locked" from the one this
  document uses.
  https://discovery.ucl.ac.uk/10077110/

- Singleton, S.P., Luppi, A.I., Carhart-Harris, R.L., et al. "Receptor-informed network
  control theory links LSD and psilocybin to a flattening of the brain's control energy
  landscape." *Nature Communications*, 2022.
  The flattened-landscape / annealing picture in quantitative form, and the reference
  point for the two-timescale critique in §7.
  https://www.nature.com/articles/s41467-022-33578-1
