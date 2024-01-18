import { createAlphaKeyMap } from '../../js/keys/alphaKeyMap';
import { currentRootIndex } from '../../js/keys/numericKeyHandler';
import { currentDiapasonIndex } from "../../js/keys/arrowKeyHandler";
import { alphaKeyHandler } from '../../js/keys/alphaKeyHandler';
import { alphaKeyMapGlobal, musicalSystemGlobal, updateAlphaKeyMapGlobal } from '../../js/main';

describe('alphaKeyMap', () => {
  let system;
  let keys;
  let alphaKeyMap;
  let root;
  let diapasons;
  let notes;

  beforeEach(() => {
    system = [
      {
        diapasons: [
          {
            notes: [
              { frequency: 440, noteName: 'A4' },
              { frequency: 523.25, noteName: 'C5' },
              { frequency: 659.25, noteName: 'E5' },
            ],
          },
          {
            notes: [
              { frequency: 392, noteName: 'G4' },
              { frequency: 466.16, noteName: 'A#4' },
              { frequency: 587.33, noteName: 'D5' },
            ],
          },
        ],
      },
    ];

    keys = 'qwertyuiopasdfghjklzxcvbnm'.split('');

    alphaKeyMap = [
      { key: 'q', frequency: 440, elementId: 'A4' },
      { key: 'w', frequency: 523.25, elementId: 'C5' },
      { key: 'e', frequency: 659.25, elementId: 'E5' },
    ];

    root = system[currentRootIndex];
    diapasons = root.diapasons;
    notes = diapasons[currentDiapasonIndex].notes;

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(document, 'getElementById').mockReturnValue({
      innerHTML: '',
    });
    jest.spyOn(document.body, 'addEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create alpha key map correctly', () => {
    const result = createAlphaKeyMap(system);

    expect(result).toEqual(alphaKeyMap);
    expect(console.error).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('createAlphaKeyMap result:', alphaKeyMap);
    expect(updateAlphaKeyMapGlobal).toHaveBeenCalledWith(alphaKeyMap);
    expect(document.getElementById).toHaveBeenCalledWith('alphaKeyTable');
    expect(document.getElementById('alphaKeyTable').innerHTML).not.toBe('');
    expect(document.body.addEventListener).toHaveBeenCalledWith('keydown', alphaKeyHandler);
    expect(document.body.addEventListener).toHaveBeenCalledWith('keyup', alphaKeyHandler);
  });

  it('should handle invalid system', () => {
    const invalidSystem = null;
    const result = createAlphaKeyMap(invalidSystem);

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Invalid system or root provided:', invalidSystem);
    expect(console.log).not.toHaveBeenCalled();
    expect(updateAlphaKeyMapGlobal).not.toHaveBeenCalled();
    expect(document.getElementById).not.toHaveBeenCalled();
    expect(document.body.addEventListener).not.toHaveBeenCalled();
  });

  it('should handle invalid diapasons in the root', () => {
    const invalidDiapasons = null;
    root.diapasons = invalidDiapasons;

    const result = createAlphaKeyMap(system);

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Invalid diapasons in the root:', invalidDiapasons);
    expect(console.log).not.toHaveBeenCalled();
    expect(updateAlphaKeyMapGlobal).not.toHaveBeenCalled();
    expect(document.getElementById).not.toHaveBeenCalled();
    expect(document.body.addEventListener).not.toHaveBeenCalled();
  });

  it('should handle invalid notes in the diapason', () => {
    const invalidNotes = null;
    notes = invalidNotes;

    const result = createAlphaKeyMap(system);

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Invalid notes in the diapason:', invalidNotes);
    expect(console.log).not.toHaveBeenCalled();
    expect(updateAlphaKeyMapGlobal).not.toHaveBeenCalled();
    expect(document.getElementById).not.toHaveBeenCalled();
    expect(document.body.addEventListener).not.toHaveBeenCalled();
  });

  it('should handle invalid diapason index', () => {
    const invalidDiapasonIndex = 10;
    currentDiapasonIndex = invalidDiapasonIndex;

    const result = createAlphaKeyMap(system);

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Invalid diapason index:', invalidDiapasonIndex);
    expect(console.log).not.toHaveBeenCalled();
    expect(updateAlphaKeyMapGlobal).not.toHaveBeenCalled();
    expect(document.getElementById).not.toHaveBeenCalled();
    expect(document.body.addEventListener).not.toHaveBeenCalled();
  });
});