import {
  getConfig,
  noteBounds,
  ratioToFrequency,
  triadTypeOptions,
  canRemoveNote,
  MIN_RATIO,
  MAX_RATIO,
} from './systemConfigState.js';
import { getSelectedScale } from './selectedScale.js';
import { PREVIEW_KEYS, PREVIEW_KEY_ROWS, previewKeyForIndex } from './previewKeyHandler.js';
import { MAX_ROOT_NOTES } from '../system/generateSystem.js';
import { formatFrequency, formatRatio, describeRatio } from '../format.js';

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const renderScaleTabs = (selectedScaleId) => {
  const config = getConfig();
  // The system needs at least one scale to generate from.
  const onlyScale = config.scales.length === 1;

  return `
    <h2>Scales</h2>
    <div class="config-scale-tabs">
      ${config.scales.map((scale) => `
        <div class="config-scale-tab${scale.id === selectedScaleId ? ' selected' : ''}">
          <button type="button" class="config-scale-select" data-scale-id="${escapeHtml(scale.id)}">
            <span class="config-scale-name">${escapeHtml(scale.name)}</span>
            <span class="config-scale-count">${scale.notes.length} notes</span>
            ${scale.id === config.primaryScaleId ? '<span class="config-scale-primary">primary</span>' : ''}
          </button>
          <button type="button" class="config-scale-remove" data-scale-id="${escapeHtml(scale.id)}"
                  title="${onlyScale ? 'A system needs at least one scale' : `Delete ${escapeHtml(scale.name)}`}"
                  ${onlyScale ? 'disabled' : ''}>&#10005;</button>
        </div>
      `).join('')}
      <button type="button" id="addScale" class="config-add config-add-scale">+ Add scale</button>
    </div>
  `;
};

export const renderTriadTypeOptions = (selectedTriadType) => {
  const { configured, builtIn } = triadTypeOptions();
  const option = ({ value, label }) => `
    <option value="${escapeHtml(value)}"${value === selectedTriadType ? ' selected' : ''}>${escapeHtml(label)}</option>
  `;

  // A select with no matching option would quietly show its first one instead,
  // which would misreport what the note is actually set to.
  const unmatched = ![...configured, ...builtIn].some(({ value }) => value === selectedTriadType);

  return `
    ${unmatched ? option({ value: selectedTriadType, label: `${selectedTriadType} (unknown)` }) : ''}
    <optgroup label="Configured scales">${configured.map(option).join('')}</optgroup>
    <optgroup label="Built-in calculators">${builtIn.map(option).join('')}</optgroup>
  `;
};

export const renderNote = (note, noteIndex) => {
  const { minimum, maximum } = noteBounds();
  const frequency = ratioToFrequency(note.ratioToRoot);
  const removable = canRemoveNote(noteIndex);
  const previewKey = previewKeyForIndex(noteIndex);

  // Laid out as a mixer channel strip: the notes run across the screen, and
  // each note's controls stack down its own track around a tall fader.
  return `
    <div class="config-note" data-note-index="${noteIndex}">
      <div class="config-note-heading">
        <span class="config-note-degree">${escapeHtml(note.degree)}</span>
        <button type="button" class="config-note-remove"
                title="${removable ? 'Remove this note' : 'The root of the scale cannot be removed'}"
                ${removable ? '' : 'disabled'}>&#10005;</button>
      </div>

      <div class="config-note-fields">
        <label>Name
          <input type="text" class="config-note-name" value="${escapeHtml(note.relationshipToRootName)}"
                 data-derived="${note.relationshipToRootName === describeRatio(note.ratioToRoot)}">
        </label>

        <label>Ratio to root
          <input type="number" class="config-note-ratio"
                 min="${MIN_RATIO}" max="${MAX_RATIO}" step="0.0001" value="${formatRatio(note.ratioToRoot)}">
        </label>

        <label>Triad type
          <select class="config-note-triad" title="${escapeHtml(note.triadType)}">
            ${renderTriadTypeOptions(note.triadType)}
          </select>
        </label>
      </div>

      <div class="config-note-fader">
        <span class="config-note-scale">${formatFrequency(maximum)}</span>
        <input type="range" class="config-note-slider" orient="vertical"
               min="${minimum}" max="${maximum}" step="0.01" value="${frequency}"
               aria-label="Frequency for ${escapeHtml(note.degree)}">
        <span class="config-note-scale">${formatFrequency(minimum)}</span>
      </div>

      <label class="config-note-readout">
        <input type="number" class="config-note-hz"
               min="${formatFrequency(minimum)}" max="${formatFrequency(maximum)}" step="0.01"
               value="${formatFrequency(frequency)}">Hz
      </label>

      ${previewKey
        ? `<div class="config-note-key" title="Hold ${escapeHtml(previewKey)} to hear this note">${escapeHtml(previewKey)}</div>`
        : '<div class="config-note-key none" title="Past the last preview key">&mdash;</div>'}
    </div>
  `;
};

export const renderNotes = (scale) => {
  const config = getConfig();
  const { minimum, maximum } = noteBounds();
  const isPrimary = scale.id === config.primaryScaleId;
  const overflowsRootKeys = isPrimary && scale.notes.length > MAX_ROOT_NOTES;
  const repeatsOnRootKeys = isPrimary && scale.notes.length < MAX_ROOT_NOTES;
  const overflowsPreviewKeys = scale.notes.length > PREVIEW_KEYS.length;

  // Named by their ends rather than key by key: there are three rows of them.
  const previewRows = PREVIEW_KEY_ROWS
    .map((row) => `<kbd>${escapeHtml(row[0])}</kbd>&ndash;<kbd>${escapeHtml(row[row.length - 1])}</kbd>`)
    .join(', ');

  return `
    <h2>Notes</h2>
    <div class="config-scale-header">
      <label>Scale name
        <input type="text" id="scaleName" value="${escapeHtml(scale.name)}">
      </label>
      <label>
        <input type="radio" name="primaryScale" id="primaryScale"${isPrimary ? ' checked' : ''}>
        Primary (generates the root notes on keys 0-9)
      </label>
    </div>

    <p class="config-hint">
      Every note sits between the root and its octave: ${formatFrequency(minimum)}Hz to ${formatFrequency(maximum)}Hz.
      Hold the key shown on a note to hear it; the notes run across the keyboard rows ${previewRows}.
      ${overflowsRootKeys
        ? `<strong>Only the first ${MAX_ROOT_NOTES} notes get a root key</strong>, since the roots live on keys 0-9.</br>`
        : ''}
      ${repeatsOnRootKeys
        ? `Keys ${scale.notes.length}-${MAX_ROOT_NOTES - 1} repeat these notes an octave higher each time round,
           so every root key has a note to build from.</br>`
        : ''}
      ${overflowsPreviewKeys
        ? `<strong>Only the first ${PREVIEW_KEYS.length} notes can be previewed</strong>, since the top row runs out.`
        : ''}
    </p>

    <div class="config-note-list">
      ${scale.notes.map(renderNote).join('')}
      <button type="button" id="addNote" class="config-note config-add">+ Add note</button>
    </div>
  `;
};

/**
 * Redraws the editable part of the configuration screen. The toolbar is static
 * markup so that typing in it is never interrupted by a redraw.
 */
export function renderSystemConfig() {
  const scale = getSelectedScale();

  document.getElementById('configScales').innerHTML = renderScaleTabs(scale.id);
  document.getElementById('configNotes').innerHTML = renderNotes(scale);
}
