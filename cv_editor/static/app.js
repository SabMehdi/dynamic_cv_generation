// app.js
let cv = null;
let isDirty = false;
let lastStatus = "Idle";

const elStatus = document.getElementById("status");
const dirtySuffix = () => (isDirty ? " • Unsaved changes" : "");
const setStatus = (text) => {
  lastStatus = text;
  elStatus.innerHTML = `Status: <strong>${text}</strong>${dirtySuffix()}`;
};
const setDirty = (value) => {
  isDirty = value;
  setStatus(lastStatus);
};

const qs = (id) => document.getElementById(id);

const SECTION_LABELS = {
  header_name: "Header name",
  header_title: "Header title",
  summary: "Summary",
  experience: "Experience",
};

const SECTION_KEYS = ["header_name", "header_title", "summary", "experience"];

const PDF_FONT_DEFAULTS = {
  sidebar_contact_title: { size: 12, style: "B", cell_h: 10 },
  sidebar_contact_text: { size: 9, style: "", line: 5 },
  sidebar_photo_label: { size: 8, style: "B", cell_h: 5 },
  sidebar_block_title: { size: 12, style: "B", cell_h: 10 },
  sidebar_cert_text: { size: 8, style: "", cell_h: 5 },
  sidebar_skill_category: { size: 8, style: "B", cell_h: 4 },
  sidebar_skill_items: { size: 8, style: "", line: 4 },
  sidebar_lang_text: { size: 9, style: "", cell_h: 5 },
  header_name: { size: 28, style: "B", line: 10 },
  header_title: { size: 16, style: "", line: 7 },
  summary_title: { size: 11, style: "B", cell_h: 5 },
  summary_body: { size: 9, style: "", line: 4 },
  exp_section_title: { size: 11, style: "B", cell_h: 5 },
  exp_item_title: { size: 10, style: "B", cell_h: 5 },
  exp_item_date: { size: 8, style: "I", cell_h: 5 },
  exp_item_desc: { size: 8, style: "", line: 4 },
  exp_tech_label: { size: 8, style: "B", line: 5 },
  exp_tech_body: { size: 8, style: "", line: 5 },
  edu_section_title: { size: 11, style: "B", cell_h: 5 },
  edu_degree: { size: 9, style: "B", cell_h: 5 },
  edu_school: { size: 9, style: "", cell_h: 5 },
};

const PDF_FONT_KEYS = [
  { group: "Sidebar", key: "sidebar_contact_title", label: "Contact block title", line: false, cell: true },
  { group: "Sidebar", key: "sidebar_contact_text", label: "Contact lines", line: true, cell: false },
  { group: "Sidebar", key: "sidebar_photo_label", label: "Photo placeholder", line: false, cell: true },
  { group: "Sidebar", key: "sidebar_block_title", label: "Section titles (cert / skills / languages)", line: false, cell: true },
  { group: "Sidebar", key: "sidebar_cert_text", label: "Certification lines", line: false, cell: true },
  { group: "Sidebar", key: "sidebar_skill_category", label: "Skill category", line: false, cell: true },
  { group: "Sidebar", key: "sidebar_skill_items", label: "Skill items (wrapped)", line: true, cell: false },
  { group: "Sidebar", key: "sidebar_lang_text", label: "Language lines", line: false, cell: true },
  { group: "Header & summary", key: "header_name", label: "Name", line: true, cell: false },
  { group: "Header & summary", key: "header_title", label: "Subtitle / title", line: true, cell: false },
  { group: "Header & summary", key: "summary_title", label: "Summary section title", line: false, cell: true },
  { group: "Header & summary", key: "summary_body", label: "Summary body", line: true, cell: false },
  { group: "Experience", key: "exp_section_title", label: "Experience section title", line: false, cell: true },
  { group: "Experience", key: "exp_item_title", label: "Job title line", line: false, cell: true },
  { group: "Experience", key: "exp_item_date", label: "Date (right)", line: false, cell: true },
  { group: "Experience", key: "exp_item_desc", label: "Description", line: true, cell: false },
  { group: "Experience", key: "exp_tech_label", label: "Technologies : label", line: true, cell: false },
  { group: "Experience", key: "exp_tech_body", label: "Technologies text", line: true, cell: false },
  { group: "Education", key: "edu_section_title", label: "Education section title", line: false, cell: true },
  { group: "Education", key: "edu_degree", label: "Degree line", line: false, cell: true },
  { group: "Education", key: "edu_school", label: "School line", line: false, cell: true },
];

