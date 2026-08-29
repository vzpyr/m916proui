import { UsbCommandID, REPORT_ID, USB_VID, DEVICE_MODELS } from "./protocol.js";
import { transport } from "./transport.js";

export const HEADER_LEN = 24 + 11 * 64;
export const BOOT_SIZE = 0x2000;
export const CHUNK_DATA = 0x20;
export const FRAME_LEN = 17 + CHUNK_DATA;

export const CXFILE_TYPE = {
  Boot: 0,
  Keyboard: 209,
  Mouse: 210,
  Dongle: 211,
  Common: 212,
};

export const CXFILE_TYPE_NAMES = {
  0: "Boot loader",
  209: "Keyboard",
  210: "Mouse",
  211: "Receiver dongle",
  212: "Common",
};

export const MCU_NAMES = {
  mouse: "CX52850P",
  dongle1k: "CX52650N",
  dongle4k: "CH32V305",
};

export function formatVersion(uint) {
  if (uint === null || uint === undefined) return null;
  const v = uint >>> 0;
  return `${(v >> 8).toString(16)}.${(v & 0xff).toString(16).padStart(2, "0")}`;
}

function readCStr(bytes, off, max) {
  let s = "";
  for (let i = 0; i < max; i++) {
    const b = bytes[off + i];
    if (b < 32 || b > 126) break;
    s += String.fromCharCode(b);
  }
  return s.trim();
}

function readU32LE(bytes, off) {
  return (
    (bytes[off] |
      (bytes[off + 1] << 8) |
      (bytes[off + 2] << 16) |
      (bytes[off + 3] << 24)) >>>
    0
  );
}

export function parseUpgradeFile(buf) {
  if (!buf || buf.length < HEADER_LEN) {
    return {
      ok: false,
      errors: [
        buf ? `File too small: ${buf.length} bytes` : "No file selected",
      ],
    };
  }
  const header = {
    headCRC: readU32LE(buf, 0x000),
    headLength: readU32LE(buf, 0x004),
    fwLength: readU32LE(buf, 0x008),
    nextFileAddress: readU32LE(buf, 0x00c),
    version: readU32LE(buf, 0x010),
    deviceType: buf[0x014],
    cid: buf[0x015],
    mid: buf[0x016],
    fileId: readCStr(buf, 0x018, 64),
    icName: readCStr(buf, 0x058, 64),
    bootInputEndPoint: readCStr(buf, 0x098, 64),
    bootOutputEndPoint: readCStr(buf, 0x0d8, 64),
    normalInputEndPoint: readCStr(buf, 0x118, 64),
    normalOutputEndPoint: readCStr(buf, 0x158, 64),
    resetToUpdateModeCmd: Array.from(buf.subarray(0x198, 0x1d8)),
    prepareDownLoadCmd: Array.from(buf.subarray(0x1d8, 0x218)),
    dataDownLoadCmd: Array.from(buf.subarray(0x218, 0x258)),
    senserName: readCStr(buf, 0x258, 64),
    productName: readCStr(buf, 0x298, 64),
  };

  header.downloadCmd = header.dataDownLoadCmd[1];
  header.downloadAddr =
    (header.dataDownLoadCmd[6] |
      (header.dataDownLoadCmd[7] << 8) |
      (header.dataDownLoadCmd[8] << 16) |
      (header.dataDownLoadCmd[9] << 24)) >>>
    0;

  const errors = [];
  if (
    header.deviceType !== CXFILE_TYPE.Mouse &&
    header.deviceType !== CXFILE_TYPE.Dongle
  ) {
    errors.push(
      `Unsupported file type ${header.deviceType}. Expected 210 (mouse) or 211 (dongle)`,
    );
  }
  if (header.cid !== 23)
    errors.push(`CID ${header.cid} is not this device's CID (23)`);
  if (header.mid !== 5 && header.mid !== 6) {
    errors.push(`MID ${header.mid} is unknown (5 = 1K, 6 = 4K)`);
  }
  if (!header.icName) errors.push("icName field is empty");
  if (header.downloadAddr >>> 16 === 0xffff) {
    errors.push("File has no valid download address");
  }
  if (header.fwLength < CHUNK_DATA)
    errors.push(`fwLength ${header.fwLength} is implausibly small`);
  if (buf.length < BOOT_SIZE)
    errors.push("File is smaller than the 8 KB boot section");

  return { ok: errors.length === 0, errors, header, bytes: buf };
}

