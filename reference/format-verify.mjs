import { transport } from "../js/transport.js";
import { MouseApi } from "../js/mouse-api.js";
import {
  SHORTCUT_STORAGE_BASE,
  SHORTCUT_SLOT_SIZE,
  MACRO_STORAGE_BASE,
  MACRO_SLOT_SIZE,
  decodeDpiRecord,
  encodeDpiRecord,
} from "../js/protocol.js";

let failures = 0;
function check(name, cond, detail = "") {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name} ${detail}`);
  } else {
    console.log(`ok: ${name}`);
  }
}

const flash = new Map();
function flashRead(addr, len) {
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = flash.get(addr + i) ?? 0xff;
  return out;
}
function flashWrite(addr, bytes) {
  for (let i = 0; i < bytes.length; i++) flash.set(addr + i, bytes[i]);
}
transport.isConnected = () => true;
transport.sleep = async () => {};
transport.awaitAck = async () => true;
transport.sendPacket = async (cmdId, addr, payload) => {
  if (cmdId === 0x07) flashWrite(addr, payload);
};
transport.exchange = async (cmdId, addr, payload) => {
  if (cmdId === 0x08) {
    const len = Math.min(10, payload.length);
    const data = flashRead(addr, len);
    const resp = new Uint8Array(16);
    resp[0] = cmdId;
    resp[2] = (addr >> 8) & 0xff;
    resp[3] = addr & 0xff;
    resp[4] = len;
    resp.set(data, 5);
    return resp;
  }
  return new Uint8Array(16);
};

await MouseApi.commitShortcutsToFlash([
  {
    keys: [
      { type: "mod", keyState: 1, hidCode: 1, delay: 0 },
      { type: "key", keyState: 1, hidCode: 6, delay: 0 },
    ],
  },
]);
const raw0 = flashRead(SHORTCUT_STORAGE_BASE, 32);
console.log(
  "shortcut slot0:",
  Array.from(raw0)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" "),
);
check("shortcut count=4", raw0[0] === 4, String(raw0[0]));
check(
  "shortcut ctx0 (ctrl down)",
  raw0[1] === 0x80 && raw0[2] === 1 && raw0[3] === 0,
);
check(
  "shortcut ctx1 (c down)",
  raw0[4] === 0x81 && raw0[5] === 6 && raw0[6] === 0,
);
check(
  "shortcut ctx2 (c up)",
  raw0[7] === 0x41 && raw0[8] === 6 && raw0[9] === 0,
);
check(
  "shortcut ctx3 (ctrl up)",
  raw0[10] === 0x40 && raw0[11] === 1 && raw0[12] === 0,
);
let sum = 0;
for (let b = 0; b <= 12; b++) sum += raw0[b];
check(
  "shortcut checksum",
  raw0[13] === ((0x55 - sum) & 0xff),
  `got ${raw0[13]}`,
);

const scOut = await MouseApi.readShortcutsFromFlash();
check("shortcut read count 16 slots", scOut.length === 16);
const s0 = scOut[0].keys;
check(
  "shortcut read keys",
  s0.length === 2 &&
    s0[0].type === "mod" &&
    s0[0].hidCode === 1 &&
    s0[1].type === "key" &&
    s0[1].hidCode === 6,
  JSON.stringify(s0),
);

flash.clear();
flash.set(SHORTCUT_STORAGE_BASE + SHORTCUT_SLOT_SIZE - 1, 0);
const junk = new Uint8Array(32).fill(0);
junk[0] = 3;
junk[1] = 0xff;
junk[2] = 0xff;
junk[3] = 0xff;
junk[13] = 0x5b;
for (let i = 0; i < 32; i++) flash.set(SHORTCUT_STORAGE_BASE + i, junk[i]);
const scJunk = await MouseApi.readShortcutsFromFlash();
check(
  "garbage shortcut slot skipped",
  scJunk[0].keys.length === 0 || scJunk.length === 0,
  JSON.stringify(scJunk[0]),
);

await MouseApi.commitMacrosToFlash([
  {
    name: "Test",
    loopMode: 0,
    steps: [
      { type: "key", keyState: 1, value: "Key A Down", hidCode: 4, delay: 40 },
      { type: "key", keyState: 0, value: "Key A Up", hidCode: 4, delay: 60 },
      {
        type: "delay",
        keyState: 0,
        value: "Delay 250ms",
        hidCode: 0,
        delay: 250,
      },
    ],
  },
]);
const rawMac = flashRead(MACRO_STORAGE_BASE, 64);
console.log(
  "macro slot0:",
  Array.from(rawMac.slice(0, 44))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" "),
);
check("macro nameLen", rawMac[0] === 4);
check(
  "macro name",
  String.fromCharCode(rawMac[1], rawMac[2], rawMac[3], rawMac[4]) === "Test",
);
check("macro count", rawMac[31] === 3);
check(
  "macro ctx0",
  rawMac[32] === 0x81 &&
    rawMac[33] === 4 &&
    rawMac[34] === 0 &&
    rawMac[35] === 0 &&
    rawMac[36] === 40,
);
check(
  "macro ctx1",
  rawMac[37] === 0x41 &&
    rawMac[38] === 4 &&
    rawMac[39] === 0 &&
    rawMac[40] === 0 &&
    rawMac[41] === 60,
);
check(
  "macro ctx2",
  rawMac[42] === 0x00 &&
    rawMac[43] === 0 &&
    rawMac[44] === 0 &&
    rawMac[45] === 0 &&
    rawMac[46] === 250,
);
let msum = rawMac[31];
for (let b = 32; b < 32 + 15; b++) msum += rawMac[b];
check(
  "macro checksum",
  rawMac[47] === ((0x55 - msum) & 0xff),
  `got ${rawMac[47]} exp ${(0x55 - msum) & 0xff}`,
);

const macOut = await MouseApi.readMacrosFromFlash();
check("macro read", macOut.length === 1, JSON.stringify(macOut));
const m0 = macOut[0];
check(
  "macro steps round trip",
  m0.name === "Test" &&
    m0.steps.length === 3 &&
    m0.steps[0].type === "key" &&
    m0.steps[0].keyState === 1 &&
    m0.steps[0].hidCode === 4 &&
    m0.steps[2].type === "delay" &&
    m0.steps[2].delay === 250,
  JSON.stringify(m0.steps),
);

check("dpi 800", decodeDpiRecord([0x0f, 0x0f, 0x00, 0x37]) === 800);
check("dpi 26000 highbits", decodeDpiRecord([0x07, 0x07, 0x88, 0]) === 26000);
check("dpi x2 flag 0x22", decodeDpiRecord([0x3f, 0x3f, 0x22, 0]) === 6400);
check(
  "dpi encode roundtrip 13000",
  (() => {
    const r = encodeDpiRecord(13000);
    return decodeDpiRecord(r) === 13000;
  })(),
);
check(
  "dpi encode roundtrip 25600",
  (() => {
    const r = encodeDpiRecord(25600);
    return decodeDpiRecord(r) === 25600;
  })(),
);

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
