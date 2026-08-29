# Redragon M916 Pro (1K & 4K) Protocol Reference

Reverse-engineered from the official Windows driver (`Mouse Drive Beta.exe`, `costura64.hidusb.dll`, `driver_sensor.h`) and implemented in the WebHID control center in this repo. This document describes the wire protocol and on-board flash layout as used by the app.

## Hardware

- M916 Pro 1K: Compx CX52850P MCU + PixArt PAW3395 optical sensor
- M916 Pro 4K: Nordic nRF52833 + Compx CX52850P MCU + PixArt PAW3395 optical sensor
- USB: Interface 1 (usage page `0xFF04`, usage `0x0002` / `0x0001`), 17-byte HID feature/output reports on report ID `0x08`
- Vendor ID: `0x3554`

### Device IDs

| PID      | Model       | Mode                   | Max polling rate | MID |
| -------- | ----------- | ---------------------- | ---------------- | --- |
| `0xF55D` | M916 Pro 1K | 2.4GHz wireless        | 1000 Hz          | 5   |
| `0xF5D5` | M916 Pro 1K | 2.4GHz alt receiver    | 1000 Hz          | 5   |
| `0xF55E` | M916 Pro 1K | Wired USB-C            | 1000 Hz          | 5   |
| `0xF54C` | M916 Pro 4K | Standard wireless      | 1000 Hz          | 6   |
| `0xF54F` | M916 Pro 4K | 4K high-speed receiver | 4000 Hz          | 6   |
| `0xF55F` | M916 Pro 4K | 4K alt receiver        | 4000 Hz          | 6   |
| `0xF54E` | M916 Pro 4K | Wired USB-C            | 4000 Hz          | 6   |

CID is `23` (`0x17`) on all variants.

## Packet framing

Commands are sent as a 16-byte buffer via `sendReport(0x08, buf)` (falls back to `sendFeatureReport`). The report ID byte is not part of the buffer.

| Offset | Field    | Notes                                      |
| ------ | -------- | ------------------------------------------ |
| 0      | cmdId    | `UsbCommandID`, see command table          |
| 1      | subCmd   | always `0x00`                              |
| 2      | addrHi   | `(addr >> 8) & 0xFF`                       |
| 3      | addrLo   | `addr & 0xFF`                              |
| 4      | length   | payload byte count, 0..10                  |
| 5..14  | payload  | data bytes, zero padded                    |
| 15     | checksum | `(0x55 - (0x08 + sum(buf[0..14]))) & 0xFF` |

Device responses arrive as 16 data bytes after report ID `0x08` with the same layout: echoed `cmdId` (some responses return `0x00` as an OK status), echoed `addrHi`/`addrLo`, byte count at [4], data at [5..], and a device checksum at [15] computed as `(0x4D - sum(data[0..14])) & 0xFF` (equivalent to `(0x55 - (0x08 + sum(payload[0..14]))) & 0xFF`). Verified against live hardware.

Unsolicited `0x0A` (StatusChanged) reports arrive at any time and must be filtered out before response matching. The host should send `0x02` (PCDriverStatus) every few seconds to keep the RF link awake.

## Command IDs

