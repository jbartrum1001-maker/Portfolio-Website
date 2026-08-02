/**
 * SwirlBackground — two-pass WebGL marbled swirl background.
 * No dependencies, no build step. Drop this file + a container element
 * into any page.
 *
 * Usage:
 *   <div id="swirl-bg"></div>
 *   <script src="swirl-background.js"></script>
 *   <script>
 *     const bg = new SwirlBackground({ container: '#swirl-bg' });
 *   </script>
 *
 * All options below are optional — omit any you don't want to override.
 */
class SwirlBackground {
  static defaults = {
    speed: 0.5,
    scale: 1.3,
    flow: 0.9,        // eddies — how many local swirl points vs. one big one
    swirl: 0.5,        // overall rotational drift on top of the eddies
    detail: 0.22,
    contrast: 2.2,
    settle: 0.6,       // how much the lightest tones lock into flat pools
    gloss: 1.2,
    balance: 0.5,      // 0 = mostly blue, 1 = mostly red
    blend: 0.012,      // red/blue boundary softness — keep small, it's meant to look sharp
    warp: 0.08,        // corner distortion strength
    aberration: 0.005, // corner colour-fringing strength
    colours: {
      redDark: '#2e120f', redMid: '#bb332d', redLight: '#e8897e',
      blueDark: '#0a1f28', blueMid: '#1a63ad', blueLight: '#93d3f0',
      highlight: '#eaffff'
    },
    maxFPS: 60,
    pauseWhenHidden: true,   // pause the render loop when the browser tab isn't visible
    pauseWhenOffscreen: true, // pause when the container scrolls out of view
    resolutionScale: 1 // render at this fraction of the container's pixel size, then
                        // let the browser upscale — fewer fragment-shader pixels per
                        // frame, and since sampling is gl.LINEAR the upscale reads as
                        // a soft, chunky low-res look rather than jagged pixelation
  };

  constructor(opts = {}) {
    this.container = typeof opts.container === 'string'
      ? document.querySelector(opts.container)
      : opts.container;
    if (!this.container) throw new Error('SwirlBackground: container not found');

    this.opts = {
      ...SwirlBackground.defaults,
      ...opts,
      colours: { ...SwirlBackground.defaults.colours, ...(opts.colours || {}) }
    };

    this._running = true;
    this._lastFrameTime = 0;
    this._buildCanvas();
    this._initGL();
    this._bindEvents();
    this._loop = this._loop.bind(this);
    this._start = performance.now();
    requestAnimationFrame(this._loop);
  }

  pause() { this._running = false; }
  resume() { this._running = true; requestAnimationFrame(this._loop); }
  destroy() {
    window.removeEventListener('resize', this._resize);
    document.removeEventListener('visibilitychange', this._onVisibility);
    if (this._observer) this._observer.disconnect();
    this._running = false;
    this.canvas.remove();
  }

