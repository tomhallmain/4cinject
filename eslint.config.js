// Static checks only; nothing here loads or runs extension code.
// Files in ext/ are classic scripts: those loaded into the same context share
// one global scope, so each context's globals include the top-level names
// declared by its files.
const fs = require("fs");
const path = require("path");
const globals = require("globals");

function topLevelNames(dir) {
  const names = {};
  for (const file of fs.readdirSync(path.join(__dirname, dir))) {
    if (!file.endsWith(".js")) continue;
    const source = fs.readFileSync(path.join(__dirname, dir, file), "utf8");
    for (const match of source.matchAll(/^(?:const|let|var|class|function|async function) (\w+)/gm)) {
      names[match[1]] = "readonly";
    }
  }
  return names;
}

const sharedGlobals = topLevelNames("ext/shared");

const rules = {
  "no-undef": "error",
  "no-implicit-globals": "error",
  // Top-level declarations are consumed by other files in the same context.
  "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
  "no-redeclare": ["error", { builtinGlobals: false }],
};

const scriptOptions = {
  sourceType: "script",
  ecmaVersion: "latest",
};

module.exports = [
  {
    ignores: ["ext/vendor/**", "ext/extensionID.js", "node_modules/**"],
  },
  {
    files: ["eslint.config.js"],
    languageOptions: { ...scriptOptions, sourceType: "commonjs", globals: globals.node },
  },
  {
    // Loaded into the worker, the content scripts and the popup.
    files: ["ext/shared/**/*.js"],
    languageOptions: { ...scriptOptions, globals: { ...globals.browser, ...sharedGlobals } },
    rules,
  },
  {
    files: ["ext/background/**/*.js"],
    languageOptions: {
      ...scriptOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.webextensions,
        ...sharedGlobals,
        ...topLevelNames("ext/background"),
        SparkMD5: "readonly",
      },
    },
    rules,
  },
  {
    files: ["ext/content/**/*.js"],
    languageOptions: {
      ...scriptOptions,
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...sharedGlobals,
        ...topLevelNames("ext/content"),
      },
    },
    rules,
  },
  {
    // The page's own JS context; 4chan's page scripts define these globals.
    files: ["ext/page/**/*.js"],
    languageOptions: {
      ...scriptOptions,
      globals: {
        ...globals.browser,
        ImageExpansion: "readonly",
        activeStyleSheet: "readonly",
        setActiveStyleSheet: "readonly",
      },
    },
    rules,
  },
  {
    files: ["ext/popup/**/*.js"],
    languageOptions: {
      ...scriptOptions,
      globals: { ...globals.browser, ...globals.webextensions, ...sharedGlobals },
    },
    rules: { ...rules, "no-implicit-globals": "off" },
  },
];
