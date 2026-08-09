import { heldRootKeys } from './heldKeysState.js';
import { currentPlayMode } from './playModeHandler.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { selectRootNote } from '../system/buildSystem.js';
import { isValidRootIndex } from '../system/state.js';

const rootKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const dispatchRootReleased = () => {
  document.body.dispatchEvent(new CustomEvent('rootReleased'));
};

const handleRootKey = (ev, rootIndex, key) => {
  if (ev === 'keydown') {
    if (!isValidRootIndex(rootIndex)) {
      console.error('Invalid root index:', rootIndex);
      return;
    }

    heldRootKeys.add(key);
    // Regenerates the key map, which resyncs any already-held note keys.
    selectRootNote(rootIndex);
  } else if (ev === 'keyup') {
    heldRootKeys.delete(key);

    if (currentPlayMode === 'hold' && heldRootKeys.size === 0) {
      dispatchRootReleased();
    }
  }
};

const onRootKeyEvent = (ev) => {
  if (ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  const rootIndex = rootKeys.indexOf(ev.key);

  if (rootIndex !== -1) {
    handleRootKey(ev.type, rootIndex, ev.key);
  }
};

document.body.addEventListener('keydown', onRootKeyEvent);
document.body.addEventListener('keyup', onRootKeyEvent);
