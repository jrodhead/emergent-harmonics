import { initSystemConfig } from "./config/systemConfigHandler.js";
import { initPlaySettings } from "./config/playSettingsHandler.js";
import { initViewToggle } from "./config/viewToggle.js";

initSystemConfig();
initPlaySettings();
initViewToggle('config');
