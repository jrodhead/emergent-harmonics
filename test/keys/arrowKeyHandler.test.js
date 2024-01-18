import { updateCurrentDiapasonIndex } from '../../js/keys/arrowKeyHandler';

describe('arrowKeyHandler', () => {
  let currentDiapasonIndex;
  const musicalSystemGlobal = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  beforeEach(() => {
    currentDiapasonIndex = 3; // Assuming initial index is 3
  });

  it('should increment currentDiapasonIndex when direction is "next"', () => {
    updateCurrentDiapasonIndex('next');
    expect(currentDiapasonIndex).toBe(4);
  });

  it('should decrement currentDiapasonIndex when direction is "previous"', () => {
    updateCurrentDiapasonIndex('previous');
    expect(currentDiapasonIndex).toBe(2);
  });

  it('should keep currentDiapasonIndex within valid bounds', () => {
    // Set currentDiapasonIndex to an invalid value
    currentDiapasonIndex = -1;
    updateCurrentDiapasonIndex('previous');
    expect(currentDiapasonIndex).toBe(0); // Should be clamped to 0

    currentDiapasonIndex = 10;
    updateCurrentDiapasonIndex('next');
    expect(currentDiapasonIndex).toBe(6); // Should be clamped to 6
  });
});