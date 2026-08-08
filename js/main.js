// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const primaryNav = document.querySelector('.primary-nav');

navToggle.addEventListener('click', () => {
  const isOpen = primaryNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile nav when a link is clicked
primaryNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    primaryNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Site-wide swirl background — one persistent instance, fixed behind
// the whole page (see .site-swirl in css/style.css), not per-section.
// Sections that want it visible just need a transparent background;
// content elsewhere (About's panel, the header, etc.) naturally paints
// over it. Replaces the old radial-gradient hero blob glow.
//
// Colours were first retuned off the shader's default red/blue marble
// to a warm red/orange ramp (matching the old blob glow and the
// section-heading pulse), then retuned again here to a dark-navy /
// steel-blue / icy-highlight ramp per a reference photo — both
// colour "families" (redDark/Mid/Light and blueDark/Mid/Light, just
// the shader's own generic names for its two blend ramps) are now
// blue tones rather than one being red, so the marble blend reads as
// one cohesive blue instead of red-vs-blue. balance/settle/
// resolutionScale are untouched on purpose — only the palette
// changed, not the shape or motion of the swirl.
//
// redLight retuned a third time, from #3f7fad to #60a3d8: that old
// value sat almost exactly at the same luminance as blueMid (#2f7fc4),
// so the swirl had plenty of dark/navy and plenty of mid-blue but
// nothing distinctly lighter until blueLight's icy pale tone — a big
// gap with no proper "light blue" in between. #60a3d8 fills that gap
// (its own ramp: near-black -> dark navy -> this light blue), giving
// the lighter end of the palette real presence without touching the
// dark contrast or the icy blueLight highlight either side of it.
//
// TRIAL (this commit): retuned a fourth time to match a Balatro
// screenshot's dark smoky background, using four colours the user
// colour-picked directly from that screenshot across its brightness
// range (111a1b darkest, 162222, 1a2325, 2b383b lightest) — a dark
// teal-gray, not a neutral gray or a blue. Both ramps reuse those
// same four picked values (redLight/blueLight both = the lightest
// pick) so the blend still reads as one cohesive tone; only
// `highlight` is extrapolated lighter along the same teal-gray
// direction, since the shader needs something brighter than the
// lightest ramp stop for speckle detail. The previous cohesive-blue
// palette above is the one to `git revert` back to if this doesn't
// land.
// contrast dropped from the shader's default 2.2 to 1.3 alongside the
// palette trial above: the shader clamps its noise-driven light/dark
// mix after scaling it by uContrast, so anything past a threshold
// clips to pure dark or pure highlight rather than blending — at 2.2
// that threshold clips over half the canvas, reading as separate
// "light patches" and "dark patches" instead of one evenly-mixed
// swirl. 1.3 clips only the extreme tails, so most of the canvas
// blends continuously across the palette instead.
//
// gloss raised from the shader's default 1.2 to 1.8: `highlight` is a
// separate specular sparkle added on top of the base ramp
// (col += uHighlight * spec * uGloss in the shader), not part of the
// dark/mid/light blend above — gloss is the only exposed multiplier
// on it, so this makes the existing icy highlight flecks read more
// strongly without changing how much of the canvas they cover.
//
// speed dropped from the shader's default 0.5, first to 0.3, then to
// 0.1: it's a pure motion-rate multiplier (rotation drift, flow warp,
// detail turbulence all scale by uSpeed, nothing else does), so this
// only slows the animation down — doesn't touch the palette/contrast/
// shape tuning above. Per feedback that the swirl read a little too
// fast/"sea sicky" for an ambient background, then still too quick at
// 0.3 — wanted a slower, calmer drift while still visibly moving, not
// fully static. (An initial "juddery" report at 0.3 turned out to be
// an unrelated first-launch hitch, not a real perf issue — no
// resolutionScale change needed here.)
const siteSwirlEl = document.querySelector('.site-swirl');
if (siteSwirlEl && typeof SwirlBackground !== 'undefined') {
  new SwirlBackground({
    container: siteSwirlEl,
    balance: 0.72,
    settle: 0.3,
    contrast: 1.3,
    gloss: 1.8,
    speed: 0.1,
    resolutionScale: 0.4,
    colours: {
      redDark: '#162222', redMid: '#1a2325', redLight: '#2b383b',
      blueDark: '#111a1b', blueMid: '#162222', blueLight: '#2b383b',
      highlight: '#4a5c5f'
    }
  });
}

// -----------------------------------------
// Site-wide particle sparkles — small drifting, rotating squares over
// the swirl, per a Balatro reference screenshot. Plain 2D canvas, not
// WebGL like the swirl above — squares filled via fillRect are cheap
// per-pixel, so this needs none of the resolutionScale-style perf
// tuning the swirl does. Colours are the three picked directly off
// that reference: f1f6f2 (near-white), d6b88b (warm tan/gold), 88c7c5
// (cyan-teal). Each particle gets its own random size, drift velocity,
// rotation speed, and twinkle phase so they don't all move in lockstep
// — that variation is what reads as "floating debris" rather than a
// uniform grid or a single repeating animation.
// -----------------------------------------
const siteParticlesEl = document.querySelector('.site-particles');
if (siteParticlesEl) {
  const particleCanvas = document.createElement('canvas');
  particleCanvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; display:block;';
  siteParticlesEl.appendChild(particleCanvas);
  const particleCtx = particleCanvas.getContext('2d');

  const PARTICLE_COLOURS = ['#f1f6f2', '#d6b88b', '#88c7c5'];
  const PARTICLE_COUNT = 35; // lowered from an initial 55, felt too packed-in
  const particleDpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];

  function resizeParticleCanvas() {
    particleCanvas.width = window.innerWidth * particleDpr;
    particleCanvas.height = window.innerHeight * particleDpr;
  }

  function makeParticle() {
    const size = 2 + Math.random() * 5; // 2-7px squares
    // px/s drift — ambient, not a directed "wind". Bumped to ±17.5
    // (from an initial ±4) on a "too static" complaint, then reverted
    // straight back to ±4 once that turned out to read as too much
    // simultaneous motion — the original slow drift was actually the
    // right "static but floaty" feel, it was the brightness (below)
    // that needed fixing, not the speed.
    const speedX = (Math.random() - 0.5) * 8;
    const speedY = (Math.random() - 0.5) * 8;
    const speedMag = Math.hypot(speedX, speedY) || 0.0001;
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size,
      colour: PARTICLE_COLOURS[Math.floor(Math.random() * PARTICLE_COLOURS.length)],
      speedX,
      speedY,
      // Unit heading, precomputed once — a particle's velocity (and
      // so its direction) never changes after spawn, so there's no
      // need to re-derive this every frame. Used below to trail the
      // chromatic-aberration ghosts behind the particle's own motion,
      // not just at a fixed offset.
      dirX: speedX / speedMag,
      dirY: speedY / speedMag,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.8, // rad/s
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.4 + Math.random() * 1.1,
      // Raised from an initial 0.35-0.85 range — combined with the
      // twinkle dimming below, that made most particles read as dim/
      // faded most of the time rather than bright like the reference.
      baseOpacity: 0.6 + Math.random() * 0.4
    };
  }

  function initParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
  }

  let lastParticleT = performance.now();
  function animateParticles(t) {
    const dt = Math.min((t - lastParticleT) / 1000, 0.05);
    lastParticleT = t;
    const w = window.innerWidth;
    const h = window.innerHeight;

    particleCtx.setTransform(particleDpr, 0, 0, particleDpr, 0, 0);
    particleCtx.clearRect(0, 0, w, h);

    particles.forEach((p) => {
      p.x += p.speedX * dt;
      p.y += p.speedY * dt;
      p.rotation += p.rotationSpeed * dt;
      p.twinklePhase += p.twinkleSpeed * dt;

      // Wrap around edges with a margin so squares don't visibly pop
      // in/out right at the viewport boundary.
      const margin = p.size * 4;
      if (p.x < -margin) p.x = w + margin;
      if (p.x > w + margin) p.x = -margin;
      if (p.y < -margin) p.y = h + margin;
      if (p.y > h + margin) p.y = -margin;

      const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);
      // Floor raised from 0.4 to 0.7 (of baseOpacity) — the old range
      // let twinkle dim particles down too far too often, compounding
      // with the baseOpacity fix above to look duller than intended.
      const alpha = p.baseOpacity * (0.7 + 0.3 * twinkle);

      // Trailing chromatic-aberration fringe — same "red one way, blue
      // the other way" channel-split idea as the swirl's own
      // uAberration post-process (see swirl-background.js), but
      // approximated with two opaque offset copies rather than true
      // per-channel sampling (canvas 2D has no cheap equivalent).
      // Two earlier attempts didn't read as clean aberration: fully
      // offset ghosts (1.1x/1.8x of size) looked like three separate
      // dots, and semi-transparent additive ghosts on top of that
      // (0.3x/0.54x offset) looked like a smudgy blur instead of a
      // crisp fringe. Fix: draw the red/blue ghosts fully OPAQUE,
      // *underneath* the equally-opaque main square, at a small fixed
      // offset — same "peek from behind" trick as the About panel's
      // border (see CLAUDE.md gotcha #14) — so the main square covers
      // most of both ghosts and only a thin, crisp sliver peeks out on
      // the trailing edge. All three squares share the same
      // translate+rotate transform (the ghost offset is expressed in
      // the rotated local frame, not world space) so the main square
      // always cleanly covers the ghosts regardless of the particle's
      // current spin — offsetting only in world space would leave an
      // irregular, only-sometimes-covered sliver as the particle
      // rotates independently of its (fixed) direction of travel.
      const cosR = Math.cos(-p.rotation);
      const sinR = Math.sin(-p.rotation);
      const localDirX = p.dirX * cosR - p.dirY * sinR;
      const localDirY = p.dirX * sinR + p.dirY * cosR;

      particleCtx.save();
      particleCtx.translate(p.x, p.y);
      particleCtx.rotate(p.rotation);
      particleCtx.globalAlpha = alpha;
      particleCtx.fillStyle = '#ff3b3b';
      particleCtx.fillRect(-localDirX * 0.7 - p.size / 2, -localDirY * 0.7 - p.size / 2, p.size, p.size);
      particleCtx.fillStyle = '#3bb8ff';
      particleCtx.fillRect(-localDirX * 1.3 - p.size / 2, -localDirY * 1.3 - p.size / 2, p.size, p.size);
      // Subtle bloom via shadowBlur — a native canvas glow, much
      // cheaper than a real blur pass over a separate buffer, applied
      // only to this final main-square fill (not the fringe above)
      // so the fringe stays crisp and only the glow around it is
      // soft. Cost scales with blur radius × shape count, and both
      // are small here (55 tiny squares, ~1.5x their own size), so
      // this shouldn't be a meaningful performance hit.
      particleCtx.shadowColor = p.colour;
      particleCtx.shadowBlur = p.size * 1.5;
      particleCtx.fillStyle = p.colour;
      particleCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      particleCtx.restore();
    });

    requestAnimationFrame(animateParticles);
  }

  resizeParticleCanvas();
  initParticles();
  window.addEventListener('resize', resizeParticleCanvas);
  requestAnimationFrame(animateParticles);
}

