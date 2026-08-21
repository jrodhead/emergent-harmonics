const FORM_FIELDS = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];

/**
 * Whether the key event landed in something the user is typing or tabbing
 * through, in which case the key belongs to that field and not to a note.
 *
 * @param {KeyboardEvent} ev
 * @returns {boolean}
 */
export const isTypingTarget = (ev) => FORM_FIELDS.includes(ev.target?.tagName)
  || ev.target?.isContentEditable === true;

/**
 * Whether a key event should be ignored by the playing keyboard: while the
 * configuration screen is open, or while a form field has focus.
 *
 * @param {KeyboardEvent} ev
 * @returns {boolean}
 */
export const shouldIgnoreKeyEvent = (ev) => document.body.dataset.view === 'config' || isTypingTarget(ev);
