import os
import sys
import time

from hid import exchange, heartbeat, open_device, read_flash

MACRO_BASE = 0x0300
MACRO_SLOT = 384


def erase_slot(fd, slot):
    base = MACRO_BASE + slot * MACRO_SLOT
    for off in range(0, 32, 10):
        exchange(fd, 0x07, base + off, 10, timeout=0.3, payload=[0] * 10)
        time.sleep(0.02)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/dev/hidraw5"
    fd = open_device(path)
    heartbeat(fd)

    print("== before ==")
    for s in range(2):
        h = read_flash(fd, MACRO_BASE + s * MACRO_SLOT, 32)
        if h is None:
            print(f"  slot {s}: READ FAIL")
            continue
        name = (
            "".join(chr(c) for c in h[1 : 1 + h[0]] if 32 <= c <= 126)
            if 0 < h[0] <= 30
            else ""
        )
        print(f"  slot {s}: nameLen={h[0]} name='{name}' cnt31={h[31]}")

    print("== erasing slots 0 and 1 (32-byte header only, mirrors app commit) ==")
    for s in range(2):
        h = read_flash(fd, MACRO_BASE + s * MACRO_SLOT, 32)
        if h is not None and h[0] == 0:
            print(f"  slot {s}: already empty")
            continue
        erase_slot(fd, s)
        print(f"  slot {s} erased")

    time.sleep(0.1)
    print("== after ==")
    for s in range(2):
        h = read_flash(fd, MACRO_BASE + s * MACRO_SLOT, 32)
        if h is None:
            print(f"  slot {s}: READ FAIL")
            continue
        print(f"  slot {s}: nameLen={h[0]} cnt31={h[31]} first16={h[:16].hex(' ')}")
    sane = read_flash(fd, MACRO_BASE, 32)
    print(f"sanity 0x300..0x31F all zero: {all(b == 0 for b in sane) if sane is not None else 'READ FAIL'}")

    exchange(fd, 0x0F, 0, 1, timeout=0.4, payload=[0x00])
    os.close(fd)


if __name__ == "__main__":
    main()