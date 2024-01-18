import { handleNumericKey, currentRootIndex } from '../../js/keys/numericKeyHandler';
import { createAlphaKeyMap } from '../../js/keys/alphaKeyMap';

jest.mock('./alphaKeyMap', () => ({
  createAlphaKeyMap: jest.fn()
}));

describe('numericKeyHandler', () => {
  let mockConsoleLog;
  let mockConsoleError;
  let mockCreateAlphaKeyMap;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockCreateAlphaKeyMap = jest.spyOn(createAlphaKeyMap, 'createAlphaKeyMap');
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockCreateAlphaKeyMap.mockRestore();
  });

  describe('handleNumericKey', () => {
    it('should update currentRootIndex and call createAlphaKeyMap when ev is "keydown" and rootIndex is valid', () => {
      const rootIndex = 3;
      handleNumericKey('keydown', rootIndex);
      expect(currentRootIndex).toBe(rootIndex);
      expect(mockCreateAlphaKeyMap).toHaveBeenCalledWith(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    });

    it('should log an error when ev is "keydown" and rootIndex is invalid', () => {
      const rootIndex = -1;
      handleNumericKey('keydown', rootIndex);
      expect(mockConsoleError).toHaveBeenCalledWith('Invalid root index:', rootIndex);
    });

    it('should log the rootIndex when ev is "keyup"', () => {
      const rootIndex = 2;
      handleNumericKey('keyup', rootIndex);
      expect(mockConsoleLog).toHaveBeenCalledWith(`${rootIndex}Off`);
    });
  });

  describe('keydown event listener', () => {
    let mockHandleNumericKey;

    beforeEach(() => {
      mockHandleNumericKey = jest.spyOn(handleNumericKey, 'handleNumericKey');
    });

    afterEach(() => {
      mockHandleNumericKey.mockRestore();
    });

    it('should call handleNumericKey with "keydown" and the keyIndex when a valid numeric key is pressed', () => {
      const keyIndex = 4;
      const mockEvent = { key: '4', repeat: false };
      const mockNumericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const mockIndexOf = jest.spyOn(mockNumericKeys, 'indexOf').mockReturnValue(keyIndex);

      document.body.dispatchEvent(new KeyboardEvent('keydown', mockEvent));

      expect(mockHandleNumericKey).toHaveBeenCalledWith('keydown', keyIndex);
      expect(mockIndexOf).toHaveBeenCalledWith(mockEvent.key);

      mockIndexOf.mockRestore();
    });

    it('should not call handleNumericKey when a numeric key is pressed and repeat is true', () => {
      const keyIndex = 2;
      const mockEvent = { key: '2', repeat: true };
      const mockNumericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const mockIndexOf = jest.spyOn(mockNumericKeys, 'indexOf').mockReturnValue(keyIndex);

      document.body.dispatchEvent(new KeyboardEvent('keydown', mockEvent));

      expect(mockHandleNumericKey).not.toHaveBeenCalled();
      expect(mockIndexOf).toHaveBeenCalledWith(mockEvent.key);

      mockIndexOf.mockRestore();
    });

    it('should not call handleNumericKey when a non-numeric key is pressed', () => {
      const mockEvent = { key: 'A', repeat: false };
      const mockNumericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const mockIndexOf = jest.spyOn(mockNumericKeys, 'indexOf').mockReturnValue(-1);

      document.body.dispatchEvent(new KeyboardEvent('keydown', mockEvent));

      expect(mockHandleNumericKey).not.toHaveBeenCalled();
      expect(mockIndexOf).toHaveBeenCalledWith(mockEvent.key);

      mockIndexOf.mockRestore();
    });
  });

  describe('keyup event listener', () => {
    let mockHandleNumericKey;
    let mockQuerySelectorAll;
    let mockClassListRemove;
    let mockClassListAdd;

    beforeEach(() => {
      mockHandleNumericKey = jest.spyOn(handleNumericKey, 'handleNumericKey');
      mockQuerySelectorAll = jest.spyOn(document, 'querySelectorAll');
      mockClassListRemove = jest.spyOn(Element.prototype.classList, 'remove');
      mockClassListAdd = jest.spyOn(Element.prototype.classList, 'add');
    });

    afterEach(() => {
      mockHandleNumericKey.mockRestore();
      mockQuerySelectorAll.mockRestore();
      mockClassListRemove.mockRestore();
      mockClassListAdd.mockRestore();
    });

    it('should call handleNumericKey with "keyup" and the keyIndex when a valid numeric key is released', () => {
      const keyIndex = 7;
      const mockEvent = { key: '7', repeat: false };
      const mockNumericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const mockIndexOf = jest.spyOn(mockNumericKeys, 'indexOf').mockReturnValue(keyIndex);
      const mockActiveRoot = { classList: { add: jest.fn() } };
      const mockActiveElements = [mockActiveRoot, { classList: { remove: jest.fn() } }];

      mockQuerySelectorAll.mockReturnValue(mockActiveElements);

      document.body.dispatchEvent(new KeyboardEvent('keyup', mockEvent));

      expect(mockHandleNumericKey).toHaveBeenCalledWith('keyup', keyIndex);
      expect(mockIndexOf).toHaveBeenCalledWith(mockEvent.key);
      expect(mockQuerySelectorAll).toHaveBeenCalledWith('.active');
      expect(mockClassListRemove).toHaveBeenCalledTimes(1);
      expect(mockClassListRemove).toHaveBeenCalledWith('active');
      expect(mockClassListAdd).toHaveBeenCalledTimes(1);
      expect(mockClassListAdd).toHaveBeenCalledWith('active');

      mockIndexOf.mockRestore();
    });

    it('should not call handleNumericKey when a numeric key is released and repeat is true', () => {
      const keyIndex = 9;
      const mockEvent = { key: '9', repeat: true };
      const mockNumericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const mockIndexOf = jest.spyOn(mockNumericKeys, 'indexOf').mockReturnValue(keyIndex);

      document.body.dispatchEvent(new KeyboardEvent('keyup', mockEvent));

      expect(mockHandleNumericKey).not.toHaveBeenCalled();
      expect(mockIndexOf).toHaveBeenCalledWith(mockEvent.key);

      mockIndexOf.mockRestore();
    });

    it('should not call handleNumericKey when a non-numeric key is released', () => {
      const mockEvent = { key: 'Enter', repeat: false };
      const mockNumericKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const mockIndexOf = jest.spyOn(mockNumericKeys, 'indexOf').mockReturnValue(-1);

      document.body.dispatchEvent(new KeyboardEvent('keyup', mockEvent));

      expect(mockHandleNumericKey).not.toHaveBeenCalled();
      expect(mockIndexOf).toHaveBeenCalledWith(mockEvent.key);

      mockIndexOf.mockRestore();
    });
  });
});