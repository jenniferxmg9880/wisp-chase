"""
The Restless Wisp — Charms Wing
--------------------------------
A browser mini-game CTF challenge. The flag is intentionally kept
server-side and is never present anywhere in the HTML/CSS/JS the
client downloads — so "view source" / "search the JS for WICYS{"
finds nothing. The flag is only released by POST /api/catch, and
only once a few light plausibility checks pass.

HONESTY NOTE for the challenge author (this docstring is server-side
only, players never see it): this is NOT hardened anti-cheat. A
determined player who opens the Network tab, catches the wisp once
legitimately, and inspects the successful response will obviously
see the flag in plaintext there — that's fine, that's just "playing
the game and reading the result." What this design actually prevents
is the trivial version of cheesing: reading static source/JS files
before ever playing. A very determined player could also try to
replay/forge the POST request from the console after simply waiting
out the minimum elapsed time — the engagement-count check raises
that bar somewhat but isn't unbeatable. For a fun class CTF, this is
a reasonable, proportionate amount of friction.
"""

from flask import Flask, render_template, session, jsonify, request
import time
import os

app = Flask(__name__)
# For a single-worker deploy (see README) a random key generated at
# startup is fine. Set a SECRET_KEY env var on Render if you ever run
# multiple workers, so all workers can validate the same session cookie.
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(32).hex())

FLAG = "WICYS{st1llness_c4tches_4ll}"

MIN_ELAPSED_SECONDS = 5      # can't possibly have played fair in less time than this
MIN_ENGAGEMENT_EVENTS = 15   # a light signal that some real mouse activity happened
MAX_ATTEMPTS = 100           # generous; just stops runaway loops


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
