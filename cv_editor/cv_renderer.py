from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fpdf import FPDF

# PDF typography: overridden by `data["pdf_fonts"][key]` from the editor UI.
# Keys: size (pt), style ("", "B", "I", "BI"), line (mm) for multi_cell / write height,
# cell_h (mm) for single-line cell() row height.
_FONT_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "sidebar_contact_title": {"size": 12, "style": "B", "cell_h": 10},
    "sidebar_contact_text": {"size": 9, "style": "", "line": 5},
    "sidebar_photo_label": {"size": 8, "style": "B", "cell_h": 5},
    "sidebar_block_title": {"size": 12, "style": "B", "cell_h": 10},
    "sidebar_cert_text": {"size": 8, "style": "", "cell_h": 5},
    "sidebar_skill_category": {"size": 8, "style": "B", "cell_h": 4},
    "sidebar_skill_items": {"size": 8, "style": "", "line": 4},
    "sidebar_lang_text": {"size": 9, "style": "", "cell_h": 5},
    "header_name": {"size": 28, "style": "B", "line": 10},
    "header_title": {"size": 16, "style": "", "line": 7},
    "summary_title": {"size": 11, "style": "B", "cell_h": 5},
    "summary_body": {"size": 9, "style": "", "line": 4},
    "exp_section_title": {"size": 11, "style": "B", "cell_h": 5},
    "exp_item_title": {"size": 10, "style": "B", "cell_h": 5},
    "exp_item_date": {"size": 8, "style": "I", "cell_h": 5},
    "exp_item_desc": {"size": 8, "style": "", "line": 4},
    "exp_tech_label": {"size": 8, "style": "B", "line": 5},
    "exp_tech_body": {"size": 8, "style": "", "line": 5},
    "edu_section_title": {"size": 11, "style": "B", "cell_h": 5},
    "edu_degree": {"size": 9, "style": "B", "cell_h": 5},
    "edu_school": {"size": 9, "style": "", "cell_h": 5},
}


