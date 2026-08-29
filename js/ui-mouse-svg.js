import { stateManager, formatBindingSummary } from "./state.js";
import { icon } from "./icons.js";

export class MouseSvgVisualizer {
  constructor(containerId, onSelectButton) {
    this.container = document.getElementById(containerId);
    this.onSelectButton = onSelectButton;
    this.activeButtonIndex = 0;
    this.currentView = "top";
  }

  render() {
    if (!this.container) return;

    const state = stateManager.current;
    const binds = state.keyBindings || [];

    const headerHtml = `
      <div class="svg-view-switcher">
        <div class="segment-group">
          <button class="segment-btn ${this.currentView === "top" ? "active" : ""}" id="viewTopBtn">
            ${icon("mouse", 14)}
            Top View (Keys 1-5)
          </button>
          <button class="segment-btn ${this.currentView === "bottom" ? "active" : ""}" id="viewBottomBtn">
            ${icon("scan", 14)}
            Underside View (Key 6)
          </button>
        </div>
      </div>
    `;

    let svgContent = "";

    if (this.currentView === "top") {
      svgContent = `
        <div class="mouse-svg-wrapper">
          <svg class="mouse-svg" viewBox="0 0 460 380" xmlns="http://www.w3.org/2000/svg">

            <rect class="mouse-part mouse-base" x="140" y="30" width="180" height="320" rx="12" />

            <rect x="148" y="160" width="164" height="182" rx="12" fill="var(--bg-surface-raised)" stroke="var(--border-default)" stroke-width="1.5" />

            <rect id="svg-btn-0" class="mouse-part mouse-button-part ${this.activeButtonIndex === 0 ? "active" : ""}"
              x="148" y="38" width="66" height="114" rx="12"
              data-btn="0" title="Button 1: Left Click" />

            <rect id="svg-btn-1" class="mouse-part mouse-button-part ${this.activeButtonIndex === 1 ? "active" : ""}"
              x="246" y="38" width="66" height="114" rx="12"
              data-btn="1" title="Button 2: Right Click" />

            <rect id="svg-btn-2" class="mouse-part mouse-wheel-part ${this.activeButtonIndex === 2 ? "active" : ""}"
              x="218" y="38" width="24" height="52" rx="12"
              data-btn="2" title="Button 3: Middle Click" />

            <line x1="220" y1="50" x2="240" y2="50" stroke="var(--mouse-wheel-line)" stroke-width="1.5" />
            <line x1="220" y1="62" x2="240" y2="62" stroke="var(--mouse-wheel-line)" stroke-width="1.5" />
            <line x1="220" y1="74" x2="240" y2="74" stroke="var(--mouse-wheel-line)" stroke-width="1.5" />

            <rect id="svg-btn-4" class="mouse-part mouse-button-part ${this.activeButtonIndex === 4 ? "active" : ""}"
              x="126" y="130" width="12" height="42" rx="6"
              data-btn="4" title="Button 5: Side Forward" />

            <rect id="svg-btn-3" class="mouse-part mouse-button-part ${this.activeButtonIndex === 3 ? "active" : ""}"
              x="126" y="180" width="12" height="42" rx="6"
              data-btn="3" title="Button 4: Side Backward" />

            <g id="pin-0" class="callout-pin ${this.activeButtonIndex === 0 ? "active" : ""}" data-btn="0" transform="translate(181, 95)">
              <rect x="-10" y="-10" width="20" height="20" rx="10" class="pin-circle" />
              <text class="pin-text">1</text>
            </g>

            <g id="pin-1" class="callout-pin ${this.activeButtonIndex === 1 ? "active" : ""}" data-btn="1" transform="translate(279, 95)">
              <rect x="-10" y="-10" width="20" height="20" rx="10" class="pin-circle" />
              <text class="pin-text">2</text>
            </g>

            <g id="pin-2" class="callout-pin ${this.activeButtonIndex === 2 ? "active" : ""}" data-btn="2" transform="translate(230, 42)">
              <rect x="-10" y="-10" width="20" height="20" rx="10" class="pin-circle" />
              <text class="pin-text">3</text>
            </g>

            <g id="pin-4" class="callout-pin ${this.activeButtonIndex === 4 ? "active" : ""}" data-btn="4" transform="translate(112, 151)">
              <rect x="-10" y="-10" width="20" height="20" rx="10" class="pin-circle" />
              <text class="pin-text">5</text>
            </g>

            <g id="pin-3" class="callout-pin ${this.activeButtonIndex === 3 ? "active" : ""}" data-btn="3" transform="translate(112, 201)">
              <rect x="-10" y="-10" width="20" height="20" rx="10" class="pin-circle" />
              <text class="pin-text">4</text>
            </g>
          </svg>

          <div class="button-callouts-overlay">
            <div class="button-callout-card ${this.activeButtonIndex === 0 ? "active" : ""}" style="top: 20px; left: 10px;" data-btn="0">
              <span class="btn-pin-badge">1</span>
              <div class="btn-info">
                <span class="btn-name">Left Click</span>
                <span class="btn-bind">${formatBindingSummary(binds[0])}</span>
              </div>
            </div>

            <div class="button-callout-card ${this.activeButtonIndex === 1 ? "active" : ""}" style="top: 20px; right: 10px;" data-btn="1">
              <span class="btn-pin-badge">2</span>
              <div class="btn-info">
                <span class="btn-name">Right Click</span>
                <span class="btn-bind">${formatBindingSummary(binds[1])}</span>
              </div>
            </div>

            <div class="button-callout-card ${this.activeButtonIndex === 2 ? "active" : ""}" style="top: -10px; left: 50%; transform: translateX(-50%);" data-btn="2">
              <span class="btn-pin-badge">3</span>
              <div class="btn-info">
                <span class="btn-name">Middle Click</span>
                <span class="btn-bind">${formatBindingSummary(binds[2])}</span>
              </div>
            </div>

            <div class="button-callout-card ${this.activeButtonIndex === 4 ? "active" : ""}" style="top: 130px; left: -15px;" data-btn="4">
              <span class="btn-pin-badge">5</span>
              <div class="btn-info">
                <span class="btn-name">Side Forward</span>
                <span class="btn-bind">${formatBindingSummary(binds[4])}</span>
              </div>
            </div>

            <div class="button-callout-card ${this.activeButtonIndex === 3 ? "active" : ""}" style="top: 200px; left: -15px;" data-btn="3">
              <span class="btn-pin-badge">4</span>
              <div class="btn-info">
                <span class="btn-name">Side Backward</span>
                <span class="btn-bind">${formatBindingSummary(binds[3])}</span>
              </div>
            </div>

            <div class="button-callout-card ${this.activeButtonIndex === 5 ? "active" : ""}" style="top: 290px; right: 10px;" data-btn="5">
              <span class="btn-pin-badge">6</span>
              <div class="btn-info">
                <span class="btn-name">DPI Switch (Underside)</span>
                <span class="btn-bind">${formatBindingSummary(binds[5])}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      svgContent = `
        <div class="mouse-svg-wrapper">
          <svg class="mouse-svg" viewBox="0 0 460 380" xmlns="http://www.w3.org/2000/svg">

            <rect class="mouse-part mouse-base" x="140" y="30" width="180" height="320" rx="12" />

            <rect x="156" y="46" width="148" height="24" rx="12" fill="var(--mouse-skate)" stroke="var(--mouse-skate-border)" stroke-width="1.5" />

            <rect x="156" y="310" width="148" height="24" rx="12" fill="var(--mouse-skate)" stroke="var(--mouse-skate-border)" stroke-width="1.5" />

            <rect x="205" y="145" width="50" height="70" rx="12" fill="var(--mouse-sensor-bg)" stroke="var(--border-default)" stroke-width="1.5" />
            <rect x="218" y="165" width="24" height="30" rx="12" fill="var(--bg-input)" stroke="var(--accent)" stroke-width="1.5" />

            <rect id="svg-btn-5" class="mouse-part mouse-button-part ${this.activeButtonIndex === 5 ? "active" : ""}"
              x="164" y="160" width="26" height="40" rx="12"
              data-btn="5" title="Button 6: DPI Switch (Underside)" />

            <g id="pin-5" class="callout-pin ${this.activeButtonIndex === 5 ? "active" : ""}" data-btn="5" transform="translate(177, 180)">
              <rect x="-10" y="-10" width="20" height="20" rx="10" class="pin-circle" />
              <text class="pin-text">6</text>
            </g>

            <rect x="270" y="160" width="24" height="40" rx="12" fill="var(--bg-input)" stroke="var(--border-default)" stroke-width="1" />
            <rect x="274" y="164" width="16" height="12" rx="6" fill="var(--mouse-switch-thumb)" />
          </svg>

          <div class="button-callouts-overlay">
            <div class="button-callout-card ${this.activeButtonIndex === 5 ? "active" : ""}" style="top: 155px; left: 20px;" data-btn="5">
              <span class="btn-pin-badge">6</span>
              <div class="btn-info">
                <span class="btn-name">DPI Switch</span>
                <span class="btn-bind">${formatBindingSummary(binds[5])}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = headerHtml + svgContent;
    this.attachEvents();
  }

  attachEvents() {
    const viewTopBtn = this.container.querySelector("#viewTopBtn");
    const viewBottomBtn = this.container.querySelector("#viewBottomBtn");

    if (viewTopBtn) {
      viewTopBtn.addEventListener("click", () => {
        this.currentView = "top";
        stateManager.mouseView = "top";
        this.render();
      });
    }

    if (viewBottomBtn) {
      viewBottomBtn.addEventListener("click", () => {
        this.currentView = "bottom";
        stateManager.mouseView = "bottom";
        this.render();
      });
    }

    const clickableEls = this.container.querySelectorAll("[data-btn]");
    clickableEls.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(el.getAttribute("data-btn"), 10);
        this.selectButton(index);
      });
    });
  }

  selectButton(index) {
    this.activeButtonIndex = index;
    stateManager.activeButtonIndex = index;

    if (index === 5 && this.currentView !== "bottom") {
      this.currentView = "bottom";
      stateManager.mouseView = "bottom";
      this.render();
      return;
    } else if (index < 5 && this.currentView !== "top") {
      this.currentView = "top";
      stateManager.mouseView = "top";
      this.render();
      return;
    }

    this.container
      .querySelectorAll(".mouse-part")
      .forEach((p) => p.classList.remove("active"));
    this.container
      .querySelectorAll(".callout-pin")
      .forEach((p) => p.classList.remove("active"));
    this.container
      .querySelectorAll(".button-callout-card")
      .forEach((p) => p.classList.remove("active"));

    const activeSvgPart = this.container.querySelector(`#svg-btn-${index}`);
    if (activeSvgPart) activeSvgPart.classList.add("active");

    const activePin = this.container.querySelector(`#pin-${index}`);
    if (activePin) activePin.classList.add("active");

    const activeCard = this.container.querySelector(
      `.button-callout-card[data-btn="${index}"]`,
    );
    if (activeCard) activeCard.classList.add("active");

    if (typeof this.onSelectButton === "function") {
      this.onSelectButton(index);
    }
  }
}
