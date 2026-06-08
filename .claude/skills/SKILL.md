# CompCareHub — Website Design Skill

> Apply these rules for every UI task on the CompCareHub marketing website (`/landing`).
> Do not deviate from these tokens. Do not invent new colours, fonts, or spacing values.

---

## 1. Brand Identity

**Product name:** CompCare Hub  
**Full legal name:** Comprehensive Care Service  
**Logo file:** `logo.jpeg` (white background, square, use on dark backgrounds with `background: white; padding: 3px; border-radius: 10px`)  
**Tagline:** "The all-in-one digital platform for UK care homes"  
**Market:** UK registered care homes, supported living, domiciliary care providers  
**Tone:** Professional, warm, trustworthy — not clinical or corporate. Like a knowledgeable colleague, not a hospital brochure.  
**Avoid:** Generic SaaS-startup aesthetic. No teal gradients, no purple blobs, no "AI-generated" stock photo vibes.

---

## 2. Typography

### Fonts (already loaded via Google Fonts)
```css
font-family: 'Plus Jakarta Sans', system-ui, sans-serif;   /* body, UI, labels */
font-family: 'Fraunces', Georgia, serif;                    /* headings h1–h3 */
```

### Type Scale (use these sizes only — no random values)
| Role | Size | Weight | Font |
|---|---|---|---|
| Display / Hero h1 | `clamp(2.6rem, 5vw, 3.8rem)` | 900 | Fraunces |
| Section heading h2 | `clamp(2rem, 3.5vw, 2.8rem)` | 800 | Fraunces |
| Card heading h3 | `1.4rem` | 700 | Fraunces |
| Eyebrow / label | `0.78rem` | 700 | Plus Jakarta Sans, uppercase, tracked |
| Body / lead | `1.1rem – 1.15rem` | 400–500 | Plus Jakarta Sans |
| Body default | `1rem` | 400 | Plus Jakarta Sans |
| Caption / small | `0.85rem – 0.92rem` | 500–600 | Plus Jakarta Sans |
| Nav links | `0.92rem` | 600 | Plus Jakarta Sans |
| Button text | `0.92rem – 0.95rem` | 700–800 | Plus Jakarta Sans |

### Line Heights
- Headings: `1.15`
- Body / lead: `1.65 – 1.7`
- Tight (cards, labels): `1.3`

### Italics
Use `<em>` or `font-style: italic` inside headings to highlight the key value word. The italic Fraunces style is distinctive and on-brand.  
Example: `The <em>smarter</em> way to manage your care home`

---

## 3. Colour Tokens

Use CSS custom properties. Never use raw hex codes inline — always reference a token.

```css
:root {
  /* Gold (primary brand accent) */
  --gold:        #d4a017;
  --gold-light:  #f0c840;
  --gold-dark:   #a07a10;
  --gold-pale:   rgba(212, 160, 23, 0.08);
  --gold-border: rgba(212, 160, 23, 0.25);

  /* Backgrounds (dark scale) */
  --black:   #080808;   /* page background */
  --black2:  #111111;   /* card / section backgrounds */
  --black3:  #181818;   /* elevated card, pill backgrounds */
  --black4:  #222222;   /* input backgrounds, hover states */

  /* Text */
  --white:     #ffffff;
  --off-white: #f5f5f5;
  --grey:      #a0a0a0;   /* secondary body text */
  --grey2:     #6a6a6a;   /* tertiary / captions */

  /* Borders */
  --border: rgba(255, 255, 255, 0.08);

  /* Radius */
  --radius:    16px;
  --radius-sm: 10px;
}
```

### Semantic usage
| Token | Use for |
|---|---|
| `--gold` | CTAs, active states, highlighted text, icons, borders on focus |
| `--gold-light` | Hover state of gold buttons |
| `--gold-pale` | Badge backgrounds, section tints, subtle highlights |
| `--gold-border` | Card borders on hover, badge borders |
| `--black` | Page base background |
| `--black2` | Card backgrounds, nav background |
| `--black3` | Pill backgrounds, chip backgrounds |
| `--black4` | Input bg, hover row bg |
| `--grey` | Secondary body text, list items |
| `--grey2` | Captions, timestamps, helper text |
| `--border` | Dividers, default card borders |

