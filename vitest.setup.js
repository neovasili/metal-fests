import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load UIUtils class and make it globally available
const uiUtilsCode = readFileSync(join(__dirname, "js/ui-utils.js"), "utf-8");

// Execute in a function that adds to globalThis
const executeCode = new Function(uiUtilsCode + "; return UIUtils;");
globalThis.UIUtils = executeCode();
