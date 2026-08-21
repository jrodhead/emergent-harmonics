/**
 * Whether the sustain pedal is down. Kept in its own module so the pedal
 * handler and the note keys can both read it without importing each other.
 */
export let pedalDown = false;

export const setPedalDown = (down) => {
  pedalDown = down;
};