// -----------------------------------------
// Hero parallax — no position: sticky/fixed/absolute at all. The
// hero visual gets a continuous translateY at a fraction of scroll
// speed, so it lags behind while .about (untouched, normal scroll
// speed) catches up and rides over it. This is the same technique
// midu.design itself uses (confirmed by inspecting its live DOM —
// its hero visual is a plain translateY(scrollY * 0.4) with no
// special positioning at all).
//
// Past the point where the text reaches heroTextStopY, the transform
// switches from the 0.4x drag to growing 1:1 with scrollY instead —
// that exactly cancels out further scroll, so the text (and the rest
// of the pinned visual, since they move together) holds its position
// on screen instead of continuing to drift up and off. .about keeps
// scrolling up over it as normal from there.
// -----------------------------------------
const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;

const heroParallaxEl = document.querySelector('.hero__pin');
const heroTextEl = document.querySelector('.hero__inner');
const aboutEl = document.querySelector('.about');

if (heroParallaxEl && heroTextEl) {
  const heroParallaxFactor = 0.4;
  const heroTextStopY = navHeight + 24;

  // Natural (untransformed) document-relative top of the text, measured
  // once before any scroll-driven transform has been applied.
  const heroTextNaturalTop = heroTextEl.getBoundingClientRect().top + window.scrollY;
  const heroFreezeScrollY = (heroTextNaturalTop - heroTextStopY) / (1 - heroParallaxFactor);

  // The blobs get a small extra negative offset on top of the pin's own
  // shift, proportional to it — so they always move a bit slower than the
  // text (which just inherits the pin's shift with no extra offset),
  // reading as a subtle layer of depth behind the text.
  const heroBlobLagFactor = 0.15;

  // The frozen hero text used to get covered up by .about's own frozen
  // panel scrolling over it. Now that About scrolls past normally (see
  // the "Work stacking card" comment below) instead of freezing, nothing
  // ever covers the hero text again — it would otherwise sit there,
  // visible through the swirl, for the rest of the page.
  //
  // Fading it out at About's own bottom edge (tried first) was too late:
  // the frozen text sits fixed near the very top of the viewport
  // (nav-height + 24px), but About's panel doesn't fully vacate that
  // same screen band until its bottom edge scrolls all the way past the
  // top of the viewport — well after the panel has stopped covering
  // that high-up band, since the panel is scrolling normally underneath
  // it. That gap let the hero text peek back out before Work's own
  // content arrived. Fading it out at the midpoint of About's own
  // scroll range instead gives it a comfortable margin — gone well
  // before About's bottom gets anywhere near that band. .about doesn't
  // transform, so its document position is stable, but it's remeasured
  // on load/resize since images (the About portrait) can still shift it
  // after this script's first run.
  let aboutFadeScrollY = Infinity;

  function measureAboutFade() {
    if (!aboutEl) return;
    const rect = aboutEl.getBoundingClientRect();
    const aboutTop = rect.top + window.scrollY;
    aboutFadeScrollY = aboutTop + rect.height * 0.5;
  }

  function updateHeroParallax() {
    const scrollY = window.scrollY;
    const translateY = scrollY <= heroFreezeScrollY
      ? scrollY * heroParallaxFactor
      : scrollY - heroFreezeScrollY * (1 - heroParallaxFactor);
    heroParallaxEl.style.transform = `translateY(${translateY}px)`;
    heroParallaxEl.style.setProperty('--blob-shift', `${-translateY * heroBlobLagFactor}px`);
    heroParallaxEl.style.opacity = scrollY >= aboutFadeScrollY ? '0' : '1';
  }

  measureAboutFade();
  updateHeroParallax();
  window.addEventListener('scroll', () => requestAnimationFrame(updateHeroParallax), { passive: true });
  window.addEventListener('resize', () => {
    measureAboutFade();
    updateHeroParallax();
  });
  window.addEventListener('load', () => {
    measureAboutFade();
    updateHeroParallax();
  });
}

