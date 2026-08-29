import os
import sys

from hid import heartbeat, open_device, read_flash


def main():
    devs = [p for p in sys.argv[1:]] or ["/dev/hidraw5", "/dev/hidraw3"]
    for path in devs:
        if not os.path.exists(path):
            continue
        print(f"===== {path} =====")
        try:
            fd = open_device(path)
        except OSError as e:
            print("open failed:", e)
            continue
        heartbeat(fd)
        for base in (0x0000, 0x0060, 0x0100, 0x0140, 0x0200, 0x0300):
            data = read_flash(fd, base, 32)
            print(f"0x{base:04X}: {data.hex(' ') if data else 'READ FAIL'}")
        os.close(fd)


if __name__ == "__main__":
    main()