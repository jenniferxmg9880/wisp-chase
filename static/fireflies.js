(function () {
  "use strict";

  var canvas = document.getElementById("fireflies");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var flies = [];
  var count = Math.min(46, Math.floor((W * H) / 32000));

  for (var i = 0; i < count; i++) {
    flies.push({
      x: Math.random() * W,
      y: H * 0.35 + Math.random() * H * 0.65,
      r: 1.3 + Math.random() * 2.1,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.02
    });
  }

  var t = 0;

  function tick() {
    t += 1;
    ctx.clearRect(0, 0, W, H);
    flies.forEach(function (f) {
      f.x += f.vx;
      f.y += f.vy;

      // gentle random wander
      f.vx += (Math.random() - 0.5) * 0.03;
      f.vy += (Math.random() - 0.5) * 0.03;
      f.vx = Math.max(-0.4, Math.min(0.4, f.vx));
      f.vy = Math.max(-0.3, Math.min(0.3, f.vy));

      if (f.x < -10) f.x = W + 10;
      if (f.x > W + 10) f.x = -10;
      if (f.y < H * 0.3) f.y = H * 0.3;
      if (f.y > H + 10) f.y = H * 0.3;

      var flicker = 0.35 + 0.5 * Math.max(0, Math.sin(t * f.speed + f.phase));

      var glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
      glow.addColorStop(0, "rgba(217,232,122," + (flicker * 0.9) + ")");
      glow.addColorStop(1, "rgba(217,232,122,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(244,255,184," + flicker + ")";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
