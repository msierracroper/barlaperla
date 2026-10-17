# Hyperframes Composition Brief: La Perla Soft

## Objective
Create a short launch-style brag video for La Perla Soft, the operating system for La Perla Video Bar.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: vertical — 1080x1920
- Duration: 23 seconds

## Source Material
- Project root: `D:\LA_PERLA_BAR\PERLASOFT`
- Primary files read: `app/globals.css` (palette/theme tokens), `app/layout.tsx` (fonts), `components/ui/*` (Card/button/switch primitives), `components/mesera/*` (mesas grid, nuevo-pedido, menu-selector), `components/cocina/comandas-pendientes.tsx`, `app/caja/*` (cobro, resumen), `app/admin/page.tsx` + `lib/dashboard.ts` (KPI dashboard), `components/admin/reportes-view.tsx` (Reportes)
- Product name: La Perla Soft (for La Perla Video Bar)
- Tagline / strongest claim: "Tu negocio, donde estés" — the admin dashboard and Reportes update live and are reachable from anywhere, without being physically at the bar
- Key UI or visual moment to recreate: the glass-morphic phone UI itself — the mesas/barras grid with a cyan-glow occupied tile, the gold-pill category tabs + magenta-gradient stepper, the admin KPI tiles counting up, the Reportes date-range pills + data table
- Copy that must appear verbatim:
  - "LA PERLA SOFT" (marquee wordmark)
  - "Tu bar. En vivo."
  - "Tu negocio, donde estés."
  - "Pedidos. Caja. Inventario. Todo en vivo."
  - UI labels as actually implemented: "Enviar a preparación", "Marcar listo", "Registrar pago y cerrar", "Venta total", "Utilidad estimada", "Fiados pendientes", "Reportes"

## Creative Direction
- Tone preset: cinematic
- Creative direction: "a bar's own neon marquee sign coming alive" — dramatic glow-ignition reveals, big Righteous type, wide confident holds, not comedic
- Interpretation: big, confident motion and light — glow-ignitions and glow-pulses carry the "dramatic reveal." Pacing stays energetic (short holds, fast cuts between the mobile beats) but every reveal still gets a full, legible hold — dynamism comes from motion/light, not from rushing text
- Angle: the product's own "Marquee Nocturna" redesign already looks like a neon bar sign — violet-night backgrounds, gold, magenta/cyan glow, a Righteous marquee wordmark. The video treats the app itself as the bar's marquee: it lights up like a sign, then proves the claim scene by scene — fast tableside ordering, instant kitchen sync, instant cash-out, and the owner's dashboard glowing with real numbers from anywhere.
- Hook: black screen, a gold glow ignites center-frame, "LA PERLA SOFT" lights up letter by letter like a marquee sign powering on, "Tu bar. En vivo." slams in and holds
- Outro / punchline: the full wordmark holds fully lit and steady (no flicker), tagline "Pedidos. Caja. Inventario. Todo en vivo." beneath, glow holds for the exit
- Avoid:
  - Generic SaaS language ("streamline your workflow", etc.)
  - Abstract filler visuals — every scene must show real product UI
  - Any visual redesign not already in the codebase — use the real Marquee Nocturna palette/components, don't invent a new look

## Visual Identity
- Background: `#120a22` → `#241a44` gradient ("noche de bar"), soft magenta glow wash top-center — see `.bg-perla-noche` in `app/globals.css`
- Text: `#f6f1ff` (warm near-white)
- Accent: `#f2c14e` (dorado/gold, primary); `#ff4d8d` → `#ff8a3d` (magenta→naranja gradient, CTA/energy); `#36e0d6` (cian, "live" glow); `#5fe3a0` (verde-claro, success)
- Display font: Righteous (Google Fonts) — marquee wordmark, scene titles, big numbers. Use sparingly, short lines only.
- Body font: Plus Jakarta Sans (Google Fonts) — UI labels, supporting lines
- Visual references from the project: glass-morphic cards (`bg-white/5` + `backdrop-blur-xl` + `border-white/10`), pill-shaped gold-filled active tabs with a soft glow shadow, cyan-halo "occupied" tile on the mesas/barras grid, magenta→naranja gradient circular stepper "+" button, gold-pill "Enviar a preparación"/CTA buttons with glow shadow

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract (full scene-by-scene detail, audio cues, and sequencing live there).