| Code   | Name                        | Purpose / payload                                                                                                                                                                                                                                               |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0x01` | `EncryptionData`            | AES-encrypted firmware exchange                                                                                                                                                                                                                                 |
| `0x02` | `PCDriverStatus`            | Heartbeat / RF wakeup, payload `[0x01]`                                                                                                                                                                                                                         |
| `0x03` | `DeviceOnLine`              | Online link status query, payload `[0x01]`                                                                                                                                                                                                                      |
| `0x04` | `BatteryLevel`              | Battery query, empty payload. Response `[level %, isCharging, voltHi, voltLo]` at data `[5..8]` (verified on wired and RF-linked hardware: 70%/charging/3974 mV wired, 60%/3970 mV RF). With a non-empty payload the device ACK-echoes the request byte instead |
| `0x05` | `DongleEnterPair`           | Enter 2.4G pairing, payload `[CID, MID]`                                                                                                                                                                                                                        |
| `0x06` | `GetPairState`              | Pairing state query, payload `[0x01]`. Results: `1` in progress, `2` success, `3` fail                                                                                                                                                                          |
| `0x07` | `WriteFlashData`            | Write flash chunk, payload = data bytes (up to 10)                                                                                                                                                                                                              |
| `0x08` | `ReadFlashData`             | Read flash chunk, request payload = `length` zero bytes                                                                                                                                                                                                         |
| `0x09` | `ClearSetting`              | Factory reset, payload `[0x01]`                                                                                                                                                                                                                                 |
| `0x0A` | `StatusChanged`             | Unsolicited event. `[5]` bits: `1` DPI changed, `2` rate changed, `4` config changed, `64` battery changed                                                                                                                                                      |
| `0x0B` | `SetDeviceVidPid`           | Factory VID/PID programming                                                                                                                                                                                                                                     |
| `0x0C` | `SetDeviceDescriptorString` | Sets USB product string descriptor                                                                                                                                                                                                                              |
| `0x0D` | `EnterUsbUpdateMode`        | Reboot into USB DFU bootloader                                                                                                                                                                                                                                  |
| `0x0E` | `GetCurrentConfig`          | Read active profile slot (0-3)                                                                                                                                                                                                                                  |
| `0x0F` | `SetCurrentConfig`          | Reload sensor DSP registers from flash, payload `[profileIndex & 0x01]`                                                                                                                                                                                         |
| `0x10` | `ReadCIDMID`                | Board CID/MID readback, payload `[0x01]` => `[CID, MID]`. ACK-echo on the probed 1K RF dongle, so CID/MID are taken from the model table                                                                                                                        |
| `0x11` | `EnterMTKMode`              | PAW3395 surface calibration routine, payload `[0x01]`                                                                                                                                                                                                           |
| `0x12` | `ReadVersionID`             | Firmware version, payload `[0x01]`. ACK-echo on the probed 1K RF dongle (no string returned)                                                                                                                                                                    |
| `0x14` | `Set4KDongleRGB`            | Mode byte + 3 RGB tuples (9 bytes)                                                                                                                                                                                                                              |
| `0x15` | `Get4KDongleRGBValue`       | Dongle LED readback, payload `[0x01]`. Response `[5]` mode, `[6..14]` 3 RGB tuples                                                                                                                                                                              |
| `0x16` | `SetLongRangeMode`          | RF boost amplifier, `0x01` on / `0x00` off                                                                                                                                                                                                                      |
| `0x17` | `GetLongRangeMode`          | RF boost readback, payload `[0x00]`                                                                                                                                                                                                                             |
| `0xF0` | `WriteKBCIdMID`             | Factory CID/MID burn                                                                                                                                                                                                                                            |
| `0xF1` | `ReadKBCIdMID`              | Factory CID/MID readback                                                                                                                                                                                                                                        |

## Flash memory map

Total allocation: 6912 bytes, `0x0000`..`0x1AFF`.

Record layouts:

- 2-byte register: `[value, (0x55 - value) & 0xFF]`
- 4-byte record: `[b0, b1, b2, (0x55 - (b0 + b1 + b2)) & 0xFF]`

| Address  | Size   | Field                 | Description                                                                         |
| -------- | ------ | --------------------- | ----------------------------------------------------------------------------------- |
| `0x0000` | 2 B    | `reportRate`          | `1`=1000 Hz, `2`=500 Hz, `4`=250 Hz, `8`=125 Hz, `16`=2000 Hz, `32`=4000 Hz         |
| `0x0002` | 2 B    | `maxDPI`              | Number of active DPI stages, 1..8 (default 5)                                       |
| `0x0004` | 2 B    | `currentDPI`          | Active stage index, 0..maxDPI-1                                                     |
| `0x0006` | 2 B    | reserved (xSpindown)  | Zeroed on commit (legacy field, never used by the app)                              |
| `0x0008` | 2 B    | reserved (ySpindown)  | Zeroed on commit (legacy field, never used by the app)                              |
| `0x000A` | 2 B    | `silenceHeight`       | Lift-off distance: `0` = 1.0 mm, `1` = 2.0 mm                                       |
| `0x000C` | 32 B   | `dpiStages[0..7]`     | 8 stage records `[xDPI, yDPI, DPIex, checksum]`                                     |
| `0x002C` | 32 B   | `dpiColors[0..7]`     | 8 stage color records `[R, G, B, checksum]`                                         |
| `0x004C` | 2 B    | `keyDebounce`         | 0-20 ms                                                                             |
| `0x004E` | 2 B    | `motionSync`          | 0/1                                                                                 |
| `0x0050` | 2 B    | `allLedOffTime`       | LED-related, unused on this mouse                                                   |
| `0x0052` | 2 B    | `linearCorrection`    | angle snapping 0/1                                                                  |
| `0x0054` | 2 B    | `rippleControl`       | 0/1                                                                                 |
| `0x0056` | 2 B    | `powerSaving`         | 0/1                                                                                 |
| `0x0058` | 2 B    | `sensorSleepTime`     | min. 255 or `customSleepEnable` 0 disables sleep                                    |
| `0x005A` | 2 B    | `customSleepEnable`   | 0/1                                                                                 |
| `0x0060` | 64 B   | `keyBindings[0..15]`  | 16 key records `[KEY_CLASS, param1, param2, checksum]`. The app exposes the first 6 |
| `0x0100` | 512 B  | `shortcutKeys[0..15]` | 16 shortcut slots of 32 B. Compact context list with trailing checksum              |
| `0x0300` | 6144 B | `macroKey[0..15]`     | 16 macro slots of 384 B. Header + compact context list with trailing checksum       |

## DPI encoding

DPI is stored in 50-step granularity over 50..26,000 DPI. Per stage record `[xDPI, yDPI, DPIex, checksum]`:

```
rawCode = round(dpi / 50) - 1
dpiEx = 0
if dpi > 12800:
    highBits = rawCode >> 8
    dpiEx = (highBits << 2) | (highBits << 6)