**Never use:** white backgrounds, light-mode greys (`#f5f5f5` as a background), random purples, random blues, gradients that aren't gold-based.

---

## 4. Spacing System

Base unit: **8px**.  
All spacing values must be multiples of 8.

| Token | Value | Use |
|---|---|---|
| `4px` | `0.25rem` | Fine gaps (icon–label) |
| `8px` | `0.5rem` | Tight element gaps |
| `12px` | `0.75rem` | Internal padding (badge, pill) |
| `16px` | `1rem` | Card padding SM, inline gaps |
| `24px` | `1.5rem` | Card padding, grid gaps SM |
| `32px` | `2rem` | Section padding SM, stack gaps |
| `40px` | `2.5rem` | Feature item spacing |
| `48px` | `3rem` | Card padding LG |
| `64px` | `4rem` | Section padding |
| `72px` | `4.5rem` | `.section-sm` vertical padding |
| `100px` | `6.25rem` | `.section` standard vertical padding |
| `130px` | `8.125rem` | Hero top padding (accounts for fixed nav) |

### Layout
```css
.container { max-width: 1200px; margin: 0 auto; padding: 0 5%; }
```
- Max content width: **1200px**
- Horizontal page padding: **5%** (scales with viewport)
- Grid gaps: `2rem` (cards), `4rem` (hero two-col)
- Never use `margin: auto` inside flex/grid children for alignment — use `gap` and `justify-content`.

---

## 5. Component Patterns

### Buttons
Two variants only:

```css
/* Primary — gold fill */
.btn-primary {
  background: var(--gold);
  color: #000;
  padding: 0.75rem 1.75rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.95rem;
  box-shadow: 0 4px 20px rgba(212, 160, 23, 0.35);
  transition: all 0.2s;
}
.btn-primary:hover {
  background: var(--gold-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(212, 160, 23, 0.45);
}

/* Outline — ghost with white border */
.btn-outline {
  background: transparent;
  color: var(--white);
  border: 2px solid var(--border);
  padding: 0.75rem 1.75rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-outline:hover {
  border-color: var(--gold);
  color: var(--gold);
}
```

- Buttons are **always pill-shaped** (`border-radius: 50px`) on this marketing site.
- Never use square or slightly-rounded buttons on marketing pages.
- Icon inside button: 16–18px, same colour as text, gap of `0.5rem`.

### Nav CTA (special button variant)
```css
.nav-cta {
  background: var(--gold);
  color: #000;
  padding: 0.55rem 1.4rem;
  border-radius: 50px;
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.01em;
}
```