export function icNameMatches(header, devInfo) {
  const name = String(header.icName || "").toUpperCase();
  if (header.deviceType === CXFILE_TYPE.Mouse) return name === MCU_NAMES.mouse;
  return name === MCU_NAMES.dongle1k || name === MCU_NAMES.dongle4k;
}

export function matchUpgradeFile(parsed, devInfo) {
  const { header, errors } = parsed;
  const out = { ok: true, errors: [] };
  const isDongleFile = header.deviceType === CXFILE_TYPE.Dongle;
  const deviceIsDongle = !!(
    devInfo &&
    devInfo.mode &&
    !/wired/i.test(devInfo.mode)
  );

  if (!devInfo) {
    out.ok = false;
    out.errors.push("No device connected");
    return out;
  }
  if (errors.length) {
    out.ok = false;
    out.errors.push(...errors);
  }
  if (!isDongleFile && !/wired/i.test(devInfo.mode || "")) {
    out.ok = false;
    out.errors.push(
      "The mouse must be connected by USB cable to get a firmware update. Flashing over RF can brick it.",
    );
  }
  if (isDongleFile && !deviceIsDongle) {
    out.ok = false;
    out.errors.push(
      "This file targets the receiver dongle. Plug the dongle into USB to update it.",
    );
  }
  if (!isDongleFile && header.mid !== devInfo.mid) {
    out.ok = false;
    out.errors.push(
      `MID mismatch: file targets ${header.mid}, connected device is ${devInfo.mid}`,
    );
  }
  if (header.cid !== devInfo.cid) {
    out.errors.push(
      `CID mismatch: file targets ${header.cid}, device reports ${devInfo.cid}`,
    );
  }
  if (!icNameMatches(header, devInfo)) {
    out.ok = false;
    out.errors.push(
      `MCU mismatch: this target needs ${
        isDongleFile ? "CX52650N (1K) or CH32V305 (4K)" : "CX52850P"
      } but the file carries icName "${header.icName}".`,
    );
  }
  return out;
}

const BOOT_REPORT_ID = REPORT_ID;

function padTo(payload, reportSize) {
  const out = new Uint8Array(reportSize - 1);
  out.fill(0xff);
  out.set(payload.subarray(0, reportSize - 1));
  return out;
}

async function inferOutReportSize(dev) {
  try {
    for (const col of dev.collections || []) {
      for (const rep of col.outputReports || []) {
        let bits = 0;
        for (const item of rep.items || [])
          bits += (item.reportSize || 0) * (item.reportCount || 0);
        if (bits > 0) return Math.ceil(bits / 8);
      }
    }
  } catch (_) {}
  return null;
}

async function sendBootReport(dev, payload) {
  const sizeHint = await inferOutReportSize(dev);
  const candidates = [
    ...new Set([
      ...(sizeHint ? [sizeHint] : []),
      payload.length,
      63,
      47,
      31,
      15,
    ]),
  ];
  let lastErr = null;
  for (const len of candidates) {
    if (len < payload.length) continue;
    try {
      await dev.sendReport(
        BOOT_REPORT_ID,
        len === payload.length ? payload : padTo(payload, len + 1),
      );
      return;
    } catch (err) {
      lastErr = err;
      const nums = String((err && err.message) || "").match(/\d+/g);
      if (nums && nums.length) {
        const expect = parseInt(nums[nums.length - 1], 10);
        if (expect >= payload.length && !candidates.includes(expect))
          candidates.push(expect);
      }
    }
  }
  throw new Error(
    `Could not send bootloader report${lastErr ? ` (${lastErr.message})` : ""}. ` +
      "The bootloader may use a different report layout. Use Trace mode to inspect frames.",
  );
}

