# RideRadar 2.0 — Audit Listings Index

> Comprehensive codebase audit findings organized for AI comparison and remediation tracking.
> **Audit Date:** 2026-05-31  
> **Files Analyzed:** 208 source files (187 JS/JSX + 21 SQL/config)  
> **Total Findings:** 508 issues

---

## Severity Distribution

| Severity | Count | Status | File |
|----------|-------|--------|------|
| CRITICAL | 48 | ✅ Listed | [`by-severity/CRITICAL.md`](by-severity/CRITICAL.md) |
| HIGH | 134 | ✅ Listed | [`by-severity/HIGH.md`](by-severity/HIGH.md) |
| MEDIUM | 212 | ✅ Listed | [`by-severity/MEDIUM.md`](by-severity/MEDIUM.md) |
| LOW | 114 | ✅ Listed | [`by-severity/LOW.md`](by-severity/LOW.md) |

---

## Directory Structure

```
audit-listings/
├── README.md                              ← You are here
├── by-severity/
│   ├── CRITICAL.md                        ← 48 findings (Week 1)
│   ├── HIGH.md                            ← 134 findings (Week 2)
│   ├── MEDIUM.md                          ← 212 findings (Week 3)
│   └── LOW.md                             ← 114 findings (Week 4)
├── by-file/
│   └── CROSS_REFERENCE.md                 ← Every file mapped to its findings
├── by-category/
│   └── CATEGORY_BREAKDOWN.md              ← 7 categories with top issues
└── remediation-roadmap/
    ├── ROADMAP.md                         ← Week-by-week sprint plan
    └── PRIORITY_QUEUE.md                  ← Top 25 fixes in priority order
```

---

## Category Distribution

| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| Security | 10 | 18 | 22 | 12 | 62 |
| Performance | 6 | 22 | 39 | 17 | 84 |
| PWA / Mobile | 6 | 11 | 22 | 14 | 53 |
| UI / UX | 5 | 20 | 25 | 8 | 58 |
| Supabase / Database | 10 | 21 | 27 | 14 | 72 |
| Error Handling / Edge Cases | 11 | 32 | 41 | 23 | 107 |
| Code Quality | 0 | 10 | 36 | 40 | 86 |
| **TOTAL** | **48** | **134** | **212** | **114** | **508** |

---

## Top 10 Priority Fixes (All Severities)

| Rank | ID | Category | File | Finding | Severity |
|------|----|----------|------|---------|----------|
| 1 | C-001 | Security | src/lib/supabase.js | JWT in localStorage | CRITICAL |
| 2 | C-003 | Security | supabase/migrations/* | Tables without RLS | CRITICAL |
| 3 | C-004 | Security | admin-api.js | Client-side admin only | CRITICAL |
| 4 | C-002 | Security | src/lib/supabase.js | Missing capacitor-storage.js | CRITICAL |
| 5 | C-007 | PWA/Security | use-create-broadcast.js | No Background Sync | CRITICAL |
| 6 | C-008 | Performance | use-auth.js | Auth bypasses TanStack Query | CRITICAL |
| 7 | C-013 | Error Handling | use-auth.js | Sign-out no rollback | CRITICAL |
| 8 | C-018 | PWA | public/ | Missing all icon files | CRITICAL |
| 9 | C-019 | Performance | LiveMapMapLibre.jsx | Link not imported | CRITICAL |
| 10 | H-001 | Security | App.jsx | Client-side route guards | HIGH |

> See [`remediation-roadmap/PRIORITY_QUEUE.md`](remediation-roadmap/PRIORITY_QUEUE.md) for the full top-25 ranked queue.

---

## How to Use These Listings

### For AI Comparison (Codex ↔ Claude)
Each listing file uses consistent markdown tables with these columns:
- `ID` — Unique finding identifier (e.g., C-001, H-042, MED-PERF-001)
- `Category` — Security, Performance, PWA/Mobile, UI/UX, Supabase/DB, Error Handling, Code Quality
- `File` — Source file path with line numbers where available
- `Issue Summary` — One-line description
- `Fix Summary` — Recommended remediation
- `Effort` — Small / Medium / Large (or XS / S / M / L in MEDIUM/LOW files)

### For Remediation Sprints
1. Start with [`remediation-roadmap/ROADMAP.md`](remediation-roadmap/ROADMAP.md) for week-by-week planning
2. Use [`by-file/CROSS_REFERENCE.md`](by-file/CROSS_REFERENCE.md) to see every issue on a file you are editing
3. Reference [`by-category/CATEGORY_BREAKDOWN.md`](by-category/CATEGORY_BREAKDOWN.md) for thematic patterns

### For Severity Triage
- [`by-severity/CRITICAL.md`](by-severity/CRITICAL.md) — Fix before production
- [`by-severity/HIGH.md`](by-severity/HIGH.md) — Fix this sprint
- [`by-severity/MEDIUM.md`](by-severity/MEDIUM.md) — Fix next sprint
- [`by-severity/LOW.md`](by-severity/LOW.md) — Cleanup backlog

---

## Generated Sub-Reports (Source Material)

Individual detailed reports from the 20 parallel auditors are referenced in the original audit report at these paths:

| Report | Path |
|--------|------|
| Auth Security Audit | /mnt/agents/output/rideradar-auth-audit.md |
| RLS Security Audit | /mnt/agents/output/rideradar_rls_security_audit.md |
| XSS/Injection Security Audit | /mnt/agents/output/rideradar-security-audit.md |
| React Performance Audit | /mnt/agents/output/rideradar-react-perf-audit.md |
| TanStack Query Audit | /mnt/agents/output/tanstack-query-performance-audit.md |
| Bundle Performance Audit | /mnt/agents/output/performance-audit.md |
| PWA Service Worker Audit | /mnt/agents/output/rideradar-pwa-audit.md |
| iOS Mobile Audit | /mnt/agents/output/ios-mobile-audit-findings.md |
| PWA Installability Audit | /mnt/agents/output/pwa-audit-report.md |
| Responsive Design Audit | /mnt/agents/output/responsive-audit-report.md |
| Accessibility Audit | /mnt/agents/output/accessibility-audit-report.md |
| Interaction Design Audit | /mnt/agents/output/rideradar-interaction-audit.md |
| Supabase Query Audit | /mnt/agents/output/supabase-audit-report.md |
| Supabase RLS Security Audit | /mnt/agents/output/rideradar-security-audit.md |
| Supabase Realtime Audit | /mnt/agents/output/supabase-realtime-audit.md |
| Error Handling Audit | /mnt/agents/output/error-handling-analysis.md |
| Form Validation Audit | /mnt/agents/output/form-validation-findings.md |
| State Management Audit | /mnt/agents/output/state-management-audit.md |
| Code Quality Audit (Dead Code) | /mnt/agents/output/rideradar-code-quality-report.md |
| Code Quality Audit (Anti-patterns) | /mnt/agents/output/rideradar-react-audit-report.md |
