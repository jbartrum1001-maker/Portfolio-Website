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

// Hero swirl background — replaces the old radial-gradient blob glow.
// See assets/background/swirl-background.js for the effect itself;
// colours below are retuned from its default red/blue marble to stay
// on the site's warm red/orange palette (same ramp the old blob and
// the section-heading glow both use) instead of introducing blue.
const heroSwirlEl = document.querySelector('.hero__swirl');

if (heroSwirlEl && typeof SwirlBackground !== 'undefined') {
  new SwirlBackground({
    container: heroSwirlEl,
    balance: 0.72,
    settle: 0.3,
    resolutionScale: 0.5,
    colours: {
      redDark: '#150402', redMid: '#7a1f10', redLight: '#d4562c',
      blueDark: '#050505', blueMid: '#120a0a', blueLight: '#241212',
      highlight: '#fff4e0'
    }
  });
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

  function updateHeroParallax() {
    const scrollY = window.scrollY;
    const translateY = scrollY <= heroFreezeScrollY
      ? scrollY * heroParallaxFactor
      : scrollY - heroFreezeScrollY * (1 - heroParallaxFactor);
    heroParallaxEl.style.transform = `translateY(${translateY}px)`;
    heroParallaxEl.style.setProperty('--blob-shift', `${-translateY * heroBlobLagFactor}px`);
  }

  updateHeroParallax();
  window.addEventListener('scroll', () => requestAnimationFrame(updateHeroParallax), { passive: true });
}

// -----------------------------------------
// About / Work stacking cards — same no-sticky, no-fixed technique as
// the hero freeze above, just reused per section instead of once at the
// top of the page. Each pin element scrolls normally right up until its
// top edge reaches nav-height; from that scrollY on, a translateY that
// grows 1:1 with scroll exactly cancels further motion, holding it
// there. The next section (plain, untouched, normal 1x scroll speed)
// keeps climbing the document as usual and visually rides over the
// frozen one — no z-index/sticky trickery needed for the "cover" part,
// it falls out of plain DOM paint order (see the CSS comments on
// .about/.work for the one thing that has to stay true for that: neither
// section can carry its own z-index).
//
// The transform goes on the INNER .about__pin / .work__pin, never on the
// section itself — the outer section stays untransformed, at its own
// natural bounded height, with overflow: hidden. That's what makes the
// freeze self-limiting: once the outer section's own box has scrolled
// fully past the viewport, its overflow: hidden clips the (still
// "frozen") pin away with it, same as .hero / .hero__pin above. Applying
// the transform to the section itself instead — tried first — freezes
// forever with nothing to clip it, so it stays glued under the nav bar
// permanently and shows back through once the covering section's own
// box has scrolled on past that same band.
// -----------------------------------------
function setupStackPin(pinEl) {
  if (!pinEl) return;

  let freezeScrollY = 0;

  function measure() {
    // Clear any existing transform first so the measurement reflects the
    // pin's natural, untransformed document position.
    pinEl.style.transform = '';
    const naturalTop = pinEl.getBoundingClientRect().top + window.scrollY;
    freezeScrollY = naturalTop - navHeight;
  }

  function update() {
    const scrollY = window.scrollY;
    const translateY = scrollY > freezeScrollY ? scrollY - freezeScrollY : 0;
    pinEl.style.transform = translateY ? `translateY(${translateY}px)` : '';
  }

  measure();
  update();
  window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', () => {
    measure();
    update();
  });
}

setupStackPin(document.querySelector('.about__pin'));
setupStackPin(document.querySelector('.work__pin'));

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

