export const SECTION_LABELS = {
  header_name: "Header name",
  header_title: "Header title",
  summary: "Summary",
  experience: "Experience",
};

export const SECTION_KEYS = ["header_name", "header_title", "summary", "experience"];

export const PDF_FONT_DEFAULTS = {
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

export const PDF_FONT_KEYS = [
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

export const qs = (id) => document.getElementById(id);

export class CvState {
  constructor() {
    this.cv = null;
    this.isDirty = false;
    this.lastStatus = "Idle";
  }

  setCv(cv) {
    this.cv = cv || {};
  }

  setDirty(value) {
    this.isDirty = value;
  }

  setStatus(text) {
    this.lastStatus = text;
  }

  getStatusText() {
    return `${this.lastStatus}${this.isDirty ? " • Unsaved changes" : ""}`;
  }

  ensurePdfFonts() {
    if (!this.cv.pdf_fonts || typeof this.cv.pdf_fonts !== "object") this.cv.pdf_fonts = {};
    for (const [key, def] of Object.entries(PDF_FONT_DEFAULTS)) {
      this.cv.pdf_fonts[key] = { ...def, ...(this.cv.pdf_fonts[key] || {}) };
    }
  }

  ensureMainOffsets() {
    if (!this.cv.main_offsets || typeof this.cv.main_offsets !== "object") this.cv.main_offsets = {};
    SECTION_KEYS.forEach((key) => {
      if (this.cv.main_offsets[key] == null || Number.isNaN(Number(this.cv.main_offsets[key]))) {
        this.cv.main_offsets[key] = 0;
      }
      this.cv.main_offsets[key] = Number(this.cv.main_offsets[key]);
    });
  }

  normalizeExperienceGroups() {
    if (!this.cv.experience || typeof this.cv.experience !== "object") {
      this.cv.experience = { title: "EXPÉRIENCE PROFESSIONNELLE", items: [] };
    }
    if (!Array.isArray(this.cv.experience.items)) this.cv.experience.items = [];

    this.cv.experience.items = this.cv.experience.items.map((item) => {
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

  readPdfFontsIntoCv(qsFn) {
    this.ensurePdfFonts();
    for (const row of PDF_FONT_KEYS) {
      const key = row.key;
      const base = PDF_FONT_DEFAULTS[key];
      const sizeEl = qsFn(`pdf_font_${key}_size`);
      const styleEl = qsFn(`pdf_font_${key}_style`);
      if (!sizeEl || !styleEl) continue;

      let size = parseFloat(sizeEl.value);
      if (Number.isNaN(size) || size <= 0) size = base.size;

      const result = { ...this.cv.pdf_fonts[key], size, style: styleEl.value || "" };

      if (row.line) {
        const lineEl = qsFn(`pdf_font_${key}_line`);
        if (lineEl) {
          let line = parseFloat(lineEl.value);
          if (Number.isNaN(line) || line <= 0) line = base.line;
          result.line = line;
        }
      }

      if (row.cell) {
        const cellEl = qsFn(`pdf_font_${key}_cell`);
        if (cellEl) {
          let cell_h = parseFloat(cellEl.value);
          if (Number.isNaN(cell_h) || cell_h <= 0) cell_h = base.cell_h;
          result.cell_h = cell_h;
        }
      }

      this.cv.pdf_fonts[key] = result;
    }
  }

  readMainFieldsIntoCv(qsFn) {
    if (!this.cv) this.cv = {};
    this.cv.profile_photo_path = qsFn("profile_photo_path").value.trim();
    this.cv.header = this.cv.header || { name: "", title: "" };
    this.cv.header.name = qsFn("header_name").value;
    this.cv.header.title = qsFn("header_title").value;
    this.cv.summary = this.cv.summary || { title: "RÉSUMÉ PROFESSIONNEL", text: "" };
    this.cv.summary.text = qsFn("summary_text").value;

    this.cv.sidebar = this.cv.sidebar || {};
    this.cv.sidebar.logo_path = qsFn("sidebar_logo_path").value.trim();

    const w = qsFn("sidebar_logo_w").value.trim();
    const h = qsFn("sidebar_logo_h").value.trim();
    this.cv.sidebar.logo_w = w ? Number(w) : undefined;
    this.cv.sidebar.logo_h = h ? Number(h) : undefined;

    this.readPdfFontsIntoCv(qsFn);
  }

  writeCvIntoMainFields(qsFn) {
    qsFn("profile_photo_path").value = this.cv.profile_photo_path || "";
    qsFn("header_name").value = (this.cv.header && this.cv.header.name) || "";
    qsFn("header_title").value = (this.cv.header && this.cv.header.title) || "";
    qsFn("summary_text").value = (this.cv.summary && this.cv.summary.text) || "";

    qsFn("sidebar_logo_path").value = (this.cv.sidebar && this.cv.sidebar.logo_path) || "";
    qsFn("sidebar_logo_w").value = (this.cv.sidebar && this.cv.sidebar.logo_w != null) ? String(this.cv.sidebar.logo_w) : "";
    qsFn("sidebar_logo_h").value = (this.cv.sidebar && this.cv.sidebar.logo_h != null) ? String(this.cv.sidebar.logo_h) : "";
  }

  applyOrderFromDom(qsFn) {
    const cards = Array.from(qsFn("expList").querySelectorAll(".exp-card"));
    this.cv.experience.items = cards.map((card) => this.cv.experience.items[Number(card.dataset.index)]);
  }
}
