import {
  USB_VID,
  DEVICE_MODELS,
  REPORT_ID,
  USAGE_PAGE_FILTER,
  UsbCommandID,
  buildHostPacket,
} from "./protocol.js";

class Transport {
  constructor() {
    this.device = null;
    this.activeModel = null;
    this.disconnectHandlers = new Set();
    this.connectHandlers = new Set();
    this.statusChangeHandlers = new Set();
    this.pendingInputReports = [];
    this.heartbeatTimer = null;
    this.isListening = false;

    if (typeof navigator !== "undefined" && navigator.hid) {
      navigator.hid.addEventListener("connect", (e) => {
        if (
          e.device.vendorId === USB_VID &&
          DEVICE_MODELS[e.device.productId]
        ) {
          this.connectHandlers.forEach((cb) => cb(e.device));
        }
      });
      navigator.hid.addEventListener("disconnect", (e) => {
        if (this.device && e.device === this.device) {
          this.handleDisconnect();
        }
      });
    }
  }

  isSupported() {
    return typeof navigator !== "undefined" && !!navigator.hid;
  }

  isConnected() {
    return !!(this.device && this.device.opened);
  }

  getDeviceInfo() {
    if (!this.device) return null;
    const pid = this.device.productId;
    const model = DEVICE_MODELS[pid] || {
      name: this.device.productName || "Redragon Gaming Mouse",
      mode: "USB",
      maxRate: 1000,
      cid: 23,
      mid: 5,
    };
    return {
      vid: this.device.vendorId,
      pid: pid,
      name: model.name,
      mode: model.mode,
      maxRate: model.maxRate,
      cid: model.cid,
      mid: model.mid,
      productName: this.device.productName || model.name,
    };
  }

  onConnect(cb) {
    this.connectHandlers.add(cb);
  }

  onDisconnect(cb) {
    this.disconnectHandlers.add(cb);
  }

  onStatusChange(cb) {
    this.statusChangeHandlers.add(cb);
  }

  isVendorInterface(device) {
    return (device.collections || []).some(
      (c) => c.usagePage === USAGE_PAGE_FILTER,
    );
  }

  async getPairedDevice() {
    if (!navigator.hid) return null;
    const devices = await navigator.hid.getDevices();
    const candidates = devices.filter(
      (d) =>
        d.vendorId === USB_VID &&
        !!DEVICE_MODELS[d.productId] &&
        this.isVendorInterface(d),
    );
    candidates.sort(
      (a, b) =>
        Number(DEVICE_MODELS[b.productId].mode === "Wired USB-C") -
        Number(DEVICE_MODELS[a.productId].mode === "Wired USB-C"),
    );
    return candidates[0] || null;
  }

  async connect(interactive = false) {
    if (!this.isSupported()) {
      throw new Error(
        "WebHID is not supported. Please use a Chromium-based browser (Chrome, Edge, Opera, Brave).",
      );
    }

    let dev = await this.getPairedDevice();
    if (!dev && interactive) {
      const filters = [
        { vendorId: USB_VID, usagePage: USAGE_PAGE_FILTER },
        ...Object.keys(DEVICE_MODELS).map((pid) => ({
          vendorId: USB_VID,
          productId: Number(pid),
          usagePage: USAGE_PAGE_FILTER,
        })),
      ];

      const selected = await navigator.hid.requestDevice({ filters });
      if (selected && selected.length > 0) {
        dev = selected[0];
      }
    }

    if (!dev) return false;

    if (!this.isVendorInterface(dev)) {
      throw new Error(
        "Selected device is not the M916 Pro vendor interface (usage page 0xFF04)",
      );
    }

    if (!dev.opened) {
      await dev.open();
    }

    this.device = dev;
    this.activeModel = this.getDeviceInfo();
    this.setupInputListener();
    this.startHeartbeat();

    return true;
  }

