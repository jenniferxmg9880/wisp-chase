
from flask import Flask, render_template, session, jsonify, request
import time
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(32).hex())

FLAG = "WICYS{st1llness_c4tches_4ll}"

MIN_ELAPSED_SECONDS = 5      
MIN_ENGAGEMENT_EVENTS = 15   
MAX_ATTEMPTS = 100           


@app.route("/")
def index():
    session["started"] = time.time()
    session["attempts"] = 0
    return render_template("index.html")


@app.route("/api/catch", methods=["POST"])
def catch():
    started = session.get("started")
    if started is None:
        return jsonify({"ok": False, "message": "The wisp doesn't recognize you. Reload and try again."}), 400

    attempts = session.get("attempts", 0)
    if attempts > MAX_ATTEMPTS:
        return jsonify({"ok": False, "message": "It has grown far too wary of you tonight."}), 429
    session["attempts"] = attempts + 1

    elapsed = time.time() - started
    data = request.get_json(silent=True) or {}
    engagement = data.get("engagement", 0)

    try:
        engagement = int(engagement)
    except (TypeError, ValueError):
        engagement = 0

    if elapsed < MIN_ELAPSED_SECONDS or engagement < MIN_ENGAGEMENT_EVENTS:
        return jsonify({"ok": False, "message": "That wasn't quite earned yet."}), 400

    return jsonify({"ok": True, "flag": FLAG})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
