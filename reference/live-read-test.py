import os
import sys
import time

from hid import heartbeat, open_device, read_flash

MACRO_BASE = 0x0300
MACRO_SLOT = 384
MACRO_COUNT = 16
MACRO_NAME_MAX = 30
MACRO_MAX_STEPS = 70
SC_BASE = 0x0100
SC_SLOT = 32
SC_COUNT = 16


def decode_ctx(b0, code, delay):
    nib = b0 & 0x0F
    down = (b0 & 0xC0) == 0x80
    if code == 0 and delay > 0 and nib == 0:
        return f"delay {delay}ms"
    if nib == 4:
        return f"mouse {code} {'D' if down else 'U'} ({delay})"
    if b0 == 0 and code == 0 and delay == 0:
        return "blank"
    return f"key/{nib} {code} {'D' if down else 'U'} ({delay})"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/dev/hidraw5"
    fd = open_device(path)
    heartbeat(fd)

    t0 = time.time()
    reads = 0
    macros = []

    for i in range(MACRO_COUNT):
        header = read_flash(fd, MACRO_BASE + i * MACRO_SLOT, 40)
        reads += 4
        if header is None:
            print(f"slot {i}: READ FAIL")
            continue
        name_len = header[0]
        if name_len == 0 or name_len > MACRO_NAME_MAX:
            continue
        c31, c21 = header[31], header[21]
        if 2 <= c31 <= MACRO_MAX_STEPS:
            count, hdr, stepb = c31, 32, 5
        elif 2 <= c21 <= MACRO_MAX_STEPS:
            count, hdr, stepb = c21, 22, 5
        elif 2 <= c31 <= 44:
            count, hdr, stepb = c31, 32, 8
        else:
            continue
        need = hdr + count * stepb + 1
        slot = bytearray(header)
        if need > 40:
            rest = read_flash(fd, MACRO_BASE + i * MACRO_SLOT + 40, need - 40)
            reads += (need - 40 + 9) // 10
            if rest is None:
                print(f"slot {i}: context READ FAIL")
                continue
            slot += rest
        total = count
        for b in slot[hdr : hdr + count * stepb]:
            total += b
        ok = slot[hdr + count * stepb] == (0x55 - total) & 0xFF
        name = "".join(chr(c) for c in header[1 : 1 + name_len] if 32 <= c <= 126)
        steps = []
        for s in range(count):
            base = hdr + s * stepb
            if stepb == 5:
                b0 = slot[base]
                code = slot[base + 1] | (slot[base + 2] << 8)
                delay = (slot[base + 3] << 8) | slot[base + 4]
            else:
                b0 = slot[base]
                code = slot[base + 2] | (slot[base + 3] << 8)
                delay = slot[base + 4]
            steps.append(decode_ctx(b0, code, delay))
        print(f"slot {i}: '{name}' count={count} chk={'OK' if ok else 'BAD'} steps={steps[:6]}")
        if ok:
            macros.append((i, name))

    for i in range(SC_COUNT):
        head = read_flash(fd, SC_BASE + i * SC_SLOT, 10)
        reads += 1
        if head is None:
            print(f"sc {i}: READ FAIL")
            continue
        count = head[0]
        if count == 0 or count < 2 or count > 6 or count % 2 != 0:
            continue
        extra = read_flash(fd, SC_BASE + i * SC_SLOT + 10, SC_SLOT - 10)
        reads += 3
        if extra is None:
            continue
        print(f"sc {i}: count={count}")

    print(f"macros: {macros}")
    print(f"total chunk reads: {reads}, elapsed: {time.time() - t0:.2f}s")
    os.close(fd)


if __name__ == "__main__":
    main()