xDPI = rawCode & 0xFF
yDPI = rawCode & 0xFF
```

Decoding (verified against the official driver's sensor code): `highBits = max(record[2] >> 6, (record[2] >> 2) & 0x03)`, `rawCode = (highBits << 8) | record[0]`, `dpi = (rawCode + 1) * 50`, then `* 2` for each of the `0x22` and `0x11` flags in `record[2]`. The app's encoder only ever emits `dpiEx` values that keep both flags clear.

To live-switch DPI: write the target stage index into `0x0004`, then send `0x0F` to reload the sensor DSP registers.

## Button mapping

Default bindings (first 6 of the 16-slot table):

| Address  | Button        | Record       |
| -------- | ------------- | ------------ |
| `0x0060` | Left click    | `[1, 1, 0]`  |
| `0x0064` | Right click   | `[1, 2, 0]`  |
| `0x0068` | Middle click  | `[1, 4, 0]`  |
| `0x006C` | Side backward | `[1, 8, 0]`  |
| `0x0070` | Side forward  | `[1, 16, 0]` |
| `0x0074` | DPI switch    | `[2, 1, 0]`  |

Checksums follow the 4-byte record rule above.

### Key classes

| Code   | Class                 | param1                                                                                       | param2                                                                |
| ------ | --------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `0x00` | Disabled              | -                                                                                            | -                                                                     |
| `0x01` | Mouse button          | mask: 1 left, 2 right, 4 middle, 8 back, 16 forward                                          | 0                                                                     |
| `0x02` | DPI switch            | 1 loop, 2 DPI+, 3 DPI-                                                                       | 0                                                                     |
| `0x03` | Tilt scroll           | 1 left, 2 right                                                                              | 0                                                                     |
| `0x04` | Rapid fire            | interval ms 1-255                                                                            | repeat 1-255 (0 = while held)                                         |
| `0x05` | Multimedia / shortcut | media keycode or shortcut index                                                              | 0                                                                     |
| `0x06` | Macro                 | macro index 0-69                                                                             | 0 once, 1..250 N times, 254 until key released, 255 until key pressed |
| `0x07` | Polling rate cycle    | 0                                                                                            | 0                                                                     |
| `0x08` | Lighting toggle       | 0 all, 3 strip, 4 cycle. Shared-SDK class. The M916 has no RGB and the app does not offer it | 0                                                                     |
| `0x09` | Profile toggle        | 0                                                                                            | 0                                                                     |
| `0x0A` | Sniper / DPI lock     | DPI raw code                                                                                 | 0                                                                     |
| `0x0B` | Scroll wheel          | 1 up, 2 down                                                                                 | 0                                                                     |

### Multimedia keycodes

| Function      | Code     | Function       | Code     |
| ------------- | -------- | -------------- | -------- |
| Media Player  | `0x0183` | Play / Pause   | `0x00CD` |
| Next Track    | `0x00B5` | Previous Track | `0x00B6` |
| Stop          | `0x00B7` | Mute           | `0x00E2` |
| Volume Up     | `0x00E9` | Volume Down    | `0x00EA` |
| Email         | `0x018A` | Calculator     | `0x0192` |
| My Computer   | `0x0194` | Browser Home   | `0x0223` |
| Web Search    | `0x0221` | Web Refresh    | `0x0227` |
| Web Forward   | `0x0225` | Web Back       | `0x0224` |
| Web Favorites | `0x022A` | Web Stop       | `0x0226` |

## Macro storage layout

16 slots of 384 bytes starting at `0x0300` (slot i header at `0x0300 + i * 384`). Up to 70 contexts fit per slot (32 + 70 * 5 = 382, plus one checksum byte). The layout is verified against the official driver's flash routines.

Header (32 bytes):

| Offset | Field                 |
| ------ | --------------------- |
| 0      | name length (1..30)   |
| 1..30  | ASCII name            |
| 31     | context count (2..70) |

Loop repetition is not stored per macro. It is driven by the key binding's `param2` (0 once, 1..250 repeats N times, 254 until the bound key is released, 255 until a key is pressed. The official driver also maps 253 to until the bound key is pressed).

Context records (5 bytes each, from offset 32):

| Offset | Field                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| 0      | event bits `0x80` press / `0x40` release / `0x00` other, OR type nibble (0 modifier, 1 key, 4 mouse, 5 special) |
| 1..2   | HID code / mouse button mask, little-endian                                                                     |
| 3..4   | delay ms, big-endian (max 65535)                                                                                |

A checksum byte `0x55 - sum(count, contexts)` follows the last context at offset `32 + count * 5`. A context with code 0 and a non-zero delay is a delay step. Blank contexts (all zero) are skipped.

Unprogrammed slots read as `0xFF`. A slot counts as empty when its name length is 0 or > 30.

### Verified write behaviour (live hardware, 2.4G link)

- Every `0x07` write is answered by an ACK report that echoes the command and the written address. The app consumes that ACK before sending the next command. Writes issued while an ACK is still unread can be dropped silently. Each chunk is also read back after writing and retried, so a chunk that never lands aborts the commit with an explicit error.
- Writes to the config and shortcut regions (`0x0000..0x2FF`) persist reliably. In the macro region (`0x0300+`) individual cells can reject programming while still ACKing, mostly in slot tails after heavy use. The commit compares the old and new records and only rewrites the changed ones, so healthy flash is never reprogrammed.
- Erasing a macro clears its 32-byte header so the name length reads zero. Stale bytes deeper in the slot are harmless. Never zero out a whole 384-byte slot, that writes 39 chunks for no benefit and wears the flash.

## Shortcut storage layout

16 slots of 32 bytes starting at `0x0100` (slot i at `0x0100 + i * 32`). Shortcuts store a key combination as press/release context pairs, up to three keys (six contexts). Layout verified against the official driver's flash routines.

| Offset      | Field                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| 0           | context count (even, 2..6 for 1..3 keys, 0 for empty)                                       |
| 1..         | contexts, 3 bytes each: event bits OR type nibble                                           |
|             | byte 0: `0x80` press / `0x40` release, OR type nibble (0 modifier, 1 key, 2 media, 4 mouse) |
|             | byte 1: code low                                                                            |
|             | byte 2: code high                                                                           |
| 1 + 3*count | checksum `0x55 - sum(count, contexts)`                                                      |

Keys are stored as down contexts in order followed by up contexts in reverse, so a combo like `Ctrl + C` is `[Ctrl down, C down, C up, Ctrl up]`. Modifier keys use the driver's mask codes (LCtrl 1, LShift 2, LAlt 4, LWin 8, plus 16/32/64/128 for the right-side variants) with type nibble 0. Media shortcuts use the 16-bit consumer codes with type nibble 2. The checksum covers the count byte plus all context bytes.

## Battery curve

The firmware reports raw ADC millivolts. Percentage is piecewise-linear interpolation over these 21 points (5% steps):

| mV   | %   | mV   | %   | mV   | %   | mV   | %   | mV   | %   |
| ---- | --- | ---- | --- | ---- | --- | ---- | --- | ---- | --- |
| 3050 | 0   | 3420 | 5   | 3480 | 10  | 3540 | 15  | 3600 | 20  |
| 3660 | 25  | 3720 | 30  | 3760 | 35  | 3800 | 40  | 3840 | 45  |
| 3880 | 50  | 3920 | 55  | 3940 | 60  | 3960 | 65  | 3980 | 70  |
| 4000 | 75  | 4020 | 80  | 4040 | 85  | 4060 | 90  | 4080 | 95  |
| 4110 | 100 |

## RF pairing, calibration, dongle LED, long range

- **Pairing:** send `0x05` with `[23, 5]` (1K) or `[23, 6]` (4K), hold Left + Middle + Right on the mouse for 3 seconds, and poll `0x06` until it returns `2`.
- **Surface calibration:** send `0x11` and have the user move the mouse across the pad for ~5 seconds.
- **4K dongle LED modes (`0x14`):** 1 = low-battery alert only (blinks red below 15%), 2 = battery gauge (green 100% -> yellow 66% -> orange 33% -> red), 3 = polling-rate indicator (125 Hz red, 250 Hz blue, 500 Hz yellow, 1 kHz orange, 2 kHz purple, 4 kHz green). Mode + 3 RGB tuples.
- **Long range mode (`0x16`):** `[0x01]` enables the high-power RF front-end amplifier, `[0x00]` standard power.
- **Readback quirks (verified on hardware):** the device checksum base is `0x4D`. The `0x04` battery request must have an empty payload and only answers while the RF link is live. A non-empty payload makes the device ACK-echo the request byte. `0x0E`, `0x10`, and `0x12` ACK-echo on the 1K RF dongle. `0x17` long-range shifts its value byte depending on the reported length. `0x0A` (StatusChanged) arrives unsolicited and must be filtered before response matching.

## Firmware update (DFU)

Traced from `Mouse Drive Beta.exe` (decompiled C#) + `HIDUsb64.dll` (x64 disassembly, exports map, IAT
analysis). The web app in this repo implements the same flow in `js/firmware.js`.

### Firmware sources

- `DeviceUpdateFile.HasNewVersion()` / `HasDeviceUpdateFile()` scan a local `bin\*.bin` folder next to
  the exe (`Environment.CurrentDirectory + "\\bin"`). Files are **pre-packaged upgrade files**. The
  installer ships them and the app never downloads them.
- "Check Update" compares the device's current version (`CS_UsbFinder_GetVersion`) against each `.bin`'s
  header `version` and picks the newest matching file. The web link in the UI (`Description.xml`
  `<Web>http://www.redragonzone.com</Web>`, plus `www.compx.com.cn`) only opens the browser via
  `Process.Start(url)`. There is no firmware API endpoint anywhere in the app.