// -----------------------------------------
// Work stacking card — same no-sticky, no-fixed translateY-hold
// technique as the hero freeze above, but anchored to the viewport's
// vertical CENTER instead of nav-height: .work__pin scrolls normally
// until it would be centered on screen, then freezes there (a "settle
// in the middle" pause) rather than settling under the nav bar.
//
// Earlier versions relied on Personal visually COVERING the frozen pin
// (translateY growing unbounded, with .work's own overflow: hidden
// eventually clipping it away invisibly) — that needed Personal to be
// an opaque, edge-to-edge backdrop, which directly conflicted with
// Personal having About/CV-style transparent side gutters: an inset
// panel can only cover the CENTER of the full-width frozen carousel,
// leaving its sides exposed to a leak or a hard, ungutter'd clip.
//
// This version caps translateY's growth instead of letting it run
// unbounded: once .work's own natural (untransformed) bottom edge
// would reach the frozen pin's bottom edge, translateY stops
// increasing. Past that point the pin behaves like a normal in-flow
// element again (just offset by the now-fixed transform), so it
// resumes moving upward at the ordinary 1:1 scroll rate — it visibly
// slides up and off screen, "pushed" by Personal scrolling in normally
// underneath, rather than sitting frozen and then vanishing behind an
// opaque cover. The cap point is exactly where Personal's own natural
// top would visually touch the frozen pin's bottom anyway (since
// sections are adjacent in the document with no gap), so the two
// stay in visual contact the whole time it's sliding away — genuinely
// pushed, not just released early. Because Work now vacates the
// screen itself instead of relying on being hidden behind something
// opaque, Personal never needs an opaque backdrop of its own — it can
// stay fully transparent, matching .about/.cv exactly. Note the cap
// (maxTranslateY) works out to sectionBottom - pinHeight - naturalTop
// regardless of where the freeze itself is anchored on screen — it's
// purely "how much .work-internal space is left below the pin," so
// moving the anchor from nav-height to viewport-center didn't need any
// change to that half of the math.
// -----------------------------------------
function setupWorkPin(pinEl) {
  if (!pinEl) return;

  const sectionEl = pinEl.parentElement;
  let freezeScrollY = 0;
  let maxTranslateY = 0;
  // The raw scroll-derived target has a hard velocity change at both the
  // freeze point and the release point — scroll speed suddenly drops to
  // 0, then later suddenly resumes. Applying that target straight to the
  // transform (as an earlier version did) reads as the pin "hitting a
  // wall" and bouncing off it, especially with trackpad/wheel momentum
  // still carrying the page's own scroll smoothly through that instant.
  // currentTranslateY lags the target and eases toward it every frame
  // instead, so the velocity change gets smoothed out over a few frames
  // rather than landing in one.
  let currentTranslateY = 0;
  let animating = false;

  function measure() {
    // Clear any existing transform first so the measurement reflects the
    // pin's natural, untransformed document position and height.
    const prevTransform = pinEl.style.transform;
    pinEl.style.transform = '';
    const pinRect = pinEl.getBoundingClientRect();
    const sectionBottom = sectionEl.getBoundingClientRect().bottom + window.scrollY;
    const naturalTop = pinRect.top + window.scrollY;
    const centeredTop = (window.innerHeight - pinRect.height) / 2;
    freezeScrollY = naturalTop - centeredTop;
    maxTranslateY = Math.max(sectionBottom - pinRect.height - naturalTop, 0);
    pinEl.style.transform = prevTransform;
  }

  function targetTranslateY() {
    return Math.min(Math.max(window.scrollY - freezeScrollY, 0), maxTranslateY);
  }

  function tick() {
    const target = targetTranslateY();
    const delta = target - currentTranslateY;
    if (Math.abs(delta) < 0.05) {
      currentTranslateY = target;
      pinEl.style.transform = currentTranslateY ? `translateY(${currentTranslateY}px)` : '';
      animating = false;
      return;
    }
    currentTranslateY += delta * 0.18;
    pinEl.style.transform = `translateY(${currentTranslateY}px)`;
    requestAnimationFrame(tick);
  }

  function requestTick() {
    if (!animating) {
      animating = true;
      requestAnimationFrame(tick);
    }
  }

  measure();
  currentTranslateY = targetTranslateY();
  pinEl.style.transform = currentTranslateY ? `translateY(${currentTranslateY}px)` : '';
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    requestTick();
  });
}

