import { getScale, getPrimaryScale } from './systemConfigState.js';

/**
 * Which scale the configuration screen is editing. Kept apart from the
 * configuration itself because it is screen state, not part of the system.
 */
let selectedScaleId = null;

/** The selected scale, falling back to the primary one if it went away. */
export const getSelectedScale = () => getScale(selectedScaleId) ?? getPrimaryScale();

export const getSelectedScaleId = () => getSelectedScale().id;

export const setSelectedScaleId = (scaleId) => {
  selectedScaleId = scaleId;
};
