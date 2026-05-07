from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fpdf import FPDF


class CV(FPDF):
    def __init__(self, data: Dict[str, Any]):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.data = data
        self.font_family = self._init_unicode_fonts()

    def _init_unicode_fonts(self) -> str:
        """
        Register a Unicode-capable font so we can render characters like ’.

        We try common Windows fonts first (Arial / Segoe UI). If none found,
        we fall back to core fonts (may still error on some characters).
        """

        def p(s: str) -> Path:
            return Path(s)

        candidates = [
            ("CVFont", p(r"C:\Windows\Fonts\arial.ttf"), p(r"C:\Windows\Fonts\arialbd.ttf"), p(r"C:\Windows\Fonts\ariali.ttf"), p(r"C:\Windows\Fonts\arialbi.ttf")),
            ("CVFont", p(r"C:\Windows\Fonts\segoeui.ttf"), p(r"C:\Windows\Fonts\segoeuib.ttf"), p(r"C:\Windows\Fonts\segoeuii.ttf"), p(r"C:\Windows\Fonts\segoeuiz.ttf")),
        ]

        for family, regular, bold, italic, bold_italic in candidates:
            if regular.exists() and bold.exists() and italic.exists() and bold_italic.exists():
                self.add_font(family, "", str(regular), uni=True)
                self.add_font(family, "B", str(bold), uni=True)
                self.add_font(family, "I", str(italic), uni=True)
                self.add_font(family, "BI", str(bold_italic), uni=True)
                return family

        # Worst-case fallback: keep Helvetica (core font)
        return "Helvetica"

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
        self.set_font(self.font_family, "B", 12)
        self.cell(60, 10, sidebar.get("contact_title", "CONTACT"), 0, 1, "L")

        items = sidebar.get("contact_items")
        if isinstance(items, list) and items:
            self.set_font(self.font_family, "", 9)
            line_h = 5.0
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
            self.set_font(self.font_family, "", 9)
            contact_lines: List[str] = sidebar.get("contact_lines", [])
            self.multi_cell(60, 5, "\n".join(contact_lines), 0, "L")

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
            self.set_font(self.font_family, "B", 8)
            self.cell(40, 5, "PHOTO", 0, 0, "C")

        self._render_sidebar_contact(sidebar)

        self.set_xy(5, self.get_y() + 6)
        self.set_font(self.font_family, "B", 12)
        self.cell(60, 10, sidebar.get("certifications_title", "CERTIFICATIONS"), 0, 1, "L")
        self.set_font(self.font_family, "", 8)
        for cert in sidebar.get("certifications", []):
            self.cell(60, 5, str(cert), 0, 1, "L")

        self.set_xy(5, self.get_y() + 6)
        self.set_font(self.font_family, "B", 12)
        self.cell(60, 10, sidebar.get("skills_title", "COMPÉTENCES"), 0, 1, "L")

        skills: List[Dict[str, str]] = sidebar.get("skills", [])
        for item in skills:
            category = str(item.get("category", ""))
            value = str(item.get("items", ""))
            self.set_font(self.font_family, "B", 8)
            self.set_text_color(173, 216, 230)
            self.cell(60, 4, category, 0, 1, "L")
            self.set_font(self.font_family, "", 8)
            self.set_text_color(255, 255, 255)
            self.multi_cell(60, 4, value, 0, "L")
            self.ln(1)

        self.set_xy(5, self.get_y() + 6)
        self.set_font(self.font_family, "B", 12)
        self.cell(60, 10, sidebar.get("languages_title", "LANGUES"), 0, 1, "L")
        self.set_font(self.font_family, "", 9)
        for lang in sidebar.get("languages", []):
            self.cell(60, 5, str(lang), 0, 1, "L")

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
            self.set_font(self.font_family, "B", 28)
            self.multi_cell(w, 10, self._fit_header_text(header.get("name", "")), 0, "L")
            return float(self.get_y())

        def render_header_title(y: float) -> float:
            self.set_xy(x0, y)
            self.set_font(self.font_family, "", 16)
            self.multi_cell(w, 7, self._fit_header_text(header.get("title", "")), 0, "L")
            return float(self.get_y())

        def render_summary(y: float) -> float:
            self.set_xy(x0, y)
            self.set_font(self.font_family, "B", 11)
            self.cell(130, 5, str(summary.get("title", "RÉSUMÉ PROFESSIONNEL")), 0, 1, "L")
            self.set_draw_color(41, 54, 82)
            self.line(75, self.get_y(), 200, self.get_y())
            self.set_font(self.font_family, "", 9)
            self.set_xy(75, self.get_y() + 2)
            self.multi_cell(125, 4, str(summary.get("text", "")), 0, "L")
            return float(self.get_y())

        def render_experience(y: float) -> float:
            self.set_xy(75, y)
            self.set_font(self.font_family, "B", 11)
            self.cell(130, 5, str(exp.get("title", "EXPÉRIENCE PROFESSIONNELLE")), 0, 1, "L")
            self.line(75, self.get_y(), 200, self.get_y())

            y_offset = float(self.get_y() + 2)
            experiences: List[Dict[str, str]] = exp.get("items", [])
            for idx, item in enumerate(experiences):
                self.set_xy(75, y_offset)
                self.set_font(self.font_family, "B", 10)
                self.cell(100, 5, str(item.get("title", "")), 0, 0, "L")
                self.set_font(self.font_family, "I", 8)
                self.cell(25, 5, str(item.get("date", "")), 0, 1, "R")

                self.set_font(self.font_family, "", 9)
                self.set_x(75)
                self.multi_cell(125, 5, str(item.get("desc", "")), 0, "L")

                techs = str(item.get("techs", "")).strip()
                if techs:
                    self.set_x(75)
                    self.set_font(self.font_family, "B", 8)
                    self.set_text_color(41, 54, 82)
                    self.write(5, "Technologies : ")
                    self.set_font(self.font_family, "", 8)
                    self.write(5, techs)
                    self.ln(4)
                else:
                    self.ln(2)

                if idx != len(experiences) - 1:
                    sep_y = self.get_y() + 3
                    self.set_draw_color(220, 220, 220)
                    self.line(75, sep_y, 200, sep_y)
                    y_offset = sep_y + 2
            return float(self.get_y())

        def render_education(y: float) -> None:
            edu_start_y = y + 5
            if edu_start_y > 260:
                self.add_page()
                self.add_sidebar()
                edu_start_y = 20

            self.set_xy(75, edu_start_y)
            self.set_font(self.font_family, "B", 11)
            self.cell(130, 5, str(edu.get("title", "FORMATION ACADÉMIQUE")), 0, 1, "L")
            self.set_draw_color(41, 54, 82)
            self.line(75, self.get_y(), 200, self.get_y())

            edu_y = self.get_y() + 2
            for item in edu.get("items", []):
                degree = str(item.get("degree", ""))
                school = str(item.get("school", ""))
                self.set_xy(75, edu_y)
                self.set_font(self.font_family, "B", 9)
                self.cell(125, 5, degree, 0, 1, "L")
                self.set_font(self.font_family, "", 9)
                self.set_x(75)
                self.cell(125, 5, school, 0, 1, "L")
                edu_y += 12

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

