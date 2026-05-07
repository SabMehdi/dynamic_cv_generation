from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from flask import Flask, Response, jsonify, request

from .cv_renderer import render_pdf_bytes


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "cv_data.json"


def load_data() -> Dict[str, Any]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def save_data(data: Dict[str, Any]) -> None:
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")

    @app.get("/")
    def index() -> Response:
        html = (ROOT / "static" / "index.html").read_text(encoding="utf-8")
        return Response(html, mimetype="text/html")

    @app.get("/api/cv")
    def get_cv() -> Response:
        return jsonify(load_data())

    @app.post("/api/cv")
    def put_cv() -> Response:
        data = request.get_json(force=True, silent=False)
        if not isinstance(data, dict):
            return jsonify({"error": "Expected JSON object"}), 400
        save_data(data)
        return jsonify({"ok": True})

    @app.get("/api/pdf")
    def get_pdf() -> Response:
        data = load_data()
        pdf_bytes = render_pdf_bytes(data)
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": 'inline; filename="cv.pdf"'},
        )

    return app

