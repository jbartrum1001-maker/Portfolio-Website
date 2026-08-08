# Jack Bartrum Portfolio Site

Single-page portfolio for Jack Bartrum, MA Advertising student. Plain HTML/CSS/JS,
no build tooling, no framework, no dependencies beyond Google Fonts.

## Structure

- `index.html` — the entire site. One page, six `<section>`s inside `<main id="top">`,
  in order: `#hero`, `#about`, `#work`, `#personal`, `#cv`, `#contact`. Fixed header/nav
  above `<main>`.
- `css/style.css` — all styles, single file, organized in commented blocks matching the
  HTML sections top to bottom.
- `js/main.js` — mobile nav toggle, hero parallax, Work carousel, the site-wide swirl
  background and particle sparkles (see below). No libraries. (No longer has a custom
  cursor — built, then removed by explicit request; see "Custom cursor (built, then
  removed)" below.)
- `assets/` — exists with `background/`, `cv/`, `icons/`, `images/` subfolders (flat
  categories, not nested per-content-type — there's no `work/`/`personal/` split inside
  `images/`).
  - `background/swirl-background.js` — the vendored `SwirlBackground` WebGL class (no
    dependencies, not npm-installed) that renders the site-wide background — see
    "Persistent swirl background" below. `background/example-usage.html` is the
    original usage reference it shipped with, not part of the live site.
  - Real files have started landing in `images/`: `Zermatt.jpg` (work tile photo),
    `zermatt-logo.png` (wordmark, transparent PNG), `temp-about-pic.jpg` (About's
    portrait — a real photo, but explicitly a placeholder/temp one per its filename,
    not necessarily the final image), and now `kodak-temp.png`, `twix-temp.png`,
    `theatre-temp.jpg` (work tile photos for the three previously flat-color
    placeholder tiles — same "temp" naming caveat as the About portrait applies).
    Convention: drop new images straight into `assets/images/`, kebab-case filenames,
    no spaces — exported files often arrive as e.g. `Zermatt logo.png` or
    `kodak_temp.png`; rename before wiring in (see gotcha below). Real CV PDF now
    lives at `assets/cv/jack-bartrum-cv.pdf`, linked from the CV section's download
    button.
- `work/`, `personal/` — not yet created. Individual project detail pages linked from
  the Work and Personal tiles (see Outstanding work below).

**Git.** The project is now a git repo (it wasn't originally — initialized partway
through, specifically so visual experiments could be tried and cleanly reverted rather
than hand-restoring CSS). Commits tend to be one per discrete visual change, with commit
messages doubling as a changelog of *why*, not just *what* — check `git log` before
re-deriving the reasoning behind a change from scratch. `git revert <hash>` is the
default way to back out something that didn't land right.

To preview locally: `.claude/launch.json` runs `py -m http.server 8765` (not
`python3` — on this Windows machine `python3`/`python` resolve to a Microsoft Store
alias stub that errors instead of launching Python, even though a real Python 3 install
exists; `py`, the Python Launcher, is the one that actually works here). Open
`http://localhost:8765`. See the caching gotcha below before trusting what you see —
it bites often enough in this project that it's worth reading before you conclude a
change "isn't working."

## Design system

Three-font system, applied consistently:
- `--font-display`: Playfair Display — section headings, hero name, work tile logos, CV name.
- `--font-mono`: JetBrains Mono — nav, meta/labels, tagline, badges, CV contact/labels, buttons.
- `--font-body`: Inter — body copy.

Dark theme sitewide via CSS custom properties in `:root` (`css/style.css`):
`--color-bg: #0a0a0a`, `--color-text: #f4f1ec`, `--color-muted`, `--color-border`,
`--color-surface`, `--color-surface-dark`. The CV document (`.cv__document`) is a
deliberate exception — hardcoded as a light "paper" card, not themed via variables.

Spacing scale: `--space-xs` through `--space-xl`. Layout tokens: `--nav-height: 64px`,
`--max-width: 1200px`, `--gutter: 24px`.

## Architecture notes worth knowing before editing

**Scrolling is plain, sitewide — no scroll-snap.** `html` has `scroll-behavior: smooth`
only. `main > section` just sets `min-height: 100vh` plus flex centering; sections
scroll normally with no snapping. The hero is the one exception (see below).

**Hero parallax — deliberately NOT `position: sticky`/`fixed`/`absolute`.** `.hero`
is a normal, single-viewport section. `.hero__pin` (holding the name/tagline text —
no longer the background visual, see "Persistent swirl background" below) is
`position: relative` — completely normal in the document flow. `js/main.js` applies
one continuous `transform: translateY(scrollY * 0.4)` to it on scroll, so it visually
lags behind at 40% of normal scroll speed.

Past a computed scroll position (`heroFreezeScrollY`, chosen so the text lands
`--nav-height + 24px` from the top), the transform formula switches to grow 1:1 with
`scrollY` instead of the 0.4x drag — that exactly cancels further scrolling, so the
text holds its screen position instead of continuing to drift up and off.

**`.hero` deliberately has no `overflow: hidden` (unlike `.about`/`.work` — see gotcha
#8).** It used to: that clip was what made the frozen `.hero__pin` disappear once
`.hero`'s own 100vh box scrolled past, timed to coincide with `.about`'s old full-bleed
opaque background reaching the same screen position. Once About became a narrower
inset panel with its own separate freeze timing (see "About panel" below), that timing
assumption broke — the text would vanish into empty swirl-only space *before* the
panel visually arrived, an invisible cutoff with nothing on screen to explain it. Fix:
removed the clip. The frozen `.hero__pin` (held by `transform`, which never affects
layout/document height) now just sits there indefinitely at its frozen screen
position; `.about__pin`, being later in the DOM, always paints on top of it wherever
they visually overlap, so the *panel itself* is what visibly covers/overrides the text
as it scrolls up — not an invisible section boundary. This is a deliberate,
hero-specific exception to gotcha #8's general rule, made possible because hero has
nothing behind it that still depends on the old clip-based self-limiting behavior.

This replaced two earlier attempts that both failed in real browsers despite
looking correct in an automated/headless test browser: first `position: sticky`
(broke silently in both Safari and, later, in a real desktop Chrome — never fully
root-caused, but reliably reproduced by the user while every automated check looked
fine), then a manual `position: fixed` → `position: absolute` toggle driven by a
scrollY threshold (more reliable than sticky, but still untested against the
original bug). The `translateY` approach was reverse-engineered by inspecting
midu.design's own live DOM (the reference site for this effect) — its hero visual
uses exactly this technique, no special positioning at all. **If this effect ever
needs rebuilding again: don't reach for `position: sticky` or `fixed`/`absolute`
toggling — a plain scroll-linked `transform` on a normally-flowing element is the
one version that's actually held up.** Also: an automated/headless Chromium test
browser is not sufficient evidence that a scroll effect works — it has repeatedly
diverged from real Chrome/Safari behavior in this project; treat it as a sanity
check, not proof.

**Hero text fades out partway through About, instead of relying on a cover.** The
frozen `.hero__pin` used to get visually covered by `.about__pin` once About froze at
the same screen band too (see "Scroll-stacking cards" below for why that no longer
happens). Once About stopped freezing, nothing covered the hero text again — it would
otherwise sit there, visible through the swirl, for the rest of the page, since About
and Work are both transparent now. Fix, in `js/main.js`: `measureAboutFade` computes
`aboutFadeScrollY` as the *midpoint* of `.about`'s document-relative scroll range (top
+ half its height, not its bottom edge — see below for why), measured once on load and
remeasured on `resize`/`load` (images, notably the About portrait, can still shift
`.about`'s height after the script's first run). `updateHeroParallax` sets
`heroParallaxEl.style.opacity` to `0` once `scrollY` passes that point, `1` before it;
`.hero__pin` has `transition: opacity 0.3s ease` so it fades rather than snapping off.
Fading at About's *bottom* edge (tried first) was too late: the frozen text sits fixed
very near the top of the viewport (`nav-height + 24px`), but About's own bottom edge
has to scroll all the way past the top of the viewport before that high-up band is
genuinely clear of it — well after About has visually stopped covering that band while
scrolling normally underneath, which let the text peek back out before Work's content
arrived. Fading at the *midpoint* of About's scroll range instead gives it a
comfortable margin — gone well before that gap can open up.

**Scroll-stacking cards (Work → Personal) — a genuine push-off, not a freeze-and-cover.**
`.work__pin` freezes in place via the same no-`position: sticky`/`fixed` `translateY`-hold
technique as the hero freeze, but anchored to the viewport's vertical *center* rather
than `--nav-height` — it scrolls normally, then settles in the middle of the screen (a
"settle in the middle" pause) and holds there while Personal scrolls up underneath.
Implemented as `setupWorkPin` in `js/main.js` — a purpose-built function, not the
generic `setupStackPin` the doc used to describe here (removed; see below for why).

This landed here after several different designs, because two things it needed kept
pulling against each other: Work settling then getting visibly **pushed away**, and
Personal having the **same About-style panel** (inset gutters, swirl showing through
the sides) as About/CV.

1. **Original design: freeze near the nav, Personal as an opaque full-bleed cover.**
   `translateY` grew unbounded once frozen; `.work`'s own `overflow: hidden` eventually
   clipped the frozen pin away once `.work`'s own box scrolled fully past, and
   Personal — a plain, edge-to-edge `background-color` rectangle with an upward-cast
   `box-shadow` — visually covered it in the meantime via ordinary DOM paint order (no
   `z-index` on either section). Worked, but Personal had no panel.
2. **Personal given the About-style panel (inset gutters, transparent section).** Broke
   the cover immediately: an inset panel can only cover the *center* of the full-width
   frozen carousel, so its sides stayed exposed until `.work`'s clip caught up — read
   as a hard, jarring cutoff, confirmed in the user's real browser (this tool's own
   screenshots weren't reliable evidence either way during this investigation — see
   gotcha #13).