  setupInputListener() {
    if (!this.device) return;
    this.device.oninputreport = (event) => {
      const { reportId, data } = event;
      if (reportId !== REPORT_ID) return;

      const buf = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

      if (buf.length >= 6 && buf[0] === UsbCommandID.StatusChanged) {
        const flag = buf[5];
        const eventInfo = {
          dpiChanged: !!(flag & 0x01),
          rateChanged: !!(flag & 0x02),
          configChanged: !!(flag & 0x04),
          batteryChanged: !!(flag & 0x40),
          raw: buf,
        };
        this.statusChangeHandlers.forEach((cb) => {
          try {
            cb(eventInfo);
          } catch (_) {}
        });
        return;
      }

      this.pendingInputReports.push({
        reportId,
        data: buf,
        time: Date.now(),
      });

      if (this.pendingInputReports.length > 30) {
        this.pendingInputReports.shift();
      }
    };
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      if (this.isConnected()) {
        try {
          await this.sendPacket(UsbCommandID.PCDriverStatus, 0, [0x01]);
        } catch (_) {}
      }
    }, 8000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  handleDisconnect() {
    this.stopHeartbeat();
    this.device = null;
    this.activeModel = null;
    this.pendingInputReports = [];
    this.disconnectHandlers.forEach((cb) => {
      try {
        cb();
      } catch (_) {}
    });
  }

  async disconnect() {
    this.stopHeartbeat();
    if (this.device) {
      try {
        if (this.device.opened) {
          await this.device.close();
        }
      } catch (_) {}
      this.device = null;
    }
    this.handleDisconnect();
  }

  async sendPacket(cmdId, addr = 0, payload = []) {
    if (!this.isConnected()) {
      throw new Error("Device is not connected");
    }

    const data16 = buildHostPacket(cmdId, addr, payload);

    try {
      await this.device.sendReport(REPORT_ID, data16);
    } catch (err) {
      try {
        await this.device.sendFeatureReport(REPORT_ID, data16);
      } catch (err2) {
        throw new Error(
          `Failed to send HID report: ${err2.message || err.message}`,
        );
      }
    }
    await this.sleep(8);
  }

  async readResponse(expectedCmd, expectedAddr = null, timeoutMs = 600) {
    if (!this.isConnected()) {
      throw new Error("Device is not connected");
    }

    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const idx = this.pendingInputReports.findIndex((r) => {
        if (r.reportId !== REPORT_ID || r.data.length < 5) return false;

        const cmdMatch = r.data[0] === expectedCmd || r.data[0] === 0x00;
        if (!cmdMatch) return false;

        if (expectedAddr !== null) {
          const respAddr = (r.data[2] << 8) | r.data[3];
          if (respAddr !== expectedAddr) return false;
        }

        return true;
      });

      if (idx !== -1) {
        const [found] = this.pendingInputReports.splice(idx, 1);
        return found.data;
      }

      await this.sleep(5);
    }

    return null;
  }

  async awaitAck(cmdId, addr = null, timeoutMs = 400) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const idx = this.pendingInputReports.findIndex((r) => {
        if (r.reportId !== REPORT_ID || r.data.length < 5) return false;
        if (r.data[0] !== cmdId) return false;
        if (addr !== null) {
          const respAddr = (r.data[2] << 8) | r.data[3];
          if (respAddr !== addr) return false;
        }
        return true;
      });
      if (idx !== -1) {
        this.pendingInputReports.splice(idx, 1);
        return true;
      }
      await this.sleep(5);
    }
    return false;
  }

  async exchange(cmdId, addr = 0, payload = [], timeoutMs = 600) {
    this.pendingInputReports = [];
    await this.sendPacket(cmdId, addr, payload);
    const resp = await this.readResponse(
      cmdId,
      addr !== 0 ? addr : null,
      timeoutMs,
    );
    return resp;
  }

  async waitForReconnect(maxAttempts = 15, intervalMs = 250) {
    this.device = null;
    await this.sleep(600);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const ok = await this.connect(false);
        if (ok && this.isConnected()) {
          await this.sleep(200);
          return true;
        }
      } catch (_) {}
      await this.sleep(intervalMs);
    }
    return false;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const transport = new Transport();
