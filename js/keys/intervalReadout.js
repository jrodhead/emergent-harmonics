import { soundingVoices, subscribeToSounding } from '../audio/audioHandler.js';
import { describeInterval } from '../system/interval.js';
import { renderIntervalReadout } from './renderIntervalReadout.js';

/**
 * The interval readout: what every sounding voice is to the one below it.
 *
 * It listens to the audio layer and to nothing else. Every playing rule in the
 * app — a note key, a root change, a register change, hold mode, the pedal, the
 * drone, the panic stops — ends in a call to playSound, stopSound,
 * setSoundFrequency or releaseSustainedVoices, so one subscription covers all
 * of them without this module knowing any of them exist.
 */

// Thirty note keys and a drone are reachable, and forty-odd rows would push the
// keyboard off the screen.
const MAX_ROWS = 12;

/**
 * What to call each voice. Note keys are always a single character; the drone's
 * voices are the only other thing that reaches the audio layer, and they arrive
 * as ids rather than keys.
 *
 * The drone's are numbered in pitch order, so a stereo pair reads as `drone 1`
 * and `drone 2` rather than as two rows both labelled `drone`. A drone sounding
 * on its own is just `drone`: a number would be answering a question nobody
 * asked.
 */
const labelsFor = (voices) => {
  const labels = new Map();
  const drones = voices
    .filter(({ key }) => key?.length !== 1)
    .sort((first, second) => first.frequency - second.frequency);

  drones.forEach(({ key }, index) => {
    labels.set(key, drones.length > 1 ? `drone ${index + 1}` : 'drone');
  });

  return labels;
};

const labelForVoice = ({ key, sustained }, labels) => {
  const name = labels.get(key) ?? key;

  // A player looking at five rows needs to know which of them their fingers
  // are still on.
  return sustained ? `${name} (pedal)` : name;
};

/**
 * The voices this readout is about, lowest first.
 *
 * Two voices at the same pitch do not beat, they sum, so only one of them is
 * kept: a row reading "1/1, just, 0 Hz" is not information. A stereo drone pair
 * with no spread set is exactly that case, and it appears here as one drone —
 * which is honest, and is why the pair has a readout of its own.
 */
const distinctVoices = (voices) => {
  const sorted = [...voices].sort((first, second) => first.frequency - second.frequency);

  return sorted.filter(
    (voice, index) => index === 0 || voice.frequency !== sorted[index - 1].frequency,
  );
};

/**
 * The pairs worth showing, lowest first: each voice against the one below it,
 * and — once a chord is more than a pair — the outer interval, which is the one
 * other one anyone asks about.
 */
const pairsFrom = (distinct) => {
  if (distinct.length < 2) return [];

  const adjacent = distinct.slice(1).map((voice, index) => [distinct[index], voice]);

  if (distinct.length === 2) return adjacent;

  return [...adjacent, [distinct[0], distinct[distinct.length - 1]]];
};

const waveShape = () => document.getElementById('waveShape')?.value;

const rowsFor = (pairs, shape, labels) => pairs.flatMap(([lower, upper]) => {
  const interval = describeInterval(lower.frequency, upper.frequency, { waveShape: shape });

  if (!interval) return [];

  return [{
    lowerLabel: labelForVoice(lower, labels),
    upperLabel: labelForVoice(upper, labels),
    interval,
  }];
});

let drawScheduled = false;

const draw = () => {
  drawScheduled = false;

  const voices = soundingVoices().filter(({ frequency }) => Number.isFinite(frequency));
  const shape = waveShape();

  // Labelled from the voices that are actually shown, so a drone that has been
  // collapsed into one row is not numbered as though there were two of it.
  const distinct = distinctVoices(voices);
  const rows = rowsFor(pairsFrom(distinct), shape, labelsFor(distinct));

  renderIntervalReadout(rows.slice(0, MAX_ROWS), {
    hiddenCount: Math.max(0, rows.length - MAX_ROWS),
    waveShape: shape,
  });
};

/**
 * One draw per frame however many voices changed. A ten-note chord notifies ten
 * times and a fader drag notifies on every step; without this the readout would
 * rebuild itself thirty times a second during the drags the glide and drone
 * work exists to make smooth.
 */
const scheduleDraw = () => {
  if (drawScheduled) return;

  drawScheduled = true;
  requestAnimationFrame(draw);
};

subscribeToSounding(scheduleDraw);

// The wave shape is not a sounding change — nothing starts, stops or moves —
// but it decides whether the beat on screen is one the player could hear, so
// switching from a sine to a sawtooth has to redraw or the reason goes stale.
document.getElementById('waveShape')?.addEventListener('change', scheduleDraw);

draw();