3. **Freeze dropped entirely.** Work just scrolled normally, like About already does.
   Fixed the cutoff, but lost the settle/push effect, and surfaced an unrelated bug:
   `.work-carousel`'s own box runs taller than `.work`'s content box at some viewport
   sizes, so removing `overflow: hidden` let it visually leak into Personal's
   transparent gutters — `overflow: hidden` on `.work` had been doing double duty
   (freeze self-limiting *and* carousel containment) the whole time.
4. **Freeze restored, Personal given a full-bleed opaque backdrop again** (colour-matched
   to the panel colour, not `var(--color-bg)` — a near-black backdrop behind a lighter
   panel read as a stark seam) **with the panel floating on top of it.** Produced a
   clean push, confirmed against a user-supplied mockup — but sacrificed the
   swirl-through-gutters look Personal was supposed to have.
5. **User explicitly reverted Personal back to plain** (no panel, no freeze-dependent
   backdrop) **to reset, then asked for the panel back** — at which point dropping the
   freeze (step 3's fix) was reapplied so Personal could go back to being genuinely
   transparent, same as About/CV.
6. **Final design: keep the freeze, but make Work push itself away instead of relying
   on Personal to cover it.** `setupWorkPin` freezes `.work__pin` centered in the
   viewport, then **caps `translateY`'s growth** once `.work`'s own natural
   (untransformed) bottom edge would reach the frozen pin's bottom, instead of letting
   it grow unbounded and relying on an invisible clip. Past that cap, the transform
   stops changing, so the pin resumes moving at ordinary 1:1 scroll speed and visibly
   *slides* up and off screen — "pushed" by Personal scrolling in normally underneath,
   not covered by it. Because Work now genuinely vacates the screen instead of needing
   to be hidden behind something opaque, Personal can be fully transparent with its own
   inset panel (see "Personal Projects and CV panels" below) with zero conflict — the
   two requirements that fought each other in steps 1–5 weren't actually in tension
   once the *mechanism* changed from "cover" to "push."

The cap point is chosen so Work and Personal stay in visual contact the whole time
Work is sliding away, not just released early: it's exactly where Personal's own
natural top edge would visually touch the frozen pin's bottom edge (sections are
adjacent in the document with no gap), which reduces to `sectionBottom - pinHeight -
naturalTop` — see the full derivation in `main.js`'s comment above `setupWorkPin`. That
math is independent of *where* the freeze itself is anchored on screen, which is why
re-anchoring the freeze from nav-height to viewport-center (a later, separate request)
needed no change to the cap calculation.

**Motion is lerp-smoothed, not applied directly from the scroll position.** The raw
scroll-derived target has a hard velocity discontinuity at both the freeze point
(scroll speed drops to 0 instantly) and the release point (resumes instantly) — applying
it straight to the transform (an earlier version of `setupWorkPin` did exactly this)
read as the pin "hitting a wall and bouncing off it," especially under trackpad/wheel
scroll momentum. Fixed by keeping a separate `currentTranslateY` that eases 18% of the
way toward the scroll-derived target every `requestAnimationFrame`, instead of snapping
straight to it — the loop self-terminates once within 0.05px of the target rather than
running forever. See gotcha #17.

`.work__pin` and `.work` (`overflow: hidden`, no `z-index`) still matter for the same
structural reasons as before (see gotcha #8), but the "next section covers the frozen
one via plain DOM paint order" rule that used to govern the `.work__pin` → `.personal`
relationship no longer applies there — nothing needs to visually paint over anything
between Work and Personal anymore, since Work moves itself out of the way. That rule
still governs `.about__pin` painting over the frozen hero text, untouched by any of
this (see below).

**About dropped out of this kind of chain entirely, well before the Work/Personal saga
above — it now scrolls continuously, uninterrupted, like Personal/CV/Contact.**
`setupStackPin(document.querySelector('.about__pin'))` was removed from `js/main.js`,
and `.about` lost its `overflow: hidden` (nothing left to clip — see gotcha #8's
general rule, which `.about` no longer needs an exception to). This was a direct fix
for a "cut off by an invisible border" complaint: once `.work`'s own background went
transparent (see "About panel"/Work carousel below), there was nothing opaque left to
cover the frozen About panel once it hit `.about`'s own `overflow: hidden` boundary —
instead of a smooth cover, the panel just vanished at a hard rectangular clip line
mid-scroll. This is the *exact same failure mode* Work/Personal hit later (step 2
above) — dropping About's freeze was effectively the first attempt at Work/Personal's
problem too, tried long before the push-based redesign resolved it without giving up
the settle effect.

**Tried, reverted, then successfully rebuilt: animated section backgrounds.** An early
attempt at a decorative moving background behind About/Work/Personal/CV content — a
fixed sitewide ASCII sphere, then a per-section ASCII "ocean" band, then a full-section
canvas flow-field — was tried and fully reverted ("for now," per the user). It was
later revisited from scratch, successfully, as the WebGL swirl described below —
different implementation, but the two lessons from the first attempt are exactly what
made the second one work: (1) a background sitting behind content needs `z-index: -1`
inside a container with `isolation: isolate`, or an opaque section background hides it
outright — this killed the original ASCII sphere, and directly informed how
`.hero__pin` was set up for the blob/swirl (see gotcha #2); (2) whether a pin should
stretch to the section's full height or hug its natural content height depends on
whether the background is full-bleed or edge-confined — directly relevant now that
About's panel is deliberately narrower than its section (see "About panel" below).

**Persistent swirl background.** `.site-swirl` (`css/style.css`, near the top, above
the header rules) is a single `SwirlBackground` WebGL canvas
(`assets/background/swirl-background.js`) instantiated once in `js/main.js` and
positioned `position: fixed; inset: 0; z-index: -1` at the *body* level — a sibling of
`<header>`, not nested inside any section. This is deliberate: `position: fixed`
escapes every section's own `overflow: hidden`/`transform` entirely (the same trick
`.bottom-glass` already relied on), which is what lets one canvas serve as a genuinely
persistent, never-scrolling backdrop for the whole page rather than a per-section
effect. This replaced an earlier version where the hero and About each had their *own*
separate `SwirlBackground` instance — abandoned because the user specifically wanted
one continuous background that sections scroll/pin *over*, not multiple independent
ones that happen to look similar.

Sections that want the swirl visible just need a transparent background of their own
(`.hero__pin`, `.about`, and now `.work` all have none) — anything else painted in a
normal (non-negative) `z-index`, which is every section by default, naturally paints
over the fixed layer with zero extra effort. Personal/CV/Contact still have their
original opaque backgrounds, so the swirl doesn't show through them (yet — see
Outstanding).

The shader's default red/blue "marble" palette went through several retunes before
landing on the current one. First, a warm red/black ramp matching the site's original
hero-blob palette and the section-heading glow, instead of introducing blue. Then a
dark-navy / steel-blue / icy-highlight ramp matching a reference photo the user
supplied, explicitly *introducing* blue. Then `redLight` alone, from `#3f7fad` to
`#60a3d8`, on feedback that the swirl had plenty of dark/navy and mid-blue but not much
distinctly *lighter* blue (the old value sat at nearly the same luminance as `blueMid`,
leaving a gap before `blueLight`'s icy highlight).

**Current palette: a dark teal-gray, not blue, matched directly to a Balatro screenshot's
smoky background.** Per an explicit request to match that reference "exactly," the user
colour-picked four values straight off the screenshot across its brightness range —
`#111a1b` (darkest), `#162222`, `#1a2325`, `#2b383b` (lightest) — and both of the
shader's colour "families" (`redDark`/`redMid`/`redLight` and
`blueDark`/`blueMid`/`blueLight`, just its own generic internal names for its two blend
ramps, not a literal red-vs-blue split) reuse those same four picked values (both
`redLight`/`blueLight` = the lightest pick), so the blend still reads as one cohesive
tone rather than two competing hues. `highlight` (`#4a5c5f`) is the one extrapolated
value — lighter than the lightest pick, along the same teal-gray direction, since the
shader needs something brighter than the ramp itself for specular speckle detail (see
`gloss` below). `balance`/`settle`/`resolutionScale` are untouched from their prior
tuning — only the palette itself changed here, not the shape or motion of the swirl.

Three more shader options are now overridden from their defaults, all added alongside
this palette trial:
- **`contrast`: `2.2` (default) → `1.3`.** The shader clamps its noise-driven light/dark
  mix after scaling it by this value — at the default, over half the canvas clips to
  pure dark or pure highlight rather than blending, reading as separate "light patches"
  and "dark patches" instead of one evenly-mixed swirl (exactly what got reported as
  "not an even spread"). `1.3` clips only the extreme tails, so most of the canvas
  blends continuously.
- **`gloss`: `1.2` (default) → `1.8`.** `highlight` is a separate specular sparkle
  added on top of the base ramp (`col += uHighlight * spec * uGloss` in the shader),
  not part of the dark/mid/light blend above — `gloss` is the only exposed multiplier
  on it, raised so the icy highlight flecks read more strongly, per a request for "a
  bit more of our icy highlights."
- **`speed`: `0.5` (default) → `0.1`** (by way of `0.3`). Pure motion-rate multiplier —
  rotation drift, flow warp, and detail turbulence all scale by it, nothing else does —
  slowed twice on feedback that the swirl felt too fast/"sea sicky" for an ambient
  background, even after the first cut to `0.3`. An initial "juddery" report at `0.3`
  turned out to be an unrelated first-launch hitch, not a real performance problem — no
  `resolutionScale` change was needed to fix it.

