import { CvState, qs } from "./cv-editor-state.js";
import { CvApi } from "./cv-editor-api.js";
import { CvRenderer } from "./cv-editor-ui.js";

const state = new CvState();
const renderer = new CvRenderer(state, {
  qs,
  onDirty: () => {
    state.setDirty(true);
    renderer.setStatus(state.lastStatus);
  },
});

function markDirty() {
  state.setDirty(true);
  renderer.setStatus(state.lastStatus);
}

function getSafeCv() {
  if (!state.cv) {
    state.setCv({});
  }
  return state.cv;
}

async function loadCv() {
  renderer.setStatus("Loading…");
  const cv = await CvApi.getCurrentCv();
  state.setCv(cv);
  if (!state.cv.experience) state.cv.experience = { title: "EXPÉRIENCE PROFESSIONNELLE", items: [] };
  if (!state.cv.experience.items) state.cv.experience.items = [];
  state.normalizeExperienceGroups();
  if (!state.cv.header) state.cv.header = { name: "", title: "" };
  if (!state.cv.summary) state.cv.summary = { title: "RÉSUMÉ PROFESSIONNEL", text: "" };
  if (!state.cv.sidebar) state.cv.sidebar = {};
  renderer.renderAll();
  renderer.setStatus("Ready");
  state.setDirty(false);
}

async function saveDraft() {
  renderer.closeFontMenu();
  state.readMainFieldsIntoCv(qs);
  state.applyOrderFromDom(qs);
  renderer.setStatus("Saving draft…");

  try {
    await CvApi.saveDraft(state.cv);
    state.setDirty(false);
    renderer.setStatus("Draft saved");
    return true;
  } catch (error) {
    renderer.setStatus("Draft save failed");
    alert(`Draft save failed: ${error.message}`);
    return false;
  }
}

async function saveVersion() {
  renderer.closeFontMenu();
  state.readMainFieldsIntoCv(qs);
  state.applyOrderFromDom(qs);
  renderer.setStatus("Saving version…");

  const name = window.prompt("Version name (optional):", "");
  try {
    const body = await CvApi.saveVersion(state.cv, name);
    state.setDirty(false);
    renderer.setStatus(`Saved version #${body.version_id || "?"}`);
    return true;
  } catch (error) {
    renderer.setStatus("Version save failed");
    alert(`Version save failed: ${error.message}`);
    return false;
  }
}

async function loadCvById(id) {
  renderer.setStatus("Loading…");
  try {
    const cv = await CvApi.getCvById(id);
    state.setCv(cv);
    state.normalizeExperienceGroups();
    if (!state.cv.header) state.cv.header = { name: "", title: "" };
    if (!state.cv.summary) state.cv.summary = { title: "RÉSUMÉ PROFESSIONNEL", text: "" };
    if (!state.cv.sidebar) state.cv.sidebar = {};
    // Render UI immediately from the loaded version
    renderer.renderAll();
    renderer.setStatus("Ready");
    state.setDirty(false);

    // Persist the selected version as the current CV on the server so
    // the `/api/pdf` endpoint (which reads the server-side JSON) will
    // render the newly selected data. Do this before refreshing the PDF.
    try {
      renderer.setStatus("Applying selection to server…");
      await CvApi.saveDraft(state.cv);
    } catch (err) {
      // non-fatal: still attempt to refresh PDF, but notify user
      renderer.setStatus("Failed to apply selection to server");
      console.warn("Failed to save selected CV to server:", err);
    }

    renderer.refreshPdf();
  } catch (error) {
    renderer.setStatus("Load failed");
    alert(`Failed to load CV: ${error.message}`);
  }
}

function showVersionsModal(items) {
  renderer.showVersionsModal(items, loadCvById.bind(this));
}

function refreshPdf() {
  renderer.refreshPdf();
}

document.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
    markDirty();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (state.isDirty) {
    event.preventDefault();
    event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
  }
});

qs("btnReload").addEventListener("click", async () => {
  if (state.isDirty && !window.confirm("You have unsaved changes. Reloading will discard them. Continue?")) return;
  await loadCv();
  refreshPdf();
});
qs("btnSaveDraft").addEventListener("click", saveDraft);
qs("btnSaveVersion").addEventListener("click", saveVersion);
qs("btnOpen").addEventListener("click", async () => {
  if (state.isDirty && !window.confirm("You have unsaved changes. Opening a saved version will discard them. Continue?")) return;
  renderer.setStatus("Loading versions…");
  try {
    const items = await CvApi.getVersions();
    renderer.setStatus("Ready");
    showVersionsModal(items);
  } catch (error) {
    renderer.setStatus("Failed");
    alert(`Failed to fetch versions: ${error.message}`);
  }
});
qs("btnExport").addEventListener("click", async () => {
  renderer.closeFontMenu();
  const saved = await saveDraft();
  if (saved) refreshPdf();
});
qs("btnAddExp").addEventListener("click", () => {
  const cv = getSafeCv();
  if (!cv.experience) cv.experience = { title: "EXPÉRIENCE PROFESSIONNELLE", items: [] };
  if (!Array.isArray(cv.experience.items)) cv.experience.items = [];
  cv.experience.items.unshift({
    company: "",
    period: "",
    missions: [{ title: "", date: "", desc: "", techs: "" }],
  });
  renderer.renderExperiences();
  markDirty();
});

new Sortable(qs("expList"), {
  animation: 150,
  handle: ".drag-handle",
  onEnd: () => {
    state.applyOrderFromDom(qs);
    renderer.renderExperiences();
    markDirty();
  },
});

loadCv();
