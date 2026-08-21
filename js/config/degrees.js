const NUMERALS = [
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
];

/**
 * A note's degree is its position in the scale, written the way scale
 * degrees are conventionally written. Built up rather than listed, since a
 * scale can hold as many notes as the keyboard has keys.
 */
export const degreeForIndex = (index) => {
  let remaining = index + 1;

  return NUMERALS.reduce((numeral, [symbol, value]) => {
    while (remaining >= value) {
      numeral += symbol;
      remaining -= value;
    }

    return numeral;
  }, '');
};
