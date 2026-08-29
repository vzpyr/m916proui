import {
  UsbCommandID,
  FlashAddr,
  MACRO_STORAGE_BASE,
  MACRO_SLOT_SIZE,
  MACRO_HEADER_SIZE,
  MACRO_NAME_MAX,
  MACRO_COUNT,
  MACRO_MAX_STEPS,
  MACRO_CONTEXT_COUNT_OFFSET,
  SHORTCUT_STORAGE_BASE,
  SHORTCUT_SLOT_SIZE,
  SHORTCUT_COUNT,
  SHORTCUT_MAX_KEYS,
  PERF_2BYTE,
  codeToPollingRate,
  pollingRateToCode,
  encodeDpiRecord,
  decodeDpiRecord,
  build2ByteRecord,
  build4ByteRecord,
  PHYSICAL_BUTTON_DEFAULTS,
  HID_KEY_NAMES,
  MODIFIER_NAMES,
} from "./protocol.js";
import { transport } from "./transport.js";

const MACRO_CTX_TYPE_KEY = 0x01;
const MACRO_CTX_TYPE_MOUSE = 0x04;
const MACRO_CTX_DOWN = 0x80;
const MACRO_CTX_UP = 0x40;

const MOUSE_BUTTON_LABELS = {
  1: "Left Click",
  2: "Right Click",
  4: "Middle Click",
  8: "Side Backward",
  16: "Side Forward",
};

function keyLabel(code, typeNibble) {
  if (typeNibble === 0) {
    return MODIFIER_NAMES[code] || `Mod 0x${code.toString(16)}`;
  }
  return HID_KEY_NAMES[code] || `Key 0x${code.toString(16)}`;
}

function mouseLabel(code) {
  return MOUSE_BUTTON_LABELS[code] || `Click 0x${code.toString(16)}`;
}

function shortcutTypeNibble(key) {
  if (key.type === "mouse") return MACRO_CTX_TYPE_MOUSE;
  if (key.type === "mod") return 0x00;
  return key.hidCode > 0xff ? 0x02 : MACRO_CTX_TYPE_KEY;
}

function decodeLegacyMacroSteps(slot, stepCount) {
  const steps = [];
  for (let s = 0; s < stepCount; s++) {
    const base = MACRO_HEADER_SIZE + s * 8;
    const keyState = slot[base];
    const typeCode = slot[base + 1];
    if (keyState > 1 || typeCode > 2) return null;
    const code = slot[base + 2] | (slot[base + 3] << 8);
    const delay = Math.min(
      65535,
      (slot[base + 4] |
        (slot[base + 5] << 8) |
        (slot[base + 6] << 16) |
        (slot[base + 7] << 24)) >>>
        0,
    );
    if (typeCode === 1) {
      steps.push({
        type: "mouse",
        keyState,
        value: `${mouseLabel(code)} ${keyState ? "Down" : "Up"}`,
        hidCode: code,
        delay: Math.max(1, delay || 20),
      });
    } else if (typeCode === 2) {
      steps.push({
        type: "delay",
        keyState: 0,
        value: `Delay ${delay} ms`,
        hidCode: 0,
        delay,
      });
    } else {
      steps.push({
        type: "key",
        keyState,
        value: `Key ${keyLabel(code, MACRO_CTX_TYPE_KEY)} ${keyState ? "Down" : "Up"}`,
        hidCode: code,
        delay: Math.max(1, delay || 20),
      });
    }
  }
  return steps;
}

