/**
 * Checks if the provided system is valid.
 * @param {Array} system - The system to be checked.
 * @returns {boolean} - True if the system is valid, false otherwise.
 */
export function isValidSystem(system) {
  return Array.isArray(system) && system.length > 0;
}

/**
 * Checks if the provided diapasons are valid.
 * @param {Array} diapasons - The diapasons to be checked.
 * @returns {boolean} - True if the diapasons are valid, false otherwise.
 */
export function isValidDiapasons(diapasons) {
  return diapasons && Array.isArray(diapasons) && diapasons.length > 0;
}
