/* =======================================================
System Configuration
======================================================= */

let system = []; // system = all possible notes
var diapasonsInSystem = 4; // set the number of diapasons in system
var notesInDiapason = 6; // set the number of notes in a diapason (equal-tempered scale = 12) -- 'semitone' instead of 'note'?
var rootNote = 20; // the frequency of the root note

document.getElementById('notesInDiapason').value = notesInDiapason;
document.getElementById('rootNote').value = rootNote;
document.getElementById('diapasonsInSystem').value = diapasonsInSystem;

/* =======================================================
Generate Diapasons
diapason = octave in pythagorean tuning, which is Greek for 'across all'
======================================================= */

function createSystem() {
  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    system[diapason] = []; // system = all possible notes
    for (let note = 0; note < notesInDiapason; note++) {
      system[diapason][note] = calcFreq(note,diapason);
    }
  }
  var systemStringified = JSON.stringify(system);
  console.log(systemStringified);
}

function createNoteTable() {
  var noteTable = '<table><thead><td></td>';
  var systemKeys = system[0].keys();
  for (let systemKey of systemKeys) { // iterate over system[0] array in order to display note names in table header
    noteTable += '<td>note' + systemKey + '</td>';
  }
  noteTable += '</thead>';

  for (var systemDiapason = 0; systemDiapason < diapasonsInSystem; systemDiapason++) {

    var diapasonKeys = system.keys();
    for (let diapasonKey of diapasonKeys) { // iterate over system array in order to display diapason names in rows
      var diapasonLabel = 'diapason' + diapasonKey;
    }
    noteTable += '<td>' + diapasonLabel + '</td>'; // BUG: displays same number for all labels

    function createTableRow(systemDiapason) {
      for (var diapasonNote = 0; diapasonNote < notesInDiapason; diapasonNote++) {
        noteTable+='<td onclick="playNote('+system[systemDiapason][diapasonNote]+')">'+system[systemDiapason][diapasonNote]+'</td>';
      }
    }
    var diapasonNote = createTableRow(systemDiapason);
    noteTable+='</tr>';
  }
  noteTable+='</table>';
  document.getElementById('systemTable').innerHTML = noteTable;
}

function generateSystem() {
  notesInDiapason = document.getElementById('notesInDiapason').value;
  rootNote = document.getElementById('rootNote').value;
  diapasonsInSystem = document.getElementById('diapasonsInSystem').value;
  createSystem();
  createNoteTable();
}

generateSystem();

/* =======================================================
Frequency Calculator for Equal-Tempered Scale
Source: https://pages.mtu.edu/~suits/NoteFreqCalcs.html

Formula to calculate note frequency for equal-tempered scale: f_n = f_0 * (a)^n
f_0 = the frequency of one fixed note which must be defined
n = the number of half steps away from the fixed note you are
fn = the frequency of the note n half steps away.
a = (2)1/12 = the twelth root of 2 = the number which when multiplied by itself 12 times equals 2
======================================================= */

function calcFreq(note, diapason) { // algorithm for the above forumula to calculate equal-tempered scale notes
  const notePower = Math.pow(2,1/notesInDiapason); // 'a' in the above formula, but w/ notesInDiapason as a variable insetad of 12
  note = (rootNote * Math.pow(notePower, note)) * (Math.pow(2,diapason));
  return note;
}
