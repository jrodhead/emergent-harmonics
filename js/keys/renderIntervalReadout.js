import { formatBeat, formatCents, formatPartial, formatRatio } from '../format.js';

/**
 * Draws what the sounding voices are to each other: the interval, how far it
 * sits from the ratio it is being called, and the beat that difference makes.
 *
 * The beat is the only number here a player can check with their ears, so
 * whether it can be heard at all is shown rather than assumed — see the
 * inaudible cases below.
 */

const PROMPT = 'Hold two notes to see the interval between them.';

/** Why a beat that is real arithmetic would not be real sound. */
const inaudibleBecause = ({ simple, partials }, waveShape) => {
  if (!simple) return null;
  if (simple.numerator === 1 && simple.denominator === 1) return null;

  if (waveShape === 'sine') {
    return 'a sine has no partials above its fundamental to beat with';
  }

  return `between the ${formatPartial(partials.lower)} and ${formatPartial(partials.upper)} partials, too high to hear`;
};

/** Which harmonics the beat is between, or that it is the fundamentals themselves. */
const partialsCell = ({ simple, partials }) => {
  if (!simple) return '';
  if (partials.lower === 1 && partials.upper === 1) return 'between the fundamentals';

  return `${formatPartial(partials.lower)} × ${formatPartial(partials.upper)} partial`;
};

const renderRow = ({ lowerLabel, upperLabel, interval }, waveShape) => {
  const { simple, cents, ratio, beatHz, fundamentalsHz, audible } = interval;

  const reason = audible.beat ? null : inaudibleBecause(interval, waveShape);

  // The size of the interval when it has no name, the distance from the name
  // when it has one. Both are cents and they are not the same claim, so each
  // says which it is on hover.
  const centsCell = simple
    ? `<span class="interval-cents" title="how far from ${simple.numerator}/${simple.denominator}">${formatCents(simple.deviationCents)}</span>`
    : `<span class="interval-cents" title="the size of the interval">${Math.round(cents)} cents</span>`;

  const beatCell = simple
    ? `<span class="interval-beat${audible.beat ? '' : ' inaudible'}"${reason ? ` title="${reason}"` : ''}>${formatBeat(beatHz)}</span>`
    : '<span class="interval-beat">—</span>';

  const roughness = audible.roughness
    ? `<span class="interval-roughness">fundamentals ${formatBeat(Math.abs(fundamentalsHz))} apart</span>`
    : '';

  return `
    <div class="interval-row">
      <span class="interval-keys">${lowerLabel} · ${upperLabel}</span>
      <span class="interval-ratio">${simple ? `${simple.numerator}/${simple.denominator}` : 'no simple ratio'}</span>
      <span class="interval-decimal">${formatRatio(ratio)}</span>
      ${centsCell}
      ${beatCell}
      <span class="interval-partials">${partialsCell(interval)}</span>
      ${roughness}
    </div>
  `;
};

/**
 * @param {Array} rows - { lowerLabel, upperLabel, interval }, lowest pair first.
 * @param {number} [hiddenCount] - Pairs left off the end of a large chord.
 * @param {string} [waveShape] - What they are sounding on, for the reason an
 *   inaudible beat is inaudible.
 */
export function renderIntervalReadout(rows, { hiddenCount = 0, waveShape } = {}) {
  const readout = document.getElementById('intervalReadout');
  if (!readout) return;

  // An empty box says nothing about why it is empty.
  if (rows.length === 0) {
    readout.innerHTML = `<h2>Intervals</h2><div class="interval-prompt">${PROMPT}</div>`;
    return;
  }

  const more = hiddenCount > 0
    ? `<div class="interval-more">+ ${hiddenCount} more</div>`
    : '';

  readout.innerHTML = `
    <h2>Intervals</h2>
    ${rows.map((row) => renderRow(row, waveShape)).join('')}
    ${more}
  `;
}
