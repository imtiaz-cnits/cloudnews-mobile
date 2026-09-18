# Cloud News Mobile Rules & Guidelines

You are an expert React Native, TypeScript, and WebRTC developer working on the Cloud News mobile application. Follow these rules and specifications strictly at all times.

---

## 1. Strict Language & Typography Rules (MANDATORY)
- **Permitted Languages & Fonts**: ONLY **English** and **Chinese** (Simplified / Traditional) are permitted across the entire application.
- **Forbidden Languages & Fonts**: Absolutely **NO Bengali** or any other language/font may be used anywhere in the app — including UI text, labels, dialogs, bottom sheets, tooltips, badges, placeholders, assets, and code comments.
- **Typography**:
  - **English**: Use **Plus Jakarta Sans** (`PlusJakartaSans-Regular`, `PlusJakartaSans-Medium`, `PlusJakartaSans-SemiBold`, `PlusJakartaSans-Bold`, `PlusJakartaSans-ExtraBold`).
  - **Chinese**: Use standard system-supported Chinese fonts.
  - All fonts must be bundled locally.

---

## 2. Design & Styling Guidelines
- **Theme**: Dark glassmorphic theme.
- **Color Palette**:
  - Background: `#050B14`
  - Primary Accent: `#00A8FF`
  - Surface / Cards / Drawers: `#0B1728`
  - Active States / Highlights: `#10B981` (Success / Green), `#EF4444` (End / Destructive)
  - Borders: `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.12)`
- **Aesthetics**: Sleek glassmorphism, subtle glows, rounded squircles (14px - 24px border radius).
- **Layout**: Always respect `SafeAreaInsets` from `react-native-safe-area-context` for notches, dynamic islands, and home indicator bars.

---

## 3. Tech Stack & Environment
- **Framework**: Expo (SDK 52), React Native, TypeScript.
- **Styling**: NativeWind (Tailwind CSS) & React Native `StyleSheet`.
- **Icons**: `lucide-react-native`.
- **Native Modules**: Use `expo-dev-client` for native modules (`@livekit/react-native`, native audio routing).
- **Backend & API**:
  - Laravel 12 API running on port `8001`.
  - Android Emulator API Base URL: `http://10.0.2.2:8001/api`.
  - Physical Device / Production: Configured via `src/config/env.ts`.
  - Use `apiClient` from `src/services/api.ts` with `ApiResponse<T>` typing.
- **LiveKit SFU**:
  - Server typically on `https://livekit.cloudnewsmeet.com`.
  - Native audio session management via `AudioSession` (`@livekit/react-native`).

---

## 4. Persistent Meeting Room Features (DO NOT REMOVE)
- **Top Header**:
  - Meeting info dropdown, call timer, and Leave / End Call button.
  - Dynamic audio output switcher button (supports Phone Speaker, Ear Speaker / Earpiece, Wired Headset, Bluetooth Earphones).
  - Floating view mode switch button (Fullscreen / Grid view toggle).
- **Bottom Meeting Controls**:
  - Must always provide: **Mute / Unmute**, **Start / Stop Video**, **Chat**, **Share Screen**, and **Members**.
  - Sliding bottom drawers for **Chat** (with real-time messaging via LiveKit data channel) and **Members / Participants**.
- **Host Privileges**:
  - Host can Mute All participants simultaneously.
  - Host and participants can Invite Others via username search or direct meeting link sharing.
- **Smart Controls Auto-Hide**:
  - Controls fade out after ~5.5s of inactivity.
  - Single screen tap toggles control visibility.
  - Auto-hide is automatically paused while any interactive modal or drawer is open.

---

## 5. Mainland China & Restricted Network Compatibility
- **GMS Independence**: STRICTLY AVOID dependencies on Google Play Services (GMS) to guarantee compatibility across mainland China and GMS-free Android devices.
- **WebRTC Optimization**:
  - Default to VP8 codec for wide compatibility and low-end hardware stability.
  - Disable simulcast where appropriate for unstable or bandwidth-constrained links.
- **Network Resilience**:
  - Set generous `peerConnectionTimeout` (30s+) for cross-border and restricted connections.
  - Bundle all fonts, icons, and static assets locally within the application package.

---

## 6. Code Conventions & Standards
- **Component Architecture**: Functional Components with React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`).
- **Typing**: Strict TypeScript definitions for all props, states, API payloads, and navigation params (`src/navigation/types.ts`).
- **Clean Code**: No dangling debug logs, no hardcoded sensitive credentials, and preserve existing unrelated docstrings/comments.

---

## 7. Screen Sharing & Window Security Guidelines
- **Zero FLAG_SECURE**: NEVER set `FLAG_SECURE` on application windows. Explicitly clear it in `MainActivity` so Cloud News UI, controls, and menus are crystal clear and never blacked out during screen capture/share.
- **Android 14 MediaProjection & Foreground Service**:
  - Always keep `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PROJECTION` permissions in `AndroidManifest.xml`.
  - Maintain `MediaProjectionService` with `android:foregroundServiceType="mediaProjection"`.
  - Ensure `ic_notification` drawable is bundled locally so the foreground service notification initializes properly.
  - OS-level secure screens (e.g. banking apps, credential fields) are protected directly by Android OS and cannot/must not be bypassed. All standard apps, documents, browsers, presentations, and Cloud News UI must share seamlessly.
  - Use VP8 codec, 1080p 30fps smooth encoding (4.0 Mbps with contentHint: 'motion'), and `objectFit="contain"` with `mirror={false}` for fluid, crisp, lag-free screen sharing across mobile devices.

---

## 8. Zero Dummy / Mock Data Policy (STRICT & MANDATORY)
- **Zero Dummy Content Across Entire App**: Absolutely **NO dummy, mock, fake, or hardcoded seed data** anywhere in the application. This applies strictly to chat conversations, user profiles, contacts, messages, meetings, attachments, notifications, and meeting schedules.
- **Real Backend & User Data Only**:
  - All users and contacts must be fetched directly from the real backend API (e.g. `getUsers()` from `/api/users`).
  - All chat conversations, messages, and meeting records must originate from genuine user actions or real API endpoints.
  - Real local state and chat history must be stored and retrieved legitimately via local storage (`storage.getItem` / `storage.setItem` using `@react-native-async-storage/async-storage`).
- **Genuine Empty States**:
  - Whenever no real records exist yet (e.g. new account, zero chat history, zero scheduled meetings), the UI must display a legitimate empty state (e.g. "No conversations yet", "No messages yet", "No scheduled meetings").
  - Empty states must provide actionable buttons that interact exclusively with real data (e.g. "Start New Chat" that loads real registered users from `/api/users`).
- **No Dummy Attachments or Media**:
  - Never use hardcoded sample attachments, mock PDF documents, or fake media files to simulate user uploads. All attachments must be genuinely picked or sent by real users.