- `Version` encoding (uint -> display): `v{(v >> 8).toString(16)}.{(v & 0xFF).toString(16).padStart(2,"0")}`.
- Config.ini (base64 fields) identity for this product (M916-PRO-1K): VID `0x3554`, mouse PID `0xF55E`,
  dongle PIDs `0xF55D,0xF55F`, CID `23`, sensor `PAW3395`, mouse MCU `CX52850P`, 1K dongle MCU
  `CX52650N` (4K dongle is WCH `CH32V305`).

### Upgrade file format (.bin)

`CS_CreateUpgradeFile(icName, rawFirmware)` wraps the raw image. Then `CS_SetDeviceType`,
`CS_SetVersion`, `CS_SetCidMid`, `CS_SetNormalEndPoint`, `CS_SetBootEndPoint`, etc. patch fields into
the same buffer. `CS_IsValidUpgradeFile` and `UsbUpgrade_FileSplit` validate/split it. Layout:

| Offset | Size | Field                                                                          |
| ------ | ---- | ------------------------------------------------------------------------------ |
| 0x000  | 4    | `headCRC`                                                                      |
| 0x004  | 4    | `headLength` (bytes)                                                           |
| 0x008  | 4    | `fwLength`                                                                     |
| 0x00C  | 4    | `nextFileAddress` (multi-image support, `SplitFromUpgradeFile(index)` selects) |
| 0x010  | 4    | `version`                                                                      |
| 0x014  | 1    | `DeviceType`: 0 Boot, 209 Keyboard, 210 Mouse, 211 Dongle, 212 Common          |
| 0x015  | 1    | `Cid` (23)                                                                     |
| 0x016  | 1    | `Mid` (5 = 1K, 6 = 4K)                                                         |
| 0x017  | 1    | padding -> header base = 24 bytes                                              |
| 0x018  | 64   | `fileId`                                                                       |
| 0x058  | 64   | `icName` (ASCII MCU tag, e.g. `CX52850P`)                                      |
| 0x098  | 64   | `bootInputEndPoint`                                                            |
| 0x0D8  | 64   | `bootOutputEndPoint`                                                           |
| 0x118  | 64   | `normalInputEndPoint`                                                          |
| 0x158  | 64   | `normalOutputEndPoint`                                                         |
| 0x198  | 64   | `resetToUpdateModeCmd`                                                         |
| 0x1D8  | 64   | `prepareDownLoadCmd`                                                           |
| 0x218  | 64   | `dataDownLoadCmd`                                                              |
| 0x258  | 64   | `senserName` (e.g. `PAW3395`)                                                  |
| 0x298  | 64   | `productName`                                                                  |

