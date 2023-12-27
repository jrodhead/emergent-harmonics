import {playSound, stopAllSounds} from './oscillators.js';

const Action = {
  aOn()  {
    playSound(110);
    console.log(`aOn`);
  },
  aOff() {
    stopAllSounds();
    console.log("aOff");
  },
  sOn()  {
    playSound(220);
    console.log("sOn");
  },
  sOff() {
    stopAllSounds();
    console.log("sOff");
  },
  dOn()  {
    playSound(440);
    console.log("dOn");
  },
  dOff() {
    stopAllSounds();
    console.log("dOff");
  },
  fOn()  {
    playSound(880);
    console.log("fOn");
  },
  fOff() {
    stopAllSounds();
    console.log("fOff");
  },
  exit() {
    console.log("Later!");
  },
};

const keyAction = {
  a: { keydown: Action.aOn,  keyup: Action.aOff },
  s: { keydown: Action.sOn,  keyup: Action.sOff },
  d: { keydown: Action.dOn,  keyup: Action.dOff },
  f: { keydown: Action.fOn,  keyup: Action.fOff },
  Escape: { keydown: Action.exit }
};

const keyHandler = (ev) => {
  if (ev.repeat) return;
  if (!(ev.key in keyAction) || !(ev.type in keyAction[ev.key])) return;
  keyAction[ev.key][ev.type]();
};

['keydown', 'keyup'].forEach((evType) => {
  document.body.addEventListener(evType, keyHandler);
});