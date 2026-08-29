import { POLLING_RATES, MIN_DPI, MAX_DPI, DPI_STEP } from "./protocol.js";
import { stateManager } from "./state.js";
import { MouseApi } from "./mouse-api.js";
import { transport } from "./transport.js";
import { icon } from "./icons.js";

export class DpiUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.liveDpiTimer = null;
    this.init();
  }

  init() {
    stateManager.subscribe(() => {
      this.render();
    });
    this.render();
  }

  render() {
    if (!this.container) return;

    const state = stateManager.current;
    const devInfo = transport.getDeviceInfo() || { maxRate: 1000 };
    const is4k = devInfo.maxRate >= 4000;

    this.container.innerHTML = `
      <div class="grid-2col">
        <div class="col-stack">
          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("gauge", 18)}
                  Polling Rate
                </span>
                <span class="card-desc">USB report frequency sent to the operating system</span>
              </div>
              <span class="device-badge">${is4k ? "4K High-Speed" : "1K Standard"}</span>
            </div>
            <div class="card-body">
              <div class="segment-group segment-wrap" id="pollingRateGroup">
                ${POLLING_RATES.map((r) => {
                  const isVisible = !r.is4kOnly || is4k;
                  if (!isVisible) return "";
                  const isActive = state.reportRate === r.rate;
                  return `
                    <button class="segment-btn ${isActive ? "active" : ""}" data-rate="${r.rate}">
                      ${r.label}
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-title">
                  ${icon("slidersHorizontal", 18)}
                  Response & Lift-off (LOD)
                </span>
                <span class="card-desc">Mechanical switch debounce and optical sensor height</span>
              </div>
            </div>
            <div class="card-body">
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Key Debounce Time</span>
                  <span class="setting-help">Prevents accidental double-clicks (0 to 20 ms)</span>
                </div>
                <div class="num-input-wrap">
                  <input type="number" id="debounceNum" min="0" max="20" value="${state.perf.keyDebounce || 4}">
                  <span class="unit">ms</span>
                </div>
              </div>
              <input type="range" id="debounceRange" min="0" max="20" value="${state.perf.keyDebounce || 4}">

              <div class="setting-row mt-md">
                <div class="setting-info">
                  <span class="setting-label">Lift-Off Distance (LOD)</span>
                  <span class="setting-help">Cutoff tracking height when lifting the mouse</span>
                </div>
                <div class="segment-group">
                  <button class="segment-btn ${state.silenceHeight === 0 ? "active" : ""}" id="lodLowBtn">1.0 mm (Low)</button>
                  <button class="segment-btn ${state.silenceHeight === 1 ? "active" : ""}" id="lodHighBtn">2.0 mm (High)</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-title">
                ${icon("crosshair", 18)}
                DPI Resolution Stages (${state.maxDPI} Active)
              </span>
              <span class="card-desc">Click any stage to live-activate on sensor (50 to 26,000 DPI)</span>
            </div>
            <div class="flex-gap-xs">
              <button class="btn sm" id="removeDpiStageBtn" ${state.maxDPI <= 1 ? "disabled" : ""}>${icon("minus", 14)} Remove</button>
              <button class="btn sm" id="addDpiStageBtn" ${state.maxDPI >= 8 ? "disabled" : ""}>${icon("plus", 14)} Add</button>
            </div>
          </div>
          <div class="card-body" id="dpiStagesList">
            ${Array.from({ length: state.maxDPI }, (_, i) => {
              const dpi = state.dpiStages[i] || 800;
              const color = state.dpiColors[i] || { r: 255, g: 0, b: 0 };
              const hex = rgbToHex(color.r, color.g, color.b);
              const isActive = state.currentDPIIndex === i;

              return `
                <div class="dpi-stage-row clickable ${isActive ? "active" : ""}" data-stage="${i}">
                  <span class="dpi-stage-number">#${i + 1}</span>
                  <div class="dpi-color-btn" style="background-color: ${hex};" title="Change Stage Color">
                    <input type="color" class="dpi-color-input" data-stage="${i}" value="${hex}">
                  </div>
                  <input type="range" class="dpi-range-input" data-stage="${i}" min="${MIN_DPI}" max="${MAX_DPI}" step="${DPI_STEP}" value="${dpi}">
                  <div class="num-input-wrap">
                    <input type="number" class="dpi-num-input" data-stage="${i}" min="${MIN_DPI}" max="${MAX_DPI}" step="${DPI_STEP}" value="${dpi}">
                    <span class="unit">DPI</span>
                  </div>
                  <button class="btn sm ghost set-active-dpi-btn ${isActive ? "active" : ""}" data-stage="${i}" title="${isActive ? "Active Live Stage" : "Switch Live Stage"}">
                    ${isActive ? icon("circle", 14, "currentColor", "", "currentColor") : icon("circle", 14)}
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const rateBtns = this.container.querySelectorAll(
      "#pollingRateGroup .segment-btn",
    );
    rateBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const rate = parseInt(btn.getAttribute("data-rate"), 10);
        stateManager.updateState({ reportRate: rate });
      });
    });

    const debounceNum = this.container.querySelector("#debounceNum");
    const debounceRange = this.container.querySelector("#debounceRange");
    if (debounceNum && debounceRange) {
      debounceNum.addEventListener("change", () => {
        const val = Math.max(
          0,
          Math.min(20, parseInt(debounceNum.value, 10) || 0),
        );
        debounceRange.value = val;
        stateManager.updateState((draft) => {
          draft.perf.keyDebounce = val;
        });
      });
      debounceRange.addEventListener("input", () => {
        const val = parseInt(debounceRange.value, 10);
        debounceNum.value = val;
        stateManager.updateState((draft) => {
          draft.perf.keyDebounce = val;
        });
      });
    }

    const lodLow = this.container.querySelector("#lodLowBtn");
    const lodHigh = this.container.querySelector("#lodHighBtn");
    if (lodLow) {
      lodLow.addEventListener("click", () => {
        stateManager.updateState({ silenceHeight: 0 });
      });
    }
    if (lodHigh) {
      lodHigh.addEventListener("click", () => {
        stateManager.updateState({ silenceHeight: 1 });
      });
    }

    const addStageBtn = this.container.querySelector("#addDpiStageBtn");
    const removeStageBtn = this.container.querySelector("#removeDpiStageBtn");
    if (addStageBtn) {
      addStageBtn.addEventListener("click", () => {
        const curMax = stateManager.current.maxDPI;
        if (curMax < 8) {
          stateManager.updateState({ maxDPI: curMax + 1 });
        }
      });
    }
    if (removeStageBtn) {
      removeStageBtn.addEventListener("click", () => {
        const curMax = stateManager.current.maxDPI;
        if (curMax > 1) {
          const newIndex = Math.min(
            stateManager.current.currentDPIIndex,
            curMax - 2,
          );
          stateManager.updateState({
            maxDPI: curMax - 1,
            currentDPIIndex: newIndex,
          });
        }
      });
    }

    this.container.querySelectorAll(".dpi-stage-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".dpi-color-btn") || e.target.closest("input"))
          return;
        const stage = parseInt(row.getAttribute("data-stage"), 10);
        this.selectActiveStage(stage);
      });
    });

    this.container.querySelectorAll(".set-active-dpi-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const stage = parseInt(btn.getAttribute("data-stage"), 10);
        this.selectActiveStage(stage);
      });
    });

    this.container.querySelectorAll(".dpi-range-input").forEach((range) => {
      range.addEventListener("input", (e) => {
        const stage = parseInt(range.getAttribute("data-stage"), 10);
        const val = parseInt(range.value, 10);
        const numInput = this.container.querySelector(
          `.dpi-num-input[data-stage="${stage}"]`,
        );
        if (numInput) numInput.value = val;

        stateManager.updateState((draft) => {
          draft.dpiStages[stage] = val;
        });

        if (stage === stateManager.current.currentDPIIndex) {
          clearTimeout(this.liveDpiTimer);
          this.liveDpiTimer = setTimeout(() => {
            MouseApi.liveUpdateDpi(
              stage,
              val,
              stateManager.current.activeProfileIndex,
            );
          }, 60);
        }
      });
    });

    this.container.querySelectorAll(".dpi-num-input").forEach((num) => {
      num.addEventListener("change", () => {
        const stage = parseInt(num.getAttribute("data-stage"), 10);
        let val = parseInt(num.value, 10) || 800;
        val = Math.max(
          MIN_DPI,
          Math.min(MAX_DPI, Math.round(val / DPI_STEP) * DPI_STEP),
        );
        num.value = val;
        const range = this.container.querySelector(
          `.dpi-range-input[data-stage="${stage}"]`,
        );
        if (range) range.value = val;
        stateManager.updateState((draft) => {
          draft.dpiStages[stage] = val;
        });

        if (stage === stateManager.current.currentDPIIndex) {
          MouseApi.liveUpdateDpi(
            stage,
            val,
            stateManager.current.activeProfileIndex,
          );
        }
      });
    });

    this.container
      .querySelectorAll(".dpi-color-input")
      .forEach((colorInput) => {
        colorInput.addEventListener("input", () => {
          const stage = parseInt(colorInput.getAttribute("data-stage"), 10);
          const rgb = hexToRgb(colorInput.value);
          if (rgb) {
            colorInput.parentElement.style.backgroundColor = colorInput.value;
            stateManager.updateState((draft) => {
              draft.dpiColors[stage] = rgb;
            });
          }
        });
      });
  }

  async selectActiveStage(stageIndex) {
    stateManager.current.currentDPIIndex = stageIndex;
    stateManager.initialCommitted.currentDPIIndex = stageIndex;
    stateManager.notify();

    if (transport.isConnected()) {
      await MouseApi.setActiveDpiStage(
        stageIndex,
        stateManager.current.activeProfileIndex,
      );
    }
  }
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = (x || 0).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