`resolutionScale` (currently `0.4`) renders the canvas at a fraction of its
actual displayed size — the shader is fragment-heavy, so this is a real, significant
GPU-cost win (a straight `scale²` reduction in pixels computed per frame), and because
the shader samples with `gl.LINEAR` filtering, the upscale reads as a deliberately
soft, chunky, slightly-low-res look (reference: Balatro's card-shader backgrounds)
rather than jagged pixelation. Tune this one number to trade sharpness for performance
in either direction. `.site-swirl`'s own `filter` used to also carry
`brightness(0.5)` (later `0.8`) to darken the shader's raw output for the site's
near-black theme — dropped entirely (now just `filter: saturate(1.1)`) once the
palette above was matched directly off a reference screenshot at its own true
brightness; stacking a brightness filter on top of already-correct colours was just
darkening them a second time past the actual target.

**CRT scanlines (sitewide).** `.site-scanlines` sits right next to `.site-swirl` in
both the CSS and the DOM (same `position: fixed; z-index: -1`, placed *after*
`.site-swirl` so it paints on top of it — equal negative-`z-index` siblings stack in
tree order) — a `repeating-linear-gradient` + radial vignette, `mix-blend-mode:
multiply`, low opacity (`0.18`), adapted from `assets/background/example-usage.html`'s
`.crt` recipe but dialed back so it reads as a faint texture, not an overt effect. Pure
CSS, no JS. Originally hero-only (`.hero__scanlines`), moved sitewide alongside the
swirl for the same reason the swirl itself went sitewide.

**Particle sparkles (sitewide).** `.site-particles` (`css/style.css`) is the third fixed
`z-index: -1` body-level layer, same recipe as `.site-swirl`/`.site-scanlines` but
placed *last* in the DOM so it paints on top of both — specifically so `.site-scanlines`'
own `mix-blend-mode: multiply` (which only darkens whatever's *underneath* it in paint
order) doesn't dim the sparkles. Unlike `.site-swirl`, this is a plain 2D canvas built
directly in `js/main.js` (not the vendored WebGL `SwirlBackground` class, and not in
`assets/background/` — it's site-specific code, not a vendored dependency) — `fillRect`
squares are cheap enough per-pixel that it needs none of the WebGL shader's
`resolutionScale`-style performance tuning. Built per a Balatro reference screenshot's
floating debris effect: small squares, `PARTICLE_COUNT = 35` (down from an initial `55`,
felt too packed-in), each 2–7px, drifting at its own randomized velocity (±4px/s — was
briefly bumped to ±17.5px/s on a "too static" complaint, then reverted straight back
once that read as too much simultaneous motion; the original slow drift was already the
right "static but floaty" feel), rotating at its own randomized rate, and twinkling via
a sine-wave opacity pulse — all randomized per-particle so they don't move in lockstep.
Colours are three exact values colour-picked off the reference screenshot: `#f1f6f2`
(near-white), `#d6b88b` (warm tan/gold), `#88c7c5` (cyan-teal), one assigned per
particle at random. `baseOpacity` (`0.6`–`1.0`) and the twinkle's opacity floor (never
below 70% of `baseOpacity`) were both raised from lower initial ranges once the
particles read as too dim/faded most of the time to look as bright as the reference.

Two more effects layer on top of the base square, both went through failed attempts
before landing:
- **Trailing chromatic-aberration fringe**, echoing `.site-swirl`'s own `uAberration`
  post-process (see "Persistent swirl background" above) — red offset one way, blue
  the other, along the particle's fixed heading (`dirX`/`dirY`, computed once at spawn
  since a particle's velocity never changes) rather than radiating from screen center.
  Canvas 2D has no cheap true per-channel sampling, so it's approximated with two
  small opaque squares. First attempt offset them far enough to sit clearly apart from
  the main square (read as three separate dots, not a fringe); second attempt made them
  semi-transparent and closer together with additive (`lighter`) blending (read as a
  smudgy blur, not a clean edge). **Fix: draw the red/blue copies fully opaque
  *underneath* the equally-opaque main square**, at a small offset (currently `0.7`/
  `1.3` — pulled in from an initial `1.4`/`2.6` per feedback that it trailed off too
  far) — same "peek from behind" trick as the About panel's border (gotcha #14): the
  main square covers most of both ghosts, leaving only a thin, crisp sliver on the
  trailing edge. All three squares share one `translate`+`rotate` transform, with the
  ghost offset expressed in that *rotated local frame* (`localDirX`/`localDirY`, the
  world-space heading rotated by `-p.rotation`) rather than world space — otherwise the
  main square's own independent spin would only sometimes line up to cover the
  axis-aligned ghosts underneath, leaving an irregular sliver instead of a consistent
  one.
- **Subtle bloom** via `shadowBlur`/`shadowColor` (`p.size * 1.5` radius) on the main
  square's fill only — a native canvas glow, much cheaper than a real blur pass over a
  separate buffer, which is why it was fine to add despite the general "watch
  performance" caution that came with the request. Deliberately *not* applied to the
  fringe squares above it, so the fringe stays crisp and only the glow around the whole
  particle is soft.

**Mix-blend-mode text inversion depends on `.hero__pin`, not the text itself, having
`mix-blend-mode: difference`.** `.hero__name`/`role`/`tagline` are plain white text
with no blend-mode of their own. This looks backwards but is required: `.hero__pin`
has a JS-applied `transform` (the parallax drag/freeze above), and *any* active
`transform` on an element makes it establish its own stacking context — which silently
blocks `mix-blend-mode` on its descendants from ever compositing against anything
outside that boundary, `.site-swirl` included, regardless of `isolation`. Putting the
blend-mode on `.hero__pin` itself sidesteps this: it's evaluated at the point the pin
composites into its own (untransformed) parent, so it correctly blends the whole
flattened pin against the swirl. Since the rest of the pin's box is transparent, only
the painted text is actually affected — visually equivalent to blending the text
alone. See gotcha #10 before "fixing" this back the other way; it was tested
extensively and the isolation-based theory was wrong.

**About panel.** `.about__pin` used to be a scroll-freeze wrapper (see "Scroll-stacking
cards" above for why that was dropped). **Current architecture — note this has drifted
from an earlier version of this doc that put the background/clip-path on `.about__grid`
instead; that got reverted back at some point without the doc catching up, so trust
this version over any memory of the old one.** `.about__pin` itself is the panel's
actual visible surface: it carries the solid `background-color`, the pixel-corner
`clip-path`, and the padding. `.about__grid` (a plain in-flow child) is layout-only —
`width: 100%`, `display: grid`, no background or clip-path of its own. `.about__pin` is
`display: flex; align-items: center`, so `.about__grid` sits centered at its own
(content) height inside `.about__pin`'s box; `.about__pin` carries
`min-height: calc(100vh - var(--nav-height) - var(--space-lg))` so the panel reads as a
near-full-page card instead of a small box floating in a mostly-empty section.
`margin-inline: clamp(16px, 4vw, 72px)` insets the panel from `.about`'s own transparent
edges so the persistent swirl still shows as a side gutter. `.about` itself has no
`background-color` of its own — see the original reasoning below about the seam that
created against the now-continuous hero/About background — but as of the pixel-card
border trial below, it *does* now carry a `filter`. Only About has this panel treatment
so far; Work has its own per-tile version (see Work carousel below); Personal/CV are
unchanged (see Outstanding).

**About panel border — lives on `.about`, not `.about__pin`, because of a clip-path/
filter ordering bug.** A pixel-stepped border was added to match a Balatro reference
card's outlined style, at the user's chosen colour (`#1f2426`, same family as the
portrait shadow below). A plain CSS `border`/`outline` won't work here — both draw
along the element's rectangular border box, which `.about__pin`'s own `clip-path` then
cuts down to the pixel-staircase shape, clipping the border away right at each stepped
corner. `filter: drop-shadow(...)` was used instead, since each `drop-shadow` duplicates
the element's actual rendered (already-clipped) alpha silhouette and offsets it, tracing
the staircase corners instead of the rectangle.

The first attempt put this `filter` directly on `.about__pin` — and it was **completely
invisible**, even at an unmissable diagnostic magenta, confirmed in the user's real
Chrome (not just this tool's Browser pane, which — per gotcha #13 — wrongly appeared to
show it working and cannot be trusted here). Root cause: **`clip-path` is applied
*after* `filter` in the rendering order, on the same element.** A `drop-shadow`'s bleed
extends beyond the element's original box, but if that same element also has a
`clip-path`, the clip-path then clips the *filtered* result back down to (approximately)
the original unclipped shape — silently removing the shadow's peeking sliver entirely.
This is the same underlying lesson as gotcha #12 (clip-path clips an element's whole
painted output, not just its own background) applied to `filter` instead of a
pseudo-element child; see gotcha #14 for the full writeup. **Fix: host the `filter` on
`.about` instead** — `.about__pin`'s plain, clip-path-free parent section — so nothing
clips the shadow bleed before it reaches the screen. Eight `drop-shadow`s (four axis +
four diagonal, diagonals scaled by `1/√2` so every copy sits the same radius from the
silhouette) currently at a 6px/4.25px radius (halved once from an initial 12px/8.5px,
per feedback, after the placement fix was confirmed working) stack into a uniform
outline that traces `.about__pin`'s staircase corners reasonably well — though at this
width relative to the corner-cut scale, it reads more like a gently rounded corner than
a crisp staircase replica.

Corner shape is still a hand-built pixel-staircase `clip-path` (`--pixel-corner-step`,
currently `6px` × 9 cells per corner) for Balatro-style blocky corners instead of a
smooth `border-radius`, but the actual curve math went through three attempts before it
looked right:
1. **Equal-size steps** (the original version). These always trace a straight 45° line
   no matter how many steps you use — more steps only smooths the diagonal, never
   curves it, since a uniform staircase is geometrically a straight line at any
   resolution. Read as a triangular chamfer, not a rounded corner, regardless of step
   count.
2. **A quarter-circle sampled per-cell, but the wrong circle** — one centered on the
   panel's own outer corner (`y = sqrt(R² − x²)`) rather than one inset by the radius.
   This put the wide flat run at the wrong end of the curve and still read closer to a
   chamfer than an actual curve.
3. **The real rounded-rect corner circle** — centered `R` cells in from both edges
   (`y = R − sqrt(R² − (R−x)²)`) — combined with deliberately chunky, multi-cell steps
   rather than one cell per step: the first step off the steep edge alone drops 4 cells,
   then 2, then three single-cell steps carry the middle of the curve (where the slope
   crosses 45°), then two widening steps (2 cells, then 4) carry it into the shallow
   edge. That step *pattern*, not just the corrected circle formula, is what actually
   produces a curved silhouette instead of a diagonal one — this is the version live now.

**About panel color and shadow — an explicit trial, not the final look.** The panel's
`background-color` (currently `#2e3537`, on `.about__pin` — see the architecture note
above) is a placeholder ahead of a full sitewide colour-scheme pass. It was originally
`#3d6989`, picked — along with the About text-shadow color `#102245` below — to sit
against the swirl's *old* blue palette; both were retuned to the current dark
charcoal/teal values (`#2e3537` panel, `#1f2426` portrait shadow + border) once the
swirl itself moved to its teal-gray Balatro-match palette (see "Persistent swirl
background" above), so the panel reads as part of the same tonal family instead of
clashing with it. The two colours were also *briefly* swapped with each other (panel
→ `#1f2426`, border/shadow → `#2e3537`) on request, then reverted back to this
assignment shortly after — if asked to try that swap again, it's a straightforward
value exchange between `.about__pin`'s `background-color`, `.about`'s border `filter`,
and `.about__portrait::before`'s `background-color`.

An earlier hard offset *panel* shadow (a solid `#102245` copy of the panel's own
pixel-corner shape, offset behind and to the lower-left — the same "sticker" idea as the
About-portrait shadow below) was built and made to render correctly: at the time,
`.about__pin` was background/`clip-path`-free specifically so a `::before` shadow
pseudo-element could sit behind `.about__grid`'s background instead of in front of it (a
negative `z-index` child does not automatically paint behind its *own* parent's
background — see gotcha #11, which is exactly what broke the first attempt at this).
Despite rendering correctly by every DOM-level check, it was reverted at the user's
request after still looking wrong in their real browser — never root-caused, and
muddied further by the in-tool screenshot testing that session turning out to be
independently unreliable at that same scrolled position (see gotcha #13). **The panel
itself currently has no drop-shadow of its own** (though it does now have the pixel-card
border described above, which is a different effect built later and unrelated to this
reverted attempt). If a panel shadow is revisited, re-read gotchas #11, #12, and #14
first, and verify in a browser tab the user can actually see, not just this tool's
screenshot capture.

**About copy — replaced the "About" heading with a quote-style layout, per a reference
image.** `.about__copy` no longer opens with `<h2 class="section-heading">About</h2>`;
it opens with `.about__label` (a small `- about -` line in `--font-mono`, muted/
translucent white) followed by `.about__quote` (a large `--font-display` line —
currently placeholder copy, "Insightful quote that will make people hire me"), with the
original Lorem ipsum paragraph kept unchanged below both. `.about__quote` is sized via
`clamp(2.25rem, 5vw, 3.75rem)` — deliberately much larger than `.section-heading`'s
`clamp(1.75rem, 4vw, 2.5rem)` — specifically to match the reference image's dramatic
size contrast between headline and body copy. Neither `.about__label` nor
`.about__quote` carry the hard offset text-shadow the old "About" heading had (the
`.about .section-heading` override); that rule was deleted outright along with the
heading it styled, per explicit instruction to remove the shadow when this layout was
rebuilt. `.about .section-heading` no longer exists as a selector — every *other*
section's heading still gets the shared red pulse glow from the base `.section-heading`
rule, completely untouched by any of this.

**About portrait — pixel-art circle, not `border-radius`, moved to the left column.**
`.about__portrait-frame` used to be a portrait-oriented (4:5) rectangle on the right;
it's now a square (`aspect-ratio: 1/1`) circle on the left (DOM order swapped,
`.about__grid`'s desktop `grid-template-columns` flipped from `1.2fr 1fr` to `1fr
1.2fr` to match), holding a real `<img>` (`assets/images/temp-about-pic.jpg`,
`object-fit: cover`) instead of the old `Portrait` placeholder label. Its circular
shape is a hand-computed pixel-art circle via `clip-path: polygon(...)`, matching the
panel corners' Balatro aesthetic rather than a smooth `border-radius: 50%` (which is
what it briefly was, in between placeholder and pixel-circle) — generated with a small
Python script rather than hand-typed, since even at a modest cell count this has far
too many points to derive reliably by hand (unlike the panel's much smaller 9-cell
corner), using the same midpoint-circle math as the panel corners
(`y = round(sqrt(R² − x²))` per column, sampled around all four quadrants and mirrored).
The cell count (`R`, radius in cells) has already been retuned twice based on feedback
— first *down* to `R = 14` on a "more pixels" request that turned out to mean the
opposite of what was built (chunkier/more visibly blocky was requested; a finer,
more-detailed circle was actually wanted), then corrected *up* to `R = 36` (finer than
even the original `R = 24` first pass). If asked to retune this again: more cells =
smaller steps = a more detailed/higher-resolution circle; fewer cells = bigger steps =
a chunkier, more visibly "pixelated" one — confirm which direction is actually meant
before picking a number, since "more pixels" is genuinely ambiguous between the two.
`max-width` is `460px` (up from an initial `360px`), with no border (removed per
request) — just the image, clipped straight to the pixel-circle shape.

The portrait *does* carry the hard offset shadow (currently `#1f2426`, offset left/down
— originally `#102245`, retuned alongside the panel colour, see above) that the panel
itself lost above — successfully this time. It lives on
`.about__portrait::before`, not on `.about__portrait-frame::before`:
`.about__portrait-frame` has its own `clip-path` (the pixel circle), and `clip-path`
doesn't just shape an element's own background — it clips everything painted for that
element's entire subtree, including descendants deliberately offset outside its box via
`transform` (see gotcha #12). A shadow nested inside the frame would get silently
cropped back down to the frame's own silhouette, hiding exactly the offset sliver it's
supposed to show. `.about__portrait` (the plain wrapper, no `clip-path` of its own)
carries the shadow instead, sized with the same `width: 100%; max-width: 460px` as the
frame so the two boxes always coincide exactly at any viewport width.

**`.work` section — transparent, matching About's swirl-through treatment.** `.work`
used to have an opaque `background-color: var(--color-bg)` plus the same upward-cast
`box-shadow` as `.personal`; both were dropped so the persistent swirl shows through
around and behind the carousel, the same reasoning `.about` already went through (see
"Scroll-stacking cards" above — removing `.work`'s own opaque background is exactly
what broke About's old freeze-and-cover trick, since there was no longer anything
opaque to cover About with). `.work` keeps its `overflow: hidden` — that's still load-
bearing for `.work__pin`'s own freeze (see above), unrelated to why `.about` lost its
copy of the same property.

**Work heading replaced with a centered label, matching About's.** `<h2
class="section-heading">Work</h2>` (the shared red pulsing heading every other section
still uses) was replaced with `<p class="work__label">- work -</p>`, styled identically
to `.about__label` (small `--font-mono`, muted/translucent white, uppercase) but with
`text-align: center` added, since Work's label sits alone above a full-width carousel
rather than paired with a two-column layout like About's copy block.

**Work tiles restyled to match the About panel — blue pixel-corner "pane" instead of a
dark rounded rectangle.** `.work-tile` used to be `border-radius: 20px` on
`var(--color-surface-dark)` (a near-black rounded box); it now carries the exact same
pixel-staircase `clip-path` recipe as `.about__pin` (own `--pixel-corner-step: 6px`,
same 9-cell polygon) and the same `#3d6989` panel blue as its `background-color`, with
every tile's `.work-tile__visual` background-color also switched to `#3d6989` so the
color shows correctly under/around each tile's photo. This makes each tile read as its
own small instance of the About panel's "pane" look rather than a plain photo card.
Carousel layout, sizing, and behavior (drag-to-center, hover glass, logo z-index) were
untouched by this — only the tile's own shape/color changed.

**`#work` no longer uses a 2x2 grid** — `.work-carousel` is a center-focused slider
(currently ordered Zermatt / Kodak / Twix / Norwich Theatre Royal — Zermatt leads
deliberately, reordered from an original Kodak-first order) that spans the full page
width (deliberately placed *outside* `.wrapper` in `index.html` so it isn't constrained
by `--max-width`/padding). Click a peeking side tile to slide it to center (loops
infinitely both directions); click the centered tile to follow its link. `js/main.js`'s
`wrappedDelta()` computes each slide's shortest-path offset from the active index.
Kodak, Twix, and Norwich Theatre Royal now have real (if explicitly "-temp"-named)
photos wired into `.work-tile__visual` (`kodak-temp.png`, `twix-temp.png`,
`theatre-temp.jpg`) instead of flat placeholder colors — all use plain `background-
position: center` (no special cropping needed like Zermatt's `center top`; see gotcha
#6 on why that choice is viewport-shape-dependent and needs re-checking if it ever
looks wrong). Several more behaviors layered on top:
- **Spacing** (`renderWorkCarousel`): must be measured via `offsetWidth` (the layout
  box), not `getBoundingClientRect()` — the latter reads the *already-transformed*
  size, and right after a click the newly-active slide still carries its old,
  smaller neighbor scale at the moment spacing is computed (this render hasn't
  updated it yet), which used to make the gap between tiles shrink permanently the
  first time you clicked through. `offsetWidth` is immune to the `transform: scale()`
  entirely, so it's stable regardless of click history.
- **Reveal scale** (`updateWorkReveal`): the carousel sits 15% smaller until scrolled
  to viewport center, then grows to full size — one-directional (`Math.max(center -
  viewportCenter, 0)`), so continuing to scroll past it into Personal/CV never shrinks
  it back; only scrolling back up above it does. Growth/shrink rate tracks scroll
  *velocity* (px/ms via `performance.now()`), not distance — a step proportional to
  distance scrolled can't distinguish a fast scroll from a slow one covering the same
  ground, since the total is identical either way. It's purely event-driven (no
  independent animation loop), so stopping scrolling freezes it instantly.
- **Hover glass reveal** (`.work-tile__glass`): a frosted-glass overlay (same recipe as
  `.site-header` — see below) fades in over the *centered* tile only, on hover — scoped
  via `.work-tile[aria-current="true"]:hover`, the same attribute `renderWorkCarousel`
  already toggles per-slide, so the peeking side tiles never trigger it. Sits at
  `z-index: 4`. `.work-tile__logo` sits *above* it at `z-index: 5` (raised from `1`) so
  the hover blur reveals under the logo, not over it — the photo blurs, the wordmark
  stays crisp. `.work-tile__badge` is still at `z-index: 1`, under the glass, on
  purpose — only the logo was asked to stay sharp. Ready for overview copy to be
  layered on top of the glass later (not built yet).
- **Touch swipe** (mobile): on touch devices the only way to change slides used to be
  tapping the small dots — there's no hover/click affordance for the peeking side tiles
  the way desktop has. `touchstart`/`touchmove`/`touchend` listeners on
  `[data-work-carousel]` track horizontal distance and call the same `goToWorkSlide()`
  the dots/tile-clicks already use (same 0.5s eased transition) once a swipe clears a
  40px threshold — a discrete "jump to next/prev slide," not the tiles dragging 1:1
  with the finger, since that would need real rubber-banding/velocity tuning to avoid
  feeling janky. Direction is decided once movement clears a 10px deadzone: only past
  that point does it check whether horizontal movement leads vertical, and only then
  does it `preventDefault()` (in a non-passive `touchmove` listener) — a mostly-vertical
  touch is left alone so it scrolls the page normally instead of getting eaten by the
  carousel. `.work-carousel` also has `touch-action: pan-y` so vertical scrolling starts
  immediately with no native-gesture hesitation, independent of the JS logic above.

Each tile layers three pieces inside the `<a class="work-tile">`: `.work-tile__visual`
(the photo — `position: absolute; inset: 0`, `background-image` + `background-size:
cover`), `.work-tile__logo` (project wordmark — plain text for Kodak/Twix/Norwich still,
an `<img>` for Zermatt), and `.work-tile__badge`. Keep the logo a separate element
rather than baking it into the photo — Zermatt's `zermatt-logo.png` sits on top of
`Zermatt.jpg` for exactly this reason (independent sizing/positioning, stays crisp
regardless of the photo).

**Site header glass.** `.site-header` (`position: fixed`, `backdrop-filter: blur(20px)
saturate(180%)`) uses two off-center `radial-gradient`s (not a single flat linear fade)
plus a softer blurred `inset` glow beneath the top edge, so the highlight reads as
directional light catching curved glass rather than a uniform wash. The base fill under
those gradients is `rgba(10, 10, 10, ...)` — retuned from `0.45` opacity down to `0.22`
on feedback that the bar felt too dark; letting more of the blurred swirl color show
through instead of a near-black glass tint.

The bar's bottom two corners are rounded (`border-radius: 0 0 16px 16px`) — a plain
smooth radius, not the pixel-staircase `clip-path` `.about__pin`/`.work-tile` use;
`.site-header` is a much smaller, simpler element and didn't need that treatment.

The bar's bright edge highlight used to be a flat `inset 0 1px 0 rgba(255,255,255,0.6)`
box-shadow line straight across the *top* — removed per feedback that it read as a hard
line rather than a glass shine. In its place, `.site-header::after` is a gradient "rim
light" tracing the bar's *bottom-left* edge instead (the edge that already looked right,
per feedback), wrapped up the left side and around the rounded corner on a follow-up
request. It's a masked ring pseudo-element, not a plain CSS `border`, because two
different limits of `border` surfaced while building it — see gotcha #15 for the full
debugging trail:
  - A plain `border-left`/`border-bottom` pair needed very different width/alpha values
    to both stay visible (the header's own bright top-left `radial-gradient` fill nearly
    swallows a thin, low-alpha line) and meet cleanly at the rounded corner (`border-
    radius` only blends two border sides without a gap when their width and colour
    match exactly).
  - Even once unified to one flat colour, a `linear-gradient` can't be applied via
    `border-color`, and `border-image` (which *can* take a gradient) ignores `border-
    radius` entirely, painting a hard rectangular corner instead of a curved one.
  The fix: `.site-header::after` — `position: absolute; inset: 0; border-radius:
  inherit;` with a `linear-gradient(to right, rgba(255,255,255,0.4), rgba(255,255,255,
  0.05))` background, masked down to a thin ring via `padding: 0 0 1px 1px` (the ring's
  per-side thickness — 0 on top/right, 1px on bottom/left) plus the standard `mask:
  linear-gradient(...) content-box, linear-gradient(...); mask-composite: exclude;`
  trick. Because the ring's geometry comes from the *inherited* `border-radius`, it still
  curves smoothly around the bottom-left corner like a real border, but can carry a
  gradient fill a plain border can't.

`.site-header__inner` no longer has `max-width: var(--max-width)` — on a wide monitor
that centered the logo/nav within the site's 1200px content column, leaving the header
bar's own edges empty and the logo/nav pulled inward, "awkwardly sat in the middle" per
feedback. It's now just `padding-inline: calc(var(--gutter) * 2)` with no max-width, so
the logo and nav always sit a fixed distance from the *actual* viewport edge at any
width, instead of from a capped inner column. The `* 2` (48px total, up from the
sitewide `--gutter: 24px`) was a follow-up "push it out further" request specific to the
header — `--gutter` itself is untouched and every other section still uses its original
24px value.

**Bottom progressive-blur band.** `.bottom-glass` (fixed to the viewport bottom, ~130px
tall, present sitewide, `pointer-events: none`) fakes a smoothly graduated blur — which a
single `backdrop-filter` can't do on its own — by stacking 5 absolutely-positioned
`span`s, each with an increasing blur amount (0.5px → 8px) and a `mask-image` that
confines it to a progressively lower slice of the band. Reverse-engineered from
midu.design's own DOM (they use the same stacked-layer technique for a hero "scroll to
explore" reveal).

**Section heading glow.** `.section-heading` pulses between a deep red (`#9c0016`) and a
brighter red-orange (`#ff3a1f`) via `color` + `text-shadow` in a 6s `@keyframes` loop —
plain color animation, no blend-mode or gradient-text trickery. (An earlier version used
`background-clip: text` with a moving gradient band sweeping across white letters;
replaced because the actual ask was for the whole word to read red and breathe in
intensity together, not a highlight travelling through otherwise-white text.)

**Personal Projects and CV panels — reuse About's panel recipe exactly.**
`.personal__pin` and `.cv__pin` are byte-for-byte the same treatment as `.about__pin`:
the same `--pixel-corner-step: 6px` 9-cell pixel-staircase `clip-path` polygon, the same
`#2e3537` panel `background-color`, the same `margin-inline: clamp(16px, 4vw, 72px)`
gutter, and the same `min-height: calc(100vh - var(--nav-height) - var(--space-lg))` +
`display: flex; align-items: center` centering. `.personal`/`.cv` (the plain, transparent
parent sections) carry the same 8-value pixel-card border `filter: drop-shadow(...)`
stack as `.about` does, for the same clip-path/filter-ordering reason (gotcha #14) —
hosted on the clip-path-free parent, not the clip-path'd pin itself. Markup mirrors
About's structure too: `<section class="personal"><div class="personal__pin"><div
class="wrapper">…`. Added on an explicit request to make Personal and CV "match About."
`.cv__document`'s own hardcoded light "paper" card look (below) is unaffected either
way — it just sits on top of whichever background is behind it.

Personal's panel went through the freeze/push saga described under "Scroll-stacking
cards" above before landing on this exact treatment being safe to use — an early, more
literal reading of "match About" (Personal fully transparent, panel and all, from the
very start) briefly broke Work's settle-and-cover effect, and the eventual fix was to
change *Work's* mechanism rather than compromise Personal's panel. CV never had this
problem — nothing freezes against it — so its panel was uneventful by comparison.

**CV document — real content, expand/collapse, width.** `.cv__document` holds Jack's
actual CV text (profile / three education entries / three experience roles with bullet
lists / skills / additional info), transcribed from `assets/cv/jack-bartrum-cv.pdf` —
extracted with `pdfplumber` rather than retyped by hand, then formatted into the
existing `.cv__doc-label` / `.cv__doc-text` classes plus two new ones: `.cv__doc-entry`
(bold sub-heading for each job/degree) and `.cv__doc-list` (bullet list — needs an
explicit `list-style: disc`, since the sitewide `ul { list-style: none }` reset at
`css/style.css:42` kills bullets by default and would otherwise silently flatten every
list in the card). On desktop (`min-width: 769px`) `.cv__document` widens to
`max-width: 720px` (mobile stays 480px), purely to shorten the card for the same
amount of content.

**The `.cv__document` markup is a hand-maintained transcription, not synced to the
PDF automatically.** Swapping `assets/cv/jack-bartrum-cv.pdf` for a new export does
*not* update the on-page card by itself — re-extract the new PDF's text (`pdfplumber`)
and diff it against the current markup by hand. Already happened once: the user
dropped in a reformatted one-page version (originally landed as `Jack_Bartrum_CV.pdf`
— renamed back to the existing kebab-case `jack-bartrum-cv.pdf` per gotcha #7 rather
than changing the download link) with the same wording throughout but two cosmetic
differences that *were* carried over into the HTML: education dates abbreviated
(`Sep 2025 – Aug 2026`, not `September 2025 – August 2026`) and no trailing periods
on the Relevant Skills bullets. Both are real content now, not oversights — keep
them if the CV is swapped again without an explicit instruction to change them back.

Because the real content is long, `.cv__document` starts clamped to `max-height: 460px;
overflow: hidden` with a `::before` cream-colored fade-out gradient over the cut-off
text, plus a centered pill `.cv__toggle` button ("Read full CV" / chevron) that's
`position: absolute; bottom: var(--space-sm)` *inside* the card. That positioning is
what lets one button double as both the expand and collapse affordance: `bottom:
var(--space-sm)` always tracks the card's *current* bottom edge, so the button sits
over the fade while collapsed and re-anchors to the true bottom once
`.cv__document--expanded` (toggled in `js/main.js`) lifts the `max-height` clamp to
`4000px`.

**Custom cursor (built, then removed).** A `.cursor` lead-dot-plus-5-trailing-dots
effect (native cursor hidden via `cursor: none` inside `@media (pointer: fine)`,
`backdrop-filter: invert(1)` on the lead dot only) was built, internally verified, and
later removed in full by explicit user request — markup, CSS, and JS all deleted in one
commit ("Remove custom cursor, revert to native pointer"; see git history for the
complete implementation and `git revert` to bring it back). Gotchas #5 and #9 below
still document the two real, non-obvious CSS bugs it surfaced (`backdrop-filter`
compounding/occlusion, `mix-blend-mode` + `position: fixed` unreliability) — worth
reading before building any *new* effect that layers multiple `backdrop-filter` or
blend-mode elements, even though the cursor itself is gone.

## Known gotchas (hard-won, don't re-discover these)

1. **`id`-to-global-variable collision.** An element like `<section id="hero">` creates
   an implicit `window.hero` property. Declaring `const hero = document.querySelector(...)`
   in `main.js` silently collides with it and halts the *entire* script's execution with
   no visible console error in casual testing. Any top-level `const`/`let` in `main.js`
   that matches an existing `id` in `index.html` (`hero`, `about`, `work`, `personal`,
   `cv`, `contact`, `top`) will do this — use distinct names instead (the existing code
   uses prefixes like `heroParallaxEl`, `workCarousel`, etc.).

2. **`mix-blend-mode` + stacking contexts.** If you give `.hero__inner` (or any element
   sitting in front of blend-mode content) its own `position` + `z-index`, it creates a
   new stacking context that silently breaks the blend calculation even inside a `.hero`
   with `isolation: isolate`. The old blob pseudo-elements (and now `.site-swirl`) use
   `z-index: -1` specifically so `.hero__inner` doesn't need a competing `z-index` at
   all. Don't add one. **This is about `isolation`/`z-index` specifically — a `transform`
   on an ancestor breaks blend-mode too, but for a different reason and needs a
   different fix; see gotcha #10, which is what actually broke hero text inversion
   after the swirl went sitewide.**

3. **Local dev server caching.** `python3 -m http.server` sends no cache-control headers,
   so a browser will happily keep serving a stale cached copy of `js/main.js`, `style.css`,
   or even `index.html` itself across reloads — repeatedly, in this project, across
   *multiple* supposedly-hard reloads — while `fetch(url, {cache: 'no-store'})` correctly
   bypasses it. This is the single most common cause of "my fix isn't showing up" during
   live verification here; suspect it before suspecting the code. In rough order of
   reliability:
   - Weakest: bump a `?v=` query string on the affected `<script>`/`<link>` tag (or via
     JS: swap `link.href` to a new `?v=` value) — works for that one resource, but if
     *other* resources on the page (or the page's own HTML) are also stale, you'll still
     get confusing partial results. Also easy to grab the wrong `<link>` if there's more
     than one `rel="stylesheet"` on the page (e.g. the Google Fonts link) — filter by
     `href` content, don't just take the first match.
   - Better: a fresh Incognito window pointed at `http://localhost:8765` directly (not a
     double-clicked `file://` path).
   - Most reliable, and what actually worked after the other two both failed mid-session:
     kill the server and restart it on a **port the browser has never visited**, then
     open a brand-new tab there. A previously-used port can still serve stale `index.html`
     itself, not just its linked assets, even in a tab that's never loaded before — the
     browser's cache is keyed by URL, not by tab. A genuinely fresh port sidesteps the
     whole problem in one step instead of chasing which specific resource is stale.

4. **`position: sticky` is not trustworthy for scroll-pin effects in this project.**
   Verified working in an automated Chromium test browser, then reproducibly broken in
   both real Safari and real desktop Chrome, with no root cause ever pinned down. See
   "Hero parallax" above for the technique that actually held up, and don't spend time
   re-debugging sticky before trying it.

5. **`mix-blend-mode` + `position: fixed` may not be reliable either.** The custom
   cursor's dots got `mix-blend-mode: difference` (plus a `position: fixed` → `absolute`
   swap, suspecting the fixed positioning specifically), and the result was reported as
   "just white" and "glitchy" in a real browser — reverted back to a plain solid color,
   no blend mode. Never root-caused (could be the dark theme making "white on black stays
   white" look like nothing's happening, rather than an actual bug), but given gotcha #2
   above is *also* a `mix-blend-mode` + positioning interaction, treat any new
   `mix-blend-mode` + `position: fixed`/`sticky` combination in this project as suspect
   until proven otherwise in a real browser.

6. **Work tile aspect ratio is viewport-dependent, not fixed.** `--slide-w`/`--slide-h` on
   `.work-carousel` are independent `clamp()`s (`clamp(320px, 34vw, 560px)` /
   `clamp(260px, 42vh, 420px)`), so the rendered tile shape shifts between landscape and
   portrait-ish depending on the viewport's actual width *and* height — it doesn't
   resolve to a fixed ratio like 4:3 in practice. This matters for `background-image`
   tiles: a `background-position` choice that avoids cropping at one viewport (e.g.
   `center top` to keep the top of a product photo visible) needs re-checking at a
   genuinely different window *shape*, not just a narrower/shorter one — the crop
   direction (horizontal vs vertical) flips depending on which dimension the clamp maxes
   out on.

7. **Asset filenames: no spaces.** Exported/downloaded files often arrive as e.g.
   `Zermatt logo.png`; rename to kebab-case (`zermatt-logo.png`) before referencing in
   `url()`/`src` — spaces in URLs work but are needless friction (encoding, copy-paste
   breakage, eventual deployment quirks).

8. **Scroll-freeze transforms must go on an inner pin, never the section itself.** The
   hero parallax and the scroll-stacking cards (About/Work) both rely on a
   `translateY` that grows 1:1 with scroll to hold an element's screen position. That
   freeze is only self-limiting — i.e. it stops mattering once the section has
   scrolled past — if the transform is on an *inner* element (`.hero__pin`,
   `.about__pin`, `.work__pin`) sitting inside an untransformed, `overflow: hidden`,
   naturally-bounded outer section. Apply the same transform to the outer section
   directly instead, and it freezes forever with nothing left to clip it away: the
   frozen content stays glued under the nav bar permanently and shows back through
   later sections once whatever was covering it has scrolled on past that same screen
   band. Reproduced once while building the scroll-stacking cards; fixed by moving the
   transform onto a dedicated inner pin, same as hero.

   **`.hero` is now a deliberate, explained exception to the "outer section needs
   `overflow: hidden`" half of this rule** — its clip was removed on purpose so
   `.about__pin` (a visible panel) does the covering instead of an invisible section
   boundary. See "Hero parallax" above before assuming this rule is being violated by
   accident if you go looking at `.hero`'s CSS.

9. **`backdrop-filter` on multiple overlapping, independently-moving elements compounds
   and occludes.** Two distinct bugs surfaced building the custom cursor's invert effect
   (see "Custom cursor (built, then removed)" above), both only visible with real mouse movement — a static
   screenshot won't show either one:
   - Two elements that both run `backdrop-filter: invert(1)` and happen to overlap
     double-invert back to the *original* color in the overlap region — reads as a
     "hole" punched in the middle of what should be a solid inverted circle. This is
     expected with this cursor's trail design specifically, since trailing dots are
     built to lag close behind the lead and constantly clip it.
   - Independently of the above: paint order still follows plain DOM order unless
     overridden. The lead dot happens to be the *first* `.cursor__dot` in the markup, so
     any later, opaque sibling that overlaps it paints on top and fully occludes it —
     same visible "hole", completely different cause. `z-index` on the element that
     needs to stay on top is the fix; without it, this bug reproduces even with only
     *one* element doing the inverting.
   Net fix: invert on exactly one element that never overlaps itself, and force it above
   any plain siblings with `z-index`. If another `backdrop-filter` effect is ever added
   that can visually overlap itself or another filtered element, expect this same
   failure mode and check for it with a forced-overlap test (set two elements' positions
   to the same point via devtools/JS and look for the compound or occlusion), since it
   won't show up from moving the mouse around casually or from a screenshot.

10. **An active `transform` on an ancestor blocks `mix-blend-mode` on its descendants
    from reaching anything outside that ancestor — independent of `isolation`.** Hit
    when the swirl background moved from living inside `.hero__pin` to living outside
    it as `.site-swirl`: hero text (`mix-blend-mode: difference`) stopped inverting
    entirely. The first, wrong theory was `isolation: isolate` on `.hero__pin` (removed
    it — no change). The actual cause, confirmed by live testing in the browser (toggle
    `element.style.transform = ''` vs restoring a real `translateY(...)` value and
    watching inversion turn on/off in lockstep): `.hero__pin` has a JS-driven
    `transform` for the parallax drag/freeze (see "Hero parallax" above), and *any*
    non-`none` `transform` value makes an element establish its own stacking context —
    which walls off blend-mode for its descendants from the backdrop outside it, the
    same way `isolation: isolate` does, but as an unavoidable side effect of needing the
    transform at all, not something you can just remove. `will-change: transform` alone
    (with no actual transform value) was tested too and does *not* cause this — it's
    specifically an active transform value that triggers it.

    **Fix used here: move the `mix-blend-mode` from the descendant text onto the
    transformed ancestor itself.** `.hero__pin` now carries
    `mix-blend-mode: difference` directly; `.hero__name`/`role`/`tagline` are plain
    white text with no blend-mode of their own. The blend is evaluated where
    `.hero__pin` composites into its own (untransformed) parent, so it correctly reaches
    `.site-swirl`. Since the rest of the pin's box is transparent, only its painted
    text content ends up visually affected — same result as blending the text
    directly, just evaluated one level higher up the tree. If a similar "blend against
    something outside a transformed wrapper" need comes up again, this is the pattern:
    blend on the transformed element, not on its children.

11. **A child's `z-index: -1` does not paint it behind its own parent's background —
    only behind other normal-flow content in the same stacking context.** Hit building
    a hard offset "sticker" shadow for the About panel: `.about__pin` had its own
    `background-color` *and* an `::before` shadow (`z-index: -1`, offset via
    `transform`), and the shadow rendered ON TOP of the panel's background instead of
    peeking out from behind it. Per the CSS2.1 painting-order spec, the paint order
    inside a stacking context is (1) the stacking-context root's *own* background/
    border, painted first/bottom-most, then (2) negative-`z-index` descendants, then
    (3) normal in-flow descendants — so a negative-`z-index` child is only guaranteed to
    sit behind *other* content in that context, never behind the root element's own
    background, which already painted before it. **Fix: don't give the shadow's parent
    a background of its own at all.** For the About panel this meant moving the
    panel's actual visible `background-color`/`clip-path` off `.about__pin` and onto
    `.about__grid` — a plain in-flow *child*, not the stacking-context root — so
    `.about__pin::before` (still `z-index: -1`) now correctly paints behind it. If a
    similar shadow is ever added elsewhere, check whether the element carrying the
    shadow pseudo-element also carries the visible background it's supposed to sit
    behind — if so, this bug will reproduce.

12. **`clip-path` clips an element's entire subtree, not just its own box — including
    descendants deliberately offset outside that box via `transform`.** Hit twice: once
    assumed (correctly, as a precaution) while building the About-portrait shadow, and
    implicitly true of every `clip-path` in this codebase. A shadow pseudo-element
    positioned as a *descendant* of a `clip-path`'d element — e.g. nested inside
    `.about__portrait-frame`, which carries the pixel-circle `clip-path` — gets cropped
    back down to that same clipped silhouette, even where the shadow's own `transform`
    pushes it outside the frame's box; `clip-path` isn't just an "overflow boundary for
    this element's own background," it constrains everything painted for the whole
    subtree, the same way `overflow: hidden` does but shaped as an arbitrary polygon
    instead of a rectangle. **Fix: put the shadow on a plain, `clip-path`-free sibling
    wrapper instead** — `.about__portrait` (no `clip-path` of its own) carries the
    portrait's shadow, sized to exactly match `.about__portrait-frame` (same `width`/
    `max-width`) so the two boxes still coincide. Any future shadow-behind-a-clipped-
    shape effect needs this same wrapper-not-descendant structure.

