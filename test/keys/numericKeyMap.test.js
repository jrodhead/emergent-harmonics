import { createNumericKeyMap } from '../../js/keys/numericKeyMap';

describe('createNumericKeyMap', () => {
  it('should create a numeric key map based on the provided musical system', () => {
    const musicalSystem = [
      { rootNote: 'C' },
      { rootNote: 'D' },
      { rootNote: 'E' },
    ];

    const expectedNumericKeyMap = {
      0: 'C',
      1: 'D',
      2: 'E',
    };

    const mockRenderNumericKeyMapTable = jest.fn();

    createNumericKeyMap(musicalSystem);

    expect(mockRenderNumericKeyMapTable).toHaveBeenCalledWith(expectedNumericKeyMap);
  });
});

describe('renderNumericKeyMapTable', () => {
  it('should render the numeric key map table with the provided numeric key map', () => {
    const numericKeyMap = {
      0: 'C',
      1: 'D',
      2: 'E',
    };

    const expectedNumericGridHTML = `
      <div class="grid-container">
        <div class="root-group">
          <div id="root0" class="root-selector">
            <div class="root-name">R0</div>
            <div class="key-name">0</div>
            <div class="root-frequency">C Hz</div>
          </div>
          <div id="root1" class="root-selector">
            <div class="root-name">R1</div>
            <div class="key-name">1</div>
            <div class="root-frequency">D Hz</div>
          </div>
          <div id="root2" class="root-selector">
            <div class="root-name">R2</div>
            <div class="key-name">2</div>
            <div class="root-frequency">E Hz</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById = jest.fn().mockReturnValue({
      innerHTML: '',
    });

    renderNumericKeyMapTable(numericKeyMap);

    expect(document.getElementById).toHaveBeenCalledWith('numericKeyTable');
    expect(document.getElementById('numericKeyTable').innerHTML).toBe(expectedNumericGridHTML);
  });
});