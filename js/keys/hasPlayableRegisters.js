/**
 * Whether there is anything for the note keys to play: a system whose root
 * could not generate a single register leaves the keyboard with nothing.
 *
 * @param {Array} registers - The registers to be checked.
 * @returns {boolean}
 */
export function hasPlayableRegisters(registers) {
  return Array.isArray(registers) && registers.length > 0;
}