export function buildChunkFrame(cmdByte, addr, payloadLen, isLast, data32) {
  const frame = new Uint8Array(FRAME_LEN);
  frame[0] = cmdByte & 0xff;
  frame[1] = 0xb1;
  frame[2] = isLast ? 0xc1 : 0xc0;
  frame[3] = isLast ? payloadLen : CHUNK_DATA;
  frame[4] = 0x00;
  frame[5] = (addr >>> 24) & 0xff;
  frame[6] = (addr >>> 16) & 0xff;
  frame[7] = (addr >>> 8) & 0xff;
  frame[8] = addr & 0xff;
  frame.fill(0xff, 17);
  frame.set((data32 || new Uint8Array(32).fill(0xff)).subarray(0, 32), 17);
  return frame;
}

export function isAckReport(buf, reportId = REPORT_ID) {
  if (!buf || buf.length < 16) return false;
  const sum = reportId + [...buf.subarray(0, 15)].reduce((a, b) => a + b, 0);
  return ((0x55 - sum) & 0xff) === buf[15];
}

export function toHex(buf) {
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

export class FirmwareUpdater {
  constructor({ onLog = () => {}, onProgress = () => {} } = {}) {
    this.onLog = onLog;
    this.onProgress = onProgress;
    this.abortFlag = false;
    this.ackBuffer = [];
  }

  log(msg) {
    this.onLog(msg);
  }

  abort() {
    this.abortFlag = true;
  }

  async enterUpdateMode() {
    if (!transport.isConnected()) throw new Error("Device is not connected");
    await transport.sendPacket(UsbCommandID.EnterUsbUpdateMode, 0, []);
    this.log(
      "EnterUsbUpdateMode (0x0D) sent. The device is rebooting into its USB bootloader.",
    );
  }

  async waitForBootDevice({ timeoutMs = 20000, predicate } = {}) {
    if (!navigator.hid) return null;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.abortFlag) return null;
      try {
        const list = await navigator.hid.getDevices();
        for (const d of list) {
          if (d.vendorId !== USB_VID) continue;
          if (DEVICE_MODELS[d.productId]) continue;
          if (predicate && !predicate(d)) continue;
          if (!d.opened) {
            try {
              await d.open();
            } catch (_) {
              continue;
            }
          }
          return d;
        }
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  }

  async requestBootDevicePicker() {
    if (!navigator.hid)
      throw new Error("WebHID is not available in this browser");
    const selected = await navigator.hid.requestDevice({
      filters: [{ vendorId: USB_VID }],
    });
    const dev = selected && selected[0];
    if (!dev) return null;
    if (!dev.opened) await dev.open();
    return dev;
  }

  attachAck(dev) {
    this.ackBuffer = [];
    this._ackHandler = (e) => {
      if (e.reportId !== REPORT_ID) return;
      const buf = new Uint8Array(
        e.data.buffer,
        e.data.byteOffset,
        e.data.byteLength,
      );
      if (buf.length !== 16) return;
      this.ackBuffer.push({ time: Date.now(), data: buf });
      if (this.ackBuffer.length > 64) this.ackBuffer.shift();
    };
    dev.addEventListener("inputreport", this._ackHandler);
  }

  detachAck(dev) {
    if (dev && this._ackHandler)
      dev.removeEventListener("inputreport", this._ackHandler);
    this.ackBuffer = [];
  }

  async waitAck(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const idx = this.ackBuffer.findIndex((r) => isAckReport(r.data));
      if (idx !== -1) {
        this.ackBuffer.splice(idx, 1);
        return true;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    return false;
  }

  async flash(
    parsed,
    {
      traceOnly = false,
      chunkDelayMs = 12,
      ackTimeoutMs = 200,
      maxRetries = 20,
      bootDevice = null,
    } = {},
  ) {
    const { header, bytes } = parsed;
    const total = Math.max(0, bytes.length - BOOT_SIZE);
    const chunkCount = Math.ceil(total / CHUNK_DATA);
    if (!chunkCount) throw new Error("No firmware payload in this file");

    let dev = null;
    let ackCount = 0;

    if (!traceOnly) {
      dev = bootDevice || (await this.waitForBootDevice());
      if (!dev) {
        this.detachAck(dev);
        throw new Error(
          'Bootloader device not found after the update-mode command. Unplug and replug the USB cable, then click "Select Bootloader Device" or retry.',
        );
      }
      this.log(
        `Bootloader found: 0x${dev.productId.toString(16)} (${dev.productName || "HID device"})`,
      );
      this.attachAck(dev);
    }

    const addrBase = header.downloadAddr;
    const cmdByte = header.downloadCmd;
    let addr = addrBase;
    const mode = traceOnly
      ? "Trace only, nothing is written to the device"
      : "Writing to device";
    this.log(
      `${total} bytes, ${chunkCount} chunks of ${CHUNK_DATA} bytes (cmd 0x${cmdByte.toString(16)}, base address 0x${addrBase.toString(16)}). ${mode}`,
    );

    try {
      for (let c = 0; c < chunkCount; c++) {
        if (this.abortFlag) throw new Error("Update aborted by user");
        const remaining = total - c * CHUNK_DATA;
        const payloadLen = Math.min(CHUNK_DATA, remaining);
        const isLast = c === chunkCount - 1;
        const frame = buildChunkFrame(
          cmdByte,
          addr,
          payloadLen,
          isLast,
          bytes.subarray(
            BOOT_SIZE + c * CHUNK_DATA,
            BOOT_SIZE + (c + 1) * CHUNK_DATA,
          ),
        );

        if (traceOnly) {
          this.log(
            `[${String(c).padStart(4, "0")}/${chunkCount}] ${toHex(frame)}`,
          );
        } else {
          let ok = false;
          for (let attempt = 0; attempt < maxRetries && !ok; attempt++) {
            if (this.abortFlag) throw new Error("Update aborted by user");
            try {
              await sendBootReport(dev, frame);
            } catch (err) {
              if (dev && dev.opened) await dev.close();
              throw err;
            }
            ok = await this.waitAck(ackTimeoutMs);
          }
          if (!ok) {
            throw new Error(
              `No ACK from the bootloader at chunk ${c}/${chunkCount} (address 0x${addr.toString(16)}). ` +
                "Update failed. The device is still in bootloader mode and can be retried.",
            );
          }
          ackCount++;
          if (chunkDelayMs)
            await new Promise((r) => setTimeout(r, chunkDelayMs));
        }

        const pct = Math.min(100, Math.round(((c + 1) / chunkCount) * 100));
        this.onProgress(pct, c + 1, chunkCount);
        addr = (addr + CHUNK_DATA) >>> 0;
      }
    } catch (err) {
      this.detachAck(dev);
      if (dev && dev.opened) await dev.close();
      throw err;
    }

    this.detachAck(dev);
    if (dev && dev.opened) await dev.close();

    if (traceOnly) {
      this.log(`Trace complete. ${chunkCount} frames would have been written.`);
      return { traceOnly: true, frames: chunkCount, bytes: total };
    }

    this.log(
      "Transfer complete. Waiting for the device to restart into normal mode...",
    );
    let rebooted = false;
    try {
      rebooted = await transport.waitForReconnect(20, 400);
    } catch (_) {}
    if (rebooted) this.log("Device re-enumerated in normal mode.");
    else
      this.log("Device did not re-enumerate. Unplug and replug the USB cable.");
    return { traceOnly: false, frames: chunkCount, bytes: total, ackCount };
  }
}

export const FIRMWARE_MANIFEST_URL = null;

export async function fetchFirmwareManifest() {
  if (!FIRMWARE_MANIFEST_URL) return null;
  const res = await fetch(FIRMWARE_MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Manifest request failed (HTTP ${res.status})`);
  const list = await res.json();
  return Array.isArray(list) ? list : null;
}
