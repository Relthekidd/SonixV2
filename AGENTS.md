# AGENTS.md

## 🧠 Overview

This is the Sonix music streaming app — a mobile-first React Native + Expo + Supabase project focused on artist discovery, listener engagement, and a clean, neobrutalist aesthetic.

The codebase is structured around `app/(tabs)`, with persistent global UI (`MiniPlayer`, `Navigation`) and a central `MusicProvider` that handles all playback logic, metadata mapping, and playlist interaction. Supabase handles backend operations including auth, playlists, music metadata, likes, and search.

This file ensures agents (AI or human) working in this repo:
- Maintain consistent **UI styling**
- Follow expected **data flow and component structure**
- Avoid breaking shared state, playback, or auth logic
- Understand what parts are dynamically generated from Supabase

---

## 📂 Directory Structure Rules

Work primarily in these folders:

| Folder | Description |
|--------|-------------|
| `app/(tabs)/` | All core user-facing pages (home, search, profile, etc.) |
| `components/` | Shared UI components like `MiniPlayer` and `Navigation` |
| `providers/` | Shared state and logic (e.g., `MusicProvider`) |
| `services/` | Supabase and API utilities |
| `hooks/` | Custom logic for stats, auth, etc. |

---

## 🎨 UI & Styling Guidelines

- Use existing utility styles: `glassCard`, `brutalBorder`, `brutalShadow`
- Use consistent padding and font families:
  - `Poppins-Bold`, `Inter-Regular`, `Inter-SemiBold`
- Maintain the `#0f172a` dark slate background base across pages
- Preserve spacing/layout within Flex-based components — don’t hardcode positions
- Animate with `react-native-reanimated` using `FadeIn`, `FadeInDown`, etc.
- Avoid changing Navigation or MiniPlayer dimensions without checking responsive layout

---

## 🧬 Core Component Behavior

- `MiniPlayer`: Always present at bottom of screen, controlled by `MusicProvider`
- `Navigation`: Fixed bottom (mobile) or left (web), uses `expo-router` segment detection
- `MusicProvider`: Central hub for playback, liked songs, playlists, queue, and Supabase logic

Do not bypass this provider — instead, use its methods: `playTrack`, `toggleLike`, `addToPlaylist`, etc.

---

## 🗄️ Supabase Tables + Auth Rules (see `schema.sql`)

- `tracks`: All uploaded songs
- `playlists`: Publicly readable; editable only by creator (usually an admin)
- `playlist_tracks`: Join table linking tracks to playlists
- `liked_songs`: Tracks liked by a user
- `artists`, `albums`, `users`: Linked metadata
- RLS enforces:
  - Only authenticated users can like or create playlists
  - Only `admin` role can set `is_featured = true` on playlists

---

## ⚙️ Agent Work Instructions

When editing code, follow these instructions:

### 🛠️ File-specific Notes

#### `index.tsx` (Home Screen)
- Do not hardcode playlists. Use Supabase query for `is_featured = true`
- Use `MusicProvider.playTrack()` and `trendingTracks` from context

#### `search.tsx`
- Reuses `MusicProvider.searchMusic()` if needed
- Glass cards for results
- Avoid replacing `styles.*` with inline styling — follow the pattern

#### `MiniPlayer.tsx` + `Navigation.tsx`
- These components are fixed in layout — don’t reposition or resize without checking `_layout.tsx`

#### `MusicProvider.tsx`
- Central source of truth for all track and playback data
- When adding features (like favorites or queueing), extend provider logic, don’t duplicate

### 🔄 Data Flow
- Fetch from Supabase using `supabase.from(...).select(...)`
- Use `apiService.getPublicUrl(bucket, path)` to load cover and audio files
- For public read-only access (e.g. featured playlists), avoid gating behind auth

---

## ✅ How to Validate Changes

1. **Style & Layout:** Run the app on both mobile and web (`npx expo start --web`) and verify:
   - Navigation and MiniPlayer are not broken
   - All spacing, padding, and typography are preserved

2. **Functionality:**
   - Play, pause, and like/unlike tracks
   - View and interact with featured playlists
   - Run through the search experience

3. **Supabase Rules:**
   - Ensure Supabase RLS policies still allow frontend access to `playlists` and `tracks`
   - Admin-only writes should still work from admin site

---

## ✅ Future Plans (Agents, note this!)

- Featured playlists will be **managed dynamically via the admin dashboard**
- Songs and playlists must **auto-sync across frontend and dashboard**
- We'll introduce additional agent instructions under `/admin/AGENTS.md` for backend logic

---

For deeper logic or design help, reference:
- `MusicProvider.tsx` — core state manager
- `Navigation.tsx` — tab bar styling and logic
- `MiniPlayer.tsx` — playback UI
