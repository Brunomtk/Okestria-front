# Front v118 — TOOLS_MODAL

Front-only patch. **Bridge** and **Back** stay as-is — no API changes.

The goal: collapse the two separate "Configure email" and "Configure
Instagram, Facebook & WhatsApp" cards inside the Profile modal into a
single, polished **Tools** modal with horizontal tabs at the top, opened
from a dedicated Tools button living in the toolbar slot right next to
the avatar profile button.

## What changed (UI)

**Before (v117):**
- Avatar profile button → opens **Profile** modal.
- Inside Profile modal: cyan "Email account" card + fuchsia "Social
  media (Meta)" card, each with its own "Configure" button that closed
  Profile and opened a separate full-screen modal.
- Two standalone modals: `UserEmailConfigModal` and
  `UserMetaAccountModal`.

**After (v118):**
- Avatar profile button → opens **Profile** modal (now identity-only,
  no integration cards).
- New **Tools** button (wrench icon) lives in the same toolbar group,
  right after the profile button. Single click opens the new
  **UserToolsModal**.
- Inside Tools modal: horizontal tab bar at the top with two tabs —
  **Email** (cyan) and **Instagram · Facebook · WhatsApp** (fuchsia).
  Active tab swaps the modal's accent color (border glow + hairline)
  so the operator always knows which surface they're configuring.
- Each tab still gets its own per-tab footer with **Test** / **Remove** /
  **Save** actions, keeping the existing semantics.

## Files in the zip

**New:**
- `src/features/office/components/UserToolsModal.tsx` — the new unified
  modal. Self-contained: outer chrome + tab bar + two tab bodies
  (`EmailTab`, `MetaTab`) inlined for cohesion. Uses the existing
  `@/lib/email/api` and `@/lib/social/api` clients — no new endpoints.

**Updated:**
- `src/features/office/screens/OfficeScreen.tsx`
  - Replaces `UserEmailConfigModal` + `UserMetaAccountModal` imports
    with `UserToolsModal`.
  - Replaces the two `userEmailConfigOpen` / `userMetaConfigOpen` state
    hooks with a single `userToolsModalOpen` + `userToolsInitialTab`.
  - Drops `onOpenEmailConfig` / `onOpenMetaConfig` props from
    `<CompanyProfileModal>`.
  - Wires `onOpenTools` + `toolsButtonActive` props through to
    `RetroOffice3D` so the new toolbar button has somewhere to dispatch.
  - Renders `<UserToolsModal>` at the bottom of the screen.

- `src/features/office/components/CompanyProfileModal.tsx`
  - Removes the cyan Email card (lines ~349-372) and the fuchsia Meta
    card (lines ~374-396) from `ProfileTabContent`.
  - Removes the `onOpenEmailConfig` and `onOpenMetaConfig` props from
    `CompanyProfileModalProps` and from the prop drilling chain
    (parent → modal → `ProfileTabContent`).
  - Profile modal is now pure identity: avatar, name, email, role,
    company, workspace, logout. Faster to render, cleaner mental model.

- `src/features/retro-office/RetroOffice3D.tsx`
  - Adds `Wrench` to the `lucide-react` import list.
  - Adds `toolsButtonActive` + `onOpenTools` props (both optional, both
    typed in the prop interface).
  - Inserts a new toolbar button with the Wrench icon directly after
    the avatar profile button in the existing view-controls group. The
    button uses violet for its active state (`bg-violet-500/20` +
    `ring-violet-500/30`) so it visually stands apart from the cyan
    profile button without breaking the toolbar's rhythm. Tooltip:
    "Tools · email + Instagram/Facebook/WhatsApp".

**Untouched (kept in the codebase but no longer wired):**
- `src/features/office/components/UserEmailConfigModal.tsx` (v115)
- `src/features/office/components/UserMetaAccountModal.tsx` (v117)

These two files are dead code after this patch. Safe to delete in a
follow-up cleanup pass — left alone for now to keep this PR scoped to
the UX consolidation.

## Tab bar design

```
┌─────────────────────────────────────────────────────────────┐
│  🔧  Operator tools                                      ✕  │
│       Tools                                                  │
│       Wire the external accounts your agents can use…       │
├─────────────────────────────────────────────────────────────┤
│  [📧 Email]  [📷 Instagram · Facebook · WhatsApp]           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│      Active tab body (form, presets, status, results)        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [Remove] [Test]                            [Close] [Save]  │
└─────────────────────────────────────────────────────────────┘
```

- The header icon (Wrench) and the modal's outer accent border swap
  color when the operator switches tabs (cyan ↔ fuchsia).
- Tabs themselves are styled like browser tabs: only the active one
  has a colored bottom border + tinted background; idle tabs are muted
  white-on-glass and brighten on hover.
- Tab bar lives in its own row (`bg-white/[0.015]`) so it visually
  separates from both the header and the form body.

## Trigger button design

The toolbar group that already houses Profile → Heatmap → Edit gets a
new entry between Profile and the existing divider:

```
┌──────────────────────────────────────────┐
│  [👤 Profile] [🔧 Tools] │ [🗺 Heat] [✎ Edit] │
└──────────────────────────────────────────┘
```

Same hover treatment, same height, same icon size (14px). Tools button
inherits the toolbar group's border + backdrop blur — zero layout shift.

## Deployment

1. Drop the four files into the front repo at the matching paths.
2. `npm run build` (or `next build`).
3. Deploy as usual (Vercel / Cloudflare Pages / static host).

The two old modal files can be deleted in a follow-up commit:
- `src/features/office/components/UserEmailConfigModal.tsx`
- `src/features/office/components/UserMetaAccountModal.tsx`

No imports left referencing them inside this v118 patch.

## Manual QA checklist

- [ ] Open the office. Toolbar shows Profile → **Tools** → divider →
      Heatmap → Edit.
- [ ] Click Tools. Modal opens with Email tab active by default
      (cyan accent).
- [ ] Switch to Meta tab. Modal accent flips to fuchsia, body content
      changes, footer Save button color changes (cyan → fuchsia).
- [ ] Email tab: presets work, save persists, test runs.
- [ ] Meta tab: ID inputs light the right pills, save persists, test
      runs and shows per-platform results.
- [ ] Close modal, click Profile button. Profile modal opens with
      avatar + identity ONLY — no email or Meta cards.
- [ ] Logout still works from Profile.
- [ ] Hard refresh — Tools modal closed by default, opens cleanly.
- [ ] No console errors.
