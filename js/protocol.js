export const USB_VID = 0x3554;

export const DEVICE_MODELS = {
  0xf55d: {
    name: "Redragon M916 Pro 1K",
    mode: "2.4GHz Wireless",
    maxRate: 1000,
    cid: 23,
    mid: 5,
  },
  0xf5d5: {
    name: "Redragon M916 Pro 1K",
    mode: "2.4GHz Alt Receiver",
    maxRate: 1000,
    cid: 23,
    mid: 5,
  },
  0xf55e: {
    name: "Redragon M916 Pro 1K",
    mode: "Wired USB-C",
    maxRate: 1000,
    cid: 23,
    mid: 5,
  },

  0xf54c: {
    name: "Redragon M916 Pro 4K",
    mode: "Standard Wireless",
    maxRate: 1000,
    cid: 23,
    mid: 6,
  },
  0xf54f: {
    name: "Redragon M916 Pro 4K",
    mode: "4K High-Speed Receiver",
    maxRate: 4000,
    cid: 23,
    mid: 6,
  },
  0xf55f: {
    name: "Redragon M916 Pro 4K",
    mode: "4K Alt Receiver",
    maxRate: 4000,
    cid: 23,
    mid: 6,
  },
  0xf54e: {
    name: "Redragon M916 Pro 4K",
    mode: "Wired USB-C",
    maxRate: 4000,
    cid: 23,
    mid: 6,
  },
};

export const REPORT_ID = 0x08;
export const USAGE_PAGE_FILTER = 0xff04;

export const UsbCommandID = {
  EncryptionData: 0x01,
  PCDriverStatus: 0x02,
  DeviceOnLine: 0x03,
  BatteryLevel: 0x04,
  DongleEnterPair: 0x05,
  GetPairState: 0x06,
  WriteFlashData: 0x07,
  ReadFlashData: 0x08,
  ClearSetting: 0x09,
  StatusChanged: 0x0a,
  SetDeviceVidPid: 0x0b,
  SetDeviceDescriptorString: 0x0c,
  EnterUsbUpdateMode: 0x0d,
  GetCurrentConfig: 0x0e,
  SetCurrentConfig: 0x0f,
  ReadCIDMID: 0x10,
  EnterMTKMode: 0x11,
  ReadVersionID: 0x12,
  Set4KDongleRGB: 0x14,
  Get4KDongleRGBValue: 0x15,
  SetLongRangeMode: 0x16,
  GetLongRangeMode: 0x17,
  WriteKBCIdMID: 0xf0,
  ReadKBCIdMID: 0xf1,
};

export const FlashAddr = {
  ReportRate: 0x0000,
  MaxDPI: 0x0002,
  CurrentDPI: 0x0004,
  XSpindown: 0x0006,
  YSpindown: 0x0008,
  SilenceHeight: 0x000a,
  DPIStages: 0x000c,
  DPIColors: 0x002c,
  PerfConfig1: 0x004c,
  PerfConfig2: 0x0050,
  PerfConfig3: 0x0054,
  KeyBindings: 0x0060,
  ShortcutKeys: 0x0100,
};

export const MACRO_STORAGE_BASE = 0x0300;
export const MACRO_SLOT_SIZE = 384;
export const MACRO_HEADER_SIZE = 32;
export const MACRO_NAME_MAX = 30;
export const MACRO_COUNT = 16;
export const MACRO_MAX_STEPS = 70;
export const MACRO_CONTEXT_COUNT_OFFSET = 31;

export const SHORTCUT_STORAGE_BASE = 0x0100;
export const SHORTCUT_SLOT_SIZE = 32;
export const SHORTCUT_COUNT = 16;
export const SHORTCUT_MAX_KEYS = 3;

export const PERF_2BYTE = {
  keyDebounce: 0x004c,
  motionSync: 0x004e,
  allLedOffTime: 0x0050,
  linearCorrection: 0x0052,
  rippleControl: 0x0054,
  powerSaving: 0x0056,
  sensorSleepTime: 0x0058,
  customSleepEnable: 0x005a,
};

export const POLLING_RATES = [
  { rate: 125, code: 8, label: "125 Hz" },
  { rate: 250, code: 4, label: "250 Hz" },
  { rate: 500, code: 2, label: "500 Hz" },
  { rate: 1000, code: 1, label: "1000 Hz" },
  { rate: 2000, code: 16, label: "2000 Hz (4K only)", is4kOnly: true },
  { rate: 4000, code: 32, label: "4000 Hz (4K only)", is4kOnly: true },
];

export function codeToPollingRate(code) {
  const match = POLLING_RATES.find((r) => r.code === code);
  return match ? match.rate : 1000;
}

export function pollingRateToCode(rate) {
  const match = POLLING_RATES.find((r) => r.rate === rate);
  return match ? match.code : 1;
}

