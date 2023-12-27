import {playSound, stopAllSounds} from './oscillators.js';

const Action = {
  aOn()  {
    playSound(110);
    document.getElementById("A").classList.add("active");
    console.log("aOn");
  },
  aOff() {
    stopAllSounds();
    document.getElementById("A").classList.remove("active");
    console.log("aOff");
  },
  sOn()  {
    playSound(220);
    document.getElementById("S").classList.add("active");
    console.log("sOn");
  },
  sOff() {
    stopAllSounds();
    document.getElementById("S").classList.remove("active");
    console.log("sOff");
  },
  dOn()  {
    playSound(440);
    document.getElementById("D").classList.add("active");
    console.log("dOn");
  },
  dOff() {
    stopAllSounds();
    document.getElementById("D").classList.remove("active");
    console.log("dOff");
  },
  fOn()  {
    playSound(880);
    document.getElementById("F").classList.add("active");
    console.log("fOn");
  },
  fOff() {
    stopAllSounds();
    document.getElementById("F").classList.remove("active");
    console.log("fOff");
  },
  exit() {
    console.log("Later!");
  },
};

const keyAction = {
  a: { keydown: Action.aOn, keyup: Action.aOff },
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