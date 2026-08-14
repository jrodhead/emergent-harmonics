import { stopAllSounds } from '../audio/audioHandler.js';
import { heldRootKeys, heldNoteKeys } from '../keys/heldKeysState.js';
import { liftPedal } from '../keys/sustainPedalHandler.js';

const VIEWS = ['config', 'play'];

/**
 * Switches between the configuration screen and the playing keyboard. Any key
 * held while the view changes never gets its keyup, so held state is cleared.
 *
 * @param {string} view - 'config' or 'play'.
 */
export function showView(view) {
  if (!VIEWS.includes(view)) return;

  document.body.dataset.view = view;

  // The pedal goes up first so that whatever it was holding is handed back
  // before everything is stopped, rather than being left in its own set.
  liftPedal();
  stopAllSounds();
  heldRootKeys.clear();
  heldNoteKeys.clear();
  document.querySelectorAll('.note.active, .config-note.active').forEach((element) => {
    element.classList.remove('active');
  });

  document.querySelectorAll('[data-show-view]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.showView === view);
  });
}

export function initViewToggle(startingView = 'config') {
  document.querySelectorAll('[data-show-view]').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.showView));
  });

  showView(startingView);
}
