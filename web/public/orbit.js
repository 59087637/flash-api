/* ============================================================
   深空轨道主题 (Orbit Theme) — 粒子星场 / 球面点阵 / 轨道环 / 文字粒子
   视觉概念参考 123API 首页，代码为独立实现。
   挂载点：<canvas id="orbit-canvas"> + 右下角开关
   ============================================================ */
(function () {
  'use strict';
  if (window.__orbitTheme) { return; }
  window.__orbitTheme = true;

  var STORE = 'orbit-theme-mode';          // auto | on | off
  var TITLE = 'FLASH API';                   // 粒子文字
  var TAU = Math.PI * 2;
  var GOLDEN = Math.PI * (3 - Math.sqrt(5));

  /* 密集页面默认不开动画：表格多，动态背景会干扰阅读 */
  var DENSE = ['/dashboard', '/channels', '/users', '/usage-logs', '/keys',
               '/system-settings', '/redemption-codes', '/wallet', '/about',
               '/models', '/pricing/self'];

  /* 控制台路由不套深空主题，沿用 New API 原本的背景与配色 */
  var CONSOLE = ['/dashboard', '/channels', '/users', '/usage-logs', '/keys',
                 '/system-settings', '/redemption-codes', '/wallet',
                 '/subscriptions', '/models', '/playground', '/profile',
                 '/security', '/chat', '/chat2link', '/task-plugins'];

  function pathIsDense() {
    var p = String(location.pathname || '/').toLowerCase();
    for (var i = 0; i < DENSE.length; i++) {
      if (p.indexOf(DENSE[i]) === 0) { return true; }
    }
    return false;
  }

  function pathIsConsole() {
    var p = String(location.pathname || '/').toLowerCase();
    if (p === '/' || p === '') { return true; }
    for (var i = 0; i < CONSOLE.length; i++) {
      if (p === CONSOLE[i] || p.indexOf(CONSOLE[i] + '/') === 0) { return true; }
    }
    return false;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  var PAL = {
    cyan: [112, 224, 237],
    cyan2: [46, 196, 218],
    blue: [90, 174, 219],
    ice: [227, 245, 250],
    gold: [243, 199, 123]
  };
  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* ------------------------------------------------------------
     文字 -> 粒子：离屏画布光栅化后按像素采样
     ------------------------------------------------------------ */
  function buildTitle() {
    try {
      var W = 1100, H = 300;
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var g = c.getContext('2d', { willReadFrequently: true });
      if (!g) { return null; }

      var size = 210;
      var font = function (px) {
        return '800 ' + px + 'px "Manrope", "Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
      };
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = font(size);
      var w = g.measureText(TITLE).width;
      if (w > W * 0.94) {
        size = Math.floor(size * (W * 0.94) / w);
        g.font = font(size);
      }
      g.fillText(TITLE, W / 2, H / 2 + size * 0.04);

      var img = g.getImageData(0, 0, W, H).data;
      var pts = [];
      var step = 7;
      for (var y = 0; y < H; y += step) {
        for (var x = 0; x < W; x += step) {
          var a = img[(y * W + x) * 4 + 3];
          if (a > 120) {
            pts.push({
              nx: (x - W / 2) / W,
              ny: (y - H / 2) / W,
              ph: Math.random() * TAU,
              sp: rand(0.5, 1.5),
              c: Math.random() < 0.12 ? PAL.ice : (Math.random() < 0.5 ? PAL.cyan : PAL.blue)
            });
          }
        }
      }
      return pts.length > 40 ? { pts: pts } : null;
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------------------------------------
     引擎
     ------------------------------------------------------------ */
  function Engine(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.w = 0; this.h = 0; this.dpr = 1;
    this.t = 0; this.raf = 0; this.last = 0;
    this.on = false; this.want = false; this.small = false;

    this.dust = [];
    this.shell = [];
    this.rings = [];
    this.title = null;

    this._onResize = this._onResize.bind(this);
    this._tick = this._tick.bind(this);
  }

  Engine.prototype.init = function () {
    this._build();
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('orientationchange', this._onResize, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { this.pause(); }
      else if (this.want) { this.play(); }
    }.bind(this));
    this._onResize();
  };

  Engine.prototype._build = function () {
    var i, n, a, r, y, th;

    /* 星尘 */
    this.dust = [];
    for (i = 0; i < 320; i++) {
      this.dust.push({
        x: Math.random(), y: Math.random(),
        z: rand(0.25, 1),
        vx: rand(-0.000018, 0.000018),
        vy: rand(-0.000014, 0.000014),
        r: rand(0.5, 1.5),
        c: Math.random() < 0.08 ? PAL.gold : (Math.random() < 0.5 ? PAL.ice : PAL.blue)
      });
    }

    /* 球面点阵：黄金角螺旋 */
    this.shell = [];
    n = 760;
    for (i = 0; i < n; i++) {
      y = 1 - (i / (n - 1)) * 2;
      r = Math.sqrt(Math.max(0, 1 - y * y));
      th = GOLDEN * i;
      this.shell.push({
        x: Math.cos(th) * r, y: y, z: Math.sin(th) * r,
        j: rand(-0.012, 0.012),
        c: Math.random() < 0.1 ? PAL.ice : (Math.random() < 0.45 ? PAL.cyan : PAL.blue)
      });
    }

    /* 轨道环 */
    this.rings = [
      { n: 230, rad: 1.28, tiltX: 0.34, tiltZ: -0.22, spin: 0.15, w: 1.0, c: PAL.cyan },
      { n: 170, rad: 1.52, tiltX: -0.22, tiltZ: 0.30, spin: -0.10, w: 0.9, c: PAL.cyan2 }
    ];
    for (var k = 0; k < this.rings.length; k++) {
      var ring = this.rings[k], arr = [];
      for (i = 0; i < ring.n; i++) {
        arr.push({
          a: (i / ring.n) * TAU,
          on: Math.random() > 0.08,
          j: rand(-0.01, 0.01),
          b: Math.random() < 0.1 ? 1.6 : 1.0,
          c: ring.c
        });
      }
      ring.pts = arr;
    }

    if (!this.title) { this.title = buildTitle(); }
  };

  Engine.prototype._onResize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    this.small = w < 700;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.small ? 1.5 : 2);
    this.w = w; this.h = h;
    this.cv.width = Math.max(1, Math.round(w * this.dpr));
    this.cv.height = Math.max(1, Math.round(h * this.dpr));
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Engine.prototype.play = function () {
    this.want = true;
    if (this.on) { return; }
    this.on = true;
    this.last = 0;
    /* 先同步画一帧：部分环境会挂起 rAF，首屏不该是空白 */
    this._frame(performance.now());
    this.raf = requestAnimationFrame(this._tick);
  };

  Engine.prototype.pause = function () {
    this.on = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (this.ctx) { this.ctx.clearRect(0, 0, this.w, this.h); }
  };

  Engine.prototype._tick = function (ts) {
    if (!this.on) { return; }
    this._frame(ts);
    this.raf = requestAnimationFrame(this._tick);
  };

  Engine.prototype._frame = function (ts) {
    if (!this.last) { this.last = ts; }
    var dt = Math.min((ts - this.last) / 1000, 0.05);
    this.last = ts;
    this.t += dt;

    var g = this.ctx, w = this.w, h = this.h;
    if (!g || !w || !h) { return; }
    g.clearRect(0, 0, w, h);
    this._drawDust(g, w, h, dt);
    this._drawTitle(g, w, h);
    this._drawShell(g, w, h);
    this._drawRings(g, w, h);
  };

  Engine.prototype._drawDust = function (g, w, h, dt) {
    var pts = this.dust, i, p, x, y;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.x < -0.02) { p.x = 1.02; }
      if (p.x > 1.02) { p.x = -0.02; }
      if (p.y < -0.02) { p.y = 1.02; }
      if (p.y > 1.02) { p.y = -0.02; }
      x = p.x * w; y = p.y * h;
      g.fillStyle = rgba(p.c, 0.45 + p.z * 0.5);
      g.fillRect(x, y, p.r * p.z * 1.5, p.r * p.z * 1.5);
    }
  };

  Engine.prototype._proj = function (x, y, z, R, D, tX, tZ, yaw) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var rx = x * cy - z * sy;
    var rz = x * sy + z * cy;
    var cx = Math.cos(tX), sx = Math.sin(tX);
    var y2 = y * cx - rz * sx;
    var z2 = y * sx + rz * cx;
    var cz = Math.cos(tZ), sz = Math.sin(tZ);
    var x3 = rx * cz - y2 * sz;
    var y3 = rx * sz + y2 * cz;
    var k = R / (D - z2);
    return [x3 * k, y3 * k, z2];
  };

  Engine.prototype._drawShell = function (g, w, h) {
    var R = Math.min(w, h) * (this.small ? 0.28 : 0.30);
    var D = R * 2.9;
    var cx = w / 2, cy = h * 0.52;
    var yaw = this.t * 0.085;
    var tX = 0.28, tZ = 0.14;
    var pts = this.shell, i, p, o, depth, s;

    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      o = this._proj(p.x + p.j, p.y + p.j, p.z + p.j, R, D, tX, tZ, yaw);
      depth = (o[2] + 1) / 2;
      s = 1.2 + depth * 2.2;
      g.fillStyle = rgba(p.c, 0.22 + depth * 0.72);
      g.fillRect(cx + o[0], cy + o[1], s, s);
    }

    var glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
    glow.addColorStop(0, 'rgba(112,224,237,0.16)');
    glow.addColorStop(1, 'rgba(112,224,237,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, cy, R * 0.55, 0, TAU);
    g.fill();
  };

  Engine.prototype._drawRings = function (g, w, h) {
    var R = Math.min(w, h) * (this.small ? 0.28 : 0.30);
    var D = R * 2.9;
    var cx = w / 2, cy = h * 0.52;
    var i, k, ring, pts, p, o, depth, s, yaw;

    for (k = 0; k < this.rings.length; k++) {
      ring = this.rings[k];
      pts = ring.pts;
      yaw = this.t * ring.spin;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        if (!p.on) { continue; }
        o = this._proj(Math.cos(p.a) * ring.rad, 0, Math.sin(p.a) * ring.rad,
                       R, D, ring.tiltX, ring.tiltZ, yaw);
        depth = (o[2] + 1) / 2;
        s = (0.9 + depth * 1.4) * p.b * ring.w;
        g.fillStyle = rgba(p.c, 0.34 + depth * 0.6);
        g.fillRect(cx + o[0], cy + o[1], s, s);
      }
    }
  };

  Engine.prototype._drawTitle = function (g, w, h) {
    if (!this.title) { return; }
    var pts = this.title.pts;
    var scale = Math.min(w * 0.85, 1160);
    var cx = w / 2, cy = h * 0.52;
    var i, p, a;

    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      a = 0.10 + 0.12 * (0.5 + 0.5 * Math.sin(this.t * p.sp + p.ph));
      g.fillStyle = rgba(p.c, a);
      g.fillRect(cx + p.nx * scale, cy + p.ny * scale, 2, 2);
    }
  };

  /* ------------------------------------------------------------
     启动
     ------------------------------------------------------------ */
  function boot() {
    var root = document.documentElement;
    root.classList.toggle('orbit-on', !pathIsConsole());

    var cv = document.createElement('canvas');
    cv.id = 'orbit-canvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);

    var eng = new Engine(cv);
    eng.init();

    var btn = document.createElement('button');
    btn.id = 'orbit-toggle';
    btn.type = 'button';
    btn.title = '切换深空轨道主题动效';
    btn.innerHTML = '<span class="ot-dot"></span><span class="ot-label">动效</span>';
    document.body.appendChild(btn);

    var reduce = !!(window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function mode() {
      try { return localStorage.getItem(STORE) || 'auto'; } catch (e) { return 'auto'; }
    }
    function save(m) {
      try { localStorage.setItem(STORE, m); } catch (e) { /* 忽略 */ }
    }
    function shouldRun() {
      var m = mode();
      if (m === 'on') { return true; }
      if (m === 'off') { return false; }
      return !pathIsDense();
    }

    var label = btn.querySelector('.ot-label');

    function sync() {
      var onConsole = pathIsConsole();
      root.classList.toggle('orbit-on', !onConsole);
      btn.style.display = onConsole ? 'none' : '';
      var m = mode();
      var run = !onConsole && shouldRun() && !reduce;
      btn.setAttribute('data-state', m);
      label.textContent = (m === 'auto') ? (run ? '自动' : '静默') : (run ? '开' : '关');
      if (run) {
        cv.style.display = 'block';
        eng.play();
      } else {
        cv.style.display = 'none';
        eng.pause();
      }
    }

    btn.addEventListener('click', function () {
      var order = ['auto', 'on', 'off'];
      save(order[(order.indexOf(mode()) + 1) % order.length]);
      sync();
    });

    sync();

    /* 单页路由切换后重新判断（不重建场景） */
    var lastPath = location.pathname;
    setInterval(function () {
      if (location.pathname === lastPath) { return; }
      lastPath = location.pathname;
      sync();
    }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