function ensurePdfFonts() {
  if (!cv.pdf_fonts || typeof cv.pdf_fonts !== "object") cv.pdf_fonts = {};
  for (const [key, def] of Object.entries(PDF_FONT_DEFAULTS)) {
    cv.pdf_fonts[key] = { ...def, ...(cv.pdf_fonts[key] || {}) };
  }
}

function renderPdfFontsPanel() {
  ensurePdfFonts();
  const root = qs("pdfFontsPanel");
  let lastGroup = "";
  const rows = PDF_FONT_KEYS.map((row) => {
    const f = cv.pdf_fonts[row.key];
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
    const styleOpts = ["", "B", "I", "BI"].map((v) => {
      const lab = v === "" ? "Normal" : v === "B" ? "Bold" : v === "I" ? "Italic" : "Bold italic";
      const sel = f.style === v ? " selected" : "";
      return `<option value="${v}"${sel}>${lab}</option>`;
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

function readPdfFontsIntoCv() {
  ensurePdfFonts();
  for (const row of PDF_FONT_KEYS) {
    const key = row.key;
    const base = PDF_FONT_DEFAULTS[key];
    const szEl = qs(`pdf_font_${key}_size`);
    const stEl = qs(`pdf_font_${key}_style`);
    if (!szEl || !stEl) continue;
    let size = parseFloat(szEl.value);
    if (Number.isNaN(size) || size <= 0) size = base.size;
    const o = { ...cv.pdf_fonts[key], size, style: stEl.value || "" };
    if (row.line) {
      const ln = qs(`pdf_font_${key}_line`);
      if (ln) {
        let line = parseFloat(ln.value);
        if (Number.isNaN(line) || line <= 0) line = base.line;
        o.line = line;
      }
    }
    if (row.cell) {
      const ch = qs(`pdf_font_${key}_cell`);
      if (ch) {
        let cell_h = parseFloat(ch.value);
        if (Number.isNaN(cell_h) || cell_h <= 0) cell_h = base.cell_h;
        o.cell_h = cell_h;
      }
    }
    cv.pdf_fonts[key] = o;
  }
}

function ensureMainOffsets() {
  if (!cv.main_offsets || typeof cv.main_offsets !== "object") cv.main_offsets = {};
  SECTION_KEYS.forEach((k) => {
    if (cv.main_offsets[k] == null || Number.isNaN(Number(cv.main_offsets[k]))) cv.main_offsets[k] = 0;
    cv.main_offsets[k] = Number(cv.main_offsets[k]);
  });
}

function renderMainOffsets() {
  ensureMainOffsets();
  const root = qs("mainOffsetsList");
  root.innerHTML = SECTION_KEYS.map((key) => {
    const label = SECTION_LABELS[key] || key;
    const val = Number(cv.main_offsets[key] || 0);
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
    row.querySelector(".btnUp").addEventListener("click", () => {
      cv.main_offsets[key] = Number(cv.main_offsets[key] || 0) - 2;
      renderMainOffsets();
      setDirty(true);
    });
    row.querySelector(".btnDown").addEventListener("click", () => {
      cv.main_offsets[key] = Number(cv.main_offsets[key] || 0) + 2;
      renderMainOffsets();
      setDirty(true);
    });
  });
}

function normalizeExperienceGroups() {
  if (!cv.experience || typeof cv.experience !== "object") {
    cv.experience = { title: "EXPÉRIENCE PROFESSIONNELLE", items: [] };
  }
  if (!Array.isArray(cv.experience.items)) cv.experience.items = [];

  cv.experience.items = cv.experience.items.map((item) => {
    if (!item || typeof item !== "object") {
      return { company: "", period: "", missions: [{ title: "", date: "", desc: "", techs: "" }] };
    }
    if (Array.isArray(item.missions)) {
      return {
        company: item.company || "",
        period: item.period || "",
        missions: item.missions.map((mission) => ({
          title: mission?.title || "",
          date: mission?.date || "",
          desc: mission?.desc || "",
          techs: mission?.techs || "",
        })),
      };
    }
    return {
      company: item.company || "",
      period: item.period || item.date || "",
      missions: [
        {
          title: item.title || "",
          date: item.date || "",
          desc: item.desc || "",
          techs: item.techs || "",
        },
      ],
    };
  });
}

function readMainFieldsIntoCv() {
  cv.profile_photo_path = qs("profile_photo_path").value.trim();
  cv.header.name = qs("header_name").value;
  cv.header.title = qs("header_title").value;
  cv.summary.text = qs("summary_text").value;

  if (!cv.sidebar) cv.sidebar = {};
  cv.sidebar.logo_path = qs("sidebar_logo_path").value.trim();

  const w = qs("sidebar_logo_w").value.trim();
  const h = qs("sidebar_logo_h").value.trim();
  cv.sidebar.logo_w = w ? Number(w) : undefined;
  cv.sidebar.logo_h = h ? Number(h) : undefined;

  readPdfFontsIntoCv();
}

function writeCvIntoMainFields() {
  qs("profile_photo_path").value = cv.profile_photo_path || "";
  qs("header_name").value = (cv.header && cv.header.name) || "";
  qs("header_title").value = (cv.header && cv.header.title) || "";
  qs("summary_text").value = (cv.summary && cv.summary.text) || "";

  qs("sidebar_logo_path").value = (cv.sidebar && cv.sidebar.logo_path) || "";
  qs("sidebar_logo_w").value = (cv.sidebar && cv.sidebar.logo_w != null) ? String(cv.sidebar.logo_w) : "";
  qs("sidebar_logo_h").value = (cv.sidebar && cv.sidebar.logo_h != null) ? String(cv.sidebar.logo_h) : "";
}

function missionCardTemplate(mission, groupIndex, missionIndex) {
  const safe = (v) => (v == null ? "" : String(v));
  return `
    <div class="mission-card" data-group-index="${groupIndex}" data-mission-index="${missionIndex}">
      <div class="mission-top">
        <div class="exp-title">${safe(mission.title) || "Untitled mission"}</div>
        <button class="btnDeleteMission danger" type="button">Delete mission</button>
      </div>
      <div class="row">
        <div class="field">
          <label>Mission title</label>
          <input class="fMissionTitle" value="${safe(mission.title).replaceAll('"','&quot;')}" />
        </div>
        <div class="field">
          <label>Date</label>
          <input class="fMissionDate" value="${safe(mission.date).replaceAll('"','&quot;')}" />
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

function expCardTemplate(group, idx) {
  const safe = (v) => (v == null ? "" : String(v));
  const missions = Array.isArray(group.missions) ? group.missions : [];
  const missionsHTML = missions.length
    ? missions.map((mission, missionIndex) => missionCardTemplate(mission, idx, missionIndex)).join("")
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
          <input class="fCompany" value="${safe(group.company).replaceAll('"','&quot;')}" />
        </div>
        <div class="field">
          <label>Company period</label>
          <input class="fPeriod" value="${safe(group.period).replaceAll('"','&quot;')}" />
        </div>
      </div>
      <div class="missions-list">${missionsHTML}</div>
    </div>
  `;
}

function renderExperiences() {
  const list = qs("expList");
  list.innerHTML = cv.experience.items.map(expCardTemplate).join("");

  list.querySelectorAll(".exp-card").forEach((card, groupIndex) => {
    const group = cv.experience.items[groupIndex];
    const delGroup = card.querySelector(".btnDeleteGroup");
    delGroup.addEventListener("click", () => {
      cv.experience.items.splice(groupIndex, 1);
      renderExperiences();
      setDirty(true);
    });

    const addMission = card.querySelector(".btnAddMission");
    addMission.addEventListener("click", () => {
      if (!Array.isArray(group.missions)) group.missions = [];
      group.missions.push({ title: "", date: "", desc: "", techs: "" });
      renderExperiences();
      setDirty(true);
    });

    card.querySelector(".fCompany").addEventListener("input", (e) => {
      group.company = e.target.value;
      setDirty(true);
    });
    card.querySelector(".fPeriod").addEventListener("input", (e) => {
      group.period = e.target.value;
      setDirty(true);
    });

    card.querySelectorAll(".mission-card").forEach((missionCard) => {
      const missionIndex = Number(missionCard.dataset.missionIndex);
      const mission = group.missions[missionIndex];
      if (!mission) return;

      missionCard.querySelector(".btnDeleteMission").addEventListener("click", () => {
        group.missions.splice(missionIndex, 1);
        renderExperiences();
        setDirty(true);
      });

      missionCard.querySelector(".fMissionTitle").addEventListener("input", (e) => {
        mission.title = e.target.value;
        setDirty(true);
      });
      missionCard.querySelector(".fMissionDate").addEventListener("input", (e) => {
        mission.date = e.target.value;
        setDirty(true);
      });
      missionCard.querySelector(".fMissionDesc").addEventListener("input", (e) => {
        mission.desc = e.target.value;
        setDirty(true);
      });
      missionCard.querySelector(".fMissionTechs").addEventListener("input", (e) => {
        mission.techs = e.target.value;
        setDirty(true);
      });
    });
  });
}

function applyOrderFromDom() {
  const cards = Array.from(qs("expList").querySelectorAll(".exp-card"));
  const newItems = cards.map((c) => cv.experience.items[Number(c.dataset.index)]);
  cv.experience.items = newItems;
}

async function loadCv() {
  setStatus("Loading…");
  const res = await fetch("/api/cv");
  cv = await res.json();
  if (!cv.experience) cv.experience = { title: "EXPÉRIENCE PROFESSIONNELLE", items: [] };
  if (!cv.experience.items) cv.experience.items = [];
  normalizeExperienceGroups();
  if (!cv.header) cv.header = { name: "", title: "" };
  if (!cv.summary) cv.summary = { title: "RÉSUMÉ PROFESSIONNEL", text: "" };
  if (!cv.sidebar) cv.sidebar = {};
  writeCvIntoMainFields();
  renderMainOffsets();
  renderPdfFontsPanel();
  renderExperiences();
  setStatus("Ready");
  setDirty(false);
}

async function saveDraft() {
  readMainFieldsIntoCv();
  applyOrderFromDom();
  setStatus("Saving draft…");

  const payload = { data: cv };
  const res = await fetch("/api/cv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    setStatus("Draft save failed");
    alert("Draft save failed: " + t);
    return false;
  }

  setDirty(false);
  setStatus("Draft saved");
  return true;
}

async function saveVersion() {
  readMainFieldsIntoCv();
  applyOrderFromDom();
  setStatus("Saving version…");

  const name = window.prompt("Version name (optional):", "");
  const payload = { data: cv };
  if (name && name.trim()) payload.name = name.trim();

  const res = await fetch("/api/cv/version", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    setStatus("Version save failed");
    alert("Version save failed: " + t);
    return false;
  }

  const body = await res.json();
  setDirty(false);
  setStatus(`Saved version #${body.version_id || "?"}`);
  return true;
}

async function saveCv() {
  return saveDraft();
}

async function loadCvById(id) {
  setStatus("Loading…");
  const res = await fetch(`/api/cv/${id}`);
  if (!res.ok) {
    setStatus("Load failed");
    alert("Failed to load CV: " + res.statusText);
    return;
  }
  cv = await res.json();
  normalizeExperienceGroups();
  if (!cv.header) cv.header = { name: "", title: "" };
  if (!cv.summary) cv.summary = { title: "RÉSUMÉ PROFESSIONNEL", text: "" };
  if (!cv.sidebar) cv.sidebar = {};
  writeCvIntoMainFields();
  renderMainOffsets();
  renderPdfFontsPanel();
  renderExperiences();
  setStatus("Ready");
  setDirty(false);
  refreshPdf();
}

function showVersionsModal(items) {
  const overlay = document.createElement("div");
  overlay.style = `position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999;`;
  const box = document.createElement("div");
  box.style = `background:#fff; color:#000; padding:18px; width:560px; max-height:80vh; overflow:auto; border-radius:6px;`;
  const title = document.createElement("h3");
  title.innerText = "Saved CVs";
  box.appendChild(title);
  const list = document.createElement("div");
  if (!items || items.length === 0) {
    const p = document.createElement("div");
    p.innerText = "No saved CVs found.";
    box.appendChild(p);
  } else {
    items.forEach((it) => {
      const row = document.createElement("div");
      row.style = "display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;";
      const meta = document.createElement("div");
      meta.innerHTML = `<div style=\"font-weight:600\">${it.name || '(untitled)'} <span style=\"font-weight:400;color:#666;margin-left:8px\">#${it.id}</span></div><div style=\"font-size:12px;color:#666\">${it.created_at}</div>`;
      const actions = document.createElement("div");
      const loadBtn = document.createElement("button");
      loadBtn.innerText = "Open";
      loadBtn.addEventListener("click", () => {
        document.body.removeChild(overlay);
        loadCvById(it.id);
      });
      actions.appendChild(loadBtn);
      row.appendChild(meta);
      row.appendChild(actions);
      list.appendChild(row);
    });
    box.appendChild(list);
  }
  const close = document.createElement("div");
  close.style = "margin-top:12px; text-align:right;";
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "Close";
  closeBtn.addEventListener("click", () => document.body.removeChild(overlay));
  close.appendChild(closeBtn);
  box.appendChild(close);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function refreshPdf() {
  const frame = qs("pdfFrame");
  frame.src = "/api/pdf?t=" + Date.now();
}

document.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
    setDirty(true);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (isDirty) {
    event.preventDefault();
    event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
  }
});

qs("btnReload").addEventListener("click", async () => {
  if (isDirty && !window.confirm("You have unsaved changes. Reloading will discard them. Continue?")) return;
  await loadCv();
  refreshPdf();
});
qs("btnSaveDraft").addEventListener("click", saveDraft);
qs("btnSaveVersion").addEventListener("click", saveVersion);
qs("btnOpen").addEventListener("click", async () => {
  if (isDirty && !window.confirm("You have unsaved changes. Opening a saved version will discard them. Continue?")) return;
  setStatus("Loading versions…");
  const res = await fetch('/api/cv/list');
  if (!res.ok) { setStatus('Failed'); alert('Failed to fetch versions'); return; }
  const items = await res.json();
  setStatus('Ready');
  showVersionsModal(items);
});
qs("btnExport").addEventListener("click", async () => {
  const saved = await saveDraft();
  if (saved) refreshPdf();
});
qs("btnAddExp").addEventListener("click", () => {
  cv.experience.items.unshift({
    company: "",
    period: "",
    missions: [{ title: "", date: "", desc: "", techs: "" }],
  });
  renderExperiences();
  setDirty(true);
});

new Sortable(qs("expList"), {
  animation: 150,
  handle: ".drag-handle",
  onEnd: () => {
    applyOrderFromDom();
    renderExperiences();
    setDirty(true);
  },
});

loadCv();