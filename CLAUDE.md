# Jack Bartrum Portfolio Site

Single-page portfolio for Jack Bartrum, MA Advertising student. Plain HTML/CSS/JS,
no build tooling, no framework, no dependencies beyond Google Fonts.

## Structure

- `index.html` — the entire site. One page, six `<section>`s inside `<main id="top">`,
  in order: `#hero`, `#about`, `#work`, `#personal`, `#cv`, `#contact`. Fixed header/nav
  above `<main>`.
- `css/style.css` — all styles, single file, organized in commented blocks matching the
  HTML sections top to bottom.
- `js/main.js` — mobile nav toggle, hero parallax, Work carousel, custom cursor (see
  below). No libraries.
- `assets/` — exists with `cv/`, `icons/`, `images/` subfolders (flat categories, not
  nested per-content-type — there's no `work/`/`personal/` split inside `images/`).
  Real files have started landing in `images/`: `Zermatt.jpg` (work tile photo) and
  `zermatt-logo.png` (wordmark, transparent PNG). Convention: drop new images straight
  into `assets/images/`, kebab-case filenames, no spaces — exported files often arrive
  as e.g. `Zermatt logo.png`; rename before wiring in (see gotcha below). Real CV PDF
  now lives at `assets/cv/jack-bartrum-cv.pdf`, linked from the CV section's download
  button.
- `work/`, `personal/` — not yet created. Individual project detail pages linked from
  the Work and Personal tiles (see Outstanding work below).

To preview locally: `python3 -m http.server 8765` from the project root, then open
`http://localhost:8765`. See the caching gotcha below before trusting what you see.

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
is a normal, single-viewport section with `overflow: hidden`. `.hero__pin` (holding
the blob glow, grain, and name/tagline text) is `position: relative` — completely
normal in the document flow. `js/main.js` applies one continuous
`transform: translateY(scrollY * 0.4)` to it on scroll, so it visually lags behind
at 40% of normal scroll speed while `.about` right after it (untouched, scrolling at
full 1x speed) catches up and rides over it, clipped by `.hero`'s `overflow: hidden`.

Past a computed scroll position (`heroFreezeScrollY`, chosen so the text lands
`--nav-height + 24px` from the top), the transform formula switches to grow 1:1 with
`scrollY` instead of the 0.4x drag — that exactly cancels further scrolling, so the
text (and the rest of the visual, since it's one transformed element) holds its
screen position instead of continuing to drift up and off, while `.about` keeps
covering it from below.

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

**Tried and reverted: animated section backgrounds.** Explored putting a decorative
moving background behind About/Work/Personal/CV content — first a fixed, sitewide,
right-third rotating ASCII sphere (viewport-relative, sat in front of content at ~10%
opacity), then a per-section ASCII "ocean" band in the bottom quarter of each section,
then a full-section canvas flow-field (simplex noise, domain-warped lines, Balatro/
PewDiePie-style). All were removed again ("for now," per the user) — the codebase is
back to plain section backgrounds with no ASCII/canvas layer. Worth keeping the lessons
if this gets revisited:
- A background sitting *behind* a section's content needs `z-index: -1` on the
  background element nested inside a container with `isolation: isolate` (same pattern
  as the hero glow blobs — see gotcha #2). A plain fixed/sitewide background layer gets
  hidden outright by the opaque `.about`/`.work`/`.personal` backgrounds the moment it's
  behind them, which is what killed the first (sphere) attempt.
- Whether the pin (`.about__pin` etc.) should be stretched to the section's full
  `min-height: 100vh`, or left at its natural content height, depends on whether the
  background is full-bleed or confined to one edge: a bottom-anchored band pushed to
  the true bottom of a stretched 100vh pin ends up mostly below the fold, only
  flashing briefly during the cover transition; a full-section background doesn't have
  that problem since growing the container just means it covers more area.

**Hero glow.** `.hero__pin::before` / `::after` are blurred radial-gradient blobs with
`mix-blend-mode: screen`, animated via two independently-timed `@keyframes` for organic
non-repeating movement. The gradient stops are deliberately bright (a near-white hot
core fading through `#ffcf9c` → `#ff5a35` → `#c81f1f`) so the blob has a wide dynamic
range to react against. `.hero__name`, `.hero__role`, and `.hero__tagline` all use
`mix-blend-mode: difference` (`color: #ffffff`) against it, so the text stays white over
the black background and inverts harder the brighter/more saturated the blob is directly
behind it at any given moment — no JS needed, it's pure blend-mode math. The blob also
gets a small extra scroll-linked `translateY` via a `--blob-shift` custom property (set
in `updateHeroParallax`, ~15% of the pin's own scroll shift), so it visibly lags the text
by a fraction during scroll rather than moving in perfect lockstep with it.

**Grain texture.** `.hero__grain` is an SVG `feTurbulence` + `feColorMatrix` data-URI
background (see the `background-image` in `css/style.css`), not an image asset.

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
  `z-index: 4`, above the logo/badge (`z-index: 1`), ready for overview copy to be
  layered on top of it later (not built yet).

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

**Custom cursor.** `.cursor` (`position: fixed`, `z-index: 9999`) holds a lead dot plus 5
trailing dots; native cursor is hidden sitewide via `cursor: none` inside
`@media (pointer: fine)` only, so touch devices keep their default behavior untouched.
The lead dot eases toward the real mouse position each frame (lerp factor `0.5`); each
trailing dot eases toward the one ahead of it (factor `0.35`) — a chained "worm" follow.
How many trailing dots are visible is driven by the lead dot's current per-frame speed
via `Math.floor(speed / 4)`, so the trail lengthens with faster movement and collapses to
just the lead dot at rest.

The lead dot does a true per-pixel color invert of whatever's behind it via
`backdrop-filter: invert(1)` (`background-color: transparent`) — added after a plain
solid `background-color: var(--color-text)` dot went invisible against the CV card's
light background. `mix-blend-mode: difference` was tried first and rejected (see
gotcha #5) before landing on `backdrop-filter`. Only the *lead* dot inverts — the 5
trailing dots stay solid color (`var(--color-text)`, swapped to `#111111` via a
`.cursor--on-light` class when the cursor is over `.cv__document`, toggled in the
`mousemove` handler). This split was forced by two real bugs hit when every dot had
`backdrop-filter: invert(1)` — see gotcha #9. `.cursor__dot--lead` also carries
`z-index: 1` for the same reason (gotcha #9) — without it, an opaque trailing dot
happening to overlap the lead paints on top of it and occludes the invert, regardless
of the filter.

Hover growth (on `a`/`button`, via `.cursor--hover`, `event.target.closest('a, button')`
in the `mousemove` handler) is an eased `transform: scale()` computed in
`updateCursor()` (`cursorLeadScale`, blend factor `0.25`), not a CSS `width`/`height`
transition — resizing a `backdrop-filter` element's actual box was suspected of
desyncing its captured backdrop mid-transition. That specific theory turned out not to
be the real cause of the reported artifacts (the z-index/compounding issue in gotcha #9
was), but scale-based growth is compositor-only and strictly cheaper than animating
layout-affecting properties, so it was kept regardless.

Status: implemented and internally verified (forced DOM-level overlap tests, see
gotcha #9), but **not yet re-confirmed by the user against real mouse movement in a
real browser** — more than any other effect in this file, this one is impossible to
validate from a static screenshot. If a lag/ghosting report resurfaces, don't assume
it's the same bug already fixed here; re-diagnose fresh.

## Known gotchas (hard-won, don't re-discover these)

1. **`id`-to-global-variable collision.** An element like `<section id="hero">` creates
   an implicit `window.hero` property. Declaring `const hero = document.querySelector(...)`
   in `main.js` silently collides with it and halts the *entire* script's execution with
   no visible console error in casual testing. Any top-level `const`/`let` in `main.js`
   that matches an existing `id` in `index.html` (`hero`, `about`, `work`, `personal`,
   `cv`, `contact`, `top`) will do this — use distinct names instead (the existing code
   uses prefixes like `heroParallaxEl`, `workCarousel`, etc.).

2. **`mix-blend-mode` + stacking contexts.** If you give `.hero__inner` (or any element
   sitting in front of the blend-mode blob) its own `position` + `z-index`, it creates a
   new stacking context that silently breaks the blend calculation even inside a `.hero`
   with `isolation: isolate`. The blob pseudo-elements use `z-index: -1` specifically so
   `.hero__inner` doesn't need a competing `z-index` at all. Don't add one.

3. **Local dev server caching.** `python3 -m http.server` sends no cache-control headers,
   so a browser will happily keep serving a stale cached copy of `js/main.js` or
   `style.css` across reloads, even hard ones, while `fetch(url, {cache: 'no-store'})`
   correctly bypasses it — meaning it's easy to convince yourself a fresh edit "didn't
   work" during live testing. If a change stops appearing to take effect, suspect the
   cache before suspecting the code: bump a `?v=` query string on the affected `<script>`/
   `<link>` tag, verify, then remove it again. Also try a fresh Incognito window pointed
   at `http://localhost:8765` directly (not a double-clicked `file://` path) to rule out
   both caching and protocol-specific quirks in one step.

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

9. **`backdrop-filter` on multiple overlapping, independently-moving elements compounds
   and occludes.** Two distinct bugs surfaced building the custom cursor's invert effect
   (see "Custom cursor" above), both only visible with real mouse movement — a static
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

## Conventions

- Work section-by-section, checking in before moving to the next section — that's how
  this site has been built throughout (nav+hero → About → Work → Personal → CV → Contact →
  fonts → hero visual treatment → sitewide theme → Work carousel → hero parallax rebuild →
  header/bottom glass → section heading glow → custom cursor → Zermatt tile imagery →
  work tile hover glass reveal → scroll-stacking cards → animated section backgrounds
  (explored, reverted) → real CV content + expand/collapse → custom cursor invert
  rebuild).
- Reference designs are for *flow/behavior* inspiration only, not literal visual copying
  (e.g. midu.design was referenced for the scroll-parallax feel, not its actual layout;
  viclopez.art was referenced for the scroll-stacking cards' "next section covers the
  frozen one" feel) — though for the hero parallax specifically, its live DOM was
  directly inspected to reverse-engineer the exact technique after other approaches
  kept failing.
- No build step, no bundler, no package.json — keep it that way unless asked.

## Outstanding / not yet built

- Work tiles (`work/kodak.html`, `work/zermatt.html`, `work/twix.html`,
  `work/norwich-theatre-royal.html`) — linked from `index.html` but files don't exist yet.
- Personal project pages (`personal/film.html`, `personal/photo.html`, `personal/3d.html`)
  — same situation.
- Portrait photo for About (currently a placeholder frame).
- Real contact/social links (currently `mailto:jack@example.com` and `href="#"` placeholders).
- Work tile imagery — Zermatt now has a real photo (`assets/images/Zermatt.jpg`) and logo
  (`assets/images/zermatt-logo.png`); Kodak, Twix, and Norwich Theatre Royal are still
  flat color placeholders with plain-text logos.
- Work tile overview text — the `.work-tile__glass` hover reveal (frosted glass over the
  centered tile on hover) is built and working; the actual copy meant to sit on top of it
  hasn't been added yet.