export const KEY_CLASSES = {
  KC_CloseKey: 0x00,
  KC_MouseKey: 0x01,
  KC_ChangeDPIKey: 0x02,
  KC_MouseACPANKey: 0x03,
  KC_MouseFireKey: 0x04,
  KC_ShortcutKey: 0x05,
  KC_MacroKey: 0x06,
  KC_ChangeReportRateKey: 0x07,
  KC_DecorativeLampKey: 0x08,
  KC_ChangeConfigKey: 0x09,
  KC_DPILockKey: 0x0a,
  KC_ScrollUpDownKey: 0x0b,
};

export const KEY_CLASS_NAMES = {
  0x00: "Disabled",
  0x01: "Mouse Button",
  0x02: "DPI Switch",
  0x03: "Tilt Scroll",
  0x04: "Rapid Fire",
  0x05: "Multimedia / Shortcut",
  0x06: "Macro Action",
  0x07: "Polling Rate Cycle",
  0x08: "Lighting Toggle",
  0x09: "Profile Switch",
  0x0a: "Sniper / DPI Lock",
  0x0b: "Scroll Wheel",
};

export const MOUSE_BUTTON_MASKS = {
  1: "Left Click",
  2: "Right Click",
  4: "Middle Click",
  8: "Side Backward",
  16: "Side Forward",
};

export const DPI_SWITCH_MODES = {
  1: "DPI Loop (Cycle)",
  2: "DPI + (Increase)",
  3: "DPI - (Decrease)",
};

export const MULTIMEDIA_KEYS = [
  { name: "Media Player", code: 0x0183 },
  { name: "Play/Pause", code: 0x00cd },
  { name: "Next Track", code: 0x00b5 },
  { name: "Previous Track", code: 0x00b6 },
  { name: "Stop", code: 0x00b7 },
  { name: "Mute", code: 0x00e2 },
  { name: "Volume Up", code: 0x00e9 },
  { name: "Volume Down", code: 0x00ea },
  { name: "Email", code: 0x018a },
  { name: "Calculator", code: 0x0192 },
  { name: "My Computer", code: 0x0194 },
  { name: "Browser Home", code: 0x0223 },
  { name: "Web Search", code: 0x0221 },
  { name: "Web Forward", code: 0x0225 },
  { name: "Web Back", code: 0x0224 },
  { name: "Web Refresh", code: 0x0227 },
  { name: "Web Favorites", code: 0x022a },
  { name: "Web Stop", code: 0x0226 },
];

export const MODIFIER_NAMES = {
  1: "LCtrl",
  2: "LShift",
  4: "LAlt",
  8: "LWin",
  16: "RCtrl",
  32: "RShift",
  64: "RAlt",
  128: "RWin",
};

export const HID_KEY_NAMES = {
  1: "LCtrl",
  2: "LShift",
  4: "A",
  5: "B",
  6: "C",
  7: "D",
  8: "E",
  9: "F",
  10: "G",
  11: "H",
  12: "I",
  13: "J",
  14: "K",
  15: "L",
  16: "M",
  17: "N",
  18: "O",
  19: "P",
  20: "Q",
  21: "R",
  22: "S",
  23: "T",
  24: "U",
  25: "V",
  26: "W",
  27: "X",
  28: "Y",
  29: "Z",
  30: "1",
  31: "2",
  32: "3",
  33: "4",
  34: "5",
  35: "6",
  36: "7",
  37: "8",
  38: "9",
  39: "0",
  40: "Enter",
  41: "Esc",
  42: "Backspace",
  43: "Tab",
  44: "Space",
  45: "-",
  46: "=",
  47: "[",
  48: "]",
  49: "Backslash",
  51: ";",
  52: "'",
  53: "`",
  54: ",",
  55: ".",
  56: "/",
  57: "CapsLock",
  58: "F1",
  59: "F2",
  60: "F3",
  61: "F4",
  62: "F5",
  63: "F6",
  64: "F7",
  65: "F8",
  66: "F9",
  67: "F10",
  68: "F11",
  69: "F12",
  70: "Screen",
  71: "Scroll",
  72: "Pause",
  73: "Insert",
  74: "Home",
  75: "PageUp",
  76: "Del",
  77: "End",
  78: "PageDn",
  79: "Right Arrow",
  80: "Left Arrow",
  81: "Down Arrow",
  82: "Up Arrow",
  83: "NumLock",
  84: "Num/",
  85: "Num*",
  86: "Num-",
  87: "Num+",
  88: "Enter",
  89: "Num1",
  90: "Num2",
  91: "Num3",
  92: "Num4",
  93: "Num5",
  94: "Num6",
  95: "Num7",
  96: "Num8",
  97: "Num9",
  98: "Num0",
  99: "Num.",
  100: "IntlBackslash",
  101: "Apps",
  103: "=",
  128: "RWin",
  181: "Next Track",
  182: "Previous Track",
  183: "Stop",
  205: "Play/Pause",
  226: "Mute",
  233: "Vol+",
  234: "Vol-",
  387: "Media Player",
  394: "Email",
  402: "Calc",
  404: "Computer",
  545: "BrowserSearch",
  547: "BrowserHome",
  548: "BrowserBack",
  549: "BrowserForward",
  550: "BrowserStop",
  551: "BrowserRefresh",
  554: "Favorite",
};

