import {
  MOUSE_BUTTON_MASKS,
  KEY_CLASSES,
  KEY_CLASS_NAMES,
  MULTIMEDIA_KEYS,
  DPI_SWITCH_MODES,
  SCROLL_MODES,
} from "./protocol.js";
import { icon } from "./icons.js";

export function createDefaultState() {
  return {
    reportRate: 1000,
    maxDPI: 5,
    currentDPIIndex: 1,
    silenceHeight: 0,
    dpiStages: [400, 800, 1600, 3200, 5000, 8000, 12000, 16000],
    dpiColors: [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
      { r: 255, g: 128, b: 0 },
      { r: 255, g: 255, b: 255 },
    ],
    perf: {
      keyDebounce: 4,
      motionSync: true,
      linearCorrection: false,
      rippleControl: false,
      powerSaving: false,
      sensorSleepTime: 2,
      customSleepEnable: true,
    },
    keyBindings: [
      { index: 0, class: KEY_CLASSES.KC_MouseKey, param1: 1, param2: 0 },
      { index: 1, class: KEY_CLASSES.KC_MouseKey, param1: 2, param2: 0 },
      { index: 2, class: KEY_CLASSES.KC_MouseKey, param1: 4, param2: 0 },
      { index: 3, class: KEY_CLASSES.KC_MouseKey, param1: 8, param2: 0 },
      { index: 4, class: KEY_CLASSES.KC_MouseKey, param1: 16, param2: 0 },
      { index: 5, class: KEY_CLASSES.KC_ChangeDPIKey, param1: 1, param2: 0 },
    ],
    longRangeMode: false,
    dongleRgb: {
      mode: 2,
      colors: [
        { r: 0, g: 255, b: 0 },
        { r: 255, g: 255, b: 0 },
        { r: 255, g: 128, b: 0 },
      ],
    },
    macros: [],
    shortcuts: [],
    battery: null,
    version: null,
    cid: null,
    mid: null,
    activeProfileIndex: 0,
  };
}

class StateManager {
  constructor() {
    this.current = createDefaultState();
    this.initialCommitted = JSON.parse(JSON.stringify(this.current));
    this.hasChanges = false;
    this.listeners = new Set();
    this.activeTab = "buttons";
    this.activeButtonIndex = 0;
    this.mouseView = "top";
    this.profiles = [null, null, null, null];
    this.loadSavedProfiles();
  }

  loadSavedProfiles() {
    try {
      const saved = localStorage.getItem("m916_profiles");
      if (saved) {
        this.profiles = JSON.parse(saved);
      }
    } catch (_) {}
  }

  saveProfiles() {
    try {
      localStorage.setItem("m916_profiles", JSON.stringify(this.profiles));
    } catch (_) {}
  }

  getProfile(index) {
    return this.profiles[index] || null;
  }

  setProfile(index, data) {
    this.profiles[index] = JSON.parse(JSON.stringify(data));
    this.saveProfiles();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.checkDirty();
    this.listeners.forEach((cb) => {
      try {
        cb(this.current, this.hasChanges);
      } catch (e) {
        console.error(e);
      }
    });
  }

  updateState(partial) {
    if (typeof partial === "function") {
      partial(this.current);
    } else {
      Object.assign(this.current, partial);
    }
    this.notify();
  }

  setCommittedState(newState) {
    this.current = JSON.parse(JSON.stringify(newState));
    this.initialCommitted = JSON.parse(JSON.stringify(newState));
    this.hasChanges = false;
    this.notify();
  }

  checkDirty() {
    const cStr = JSON.stringify(this.sanitizeForCompare(this.current));
    const iStr = JSON.stringify(this.sanitizeForCompare(this.initialCommitted));
    this.hasChanges = cStr !== iStr;
  }

