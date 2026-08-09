import {
  getConfig,
  diapasonBounds,
  ratioToFrequency,
  triadTypeOptions,
  canRemoveNote,
  MIN_RATIO,
  MAX_RATIO,
} from './systemConfigState.js';
import { getSelectedDiapason } from './selectedDiapason.js';
import { PREVIEW_KEYS, previewKeyForIndex } from './previewKeyHandler.js';
import { MAX_ROOT_NOTES } from '../scaleCalculators/musicalSystemGenerator.js';
import { formatFrequency, formatRatio, describeRatio } from '../format.js';

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const renderDiapasonTabs = (selectedDiapasonId) => {
  const config = getConfig();
  // The system needs at least one diapason to generate from.
  const onlyDiapason = config.diapasons.length === 1;

  return `
    <h2>Diapasons</h2>
    <div class="config-diapason-tabs">
      ${config.diapasons.map((diapason) => `
        <div class="config-diapason-tab${diapason.id === selectedDiapasonId ? ' selected' : ''}">
          <button type="button" class="config-diapason-select" data-diapason-id="${escapeHtml(diapason.id)}">
            <span class="config-diapason-name">${escapeHtml(diapason.name)}</span>
            <span class="config-diapason-count">${diapason.notes.length} notes</span>
            ${diapason.id === config.primaryDiapasonId ? '<span class="config-diapason-primary">primary</span>' : ''}
          </button>
          <button type="button" class="config-diapason-remove" data-diapason-id="${escapeHtml(diapason.id)}"
                  title="${onlyDiapason ? 'A system needs at least one diapason' : `Delete ${escapeHtml(diapason.name)}`}"
                  ${onlyDiapason ? 'disabled' : ''}>&#10005;</button>
        </div>
      `).join('')}
      <button type="button" id="addDiapason" class="config-add config-add-diapason">+ Add diapason</button>
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
    <optgroup label="Configured diapasons">${configured.map(option).join('')}</optgroup>
    <optgroup label="Built-in calculators">${builtIn.map(option).join('')}</optgroup>
  `;
};

export const renderNote = (note, noteIndex) => {
  const { minimum, maximum } = diapasonBounds();
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
                title="${removable ? 'Remove this note' : 'The root of the diapason cannot be removed'}"
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

export const renderNotes = (diapason) => {
  const config = getConfig();
  const { minimum, maximum } = diapasonBounds();
  const isPrimary = diapason.id === config.primaryDiapasonId;
  const overflowsRootKeys = isPrimary && diapason.notes.length > MAX_ROOT_NOTES;
  const overflowsPreviewKeys = diapason.notes.length > PREVIEW_KEYS.length;

  return `
    <h2>Notes</h2>
    <div class="config-diapason-header">
      <label>Diapason name
        <input type="text" id="diapasonName" value="${escapeHtml(diapason.name)}">
      </label>
      <label>
        <input type="radio" name="primaryDiapason" id="primaryDiapason"${isPrimary ? ' checked' : ''}>
        Primary (generates the root notes on keys 0-9)
      </label>
    </div>

    <p class="config-hint">
      Every note sits between the root and its octave: ${formatFrequency(minimum)}Hz to ${formatFrequency(maximum)}Hz.
      Hold the key shown on a note to hear it, using the top row
      <kbd>${PREVIEW_KEYS.map(escapeHtml).join('</kbd> <kbd>')}</kbd>.
      ${overflowsRootKeys
        ? `<strong>Only the first ${MAX_ROOT_NOTES} notes get a root key</strong>, since the roots live on keys 0-9.</br>`
        : ''}
      ${overflowsPreviewKeys
        ? `<strong>Only the first ${PREVIEW_KEYS.length} notes can be previewed</strong>, since the top row runs out.`
        : ''}
    </p>

    <div class="config-note-list">
      ${diapason.notes.map(renderNote).join('')}
      <button type="button" id="addNote" class="config-note config-add">+ Add note</button>
    </div>
  `;
};

/**
 * Redraws the editable part of the configuration screen. The toolbar is static
 * markup so that typing in it is never interrupted by a redraw.
 */
export function renderSystemConfig() {
  const diapason = getSelectedDiapason();

  document.getElementById('configDiapasons').innerHTML = renderDiapasonTabs(diapason.id);
  document.getElementById('configNotes').innerHTML = renderNotes(diapason);
}
