# Ride Radar 2.0 — Design System

## Philosophy
A motorcycle rider's tactical HUD. Alive, pulsing, connected. Medical-monitor precision meets radar technology. Every screen should feel like you're gearing up and plugging into the network.

---

## Color Palette

### Base
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0a0f` | Deep charcoal — premium, not pure black |
| `--surface` | `#12121a` | Cards, panels, inputs |
| `--surface-elevated` | `#1a1a24` | Hover states, elevated cards |
| `--border` | `#2a2a35` | Subtle dividers |

### Accents
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#39FF14` | Neon green — brand, active states, pulse |
| `--primary-dim` | `rgba(57,255,20,0.12)` | Glows, backgrounds |
| `--cyan` | `#00f0ff` | Radar, tech, maps, live indicators |
| `--cyan-dim` | `rgba(0,240,255,0.12)` | Cyan glows |
| `--amber` | `#ffb800` | Events, community, warmth |
| `--amber-dim` | `rgba(255,184,0,0.12)` | Amber backgrounds |
| `--pulse` | `#ff3366` | Alerts, urgency, heartbeat accents |
| `--pulse-dim` | `rgba(255,51,102,0.12)` | Alert backgrounds |
| `--purple` | `#a855f7` | Premium, gradients, special features |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#ffffff` | Headlines, important text |
| `--text-secondary` | `#a1a1aa` | Body text, descriptions |
| `--text-muted` | `#71717a` | Labels, placeholders, timestamps |

---

## Typography

- **Font:** Inter (keep existing)
- **Headings:** Bold, tight tracking (`tracking-tight`)
- **Labels:** Uppercase, wide tracking (`tracking-widest`), small size
- **Numbers/Data:** Monospace for counts, distances, timestamps

---

## Effects

### Glow System
```
small-glow:  0 0 8px  rgba(57,255,20,0.35)
med-glow:    0 0 16px rgba(57,255,20,0.25)
large-glow:  0 0 32px rgba(57,255,20,0.15)
cyan-glow:   0 0 12px rgba(0,240,255,0.30)
```

### Glassmorphism
```
glass: bg-surface/80 backdrop-blur-xl border border-white/8
```

### Gradients
```
radar-gradient: radial gradient from primary/10 at center to transparent
pulse-gradient: linear from primary/5 via cyan/5 to pulse/5
```

---

## Animation Language

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `snap` | 150ms | `ease-out` | Micro-interactions, toggles |
| `fluid` | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| `dramatic` | 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Page transitions, reveals |
| `heartbeat` | 1.2s | `ease-in-out` | Infinite pulse loops |

---

## Component Patterns

### Bottom Nav (TikTok/YouTube style)
- 4 items: Radar, Broadcast, Messages, Rider
- Active: filled icon + primary color + subtle scale(1.05)
- Inactive: stroke icon + text-muted
- No labels on mobile (icon only), labels on tablet+
- Floating pill shape on tablet, full-width on mobile
- Center "Broadcast" button can be elevated circle

### Header
- Minimal: logo left, actions right
- Glassmorphism background
- 1px bottom border at `border` color
- Height: 56px mobile, 64px desktop
- Hide on scroll down, reveal on scroll up (optional future)

### Cards
- `surface` background
- 1px `border`
- `rounded-2xl`
- Hover: `surface-elevated` + subtle glow

---

## Splash Screen Sequence

1. **Boot (0-400ms):** Black screen. Grid lines draw in from center (SVG stroke animation).
2. **EKG Sweep (400-1800ms):** CRT-style EKG line sweeps left-to-right with phosphor glow trail. Heartbeat rhythm (two small pulses, one big spike).
3. **Terminal Text (1200-2200ms):** "RIDE RADAR // ESTABLISHING UPLINK..." types out in terminal green, character by character.
4. **Pulse Build (2000-2600ms):** EKG amplitude increases, screen subtly pulses with primary glow.
5. **Dissolve (2600-3000ms):** Grid and EKG shatter into particles that spiral inward and fade.
6. **Reveal (3000ms+):** Splash fades out, AppContent fades in.

Total duration: ~3.2s. Hard cutoff at 5s.
