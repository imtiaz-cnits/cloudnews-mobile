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

---

## 9. Strict Non-Regression & Feature Isolation Protocols (MANDATORY)

To prevent regression loops where fixing one feature inadvertently breaks another interconnected feature (e.g. screen sharing changes interfering with microphone mute/unmute or PiP), ALL developers and AI agents MUST adhere to these strict invariants:

### A. Architectural Feature Decoupling & Isolation
- **Complete Lifecycle Isolation**: The lifecycles of **Microphone/Audio**, **Camera/Video**, **Screen Sharing**, **In-App Floating Overlay / PiP**, and **Meeting Chat/Participants** MUST remain strictly isolated.
- **No Cross-Subsystem Side-Effects**:
  - Toggling or unpublishing Screen Share must **NEVER** touch, mutate, or re-evaluate Microphone or Camera publish states.
  - Toggling Microphone or Camera must **NEVER** affect Screen Share state or resolution.
  - Entering or exiting PiP / Floating Overlay must **NEVER** mute audio, disconnect video, or stop screen share unless explicitly initiated by the user.
- **No Generic Catch-All Track Event Handlers**:
  - Every LiveKit event listener (`TrackSubscribed`, `TrackUnsubscribed`, `TrackMuted`, `TrackUnmuted`, `LocalTrackPublished`, `LocalTrackUnpublished`) **MUST** explicitly verify `publication.source` or `track.source` before taking any action.
  - **Forbidden**: Handling track events without checking source (e.g. writing `if (track.isMuted) setIsMuted(...)` without verifying `pub.source === Track.Source.Microphone`).
  - Screen share track events (`Track.Source.ScreenShare`) must be handled ONLY within dedicated screen share state handlers and must never trigger camera or mic UI state changes.

### B. The Mutable Ref & Async State Rule
- In WebRTC and LiveKit event listeners, callbacks, and asynchronous background tasks, **NEVER** rely solely on React state variables that can change.
- Always maintain synchronized React `useRef` mirrors (e.g. `isMicMutedRef`, `isScreenSharingRef`, `isVideoMutedRef`) alongside state.
- Inside asynchronous handlers, timeouts, or native event callbacks, read from `.current` (e.g. `isMicMutedRef.current`) or use functional state setters (`setIsMicMuted(prev => ...)`) to eliminate stale closures and race conditions.

### C. Protected "Golden Features" Invariants (NEVER BREAK)
The following features are established, fully functional, and strictly protected against regressions:
1. **Audio & Microphone System**:
   - `handleToggleMic` controls `room.localParticipant.setMicrophoneEnabled(!isMicMuted)`.
   - Dedicated `syncMic` listener synchronizes `isMicMuted` and `isMicMutedRef` exclusively for `Track.Source.Microphone`.
   - Audio routing switcher button supports Phone Speaker, Earpiece, Wired Headset, and Bluetooth. Must never be disabled or bypassed.
2. **Screen Sharing Engine**:
   - `enableMediaProjectionService = true` in `MainApplication.kt` must **NEVER** be removed or altered.
   - Foreground service with `android:foregroundServiceType="mediaProjection"` and `FOREGROUND_SERVICE_MEDIA_PROJECTION` in `AndroidManifest.xml` must remain intact.
   - Quality parameters: 1080p, 30fps, 4.0 Mbps with `contentHint: 'motion'` and `degradationPreference: 'maintain-resolution'` for crisp, readable text and fluid motion.
   - `prepareScreenShare(true)` must be called to suppress OS PiP auto-enter during screen share so the user can freely switch apps.
3. **In-App Floating Overlay vs. OS PiP**:
   - The top minimize chevron (`ChevronDown`) and Android hardware back button inside `MeetingRoomScreen` must ONLY invoke `onMinimize()` to transition to the in-app floating overlay (`GlobalMeetingOverlay`).
   - Hardware back button must **NEVER** directly trigger OS-level PiP (`enterPipMode`).
4. **Host Privileges & Deep Linking**:
   - Host detection is derived strictly from verified JWT token metadata (`is_host === true`).
   - Deep link parameters or room join flows must **NEVER** downgrade an authenticated Host to a regular guest or bypass host privileges.
5. **Dynamic Participant Grid & Typography Layout**:
   - Responsive scaling for 1, 2, 4, 6, and 8+ participants with auto-scroll enabled when participants exceed screen real estate.
   - All participant names, badges, and labels must retain generous bottom padding and explicit `lineHeight` so text descenders (e.g. `g`, `y`, `p`, `j`, `q`) are never clipped.

### D. Pre-Modification Impact Assessment Protocol (Mandatory Before Editing)
Before writing or modifying any code in shared files (`MeetingRoomScreen.tsx`, `GlobalMeetingOverlay.tsx`, `livekit.ts`, native Android/iOS files, or navigation):
1. **Identify Impact Radius**: List all subsystems touched by the target file (Audio, Video, Screen Share, Navigation, Auth).
2. **Check for Shared Event Handlers**: Ensure proposed edits do not alter track listeners, event subscriptions, or state variables consumed by other features.
3. **Scope to Minimal Diff**: Change only the minimal lines required to address the specific issue. Refactoring unrelated code in shared meeting files is strictly prohibited.
4. **Verify All Invariants**: After making changes, verify:
   - TypeScript compilation passes: `npx tsc --noEmit`.
   - Native build passes (if native files touched).
   - Golden Features checklist (Audio mute/unmute, Screen share, Minimize overlay, Grid layout) is intact.



