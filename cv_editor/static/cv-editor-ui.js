import { PDF_FONT_KEYS, PDF_FONT_DEFAULTS, SECTION_KEYS, SECTION_LABELS } from "./cv-editor-state.js";

export class CvRenderer {
  constructor(state, { qs = (id) => document.getElementById(id), onDirty = () => {} } = {}) {
    this.state = state;
    this.qs = qs;
    this.onDirty = onDirty;
  }

  safe(value) {
    return value == null ? "" : String(value);
  }

  setStatus(text) {
    this.state.setStatus(text);
    const statusEl = this.qs("status");
    if (statusEl) {
      statusEl.innerHTML = `Status: <strong>${this.state.lastStatus}</strong>${this.state.isDirty ? " • Unsaved changes" : ""}`;
    }
  }

  renderPdfFontsPanel() {
    this.state.ensurePdfFonts();
    const root = this.qs("pdfFontsPanel");
    if (!root) return;

    let lastGroup = "";
    const rows = PDF_FONT_KEYS.map((row) => {
      const f = this.state.cv.pdf_fonts[row.key];
      let groupHtml = "";
      if (row.group !== lastGroup) {
        lastGroup = row.group;
        groupHtml = `<div class="font-group-title">${row.group}</div>`;
      }

      const lineField = row.line
        ? `<div class="field"><label>Line (mm)</label><input type="number" step="0.5" id="pdf_font_${row.key}_line" value="${f.line}" /></div>`
        : `<div class="field"><label>Line (mm)</label><input disabled placeholder="—" style="opacity:0.45" /></div>`;
      const cellField = row.cell
        ? `<div class="field"><label>Row H (mm)</label><input type="number" step="0.5" id="pdf_font_${row.key}_cell" value="${f.cell_h}" /></div>`
        : `<div class="field"><label>Row H (mm)</label><input disabled placeholder="—" style="opacity:0.45" /></div>`;
      const colorField = row.color
        ? `<div class="field"><label>Color</label><input type="color" id="pdf_font_${row.key}_color" value="${f.color || '#000000'}" /></div>`
        : ``;

      const styleOpts = ["", "B", "I", "BI"].map((value) => {
        const label = value === "" ? "Normal" : value === "B" ? "Bold" : value === "I" ? "Italic" : "Bold italic";
        const selected = f.style === value ? " selected" : "";
        return `<option value="${value}"${selected}>${label}</option>`;
      }).join("");

      return (
        groupHtml +
        `<div class="font-row">
          <div class="font-row-label">${row.label}</div>
          <div class="field"><label>Size (pt)</label><input type="number" step="0.5" id="pdf_font_${row.key}_size" value="${f.size}" /></div>
          <div class="field"><label>Style</label><select id="pdf_font_${row.key}_style">${styleOpts}</select></div>
          ${lineField}
          ${cellField}
          ${colorField}
        </div>`
      );
    });

    root.innerHTML = rows.join("");
  }

