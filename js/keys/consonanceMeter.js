import { soundingVoices, subscribeToSounding } from '../audio/audioHandler.js';
import { consonanceOf } from '../system/consonance.js';
import { renderConsonanceMeter } from './renderConsonanceMeter.js';

/**
 * The consonance meter: one number over everything sounding.
 *
 * A sibling of the interval readout rather than part of it. Both read the same
 * set of voices from the audio layer, but they answer different questions and
 * neither makes the other redundant: the readout says *what* two voices are to
 * each other and how fast they beat, and this says how rough the whole sonority
 * is. A fifth two cents narrow beats audibly and is barely rough at all, which
 * is exactly why it takes both to describe it.
 *
 * Its own subscription rather than a shared one, so the two displays stay
 * independent — the audio layer holds a set of listeners precisely so it can
 * have more than one.
 */

let drawScheduled = false;

const waveShape = () => document.getElementById('waveShape')?.value;

const draw = () => {
  drawScheduled = false;

  const shape = waveShape();
  const frequencies = soundingVoices().map(({ frequency }) => frequency);

  renderConsonanceMeter(consonanceOf(frequencies, { waveShape: shape }), { waveShape: shape });
};

/** One draw per frame however many voices changed, exactly as the readout does. */
const scheduleDraw = () => {
  if (drawScheduled) return;

  drawScheduled = true;
  requestAnimationFrame(draw);
};

subscribeToSounding(scheduleDraw);

// Not a sounding change, but it changes the answer more than anything else
// here: the whole measure is about partials, and the wave shape is what decides
// whether there are any.
document.getElementById('waveShape')?.addEventListener('change', scheduleDraw);

draw();
