# inmoexchange

Next.js 15 + Tailwind + MongoDB (stubbed) — with a small design system.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Design system

All visual tokens live in **`app/globals.css`** as CSS variables:
- Colors: `--brand`, `--brand-light`, `--brand-accent`, `--foreground`, `--muted`, `--surface`, `--border`
- Radii: `--radius-sm`, `--radius`, `--radius-lg`
- Shadows: `--shadow-xs`, `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, `--shadow-brand`

Tailwind consumes them via `tailwind.config.ts`, so you can write:
```tsx
<div className="bg-brand text-white shadow-brand rounded-lg" />
```

Change a token in `globals.css` once and the whole app follows.

## Reusable components

```
components/
  ui/                       ← primitives
    Button.tsx              variants: primary | secondary | ghost, sizes: sm | md | lg
    Input.tsx               Input, Textarea, Select, Label
    Card.tsx                Card (with `interactive` prop), CardBody
    Layout.tsx              Container, Section, SectionHeading
    Badge.tsx
  sections/                 ← page sections composed of primitives
    HeroSection.tsx
    HowItWorksSection.tsx
    AgencySignupSection.tsx
  ListingCard.tsx           ← domain component
```

Pages just compose sections:
```tsx
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <AgencySignupSection />
    </>
  );
}
```

## File layout

```
app/
  layout.tsx                header + footer using <Container>
  page.tsx                  landing (composed of sections)
  globals.css               design tokens
  listings/
    page.tsx                grid
    [id]/page.tsx           detail
components/
  ui/*                      primitives
  sections/*                composed sections
  ListingCard.tsx
lib/
  cn.ts                     classname joiner
  listings.ts               data layer — mock data, swap for Mongo
  mongodb.ts                Mongo client singleton
```

## Wiring MongoDB

1. Add `.env.local`:
   ```
   MONGODB_URI="mongodb+srv://..."
   MONGODB_DB="inmoexchange"
   ```
2. In `lib/listings.ts`, replace `MOCK_LISTINGS` with a real query.

## Next up

- `lib/schemas/agency-signup.ts` — Zod schema shared by client form and API route
- `app/api/agencies/route.ts` — POST handler for signups
- Auth.js when you have 5+ agencies
- i18n (EN/PL) — copy from directSpain
# inmoexchange