setupWorkPin(document.querySelector('.work__pin'));

// -----------------------------------------
// Work carousel — center slide is the open link,
// side slides peek and click into the center, looping
// -----------------------------------------
const workCarousel = document.querySelector('[data-work-carousel]');

if (workCarousel) {
  const workSlides = Array.from(workCarousel.querySelectorAll('[data-work-slide]'));
  const workDots = Array.from(document.querySelectorAll('[data-work-dot]'));
  const workTotal = workSlides.length;
  let workActive = 0;

  // Reveal scale — carousel sits 15% smaller until it's scrolled down
  // to viewport center, then grows to full size and stays there for
  // the rest of the page (Personal, CV, etc. don't shrink it back).
  // Only scrolling back up past it — re-approaching from below —
  // shrinks it again.
  //
  // Growth/shrink rate tracks scroll SPEED (px/ms), not just distance
  // scrolled — a plain "step per pixel scrolled" can't tell a fast
  // scroll apart from a slow one covering the same distance, since
  // the total is identical either way. Velocity gives each event a
  // blend factor toward the target: a fast flick blends in most of
  // the way immediately, a slow nudge only blends a little, so it
  // visibly lags/creeps behind the target until you speed up. Purely
  // event-driven (no independent animation loop), so stopping scroll
  // freezes it instantly rather than continuing to ease afterward.
  const workMinScale = 0.85;
  const workRevealSpeed = 0.12;
  let workScale = workMinScale;
  let workLastScrollY = window.scrollY;
  let workLastTimestamp = performance.now();
  let workRevealInitialized = false;

  function updateWorkReveal() {
    const now = performance.now();
    const currentScrollY = window.scrollY;
    const deltaY = currentScrollY - workLastScrollY;
    const deltaTime = Math.max(now - workLastTimestamp, 1);
    workLastScrollY = currentScrollY;
    workLastTimestamp = now;

    const rect = workCarousel.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const maxDistance = window.innerHeight;
    // Only distance on the "not yet reached" (below-center) side counts —
    // once center reaches/passes viewportCenter this clamps to 0, so
    // continuing to scroll down never shrinks it back.
    const distance = Math.min(Math.max(center - viewportCenter, 0), maxDistance);
    const target = workMinScale + (1 - workMinScale) * (1 - distance / maxDistance);

    if (!workRevealInitialized) {
      workScale = target;
      workRevealInitialized = true;
    } else {
      const velocity = Math.abs(deltaY) / deltaTime;
      const blend = Math.min(velocity * workRevealSpeed, 1);
      workScale += (target - workScale) * blend;
    }

    renderWorkCarousel();
  }

  function wrappedDelta(index, active, total) {
    let delta = (index - active) % total;
    if (delta > total / 2) delta -= total;
    if (delta < -total / 2) delta += total;
    return delta;
  }

  function renderWorkCarousel() {
    // offsetWidth is the layout box, unaffected by the scale() transform
    // below — reading getBoundingClientRect() here would pick up whatever
    // transform the active slide was left with by the *previous* render
    // (e.g. still its old, smaller neighbor scale right after a click),
    // making spacing shrink permanently as soon as you click through.
    const spacing = workSlides[0].offsetWidth * workScale * 1.1;

    workSlides.forEach((slide, index) => {
      const delta = wrappedDelta(index, workActive, workTotal);
      const isActive = delta === 0;
      const isNeighbor = Math.abs(delta) === 1;
      const scale = (isActive ? 1 : isNeighbor ? 0.7 : 0.5) * workScale;
      const opacity = isActive ? 1 : isNeighbor ? 0.5 : 0;

      slide.style.transform = `translate(-50%, -50%) translateX(${delta * spacing}px) scale(${scale})`;
      slide.style.opacity = String(opacity);
      slide.style.zIndex = String(isActive ? 3 : isNeighbor ? 2 : 1);
      slide.style.pointerEvents = isActive || isNeighbor ? 'auto' : 'none';

      const tile = slide.querySelector('.work-tile');
      tile.setAttribute('aria-current', String(isActive));
      tile.tabIndex = isActive || isNeighbor ? 0 : -1;
    });

    workDots.forEach((dot, index) => {
      const isActive = index === workActive;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-current', String(isActive));
    });
  }

  function goToWorkSlide(index) {
    workActive = ((index % workTotal) + workTotal) % workTotal;
    renderWorkCarousel();
  }

  workSlides.forEach((slide, index) => {
    slide.querySelector('.work-tile').addEventListener('click', (event) => {
      if (index !== workActive) {
        event.preventDefault();
        goToWorkSlide(index);
      }
    });
  });

  workDots.forEach((dot, index) => {
    dot.addEventListener('click', () => goToWorkSlide(index));
  });

  // Touch swipe — on mobile, the only way to change slides was tapping
  // the small dots, since there's no hover/click affordance for the
  // peeking side tiles the way desktop has. Swipe left/right jumps to
  // the next/prev slide via the same goToWorkSlide() the dots and tile
  // clicks already use (same 0.5s eased transition), rather than
  // dragging the tiles 1:1 with the finger — far less code, and
  // nothing to rubber-band or tune if a drag doesn't complete.
  //
  // Direction is decided once movement clears a small deadzone: only
  // preventDefault (and treat it as a swipe) once horizontal movement
  // clearly leads vertical, so a mostly-vertical touch still scrolls
  // the page normally instead of getting eaten by the carousel.
  let workTouchStartX = 0;
  let workTouchStartY = 0;
  let workTouchIsHorizontal = null;

  workCarousel.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    workTouchStartX = touch.clientX;
    workTouchStartY = touch.clientY;
    workTouchIsHorizontal = null;
  }, { passive: true });

  workCarousel.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    const deltaX = touch.clientX - workTouchStartX;
    const deltaY = touch.clientY - workTouchStartY;

    if (workTouchIsHorizontal === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      workTouchIsHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (workTouchIsHorizontal) {
      event.preventDefault();
    }
  }, { passive: false });

  workCarousel.addEventListener('touchend', (event) => {
    if (!workTouchIsHorizontal) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - workTouchStartX;
    const swipeThreshold = 40;
    if (deltaX <= -swipeThreshold) {
      goToWorkSlide(workActive + 1);
    } else if (deltaX >= swipeThreshold) {
      goToWorkSlide(workActive - 1);
    }
  });

  window.addEventListener('scroll', () => requestAnimationFrame(updateWorkReveal), { passive: true });
  window.addEventListener('resize', updateWorkReveal);
  updateWorkReveal();
}

// -----------------------------------------
// CV expand/collapse — the document starts clipped to a fixed height
// (with a fade-out over the cut-off text) so the CV section doesn't
// dominate page length; clicking the toggle removes the clamp.
// -----------------------------------------
const cvDocumentEl = document.querySelector('.cv__document');
const cvToggleEl = document.querySelector('.cv__toggle');

if (cvDocumentEl && cvToggleEl) {
  const cvToggleLabelEl = cvToggleEl.querySelector('.cv__toggle-label');

  cvToggleEl.addEventListener('click', () => {
    const isExpanded = cvDocumentEl.classList.toggle('cv__document--expanded');
    cvToggleEl.setAttribute('aria-expanded', String(isExpanded));
    cvToggleLabelEl.textContent = isExpanded ? 'Show less' : 'Read full CV';
  });
}