  sanitizeForCompare(s) {
    if (!s) return {};
    const maxDpi = Number(s.maxDPI) || 5;

    const stages = (s.dpiStages || [])
      .slice(0, maxDpi)
      .map((d) => Number(d) || 800);
    const colors = (s.dpiColors || []).slice(0, maxDpi).map((c) => ({
      r: Number(c.r) || 0,
      g: Number(c.g) || 0,
      b: Number(c.b) || 0,
    }));

    const p = s.perf || {};
    const perfNorm = {
      keyDebounce: Number(p.keyDebounce) || 0,
      motionSync: toBool(p.motionSync),
      linearCorrection: toBool(p.linearCorrection),
      rippleControl: toBool(p.rippleControl),
      powerSaving: toBool(p.powerSaving),
      sensorSleepTime: Math.max(
        1,
        Math.min(254, Number(p.sensorSleepTime) || 2),
      ),
      customSleepEnable: p.customSleepEnable !== false,
    };

    const binds = (s.keyBindings || []).slice(0, 6).map((b, idx) => ({
      index: idx,
      class: Number(b.class) || 0,
      param1: Number(b.param1) || 0,
      param2: Number(b.param2) || 0,
    }));

    const dongle = s.dongleRgb || { mode: 2, colors: [] };
    const dongleNorm = {
      mode: Number(dongle.mode) || 2,
      colors: (dongle.colors || []).map((c) => ({
        r: Number(c.r) || 0,
        g: Number(c.g) || 0,
        b: Number(c.b) || 0,
      })),
    };

    const shortcutsNorm = (s.shortcuts || []).map((sc) => ({
      keys: (sc.keys || []).map((key) => ({
        type: String(key.type || "key"),
        keyState: Number(key.keyState) || 0,
        hidCode: Number(key.hidCode) || 0,
        delay: Number(key.delay) || 20,
      })),
    }));

    const macrosNorm = (s.macros || []).map((m) => ({
      name: String(m.name || "").slice(0, 30),
      steps: (m.steps || []).map((step) => ({
        type: String(step.type || "key"),
        keyState: Number(step.keyState) || 0,
        value: String(step.value || ""),
        hidCode: Number(step.hidCode) || 0,
        delay: Number(step.delay) || 20,
      })),
    }));

    return {
      reportRate: Number(s.reportRate) || 1000,
      maxDPI: maxDpi,
      currentDPIIndex: Number(s.currentDPIIndex) || 0,
      silenceHeight: Number(s.silenceHeight) || 0,
      dpiStages: stages,
      dpiColors: colors,
      perf: perfNorm,
      keyBindings: binds,
      longRangeMode: toBool(s.longRangeMode),
      dongleRgb: dongleNorm,
      macros: macrosNorm,
      shortcuts: shortcutsNorm,
    };
  }

  exportProfileJSON() {
    return JSON.stringify(
      {
        appName: "M916 Pro UI",
        exportedAt: new Date().toISOString(),
        profile: this.sanitizeForCompare(this.current),
      },
      null,
      2,
    );
  }

  importProfileJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.profile) {
      throw new Error("Invalid M916 Pro profile format");
    }
    const p = parsed.profile;
    this.updateState({
      reportRate: Number(p.reportRate) || 1000,
      maxDPI: Number(p.maxDPI) || 5,
      currentDPIIndex: Number(p.currentDPIIndex) || 0,
      silenceHeight: Number(p.silenceHeight) || 0,
      dpiStages: p.dpiStages
        ? p.dpiStages.map(Number)
        : [400, 800, 1600, 3200, 5000],
      dpiColors: p.dpiColors || [],
      perf: Object.assign({}, this.current.perf, p.perf || {}),
      keyBindings: p.keyBindings || this.current.keyBindings,
      longRangeMode: toBool(p.longRangeMode),
      dongleRgb: p.dongleRgb || this.current.dongleRgb,
      macros: p.macros || [],
      shortcuts: p.shortcuts || [],
    });
  }
}

export function formatBindingSummary(bind) {
  if (!bind) return "Unbound";
  const kClass = Number(bind.class);
  const p1 = Number(bind.param1);
  const p2 = Number(bind.param2);

  switch (kClass) {
    case KEY_CLASSES.KC_CloseKey:
      return "Disabled";
    case KEY_CLASSES.KC_MouseKey:
      return MOUSE_BUTTON_MASKS[p1] || `Mouse Click (0x${p1.toString(16)})`;
    case KEY_CLASSES.KC_ChangeDPIKey:
      return DPI_SWITCH_MODES[p1] || "DPI Switch";
    case KEY_CLASSES.KC_MouseACPANKey:
      return p1 === 1 ? "Scroll Left" : "Scroll Right";
    case KEY_CLASSES.KC_ScrollUpDownKey:
      return SCROLL_MODES[p1] || "Scroll Wheel";
    case KEY_CLASSES.KC_MouseFireKey:
      return `Rapid Fire (${p1} ms, ${p2 === 0 ? "Held" : p2 + "x"})`;
    case KEY_CLASSES.KC_ShortcutKey: {
      const media = MULTIMEDIA_KEYS.find((m) => m.code === p1);
      if (media) return `Multimedia: ${media.name}`;
      return `Shortcut #${p1 + 1}`;
    }
    case KEY_CLASSES.KC_MacroKey:
      return `Macro #${p1 + 1} (${macroLoopLabel(p2)})`;
    case KEY_CLASSES.KC_ChangeReportRateKey:
      return "Polling Rate Cycle";
    case KEY_CLASSES.KC_DecorativeLampKey:
      return p1 === 0
        ? "Lights On/Off"
        : p1 === 3
          ? "Strip On/Off"
          : "Cycle RGB";
    case KEY_CLASSES.KC_ChangeConfigKey:
      return `Profile Switch (1 ${icon("arrowLeftRight", 12)} 2)`;
    case KEY_CLASSES.KC_DPILockKey:
      return `Sniper Lock (${(p1 + 1) * 50} DPI)`;
    default:
      return KEY_CLASS_NAMES[kClass] || "Unknown Action";
  }
}

function toBool(value) {
  return value === true || value === 1 || value === "true" || value === "1";
}

function macroLoopLabel(p2) {
  if (p2 === 0) return "Once";
  if (p2 === 254) return "While Held";
  if (p2 === 255) return "Until Key Pressed";
  return `${p2}x`;
}

export const stateManager = new StateManager();
