/* =======================================================
Oscillator Configuration
======================================================= */

// create web audio api context
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// create Oscillator node
var oscillator = audioCtx.createOscillator();
// create Gain node
var gainNode = audioCtx.createGain();
// routing
oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);

var waveSelect = document.getElementById("waveType");
waveSelect.oninput = setWaveType;
function setWaveType() {
  var waveSelect = document.getElementById("waveType");
  // set oscillator type to selected wave type
  var waveType = waveSelect.options[waveSelect.selectedIndex].value;
  oscillator.type = waveType;
}

function playNote(thisNote) {
  setWaveType();
  // set frequency from selected note
  oscillator.frequency.setValueAtTime(thisNote, audioCtx.currentTime);
  oscillator.start(audioCtx.currentTime);
//  oscillator.stop(audioCtx.currentTime + .3); // BUG: only plays one note when this is enabled but works fine when disabled
}

/* =======================================================
Gain Configuration (Volume / Mute)
======================================================= */

// Volume
var ctrlVolume = document.getElementById('ctrlVolume');
var volume = .1; // set volume on load
document.getElementById('ctrlVolume').value = volume;
gainNode.gain.setValueAtTime(ctrlVolume.value, audioCtx.currentTime);
ctrlVolume.oninput = changeVolume;
function changeVolume() {
  gainNode.gain.setValueAtTime(ctrlVolume.value, audioCtx.currentTime);
}

// Mute
var mute = document.querySelector('.mute');
mute.onclick = muteOscillator;
function muteOscillator() {
  if(mute.id == "") {
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    mute.id = "activated";
    mute.value = "Unmute";
  } else {
    gainNode.gain.setValueAtTime(ctrlVolume.value, audioCtx.currentTime);
    mute.id = "";
    mute.value = "Mute";
  }
}