13. **This tool's Browser-pane screenshots can silently go stale or show a corrupted
    frame when the pane isn't actually displayed/focused on the user's side — treat
    unexplained solid-black or visibly-misplaced-fixed-header screenshots as a tooling
    artifact to rule out, not proof the page is broken.** Surfaced while debugging the
    About-panel shadow: screenshots at a scrolled position repeatedly came back solid
    black, or with the fixed header rendered at the *bottom* of the frame instead of the
    top — reproduced consistently across navigation methods (real scroll gestures, JS
    `scrollTo`, even a plain anchor-link page load), which briefly looked like a genuine
    renderer bug. It wasn't: `getBoundingClientRect()`/`getComputedStyle()` calls at the
    exact same moment consistently showed correct layout (header still at `top: 0`,
    correct colours/positions everywhere), and the screenshot tool itself eventually
    started returning an explicit `"the Browser pane is not displayed"` error on the
    same tab — confirming the earlier "black" captures were stale last-composited frames
    from before the pane lost visibility, not live renders. **When a screenshot looks
    wrong in a way live DOM inspection (`javascript_tool` + `getComputedStyle`/
    `getBoundingClientRect`) doesn't confirm, trust the DOM inspection** and treat the
    screenshot as unreliable for that state, the same way gotcha #4's automated-Chromium
    caveat already applies to scroll-linked *effects* — this is the same caveat applied
    to the *screenshot capture itself*, not just to what's being tested.