### Eyebrow / Section Labels
Always appears above an `h2`. Pill shape, gold tint.
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(212, 160, 23, 0.12);
  color: var(--gold);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  border-radius: 50px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid var(--gold-border);
}
```
Always add `margin-bottom: 1.5rem` after the badge before the heading.

### Cards
```css
.card {
  background: var(--black2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  transition: border-color 0.25s, transform 0.2s;
}
.card:hover {
  border-color: var(--gold-border);
  transform: translateY(-3px);
}
```
- Cards sit on `--black` page background.
- Card icon containers: `48px × 48px`, `border-radius: 12px`, `background: var(--gold-pale)`, icon in `--gold`.
- Avoid white cards on this site — keep everything in the dark palette.

### Feature Grid
- Desktop: 3 columns (`grid-template-columns: repeat(3, 1fr)`)
- Tablet: 2 columns
- Mobile: 1 column
- Gap: `2rem`

### Section structure (standard)
```html
<section class="section">
  <div class="container">
    <div class="section-header">          <!-- centered text block -->
      <div class="badge">Eyebrow</div>
      <h2>Section heading with <em>italic</em> word</h2>
      <p class="lead">One or two sentences describing the section.</p>
    </div>
    <!-- content grid below -->
  </div>
</section>
```
```css
.section-header {
  text-align: center;
  max-width: 640px;
  margin: 0 auto 4rem;
}
.section-header h2 { margin-bottom: 1rem; }
.section-header .lead { color: var(--grey); }
```

### Stats / Proof bar
Horizontal strip between sections. Dark `--black3` background, gold numbers.
```css
.stat-value { font-size: 2.5rem; font-weight: 900; color: var(--gold); font-family: 'Fraunces', serif; }
.stat-label { font-size: 0.88rem; color: var(--grey); margin-top: 0.25rem; }
```

### Trust pills (hero social proof)
```css
.trust-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--black3);
  border: 1px solid var(--border);
  padding: 0.35rem 0.75rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--grey);
}
```

### Navigation
- Fixed, full width, `height: 70px`
- `background: rgba(8,8,8,0.92)` with `backdrop-filter: blur(20px)`
- Adds `box-shadow` and stronger gold border on scroll (`.scrolled` class via JS)
- Logo + product name on left, links + CTA on right
- Mobile: hamburger toggle, full-screen mobile nav drops below header

---

## 6. Visual Style Rules

### Backgrounds & Sections
- Alternate sections between `--black` and `--black2` — never two `--black2` sections in a row.
- Use `radial-gradient` gold glows sparingly — one per hero, one per CTA section max:
  ```css
  background: radial-gradient(ellipse 60% 50% at 70% 30%, rgba(212,160,23,0.06) 0%, transparent 70%);
  ```
- Gold horizontal rule as a subtle divider: `height: 1px; background: linear-gradient(90deg, var(--gold-border), transparent)`

### Imagery
- Real photography of care workers / care home environments — warm, human, professional.
- Photos always in `border-radius: 20px` containers with `border: 2px solid var(--gold-border)`.
- No generic stock photos of laptops on desks or blue-tinted tech imagery.
- If using app screenshots: add a dark bezel frame with gold border.

### Icons
- Use SVG inline icons or a consistent icon set (Lucide or Heroicons style, stroke-based).
- Always `--gold` or `--grey` coloured — never random colours per icon.
- Size: `20px` in feature cards, `16px` inline with text, `24px` in stat items.

### Gradients
Only two approved gradients:
1. **Gold CTA gradient** (buttons only): `linear-gradient(135deg, #e8b130 0%, #d4961a 100%)`
2. **Subtle page glow** (hero/CTA sections only): `radial-gradient(ellipse at top, rgba(212,160,23,0.07), transparent 60%)`

No rainbow gradients, no blue-purple gradients, no mesh gradients.

---

## 7. Page Sections (for CompCareHub website)

Build these sections in order:

1. **Nav** — Logo, links (Features, Pricing, About, Contact), "Book a Demo" CTA
2. **Hero** — Headline with italic word, sub-copy, two buttons (primary + outline), trust pills (CQC-ready, UK-based support, 100+ homes), photo collage of app + care setting
3. **Logos / Social proof bar** — "Trusted by care homes across the UK" + stat strip (homes, residents managed, etc.)
4. **Features grid** — 6 cards: Residents & Care Plans, Medication (MAR), Staff & Rota, Daily Records, CQC Compliance, Family Portal
5. **How it works** — 3-step numbered flow: Set up your home → Add residents & staff → Go live in minutes
6. **Testimonial** — One strong quote block, manager name + home name, gold left-border accent
7. **Pricing** — 2–3 tiers, gold highlight on recommended tier, pill buttons
8. **CTA banner** — Full-width dark section, big headline, single "Book a Demo" button
9. **Footer** — Logo + tagline, nav links, legal links, "Made for UK care" note

---

## 8. Anti-Patterns — Never Do These

- No `#ffffff` or light backgrounds anywhere on the marketing site
- No random accent colours (no blue, no purple, no teal) — gold is the only accent
- No `box-shadow` with coloured spread on cards (only `rgba(0,0,0,...)` shadows or gold glows on hover)
- No `border-radius` values not in the token list (no `4px`, no `8px` on large cards)
- No font sizes outside the type scale table above
- No inline `style=""` colour values — always use CSS custom properties
- No Lorem Ipsum — use real care-home-appropriate copy
- No generic hero illustrations (floating shapes, abstract waves)
- No full-bleed white sections between dark sections
- No buttons with square corners on the marketing site
- No more than 2 typefaces (Plus Jakarta Sans + Fraunces — already loaded)
- Do not add framer-motion or animation libraries without explicit instruction
- Do not create separate CSS files per component — keep all styles in one `<style>` block in `index.html` or a single linked stylesheet
