import { handleAlphaKey } from '../../js/keys/alphaKeyHandler';
import { playSound, stopSound } from '../../js/audio/audioHandler';

describe('alphaKeyHandler', () => {
  let keyData;
  let playSoundMock;
  let stopSoundMock;
  let getElementByIdMock;
  let classListMock;

  beforeEach(() => {
    keyData = {
      frequency: 440,
      elementId: 'A4',
    };

    playSoundMock = jest.spyOn(playSound, 'playSound');
    stopSoundMock = jest.spyOn(stopSound, 'stopSound');
    getElementByIdMock = jest.spyOn(document, 'getElementById');
    classListMock = {
      add: jest.fn(),
      remove: jest.fn(),
    };
    getElementByIdMock.mockReturnValue(classListMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call playSound with the correct frequency and action on keydown event', () => {
    handleAlphaKey('keydown', 'A');
    expect(playSoundMock).toHaveBeenCalledWith(440, 'A');
  });

  it('should call add method on classList with "active" on keydown event', () => {
    handleAlphaKey('keydown', 'A');
    expect(classListMock.add).toHaveBeenCalledWith('active');
  });

  it('should call stopSound with the correct action on keyup event', () => {
    handleAlphaKey('keyup', 'A');
    expect(stopSoundMock).toHaveBeenCalledWith('A');
  });

  it('should call remove method on classList with "active" on keyup event', () => {
    handleAlphaKey('keyup', 'A');
    expect(classListMock.remove).toHaveBeenCalledWith('active');
  });

  it('should log an error if unable to handle the key event', () => {
    const consoleErrorMock = jest.spyOn(console, 'error');
    handleAlphaKey('unknown', 'A');
    expect(consoleErrorMock).toHaveBeenCalledWith('Unable to handle key event:', 'unknown');
  });

  it('should not call playSound if keyData is undefined', () => {
    handleAlphaKey('keydown', 'B');
    expect(playSoundMock).not.toHaveBeenCalled();
  });

  it('should not call stopSound if keyData is undefined', () => {
    handleAlphaKey('keyup', 'B');
    expect(stopSoundMock).not.toHaveBeenCalled();
  });
});