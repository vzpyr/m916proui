const fakeEl = () => ({
  innerHTML: "",
  style: {},
  classList: { add() {}, remove() {}, toggle() {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  appendChild() {},
  remove() {},
  setAttribute() {},
});

globalThis.document = {
  getElementById: () => fakeEl(),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => fakeEl(),
  documentElement: fakeEl(),
};
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  removeEventListener() {},
};

globalThis.localStorage = { getItem: () => null, setItem() {} };

const { stateManager } = await import("../js/state.js");
const { transport } = await import("../js/transport.js");
transport.isConnected = () => false;

const { MouseSvgVisualizer } = await import("../js/ui-mouse-svg.js");
const { ButtonMappingUI } = await import("../js/ui-buttons.js");
const { DpiUI } = await import("../js/ui-dpi.js");
const { SensorUI } = await import("../js/ui-sensor.js");
const { DongleUI } = await import("../js/ui-dongle.js");
const { MacroUI } = await import("../js/ui-macros.js");
const { ShortcutsUI } = await import("../js/ui-shortcuts.js");

const svg = new MouseSvgVisualizer("x", () => {});
const buttons = new ButtonMappingUI("x", "x", () => {});
const dpi = new DpiUI("x");
const sensor = new SensorUI("x", "x", () => {});
const dongle = new DongleUI("x", "x", () => {});
const macro = new MacroUI("x", () => {});
const shortcuts = new ShortcutsUI("x");

svg.render();
svg.currentView = "bottom";
svg.render();
buttons.renderList();
buttons.openModal(0);
dpi.render();
sensor.render();
dongle.render();
macro.render();
shortcuts.render();
shortcuts.startRecording();
macro.startKeyRecording();

stateManager.updateState({
  reportRate: 2000,
  dongleRgb: {
    mode: 1,
    colors: [
      { r: 0, g: 0, b: 0 },
      { r: 1, g: 1, b: 1 },
      { r: 2, g: 2, b: 2 },
    ],
  },
});
svg.render();
dpi.render();
sensor.render();
dongle.render();
macro.render();
shortcuts.render();
shortcuts.startRecording();

stateManager.updateState({
  shortcuts: [{ keys: [{ type: "key", keyState: 1, hidCode: 4, delay: 20 }] }],
  macros: [
    {
      name: "Test",
      loopMode: 1,
      steps: [{ type: "key", keyState: 1, value: "x", hidCode: 4, delay: 20 }],
    },
  ],
});
macro.render();
shortcuts.render();
shortcuts.startRecording();

stateManager.updateState({
  silenceHeight: 1,
  perf: {
    keyDebounce: 5,
    motionSync: false,
    rippleControl: true,
    linearCorrection: true,
    powerSaving: true,
    sensorSleepTime: 30,
    customSleepEnable: false,
    moveOffLed: true,
    allLedOffTime: 10,
  },
  longRangeMode: true,
});
dpi.render();
sensor.render();

console.log("ALL RENDER PATHS OK (no ReferenceErrors)");
process.exit(0);