function bytesEq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class MouseApi {
  static async readFlashChunk(addr, length = 4) {
    const len = Math.min(10, Math.max(1, length));
    const tryRead = async () => {
      try {
        return await transport.exchange(
          UsbCommandID.ReadFlashData,
          addr,
          new Array(len).fill(0),
          700,
        );
      } catch (_) {
        return null;
      }
    };
    let resp = await tryRead();
    if (!resp) resp = await tryRead();
    if (!resp) return null;
    const respLen = resp[4] || len;
    return resp.subarray(5, 5 + respLen);
  }

  static async writeFlashChunk(addr, dataBytes) {
    const bytes = Array.from(dataBytes).slice(0, 10);
    for (let attempt = 0; attempt < 4; attempt++) {
      await transport.sendPacket(UsbCommandID.WriteFlashData, addr, bytes);
      await transport.awaitAck(UsbCommandID.WriteFlashData, addr, 400);
      await transport.sleep(15);
      const rb = await this.readFlashChunk(addr, bytes.length);
      if (rb && bytes.every((b, i) => rb[i] === b)) return;
    }
    throw new Error(
      `Flash write rejected at 0x${addr.toString(16).toUpperCase()}. ` +
        "Unplug and replug the receiver, then try again.",
    );
  }

  static async readBattery() {
    try {
      const resp = await transport.exchange(
        UsbCommandID.BatteryLevel,
        0,
        [],
        600,
      );
      if (!resp || resp.length < 6) return null;

      const level = resp[5];
      const isCharging = resp[6];
      if (level < 1 || level > 100 || (isCharging !== 0 && isCharging !== 1)) {
        return null;
      }

      return {
        mv: (resp[7] << 8) | resp[8],
        percent: level,
        isCharging: !!isCharging,
      };
    } catch (_) {
      return null;
    }
  }

  static async readCidMid() {
    try {
      const resp = await transport.exchange(
        UsbCommandID.ReadCIDMID,
        0,
        [0x01],
        600,
      );
      if (resp && resp.length >= 7 && resp[4] === 2) {
        return {
          cid: resp[5],
          mid: resp[6],
        };
      }
    } catch (_) {}
    const info = transport.getDeviceInfo();
    return { cid: info ? info.cid : 23, mid: info ? info.mid : 5 };
  }

  static async readVersion() {
    try {
      const resp = await transport.exchange(
        UsbCommandID.ReadVersionID,
        0,
        [0x01],
        600,
      );
      if (!resp) return null;
      const len = resp[4] || 8;
      const sub = resp.subarray(5, 5 + len);
      let str = "";
      for (let i = 0; i < sub.length; i++) {
        if (sub[i] >= 32 && sub[i] <= 126) {
          str += String.fromCharCode(sub[i]);
        }
      }
      return str.trim() || null;
    } catch (_) {
      return null;
    }
  }

  static async readLongRangeMode() {
    try {
      const resp = await transport.exchange(
        UsbCommandID.GetLongRangeMode,
        0,
        [0x00],
        500,
      );
      if (!resp || resp.length < 6) return false;
      const modeByte = resp[4] >= 2 ? resp[6] : resp[5];
      return modeByte === 0x01;
    } catch (_) {
      return false;
    }
  }

  static async setLongRangeMode(enabled) {
    await transport.sendPacket(UsbCommandID.SetLongRangeMode, 0, [
      enabled ? 0x01 : 0x00,
    ]);
    await transport.sleep(50);
  }

  static async get4kDongleRgb() {
    try {
      const resp = await transport.exchange(
        UsbCommandID.Get4KDongleRGBValue,
        0,
        [0x01],
        600,
      );
      if (!resp || resp.length < 15) return null;
      const colors = [
        { r: resp[6], g: resp[7], b: resp[8] },
        { r: resp[9], g: resp[10], b: resp[11] },
        { r: resp[12], g: resp[13], b: resp[14] },
      ];
      if (colors.every((c) => c.r === 0 && c.g === 0 && c.b === 0)) {
        return null;
      }
      return {
        mode: resp[5],
        colors,
      };
    } catch (_) {
      return null;
    }
  }

  static async set4kDongleRgb(mode, colors = []) {
    const payload = [mode & 0xff];
    for (let i = 0; i < 3; i++) {
      const c = colors[i] || { r: 0, g: 255, b: 0 };
      payload.push(c.r & 0xff, c.g & 0xff, c.b & 0xff);
    }
    await transport.sendPacket(UsbCommandID.Set4KDongleRGB, 0, payload);
    await transport.sleep(50);
  }

  static async startDonglePairing(cid = 23, mid = 5) {
    await transport.sendPacket(UsbCommandID.DongleEnterPair, 0, [
      cid & 0xff,
      mid & 0xff,
    ]);
    await transport.sleep(100);
  }

  static async getPairState() {
    const resp = await transport.exchange(
      UsbCommandID.GetPairState,
      0,
      [0x01],
      500,
    );
    if (!resp) return 1;
    return resp[5] || 1;
  }

  static async enterSurfaceCalibration() {
    await transport.sendPacket(UsbCommandID.EnterMTKMode, 0, [0x01]);
    await transport.sleep(100);
  }

  static async factoryReset() {
    await transport.sendPacket(UsbCommandID.ClearSetting, 0, [0x01]);
    await transport.sleep(250);
  }

  static async reloadSensorConfig(profileIndex = 0) {
    await transport.sendPacket(UsbCommandID.SetCurrentConfig, 0, [
      profileIndex & 0x01,
    ]);
    await transport.sleep(60);
  }

  static async setActiveDpiStage(stageIndex, profileIndex = 0) {
    if (!transport.isConnected()) return;
    try {
      await this.writeFlashChunk(
        FlashAddr.CurrentDPI,
        build2ByteRecord(stageIndex),
      );
      await this.reloadSensorConfig(profileIndex);
    } catch (_) {}
  }

  static async liveUpdateDpi(stageIndex, targetDPI, profileIndex = 0) {
    if (!transport.isConnected()) return;
    try {
      const addr = FlashAddr.DPIStages + stageIndex * 4;
      const rec = encodeDpiRecord(targetDPI);
      await this.writeFlashChunk(addr, rec);
      await this.reloadSensorConfig(profileIndex);
    } catch (_) {}
  }

  static async readMacrosFromFlash() {
    const macros = [];
    const header = new Uint8Array(40);
    for (let i = 0; i < MACRO_COUNT; i++) {
      const headerAddr = MACRO_STORAGE_BASE + i * MACRO_SLOT_SIZE;

      let headerOk = true;
      for (let off = 0; off < 40; off += 10) {
        const part = await this.readFlashChunk(
          headerAddr + off,
          Math.min(10, 40 - off),
        );
        if (!part) {
          headerOk = false;
          break;
        }
        header.set(part, off);
      }
      if (!headerOk) continue;

      const nameLen = header[0];
      if (nameLen === 0 || nameLen > MACRO_NAME_MAX) continue;

      const c31 = header[31];
      const c21 = header[21];
      let count = 0;
      let headerSize = 0;
      let stepBytes = 0;
      if (c31 >= 2 && c31 <= MACRO_MAX_STEPS) {
        count = c31;
        headerSize = 32;
        stepBytes = 5;
      } else if (c21 >= 2 && c21 <= MACRO_MAX_STEPS) {
        count = c21;
        headerSize = 22;
        stepBytes = 5;
      } else if (c31 >= 2 && c31 <= 44) {
        count = c31;
        headerSize = 32;
        stepBytes = 8;
      }
      if (count === 0) continue;

      const need = headerSize + count * stepBytes + 1;
      const slot = new Uint8Array(Math.max(40, need));
      slot.set(header.subarray(0, Math.min(40, need)));
      let readOk = true;
      for (let off = 40; off < need; off += 10) {
        const part = await this.readFlashChunk(
          headerAddr + off,
          Math.min(10, need - off),
        );
        if (!part) {
          readOk = false;
          break;
        }
        slot.set(part, off);
      }
      if (!readOk) continue;

      let steps = null;
      if (stepBytes === 5 && headerSize === 32) {
        steps = this.decodeMacroContexts(slot, count, 32);
      } else if (stepBytes === 5 && headerSize === 22) {
        steps = this.decodeMacroContexts(slot, count, 22);
      } else {
        steps = decodeLegacyMacroSteps(slot, count);
      }
      if (!steps) continue;

      let name = "";
      for (let j = 1; j <= nameLen; j++) {
        const c = slot[j];
        if (c >= 32 && c <= 126) name += String.fromCharCode(c);
      }
      name = name.trim() || `Macro #${i + 1}`;
      macros.push({ name, steps, slot: i });
    }
    return macros;
  }

  static decodeMacroContexts(slot, stepCount, headerSize = MACRO_HEADER_SIZE) {
    if (stepCount < 2 || stepCount > MACRO_MAX_STEPS) return null;
    const ctxBytes = stepCount * 5;
    const checkOffset = headerSize + ctxBytes;
    let sum = stepCount;
    for (let b = headerSize; b < checkOffset; b++) sum += slot[b];
    if (slot[checkOffset] !== ((0x55 - sum) & 0xff)) return null;

    const steps = [];
    for (let s = 0; s < stepCount; s++) {
      const base = headerSize + s * 5;
      const b0 = slot[base];
      const code = slot[base + 1] | (slot[base + 2] << 8);
      const delay = (slot[base + 3] << 8) | slot[base + 4];
      const typeNibble = b0 & 0x0f;
      const isDown = (b0 & 0xc0) === MACRO_CTX_DOWN;
      const keyState = isDown ? 1 : 0;

      if (code === 0 && delay > 0 && typeNibble === 0x00) {
        steps.push({
          type: "delay",
          keyState: 0,
          value: `Delay ${delay} ms`,
          hidCode: 0,
          delay,
        });
      } else if (typeNibble === MACRO_CTX_TYPE_MOUSE) {
        steps.push({
          type: "mouse",
          keyState,
          value: `${mouseLabel(code)} ${isDown ? "Down" : "Up"}`,
          hidCode: code,
          delay: Math.max(1, delay || 20),
        });
      } else if (b0 === 0 && code === 0 && delay === 0) {
        continue;
      } else {
        steps.push({
          type: "key",
          keyState,
          value: `Key ${keyLabel(code, typeNibble)} ${isDown ? "Down" : "Up"}`,
          hidCode: code,
          delay: Math.max(1, delay || 20),
        });
      }
    }
    return steps.length > 0 ? steps : null;
  }

  static buildMacroSlot(m, index = 0) {
    const slot = new Uint8Array(MACRO_SLOT_SIZE);
    const nameStr = (m.name || `Macro ${index + 1}`).slice(0, MACRO_NAME_MAX);
    slot[0] = nameStr.length;
    for (let j = 0; j < nameStr.length; j++) {
      slot[1 + j] = nameStr.charCodeAt(j) & 0xff;
    }

    const steps = (m.steps || []).slice(0, MACRO_MAX_STEPS);
    slot[MACRO_CONTEXT_COUNT_OFFSET] = steps.length;

    for (let s = 0; s < steps.length; s++) {
      const step = steps[s];
      const base = MACRO_HEADER_SIZE + s * 5;
      const code = step.hidCode || 0;
      const delay = Math.min(65535, Math.max(0, step.delay || 0));
      if (step.type === "mouse") {
        slot[base] =
          (step.keyState ? MACRO_CTX_DOWN : MACRO_CTX_UP) |
          MACRO_CTX_TYPE_MOUSE;
      } else if (step.type === "delay") {
        slot[base] = 0x00;
      } else {
        slot[base] =
          (step.keyState ? MACRO_CTX_DOWN : MACRO_CTX_UP) | MACRO_CTX_TYPE_KEY;
      }
      slot[base + 1] = code & 0xff;
      slot[base + 2] = (code >> 8) & 0xff;
      slot[base + 3] = (delay >> 8) & 0xff;
      slot[base + 4] = delay & 0xff;
    }

    let sum = slot[MACRO_CONTEXT_COUNT_OFFSET];
    for (
      let b = MACRO_HEADER_SIZE;
      b < MACRO_HEADER_SIZE + steps.length * 5;
      b++
    ) {
      sum += slot[b];
    }
    slot[MACRO_HEADER_SIZE + steps.length * 5] = (0x55 - sum) & 0xff;
    return slot;
  }

  static async commitMacrosToFlash(macros = [], opts = {}) {
    const liveCount = Math.min(MACRO_COUNT, macros.length);
    const prev = opts.prevMacros || [];
    const prevSlots = (opts.prevSlots || []).filter(
      (s) => Number.isInteger(s) && s >= 0 && s < MACRO_COUNT,
    );

    const writeSlot = async (slotIdx, slot) => {
      const base = MACRO_STORAGE_BASE + slotIdx * MACRO_SLOT_SIZE;
      for (let off = 0; off < MACRO_SLOT_SIZE; off += 10) {
        await this.writeFlashChunk(
          base + off,
          Array.from(slot.slice(off, off + 10)),
        );
      }
    };

    for (let i = 0; i < liveCount; i++) {
      const m = macros[i];
      if (!m) continue;
      const slot = this.buildMacroSlot(m, i);
      const prevMacro = prev[i];
      const unchanged =
        prevMacro &&
        prevMacro.slot === i &&
        bytesEq(
          Array.from(slot),
          Array.from(this.buildMacroSlot(prevMacro, i)),
        );
      if (!unchanged) {
        await writeSlot(i, slot);
      }
      m.slot = i;
    }

    const liveSet = new Set(Array.from({ length: liveCount }, (_, i) => i));
    for (const s of new Set(prevSlots.filter((x) => !liveSet.has(x)))) {
      const base = MACRO_STORAGE_BASE + s * MACRO_SLOT_SIZE;
      const head = await this.readFlashChunk(base, 10);
      if (head && head[0] === 0) continue;
      for (let off = 0; off < 32; off += 10) {
        await this.writeFlashChunk(base + off, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      }
    }
  }

  static buildShortcutSlot(keys) {
    const slot = new Uint8Array(SHORTCUT_SLOT_SIZE);
    const slim = (keys || []).slice(0, SHORTCUT_MAX_KEYS);
    const contexts = [];
    const encode = (key, down) => {
      const nib = shortcutTypeNibble(key);
      const code = key.hidCode || 0;
      const head = down ? MACRO_CTX_DOWN : MACRO_CTX_UP;
      return [head | nib, code & 0xff, (code >> 8) & 0xff];
    };
    for (const key of slim) contexts.push(encode(key, true));
    for (let k = slim.length - 1; k >= 0; k--)
      contexts.push(encode(slim[k], false));

    slot[0] = contexts.length;
    for (let j = 0; j < contexts.length; j++) {
      slot[1 + j * 3] = contexts[j][0];
      slot[2 + j * 3] = contexts[j][1];
      slot[3 + j * 3] = contexts[j][2];
    }

    let sum = 0;
    for (let b = 0; b <= contexts.length * 3; b++) sum += slot[b];
    slot[1 + contexts.length * 3] = (0x55 - sum) & 0xff;
    return slot;
  }

  static async commitShortcutsToFlash(shortcuts = [], opts = {}) {
    const prev = opts.prevShortcuts || [];
    for (let i = 0; i < SHORTCUT_COUNT; i++) {
      const slotAddr = SHORTCUT_STORAGE_BASE + i * SHORTCUT_SLOT_SIZE;
      const slot = this.buildShortcutSlot(
        (shortcuts[i] && shortcuts[i].keys) || [],
      );
      const prevSlot = prev[i]
        ? this.buildShortcutSlot(prev[i].keys || [])
        : null;
      if (!prevSlot || !bytesEq(Array.from(slot), Array.from(prevSlot))) {
        for (let off = 0; off < SHORTCUT_SLOT_SIZE; off += 10) {
          await this.writeFlashChunk(
            slotAddr + off,
            Array.from(slot.slice(off, off + 10)),
          );
        }
      }
    }
  }

  static async readShortcutsFromFlash() {
    const shortcuts = [];
    for (let i = 0; i < SHORTCUT_COUNT; i++) {
      const slotAddr = SHORTCUT_STORAGE_BASE + i * SHORTCUT_SLOT_SIZE;

      const head = await this.readFlashChunk(slotAddr, 10);
      if (!head) {
        shortcuts.push({ keys: [] });
        continue;
      }
      const count = head[0];
      if (count === 0 || count < 2 || count > 6 || count % 2 !== 0) {
        shortcuts.push({ keys: [] });
        continue;
      }

      const slot = new Uint8Array(SHORTCUT_SLOT_SIZE);
      slot.set(head, 0);
      for (let off = 10; off < SHORTCUT_SLOT_SIZE; off += 10) {
        const part = await this.readFlashChunk(
          slotAddr + off,
          Math.min(10, SHORTCUT_SLOT_SIZE - off),
        );
        if (!part) break;
        slot.set(part, off);
      }

      let sum = 0;
      for (let b = 0; b <= count * 3; b++) sum += slot[b];
      if (slot[1 + count * 3] !== ((0x55 - sum) & 0xff)) {
        shortcuts.push({ keys: [] });
        continue;
      }

      const keys = [];
      for (let k = 0; k < count / 2; k++) {
        const base = 1 + k * 3;
        const b0 = slot[base];
        const typeNibble = b0 & 0x0f;
        const code = slot[base + 1] | (slot[base + 2] << 8);
        if (typeNibble === MACRO_CTX_TYPE_MOUSE) {
          keys.push({ type: "mouse", keyState: 1, hidCode: code, delay: 0 });
        } else if (typeNibble === 0x00) {
          keys.push({ type: "mod", keyState: 1, hidCode: code, delay: 0 });
        } else {
          keys.push({ type: "key", keyState: 1, hidCode: code, delay: 0 });
        }
      }
      shortcuts.push({ keys });
    }
    return shortcuts;
  }

  static async readAllSettings() {
    if (!transport.isConnected()) {
      throw new Error("Device is not connected");
    }

    const rateChunk = await this.readFlashChunk(FlashAddr.ReportRate, 2);
    const maxDpiChunk = await this.readFlashChunk(FlashAddr.MaxDPI, 2);
    const currentDpiChunk = await this.readFlashChunk(FlashAddr.CurrentDPI, 2);
    const silenceChunk = await this.readFlashChunk(FlashAddr.SilenceHeight, 2);

    const reportRateCode = rateChunk ? rateChunk[0] : 1;
    const maxDPI = maxDpiChunk
      ? Math.max(1, Math.min(8, maxDpiChunk[0] || 5))
      : 5;
    const currentDPIIndex = currentDpiChunk
      ? Math.max(0, Math.min(maxDPI - 1, currentDpiChunk[0] || 0))
      : 0;
    const silenceHeight = silenceChunk ? silenceChunk[0] : 0;

    const dpiStages = [];
    for (let i = 0; i < 8; i++) {
      const addr = FlashAddr.DPIStages + i * 4;
      const chunk = await this.readFlashChunk(addr, 4);
      if (chunk && chunk.length >= 3) {
        dpiStages.push(decodeDpiRecord(chunk));
      } else {
        dpiStages.push(800 + i * 400);
      }
    }

    const defaultColors = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
      { r: 255, g: 128, b: 0 },
      { r: 255, g: 255, b: 255 },
    ];
    const dpiColors = [];
    for (let i = 0; i < 8; i++) {
      const addr = FlashAddr.DPIColors + i * 4;
      const chunk = await this.readFlashChunk(addr, 4);
      if (chunk && chunk.length >= 3) {
        dpiColors.push({ r: chunk[0], g: chunk[1], b: chunk[2] });
      } else {
        dpiColors.push(defaultColors[i] || { r: 255, g: 0, b: 0 });
      }
    }

    const perfAddr = {
      keyDebounce: PERF_2BYTE.keyDebounce,
      motionSync: PERF_2BYTE.motionSync,
      linearCorrection: PERF_2BYTE.linearCorrection,
      rippleControl: PERF_2BYTE.rippleControl,
      powerSaving: PERF_2BYTE.powerSaving,
      sensorSleepTime: PERF_2BYTE.sensorSleepTime,
      customSleepEnable: PERF_2BYTE.customSleepEnable,
    };
    const perfRaw = {};
    for (const [key, addr] of Object.entries(perfAddr)) {
      const chunk = await this.readFlashChunk(addr, 2);
      perfRaw[key] = chunk ? chunk[0] : 0;
    }

    const keyDebounce = perfRaw.keyDebounce || 4;
    const motionSync = perfRaw.motionSync || 0;
    const linearCorrection = perfRaw.linearCorrection || 0;
    const rippleControl = perfRaw.rippleControl || 0;
    const powerSaving = perfRaw.powerSaving || 0;
    const rawSleep = perfRaw.sensorSleepTime;
    const rawEnable = perfRaw.customSleepEnable;
    const isSleepOff = rawSleep === 255 || rawEnable === 0;
    const customSleepEnable = !isSleepOff;
    const sensorSleepTime = isSleepOff
      ? 2
      : Math.min(254, Math.max(1, rawSleep));

    const keyBindings = [];
    for (let i = 0; i < 6; i += 2) {
      const addr = FlashAddr.KeyBindings + i * 4;
      const chunk = await this.readFlashChunk(addr, 8);
      if (chunk && chunk.length >= 8) {
        keyBindings.push({
          index: i,
          class: chunk[0],
          param1: chunk[1],
          param2: chunk[2],
        });
        keyBindings.push({
          index: i + 1,
          class: chunk[4],
          param1: chunk[5],
          param2: chunk[6],
        });
      } else {
        const d1 = PHYSICAL_BUTTON_DEFAULTS[i];
        const d2 = PHYSICAL_BUTTON_DEFAULTS[i + 1];
        keyBindings.push({
          index: i,
          class: d1.class,
          param1: d1.p1,
          param2: d1.p2,
        });
        keyBindings.push({
          index: i + 1,
          class: d2.class,
          param1: d2.p1,
          param2: d2.p2,
        });
      }
    }

    const battery = await this.readBattery();
    const version = await this.readVersion();
    const cidMid = await this.readCidMid();
    const longRangeMode = await this.readLongRangeMode();
    const dongleRgb = await this.get4kDongleRgb();
    const macros = await this.readMacrosFromFlash();
    const shortcuts = await this.readShortcutsFromFlash();

    return {
      reportRate: codeToPollingRate(reportRateCode),
      reportRateCode,
      maxDPI,
      currentDPIIndex,
      silenceHeight,
      dpiStages,
      dpiColors,
      perf: {
        keyDebounce,
        motionSync: !!motionSync,
        linearCorrection: !!linearCorrection,
        rippleControl: !!rippleControl,
        powerSaving: !!powerSaving,
        sensorSleepTime,
        customSleepEnable: !!customSleepEnable,
      },
      keyBindings,
      battery,
      version,
      cid: cidMid.cid,
      mid: cidMid.mid,
      longRangeMode,
      dongleRgb,
      macros,
      shortcuts,
    };
  }

  static async commitSettings(state, opts = {}) {
    if (!transport.isConnected()) {
      throw new Error("Device is not connected");
    }

    const prev = opts.prevState || null;
    const rec2 = (v) => build2ByteRecord(v);
    const rec4 = (b0, b1, b2) => build4ByteRecord(b0, b1, b2);
    const prevRec2 = (field, fallback = 0) => {
      const v = prev ? prev[field] : undefined;
      return v === undefined ? null : rec2(v ?? fallback);
    };
    const writeIfChanged = async (rec, prevRec, addr) => {
      if (!prevRec || !bytesEq(rec, prevRec)) {
        await this.writeFlashChunk(addr, rec);
      }
    };

    const rateRec = rec2(pollingRateToCode(state.reportRate));
    await writeIfChanged(
      rateRec,
      prev ? rec2(pollingRateToCode(prev.reportRate ?? 1000)) : null,
      FlashAddr.ReportRate,
    );

    await writeIfChanged(
      rec2(state.maxDPI || 5),
      prevRec2("maxDPI", 5),
      FlashAddr.MaxDPI,
    );
    await writeIfChanged(
      rec2(state.currentDPIIndex || 0),
      prevRec2("currentDPIIndex", 0),
      FlashAddr.CurrentDPI,
    );
    await writeIfChanged(
      rec2(state.silenceHeight || 0),
      prevRec2("silenceHeight", 0),
      FlashAddr.SilenceHeight,
    );

    for (const addr of [FlashAddr.XSpindown, FlashAddr.YSpindown]) {
      const cur = await this.readFlashChunk(addr, 2);
      await writeIfChanged(rec2(0), cur ? Array.from(cur) : null, addr);
    }

    for (let i = 0; i < 8; i++) {
      const rec = encodeDpiRecord(state.dpiStages[i] || 800);
      const prevStage = prev ? prev.dpiStages?.[i] : undefined;
      await writeIfChanged(
        rec,
        prevStage === undefined ? null : encodeDpiRecord(prevStage || 800),
        FlashAddr.DPIStages + i * 4,
      );
    }

    for (let i = 0; i < 8; i++) {
      const c = state.dpiColors[i] || { r: 255, g: 0, b: 0 };
      const rec = rec4(c.r, c.g, c.b);
      const cPrev = prev ? prev.dpiColors?.[i] : undefined;
      await writeIfChanged(
        rec,
        cPrev ? rec4(cPrev.r, cPrev.g, cPrev.b) : null,
        FlashAddr.DPIColors + i * 4,
      );
    }

    const perfVal = (p, key) => {
      switch (key) {
        case "keyDebounce":
          return p.keyDebounce || 4;
        case "motionSync":
          return p.motionSync ? 1 : 0;
        case "allLedOffTime":
          return 0;
        case "linearCorrection":
          return p.linearCorrection ? 1 : 0;
        case "rippleControl":
          return p.rippleControl ? 1 : 0;
        case "powerSaving":
          return p.powerSaving ? 1 : 0;
        case "sensorSleepTime": {
          const raw = p.sensorSleepTime ?? 2;
          if (p.customSleepEnable === false) return 255;
          return Math.min(254, Math.max(1, raw));
        }
        case "customSleepEnable":
          return p.customSleepEnable !== false ? 1 : 0;
        default:
          return 0;
      }
    };
    const sp = state.perf || {};
    const pp = (prev && prev.perf) || null;
    for (const [key, addr] of Object.entries(PERF_2BYTE)) {
      await writeIfChanged(
        rec2(perfVal(sp, key)),
        pp ? rec2(perfVal(pp, key)) : null,
        addr,
      );
    }

    const db = (b, i) => b || PHYSICAL_BUTTON_DEFAULTS[i];
    for (let i = 0; i < 6; i++) {
      const b = db(state.keyBindings[i], i);
      const rec = rec4(b.class, b.param1, b.param2);
      const bPrev = prev && prev.keyBindings ? prev.keyBindings[i] : null;
      await writeIfChanged(
        rec,
        bPrev ? rec4(bPrev.class, bPrev.param1, bPrev.param2) : null,
        FlashAddr.KeyBindings + i * 4,
      );
    }

    if (!prev || !!prev.longRangeMode !== !!state.longRangeMode) {
      if (state.longRangeMode !== undefined) {
        await this.setLongRangeMode(state.longRangeMode);
      }
    }

    if (state.dongleRgb && state.dongleRgb.mode) {
      const pRgb = prev && prev.dongleRgb;
      const rgbSame =
        pRgb &&
        pRgb.mode === state.dongleRgb.mode &&
        (pRgb.colors || []).length >= 3 &&
        (state.dongleRgb.colors || []).every(
          (c, k) =>
            c.r === (pRgb.colors[k] || {}).r &&
            c.g === (pRgb.colors[k] || {}).g &&
            c.b === (pRgb.colors[k] || {}).b,
        );
      if (!rgbSame) {
        await this.set4kDongleRgb(state.dongleRgb.mode, state.dongleRgb.colors);
      }
    }

    if (state.macros) {
      await this.commitMacrosToFlash(state.macros, opts);
    }
    if (state.shortcuts) {
      await this.commitShortcutsToFlash(state.shortcuts, opts);
    }

    await this.reloadSensorConfig(state.activeProfileIndex || 0);

    return true;
  }
}
