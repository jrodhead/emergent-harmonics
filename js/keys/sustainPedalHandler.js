import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { pedalDown, setPedalDown } from './sustainPedalState.js';

// The spacebar, being the one key big enough to hold with a thumb while both
// hands go on playing.
const PEDAL_KEY = ' ';

const displayPedal = () => {
  const display = document.getElementById('sustainPedal');
  if (display) {
    display.textContent = pedalDown ? 'down' : 'up';
  }

  document.getElementById('sustainPedalTable')?.classList.toggle('active', pedalDown);
};

const setPedal = (down) => {
  if (down === pedalDown) return;

  setPedalDown(down);
  displayPedal();
  document.body.dispatchEvent(new CustomEvent(down ? 'pedalDown' : 'pedalUp'));
};

/** Lifts the pedal from somewhere other than the key, and stays quiet if it was already up. */
export const liftPedal = () => setPedal(false);

document.body.addEventListener('keydown', (ev) => {
  if (ev.key !== PEDAL_KEY || ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  // Space scrolls the page and presses whatever button has focus, neither of
  // which is what a pedal is for.
  ev.preventDefault();
  setPedal(true);
});

// Deliberately unguarded, unlike every other key here: a pedal that cannot be
// lifted is the worst thing this can do, and focus can move between the press
// and the release.
document.body.addEventListener('keyup', (ev) => {
  if (ev.key === PEDAL_KEY) liftPedal();
});

// Alt-tabbing away with the pedal down never delivers the keyup.
window.addEventListener('blur', liftPedal);

displayPedal();
