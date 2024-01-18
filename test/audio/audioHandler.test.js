import { playSound, stopSound, stopAllSounds } from '../../js/audio/audioHandler';

describe('audioHandler', () => {
  let oscillatorMock;
  let audioContextMock;

  beforeEach(() => {
    oscillatorMock = {
      type: '',
      frequency: {
        setValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
    };

    audioContextMock = {
      createOscillator: jest.fn().mockReturnValue(oscillatorMock),
      currentTime: 0,
      destination: 'mockDestination',
    };

    window.AudioContext = jest.fn().mockImplementation(() => audioContextMock);
    window.webkitAudioContext = jest.fn().mockImplementation(() => audioContextMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('playSound', () => {
    it('should create an audio context if it does not exist', () => {
      audioContext = null;
      playSound(440, 'A4');
      expect(window.AudioContext).toHaveBeenCalled();
    });

    it('should create an oscillator with the correct frequency and type', () => {
      playSound(440, 'A4');
      expect(audioContextMock.createOscillator).toHaveBeenCalled();
      expect(oscillatorMock.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(oscillatorMock.type).toBe('sine');
    });

    it('should connect the oscillator to the audio context destination', () => {
      playSound(440, 'A4');
      expect(oscillatorMock.connect).toHaveBeenCalledWith('mockDestination');
    });

    it('should start the oscillator', () => {
      playSound(440, 'A4');
      expect(oscillatorMock.start).toHaveBeenCalled();
    });

    it('should store the active oscillator by key', () => {
      playSound(440, 'A4');
      expect(activeOscillators['A4']).toBe(oscillatorMock);
    });

    it('should log an error if the frequency is not finite', () => {
      console.error = jest.fn();
      playSound(NaN, 'A4');
      expect(console.error).toHaveBeenCalledWith('Invalid frequency value:', NaN);
    });
  });

  describe('stopSound', () => {
    it('should stop and disconnect the oscillator associated with the given key', () => {
      activeOscillators['A4'] = oscillatorMock;
      stopSound('A4');
      expect(oscillatorMock.stop).toHaveBeenCalled();
      expect(oscillatorMock.disconnect).toHaveBeenCalled();
      expect(activeOscillators['A4']).toBeUndefined();
    });

    it('should do nothing if the oscillator associated with the given key does not exist', () => {
      stopSound('A4');
      expect(oscillatorMock.stop).not.toHaveBeenCalled();
      expect(oscillatorMock.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('stopAllSounds', () => {
    it('should stop and disconnect all active oscillators', () => {
      activeOscillators['A4'] = oscillatorMock;
      activeOscillators['C5'] = oscillatorMock;
      stopAllSounds();
      expect(oscillatorMock.stop).toHaveBeenCalledTimes(2);
      expect(oscillatorMock.disconnect).toHaveBeenCalledTimes(2);
      expect(activeOscillators).toEqual({});
    });
  });
});