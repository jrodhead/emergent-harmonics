import { getDiapason, getPrimaryDiapason } from './systemConfigState.js';

/**
 * Which diapason the configuration screen is editing. Kept apart from the
 * configuration itself because it is screen state, not part of the system.
 */
let selectedDiapasonId = null;

/** The selected diapason, falling back to the primary one if it went away. */
export const getSelectedDiapason = () => getDiapason(selectedDiapasonId) ?? getPrimaryDiapason();

export const getSelectedDiapasonId = () => getSelectedDiapason().id;

export const setSelectedDiapasonId = (diapasonId) => {
  selectedDiapasonId = diapasonId;
};
