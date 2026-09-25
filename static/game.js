/* ============================================================
   The Restless Wisp — game logic
   Flees from cursor movement. Grows calm, then curious, the
   longer the cursor holds still nearby. Catching it (click while
   close AND calm) asks the server to verify and release the flag.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("arena");
  var ctx = canvas.getContext("2d");
  var hintEl = document.getElementById("hint");
  var overlay = document.getElementById("reveal-overlay");
  var flagValueEl = document.getElementById("flag-value");
  var revealMsgEl = document.getElementById("reveal-message");

  // ---- logical arena size (canvas is scaled via CSS to fit) ----
  var W = 860, H = 480;
  canvas.width = W;
  canvas.height = H;

  var mouse = { x: W / 2, y: H / 2, active: false };
  var lastMouse = { x: W / 2, y: H / 2 };
  var stillMs = 0;
  var lastFrame = performance.now();
  var engagementEvents = 0;
  var caught = false;

  var wisp = {
    x: W * 0.7,
    y: H * 0.3,
    vx: 0,
    vy: 0,
    r: 9
  };

  var FLEE_RADIUS = 190;
  var FLEE_FORCE = 900;
  var DAMPING = 0.90;
  var MAX_SPEED = 620;
  var REQUIRED_STILL_MS = 1600;   // how long cursor must hold still to fully calm the wisp
  var CATCH_RADIUS = 26;
  var CATCH_WARINESS = 0.18;      // wariness must drop below this to allow a catch
  var DRIFT_FORCE = 55;           // gentle pull toward cursor once calm

  var wariness = 1;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width;
    var scaleY = H / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
    mouse.active = true;
    engagementEvents++;
  });

  canvas.addEventListener("mouseleave", function () {
    mouse.active = false;
  });

  canvas.addEventListener("click", function () {
    if (caught) return;
    var dx = wisp.x - mouse.x, dy = wisp.y - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= CATCH_RADIUS && wariness <= CATCH_WARINESS) {
      attemptCatch();
    }
  });

  var hintTimer = 0;
  var chaseTime = 0; // accumulates while wariness stays high (i.e. still chasing)

  function updateHints(dt) {
    if (wariness > 0.6) {
      chaseTime += dt;
    }
    if (chaseTime > 11000 && hintTimer === 0) {
      hintTimer = 1;
      hintEl.textContent = "Perhaps chasing is not how one catches light.";
      hintEl.classList.add("is-visible");
    }
    if (chaseTime > 24000 && hintTimer === 1) {
      hintTimer = 2;
      hintEl.textContent = "Hold still long enough, and it may mistake you for something safe.";
      hintEl.classList.add("is-visible");
    }
  }

  function step(dt) {
    // stillness tracking
    var movedDist = Math.hypot(mouse.x - lastMouse.x, mouse.y - lastMouse.y);
    if (!mouse.active || movedDist > 2.2) {
      stillMs = 0;
    } else {
      stillMs += dt;
    }
    lastMouse.x = mouse.x;
    lastMouse.y = mouse.y;

    wariness = clamp(1 - stillMs / REQUIRED_STILL_MS, 0, 1);

    var dx = wisp.x - mouse.x, dy = wisp.y - mouse.y;
    var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

    if (mouse.active && dist < FLEE_RADIUS) {
      var fleeStrength = (1 - dist / FLEE_RADIUS) * FLEE_FORCE * wariness;
      wisp.vx += (dx / dist) * fleeStrength * dt / 1000;
      wisp.vy += (dy / dist) * fleeStrength * dt / 1000;

      // once calm, a gentle pull inward instead of fleeing
      var calm = 1 - wariness;
      if (calm > 0.15) {
        wisp.vx -= (dx / dist) * DRIFT_FORCE * calm * dt / 1000;
        wisp.vy -= (dy / dist) * DRIFT_FORCE * calm * dt / 1000;
      }
    } else {
      // idle drift when cursor is far or inactive
      wisp.vx += (Math.random() - 0.5) * 18 * dt / 1000;
      wisp.vy += (Math.random() - 0.5) * 18 * dt / 1000;
    }

    // damping + speed cap
    wisp.vx *= DAMPING;
    wisp.vy *= DAMPING;
    var speed = Math.hypot(wisp.vx, wisp.vy);
    if (speed > MAX_SPEED) {
      wisp.vx = (wisp.vx / speed) * MAX_SPEED;
      wisp.vy = (wisp.vy / speed) * MAX_SPEED;
    }

    wisp.x += wisp.vx * dt / 1000;
    wisp.y += wisp.vy * dt / 1000;

    // bounce off walls
    if (wisp.x < wisp.r) { wisp.x = wisp.r; wisp.vx *= -0.6; }
    if (wisp.x > W - wisp.r) { wisp.x = W - wisp.r; wisp.vx *= -0.6; }
    if (wisp.y < wisp.r) { wisp.y = wisp.r; wisp.vy *= -0.6; }
    if (wisp.y > H - wisp.r) { wisp.y = H - wisp.r; wisp.vy *= -0.6; }

    updateHints(dt);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // faint trailing glow
    var calmGlow = clamp(1 - wariness, 0, 1);
    var radius = wisp.r + calmGlow * 6;
    var glow = ctx.createRadialGradient(wisp.x, wisp.y, 0, wisp.x, wisp.y, radius * 5);
    var coreColor = calmGlow > 0.5 ? "201,255,240" : "126,240,214";
    glow.addColorStop(0, "rgba(" + coreColor + "," + (0.55 + calmGlow * 0.3) + ")");
    glow.addColorStop(1, "rgba(" + coreColor + ",0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y, radius * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(" + coreColor + ",0.95)";
    ctx.beginPath();
    ctx.arc(wisp.x, wisp.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop(now) {
    var dt = Math.min(48, now - lastFrame);
    lastFrame = now;
    if (!caught) {
      step(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }

  function attemptCatch() {
    caught = true;
    fetch("/api/catch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engagement: engagementEvents })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          revealMsgEl.textContent = "It stopped fleeing. It looked at you instead.";
          flagValueEl.textContent = data.flag;
          overlay.classList.add("is-visible");
        } else {
          caught = false;
          hintEl.textContent = data.message || "Not yet.";
          hintEl.classList.add("is-visible");
        }
      })
      .catch(function () {
        caught = false;
        hintEl.textContent = "Something in the ether interrupted that. Try again.";
        hintEl.classList.add("is-visible");
      });
  }

  requestAnimationFrame(loop);
})();
