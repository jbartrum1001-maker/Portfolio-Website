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
  background (see below). No libraries. (No longer has a custom cursor — built, then
  removed by explicit request; see "Custom cursor (built, then removed)" below.)
- `assets/` — exists with `background/`, `cv/`, `icons/`, `images/` subfolders (flat
  categories, not nested per-content-type — there's no `work/`/`personal/` split inside
  `images/`).
  - `background/swirl-background.js` — the vendored `SwirlBackground` WebGL class (no
    dependencies, not npm-installed) that renders the site-wide background — see
    "Persistent swirl background" below. `background/example-usage.html` is the
    original usage reference it shipped with, not part of the live site.
  - Real files have started landing in `images/`: `Zermatt.jpg` (work tile photo),
    `zermatt-logo.png` (wordmark, transparent PNG), and `temp-about-pic.jpg` (About's
    portrait — a real photo, but explicitly a placeholder/temp one per its filename,
    not necessarily the final image). Convention: drop new images straight into
    `assets/images/`, kebab-case filenames, no spaces — exported files often arrive
    as e.g. `Zermatt logo.png`; rename before wiring in (see gotcha below). Real CV PDF
    now lives at `assets/cv/jack-bartrum-cv.pdf`, linked from the CV section's download
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

**Scroll-stacking cards (About → Work → Personal).** Reuses the hero parallax's exact
freeze technique — no `position: sticky`/`fixed` here either — via a generalized
`setupStackPin(pinEl)` in `js/main.js`, applied to `.about__pin` and `.work__pin`. Each
pin scrolls normally until its top edge reaches `--nav-height` from the viewport top;
past that scrollY, `translateY` grows 1:1 with scroll (no 0.4x drag phase like hero —
just an instant freeze), holding the pin in place while the next section (plain,
untouched, normal scroll speed) climbs the document as usual and visually rides over
it. Personal is the last section in the chain (covers `.work__pin`) but is not itself
pinned — the freeze/cover chain stops there by explicit design choice, so CV scrolls
in normally afterward with no special treatment.

**About has since diverged from Work/Personal — read "About panel" below before
assuming this section still applies uniformly.** Work and Personal still use the
original design this section describes: a full-bleed, opaque section background that
covers whatever's frozen beneath it. About no longer does — its section background is
transparent (so the persistent swirl shows through) and only the narrower, inset
`.about__pin` "panel" is opaque, so *it* (not the full section) is what does the
covering now. If the panel treatment is ever extended to Work/Personal/CV, expect to
revisit the assumptions below for each of them individually.

Two things have to stay true for this to keep working, both easy to break by accident:

- The transform must go on the **inner** `.about__pin` / `.work__pin`, never on the
  outer `.about` / `.work` section. The outer section stays untransformed, at its own
  natural bounded height, with `overflow: hidden` — that's what makes the freeze
  self-limiting (the frozen pin gets clipped away once the outer section's own box has
  scrolled fully past). Transforming the section itself instead (tried first) freezes
  forever with nothing to clip it, so it stays glued under the nav bar permanently and
  shows back through once the covering section's box has scrolled on past that same
  band. See gotcha #8 below.
- None of `.about`, `.work`, `.personal` may carry a `z-index` — only `position:
  relative`. The "next section covers the frozen one" effect relies entirely on plain
  DOM paint order; a positioned element with an explicit `z-index` jumps stacking
  layers and paints above/below regardless of DOM order, breaking the illusion. This is
  why `.personal` has `position: relative` (load-bearing — needed so it stacks
  correctly against `.work__pin`) while `.cv` deliberately does not (it was never part
  of the cover chain, so it never needed it). If the chain is ever extended to CV,
  `.cv` will need `position: relative` added the same way.

`.work` and `.personal` both carry the same upward-cast `box-shadow:
0 -80px 120px -30px rgba(0,0,0,0.7)` as `.about` originally had, for a consistent
"next card casts a shadow on the one it's covering" depth cue.

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
(`.hero__pin`, `.about` both have none) — anything else painted in a normal
(non-negative) `z-index`, which is every section by default, naturally paints over the
fixed layer with zero extra effort. Work/Personal/CV/Contact still have their original
opaque backgrounds, so the swirl doesn't show through them (yet — see Outstanding).

