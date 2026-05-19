from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from flask import Flask, Response, jsonify, request
from .db import init_db, save_version, list_versions, get_version

from .cv_renderer import render_pdf_bytes


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "cv_data.json"


def load_data() -> Dict[str, Any]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def save_data(data: Dict[str, Any]) -> None:
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    # ensure DB exists
    init_db()

    @app.get("/")
    def index() -> Response:
        html = (ROOT / "static" / "index.html").read_text(encoding="utf-8")
        return Response(html, mimetype="text/html")

    @app.get("/api/cv")
    def get_cv() -> Response:
        # Return latest saved version if available, otherwise fallback to local JSON
        versions = list_versions(1)
        if versions:
            vid = versions[0]["id"]
            v = get_version(vid)
            if v is not None:
                return jsonify(v)
        return jsonify(load_data())

    @app.post("/api/cv")
    def put_cv() -> Response:
        body = request.get_json(force=True, silent=False)
        if not body:
            return jsonify({"error": "Expected JSON body"}), 400

        # support payloads: either the raw CV object, or {name:..., data:...}
        if isinstance(body, dict) and "data" in body:
            data = body["data"]
            name = body.get("name")
        else:
            data = body
            name = request.args.get("name")

        if not isinstance(data, dict):
            return jsonify({"error": "Expected CV JSON object"}), 400

        save_data(data)
        try:
            vid = save_version(name, data)
        except Exception:
            # don't fail the whole request if DB save fails
            vid = None
        return jsonify({"ok": True, "version_id": vid})

    @app.get("/api/cv/list")
    def get_cv_list() -> Response:
        rows = list_versions(200)
        return jsonify(rows)

    @app.get("/api/cv/<int:cv_id>")
    def get_cv_by_id(cv_id: int) -> Response:
        v = get_version(cv_id)
        if v is None:
            return jsonify({"error": "Not found"}), 404
        return jsonify(v)

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

