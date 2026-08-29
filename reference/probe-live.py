import os
import sys
import time

from hid import exchange, heartbeat, open_device, read_flash


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/dev/hidraw5"
    fd = open_device(path)
    heartbeat(fd)

    print("== command checks ==")
    for name, cmd, payload in (
        ("battery   0x04", 0x04, ()),
        ("version   0x12", 0x12, [0x01]),
        ("cid/mid   0x10", 0x10, [0x01]),
        ("longrange 0x17", 0x17, [0x00]),
        ("donglergb 0x15", 0x15, [0x01]),
        ("pairstate 0x06", 0x06, [0x01]),
    ):
        resp = exchange(fd, cmd, 0, len(payload), timeout=0.5, payload=payload)
        if resp is None:
            print(f"  {name}: no response")
        else:
            print(f"  {name}: {resp.hex(' ')}")

    t0 = time.time()
    for _ in range(5):
        exchange(fd, 0x08, 0, 10, timeout=0.3)
    print(f"avg read roundtrip: {(time.time() - t0) / 5 * 1000:.1f} ms")

    print("== binding scan 0x0000..0x1B00 (types 0x04/0x06) ==")
    hits = 0
    for base in range(0, 0x1B00, 0x100):
        data = read_flash(fd, base, 0x100)
        if data is None:
            continue
        for i in range(0, 0x100 - 4, 4):
            typ = data[i]
            if typ not in (0x04, 0x06):
                continue
            p1, p2, chk = data[i + 1], data[i + 2], data[i + 3]
            csum = (0x55 - (typ + p1 + p2)) & 0xFF
            hits += 1
            flag = "VALID" if csum == chk else "chk-mismatch"
            print(
                f"  0x{base + i:04X}: type={typ:02x} p1={p1:02x}({p1}) "
                f"p2={p2:02x}({p2}) chk={chk:02x} {flag}"
            )
    print(f"  {hits} binding(s)")

    print("== config switch test ==")
    before = read_flash(fd, 0x0060, 24)
    exchange(fd, 0x0F, 0, 1, timeout=0.3, payload=[0x01])
    time.sleep(0.2)
    after1 = read_flash(fd, 0x0060, 24)
    exchange(fd, 0x0F, 0, 1, timeout=0.3, payload=[0x00])
    time.sleep(0.2)
    after0 = read_flash(fd, 0x0060, 24)
    print(f"  before: {before.hex(' ') if before else '-'}")
    print(f"  SetCurrentConfig(1): {after1.hex(' ') if after1 else '-'}")
    print(f"  SetCurrentConfig(0): {after0.hex(' ') if after0 else '-'}")

    for base in (0x1B00, 0x1800):
        data = read_flash(fd, base, 0x100)
        print(f"0x{base:04X}: {data[:64].hex(' ') if data else 'READ FAIL'}")

    os.close(fd)


if __name__ == "__main__":
    main()