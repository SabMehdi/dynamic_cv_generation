export class CvApi {
  static async fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText || `Request failed: ${response.status}`);
    }
    return response.json();
  }

  static getCurrentCv() {
    return this.fetchJson("/api/cv");
  }

  static getCvById(id) {
    return this.fetchJson(`/api/cv/${id}`);
  }

  static getVersions() {
    return this.fetchJson("/api/cv/list");
  }

  static saveDraft(data) {
    return this.fetchJson("/api/cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  }

  static saveVersion(data, name) {
    const payload = { data };
    if (name && name.trim()) payload.name = name.trim();
    return this.fetchJson("/api/cv/version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}
