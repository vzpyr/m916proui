import { stateManager } from "./state.js";
import { icon } from "./icons.js";
import { MACRO_COUNT, MACRO_MAX_STEPS, MACRO_NAME_MAX } from "./protocol.js";

export const HID_KEY_MAP = {
  KeyA: { name: "A", code: 0x04 },
  KeyB: { name: "B", code: 0x05 },
  KeyC: { name: "C", code: 0x06 },
  KeyD: { name: "D", code: 0x07 },
  KeyE: { name: "E", code: 0x08 },
  KeyF: { name: "F", code: 0x09 },
  KeyG: { name: "G", code: 0x0a },
  KeyH: { name: "H", code: 0x0b },
  KeyI: { name: "I", code: 0x0c },
  KeyJ: { name: "J", code: 0x0d },
  KeyK: { name: "K", code: 0x0e },
  KeyL: { name: "L", code: 0x0f },
  KeyM: { name: "M", code: 0x10 },
  KeyN: { name: "N", code: 0x11 },
  KeyO: { name: "O", code: 0x12 },
  KeyP: { name: "P", code: 0x13 },
  KeyQ: { name: "Q", code: 0x14 },
  KeyR: { name: "R", code: 0x15 },
  KeyS: { name: "S", code: 0x16 },
  KeyT: { name: "T", code: 0x17 },
  KeyU: { name: "U", code: 0x18 },
  KeyV: { name: "V", code: 0x19 },
  KeyW: { name: "W", code: 0x1a },
  KeyX: { name: "X", code: 0x1b },
  KeyY: { name: "Y", code: 0x1c },
  KeyZ: { name: "Z", code: 0x1d },
  Digit1: { name: "1", code: 0x1e },
  Digit2: { name: "2", code: 0x1f },
  Digit3: { name: "3", code: 0x20 },
  Digit4: { name: "4", code: 0x21 },
  Digit5: { name: "5", code: 0x22 },
  Digit6: { name: "6", code: 0x23 },
  Digit7: { name: "7", code: 0x24 },
  Digit8: { name: "8", code: 0x25 },
  Digit9: { name: "9", code: 0x26 },
  Digit0: { name: "0", code: 0x27 },
  Enter: { name: "Enter", code: 0x28 },
  Escape: { name: "Esc", code: 0x29 },
  Backspace: { name: "Backspace", code: 0x2a },
  Tab: { name: "Tab", code: 0x2b },
  Space: { name: "Space", code: 0x2c },
  Minus: { name: "-", code: 0x2d },
  Equal: { name: "=", code: 0x2e },
  BracketLeft: { name: "[", code: 0x2f },
  BracketRight: { name: "]", code: 0x30 },
  Backslash: { name: "Backslash", code: 0x31 },
  Semicolon: { name: ";", code: 0x33 },
  Quote: { name: "'", code: 0x34 },
  Backquote: { name: "`", code: 0x35 },
  Comma: { name: ",", code: 0x36 },
  Period: { name: ".", code: 0x37 },
  Slash: { name: "/", code: 0x38 },
  CapsLock: { name: "CapsLock", code: 0x39 },
  F1: { name: "F1", code: 0x3a },
  F2: { name: "F2", code: 0x3b },
  F3: { name: "F3", code: 0x3c },
  F4: { name: "F4", code: 0x3d },
  F5: { name: "F5", code: 0x3e },
  F6: { name: "F6", code: 0x3f },
  F7: { name: "F7", code: 0x40 },
  F8: { name: "F8", code: 0x41 },
  F9: { name: "F9", code: 0x42 },
  F10: { name: "F10", code: 0x43 },
  F11: { name: "F11", code: 0x44 },
  F12: { name: "F12", code: 0x45 },
  PrintScreen: { name: "Screen", code: 0x46 },
  ScrollLock: { name: "Scroll", code: 0x47 },
  Pause: { name: "Pause", code: 0x48 },
  Insert: { name: "Insert", code: 0x49 },
  Home: { name: "Home", code: 0x4a },
  PageUp: { name: "PageUp", code: 0x4b },
  Delete: { name: "Del", code: 0x4c },
  End: { name: "End", code: 0x4d },
  PageDown: { name: "PageDn", code: 0x4e },
  ArrowRight: { name: "Right Arrow", code: 0x4f },
  ArrowLeft: { name: "Left Arrow", code: 0x50 },
  ArrowDown: { name: "Down Arrow", code: 0x51 },
  ArrowUp: { name: "Up Arrow", code: 0x52 },
  NumLock: { name: "NumLock", code: 0x53 },
  NumpadDivide: { name: "Num/", code: 0x54 },
  NumpadMultiply: { name: "Num*", code: 0x55 },
  NumpadSubtract: { name: "Num-", code: 0x56 },
  NumpadAdd: { name: "Num+", code: 0x57 },
  NumpadEnter: { name: "Enter", code: 0x58 },
  Numpad1: { name: "Num1", code: 0x59 },
  Numpad2: { name: "Num2", code: 0x5a },
  Numpad3: { name: "Num3", code: 0x5b },
  Numpad4: { name: "Num4", code: 0x5c },
  Numpad5: { name: "Num5", code: 0x5d },
  Numpad6: { name: "Num6", code: 0x5e },
  Numpad7: { name: "Num7", code: 0x5f },
  Numpad8: { name: "Num8", code: 0x60 },
  Numpad9: { name: "Num9", code: 0x61 },
  Numpad0: { name: "Num0", code: 0x62 },
  NumpadDecimal: { name: "Num.", code: 0x63 },
  ContextMenu: { name: "Apps", code: 0x65 },
  ShiftLeft: { name: "LShift", code: 0x02 },
  ShiftRight: { name: "RShift", code: 0x20 },
  ControlLeft: { name: "LCtrl", code: 0x01 },
  ControlRight: { name: "RCtrl", code: 0x10 },
  AltLeft: { name: "LAlt", code: 0x04 },
  AltRight: { name: "RAlt", code: 0x40 },
  MetaLeft: { name: "LWin", code: 0x08 },
  MetaRight: { name: "RWin", code: 0x80 },
};

