# FeeDesk Brand Guidelines
Version 1.0 — 2026

---

## Logo

### The mark
The FeeDesk logo mark is a speech-bubble-with-tail shape containing stacked
ledger lines and an upward-trending payment graph. The speech bubble references
the SMS communication channel at the heart of FeeDesk; the ledger lines and
trend graph communicate financial tracking and growth.

### Clearspace
Always maintain clearspace equal to the height of the capital "F" in FeeDesk
on all four sides of the full logo lockup. Never crowd the logo against other
elements.

### Minimum sizes
- Full lockup (icon + wordmark): 140px wide minimum (digital), 35mm (print)
- Icon only: 24px minimum (digital), 8mm (print)
- Do not use the tagline at sizes below 200px wide

### Colour variants
| Variant | Use case |
|---|---|
| Primary (blue icon, dark wordmark) | Default on white / light backgrounds |
| Dark mode (navy icon, white wordmark) | On dark backgrounds |
| All-white | On the brand blue (#1251A3) background only |
| Icon only | Favicons, app icons, avatars |

### What never to do
- Do not recolour the icon in any colour other than specified
- Do not stretch, skew, or rotate the mark
- Do not add drop shadows or outer glows
- Do not use the wordmark without the icon (exception: very tight horizontal spaces)
- Do not place the primary logo on dark backgrounds — use the dark mode variant

---

## Colour palette

### Primary
| Name | Hex | Use |
|---|---|---|
| Brand Blue | #1251A3 | Primary CTA, logo, links, key UI elements |
| Accent Blue | #5CB8FF | Highlights, graph nodes, hover states |
| Deep Navy | #0C1018 | Dark mode backgrounds, dark text |

### Neutrals
| Name | Hex | Use |
|---|---|---|
| Gray 950 | #0C1018 | Dark background |
| Gray 600 | #4B5563 | Secondary text |
| Gray 300 | #D1D5DB | Borders, dividers |
| Gray 50 | #F9FAFB | Page background |

### Semantic
| Name | Hex | Use |
|---|---|---|
| Success | #16A34A | Confirmed payments, cleared balances |
| Warning | #D97706 | Partial payments, pending alerts |
| Danger | #DC2626 | Overdue balances, failed payments |

### Colour accessibility
- Brand Blue (#1251A3) on white: contrast ratio 7.2:1 — passes WCAG AA and AAA
- Accent Blue (#5CB8FF) on Deep Navy (#0C1018): contrast ratio 6.1:1 — passes AA
- Never use Accent Blue on white as body text (contrast too low)

---

## Typography

### Primary typeface — Manrope
Used for all UI text, headings, and the wordmark.
Google Fonts: https://fonts.google.com/specimen/Manrope

| Style | Weight | Size | Use |
|---|---|---|---|
| Display | 800 | 48–72px | Hero headings, marketing |
| Heading 1 | 700 | 32–40px | Page titles |
| Heading 2 | 700 | 24–28px | Section titles |
| Heading 3 | 600 | 18–20px | Card titles, panel headers |
| Body | 400 | 14–16px | All body text |
| Label | 600 | 11–12px | Form labels, badges |
| Caption | 400 | 11–12px | Secondary metadata |

### Secondary typeface — Space Mono (optional accent)
Used sparingly for tagline, transaction references, code-adjacent elements.
Google Fonts: https://fonts.google.com/specimen/Space+Mono

| Style | Use |
|---|---|
| Regular 400 | Transaction refs, MPESA codes, dates in tight spaces |
| Bold 700 | Tagline only |

### Type don'ts
- Never use weights below 400 or above 800
- Never use letter-spacing on body text (only on all-caps labels, 0.1–0.2em)
- Never mix more than two typefaces in any single composition
- Manrope 800 at large sizes should always have negative letter-spacing (–0.03em to –0.05em)

---

## Tagline

**"Every payment. Accounted for."**

Use in sentence case with the period. The period after "payment" is intentional
and structural — it communicates precision and finality, which reflects what the
product does. Do not change the punctuation.

Alternative taglines for specific contexts:
- App store / short form: "School fees, sorted."
- Investor / pitch: "Real-time school fee management for Kenya."
- SMS / tight spaces: "Powered by FeeDesk"

---

## Logo usage on backgrounds

| Background | Variant to use |
|---|---|
| White (#FFFFFF) | Primary |
| Light gray (#F9FAFB, #F3F4F6) | Primary |
| Brand Blue (#1251A3) | All-white variant |
| Dark navy (#0C1018, #1A1F2B) | Dark mode variant |
| Photography / busy backgrounds | Use all-white on a semi-transparent dark overlay |

---

## Brand voice

FeeDesk speaks to school administrators and bursars — people who are responsible
for financial accuracy and trust. The brand voice is:

- **Clear** — never use jargon. Say "payment received" not "transaction processed"
- **Direct** — state facts. "KES 25,000 received" not "We're pleased to confirm..."
- **Reassuring** — accuracy matters. Communicate that the system is in control
- **Respectful** — bursars are professionals. Don't be patronising
- **Kenyan** — embrace local context. Use "MPESA", "KES", "paybill" naturally

---

## File contents

```
feedesk-brand/
├── logos/
│   └── svg/
│       ├── feedesk-logo-primary.svg       Light background, full lockup
│       ├── feedesk-logo-dark.svg           Dark background, full lockup
│       ├── feedesk-logo-white.svg          On brand-blue background
│       ├── feedesk-wordmark.svg            Wordmark without icon
│       ├── feedesk-icon-only.svg           Icon mark, light variant
│       └── feedesk-icon-dark.svg           Icon mark, dark variant
├── assets/
│   ├── colors.css                          CSS custom properties
│   ├── brand-guidelines.md                 This file
│   └── tailwind-tokens.js                  Tailwind config extension
└── README.md
```
