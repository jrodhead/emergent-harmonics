import {
  majorScaleRatios,
  minorScaleRatios,
  hd110067Ratios,
  hd110067RatiosInOneDiapason,
  equalTemperamentRatioGenerator
} from '../../js/systemCalculators/noteGenerators.js';

describe('ratioGenerators', () => {
  describe('majorScaleRatios', () => {
    it('should generate the ratios for a major scale', () => {
      const expectedRatios = [
        1,
        9 / 8,
        5 / 4,
        4 / 3,
        3 / 2,
        5 / 3,
        15 / 8
      ];
      expect(majorScaleRatios).toEqual(expectedRatios);
    });
  });

  describe('minorScaleRatios', () => {
    it('should generate the ratios for a minor scale', () => {
      const expectedRatios = [
        1,
        16 / 15,
        6 / 5,
        4 / 3,
        45 / 32,
        8 / 5,
        9 / 5
      ];
      expect(minorScaleRatios).toEqual(expectedRatios);
    });
  });

  describe('hd110067Ratios', () => {
    it('should generate the ratios for the HD110067 system', () => {
      const expectedRatios = [
        1,
        3 / 2,
        3 / 2,
        3 / 2,
        4 / 3,
        4 / 3,
        4 / 3
      ];
      expect(hd110067Ratios).toEqual(expectedRatios);
    });
  });

  describe('hd110067RatiosInOneDiapason', () => {
    it('should generate the ratios for the HD110067 system in one diapason', () => {
      const expectedRatios = [
        1,
        1.5,
        1.125,
        1.6875,
        1.125 * 2,
        1.5 * 2,
        1 * 2
      ];
      expect(hd110067RatiosInOneDiapason).toEqual(expectedRatios);
    });
  });

  describe('equalTemperamentRatioGenerator', () => {
    it('should generate the ratios for an equal temperament system with the specified number of notes in a diapason', () => {
      const notesInDiapason = 12;
      const expectedRatios = [
        1,
        Math.pow(2, 1 / 12),
        Math.pow(2, 2 / 12),
        Math.pow(2, 3 / 12),
        Math.pow(2, 4 / 12),
        Math.pow(2, 5 / 12),
        Math.pow(2, 6 / 12),
        Math.pow(2, 7 / 12),
        Math.pow(2, 8 / 12),
        Math.pow(2, 9 / 12),
        Math.pow(2, 10 / 12),
        Math.pow(2, 11 / 12)
      ];
      expect(equalTemperamentRatioGenerator(notesInDiapason)).toEqual(expectedRatios);
    });
  });
});