export const SCROLL_MODES = {
  1: "Scroll Up",
  2: "Scroll Down",
};

export const PHYSICAL_BUTTON_DEFAULTS = [
  {
    index: 0,
    addr: 0x0060,
    name: "Left Click",
    class: 0x01,
    p1: 1,
    p2: 0,
    desc: "Primary Click",
  },
  {
    index: 1,
    addr: 0x0064,
    name: "Right Click",
    class: 0x01,
    p1: 2,
    p2: 0,
    desc: "Secondary Click",
  },
  {
    index: 2,
    addr: 0x0068,
    name: "Middle Click",
    class: 0x01,
    p1: 4,
    p2: 0,
    desc: "Middle Mouse Button / Wheel Click",
  },
  {
    index: 3,
    addr: 0x006c,
    name: "Side Backward",
    class: 0x01,
    p1: 8,
    p2: 0,
    desc: "Side Button 4 (Backward)",
  },
  {
    index: 4,
    addr: 0x0070,
    name: "Side Forward",
    class: 0x01,
    p1: 16,
    p2: 0,
    desc: "Side Button 5 (Forward)",
  },
  {
    index: 5,
    addr: 0x0074,
    name: "DPI Switch",
    class: 0x02,
    p1: 1,
    p2: 0,
    desc: "Cycle DPI Stages",
  },
];

export const BATTERY_CURVE_MV = [
  3050, 3420, 3480, 3540, 3600, 3660, 3720, 3760, 3800, 3840, 3880, 3920, 3940,
  3960, 3980, 4000, 4020, 4040, 4060, 4080, 4110,
];

export function calculateBatteryPercent(mv) {
  if (!mv || mv <= BATTERY_CURVE_MV[0]) return 0;
  if (mv >= BATTERY_CURVE_MV[BATTERY_CURVE_MV.length - 1]) return 100;

  for (let i = 0; i < BATTERY_CURVE_MV.length - 1; i++) {
    const lowMv = BATTERY_CURVE_MV[i];
    const highMv = BATTERY_CURVE_MV[i + 1];
    if (mv >= lowMv && mv <= highMv) {
      const stepFraction = (mv - lowMv) / (highMv - lowMv);
      const lowPct = i * 5;
      return Math.round(lowPct + stepFraction * 5);
    }
  }
  return 100;
}

export const MIN_DPI = 50;
export const MAX_DPI = 26000;
export const DPI_STEP = 50;

export function encodeDpiRecord(targetDPI) {
  const clamped = Math.max(
    MIN_DPI,
    Math.min(MAX_DPI, Math.round(targetDPI / DPI_STEP) * DPI_STEP),
  );
  const rawCode = Math.floor(clamped / 50) - 1;
  let dpiEx = 0;

  if (clamped > 12800) {
    const highBits = rawCode >> 8;
    dpiEx = (highBits << 2) | (highBits << 6);
  }

  const xDpi = rawCode & 0xff;
  const yDpi = rawCode & 0xff;
  const checksum = (0x55 - (xDpi + yDpi + dpiEx)) & 0xff;

  return [xDpi, yDpi, dpiEx, checksum];
}

export function decodeDpiRecord(record) {
  if (!record || record.length < 3) return 800;
  const xDpi = record[0];
  const dpiEx = record[2];
  const highBits = Math.max((dpiEx >> 6) & 0x03, (dpiEx >> 2) & 0x03);
  let dpi = (((highBits << 8) | xDpi) + 1) * 50;
  if (dpiEx & 0x22) dpi *= 2;
  if (dpiEx & 0x11) dpi *= 2;
  return Math.max(MIN_DPI, Math.min(MAX_DPI, dpi));
}

export function build2ByteRecord(value) {
  const val = value & 0xff;
  return [val, (0x55 - val) & 0xff];
}

export function build4ByteRecord(b0, b1, b2) {
  const byte0 = b0 & 0xff;
  const byte1 = b1 & 0xff;
  const byte2 = b2 & 0xff;
  const checksum = (0x55 - (byte0 + byte1 + byte2)) & 0xff;
  return [byte0, byte1, byte2, checksum];
}

export function calculateHostChecksum(data16) {
  let sum = REPORT_ID;
  for (let i = 0; i < 15; i++) {
    sum += data16[i] || 0;
  }
  return (0x55 - sum) & 0xff;
}

export function buildHostPacket(cmdId, addr = 0, payload = []) {
  const buf = new Uint8Array(16);
  buf[0] = cmdId & 0xff;
  buf[1] = 0x00;
  buf[2] = (addr >> 8) & 0xff;
  buf[3] = addr & 0xff;
  buf[4] = Math.min(10, payload.length);

  for (let i = 0; i < buf[4]; i++) {
    buf[5 + i] = payload[i] & 0xff;
  }

  buf[15] = calculateHostChecksum(buf);
  return buf;
}