  _buildCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:block;';
    const cs = getComputedStyle(this.container);
    if (cs.position === 'static') this.container.style.position = 'relative';
    this.container.appendChild(this.canvas);
    this.gl = this.canvas.getContext('webgl', { antialias: false });
    if (!this.gl) throw new Error('SwirlBackground: WebGL not available');
  }

  _initGL() {
    const gl = this.gl;

    const vertSrc = `
      attribute vec2 aPos;
      void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
    `;

    const swirlFragSrc = `
      precision highp float;
      uniform vec2 uRes;
      uniform float uTime, uSpeed, uScale, uSwirl, uFlow, uDetail, uContrast, uSettle, uGloss, uBalance, uBlend;
      uniform vec3 uRedDark, uRedMid, uRedLight, uBlueDark, uBlueMid, uBlueLight, uHighlight;

      vec2 hash(vec2 p){
        p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float valueNoise(vec2 p){
        const float K1 = 0.366025404; const float K2 = 0.211324865;
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2; vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
        vec3 n = h*h*h*h * vec3(dot(a, hash(i)), dot(b, hash(i+o)), dot(c, hash(i+1.0)));
        return dot(n, vec3(70.0));
      }
      float ridge(vec2 p){ return 1.0 - abs(valueNoise(p)); }
      float turbulence(vec2 p){
        float v = 0.0; float amp = 0.55;
        for (int i = 0; i < 4; i++) { v += amp * ridge(p); p *= 2.0; amp *= 0.5; }
        return v;
      }
      float smoothFbm(vec2 p){
        float v = 0.0; float amp = 0.5;
        for (int i = 0; i < 3; i++) { v += amp * (valueNoise(p) * 0.5 + 0.5); p *= 2.0; amp *= 0.5; }
        return v;
      }
      vec2 spin(vec2 uv, float t){
        float r = length(uv); float a = atan(uv.y, uv.x);
        a += (1.0 / (r + 0.25)) * 0.6 * uSwirl + t * 0.12 * uSpeed;
        return vec2(cos(a), sin(a)) * r;
      }
      vec2 flowWarp(vec2 p, float t, float amount){
        vec2 q = vec2(
          smoothFbm(p + vec2(0.0, 0.0) + t * 0.015),
          smoothFbm(p + vec2(5.2, 1.3) + t * 0.015)
        );
        vec2 r = vec2(
          smoothFbm(p + 2.5 * q + vec2(1.7, 9.2) + t * 0.02),
          smoothFbm(p + 2.5 * q + vec2(8.3, 2.8) + t * 0.02)
        );
        return p + amount * (r - 0.5);
      }
      vec3 ramp(vec3 dark, vec3 mid, vec3 light, float t){
        return t < 0.5 ? mix(dark, mid, t * 2.0) : mix(mid, light, (t - 0.5) * 2.0);
      }

      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
        float t = uTime;
        float drift = t * 0.05 * uSpeed;
        vec2 spun = spin(uv, t) * uScale;
        vec2 w = flowWarp(spun, t, uFlow) + drift;

        float m = turbulence(w);
        float dtl = turbulence(w * 2.2 + t * 0.08 * uSpeed);
        m -= (dtl - 0.5) * uDetail * 0.4;
        float mNorm = clamp(m / 1.05, 0.0, 1.0);
        mNorm = clamp((mNorm - 0.5) * uContrast + 0.5, 0.0, 1.0);
        float hi = smoothstep(0.62, 0.95, mNorm);
        mNorm = mix(mNorm, 1.0, hi * uSettle);

        vec3 redCol = ramp(uRedDark, uRedMid, uRedLight, mNorm);
        vec3 blueCol = ramp(uBlueDark, uBlueMid, uBlueLight, mNorm);

        float fam = smoothFbm(w * 0.55 + vec2(12.0, -8.0)) / 0.875;
        float famT = smoothstep(uBalance - uBlend, uBalance + uBlend, fam);
        vec3 col = mix(redCol, blueCol, famT);

        float eps = 0.015;
        float mX = turbulence(w + vec2(eps,0.0));
        float mY = turbulence(w + vec2(0.0,eps));
        vec3 normal = normalize(vec3(-(mX - m) / eps, -(mY - m) / eps, 6.0));
        vec3 lightDir = normalize(vec3(0.35, 0.5, 0.8));
        float spec = pow(max(dot(normal, lightDir), 0.0), 60.0);
        col += uHighlight * spec * uGloss;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    const postFragSrc = `
      precision highp float;
      uniform sampler2D uTex;
      uniform vec2 uRes;
      uniform float uWarp, uAberration;

      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 cc = uv - 0.5;
        float r2 = dot(cc, cc);
        float falloff = smoothstep(0.05, 0.5, r2);
        vec2 warped = uv + cc * falloff * uWarp;
        vec2 dir = cc / (length(cc) + 0.0001);
        float aberr = uAberration * falloff;
        float r = texture2D(uTex, warped + dir * aberr).r;
        float g = texture2D(uTex, warped).g;
        float b = texture2D(uTex, warped - dir * aberr).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const makeProgram = (fragSrc) => {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vertSrc));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
      gl.linkProgram(p);
      return p;
    };

    this.swirlProg = makeProgram(swirlFragSrc);
    this.postProg = makeProgram(postFragSrc);

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

    const U = (prog, name) => gl.getUniformLocation(prog, name);
    this.su = {
      uRes: U(this.swirlProg,'uRes'), uTime: U(this.swirlProg,'uTime'), uSpeed: U(this.swirlProg,'uSpeed'),
      uScale: U(this.swirlProg,'uScale'), uSwirl: U(this.swirlProg,'uSwirl'), uFlow: U(this.swirlProg,'uFlow'),
      uDetail: U(this.swirlProg,'uDetail'), uContrast: U(this.swirlProg,'uContrast'), uSettle: U(this.swirlProg,'uSettle'),
      uGloss: U(this.swirlProg,'uGloss'), uBalance: U(this.swirlProg,'uBalance'), uBlend: U(this.swirlProg,'uBlend'),
      uRedDark: U(this.swirlProg,'uRedDark'), uRedMid: U(this.swirlProg,'uRedMid'), uRedLight: U(this.swirlProg,'uRedLight'),
      uBlueDark: U(this.swirlProg,'uBlueDark'), uBlueMid: U(this.swirlProg,'uBlueMid'), uBlueLight: U(this.swirlProg,'uBlueLight'),
      uHighlight: U(this.swirlProg,'uHighlight')
    };
    this.pu = {
      uTex: U(this.postProg,'uTex'), uRes: U(this.postProg,'uRes'),
      uWarp: U(this.postProg,'uWarp'), uAberration: U(this.postProg,'uAberration')
    };

    this._resize = this._resize.bind(this);
    this._resize();
  }

  _hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [((v>>16)&255)/255, ((v>>8)&255)/255, (v&255)/255];
  }

  _setupTarget(w, h) {
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * this.opts.resolutionScale;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this._setupTarget(this.canvas.width, this.canvas.height);
  }

  _bindEvents() {
    window.addEventListener('resize', this._resize);

    if (this.opts.pauseWhenHidden) {
      this._onVisibility = () => { document.hidden ? this.pause() : this.resume(); };
      document.addEventListener('visibilitychange', this._onVisibility);
    }
    if (this.opts.pauseWhenOffscreen && 'IntersectionObserver' in window) {
      this._observer = new IntersectionObserver(([entry]) => {
        entry.isIntersecting ? this.resume() : this.pause();
      }, { threshold: 0 });
      this._observer.observe(this.container);
    }
  }

  _bindQuad(prog) {
    const gl = this.gl;
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }

  _loop(t) {
    if (!this._running) return;

    const minFrameGap = 1000 / this.opts.maxFPS;
    if (t - this._lastFrameTime < minFrameGap) {
      requestAnimationFrame(this._loop);
      return;
    }
    this._lastFrameTime = t;

    const gl = this.gl;
    const o = this.opts;
    const c = o.colours;
    const time = (t - this._start) / 1000;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.swirlProg);
    this._bindQuad(this.swirlProg);
    gl.uniform2f(this.su.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.su.uTime, time);
    gl.uniform1f(this.su.uSpeed, o.speed);
    gl.uniform1f(this.su.uScale, o.scale);
    gl.uniform1f(this.su.uSwirl, o.swirl);
    gl.uniform1f(this.su.uFlow, o.flow);
    gl.uniform1f(this.su.uDetail, o.detail);
    gl.uniform1f(this.su.uContrast, o.contrast);
    gl.uniform1f(this.su.uSettle, o.settle);
    gl.uniform1f(this.su.uGloss, o.gloss);
    gl.uniform1f(this.su.uBalance, o.balance);
    gl.uniform1f(this.su.uBlend, o.blend);
    gl.uniform3fv(this.su.uRedDark, this._hexToRgb(c.redDark));
    gl.uniform3fv(this.su.uRedMid, this._hexToRgb(c.redMid));
    gl.uniform3fv(this.su.uRedLight, this._hexToRgb(c.redLight));
    gl.uniform3fv(this.su.uBlueDark, this._hexToRgb(c.blueDark));
    gl.uniform3fv(this.su.uBlueMid, this._hexToRgb(c.blueMid));
    gl.uniform3fv(this.su.uBlueLight, this._hexToRgb(c.blueLight));
    gl.uniform3fv(this.su.uHighlight, this._hexToRgb(c.highlight));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.postProg);
    this._bindQuad(this.postProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.pu.uTex, 0);
    gl.uniform2f(this.pu.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.pu.uWarp, o.warp);
    gl.uniform1f(this.pu.uAberration, o.aberration);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(this._loop);
  }
}
