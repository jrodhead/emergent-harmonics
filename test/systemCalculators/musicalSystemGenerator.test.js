import { generateRootNotes, systemCalculators } from '../js/systemCalculators/musicalSystemGenerator.js';

describe('generateRootNotes', () => {
  it('should generate root notes based on provided parameters', () => {
    const primaryRootFrequency = 440;
    const ratios = [1, 2, 3];
    const calculatorType = 'majorScale';

    const expectedRootNotes = [440, 880, 1320];
    const actualRootNotes = generateRootNotes(primaryRootFrequency, ratios, calculatorType);

    expect(actualRootNotes).toEqual(expectedRootNotes);
  });

  it('should return an empty array if calculatorType is null', () => {
    const primaryRootFrequency = 440;
    const ratios = [1, 2, 3];
    const calculatorType = null;

    const expectedRootNotes = [];
    const actualRootNotes = generateRootNotes(primaryRootFrequency, ratios, calculatorType);

    expect(actualRootNotes).toEqual(expectedRootNotes);
  });
});

describe('systemCalculators', () => {
  it('should generate a musical system based on provided parameters', () => {
    const rootNotes = [440, 880, 1320];
    const ratios = [1, 2, 3];
    const numberOfDiapasons = 2;
    const calculatorType = 'majorScale';

    const expectedMusicalSystem = [
      {
        rootNote: 440,
        diapasons: [
          {
            notes: [
              { noteName: 0, frequency: 440 },
              { noteName: 1, frequency: 880 },
              { noteName: 2, frequency: 1320 }
            ]
          },
          {
            notes: [
              { noteName: 0, frequency: 880 },
              { noteName: 1, frequency: 1760 },
              { noteName: 2, frequency: 2640 }
            ]
          }
        ]
      },
      {
        rootNote: 880,
        diapasons: [
          {
            notes: [
              { noteName: 0, frequency: 880 },
              { noteName: 1, frequency: 1760 },
              { noteName: 2, frequency: 2640 }
            ]
          },
          {
            notes: [
              { noteName: 0, frequency: 1760 },
              { noteName: 1, frequency: 3520 },
              { noteName: 2, frequency: 5280 }
            ]
          }
        ]
      },
      {
        rootNote: 1320,
        diapasons: [
          {
            notes: [
              { noteName: 0, frequency: 1320 },
              { noteName: 1, frequency: 2640 },
              { noteName: 2, frequency: 3960 }
            ]
          },
          {
            notes: [
              { noteName: 0, frequency: 2640 },
              { noteName: 1, frequency: 5280 },
              { noteName: 2, frequency: 7920 }
            ]
          }
        ]
      }
    ];

    const actualMusicalSystem = systemCalculators(rootNotes, ratios, numberOfDiapasons, calculatorType);

    expect(actualMusicalSystem).toEqual(expectedMusicalSystem);
  });

  it('should return an empty array if calculatorType is not supported', () => {
    const rootNotes = [440, 880, 1320];
    const ratios = [1, 2, 3];
    const numberOfDiapasons = 2;
    const calculatorType = 'unsupportedCalculator';

    const expectedMusicalSystem = [];
    const actualMusicalSystem = systemCalculators(rootNotes, ratios, numberOfDiapasons, calculatorType);

    expect(actualMusicalSystem).toEqual(expectedMusicalSystem);
  });
});