# Ethereal UI/UX Design System for AstrologaAI

**Aesthetic Vibe**: The "Ethereal Oracle." Deep space, stark contrast, and massive, vibrant glowing light sources. It should feel incredibly premium, mystical, and modern.

## 1. Color Palette

*   **Background (The Void)**: 
    *   Primary Background: `#000000` (Pitch Black)
    *   Surface Cards (Solid): `#15151A` (Deep Gray/Black)
*   **The Neon Orbs (Primary Accents)**:
    *   Electric Purple: `#7A00E6`
    *   Neon Fuchsia: `#E81CFF`
    *   Sunrise Orange: `#FF5500`
*   **Typography**:
    *   Headers: Clean White `#FFFFFF`
    *   Body: Muted Silver/Gray `#A1A1A5`

## 2. Shapes & Surfaces (CRITICAL)

*   **Rounded Corners:** Do NOT use sharp edges. Every card, panel, button, and chat bubble must have extremely thick rounding. Use `rounded-[32px]` or `rounded-3xl` for main panels, and `rounded-full` for primary action buttons.
*   **Solid Surfaces over Glass:** We are moving AWAY from transparent "glassmorphism." UI Cards should use the solid `#15151A` background so they stand out clearly against the pitch-black void and the bright background neon blobs.
*   **Glow Effects:** Add subtle drop-shadow glows to primary buttons (e.g., a fuchsia drop shadow behind a fuchsia button).

## 3. Typography

*   **Headers:** `Outfit` or `Inter`. Use very bold weights (`font-bold` or `font-black`), massive sizes (`text-5xl` for hero sections), and tight tracking (`tracking-tight`).
*   **Body:** Crisp, legible sans-serif.

## 4. The "Ethereal Orb" Background

*   Every full-page layout should have pure black `bg-black` as the base.
*   In the background, place absolutely positioned `div` elements with massive blurs (`blur-[120px]`) and neon background colors (`bg-[#E81CFF]`) to simulate glowing cosmic orbs floating behind the content.

## 6. Design System Notes for Stitch Generation
*(Copy this block into every `.stitch/next-prompt.md` baton)*
Use a pure black (`#000000`) background. Add 1-2 massive, absolutely positioned, deeply blurred (`blur-[120px]`) neon circles in `#E81CFF` (Fuchsia) and `#FF5500` (Orange) in the background. Make all foreground UI panels solid dark gray (`#15151A`) with extreme rounded corners (`rounded-[32px]`). Use `Inter` font. Primary buttons should be a solid gradient from fuchsia to orange with fully rounded pill shapes. No subtle glassmorphism—we want high-contrast solid panels over the glowing void.
