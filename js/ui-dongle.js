import { stateManager } from "./state.js";
import { MouseApi } from "./mouse-api.js";
import { transport } from "./transport.js";
import { icon } from "./icons.js";

export class DongleUI {
  constructor(containerId, pairingModalId, notifyFn) {
    this.container = document.getElementById(containerId);
    this.pairingModal = document.getElementById(pairingModalId);
    this.notify = notifyFn || console.log;

    this.pairingPollTimer = null;

    this.init();
  }

  init() {
    stateManager.subscribe(() => {
      this.render();
    });
    this.render();
    this.initWizards();
  }

  render() {
    if (!this.container) return;

    const state = stateManager.current;
    const devInfo = transport.getDeviceInfo() || { maxRate: 1000, mode: "" };
    const is4kDongle =
      devInfo.maxRate >= 4000 && !/wired/i.test(devInfo.mode || "");
    const dongle = state.dongleRgb || { mode: 2, colors: [] };

    this.container.innerHTML = `
      <div class="grid-2col">
        ${
          is4kDongle
            ? `
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("sparkles", 18)}
                  4K Receiver RGB Status Indicator
                </span>
                <span class="card-desc">Configure the LED indicator behavior on the 4K High-Speed receiver dongle</span>
              </div>
              <span class="device-badge">4K Dongle Active</span>
            </div>
            <div class="card-body">
              <label class="button-item-card clickable ${dongle.mode === 1 ? "active" : ""}">
                <div class="button-item-left">
                  <input type="radio" name="dongleMode" value="1" ${dongle.mode === 1 ? "checked" : ""}>
                  <div class="button-item-details">
                    <span class="button-item-name">Mode 1: Low Battery Alert Only</span>
                    <span class="button-item-binding">LED stays off and blinks red only when the battery drops below 15%</span>
                  </div>
                </div>
              </label>

              <label class="button-item-card clickable ${dongle.mode === 2 ? "active" : ""}">
                <div class="button-item-left">
                  <input type="radio" name="dongleMode" value="2" ${dongle.mode === 2 ? "checked" : ""}>
                  <div class="button-item-details">
                    <span class="button-item-name">Mode 2: Dynamic Battery Level Indicator</span>
                    <span class="button-item-binding">Displays Green (100%), Yellow (66%), Orange (33%), Red (Low)</span>
                  </div>
                </div>
              </label>

              <label class="button-item-card clickable ${dongle.mode === 3 ? "active" : ""}">
                <div class="button-item-left">
                  <input type="radio" name="dongleMode" value="3" ${dongle.mode === 3 ? "checked" : ""}>
                  <div class="button-item-details">
                    <span class="button-item-name">Mode 3: Live Polling Rate Indicator</span>
                    <span class="button-item-binding">125 Hz (Red), 250 Hz (Blue), 500 Hz (Yellow), 1000 Hz (Orange), 2000 Hz (Purple), 4000 Hz (Green)</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        `
            : ""
        }

        <div class="col-stack">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("radio", 18)}
                  2.4GHz RF Receiver Pairing
                </span>
                <span class="card-desc">Pair this mouse with a new 1K or 4K USB receiver dongle</span>
              </div>
            </div>
            <div class="card-body">
              <p class="setting-help">Put the dongle in pairing mode and press Left + Middle + Right buttons for 3 seconds.</p>
              <button class="btn accent self-start" id="startPairingBtn">
                Launch 2.4GHz Pairing Wizard
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const radios = this.container.querySelectorAll('input[name="dongleMode"]');
    radios.forEach((radio) => {
      radio.addEventListener("change", () => {
        const mode = parseInt(radio.value, 10);
        stateManager.updateState((draft) => {
          if (!draft.dongleRgb) draft.dongleRgb = { mode: 2, colors: [] };
          draft.dongleRgb.mode = mode;
        });
      });
    });

    const startPairBtn = this.container.querySelector("#startPairingBtn");
    if (startPairBtn) {
      startPairBtn.addEventListener("click", () => this.openPairingWizard());
    }
  }

  initWizards() {
    const closePairBtn = this.pairingModal.querySelector(
      "#closePairingModalBtn",
    );
    if (closePairBtn) {
      closePairBtn.addEventListener("click", () => this.closePairingWizard());
    }
  }

  async openPairingWizard() {
    if (!transport.isConnected()) {
      this.notify("Device must be connected via USB dongle to pair", "error");
      return;
    }

    const devInfo = transport.getDeviceInfo();
    const cid = devInfo ? devInfo.cid : 23;
    const mid = devInfo ? devInfo.mid : 5;

    this.pairingModal.classList.add("active");
    const statusEl = this.pairingModal.querySelector("#pairingStatusBadge");
    const progressEl = this.pairingModal.querySelector("#pairingProgressFill");
    if (statusEl) {
      statusEl.className = "wizard-status-badge in-progress";
      statusEl.textContent =
        "Pairing mode active. Hold Left + Middle + Right for 3 seconds";
    }

    try {
      await MouseApi.startDonglePairing(cid, mid);
      let attempts = 0;
      const maxAttempts = 30;

      this.pairingPollTimer = setInterval(async () => {
        attempts++;
        if (progressEl) {
          progressEl.style.width = `${Math.min(100, (attempts / maxAttempts) * 100)}%`;
        }

        try {
          const state = await MouseApi.getPairState();
          if (state === 2) {
            clearInterval(this.pairingPollTimer);
            if (statusEl) {
              statusEl.className = "wizard-status-badge success";
              statusEl.textContent = "Pairing successful. Device linked.";
            }
            this.notify("2.4GHz Receiver paired successfully!", "success");
            setTimeout(() => this.closePairingWizard(), 2000);
            return;
          } else if (state === 3) {
            clearInterval(this.pairingPollTimer);
            if (statusEl) {
              statusEl.className = "wizard-status-badge error";
              statusEl.textContent = "Pairing Failed. Please try again.";
            }
            return;
          }
        } catch (_) {}

        if (attempts >= maxAttempts) {
          clearInterval(this.pairingPollTimer);
          if (statusEl) {
            statusEl.className = "wizard-status-badge error";
            statusEl.textContent = "Pairing Timed Out. Please retry.";
          }
        }
      }, 500);
    } catch (err) {
      if (statusEl) {
        statusEl.className = "wizard-status-badge error";
        statusEl.textContent = `Error: ${err.message}`;
      }
    }
  }

  closePairingWizard() {
    if (this.pairingPollTimer) {
      clearInterval(this.pairingPollTimer);
      this.pairingPollTimer = null;
    }
    this.pairingModal.classList.remove("active");
  }
}