export function keyByName(name) {
  if (!name) return null;
  const upper = String(name).toUpperCase();
  const entry = Object.entries(HID_KEY_MAP).find(
    ([, v]) => v.name.toUpperCase() === upper,
  );
  return entry ? { name: entry[1].name, code: entry[1].code } : null;
}

export class MacroUI {
  constructor(containerId, notifyFn) {
    this.container = document.getElementById(containerId);
    this.notify = notifyFn || console.log;
    this.activeMacroIndex = 0;
    this.isRecordingKey = false;

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
    const macros = state.macros || [];

    if (this.activeMacroIndex >= macros.length && macros.length > 0) {
      this.activeMacroIndex = macros.length - 1;
    }

    const hasMacros = macros.length > 0;
    const activeMacro = hasMacros ? macros[this.activeMacroIndex] : null;

    this.container.innerHTML = `
      <div class="grid-2col">
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-title">
                ${icon("terminal", 18)}
                Hardware Macros (${macros.length} / ${MACRO_COUNT})
              </span>
              <span class="card-desc">On-board flash macro definitions</span>
            </div>
            <button class="btn sm accent" id="newMacroBtn">${icon("plus", 14)} New Macro</button>
          </div>
          <div class="card-body scroll-list">
            ${
              hasMacros
                ? macros
                    .map((m, i) => {
                      const isActive = this.activeMacroIndex === i;
                      return `
                <div class="button-item-card clickable ${isActive ? "active" : ""}" data-macro-idx="${i}">
                  <div class="button-item-left">
                    <span class="button-item-index">${i + 1}</span>
                    <div class="button-item-details">
                      <span class="button-item-name">${m.name || `Macro #${i + 1}`}</span>
                      <span class="button-item-binding">${(m.steps || []).length} Steps</span>
                    </div>
                  </div>
                  <div class="flex-gap-xs">
                    <button class="btn sm ghost edit-macro-btn" data-macro-idx="${i}">Select</button>
                    <button class="btn sm ghost icon-danger delete-macro-btn" data-macro-idx="${i}" title="Delete Macro">${icon("x", 12, "var(--danger)")}</button>
                  </div>
                </div>
              `;
                    })
                    .join("")
                : `
              <div class="empty-state">
                <p>No macros created yet.</p>
                <button class="btn sm accent" id="createFirstMacroBtn">${icon("plus", 14)} Create First Macro</button>
              </div>
            `
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-title">
                ${icon("play", 18)}
                ${activeMacro ? activeMacro.name : "Macro Sequence Editor"}
              </span>
              <span class="card-desc">${activeMacro ? "Configure keystrokes, mouse buttons and delay steps" : "Select or create a macro to edit"}</span>
            </div>
            ${
              activeMacro
                ? `
              <button class="btn sm danger" id="deleteActiveMacroBtn">Delete Macro</button>
            `
                : ""
            }
          </div>
          <div class="card-body">
            ${
              activeMacro
                ? `
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Macro Name</span>
                  <span class="setting-help">Name stored in on-board MCU flash</span>
                </div>
                <input type="text" id="macroNameInput" value="${activeMacro.name || ""}" class="name-input" maxlength="${MACRO_NAME_MAX}">
              </div>

              <div class="flex-between mt-md">
                <span class="setting-label">Sequence Steps (${(activeMacro.steps || []).length} / ${MACRO_MAX_STEPS})</span>
                <div class="flex-gap-xs">
                  <button class="btn sm ${this.isRecordingKey ? "danger" : "accent"}" id="recordKeyBtn">
                    ${this.isRecordingKey ? "Press Key..." : `${icon("plus", 14)} Add Key`}
                  </button>
                  <select id="clickButtonSelect" title="Mouse button to add" class="select-sm">
                    <option value="1">Left Click</option>
                    <option value="2">Right Click</option>
                    <option value="4">Middle Click</option>
                    <option value="8">Side Backward</option>
                    <option value="16">Side Forward</option>
                  </select>
                  <button class="btn sm" id="addClickStepBtn">${icon("plus", 14)} Click</button>
                  <button class="btn sm" id="addDelayStepBtn">${icon("plus", 14)} Delay</button>
                </div>
              </div>

              <div id="macroStepsContainer" class="step-list">
                ${
                  (activeMacro.steps || []).length > 0
                    ? (activeMacro.steps || [])
                        .map(
                          (step, idx) => `
                  <div class="dpi-stage-row macro-step-row">
                    <span class="step-idx">${idx + 1}</span>
                    <span class="badge font-mono">${step.type}</span>
                    <span class="step-value">${step.value}</span>
                    <div class="num-input-wrap compact">
                      <input type="number" class="step-delay-input" data-step="${idx}" min="1" max="60000" value="${step.delay || 20}">
                      <span class="unit">ms</span>
                    </div>
                    <button class="btn sm ghost icon-danger delete-step-btn" data-step="${idx}" title="Remove Step">${icon("x", 12, "var(--danger)")}</button>
                  </div>
                `,
                        )
                        .join("")
                    : `
                  <p class="empty-hint">
                    Sequence is empty. Click "+ Add Key", "+ Click", or "+ Delay" above.
                  </p>
                `
                }
              </div>
            `
                : `
              <div class="empty-state empty-state--lg">
                <p>Create or select a macro from the left panel to edit sequence steps.</p>
              </div>
            `
            }
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const newBtn = this.container.querySelector("#newMacroBtn");
    const firstBtn = this.container.querySelector("#createFirstMacroBtn");
    if (newBtn) newBtn.addEventListener("click", () => this.createMacro());
    if (firstBtn) firstBtn.addEventListener("click", () => this.createMacro());

    this.container.querySelectorAll("[data-macro-idx]").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".delete-macro-btn")) return;
        const idx = parseInt(card.getAttribute("data-macro-idx"), 10);
        this.activeMacroIndex = idx;
        this.render();
      });
    });

    this.container.querySelectorAll(".delete-macro-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-macro-idx"), 10);
        this.deleteMacro(idx);
      });
    });

    const deleteActiveBtn = this.container.querySelector(
      "#deleteActiveMacroBtn",
    );
    if (deleteActiveBtn) {
      deleteActiveBtn.addEventListener("click", () =>
        this.deleteMacro(this.activeMacroIndex),
      );
    }

    const nameInput = this.container.querySelector("#macroNameInput");
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        const val = nameInput.value.slice(0, MACRO_NAME_MAX);
        stateManager.updateState((draft) => {
          if (draft.macros[this.activeMacroIndex]) {
            draft.macros[this.activeMacroIndex].name = val;
          }
        });
        const el = this.container.querySelector("#macroNameInput");
        if (el && document.activeElement !== el) {
          el.focus();
          el.setSelectionRange(val.length, val.length);
        }
      });
    }

    const recordKeyBtn = this.container.querySelector("#recordKeyBtn");
    if (recordKeyBtn) {
      recordKeyBtn.addEventListener("click", () => this.startKeyRecording());
    }

    const addClick = this.container.querySelector("#addClickStepBtn");
    const clickButton = this.container.querySelector("#clickButtonSelect");
    if (addClick) {
      addClick.addEventListener("click", () => {
        const hid = clickButton ? parseInt(clickButton.value, 10) : 1;
        const label =
          {
            1: "Left Click",
            2: "Right Click",
            4: "Middle Click",
            8: "Side Backward",
            16: "Side Forward",
          }[hid] || "Click";
        stateManager.updateState((draft) => {
          if (!draft.macros[this.activeMacroIndex]) return;
          const steps = draft.macros[this.activeMacroIndex].steps;
          if (steps.length < MACRO_MAX_STEPS - 1) {
            steps.push(
              {
                type: "mouse",
                keyState: 1,
                value: `${label} Down`,
                hidCode: hid,
                delay: 20,
              },
              {
                type: "mouse",
                keyState: 0,
                value: `${label} Up`,
                hidCode: hid,
                delay: 30,
              },
            );
          }
        });
        this.render();
      });
    }

    const addDelay = this.container.querySelector("#addDelayStepBtn");
    if (addDelay) {
      addDelay.addEventListener("click", () => {
        stateManager.updateState((draft) => {
          if (!draft.macros[this.activeMacroIndex]) return;
          const steps = draft.macros[this.activeMacroIndex].steps;
          if (steps.length < MACRO_MAX_STEPS) {
            steps.push({
              type: "delay",
              keyState: 0,
              value: "Delay 50 ms",
              hidCode: 0,
              delay: 50,
            });
          }
        });
        this.render();
      });
    }

    this.container.querySelectorAll(".step-delay-input").forEach((input) => {
      input.addEventListener("change", () => {
        const stepIdx = parseInt(input.getAttribute("data-step"), 10);
        const delayVal = Math.max(
          1,
          Math.min(60000, parseInt(input.value, 10) || 20),
        );
        input.value = delayVal;
        stateManager.updateState((draft) => {
          if (
            draft.macros[this.activeMacroIndex] &&
            draft.macros[this.activeMacroIndex].steps[stepIdx]
          ) {
            draft.macros[this.activeMacroIndex].steps[stepIdx].delay = delayVal;
          }
        });
      });
    });

    this.container.querySelectorAll(".delete-step-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const stepIdx = parseInt(btn.getAttribute("data-step"), 10);
        stateManager.updateState((draft) => {
          if (
            draft.macros[this.activeMacroIndex] &&
            draft.macros[this.activeMacroIndex].steps
          ) {
            draft.macros[this.activeMacroIndex].steps.splice(stepIdx, 1);
          }
        });
        this.render();
      });
    });
  }

  createMacro() {
    const macros = stateManager.current.macros || [];
    if (macros.length >= MACRO_COUNT) {
      this.notify(
        `Maximum limit of ${MACRO_COUNT} hardware macros reached`,
        "warning",
      );
      return;
    }

    const nextIndex = macros.length;
    const newMacro = {
      name: `Macro ${nextIndex + 1}`,
      steps: [
        {
          type: "key",
          keyState: 1,
          value: "Key A Down",
          hidCode: 0x04,
          delay: 20,
        },
        {
          type: "key",
          keyState: 0,
          value: "Key A Up",
          hidCode: 0x04,
          delay: 30,
        },
      ],
    };

    stateManager.updateState((draft) => {
      if (!draft.macros) draft.macros = [];
      draft.macros.push(newMacro);
    });

    this.activeMacroIndex = nextIndex;
    this.render();
    this.notify(`Created ${newMacro.name}`, "info");
  }

  deleteMacro(index) {
    stateManager.updateState((draft) => {
      if (draft.macros && draft.macros[index]) {
        draft.macros.splice(index, 1);
      }
    });

    if (this.activeMacroIndex >= stateManager.current.macros.length) {
      this.activeMacroIndex = Math.max(
        0,
        stateManager.current.macros.length - 1,
      );
    }

    this.render();
    this.notify("Macro deleted", "info");
  }

  startKeyRecording() {
    if (this.isRecordingKey) return;
    this.isRecordingKey = true;
    this.render();

    const keyListener = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const keyInfo = HID_KEY_MAP[e.code] ||
        keyByName(e.key) || { name: e.key.toUpperCase(), code: 0x04 };

      stateManager.updateState((draft) => {
        if (!draft.macros[this.activeMacroIndex]) return;
        const steps = draft.macros[this.activeMacroIndex].steps;
        if (steps.length < MACRO_MAX_STEPS - 1) {
          steps.push(
            {
              type: "key",
              keyState: 1,
              value: `Key ${keyInfo.name} Down`,
              hidCode: keyInfo.code,
              delay: 20,
            },
            {
              type: "key",
              keyState: 0,
              value: `Key ${keyInfo.name} Up`,
              hidCode: keyInfo.code,
              delay: 30,
            },
          );
        }
      });

      window.removeEventListener("keydown", keyListener, true);
      this.isRecordingKey = false;
      this.render();
      this.notify(`Added key: ${keyInfo.name}`, "success");
    };

    window.addEventListener("keydown", keyListener, {
      capture: true,
      once: true,
    });
  }
}
