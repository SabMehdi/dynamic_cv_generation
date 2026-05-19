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
            <label>Mission title</label>
            <input class="fMissionTitle" value="${safe(mission.title).replaceAll('"', '&quot;')}" />
          </div>
          <div class="field">
            <label>Date</label>
            <input class="fMissionDate" value="${safe(mission.date).replaceAll('"', '&quot;')}" />
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea class="fMissionDesc">${safe(mission.desc)}</textarea>
        </div>
        <div class="field">
          <label>Technologies</label>
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
            <label>Company</label>
            <input class="fCompany" value="${safe(group.company).replaceAll('"', '&quot;')}" />
          </div>
          <div class="field">
            <label>Company period</label>
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

  renderAll() {
    this.state.writeCvIntoMainFields(this.qs);
    this.renderMainOffsets();
    this.renderPdfFontsPanel();
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
