import { stopAllSounds } from '../../js/audio/audioHandler.js';

describe('escapeKeyHandler', () => {
  let stopAllSoundsMock;
  let addClassMock;
  let removeClassMock;

  beforeEach(() => {
    stopAllSoundsMock = jest.spyOn(window, 'stopAllSounds');
    addClassMock = jest.spyOn(document.body.classList, 'add');
    removeClassMock = jest.spyOn(document.body.classList, 'remove');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should stop all sounds and add "stop" class when "Escape" key is pressed', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.body.dispatchEvent(event);

    expect(stopAllSoundsMock).toHaveBeenCalled();
    expect(addClassMock).toHaveBeenCalledWith('stop');
  });

  it('should remove "stop" class when "Escape" key is released', () => {
    const event = new KeyboardEvent('keyup', { key: 'Escape' });
    document.body.dispatchEvent(event);

    expect(removeClassMock).toHaveBeenCalledWith('stop');
  });

  it('should ignore repeated keydown events', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', repeat: true });
    document.body.dispatchEvent(event);

    expect(stopAllSoundsMock).not.toHaveBeenCalled();
    expect(addClassMock).not.toHaveBeenCalled();
  });

  it('should ignore repeated keyup events', () => {
    const event = new KeyboardEvent('keyup', { key: 'Escape', repeat: true });
    document.body.dispatchEvent(event);

    expect(removeClassMock).not.toHaveBeenCalled();
  });
});