Total header = 728 bytes. `BOOT_SIZE = 8192 (0x2000)`: the first 0x2000 bytes of the file reserve the
boot-loader region. The **application image starts at file offset `0x2000`**. The download loop reads
source data at `file + 0x2000 + chunkIndex*32`, and the initial download address comes from
`dataDownLoadCmd[6..9]` (little-endian u32 read from the file, written big-endian on the wire).
Selection by the app: `type == DeviceType && cid == Cid && mid == Mid && mcu == icName && fileVersion > deviceVersion`.

### Entering update mode

`UsbServer_EnterUsbUpdateMode` builds report id `0x08` + 16 data bytes `[0x0D, 14 x 0x00, 0x40]` where
`0x40 = (0x55 - (0x08 + 0x0D)) & 0xFF`. This matches `buildHostPacket(EnterUsbUpdateMode=0x0D)`.
The device resets into a USB DFU bootloader and **re-enumerates**. The driver finds it with
`CS_UsbUpgrade_FindBootDevices` by opening HID devices whose path keys match the VID/PID/interface
strings stored in the file's `bootInputEndPoint`/`bootOutputEndPoint` fields. The bootloader PID is
not a compile-time constant and is carried in the .bin file.

### Boot-mode download protocol

- Boot device: same VID `0x3554`, new PID (from file), larger OUT report (fits a 49-byte write
  payload, written via `WriteFile`, or `HidD_SetFeature` when the command's feature flag is set)
  and a 17-byte IN report for ACKs (report id `0x08`, same `0x55`-based checksum, verified in the ACK
  loop: `0x55 - sum(bytes[0..15]) == bytes[16]`).
- Per-chunk write frame (49 bytes, sent as one output report):

  | Off    | Bytes                                    | Meaning                                                            |
  | ------ | ---------------------------------------- | ------------------------------------------------------------------ |
  | 0      | `dataDownLoadCmd[1]`                     | command byte from file                                             |
  | 1      | `0xB1`                                   | fixed marker                                                       |
  | 2      | `0xC0` (continue) / `0xC1` (final chunk) | stage marker                                                       |
  | 3      | `0x20` (32) or `remaining`               | payload byte count                                                 |
  | 4      | `0x00`                                   |                                                                    |
  | 5..8   | address big-endian (u32)                 | starts at `dataDownLoadCmd[6..9]`, incremented by `0x20` per chunk |
  | 9..15  | `0x00`                                   |                                                                    |
  | 16     | `0x00`                                   |                                                                    |
  | 17..48 | 32-byte payload, `0xFF`-padded           | image bytes from `file + 0x2000 + n*32`                            |

- After each chunk the driver waits (event, 100 ms timeout) for the 17-byte ACK report and verifies
  the checksum + signature bytes. Failed writes retry (~20 attempts). Progress callback:
  `[0x07, 0x01, percent]`. Final result: `[0x07, 0x02, 1|0]` (success/fail). Chunks are paced ~10 ms.
- `prepareDownLoadCmd` (queued command list, each entry `[len, featureFlag, payload...]`,
  `[job+0x227]` = length, `[job+0x228]` = feature flag) is sent once before the data loop, with its own
  ACK exchange (17-byte read at helper @ 0x180012770).
- The mouse must be **wired USB** (`OnlyWired: "The mouse can only be upgraded in wired mode"`). The
  receiver dongle is upgraded separately (type 211: 1K dongle MCU `CX52650N`, 4K dongle MCU `CH32V305`
  plus a secondary MCU read via `GetSlaveVersion`).
- Safety: matching is mandatory (type/CID/MID/icName), versions must increase, and the transfer must
  not be interrupted. A half-written image bricks the device (recoverable only by re-flashing from
  boot mode). The web app additionally offers a **trace-only dry run** and refuses to flash anything
  that does not pass header validation.

## Verification

Where each constant was confirmed against the official Windows driver (decompiled `.cs`,
`hidusb.asm` disassembly, language XML, driver package files).

| Fact                                                                  | Evidence                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Key classes 0x00..0x0B                                                | `KeyFunctionTypeEnum` (~line 9259) and XML `<KeyFunction>`                |
| Multimedia codes (18)                                                 | XML `<SubKeyFunction>` type 05 values                                     |
| Keyboard HID table (146 entries)                                      | `KeyboardCodes.KeyboardCodeDataBase` (~line 4526)                         |
| Modifier masks 1/2/4/8/16/32/64/128                                   | `ModifyEnum` (~line 9394)                                                 |
| DPI encode/decode (`highBits = dpiEx >> 6`, `x2` flags 0x22 and 0x11) | DPI readback (~line 31882)                                                |
| Battery curve (21 points)                                             | ~line 25228                                                               |
| Perf registers 0x4C..0x5A, bindings 0x60                              | `MouseConfig` struct + live flash dump                                    |
| Report rate codes 1/2/4/8/16/32                                       | live flash dump (0x0000 = 1)                                              |
| Shortcut slots 16 x 32 B at 0x100                                     | disassembly loop (`r15 += 0x20`, 16 iterations)                           |
| Macro slots 16 x 384 B at 0x300                                       | disassembly loop (`rbp += 0x180`)                                         |
| Shortcut context 3 B each, checksum at 1 + 3n                         | disassembly 0x1800075C0                                                   |
| Macro context 5 B each, checksum at 32 + 5n                           | disassembly 0x1800077B0                                                   |
| Checksum helper `0x55 - sum`                                          | disassembly 0x18000C8C0                                                   |
| Context byte 0 (press 0x80 / release 0x40, type nibble below)         | disassembly decoders + driver context writes (keyState 0/1/2, type 1/4/5) |

Context byte 0's low nibble matches the official editor's writes byte-for-byte and round-trips
identically in both apps; on-device execution of the nibble is the one behavior not directly
observed.