The shader's default red/blue "marble" palette was first retuned in the `swirlOptions`
passed into the `SwirlBackground` constructor to a warm red/black ramp matching the
site's original hero-blob palette and the section-heading glow, instead of introducing
blue — then retuned a second time, later, to a dark-navy / steel-blue / icy-highlight
ramp matching a reference photo the user supplied, explicitly *introducing* blue this
time. Both of the shader's colour "families" (`redDark`/`redMid`/`redLight` and
`blueDark`/`blueMid`/`blueLight` — just the shader's own generic internal names for its
two blend ramps, not a literal red-vs-blue split) are blue tones now, so the marble
blend reads as one cohesive blue rather than two competing hues; `balance`/`settle`/
`resolutionScale` were left untouched both times — only the palette changed, not the
shape or motion of the swirl. `resolutionScale` (currently `0.4`) renders the canvas at
a fraction of its
actual displayed size — the shader is fragment-heavy, so this is a real, significant
GPU-cost win (a straight `scale²` reduction in pixels computed per frame), and because
the shader samples with `gl.LINEAR` filtering, the upscale reads as a deliberately
soft, chunky, slightly-low-res look (reference: Balatro's card-shader backgrounds)
rather than jagged pixelation. Tune this one number to trade sharpness for performance
in either direction. `filter: brightness(0.5) saturate(1.1)` on `.site-swirl` itself
further darkens the shader's own output to sit closer to the site's near-black theme
(the shader's raw output alone reads too pale/cream against it).

**CRT scanlines (sitewide).** `.site-scanlines` sits right next to `.site-swirl` in
both the CSS and the DOM (same `position: fixed; z-index: -1`, placed *after*
`.site-swirl` so it paints on top of it — equal negative-`z-index` siblings stack in
tree order) — a `repeating-linear-gradient` + radial vignette, `mix-blend-mode:
multiply`, low opacity (`0.18`), adapted from `assets/background/example-usage.html`'s
`.crt` recipe but dialed back so it reads as a faint texture, not an overt effect. Pure
CSS, no JS. Originally hero-only (`.hero__scanlines`), moved sitewide alongside the
swirl for the same reason the swirl itself went sitewide.

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

**About panel.** `.about__pin` is a scroll-freeze wrapper only — `position`/`transform`/
`min-height`, no background or `clip-path` of its own (see the shadow paragraph below
for why). The panel's actual visible surface is `.about__grid`: it carries the solid
`background-color`, the pixel-corner `clip-path`, and the padding that briefly lived on
`.about__pin` instead. `.about__pin` is `display: flex` with `align-items` left at its
default (`stretch`), so `.about__grid` stretches to fill `.about__pin`'s full height
rather than shrink-wrapping its own (much shorter) content; `.about__pin` itself carries
`min-height: calc(100vh - var(--nav-height) - var(--space-lg))` so the panel reads as a
near-full-page card instead of a small box floating in a mostly-empty section.
`align-content: center` on `.about__grid` recenters its content vertically within that
now-stretched height, replacing the centering `.about__pin`'s old `align-items: center`
used to provide. `margin-inline: clamp(16px, 4vw, 72px)` (tighter than an earlier
`clamp(24px, 8vw, 140px)`) insets the panel from `.about`'s own transparent edges so the
persistent swirl still shows as a side gutter, just a narrower one than the first pass.
`.about` itself still has no `background-color`/`box-shadow` of its own — see the
original reasoning below about the seam that created against the now-continuous
hero/About background; that part hasn't changed. Only About has this panel treatment so
far; Work/Personal/CV are unchanged (see Outstanding).

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
`background-color` (`#3d6989`, on `.about__grid`) is a placeholder ahead of a full
sitewide colour-scheme pass, picked — along with the About text-shadow color `#102245`
below — purely to sit reasonably against the swirl's own newly-blue palette (see
"Persistent swirl background" above), not as a considered final choice. A hard offset
*panel* shadow (a solid `#102245` copy of the panel's own pixel-corner shape, offset
behind and to the lower-left — the same "sticker" idea as the About-portrait shadow
below) was built and made to render correctly: `.about__pin` had to stay
background/`clip-path`-free specifically so a `::before` shadow pseudo-element could sit
behind `.about__grid`'s background instead of in front of it (a negative `z-index` child
does not automatically paint behind its *own* parent's background — see gotcha #11,
which is exactly what broke the first attempt at this). Despite rendering correctly by
every DOM-level check, it was reverted at the user's request after still looking wrong
in their real browser — never root-caused, and muddied further by the in-tool
screenshot testing that session turning out to be independently unreliable at that same
scrolled position (see gotcha #13). **The panel itself currently has no shadow.** If
this is revisited, re-read gotchas #11 and #12 first, and verify in a browser tab the
user can actually see, not just this tool's screenshot capture.

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

The portrait *does* carry the hard offset shadow (`#102245`, offset left/down) that the
panel itself lost above — successfully this time. It lives on
`.about__portrait::before`, not on `.about__portrait-frame::before`:
`.about__portrait-frame` has its own `clip-path` (the pixel circle), and `clip-path`
doesn't just shape an element's own background — it clips everything painted for that
element's entire subtree, including descendants deliberately offset outside its box via
`transform` (see gotcha #12). A shadow nested inside the frame would get silently
cropped back down to the frame's own silhouette, hiding exactly the offset sliver it's
supposed to show. `.about__portrait` (the plain wrapper, no `clip-path` of its own)
carries the shadow instead, sized with the same `width: 100%; max-width: 460px` as the
frame so the two boxes always coincide exactly at any viewport width.

**Work carousel.** `#work` no longer uses a 2x2 grid — `.work-carousel` is a
center-focused slider (Kodak / Zermatt / Twix / Norwich Theatre Royal) that spans the
full page width (deliberately placed *outside* `.wrapper` in `index.html` so it isn't
constrained by `--max-width`/padding). Click a peeking side tile to slide it to
center (loops infinitely both directions); click the centered tile to follow its link.
`js/main.js`'s `wrappedDelta()` computes each slide's shortest-path offset from the
active index. Three more behaviors layered on top:
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

Each tile layers three pieces inside the `<a class="work-tile">`: `.work-tile__visual`
(the photo — `position: absolute; inset: 0`, `background-image` + `background-size:
cover`), `.work-tile__logo` (project wordmark — plain text for Kodak/Twix/Norwich still,
an `<img>` for Zermatt), and `.work-tile__badge`. Keep the logo a separate element
rather than baking it into the photo — Zermatt's `zermatt-logo.png` sits on top of
`Zermatt.jpg` for exactly this reason (independent sizing/positioning, stays crisp
regardless of the photo).

**Site header glass.** `.site-header` (`position: fixed`, `backdrop-filter: blur(20px)
saturate(180%)`) uses two off-center `radial-gradient`s (not a single flat linear fade)
plus a bright `inset` top rim and a softer blurred `inset` glow beneath it, so the
highlight reads as directional light catching curved glass rather than a uniform wash.

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
  user-reverted `::before` version) → About-portrait hard shadow added successfully).
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
- Work tile imagery — Zermatt now has a real photo (`assets/images/Zermatt.jpg`) and logo
  (`assets/images/zermatt-logo.png`); Kodak, Twix, and Norwich Theatre Royal are still
  flat color placeholders with plain-text logos.
- Work tile overview text — the `.work-tile__glass` hover reveal (frosted glass over the
  centered tile on hover) is built and working; the actual copy meant to sit on top of it
  hasn't been added yet.
- The persistent-swirl + inset-panel treatment (see "Persistent swirl background" and
  "About panel" above) is currently About-only, by explicit design — it was built as an
  isolated trial. Work, Personal, CV, and Contact still use the original full-bleed
  opaque section design (their own `background-color`, plus Work/Personal's upward-cast
  `box-shadow` cover cue that About's no longer has). If this gets extended sitewide,
  each section will need its own version of the transparent-background + inset-panel +
  pixel-corner treatment (or a shared component extracted from `.about__pin`'s CSS), and
  Work/Personal's `box-shadow` will likely need the same removal treatment About's got,
  for the same "seam across what should be unbroken" reason.