class CV(FPDF):
    def __init__(self, data: Dict[str, Any]):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.data = data
        self.font_family = self._init_unicode_fonts()

    def _init_unicode_fonts(self) -> str:
        """
        Register a Unicode-capable font so we can render characters like ’.

        We try common Windows fonts first (Arial / Segoe UI), then DejaVu on Linux.
        Missing bold/italic files (e.g. fonts-dejavu-core only) reuse regular/bold so
        Unicode still works. If no TTF is found, we fall back to Helvetica (Latin-1 only).
        """

        def p(s: str) -> Path:
            return Path(s)

        candidates = [
            ("CVFont", p(r"C:\Windows\Fonts\arial.ttf"), p(r"C:\Windows\Fonts\arialbd.ttf"), p(r"C:\Windows\Fonts\ariali.ttf"), p(r"C:\Windows\Fonts\arialbi.ttf")),
            ("CVFont", p(r"C:\Windows\Fonts\segoeui.ttf"), p(r"C:\Windows\Fonts\segoeuib.ttf"), p(r"C:\Windows\Fonts\segoeuii.ttf"), p(r"C:\Windows\Fonts\segoeuiz.ttf")),
            # Linux / Docker (e.g. fonts-dejavu-core); avoids Helvetica + smart quotes / accents.
            (
                "CVFont",
                p("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                p("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
                p("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"),
                p("/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf"),
            ),
        ]

        for family, regular, bold, italic, bold_italic in candidates:
            if not regular.exists():
                continue
            # Debian's fonts-dejavu-core has no Oblique/BoldOblique; use fallbacks so we
            # still register a Unicode font instead of skipping to Helvetica.
            bold = bold if bold.exists() else regular
            italic = italic if italic.exists() else regular
            bold_italic = bold_italic if bold_italic.exists() else bold
            self.add_font(family, "", str(regular), uni=True)
            self.add_font(family, "B", str(bold), uni=True)
            self.add_font(family, "I", str(italic), uni=True)
            self.add_font(family, "BI", str(bold_italic), uni=True)
            return family

        # Worst-case fallback: keep Helvetica (core font)
        return "Helvetica"

    def _font(self, key: str) -> Dict[str, Any]:
        base = dict(_FONT_DEFAULTS[key])
        user = (self.data.get("pdf_fonts") or {}).get(key)
        if isinstance(user, dict):
            for k, v in user.items():
                if v is None or v == "":
                    continue
                if k in base or k in ("size", "style", "line", "cell_h"):
                    base[k] = v
        style = str(base.get("style", "") or "")
        if style not in ("", "B", "I", "BI"):
            style = ""
        base["style"] = style
        try:
            base["size"] = float(base["size"])
        except Exception:
            base["size"] = float(_FONT_DEFAULTS[key]["size"])
        if "line" in base and base["line"] is not None:
            try:
                base["line"] = float(base["line"])
            except Exception:
                dln = _FONT_DEFAULTS[key].get("line")
                base["line"] = float(dln) if dln is not None else base["size"] * 0.5
        if "cell_h" in base and base["cell_h"] is not None:
            try:
                base["cell_h"] = float(base["cell_h"])
            except Exception:
                dch = _FONT_DEFAULTS[key].get("cell_h")
                base["cell_h"] = float(dch) if dch is not None else base["size"] * 0.55
        return base

    def _normalize_experience_items(self, exp: Dict[str, Any]) -> List[Dict[str, Any]]:
        raw_items = exp.get("items", []) or []
        normalized = []
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            if isinstance(item.get("missions"), list):
                missions = []
                for mission in item.get("missions", []):
                    if not isinstance(mission, dict):
                        continue
                    missions.append({
                        "title": str(mission.get("title", "") or ""),
                        "date": str(mission.get("date", "") or ""),
                        "desc": str(mission.get("desc", "") or ""),
                        "techs": str(mission.get("techs", "") or ""),
                    })
                normalized.append({
                    "company": str(item.get("company", "") or ""),
                    "period": str(item.get("period", "") or ""),
                    "missions": missions,
                })
                continue
            normalized.append({
                "company": str(item.get("company", "") or ""),
                "period": str(item.get("period", item.get("date", "") or "") or ""),
                "missions": [
                    {
                        "title": str(item.get("title", "") or ""),
                        "date": str(item.get("date", "") or ""),
                        "desc": str(item.get("desc", "") or ""),
                        "techs": str(item.get("techs", "") or ""),
                    }
                ],
            })
        return normalized

    def _fit_header_text(self, text: str) -> str:
        # Normalize whitespace so multi_cell wraps predictably
        return " ".join(str(text or "").split())

    def _try_sidebar_logo(self, sidebar: Dict[str, Any]) -> None:
        """
        Optional: draw a logo at the bottom-left of the sidebar.

        Supported keys:
        - sidebar.logo_path (str)
        - sidebar.logo_w (mm, default 40)
        - sidebar.logo_h (mm, default 12)  # set to keep layout stable
        - sidebar.logo_x (mm, default 5)
        - sidebar.logo_bottom_margin (mm, default 8)
        """
        path = sidebar.get("logo_path") or self.data.get("logo_path")
        if not path:
            return

        try:
            w = float(sidebar.get("logo_w", 40))
            h = float(sidebar.get("logo_h", 12))
            x = float(sidebar.get("logo_x", 5))
            bottom_margin = float(sidebar.get("logo_bottom_margin", 8))
            y = 297 - bottom_margin - h  # A4 height is 297mm in our units
            self.image(str(path), x=x, y=y, w=w, h=h)
        except Exception:
            # Logo is optional; ignore missing/invalid files
            return

    def _render_sidebar_contact(self, sidebar: Dict[str, Any]) -> None:
        """
        Renders the CONTACT block.

        Backwards compatible:
        - sidebar.contact_lines: ["email", "phone", ...]

        Preferred:
        - sidebar.contact_items: [{ "text": "...", "icon_path": "C:/.../mail.png" }, ...]
        """
        self.set_text_color(255, 255, 255)
        self.set_xy(5, 70)
        fc = self._font("sidebar_contact_title")
        self.set_font(self.font_family, fc["style"], fc["size"])
        self.cell(60, fc["cell_h"], sidebar.get("contact_title", "CONTACT"), 0, 1, "L")

        items = sidebar.get("contact_items")
        if isinstance(items, list) and items:
            ft = self._font("sidebar_contact_text")
            self.set_font(self.font_family, ft["style"], ft["size"])
            line_h = ft["line"]
            icon = 4.0
            gap = 2.0
            max_w = 60.0
            text_w = max_w - (icon + gap)
            for raw in items:
                if not isinstance(raw, dict):
                    continue
                text = str(raw.get("text", "")).strip()
                if not text:
                    continue

                x = 5.0
                y = float(self.get_y())
                icon_path = raw.get("icon_path")
                if icon_path:
                    try:
                        self.image(str(icon_path), x=x, y=y + 0.5, w=icon, h=icon)
                    except Exception:
                        pass

                self.set_xy(x + icon + gap, y)
                self.multi_cell(text_w, line_h, text, 0, "L")
                self.ln(0.5)
        else:
            ft = self._font("sidebar_contact_text")
            self.set_font(self.font_family, ft["style"], ft["size"])
            contact_lines: List[str] = sidebar.get("contact_lines", [])
            self.multi_cell(60, ft["line"], "\n".join(contact_lines), 0, "L")

    def _try_profile_photo(self, path: Optional[str]) -> None:
        if not path:
            raise FileNotFoundError("No profile photo path provided")
        self.image(path, x=15, y=15, w=40)

    def add_sidebar(self) -> None:
        sidebar = self.data.get("sidebar", {})

        self.set_fill_color(41, 54, 82)
        self.rect(0, 0, 70, 297, "F")

        try:
            self._try_profile_photo(self.data.get("profile_photo_path"))
        except Exception:
            self.set_draw_color(255, 255, 255)
            if hasattr(self, "circle"):
                self.circle(35, 35, 20, "D")
            self.set_text_color(255, 255, 255)
            self.set_xy(15, 33)
            fp = self._font("sidebar_photo_label")
            self.set_font(self.font_family, fp["style"], fp["size"])
            self.cell(40, fp["cell_h"], "PHOTO", 0, 0, "C")

        self._render_sidebar_contact(sidebar)

        self.set_xy(5, self.get_y() + 6)
        fb = self._font("sidebar_block_title")
        self.set_font(self.font_family, fb["style"], fb["size"])
        self.cell(60, fb["cell_h"], sidebar.get("certifications_title", "CERTIFICATIONS"), 0, 1, "L")
        fcert = self._font("sidebar_cert_text")
        self.set_font(self.font_family, fcert["style"], fcert["size"])
        for cert in sidebar.get("certifications", []):
            self.cell(60, fcert["cell_h"], str(cert), 0, 1, "L")

        self.set_xy(5, self.get_y() + 6)
        self.set_font(self.font_family, fb["style"], fb["size"])
        self.cell(60, fb["cell_h"], sidebar.get("skills_title", "COMPÉTENCES"), 0, 1, "L")

        skills: List[Dict[str, str]] = sidebar.get("skills", [])
        fcat = self._font("sidebar_skill_category")
        fitems = self._font("sidebar_skill_items")
        for item in skills:
            category = str(item.get("category", ""))
            value = str(item.get("items", ""))
            self.set_font(self.font_family, fcat["style"], fcat["size"])
            self.set_text_color(173, 216, 230)
            self.cell(60, fcat["cell_h"], category, 0, 1, "L")
            self.set_font(self.font_family, fitems["style"], fitems["size"])
            self.set_text_color(255, 255, 255)
            self.multi_cell(60, fitems["line"], value, 0, "L")
            self.ln(1)

        self.set_xy(5, self.get_y() + 6)
        self.set_font(self.font_family, fb["style"], fb["size"])
        self.cell(60, fb["cell_h"], sidebar.get("languages_title", "LANGUES"), 0, 1, "L")
        fl = self._font("sidebar_lang_text")
        self.set_font(self.font_family, fl["style"], fl["size"])
        for lang in sidebar.get("languages", []):
            self.cell(60, fl["cell_h"], str(lang), 0, 1, "L")

        # Keep it last so it sits at the bottom regardless of content length.
        self._try_sidebar_logo(sidebar)

    def main_content(self) -> None:
        header = self.data.get("header", {})
        summary = self.data.get("summary", {})
        exp = self.data.get("experience", {})
        edu = self.data.get("education", {})
        offsets = self.data.get("main_offsets", {})

        self.set_text_color(41, 54, 82)

        x0 = 75
        y0 = 20
        w = 125  # keep a right margin so long headers wrap cleanly

        def off(key: str) -> float:
            try:
                return float(offsets.get(key, 0))
            except Exception:
                return 0.0

        def render_header_name(y: float) -> float:
            self.set_xy(x0, y)
            f = self._font("header_name")
            self.set_font(self.font_family, f["style"], f["size"])
            self.multi_cell(w, f["line"], self._fit_header_text(header.get("name", "")), 0, "L")
            return float(self.get_y())

        def render_header_title(y: float) -> float:
            self.set_xy(x0, y)
            f = self._font("header_title")
            self.set_font(self.font_family, f["style"], f["size"])
            self.multi_cell(w, f["line"], self._fit_header_text(header.get("title", "")), 0, "L")
            return float(self.get_y())

        def render_summary(y: float) -> float:
            self.set_xy(x0, y)
            ft = self._font("summary_title")
            self.set_font(self.font_family, ft["style"], ft["size"])
            self.cell(130, ft["cell_h"], str(summary.get("title", "RÉSUMÉ PROFESSIONNEL")), 0, 1, "L")
            self.set_draw_color(41, 54, 82)
            self.line(75, self.get_y(), 200, self.get_y())
            fb = self._font("summary_body")
            self.set_font(self.font_family, fb["style"], fb["size"])
            self.set_xy(75, self.get_y() + 2)
            self.multi_cell(125, fb["line"], str(summary.get("text", "")), 0, "L")
            return float(self.get_y())

        def render_experience(y: float) -> float:
            self.set_xy(75, y)
            fs = self._font("exp_section_title")
            self.set_font(self.font_family, fs["style"], fs["size"])
            self.cell(130, fs["cell_h"], str(exp.get("title", "EXPÉRIENCE PROFESSIONNELLE")), 0, 1, "L")
            self.line(75, self.get_y(), 200, self.get_y())

            y_offset = float(self.get_y() + 2)
            experiences = self._normalize_experience_items(exp)
            fit = self._font("exp_item_title")
            fid = self._font("exp_item_date")
            fde = self._font("exp_item_desc")
            ftl = self._font("exp_tech_label")
            ftb = self._font("exp_tech_body")
            for idx, group in enumerate(experiences):
                missions = [m for m in (group.get("missions") or []) if isinstance(m, dict)]
                if not missions:
                    continue

                company = str(group.get("company", "") or "").strip()
                period = str(group.get("period", "") or "").strip()
                show_group_header = bool(company or period or len(missions) > 1)

                if show_group_header:
                    self.set_xy(75, y_offset)
                    self.set_font(self.font_family, fit["style"], fit["size"])
                    self.cell(100, fit["cell_h"], company or "Experience", 0, 0, "L")
                    self.set_font(self.font_family, fid["style"], fid["size"])
                    self.cell(25, fid["cell_h"], period, 0, 1, "R")
                    y_offset = float(self.get_y() + 2)

                for mission_index, mission in enumerate(missions):
                    title = str(mission.get("title", "") or "").strip()
                    date = str(mission.get("date", "") or "").strip()
                    display_title = title or "Untitled mission"
                    if show_group_header:
                        display_title = f"• {display_title}"

                    self.set_xy(75, y_offset)
                    self.set_font(self.font_family, fit["style"], fit["size"])
                    self.cell(100, fit["cell_h"], display_title, 0, 0, "L")
                    self.set_font(self.font_family, fid["style"], fid["size"])
                    self.cell(25, fid["cell_h"], date, 0, 1, "R")

                    self.set_font(self.font_family, fde["style"], fde["size"])
                    self.set_x(75)
                    self.multi_cell(125, fde["line"], str(mission.get("desc", "")), 0, "L")

                    techs = str(mission.get("techs", "") or "").strip()
                    if techs:
                        self.set_x(75)
                        self.set_font(self.font_family, ftl["style"], ftl["size"])
                        self.set_text_color(41, 54, 82)
                        self.write(ftl["line"], "Technologies : ")
                        self.set_font(self.font_family, ftb["style"], ftb["size"])
                        self.write(ftb["line"], techs)
                        self.ln(4)
                    else:
                        self.ln(2)

                    if idx != len(experiences) - 1 or mission_index != len(missions) - 1:
                        sep_y = self.get_y() + 3
                        self.set_draw_color(220, 220, 220)
                        self.line(75, sep_y, 200, sep_y)
                        y_offset = sep_y + 2
                    else:
                        y_offset = self.get_y()
            return float(self.get_y())

        def render_education(y: float) -> None:
            edu_start_y = y + 5
            if edu_start_y > 260:
                self.add_page()
                self.add_sidebar()
                edu_start_y = 20

            self.set_xy(75, edu_start_y)
            fst = self._font("edu_section_title")
            self.set_font(self.font_family, fst["style"], fst["size"])
            self.cell(130, fst["cell_h"], str(edu.get("title", "FORMATION ACADÉMIQUE")), 0, 1, "L")
            self.set_draw_color(41, 54, 82)
            self.line(75, self.get_y(), 200, self.get_y())

            edu_y = self.get_y() + 2
            fd = self._font("edu_degree")
            fsch = self._font("edu_school")
            for item in edu.get("items", []):
                degree = str(item.get("degree", ""))
                school = str(item.get("school", ""))
                self.set_xy(75, edu_y)
                self.set_font(self.font_family, fd["style"], fd["size"])
                self.cell(125, fd["cell_h"], degree, 0, 1, "L")
                self.set_font(self.font_family, fsch["style"], fsch["size"])
                self.set_x(75)
                self.cell(125, fsch["cell_h"], school, 0, 1, "L")
                edu_y += fd["cell_h"] + fsch["cell_h"] + 2

        # Fixed order, adjustable vertical position via mm offsets.
        y = float(y0 + off("header_name"))
        y = render_header_name(y)

        y = float(y + off("header_title"))
        y = render_header_title(y)

        y = float(max(y + 6, 50) + off("summary"))
        y = render_summary(y)

        y = float(y + 6 + off("experience"))
        y = render_experience(y)

        render_education(y)



def render_pdf_bytes(data: Dict[str, Any]) -> bytes:
    pdf = CV(data)
    pdf.add_page()
    pdf.add_sidebar()
    pdf.main_content()
    out = pdf.output(dest="S")
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return out.encode("latin-1")

