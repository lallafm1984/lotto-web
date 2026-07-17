# Design QA — くじぐらし Japanese landing

- Source visual truth: `/Users/lim/Desktop/프로젝트/lotto-jp/docs/marketing/google-play-assets/exec-f7b9d907-8824-4180-b7b9-d25d1fb8dade.png`
- Supporting source assets: `/Users/lim/Desktop/프로젝트/lotto-jp/docs/marketing/google-play-assets/sc_1.png` through `sc_5.png`, plus `Icon.png`
- Implementation: `http://127.0.0.1:3000/`
- Desktop implementation screenshot: `/Users/lim/.codex/visualizations/2026/07/17/019f6f7f-8b06-7292-acee-c7a1fb38562e/lotto-final-desktop.png`
- Mobile implementation screenshot: `/Users/lim/.codex/visualizations/2026/07/17/019f6f7f-8b06-7292-acee-c7a1fb38562e/lotto-final-mobile.png`
- Tablet implementation screenshot: `/Users/lim/.codex/visualizations/2026/07/17/019f6f7f-8b06-7292-acee-c7a1fb38562e/lotto-final-tablet.png`
- Combined source/implementation evidence: `/Users/lim/.codex/visualizations/2026/07/17/019f6f7f-8b06-7292-acee-c7a1fb38562e/lotto-design-comparison.png`
- Viewports: 1440×900, 768×1024, 390×844
- State: Japanese public landing, pre-release Android announcement, mobile menu closed/open

## Full-view comparison evidence

The combined comparison places the supplied Japanese feature graphic and the browser-rendered first viewport in one image. The implementation carries over the source's cream, gold, dark brown, cobalt, and red palette; the exact probability promise; the supplied character and red-button art; and the gold-framed game imagery. The HTML layout intentionally converts the store graphic into a responsive editorial landing system while preserving the source artwork as the visual anchor.

## Focused comparison evidence

The hero region was used as the focused comparison because it contains the source's critical typography, character, button, number-ball imagery, and conversion message. Additional mobile and tablet captures verify that the art remains legible and moves above the explanatory copy on smaller screens. No further crop was needed because the source visual itself is a hero-only graphic and all critical details are readable in the combined comparison.

## Fidelity surfaces

- Fonts and typography: The main Japanese promise uses a heavy Japanese Gothic treatment for fast web readability; Mincho is retained for the brand wordmark and legal-page display titles. The final desktop H1 holds the intended two-line break, and the mobile H1 does not clip.
- Spacing and layout rhythm: Hero copy, art, explanation, CTAs, and probability facts form a stable two-column desktop grid and a deliberate title → art → explanation sequence on mobile. No page-level horizontal overflow was measured at 390, 768, or 1440 widths.
- Colors and tokens: Cream/gold/brown/red/cobalt are directly derived from the supplied marketing art. Small gold text was darkened after contrast review, and focus-visible outlines use cobalt for separation.
- Image quality and assets: All visible brand and game imagery uses the supplied raster assets, with their original aspect ratios preserved. No CSS/HTML approximation replaces the icon, character, red button, number balls, or game screens.
- Copy and content: The revised Japanese marketing guide's priority is followed: game-internal first prize and roughly 1-in-6.1-million odds, then select/draw/record, then growth and automation, then the non-cash disclaimer. Korean public UI copy was removed.

## Comparison history

### Iteration 1

- Earlier P1: The desktop title broke awkwardly into three lines and the mobile art began below the first fold.
- Fix: Locked the Japanese promise into two intentional lines and changed the responsive hero grid to title → art → explanation on mobile.
- Post-fix evidence: `lotto-final-desktop.png` and `lotto-final-mobile.png` show the complete promise and the supplied character/button art above the fold without clipping.

- Earlier P1: Navigation switched to desktop mode at 768px and wrapped into a crowded header.
- Fix: Moved the desktop-navigation breakpoint to 1024px and kept the compact menu at tablet width.
- Post-fix evidence: `lotto-final-tablet.png` shows a single-line brand lockup and a 44px menu control with no horizontal overflow.

- Earlier P1: `overflow-hidden` prevented the sticky header from remaining visible after anchor navigation.
- Fix: Replaced it with `overflow-x-clip`, added section scroll margins, and rechecked the `#screens` anchor.
- Post-fix evidence: at scrollY 1414, the header remained at top 0 and the target section began below it.

- Earlier P2: English section labels weakened the Japanese-only product impression; screenshot copy did not fully follow the revised guide.
- Fix: Replaced the labels with Japanese, reordered the screenshot captions to probability → selection → growth → automation → game-internal first prize, and refined terminology to `抽せん`, `当せん`, and `ゲーム内1等`.
- Post-fix evidence: browser DOM and screenshots show Japanese labels and guide-aligned copy.

- Earlier P2: The mobile menu did not close on Escape and its touch target was too short.
- Fix: Added a 44px minimum height, `aria-controls`, a document-level Escape handler, focus return, and 44px menu links.
- Post-fix evidence: interaction test changed `aria-expanded` from `true` to `false` after Escape and restored the open-menu label.

## Primary interactions tested

- Desktop and mobile internal anchor navigation
- Sticky header after navigating to the game-screen section
- Mobile menu open/close and Escape key behavior
- Skip link target on the home and shared document hero
- Mobile legal-document table reflow and table of contents
- Browser console warnings/errors: none

## Findings

No actionable P0/P1/P2 visual or responsive issues remain.

### Follow-up polish (P3)

- The supplied hero graphic includes the same probability headline as the HTML hero. This is acceptable for the current asset set, but a future text-free character/background crop would remove the residual message repetition.
- The screenshot gallery is keyboard-focusable and has a mobile swipe instruction; explicit previous/next controls can be added if the gallery becomes a primary conversion surface.
- The pre-release legal pages deliberately retain draft/implementation-status language. They must be replaced with verified dates, retention periods, regions, and deletion procedures before production publication.

## Implementation checklist

- [x] Source-aligned Japanese hero and game assets
- [x] Responsive desktop/tablet/mobile layouts
- [x] Japanese-first navigation and public pages
- [x] Non-cash and real-lottery disclaimer
- [x] Keyboard, focus, reduced-motion, and mobile-menu checks
- [x] Lint, TypeScript, production build, and browser console checks

final result: passed
