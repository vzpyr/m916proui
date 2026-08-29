import { stateManager } from "./state.js";
import { transport } from "./transport.js";
import { MouseApi } from "./mouse-api.js";
import { icon } from "./icons.js";
import {
  parseUpgradeFile,
  matchUpgradeFile,
  formatVersion,
  CXFILE_TYPE,
  CXFILE_TYPE_NAMES,
  FIRMWARE_MANIFEST_URL,
  fetchFirmwareManifest,
  FirmwareUpdater,
  MCU_NAMES,
} from "./firmware.js";

const BOOT_WAIT_MS = 5000;

export class FirmwareUI {
  constructor(containerId, modalId, notifyFn) {
    this.container = document.getElementById(containerId);
    this.modal = document.getElementById(modalId);
    this.notify = notifyFn || console.log;
    this.parsed = null;
    this.updater = null;
    this.updating = false;
    this.bootDevice = null;
    this.init();
  }

  init() {
    stateManager.subscribe(() => this.render());
    this.render();
    this.initModal();
  }

  initModal() {
    const closeBtn = this.modal.querySelector("#closeFirmwareModalBtn");
    const doneBtn = this.modal.querySelector("#firmwareCloseBtn");
    const abortBtn = this.modal.querySelector("#firmwareAbortBtn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeModal());
    if (doneBtn) doneBtn.addEventListener("click", () => this.closeModal());
    if (abortBtn) abortBtn.addEventListener("click", () => this.abort());
  }

  render() {
    if (!this.container) return;
    const state = stateManager.current;
    const devInfo = transport.getDeviceInfo();
    const isWired = !!(devInfo && /wired/i.test(devInfo.mode || ""));
    const file = this.parsed;
    const fileVersion =
      file && file.ok ? formatVersion(file.header.version) : null;
    const match = file && devInfo ? matchUpgradeFile(file, devInfo) : null;

    const fileBadge = !file
      ? ""
      : file.ok
        ? match && match.ok
          ? `<span class="device-badge firmware-badge success">${icon("checkCircle", 12, "var(--success)")} Valid & matches device</span>`
          : `<span class="device-badge firmware-badge warning">${icon("alertTriangle", 12, "var(--warning)")} Does not match device</span>`
        : `<span class="device-badge firmware-badge danger">${icon("alertCircle", 12, "var(--danger)")} Invalid file</span>`;

    const fileInfo = !file
      ? `<p class="setting-help">Drop a <code>.bin</code> upgrade file from Redragon's driver package to load firmware.</p>`
      : `<div class="firmware-meta">
           <div><span>Target</span><strong>${CXFILE_TYPE_NAMES[file.header.deviceType] || file.header.deviceType}</strong></div>
           <div><span>MCU (icName)</span><strong>${file.header.icName || "N/A"}</strong></div>
           <div><span>CID / MID</span><strong>${file.header.cid} / ${file.header.mid}</strong></div>
           <div><span>Version</span><strong>v${fileVersion || "?"}</strong></div>
           <div><span>FW length</span><strong>${file.header.fwLength.toLocaleString()} B</strong></div>
           <div><span>File size</span><strong>${file.bytes.length.toLocaleString()} B</strong></div>
         </div>`;

    const matchErrors =
      match && match.errors && match.errors.length
        ? match.errors.map((e) => `<li>${e}</li>`).join("")
        : "";
    const invalidErrors =
      file && !file.ok && file.errors.length
        ? file.errors.map((e) => `<li>${e}</li>`).join("")
        : "";

    const canFlash =
      !!file &&
      file.ok &&
      !!match &&
      match.ok &&
      isWired &&
      !!devInfo &&
      !this.updating;

    this.container.innerHTML = `
      <div class="grid-2col">
        <div class="col-stack">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">${icon("zap", 18)} Firmware Update</span>
                <span class="card-desc">Flash the mouse MCU (CX52850P) or the receiver dongle (CX52650N / CH32V305)</span>
              </div>
              <span class="device-badge">${
                isWired
                  ? "Wired USB, ready to update"
                  : "Wireless, plug in the USB cable first"
              }</span>
            </div>
            <div class="card-body">
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Mouse firmware (current)</span>
                  <span class="setting-help">Reported by the device. The 1K RF dongle echoes it, so it may read blank on wireless links</span>
                </div>
                <strong class="font-mono">v${state.version || "?.?"}</strong>
              </div>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Receiver firmware (current)</span>
                  <span class="setting-help">Not readable from the HID feature interface used by this app</span>
                </div>
                <strong class="font-mono">N/A</strong>
              </div>
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Check for updates</span>
                  <span class="setting-help">${
                    FIRMWARE_MANIFEST_URL
                      ? "Compares against the configured firmware manifest"
                      : "The official driver ships .bin packages next to the exe. Load one below, or set FIRMWARE_MANIFEST_URL in js/firmware.js to enable update checks"
                  }</span>
                </div>
                <button class="btn sm" id="checkUpdatesBtn">Check</button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-stack">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">${icon("upload", 18)} Update Package (.bin)</span>
                <span class="card-desc">A packaged upgrade file: 728-byte header + images</span>
              </div>
              ${fileBadge}
            </div>
            <div class="card-body">
              <div class="firmware-drop" id="firmwareDrop">
                <input type="file" id="firmwareFileInput" accept=".bin,.hex" hidden />
                <div class="firmware-drop-inner">
                  ${icon("upload", 20, "var(--text-muted)")}
                  <span>Choose or drop a <code>.bin</code> upgrade file</span>
                  <button class="btn sm" id="pickFileBtn">Browse...</button>
                </div>
              </div>
              <div class="mt-md">${fileInfo}</div>
              ${
                matchErrors || invalidErrors
                  ? `<ul class="firmware-errors">${matchErrors || invalidErrors}</ul>`
                  : ""
              }
              <div class="firmware-actions">
                <button class="btn ghost" id="traceBtn" ${canFlash ? "" : "disabled"}>
                  ${icon("terminal", 13)} Trace (dry run)
                </button>
                <button class="btn accent" id="flashBtn" ${canFlash ? "" : "disabled"}>
                  ${icon("zap", 13)} Start Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const input = this.container.querySelector("#firmwareFileInput");
    const pick = this.container.querySelector("#pickFileBtn");
    if (input && pick) {
      pick.addEventListener("click", () => input.click());
      input.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) this.loadFile(file);
        e.target.value = "";
      });
    }

    const drop = this.container.querySelector("#firmwareDrop");
    if (drop && input) {
      drop.addEventListener("click", (e) => {
        if (e.target.tagName !== "BUTTON") input.click();
      });
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("dragging");
      });
      drop.addEventListener("dragleave", () =>
        drop.classList.remove("dragging"),
      );
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("dragging");
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) this.loadFile(file);
      });
    }

    const checkBtn = this.container.querySelector("#checkUpdatesBtn");
    if (checkBtn) checkBtn.addEventListener("click", () => this.checkUpdates());

    const traceBtn = this.container.querySelector("#traceBtn");
    if (traceBtn)
      traceBtn.addEventListener("click", () => this.start(false, true));

    const flashBtn = this.container.querySelector("#flashBtn");
    if (flashBtn)
      flashBtn.addEventListener("click", () => this.start(true, false));
  }

  async loadFile(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    this.parsed = parseUpgradeFile(buf);
    this.render();
    if (this.parsed.ok) {
      this.notify(
        `Loaded ${file.name}, version ${formatVersion(this.parsed.header.version)} for ${CXFILE_TYPE_NAMES[this.parsed.header.deviceType]}`,
        this.parsed.ok ? "info" : "error",
      );
    } else {
      this.notify(
        `Invalid firmware package: ${this.parsed.errors[0]}`,
        "error",
      );
    }
  }

  async checkUpdates() {
    try {
      const list = await fetchFirmwareManifest();
      if (!list) {
        this.notify(
          "No update manifest is configured. The official app ships .bin packages without a server. Load one above.",
          "warning",
        );
        return;
      }
      const devInfo = transport.getDeviceInfo();
      const matches = list.filter(
        (item) =>
          devInfo &&
          item.type === CXFILE_TYPE.Mouse &&
          String(item.icName || "").toUpperCase() === MCU_NAMES.mouse,
      );
      if (matches.length) {
        this.notify(
          `Firmware v${formatVersion(matches[0].version)} is available. Download the .bin and load it above.`,
          "info",
        );
      } else {
        this.notify("No newer firmware listed for this device.", "success");
      }
    } catch (err) {
      this.notify(`Update check failed: ${err.message}`, "error");
    }
  }

  openModal() {
    this.modal.classList.add("active");
    const fill = this.modal.querySelector("#firmwareProgressFill");
    const badge = this.modal.querySelector("#firmwareStatusBadge");
    const logEl = this.modal.querySelector("#firmwareLog");
    if (fill) fill.style.width = "0%";
    if (badge) {
      badge.className = "wizard-status-badge in-progress";
      badge.textContent = "Starting...";
    }
    if (logEl) logEl.innerHTML = "";
  }

  closeModal() {
    this.modal.classList.remove("active");
  }

  appendLog(line) {
    const logEl = this.modal.querySelector("#firmwareLog");
    if (!logEl) return;
    const div = document.createElement("div");
    div.textContent = line;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  setProgress(pct) {
    const fill = this.modal.querySelector("#firmwareProgressFill");
    const badge = this.modal.querySelector("#firmwareStatusBadge");
    if (fill) fill.style.width = `${Math.min(100, pct)}%`;
    if (badge) badge.textContent = `Flashing... ${Math.min(100, pct)}%`;
  }

  setStatus(text, kind = "in-progress") {
    const badge = this.modal.querySelector("#firmwareStatusBadge");
    if (!badge) return;
    badge.className = `wizard-status-badge ${kind}`;
    badge.textContent = text;
  }

  showBootPicker() {
    const btn = this.modal.querySelector("#firmwarePickBootBtn");
    const tip = this.modal.querySelector("#firmwarePickBootTip");
    if (btn) btn.style.display = "";
    if (tip) tip.style.display = "flex";
  }

  hideBootPicker() {
    const btn = this.modal.querySelector("#firmwarePickBootBtn");
    const tip = this.modal.querySelector("#firmwarePickBootTip");
    if (btn) btn.style.display = "none";
    if (tip) tip.style.display = "none";
  }

  async start(isReal, traceOnly) {
    const file = this.parsed;
    if (!file || !file.ok) {
      this.notify("Load a valid .bin upgrade package first", "error");
      return;
    }
    const devInfo = transport.getDeviceInfo();
    const match = matchUpgradeFile(file, devInfo);
    if (!match.ok) {
      this.notify(match.errors[0], "error");
      return;
    }

    if (isReal) {
      const ok = window.confirm(
        "This will replace the firmware on your device and it must not be unplugged until it finishes.\n\n" +
          "A failed or mismatched flash can brick the device. Only continue with a genuine Redragon .bin for your exact model, connected by USB cable.\n\n" +
          "Continue?",
      );
      if (!ok) return;
    }

    window.firmwareUpdateBusy = true;
    this.updating = true;
    this.bootDevice = null;
    this.updater = new FirmwareUpdater({
      onLog: (line) => this.appendLog(line),
      onProgress: (pct) => this.setProgress(pct),
    });
    this.openModal();

    try {
      if (traceOnly) {
        this.setStatus("Tracing frame stream (dry run)");
        const result = await this.updater.flash(file, { traceOnly: true });
        this.setStatus(`Trace complete. ${result.frames} frames`, "success");
        this.notify(
          "Dry run finished. Nothing was written to the device.",
          "success",
        );
        return;
      }

      this.setStatus("Requesting update mode...");
      await this.updater.enterUpdateMode();

      this.setStatus("Waiting for bootloader device...");
      await new Promise((r) => setTimeout(r, 1200));
      this.bootDevice = await this.updater.waitForBootDevice({
        timeoutMs: BOOT_WAIT_MS,
      });

      if (!this.bootDevice) {
        this.setStatus("Bootloader not detected automatically");
        this.showBootPicker();
        const pickBtn = this.modal.querySelector("#firmwarePickBootBtn");
        if (pickBtn) {
          pickBtn.addEventListener(
            "click",
            () => this.connectBootViaPicker(file),
            { once: true },
          );
        }
        return;
      }

      await this.runUpdate(file);
    } catch (err) {
      this.fail(err);
    } finally {
      window.firmwareUpdateBusy = false;
      this.updating = false;
    }
  }

  async connectBootViaPicker(file) {
    try {
      this.bootDevice = await this.updater.requestBootDevicePicker();
      if (this.bootDevice) this.hideBootPicker();
      await this.runUpdate(file);
    } catch (err) {
      this.fail(err);
    } finally {
      window.firmwareUpdateBusy = false;
      this.updating = false;
    }
  }

  async runUpdate(file) {
    try {
      await this.runFlash(file);
    } catch (err) {
      this.fail(err);
    }
  }

  fail(err) {
    const aborted = /aborted by user/.test(err.message || "");
    this.setStatus(
      aborted ? "Update aborted" : `Update failed: ${err.message}`,
      "error",
    );
    this.appendLog(`${aborted ? "ABORTED" : "ERROR"}: ${err.message}`);
    if (!aborted) this.notify(`Update failed: ${err.message}`, "error");
  }

  async runFlash(file) {
    this.setStatus("Flashing... 0%");
    const result = await this.updater.flash(file, {
      bootDevice: this.bootDevice,
    });
    this.setStatus(
      result.traceOnly ? "Trace complete" : "Update complete",
      "success",
    );
    this.appendLog(
      result.traceOnly
        ? "Trace only, no data was written."
        : `Done: ${result.frames} chunks, ${result.bytes} bytes, ${result.ackCount} ACKs.`,
    );
    this.notify(
      result.traceOnly
        ? "Dry run finished."
        : "Firmware update completed successfully!",
      result.traceOnly ? "info" : "success",
    );
    if (!result.traceOnly) {
      this.updating = false;
      await new Promise((r) => setTimeout(r, 3000));
      this.closeModal();
      if (transport.isConnected()) {
        try {
          const settings = await MouseApi.readAllSettings();
          stateManager.setCommittedState(settings);
        } catch (_) {}
      }
    }
  }

  abort() {
    if (this.updater) this.updater.abort();
    this.appendLog("Aborting...");
  }
}