Scene summary:
1. Marquee ignition (hook) — 3.0s — "LA PERLA SOFT" wordmark ignites letter by letter; "Tu bar. En vivo." holds.
2. Mesera, tableside — 5.7s — real mesas/barras grid (cyan-glow occupied tile) → real nuevo-pedido screen (gold category pills, magenta stepper "+", cart total ticking up) → glowing "Enviar a preparación" press.
3. Kitchen + cash, in sync — 4.4s — live comanda card arrives and gets marked "Listo"; hard cut to the real cobro screen (payment-method pills, auto change calc, "Registrar pago y cerrar" confirm).
4. Admin, anywhere (the payoff — do not cut or shorten) — 6.6s — a phone/laptop held away from the bar's glow; real admin Resumen dashboard with KPI tiles counting up (Venta total, Utilidad estimada, Fiados pendientes); clean transition into Reportes (date-range pills + real data table); line lands: "Tu negocio, donde estés."
5. Outro / marquee re-ignited — 3.3s — full wordmark holds steady and fully lit; tagline "Pedidos. Caja. Inventario. Todo en vivo."; glow holds for exit.

## Audio
- Audio role: cinematic support with a restrained rhythmic pulse — present and driving, never dense or novelty
- Audio arc: bed starts right on the hook ignition, stays mid-volume and tight through scenes 2-3, swells gently under the Scene 4 payoff, fades under the Scene 5 hold
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (109.96 BPM, steady/clean — matches `cinematic`)
- Music treatment: start at 0.0s (no pre-roll silence), volume ~0.3-0.35 under scenes 1-3 so UI SFX read clearly, gentle swell (~0.4) under Scene 4, fade to ~0 across Scene 5's hold rather than a hard stop
- Music cue guidance: bundled preset at `<brag-skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.{md,json}`. Strong-cue locks (±0.15s): **8.74s** → Scene 2→3 cut, **13.11s** → Scene 3→4 hard cut into the admin payoff (the most important lock in the video), **22.93s** (intensity 1.00, the strongest cue in the track) → final marquee re-ignition landing in Scene 5. Beat grid (~0.54-0.56s spacing) available for stepper-tap/comanda-arrival accents in scenes 2-3 (±0.10s) — snap readable text to every other beat only, non-text glow/tick accents may use every beat.
- Audio-reactive treatment: subtle — marquee glow and card edge-glow may breathe gently with the music's low end (RMS/bass); never a waveform, equalizer, or literal visualizer
- Audio-coupled moments:
  - Scene 1 — each marquee letter igniting — soft glow-ignite tick per letter
  - Scene 2 — stepper "+" taps and cart total ticking up — light UI tap per press; short "send" whoosh on the final "Enviar a preparación" press
  - Scene 3 — comanda card arrival, "Listo" confirm, payment confirm — kitchen-ticket pop on arrival, cash-register-style chime on payment confirm
  - Scene 4 — KPI tiles counting up in sequence — soft digital tick-up under each count, landing the 13.11s strong cue right on the hard cut in
  - Scene 5 — final marquee hold — no new SFX; let the 22.93s strong cue and the music fade carry it
- SFX selection guidance: match the gesture — card/ticket-style sounds for the comanda arrival, a clean UI click for stepper taps and button presses, a warm bell/chime-style cue for the payment confirm and the admin payoff, nothing glitchy or comedic (see Restraint rule below)
- SFX analysis guidance: read `sfx-analysis.md` in the brag skill's SFX library; prefer low/medium high-frequency-risk files since several moments (stepper taps, KPI ticks) repeat within the video
- Exact SFX choice: Hyperframes chooses exact filenames, timestamps, density, and volume based on the implemented animation
- Restraint rule: no comedic "boing"/cartoon SFX, no chiptune stingers, no audio gag — this is a real client's commercial product; tone stays confident and premium throughout
- Audio files: copy `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` and any Hyperframes-selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). `/brag` is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo/launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show real UI from the source project in scenes 2, 3, and 4 — not abstract mockups of a generic app.
- Keep all text readable in the final render (apply the reading-time floor from `brag-plan.md`).
- Keep the video at 23 seconds (within the 15-25s window).
- Include the planned music/SFX layer — not disabled, not documented as silent.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore cues that hurt readability, scene pacing, or the product story.
- Use the 3 strong-cue locks (8.74s, 13.11s, 22.93s) as the major beat-lock targets; mark each `// beat-locked: <time>`.
- Use the beat grid for sequential non-text accents in scenes 2-3; mark `// beat-grid: ...`.
- Use SFX to support motion and interaction per the moment→sound heuristics in the brag `audio.md` reference.
- When music is present, extract audio data and wire at least one subtle audio-reactive element (glow/presence breathing with RMS/bass) — avoid waveform/equalizer visuals.
- Use local assets for audio and any required runtime/media dependencies.
- Run `hyperframes check` before render — it is brag's single gate.
- Keep creation and rendering local. Remote or publishing workflows require a separate explicit user request.
