import { stateManager } from "./state.js";
import { MouseApi } from "./mouse-api.js";
import { transport } from "./transport.js";
import { icon } from "./icons.js";

export class SensorUI {
  constructor(containerId, calibrationModalId, notifyFn) {
    this.container = document.getElementById(containerId);
    this.calibrationModal = document.getElementById(calibrationModalId);
    this.notify = notifyFn || console.log;
    this.calibrationTimer = null;
    this.init();
  }

  init() {
    stateManager.subscribe(() => {
      this.render();
    });
    this.render();
    this.initWizards();
  }

  initWizards() {
    const closeCalBtn = this.calibrationModal.querySelector(
      "#closeCalibrationModalBtn",
    );
    if (closeCalBtn) {
      closeCalBtn.addEventListener("click", () =>
        this.closeCalibrationWizard(),
      );
    }
  }

  render() {
    if (!this.container) return;

    const state = stateManager.current;
    const p = state.perf || {};

    this.container.innerHTML = `
      <div class="grid-2col">
        <div class="col-stack">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("cpu", 18)}
                  PixArt PAW3395 Optical Tracking
                </span>
                <span class="card-desc">DSP sensor calibration and synchronization parameters</span>
              </div>
            </div>
            <div class="card-body">
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Motion Sync</span>
                  <span class="setting-help">Synchronizes sensor frames with USB polling for 1:1 input linearity</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="motionSyncSwitch" ${p.motionSync ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Ripple Control</span>
                  <span class="setting-help">Filters high-frequency jitter at resolutions above 5000 DPI</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="rippleControlSwitch" ${p.rippleControl ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Angle Snapping (Linear Correction)</span>
                  <span class="setting-help">Assists in drawing straight horizontal and vertical lines</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="linearCorrectionSwitch" ${p.linearCorrection ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("crosshair", 18)}
                  PixArt PAW3395 Surface Calibration
                </span>
                <span class="card-desc">Calibrates laser diode current and surface reflection coefficient for your mousepad</span>
              </div>
            </div>
            <div class="card-body">
              <p class="setting-help">Optimizes tracking precision and minimizes lift-off jitter on cloth, glass, or hybrid pads</p>
              <button class="btn accent self-start" id="startCalibrationBtn">
                Start Surface Calibration (MTK)
              </button>
            </div>
          </div>
        </div>

        <div class="col-stack">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("radio", 18)}
                  2.4GHz RF Front-End & Connectivity
                </span>
                <span class="card-desc">Radio frequency transmission power and amplifier modes</span>
              </div>
            </div>
            <div class="card-body">
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Long Range Mode (High-Power RF Amplifier)</span>
                  <span class="setting-help">Boosts transmission strength to cut packet drops around dense 2.4GHz Wi-Fi</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="longRangeSwitch" ${state.longRangeMode ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("battery", 18)}
                  Power Management & Sleep Timers
                </span>
                <span class="card-desc">Low-power sleep modes and battery optimization</span>
              </div>
            </div>
            <div class="card-body">
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Sensor ECO Power Saving</span>
                  <span class="setting-help">Reduces sensor LED current in wireless mode for longer battery life</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="powerSavingSwitch" ${p.powerSaving ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Deep Sleep Inactivity</span>
                  <span class="setting-help">Allow MCU to enter ultra-low-power sleep when idle</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="sleepEnableSwitch" ${p.customSleepEnable !== false ? "checked" : ""}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div id="sleepTimeWrap" style="${p.customSleepEnable !== false ? "" : "opacity: 0.4; pointer-events: none;"}">
                <div class="setting-row">
                  <div class="setting-info">
                    <span class="setting-label">Inactivity Timeout</span>
                    <span class="setting-help">Idle time before MCU deep sleep engages (1 to 254 min)</span>
                  </div>
                  <div class="num-input-wrap">
                    <input type="number" id="sleepTimeNum" min="1" max="254" value="${Math.min(254, Math.max(1, p.sensorSleepTime || 2))}">
                    <span class="unit">min</span>
                  </div>
                </div>
                <input type="range" id="sleepTimeRange" min="1" max="254" value="${Math.min(254, Math.max(1, p.sensorSleepTime || 2))}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const motionSync = this.container.querySelector("#motionSyncSwitch");
    if (motionSync) {
      motionSync.addEventListener("change", () => {
        stateManager.updateState((draft) => {
          draft.perf.motionSync = motionSync.checked;
        });
      });
    }

    const rippleControl = this.container.querySelector("#rippleControlSwitch");
    if (rippleControl) {
      rippleControl.addEventListener("change", () => {
        stateManager.updateState((draft) => {
          draft.perf.rippleControl = rippleControl.checked;
        });
      });
    }

    const linearCorrection = this.container.querySelector(
      "#linearCorrectionSwitch",
    );
    if (linearCorrection) {
      linearCorrection.addEventListener("change", () => {
        stateManager.updateState((draft) => {
          draft.perf.linearCorrection = linearCorrection.checked;
        });
      });
    }

    const powerSaving = this.container.querySelector("#powerSavingSwitch");
    if (powerSaving) {
      powerSaving.addEventListener("change", () => {
        stateManager.updateState((draft) => {
          draft.perf.powerSaving = powerSaving.checked;
        });
      });
    }

    const sleepEnable = this.container.querySelector("#sleepEnableSwitch");
    if (sleepEnable) {
      sleepEnable.addEventListener("change", () => {
        stateManager.updateState((draft) => {
          draft.perf.customSleepEnable = sleepEnable.checked;
        });
      });
    }

    const sleepNum = this.container.querySelector("#sleepTimeNum");
    const sleepRange = this.container.querySelector("#sleepTimeRange");
    if (sleepNum && sleepRange) {
      sleepNum.addEventListener("change", () => {
        const val = Math.max(
          1,
          Math.min(254, parseInt(sleepNum.value, 10) || 2),
        );
        sleepRange.value = val;
        stateManager.updateState((draft) => {
          draft.perf.sensorSleepTime = val;
        });
      });
      sleepRange.addEventListener("input", () => {
        const val = parseInt(sleepRange.value, 10);
        sleepNum.value = val;
        stateManager.updateState((draft) => {
          draft.perf.sensorSleepTime = val;
        });
      });
    }

    const longRange = this.container.querySelector("#longRangeSwitch");
    if (longRange) {
      longRange.addEventListener("change", () => {
        stateManager.updateState({ longRangeMode: longRange.checked });
      });
    }

    const startCalBtn = this.container.querySelector("#startCalibrationBtn");
    if (startCalBtn) {
      startCalBtn.addEventListener("click", () => this.openCalibrationWizard());
    }
  }

  async openCalibrationWizard() {
    if (!transport.isConnected()) {
      this.notify("Device must be connected to calibrate", "error");
      return;
    }

    this.calibrationModal.classList.add("active");
    const statusEl = this.calibrationModal.querySelector(
      "#calibrationStatusBadge",
    );
    const progressEl = this.calibrationModal.querySelector(
      "#calibrationProgressFill",
    );

    if (statusEl) {
      statusEl.className = "wizard-status-badge in-progress";
      statusEl.textContent =
        "Calibrating: Move mouse in circles across your pad...";
    }

    try {
      await MouseApi.enterSurfaceCalibration();
      let elapsed = 0;
      const duration = 5000;
      const interval = 100;

      this.calibrationTimer = setInterval(() => {
        elapsed += interval;
        const pct = Math.min(100, (elapsed / duration) * 100);
        if (progressEl) progressEl.style.width = `${pct}%`;

        if (elapsed >= duration) {
          clearInterval(this.calibrationTimer);
          if (statusEl) {
            statusEl.className = "wizard-status-badge success";
            statusEl.textContent = "Surface Calibration Complete!";
          }
          this.notify(
            "Sensor surface calibration applied to PAW3395 DSP!",
            "success",
          );
          setTimeout(() => this.closeCalibrationWizard(), 2000);
        }
      }, interval);
    } catch (err) {
      if (statusEl) {
        statusEl.className = "wizard-status-badge error";
        statusEl.textContent = `Error: ${err.message}`;
      }
    }
  }

  closeCalibrationWizard() {
    if (this.calibrationTimer) {
      clearInterval(this.calibrationTimer);
      this.calibrationTimer = null;
    }
    this.calibrationModal.classList.remove("active");
  }
}
