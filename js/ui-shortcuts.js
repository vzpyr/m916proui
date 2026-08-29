import { stateManager } from "./state.js";
import { icon } from "./icons.js";
import {
  SHORTCUT_COUNT,
  SHORTCUT_MAX_KEYS,
  HID_KEY_NAMES,
  MODIFIER_NAMES,
} from "./protocol.js";
import { HID_KEY_MAP, keyByName } from "./ui-macros.js";

export class ShortcutsUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeSlot = 0;
    this.isRecording = false;
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

    const shortcuts = stateManager.current.shortcuts || [];

    this.container.innerHTML = `
      <div class="grid-2col">
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-title">
                ${icon("keyboard", 18)}
                Shortcut Key Slots (${shortcuts.length} / ${SHORTCUT_COUNT})
              </span>
              <span class="card-desc">Stored key combinations played by shortcut bindings</span>
            </div>
          </div>
          <div class="card-body scroll-list">
            ${Array.from({ length: SHORTCUT_COUNT }, (_, i) => {
              const sc = shortcuts[i];
              const keys = (sc && sc.keys) || [];
              const summary =
                keys.length > 0
                  ? keys.map((k) => this.labelFor(k)).join(" + ")
                  : "Empty";
              return `
                <div class="button-item-card clickable ${this.activeSlot === i ? "active" : ""}" data-slot="${i}">
                  <div class="button-item-left">
                    <span class="button-item-index">${i + 1}</span>
                    <div class="button-item-details">
                      <span class="button-item-name">Shortcut #${i + 1}</span>
                      <span class="button-item-binding">${summary}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <span class="card-title">
                ${icon("penLine", 18)}
                Shortcut #${this.activeSlot + 1} Editor
              </span>
              <span class="card-desc">Up to ${SHORTCUT_MAX_KEYS} keys in sequence</span>
            </div>
            <button class="btn sm danger" id="clearShortcutBtn">Clear</button>
          </div>
          <div class="card-body">
            <div class="flex-between mt-md">
              <span class="setting-label">Keys (${this.currentKeys().length} / ${SHORTCUT_MAX_KEYS})</span>
              <div class="flex-gap-xs">
                <button class="btn sm ${this.isRecording ? "danger" : "accent"}" id="recordShortcutKeyBtn">
                  ${this.isRecording ? "Press Key..." : `${icon("plus", 14)} Add Key`}
                </button>
                <button class="btn sm" id="addClickShortcutBtn" ${this.currentKeys().length >= SHORTCUT_MAX_KEYS ? "disabled" : ""}>${icon("plus", 14)} Click</button>
              </div>
            </div>
            <div id="shortcutKeysList" class="step-list">
              ${
                this.currentKeys().length > 0
                  ? this.currentKeys()
                      .map(
                        (key, idx) => `
                <div class="dpi-stage-row macro-step-row">
                  <span class="step-idx">${idx + 1}</span>
                  <span class="badge font-mono">${key.type === "mouse" ? "mouse" : key.type === "mod" ? "mod" : "key"}</span>
                  <span class="step-value">${this.labelFor(key)}</span>
                  <button class="btn sm ghost icon-danger delete-shortcut-key-btn" data-index="${idx}" title="Remove Key">${icon("x", 12, "var(--danger)")}</button>
                </div>
              `,
                      )
                      .join("")
                  : `<p class="empty-hint">
                No keys. Press "+ Add Key" and type, or add a mouse click.
              </p>`
              }
            </div>
            <p class="setting-help mt-md">
              Bind a shortcut via the Buttons tab using the Multimedia / Shortcut action.
            </p>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  currentKeys() {
    const sc = (stateManager.current.shortcuts || [])[this.activeSlot];
    return (sc && sc.keys) || [];
  }

  labelFor(key) {
    if (!key) return "";
    if (key.type === "mouse") {
      return (
        {
          1: "Left Click",
          2: "Right Click",
          4: "Middle Click",
          8: "Side Backward",
          16: "Side Forward",
        }[key.hidCode] || `Click 0x${key.hidCode.toString(16)}`
      );
    }
    if (key.type === "mod") {
      return MODIFIER_NAMES[key.hidCode] || `Mod 0x${key.hidCode.toString(16)}`;
    }
    return HID_KEY_NAMES[key.hidCode] || `Key 0x${key.hidCode.toString(16)}`;
  }

  attachEvents() {
    this.container.querySelectorAll("[data-slot]").forEach((card) => {
      card.addEventListener("click", () => {
        this.activeSlot = parseInt(card.getAttribute("data-slot"), 10);
        this.isRecording = false;
        this.render();
      });
    });

    const clearBtn = this.container.querySelector("#clearShortcutBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.updateKeys([]);
      });
    }

    const recordBtn = this.container.querySelector("#recordShortcutKeyBtn");
    if (recordBtn) {
      recordBtn.addEventListener("click", () => this.startRecording());
    }

    const addClick = this.container.querySelector("#addClickShortcutBtn");
    if (addClick) {
      addClick.addEventListener("click", () => {
        this.updateKeys([
          ...this.currentKeys(),
          { type: "mouse", keyState: 1, hidCode: 1, delay: 0 },
        ]);
      });
    }

    this.container
      .querySelectorAll(".delete-shortcut-key-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute("data-index"), 10);
          const keys = this.currentKeys();
          keys.splice(idx, 1);
          this.updateKeys(keys);
        });
      });
  }

  updateKeys(keys) {
    stateManager.updateState((draft) => {
      if (!draft.shortcuts) draft.shortcuts = [];
      draft.shortcuts[this.activeSlot] = { keys };
    });
  }

  startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.render();

    const listener = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const keyInfo = HID_KEY_MAP[e.code] ||
        keyByName(e.key) || { name: e.key.toUpperCase(), code: 0x04 };
      const type =
        e.code === "ShiftLeft" ||
        e.code === "ShiftRight" ||
        e.code === "ControlLeft" ||
        e.code === "ControlRight" ||
        e.code === "AltLeft" ||
        e.code === "AltRight" ||
        e.code === "MetaLeft" ||
        e.code === "MetaRight"
          ? "mod"
          : "key";
      this.updateKeys([
        ...this.currentKeys(),
        { type, keyState: 1, hidCode: keyInfo.code, delay: 0 },
      ]);
      window.removeEventListener("keydown", listener, true);
      this.isRecording = false;
      this.render();
    };

    window.addEventListener("keydown", listener, { capture: true, once: true });
  }
}
