import {
  KEY_CLASSES,
  MULTIMEDIA_KEYS,
  PHYSICAL_BUTTON_DEFAULTS,
  MACRO_COUNT,
} from "./protocol.js";
import { stateManager, formatBindingSummary } from "./state.js";

export class ButtonMappingUI {
  constructor(listContainerId, modalBackdropId, onBindChange) {
    this.listContainer = document.getElementById(listContainerId);
    this.modalBackdrop = document.getElementById(modalBackdropId);
    this.onBindChange = onBindChange;

    this.currentEditingIndex = 0;
    this.selectedClass = KEY_CLASSES.KC_MouseKey;
    this.param1 = 1;
    this.param2 = 0;

    this.initModalElements();
  }

  initModalElements() {
    if (!this.modalBackdrop) return;

    this.modalTitle = this.modalBackdrop.querySelector("#modalButtonName");
    this.categoriesContainer =
      this.modalBackdrop.querySelector("#bindCategories");
    this.optionsContainer =
      this.modalBackdrop.querySelector("#bindOptionsPane");
    this.saveBtn = this.modalBackdrop.querySelector("#saveBindBtn");
    this.cancelBtn = this.modalBackdrop.querySelector("#cancelBindBtn");
    this.closeBtn = this.modalBackdrop.querySelector("#closeBindModalBtn");

    if (this.saveBtn) {
      this.saveBtn.addEventListener("click", () => this.applyBinding());
    }
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener("click", () => this.closeModal());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeModal());
    }

    this.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === this.modalBackdrop) {
        this.closeModal();
      }
    });
  }

  renderList() {
    if (!this.listContainer) return;

    const state = stateManager.current;
    const binds = state.keyBindings || [];

    this.listContainer.innerHTML = PHYSICAL_BUTTON_DEFAULTS.map((btnDef, i) => {
      const currentBind = binds[i] || btnDef;
      const summary = formatBindingSummary(currentBind);
      const isActive = stateManager.activeButtonIndex === i;

      return `
        <div class="button-item-card ${isActive ? "active" : ""}" data-index="${i}">
          <div class="button-item-left">
            <span class="button-item-index">${i + 1}</span>
            <div class="button-item-details">
              <span class="button-item-name">${btnDef.name}</span>
              <span class="button-item-binding">${summary}</span>
            </div>
          </div>
          <button class="btn sm accent rebind-btn" data-index="${i}">Rebind</button>
        </div>
      `;
    }).join("");

    this.listContainer.querySelectorAll(".button-item-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const index = parseInt(card.getAttribute("data-index"), 10);
        stateManager.activeButtonIndex = index;
        this.renderList();
        if (typeof this.onBindChange === "function") {
          this.onBindChange(index);
        }
      });
    });

    this.listContainer.querySelectorAll(".rebind-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute("data-index"), 10);
        this.openModal(index);
      });
    });
  }

  openModal(buttonIndex) {
    this.currentEditingIndex = buttonIndex;
    const btnDef = PHYSICAL_BUTTON_DEFAULTS[buttonIndex] || {
      name: `Button ${buttonIndex + 1}`,
    };
    const currentBind = stateManager.current.keyBindings[buttonIndex] || btnDef;

    this.selectedClass =
      currentBind.class !== undefined
        ? currentBind.class
        : KEY_CLASSES.KC_MouseKey;
    this.param1 = currentBind.param1 || 0;
    this.param2 = currentBind.param2 || 0;

    if (this.modalTitle) {
      this.modalTitle.textContent = `Rebind ${btnDef.name} (Button #${buttonIndex + 1})`;
    }

    this.renderCategories();
    this.renderOptionsPane();

    this.modalBackdrop.classList.add("active");
  }

  closeModal() {
    this.modalBackdrop.classList.remove("active");
  }

  renderCategories() {
    if (!this.categoriesContainer) return;

    const categories = [
      {
        id: KEY_CLASSES.KC_MouseKey,
        title: "Mouse Button",
        desc: "Left, right, middle or side clicks",
      },
      {
        id: KEY_CLASSES.KC_ChangeDPIKey,
        title: "DPI Switch",
        desc: "Cycle DPI stages, DPI +, DPI -",
      },
      {
        id: KEY_CLASSES.KC_MouseFireKey,
        title: "Rapid Fire",
        desc: "Burst fire interval & repeat",
      },
      {
        id: KEY_CLASSES.KC_ShortcutKey,
        title: "Multimedia",
        desc: "Volume, playback, browser keys",
      },
      {
        id: KEY_CLASSES.KC_MacroKey,
        title: "Macro Trigger",
        desc: "Execute custom macro sequence",
      },
      {
        id: KEY_CLASSES.KC_DPILockKey,
        title: "Sniper / DPI Lock",
        desc: "Lock custom DPI while held",
      },
      {
        id: KEY_CLASSES.KC_ChangeReportRateKey,
        title: "Polling Rate Cycle",
        desc: "Toggle 125/250/500/1000 Hz",
      },
      {
        id: KEY_CLASSES.KC_ChangeConfigKey,
        title: "Profile Switch",
        desc: "Toggle between profile 1 & 2",
      },
      {
        id: KEY_CLASSES.KC_MouseACPANKey,
        title: "Tilt Scroll",
        desc: "Horizontal tilt-wheel scroll",
      },
      {
        id: KEY_CLASSES.KC_ScrollUpDownKey,
        title: "Scroll Wheel",
        desc: "Scroll up or down",
      },
      {
        id: KEY_CLASSES.KC_CloseKey,
        title: "Disabled",
        desc: "Disable button output",
      },
    ];

    this.categoriesContainer.innerHTML = categories
      .map(
        (cat) => `
      <button class="bind-category-btn ${this.selectedClass === cat.id ? "active" : ""}" data-class="${cat.id}">
        <span class="bind-category-title">${cat.title}</span>
        <span class="bind-category-desc">${cat.desc}</span>
      </button>
    `,
      )
      .join("");

    this.categoriesContainer
      .querySelectorAll(".bind-category-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const cls = parseInt(btn.getAttribute("data-class"), 10);
          this.selectCategory(cls);
        });
      });
  }

  selectCategory(cls) {
    this.selectedClass = cls;

    switch (cls) {
      case KEY_CLASSES.KC_MouseKey:
        this.param1 = 1;
        this.param2 = 0;
        break;
      case KEY_CLASSES.KC_ChangeDPIKey:
        this.param1 = 1;
        this.param2 = 0;
        break;
      case KEY_CLASSES.KC_MouseFireKey:
        this.param1 = 20;
        this.param2 = 3;
        break;
      case KEY_CLASSES.KC_ShortcutKey:
        this.param1 = 0x00e9;
        this.param2 = 0;
        break;
      case KEY_CLASSES.KC_MacroKey:
        this.param1 = 0;
        this.param2 = 0;
        break;
      case KEY_CLASSES.KC_DPILockKey:
        this.param1 = 7;
        this.param2 = 0;
        break;
      case KEY_CLASSES.KC_MouseACPANKey:
        this.param1 = 1;
        this.param2 = 0;
        break;
      case KEY_CLASSES.KC_ScrollUpDownKey:
        this.param1 = 1;
        this.param2 = 0;
        break;
      default:
        this.param1 = 0;
        this.param2 = 0;
    }

    this.renderCategories();
    this.renderOptionsPane();
  }

  renderOptionsPane() {
    if (!this.optionsContainer) return;

    let html = "";

    switch (this.selectedClass) {
      case KEY_CLASSES.KC_MouseKey:
        html = `
          <label class="setting-label">Select Mouse Action</label>
          <select id="subMouseMask">
            <option value="1" ${this.param1 === 1 ? "selected" : ""}>Left Click (Primary)</option>
            <option value="2" ${this.param1 === 2 ? "selected" : ""}>Right Click (Secondary)</option>
            <option value="4" ${this.param1 === 4 ? "selected" : ""}>Middle Click (Wheel Click)</option>
            <option value="8" ${this.param1 === 8 ? "selected" : ""}>Side Backward (Browser Back)</option>
            <option value="16" ${this.param1 === 16 ? "selected" : ""}>Side Forward (Browser Forward)</option>
          </select>
        `;
        break;

      case KEY_CLASSES.KC_ChangeDPIKey:
        html = `
          <label class="setting-label">DPI Switch Behavior</label>
          <select id="subDpiMode">
            <option value="1" ${this.param1 === 1 ? "selected" : ""}>DPI Loop (Cycle)</option>
            <option value="2" ${this.param1 === 2 ? "selected" : ""}>DPI + (Increase)</option>
            <option value="3" ${this.param1 === 3 ? "selected" : ""}>DPI - (Decrease)</option>
          </select>
        `;
        break;

      case KEY_CLASSES.KC_MouseFireKey:
        html = `
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Fire Interval (ms)</span>
              <span class="setting-help">Delay between clicks in burst (1 to 255 ms)</span>
            </div>
            <div class="num-input-wrap">
              <input type="number" id="subFireInterval" min="1" max="255" value="${this.param1 || 20}">
              <span class="unit">ms</span>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Repeat Count</span>
              <span class="setting-help">0 fires while the button is held. 1 to 255 fires a fixed count</span>
            </div>
            <div class="num-input-wrap">
              <input type="number" id="subFireCount" min="0" max="255" value="${this.param2}">
              <span class="unit">shots</span>
            </div>
          </div>
        `;
        break;

      case KEY_CLASSES.KC_ShortcutKey:
        html = `
          <label class="setting-label">Select Multimedia / System Function</label>
          <select id="subMediaKey">
            ${MULTIMEDIA_KEYS.map(
              (m) => `
              <option value="${m.code}" ${this.param1 === m.code ? "selected" : ""}>${m.name}</option>
            `,
            ).join("")}
          </select>
        `;
        break;

      case KEY_CLASSES.KC_MacroKey: {
        const macros = stateManager.current.macros || [];
        if (macros.length === 0) {
          html = `<p class="setting-help">No macros created yet. Create one in the Macro Manager tab.</p>`;
          break;
        }
        html = `
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Macro Slot</span>
              <span class="setting-help">Select one of your macros (up to ${MACRO_COUNT})</span>
            </div>
            <select id="subMacroIndex">
              ${macros
                .map((m, i) => {
                  const label = m ? `${i + 1}: ${m.name}` : `Macro #${i + 1}`;
                  return `<option value="${i}" ${this.param1 === i ? "selected" : ""}>${label}</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Execution Mode</span>
            </div>
            <select id="subMacroLoop">
              <option value="0" ${this.param2 === 0 ? "selected" : ""}>Play Once</option>
              <option value="254" ${this.param2 === 254 ? "selected" : ""}>Loop While Held</option>
              <option value="255" ${this.param2 === 255 ? "selected" : ""}>Loop Until Key Pressed</option>
              <option value="2" ${this.param2 === 2 ? "selected" : ""}>Repeat 2x</option>
              <option value="3" ${this.param2 === 3 ? "selected" : ""}>Repeat 3x</option>
              <option value="5" ${this.param2 === 5 ? "selected" : ""}>Repeat 5x</option>
            </select>
          </div>
        `;
        break;
      }

      case KEY_CLASSES.KC_DPILockKey: {
        const liveDpi = (this.param1 + 1) * 50;
        html = `
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Sniper DPI Value</span>
              <span class="setting-help">Sensor switches to this DPI while holding button</span>
            </div>
            <div class="num-input-wrap">
              <input type="number" id="subSniperDpiNum" min="50" max="26000" step="50" value="${liveDpi}">
              <span class="unit">DPI</span>
            </div>
          </div>
          <input type="range" id="subSniperDpiRange" min="50" max="26000" step="50" value="${liveDpi}">
        `;
        break;
      }

      case KEY_CLASSES.KC_MouseACPANKey:
        html = `
          <label class="setting-label">Tilt Scroll Direction</label>
          <select id="subTiltMode">
            <option value="1" ${this.param1 === 1 ? "selected" : ""}>Scroll Left</option>
            <option value="2" ${this.param1 === 2 ? "selected" : ""}>Scroll Right</option>
          </select>
        `;
        break;

      case KEY_CLASSES.KC_ScrollUpDownKey:
        html = `
          <label class="setting-label">Scroll Direction</label>
          <select id="subScrollMode">
            <option value="1" ${this.param1 === 1 ? "selected" : ""}>Scroll Up</option>
            <option value="2" ${this.param1 === 2 ? "selected" : ""}>Scroll Down</option>
          </select>
        `;
        break;

      case KEY_CLASSES.KC_ChangeReportRateKey:
      case KEY_CLASSES.KC_ChangeConfigKey:
      case KEY_CLASSES.KC_CloseKey:
        html = `<p class="setting-help">This action needs no additional configuration.</p>`;
        break;
    }

    this.optionsContainer.innerHTML = html;
    this.attachOptionListeners();
  }

  attachOptionListeners() {
    const mouseSelect = document.getElementById("subMouseMask");
    if (mouseSelect) {
      mouseSelect.addEventListener("change", () => {
        this.param1 = parseInt(mouseSelect.value, 10);
      });
    }

    const dpiModeSelect = document.getElementById("subDpiMode");
    if (dpiModeSelect) {
      dpiModeSelect.addEventListener("change", () => {
        this.param1 = parseInt(dpiModeSelect.value, 10);
      });
    }

    const fireInt = document.getElementById("subFireInterval");
    const fireCnt = document.getElementById("subFireCount");
    if (fireInt) {
      fireInt.addEventListener("input", () => {
        this.param1 = Math.max(
          1,
          Math.min(255, parseInt(fireInt.value, 10) || 20),
        );
      });
    }
    if (fireCnt) {
      fireCnt.addEventListener("input", () => {
        this.param2 = Math.max(
          0,
          Math.min(255, parseInt(fireCnt.value, 10) || 0),
        );
      });
    }

    const mediaSelect = document.getElementById("subMediaKey");
    if (mediaSelect) {
      mediaSelect.addEventListener("change", () => {
        this.param1 = parseInt(mediaSelect.value, 10);
      });
    }

    const macroIdx = document.getElementById("subMacroIndex");
    const macroLp = document.getElementById("subMacroLoop");
    if (macroIdx) {
      macroIdx.addEventListener("change", () => {
        this.param1 = parseInt(macroIdx.value, 10);
      });
    }
    if (macroLp) {
      macroLp.addEventListener("change", () => {
        this.param2 = parseInt(macroLp.value, 10);
      });
    }

    const sniperRange = document.getElementById("subSniperDpiRange");
    const sniperNum = document.getElementById("subSniperDpiNum");
    if (sniperRange && sniperNum) {
      sniperRange.addEventListener("input", () => {
        sniperNum.value = sniperRange.value;
        const dpi = parseInt(sniperRange.value, 10);
        this.param1 = Math.floor(dpi / 50) - 1;
      });
      sniperNum.addEventListener("change", () => {
        sniperRange.value = sniperNum.value;
        const dpi = parseInt(sniperNum.value, 10);
        this.param1 = Math.floor(dpi / 50) - 1;
      });
    }

    const tiltSelect = document.getElementById("subTiltMode");
    if (tiltSelect) {
      tiltSelect.addEventListener("change", () => {
        this.param1 = parseInt(tiltSelect.value, 10);
      });
    }

    const scrollSelect = document.getElementById("subScrollMode");
    if (scrollSelect) {
      scrollSelect.addEventListener("change", () => {
        this.param1 = parseInt(scrollSelect.value, 10);
      });
    }
  }

  applyBinding() {
    stateManager.updateState((draft) => {
      draft.keyBindings[this.currentEditingIndex] = {
        index: this.currentEditingIndex,
        class: this.selectedClass,
        param1: this.param1,
        param2: this.param2,
      };
    });

    this.closeModal();
    this.renderList();

    if (typeof this.onBindChange === "function") {
      this.onBindChange(this.currentEditingIndex);
    }
  }
}
