import { MAX_PARTIALS } from '../system/consonance.js';

/**
 * Draws how locked the current sonority is, and says what it means by that.
 *
 * The measure is named on screen rather than in the documentation, because
 * there is no single correct measure of consonance and a bare percentage with
 * no stated basis is a number pretending to be a fact.
 */

const PROMPT = 'Play something to measure how locked it is.';

// The bands are for reading the bar at a glance, not for precision — the
// percentage beside them is the actual reading.
const BANDS = [
  { from: 0.9, label: 'locked' },
  { from: 0.75, label: 'ringing' },
  { from: 0.5, label: 'restless' },
  { from: 0.25, label: 'rough' },
  { from: 0, label: 'grinding' },
];

const bandFor = (smoothness) => BANDS.find(({ from }) => smoothness >= from).label;

/** A sine has one partial, so there is nothing for the model to weigh but fundamentals. */
const basis = (waveShape) => (waveShape === 'sine'
  ? 'fundamentals only — a sine has no partials to grind'
  : `first ${MAX_PARTIALS} partials of a ${waveShape}`);

/**
 * @param {object|null} consonance - The reading from consonanceOf, or null when
 *   nothing is sounding.
 * @param {string} [waveShape] - What it was measured on, which changes the answer.
 */
export function renderConsonanceMeter(consonance, { waveShape } = {}) {
  const meter = document.getElementById('consonanceMeter');
  if (!meter) return;

  if (!consonance) {
    meter.innerHTML = `<h2>Consonance</h2><div class="consonance-prompt">${PROMPT}</div>`;
    return;
  }

  const { smoothness } = consonance;
  const percent = Math.round(smoothness * 100);

  meter.innerHTML = `
    <h2>Consonance</h2>
    <div class="consonance-body">
      <div class="consonance-bar" role="meter" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="consonance-fill" style="width: ${percent}%"></div>
      </div>
      <span class="consonance-value">${percent}%</span>
      <span class="consonance-band">${bandFor(smoothness)}</span>
      <span class="consonance-measure">Plomp–Levelt roughness per voice pair, ${basis(waveShape)},
        against a semitone dyad at 220&nbsp;Hz</span>
    </div>
  `;
}