  renderMainOffsets() {
    this.state.ensureMainOffsets();
    const root = this.qs("mainOffsetsList");
    if (!root) return;

    root.innerHTML = SECTION_KEYS.map((key) => {
      const label = SECTION_LABELS[key] || key;
      const val = Number(this.state.cv.main_offsets[key] || 0);
      return `
        <div class="exp-card" style="padding:10px;" data-key="${key}">
          <div class="exp-top">
            <div style="min-width:0;">
              <div class="exp-title">${label}</div>
              <div class="exp-date">Offset: <strong>${val}</strong> mm</div>
            </div>
            <div class="actions">
              <button class="btnUp" type="button">Up</button>
              <button class="btnDown" type="button">Down</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    root.querySelectorAll("[data-key]").forEach((row) => {
      const key = row.dataset.key;
      const update = (delta) => {
        this.state.cv.main_offsets[key] = Number(this.state.cv.main_offsets[key] || 0) + delta;
        this.renderMainOffsets();
        this.onDirty();
      };
      row.querySelector(".btnUp")?.addEventListener("click", () => update(-2));
      row.querySelector(".btnDown")?.addEventListener("click", () => update(2));
    });
  }

  missionCardTemplate(mission, groupIndex, missionIndex) {
    const safe = (value) => (value == null ? "" : String(value));
    return `
      <div class="mission-card" data-group-index="${groupIndex}" data-mission-index="${missionIndex}">
        <div class="mission-top">
          <div class="exp-title">${safe(mission.title) || "Untitled mission"}</div>
          <button class="btnDeleteMission danger" type="button">Delete mission</button>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label-row">
              <label>Mission title</label>
              <button class="btnFontMenu" type="button" data-font-key="exp_item_title">Fonts</button>
            </div>
            <input class="fMissionTitle" value="${safe(mission.title).replaceAll('"', '&quot;')}" />
          </div>
          <div class="field">
            <div class="field-label-row">
              <label>Date</label>
              <button class="btnFontMenu" type="button" data-font-key="exp_item_date">Fonts</button>
            </div>
            <input class="fMissionDate" value="${safe(mission.date).replaceAll('"', '&quot;')}" />
          </div>
        </div>
        <div class="field">
          <div class="field-label-row">
            <label>Description</label>
            <button class="btnFontMenu" type="button" data-font-key="exp_item_desc">Fonts</button>
          </div>
          <textarea class="fMissionDesc">${safe(mission.desc)}</textarea>
        </div>
        <div class="field">
          <div class="field-label-row">
            <label>Technologies</label>
            <button class="btnFontMenu" type="button" data-font-key="exp_tech_body">Fonts</button>
          </div>
          <textarea class="fMissionTechs">${safe(mission.techs)}</textarea>
        </div>
      </div>
    `;
  }

  expCardTemplate(group, idx) {
    const safe = (value) => (value == null ? "" : String(value));
    const missions = Array.isArray(group.missions) ? group.missions : [];
    const missionsHTML = missions.length
      ? missions.map((mission, missionIndex) => this.missionCardTemplate(mission, idx, missionIndex)).join("")
      : `<div class="hint">No missions yet. Add one above.</div>`;

    return `
      <div class="exp-card" data-index="${idx}">
        <div class="exp-top">
          <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <div class="drag-handle" title="Drag to reorder">DRAG</div>
            <div style="min-width:0;">
              <div class="exp-title">${safe(group.company) || "Untitled company"}</div>
              <div class="exp-date">${safe(group.period)}</div>
            </div>
          </div>
          <div class="actions">
            <button class="btnAddMission" type="button">Add mission</button>
            <button class="btnDeleteGroup danger" type="button">Delete company</button>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label-row">
              <label>Company</label>
              <button class="btnFontMenu" type="button" data-font-key="exp_company_title">Fonts</button>
            </div>
            <input class="fCompany" value="${safe(group.company).replaceAll('"', '&quot;')}" />
          </div>
          <div class="field">
            <div class="field-label-row">
              <label>Company period</label>
              <button class="btnFontMenu" type="button" data-font-key="exp_company_period">Fonts</button>
            </div>
            <input class="fPeriod" value="${safe(group.period).replaceAll('"', '&quot;')}" />
          </div>
        </div>
        <div class="missions-list">${missionsHTML}</div>
      </div>
    `;
  }

  renderExperiences() {
    const list = this.qs("expList");
    if (!list) return;
    list.innerHTML = this.state.cv.experience.items.map((group, index) => this.expCardTemplate(group, index)).join("");

    list.querySelectorAll(".exp-card").forEach((card, groupIndex) => {
      const group = this.state.cv.experience.items[groupIndex];
      card.querySelector(".btnDeleteGroup")?.addEventListener("click", () => {
        this.state.cv.experience.items.splice(groupIndex, 1);
        this.renderExperiences();
        this.onDirty();
      });

      card.querySelector(".btnAddMission")?.addEventListener("click", () => {
        if (!Array.isArray(group.missions)) group.missions = [];
        group.missions.push({ title: "", date: "", desc: "", techs: "" });
        this.renderExperiences();
        this.onDirty();
      });

      card.querySelector(".fCompany")?.addEventListener("input", (event) => {
        group.company = event.target.value;
        this.onDirty();
      });
      card.querySelector(".fPeriod")?.addEventListener("input", (event) => {
        group.period = event.target.value;
        this.onDirty();
      });

      card.querySelectorAll(".btnFontMenu").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.renderFontMenu(button, button.dataset.fontKey);
        });
      });

      card.querySelectorAll(".mission-card").forEach((missionCard) => {
        const missionIndex = Number(missionCard.dataset.missionIndex);
        const mission = group.missions[missionIndex];
        if (!mission) return;

        missionCard.querySelector(".btnDeleteMission")?.addEventListener("click", () => {
          group.missions.splice(missionIndex, 1);
          this.renderExperiences();
          this.onDirty();
        });
        missionCard.querySelector(".fMissionTitle")?.addEventListener("input", (event) => {
          mission.title = event.target.value;
          this.onDirty();
        });
        missionCard.querySelector(".fMissionDate")?.addEventListener("input", (event) => {
          mission.date = event.target.value;
          this.onDirty();
        });
        missionCard.querySelector(".fMissionDesc")?.addEventListener("input", (event) => {
          mission.desc = event.target.value;
          this.onDirty();
        });
        missionCard.querySelector(".fMissionTechs")?.addEventListener("input", (event) => {
          mission.techs = event.target.value;
          this.onDirty();
        });
      });
    });
  }

  renderSidebarFontButtons() {
    const panel = document.getElementById("sidebarFontPanel");
    if (!panel) return;
    panel.querySelectorAll(".btnFontMenu").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this.renderFontMenu(button, button.dataset.fontKey);
      });
    });
  }

  closeFontMenu() {
    this.saveOpenFontMenuValues();

    const existing = document.querySelector(".font-popup");
    if (existing) {
      existing.remove();
    }
    if (this._fontMenuHandler) {
      document.removeEventListener("click", this._fontMenuHandler, true);
      this._fontMenuHandler = null;
    }
    this._openFontKey = null;
  }

  saveOpenFontMenuValues() {
    if (!this._openFontKey) return;
    const fontKey = this._openFontKey;
    const row = PDF_FONT_KEYS.find((item) => item.key === fontKey) || { line: false, cell: false, color: false };
    const base = PDF_FONT_DEFAULTS[fontKey] || {};
    const sizeEl = document.getElementById(`pdf_font_${fontKey}_size`);
    const styleEl = document.getElementById(`pdf_font_${fontKey}_style`);
    if (!sizeEl || !styleEl) return;

    let size = parseFloat(sizeEl.value);
    if (Number.isNaN(size) || size <= 0) size = base.size;

    const result = { ...this.state.cv.pdf_fonts[fontKey], size, style: styleEl.value || "" };

    if (row.line) {
      const lineEl = document.getElementById(`pdf_font_${fontKey}_line`);
      if (lineEl) {
        let line = parseFloat(lineEl.value);
        if (Number.isNaN(line) || line <= 0) line = base.line;
        result.line = line;
      }
    }

    if (row.cell) {
      const cellEl = document.getElementById(`pdf_font_${fontKey}_cell`);
      if (cellEl) {
        let cell_h = parseFloat(cellEl.value);
        if (Number.isNaN(cell_h) || cell_h <= 0) cell_h = base.cell_h;
        result.cell_h = cell_h;
      }
    }

    if (row.color) {
      const colorEl = document.getElementById(`pdf_font_${fontKey}_color`);
      if (colorEl) {
        result.color = colorEl.value || base.color;
      }
    }

    this.state.cv.pdf_fonts[fontKey] = result;
    this.onDirty();
  }

  renderFontMenu(button, fontKey) {
    this.closeFontMenu();
    if (!fontKey) return;
    this._openFontKey = fontKey;
    this.state.ensurePdfFonts();

    const row = PDF_FONT_KEYS.find((item) => item.key === fontKey) || { line: false, cell: false, color: false };
    const f = this.state.cv.pdf_fonts[fontKey];
    const rect = button.getBoundingClientRect();
    const popup = document.createElement("div");
    popup.className = "font-popup";

    const styleOpts = ["", "B", "I", "BI"].map((value) => {
      const label = value === "" ? "Normal" : value === "B" ? "Bold" : value === "I" ? "Italic" : "Bold italic";
      const selected = f.style === value ? " selected" : "";
      return `<option value="${value}"${selected}>${label}</option>`;
    }).join("");

    popup.innerHTML = `
      <div class="font-popup-header">
        <div>${fontKey.replace(/_/g, " ")}</div>
        <button class="btnCloseFontMenu" type="button" aria-label="Close">×</button>
      </div>
      <div class="font-popup-body">
        <div class="field">
          <label>Size (pt)</label>
          <input type="number" step="0.5" id="pdf_font_${fontKey}_size" value="${f.size}" />
        </div>
        <div class="field">
          <label>Style</label>
          <select id="pdf_font_${fontKey}_style">${styleOpts}</select>
        </div>
        ${row.line ? `<div class="field"><label>Line (mm)</label><input type="number" step="0.5" id="pdf_font_${fontKey}_line" value="${f.line}" /></div>` : ""}
        ${row.cell ? `<div class="field"><label>Row H (mm)</label><input type="number" step="0.5" id="pdf_font_${fontKey}_cell" value="${f.cell_h}" /></div>` : ""}
        ${row.color ? `<div class="field"><label>Color</label><input type="color" id="pdf_font_${fontKey}_color" value="${f.color || '#000000'}" /></div>` : ""}
      </div>
    `;

    document.body.appendChild(popup);

    const left = rect.right + 8 + popup.offsetWidth > window.innerWidth
      ? Math.max(rect.left - popup.offsetWidth - 8, 8)
      : rect.right + 8;
    let top = rect.top + window.scrollY;
    if (top + popup.offsetHeight > window.scrollY + window.innerHeight) {
      top = Math.max(window.scrollY + window.innerHeight - popup.offsetHeight - 10, 10);
    }
    popup.style.left = `${left + window.scrollX}px`;
    popup.style.top = `${top}px`;

    popup.querySelector(".btnCloseFontMenu")?.addEventListener("click", () => this.closeFontMenu());
    popup.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", () => {
        this.saveOpenFontMenuValues();
        this.onDirty();
      });
    });

    this._fontMenuHandler = (event) => {
      if (!popup.contains(event.target) && event.target !== button) {
        this.closeFontMenu();
      }
    };
    document.addEventListener("click", this._fontMenuHandler, true);
  }

  renderAll() {
    this.state.writeCvIntoMainFields(this.qs);
    this.renderMainOffsets();
    this.renderSidebarFontButtons();
    this.renderExperiences();
  }

  showVersionsModal(items, onLoadVersion) {
    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999;";

    const box = document.createElement("div");
    box.style = "background:#fff; color:#000; padding:18px; width:560px; max-height:80vh; overflow:auto; border-radius:6px;";
    const title = document.createElement("h3");
    title.innerText = "Saved CVs";
    box.appendChild(title);

    const list = document.createElement("div");
    if (!items || items.length === 0) {
      const empty = document.createElement("div");
      empty.innerText = "No saved CVs found.";
      box.appendChild(empty);
    } else {
      items.forEach((item) => {
        const row = document.createElement("div");
        row.style = "display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;";

        const meta = document.createElement("div");
        meta.innerHTML = `<div style=\"font-weight:600\">${item.name || '(untitled)'} <span style=\"font-weight:400;color:#666;margin-left:8px\">#${item.id}</span></div><div style=\"font-size:12px;color:#666\">${item.created_at}</div>`;

        const actionGroup = document.createElement("div");
        const loadButton = document.createElement("button");
        loadButton.innerText = "Open";
        loadButton.addEventListener("click", () => {
          document.body.removeChild(overlay);
          onLoadVersion(item.id);
        });
        actionGroup.appendChild(loadButton);

        row.appendChild(meta);
        row.appendChild(actionGroup);
        list.appendChild(row);
      });
      box.appendChild(list);
    }

    const footer = document.createElement("div");
    footer.style = "margin-top:12px; text-align:right;";
    const closeButton = document.createElement("button");
    closeButton.innerText = "Close";
    closeButton.addEventListener("click", () => document.body.removeChild(overlay));
    footer.appendChild(closeButton);
    box.appendChild(footer);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  refreshPdf() {
    const frame = this.qs("pdfFrame");
    if (frame) {
      frame.src = `/api/pdf?t=${Date.now()}`;
    }
  }
}