14. **`clip-path` clips an element's own `filter` output too, not just its background —
    a `filter: drop-shadow` on a `clip-path`'d element gets its own bleed clipped away.**
    Distinct from (but the same root cause as) gotcha #12: that one is about clip-path
    clipping a *descendant's* offset content; this one is about clip-path clipping the
    *same element's own* filter effect. Hit building the About panel's pixel-card
    border (see "About panel" above): `filter: drop-shadow(...)` was first put directly
    on `.about__pin`, which also carries the panel's pixel-staircase `clip-path`. Result:
    completely invisible, confirmed in a real browser even at an unmissable diagnostic
    magenta — despite this tool's own Browser-pane screenshots appearing to show it
    rendering correctly (don't trust those for this combination; see gotcha #13, and
    note this is now a *second* confirmed instance of this tool's screenshots being
    wrong about a clip-path-adjacent shadow/filter effect specifically — treat any
    "it renders here" result for this category as unverified until confirmed in the
    user's actual browser). Root cause: per the CSS rendering model, `filter` is applied
    to an element first, generating a result that can extend beyond the element's own
    box (that's how `drop-shadow` bleeds outside it); `clip-path` is then applied
    *after*, to that same result — and since the clip-path's geometry is defined
    relative to the element's original (unfiltered) box, it clips the filter's bleed
    straight back off, leaving only the shape that was already inside the clip-path to
    begin with. **Fix: host the `filter` on a clip-path-free ancestor instead of the
    clip-path'd element itself** — same "move it up one level, off the clipped element"
    pattern gotcha #12 already established for shadow pseudo-elements, just applied to a
    `filter` property instead. For the About border this meant moving the `filter` from
    `.about__pin` to `.about` (its plain parent section, no clip-path of its own). If
    any future effect needs a `filter` (drop-shadow or otherwise) on an element that also
    has `clip-path`, expect this exact failure and use the same fix.

15. **A thin, low-alpha `border` can be effectively invisible against a bright
    background gradient underneath it — and a gradient *fill* needs a completely
    different technique than `border` anyway.** Hit building the site header's
    bottom-left rim light (see "Site header glass" above): a `border-left: 1px solid
    rgba(255,255,255,0.14)` (matching the existing, clearly-visible `border-bottom`)
    rendered as nothing along the flat part of the left edge — confirmed via
    `getComputedStyle` that the border was genuinely applied, and via a `4px solid
    magenta` test border that it does render at that position, so it wasn't a
    stacking/paint-order bug. The real cause: the header's `background` has a
    `radial-gradient` brightest near the top-left corner (see "Site header glass"), and
    a low-alpha white line has very little contrast against an already-near-white area
    — even boosting alpha to `0.6` at `1px` wasn't enough; `2px` width was what actually
    crossed the visibility threshold. Once visible, a second problem appeared: mismatched
    width/alpha between the (boosted) left border and the (original, thinner/dimmer)
    bottom border left a visible gap where they met at the rounded corner, because
    `border-radius` corner rendering only blends cleanly between two border sides when
    their width and colour are identical — unifying both into one `border-width`/
    `border-color` declaration fixed the gap. Finally, asked to make that unified line a
    left-to-right *gradient* instead of a flat colour: plain `border-color` can't take a
    gradient, and `border-image` (which can) ignores `border-radius` and paints a hard
    rectangular corner instead of a curved one — so the border approach was abandoned
    for a masked gradient-filled `::after` ring instead (see "Site header glass" for the
    implementation). **Lesson: for any edge highlight that needs to (a) survive a bright
    background underneath, or (b) carry a gradient while still respecting
    `border-radius`, reach for the mask-ring `::after` + `padding` + `mask-composite:
    exclude` pattern directly instead of starting with a plain `border` and discovering
    these limits one at a time.**

16. **Scripting `window.scrollTo()` for testing without `{behavior: 'instant'}`
    inherits the sitewide `scroll-behavior: smooth` CSS (`html`, see "Scrolling is
    plain, sitewide" above) — the scroll animates over time instead of jumping
    instantly, so reading `window.scrollY`/`getBoundingClientRect()` immediately
    afterward can capture a mid-animation position, not the final one.** Hit
    repeatedly while debugging the Work push effect: a plain `window.scrollTo(0, y)`
    followed straight away by a position read gave confusing, seemingly-inconsistent
    numbers between otherwise-identical test runs, which briefly looked like a real
    bug in the freeze/push math. It wasn't — it was the read racing the animation.
    **Always pass `{top, behavior: 'instant'}`** (or temporarily set
    `document.documentElement.style.scrollBehavior = 'auto'`) when scripting scroll
    positions to test a scroll-linked effect, and prefer waiting a couple of
    `requestAnimationFrame` ticks before reading layout after any scroll, since even
    an instant scroll's *effects* (our own `scroll` listeners) are themselves
    RAF-deferred.

17. **A hard freeze/release in a scroll-linked transform — scroll velocity going from
    full speed to 0, or back again, within a single frame — reads as the frozen
    element "hitting a wall and bouncing off it," even though the underlying
    *position* math has no discontinuity, only a velocity one.** Hit building the
    Work push effect's freeze and release points (see "Scroll-stacking cards" above):
    applying the raw scroll-derived, clamped target straight to the transform was
    reported as "juddery" and feeling like it kept "bouncing off" the freeze point —
    human perception is sensitive to sudden velocity changes even when position stays
    continuous, especially under trackpad/wheel momentum that's still smoothly
    decelerating the page's own scroll through that same instant. **Fix: lerp the
    applied transform toward the scroll-derived target every frame instead of setting
    it directly** — `setupWorkPin` in `main.js` keeps a `currentTranslateY` that
    closes 18% of the remaining distance to the target each `requestAnimationFrame`,
    self-terminating once within 0.05px rather than running an animation loop
    forever. Any future scroll-linked freeze/release effect should expect this same
    "bouncing" complaint if it applies its target directly, and reach for this same
    lerp pattern rather than re-discovering it.

## Conventions

- Work section-by-section, checking in before moving to the next section — that's how
  this site has been built throughout (nav+hero → About → Work → Personal → CV → Contact →
  fonts → hero visual treatment → sitewide theme → Work carousel → hero parallax rebuild →
  header/bottom glass → section heading glow → custom cursor → Zermatt tile imagery →
  work tile hover glass reveal → scroll-stacking cards → animated section backgrounds
  (explored, reverted) → real CV content + expand/collapse → custom cursor invert
  rebuild → git init for revert safety → hero blob swapped for WebGL swirl → CRT
  scanlines + grain removed → swirl resolution/perf tuning → work tile logo raised
  above hover glass → About panel trial (pixel corners, inset gutter) → swirl and
  scanlines made persistent/sitewide → hero/About seam shadow dropped → hero text
  inversion fixed + About panel made the visible thing that covers hero text → custom
  cursor removed entirely → py vs python3 launch.json fix → About panel made near-
  full-height + pixel corners reworked into an actual curved silhouette (equal steps →
  wrong-circle formula → correct chunky-step circle) → About panel side margins
  tightened → About heading given a hard offset shadow, then a solid-block version →
  swirl retuned to a blue palette from a reference photo → About redesigned around a
  quote-style headline (mono label + large quote line, old "About" heading and its
  shadow removed) → About portrait moved to the left column and made circular, then
  pixel-art-circular (real photo wired in, retuned from chunkier to finer pixels) →
  About-panel hard shadow attempted twice (drop-shadow, then a working but
  user-reverted `::before` version) → About-portrait hard shadow added successfully →
  Work tiles restyled to the About panel's blue pixel-corner look → `.work` section
  made transparent to match About's swirl-through treatment → About's scroll-freeze
  dropped (continuous scroll, fixing an invisible-border cutoff) → hero text given a
  scroll-based fade-out (About's midpoint) so it no longer lingers past About → Work
  heading replaced with a centered `- work -` label matching About's → Kodak/Twix/
  Norwich Theatre Royal given real (temp) photos → carousel reordered Zermatt-first →
  site header lightened → swirl given a third palette retune (`#60a3d8` light blue) →
  Work carousel given touch swipe support → swirl retuned a fourth time to a dark
  teal-gray Balatro-match palette (colour-picked directly off a reference screenshot)
  with contrast lowered and gloss raised to match → swirl's brightness filter removed
  entirely once the palette was colour-accurate on its own → About panel and portrait
  shadow colours retuned to match the new teal-gray swirl → About panel given a
  pixel-card border via `drop-shadow` (first broke silently due to a clip-path/filter
  ordering bug — see gotcha #14 — then fixed by hosting the filter on `.about` instead
  of `.about__pin`) → panel/border colours briefly swapped then reverted back → swirl
  motion speed slowed twice for a calmer ambient feel → sitewide particle sparkles
  added (Balatro-style drifting squares, colours picked off the same reference), then
  tuned through several rounds — speed bumped then reverted, brightness raised,
  chromatic-aberration fringe attempted twice before landing on the opaque-underneath
  technique, fringe offset tightened, bloom added, particle count reduced) → site header
  given rounded bottom corners, its flat top rim-light swapped for a bottom-left gradient
  rim light (a plain `border` hit contrast, corner-gap, and gradient-vs-`border-radius`
  limits in turn before landing on a masked `::after` ring — see gotcha #15) → header nav
  content un-capped from the site's `--max-width` column and given doubled edge gutter so
  the logo/nav always sit a fixed distance from the true viewport edge → About panel's
  wide-monitor "floaty"/boilerplate look diagnosed (forced near-100vh panel height +
  uncapped grid width leaving dead space around short placeholder copy) and a fix
  prototyped (content-hugging panel height, capped/centered grid) — reverted at the
  user's request, who wants the *content* itself to grow to fill the space rather than
  the panel shrinking to fit the content; unresolved pending design feedback from their
  course lecturer (see Outstanding) → Personal Projects and CV given About's
  pixel-corner panel treatment (transparent section, inset gutter, pixel-card border) →
  Work/Personal's scroll interaction reworked repeatedly as the new Personal panel kept
  conflicting with Work's existing freeze-and-cover effect (cutoff bug → freeze dropped
  for a plain transparent Personal → freeze restored with an opaque backdrop behind the
  panel, confirmed against a user mockup → reverted at explicit request back to a plain
  full-bleed Personal → panel reapplied, freeze dropped again → Work's mechanism finally
  redesigned to push itself off-screen via a capped transform instead of relying on
  Personal to cover it, letting Personal stay fully transparent with zero conflict) →
  Work's freeze anchor moved from nav-height to viewport-center ("settle in the middle"
  before getting pushed off) → the freeze/release transition lerp-smoothed to fix a
  "hitting a wall" scroll judder.
- Reference designs are for *flow/behavior* inspiration only, not literal visual copying
  (e.g. midu.design was referenced for the scroll-parallax feel, not its actual layout;
  viclopez.art was referenced for the scroll-stacking cards' "next section covers the
  frozen one" feel; Balatro's card shaders were referenced for the swirl's low-res
  chunky look and the About panel's pixel-stepped corners) — though for the hero
  parallax specifically, its live DOM was directly inspected to reverse-engineer the
  exact technique after other approaches kept failing.
- No build step, no bundler, no package.json — keep it that way unless asked. (Git was
  added — see "Git" under Structure — but that's version control, not build tooling;
  the "no build step" convention is unaffected.)
- Visual experiments that might get reverted (backgrounds, layout treatments — anything
  the user says "let's try" or "be prepared to undo" about) get their own git commit
  before and after, so `git revert` is always available instead of hand-reconstructing
  CSS from memory.

## Outstanding / not yet built

- Work tiles (`work/kodak.html`, `work/zermatt.html`, `work/twix.html`,
  `work/norwich-theatre-royal.html`) — linked from `index.html` but files don't exist yet.
- Personal project pages (`personal/film.html`, `personal/photo.html`, `personal/3d.html`)
  — same situation.
- Portrait photo for About — has a real photo now (`assets/images/temp-about-pic.jpg`),
  but the filename says "temp" for a reason; confirm with the user whether it's staying
  or still a stand-in before treating it as final.
- About's quote copy ("Insightful quote that will make people hire me") and its `-
  about -` label are both placeholder text, not final copy.
- Real contact/social links (currently `mailto:jack@example.com` and `href="#"` placeholders).
- Work tile imagery — Zermatt has a real photo (`assets/images/Zermatt.jpg`) and logo
  (`assets/images/zermatt-logo.png`); Kodak, Twix, and Norwich Theatre Royal now have
  real photos too (`kodak-temp.png`, `twix-temp.png`, `theatre-temp.jpg`), but all three
  still use plain-text logos (no wordmark image yet, unlike Zermatt's), and the "-temp"
  filenames mean these should be confirmed as final (or replaced) before treating them
  as done, same caveat as the About portrait.
- Work tile overview text — the `.work-tile__glass` hover reveal (frosted glass over the
  centered tile on hover) is built and working; the actual copy meant to sit on top of it
  hasn't been added yet.
- The persistent-swirl treatment (see "Persistent swirl background" above) now covers
  Hero, About, Work, Personal, and CV — About/Personal/CV via matching inset panels
  (`.about__pin`/`.personal__pin`/`.cv__pin`, see "Personal Projects and CV panels"),
  Work via per-tile blue pixel-corner panes on `.work-tile` rather than one single
  inset panel (the carousel itself stays full-bleed/edge-to-edge on purpose). Only
  Contact still uses the original full-bleed opaque section design. If extended there
  too, it'll need its own version of the transparent-background treatment.
- Hero text's fade-out point (`aboutFadeScrollY` in `js/main.js`) is tuned to the
  *midpoint* of `.about`'s scroll range, chosen for a comfortable margin rather than
  pixel-perfect alignment with when About's panel actually stops covering the frozen
  text. Works well in testing; if About's content height changes a lot (longer copy, a
  taller portrait), it's worth re-checking that the fade still lands before the panel
  visually clears that band, not after.
- Work carousel touch swipe (see "Work carousel" above) was verified with synthetic
  touch events and a mobile-sized viewport in this tool, not yet confirmed on an actual
  phone — the user should give it a real test when convenient.
- About panel colours (`#2e3537` panel, `#1f2426` border/portrait-shadow) are, like the
  panel colour before them, an explicit trial ahead of a full sitewide colour-scheme
  pass — not a considered final choice, same caveat as ever. Personal/CV's panels reuse
  these same two colours (see "Personal Projects and CV panels" above), so a future
  colour-scheme pass will need to update all three together, not just About. The
  swirl's own teal-gray palette and the particle sparkles' three colours (see
  "Persistent swirl background" and "Particle sparkles" above) are similarly a direct
  match to one reference screenshot, not necessarily the final sitewide direction.
- The About panel's pixel-card border (see "About panel" above and gotcha #14) is fairly
  thin (6px/4.25px radius) and low-contrast by explicit colour choice — confirm it's
  still visible enough if the panel or swirl colours change again, since a lighter panel
  or different border colour could make it read differently than intended.
- **About panel reads as sparse/"boilerplate" on a normal wide desktop monitor** — the
  near-full-height panel (`.about__pin`'s `min-height: calc(100vh - ...)`) plus the
  short placeholder copy leaves large empty space above/below and to the right of the
  content once the viewport is wider than roughly the preview pane this was mostly
  built and checked in (see "Architecture notes" intro and the caching gotcha's general
  "verify in a real browser" caveat — this is the same class of issue, a layout that
  looks right in the tool's narrower Browser pane but not on the user's actual monitor).
  A fix was prototyped — dropping the forced `100vh`-based height so the panel hugs its
  own content, and capping/centering `.about__grid`'s width instead of letting it
  stretch full-bleed — and confirmed to look right at 1920×1080 and 2560×1080, but was
  reverted at the user's explicit request: they'd rather the *content* (portrait size,
  copy, maybe additional elements) grow to fill the panel than have the panel shrink to
  fit sparse placeholder content, and want to check with their course lecturer for
  design direction first. Next step, whenever that's resolved, is almost certainly
  scaling up/adding to `.about__portrait-frame`, `.about__quote`, and `.about__copy p`
  rather than touching `.about__pin`'s height or `.about__grid`'s width again.
