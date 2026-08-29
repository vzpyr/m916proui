import os
import select
import time

REPORT_ID = 0x08


def host_packet(cmd, addr=0, payload=()):
    buf = bytearray(16)
    buf[0] = cmd & 0xFF
    buf[2] = (addr >> 8) & 0xFF
    buf[3] = addr & 0xFF
    buf[4] = min(10, len(payload))
    for i in range(buf[4]):
        buf[5 + i] = payload[i] & 0xFF
    buf[15] = (0x55 - (REPORT_ID + sum(buf[0:15]))) & 0xFF
    return bytes([REPORT_ID]) + bytes(buf)


def open_device(path):
    return os.open(path, os.O_RDWR | os.O_NONBLOCK)


def drain(fd, t=0.05):
    end = time.time() + t
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.01)
        if not r:
            return
        try:
            os.read(fd, 64)
        except OSError:
            return


def exchange(fd, cmd, addr, length, timeout=0.4, payload=None):
    drain(fd)
    if payload is None:
        payload = [0] * length
    os.write(fd, host_packet(cmd, addr, payload))
    end = time.time() + timeout
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.008)
        if not r:
            continue
        try:
            data = os.read(fd, 64)
        except OSError:
            return None
        if len(data) >= 6 and data[0] == REPORT_ID and data[1] == cmd:
            if ((data[3] << 8) | data[4]) == addr:
                return data
    return None


def read_flash(fd, addr, length):
    out = bytearray()
    for off in range(0, length, 10):
        resp = exchange(fd, 0x08, addr + off, min(10, length - off))
        if resp is None:
            return None
        n = resp[5]
        out += resp[6 : 6 + n]
    return bytes(out)


def heartbeat(fd):
    exchange(fd, 0x02, 0, 1, timeout=0.3, payload=[0x01])
    time.sleep(0.1)