import { transport } from "../js/transport.js";
import { MouseApi } from "../js/mouse-api.js";
import {
  MACRO_STORAGE_BASE,
  MACRO_SLOT_SIZE,
  MACRO_COUNT,
} from "../js/protocol.js";

let failures = 0;
const check = (name, cond, detail = "") => {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name} ${detail}`);
  } else console.log(`ok: ${name}`);
};

const flash = new Map();
const flashRead = (addr, len) => {
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = flash.get(addr + i) ?? 0xff;
  return out;
};
const flashWrite = (addr, bytes) => {
  for (let i = 0; i < bytes.length; i++) flash.set(addr + i, bytes[i]);
};
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

const clickMacro = (name, hid) => ({
  name,
  steps: [
    {
      type: "mouse",
      keyState: 1,
      value: "Click Down",
      hidCode: hid,
      delay: 20,
    },
    { type: "mouse", keyState: 0, value: "Click Up", hidCode: hid, delay: 30 },
  ],
});

const macros = [clickMacro("lac", 1), clickMacro("rac", 2)];
await MouseApi.commitMacrosToFlash(macros, { prevSlots: [] });

const readBack = await MouseApi.readMacrosFromFlash();
check(
  "read both after write",
  readBack.length === 2,
  JSON.stringify(readBack.map((m) => m.name)),
);
check(
  "slots recorded",
  readBack[0].slot === 0 && readBack[1].slot === 1,
  JSON.stringify(readBack.map((m) => m.slot)),
);
const prevSlots = readBack.map((m) => m.slot);

await MouseApi.commitMacrosToFlash([], { prevSlots });

const afterDelete = await MouseApi.readMacrosFromFlash();
check(
  "no macros after delete-all commit",
  afterDelete.length === 0,
  JSON.stringify(afterDelete),
);

const slot0 = flashRead(MACRO_STORAGE_BASE, 32);
const slot1 = flashRead(MACRO_STORAGE_BASE + MACRO_SLOT_SIZE, 32);
check(
  "slot0 header zeroed",
  slot0.every((b) => b === 0),
);
check(
  "slot1 header zeroed",
  slot1.every((b) => b === 0),
);
const tail0 = flashRead(MACRO_STORAGE_BASE + 32, 32);
check("slot0 nameLen=0 with stale tail reads empty", tail0.length === 32);

const m2 = [clickMacro("lac", 1), clickMacro("rac", 2)];
await MouseApi.commitMacrosToFlash(m2, { prevSlots: [] });
const rb2 = await MouseApi.readMacrosFromFlash();
await MouseApi.commitMacrosToFlash(
  [rb2[1].name ? rb2[1] : null].filter(Boolean),
  { prevSlots: rb2.map((m) => m.slot) },
);
const afterDelOne = await MouseApi.readMacrosFromFlash();
check(
  "one macro remains",
  afterDelOne.length === 1,
  JSON.stringify(afterDelOne.map((m) => m.name)),
);
check(
  "remaining is rac at slot 0 (live write)",
  afterDelOne[0].name === "rac" && afterDelOne[0].slot === 0,
  JSON.stringify(afterDelOne),
);

await MouseApi.commitMacrosToFlash([afterDelOne[0]], {
  prevSlots: afterDelOne.map((m) => m.slot),
});
const rb3 = await MouseApi.readMacrosFromFlash();
check(
  "rac refreshed to slot 0",
  rb3.length === 1 && rb3[0].slot === 0 && rb3[0].name === "rac",
);
const rb3again = await MouseApi.readMacrosFromFlash();
await MouseApi.commitMacrosToFlash([], {
  prevSlots: rb3again.map((m) => m.slot),
});
const afterDelAll2 = await MouseApi.readMacrosFromFlash();
check(
  "no macros after second delete-all",
  afterDelAll2.length === 0,
  JSON.stringify(afterDelAll2),
);
const s0b = flashRead(MACRO_STORAGE_BASE, 32);
check(
  "final slot0 header zeroed",
  s0b.every((b) => b === 0),
);

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
