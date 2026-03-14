# Guest Flow, User Card Popover & Chat UX Plan

> **For Claude:** Use superpowers:subagent-driven-development to implement task by task.

**Goal:** Guest-to-registered conversion flow, user card popover menu, and chat history sidebar UX.

**Architecture:** localStorage for guest state, upload-on-register pattern, inline chat prompts.

**Key files:**
- `frontend/src/components/shell/sidebar.tsx` — user card + chat history
- `frontend/src/components/shell/sidebar-nav.tsx` — nav tabs
- `frontend/src/app/[locale]/page.tsx` — homepage chat (guest entry point)
- `frontend/src/lib/auth-context.tsx` — registration flow
- `frontend/src/lib/chat-context-ws.tsx` — chat state

---

## DECISIONS LOCKED (do not re-discuss)

1. **After registration → go to `/chat`**, not `/dashboard`
2. **Registration prompt timing:**
   - After oracle reply #3 → Card: *"See your unique natal chart and continue your reading — create a free account"* + CTA. Dismissible, chat continues.
   - After oracle reply #5 → Card: *"Save these insights so they don't get lost — Register for free"* + CTA. Dismissible.
   - After user prompt #6 → Block with message: *"The Oracle can only continue its guidance within your account."* + CTA. Not dismissible.
3. **Sidebar:** Keep Settings nav tab. Remove nothing. Chat history lives below "+ New Chat" button (already exists, just needs pin-to-top feature).
4. **Birth data in popover** → links to `/settings/profile` or dedicated settings page, NOT inline modal.
5. **Guest data storage:** localStorage only. No DB guest accounts.
6. **Chat history nav button:** REMOVE — chat sessions already show in sidebar below "+ New Chat". Add pin-to-top function instead.

---

## Task 1: User Card Popover

**What:** Clicking the user avatar/name in sidebar bottom opens a popover menu above the card.

**Files to modify:**
- `frontend/src/components/shell/sidebar.tsx`

**Popover menu items:**
```
👤 Profile          → /settings/profile
♊ My Birth Data     → /settings/profile (birth data section) or /settings/birth-data if page exists
💳 Subscription     → /settings/subscription
⚙️ Settings         → /settings
─────────────────
   Sign out
```

**Implementation notes:**
- Use a `useState(false)` for `open` toggle
- Popover floats ABOVE the card (use `bottom-full mb-2 absolute`)
- Click outside closes it (useEffect with document click listener)
- Animate: `opacity-0 scale-95` → `opacity-100 scale-100` with transition
- Sign out is separated by a divider, colored muted red on hover
- Import `signOut` from `useAuth()`
- Import `useRouter` for navigation

---

## Task 2: Guest Birth Data + Chat Session (localStorage)

**What:** When unregistered user enters birth data on homepage chat, store in localStorage. When they chat, store messages in localStorage.

**localStorage keys to use:**
```
astrologaai_guest_birth_data  → { name, birthDate, birthTime, birthPlace, lat, lng }
astrologaai_guest_messages    → [{ role, content, timestamp }]
astrologaai_guest_oracle_count → number (oracle reply count)
astrologaai_guest_user_count  → number (user message count)
```

**Files to modify:**
- `frontend/src/app/[locale]/page.tsx` — homepage chat component
- Wherever the homepage chat handles birth data submission and message sending

**Implementation:**
- On birth data submit on homepage → save to `astrologaai_guest_birth_data`
- On each message exchange → append to `astrologaai_guest_messages`, increment counters
- Counters drive prompt timing (see Task 3)

---

## Task 3: Inline Registration Prompts in Guest Chat

**What:** After oracle replies 3, 5, and block after user message 6.

**Files to modify:**
- Homepage chat component (wherever messages are rendered)
- Create: `frontend/src/components/chat/guest-registration-prompt.tsx`

**GuestRegistrationPrompt component:**
```tsx
interface Props {
  variant: 'soft' | 'urgent' | 'block'
  onRegister: () => void
  onDismiss?: () => void  // null for 'block' variant
}
```

**Variants:**
- `soft` (after reply 3): Purple gradient card, dismissible X button, CTA "Create free account"
- `urgent` (after reply 5): Stronger styling, dismissible, CTA "Register for free"
- `block` (after user message 6): Full-width, no dismiss, replaces input, CTA "Continue in my account"

**Text:**
- soft: "See your unique natal chart and continue your reading — create a free account"
- urgent: "Save these insights so they don't get lost — Register for free"
- block: "The Oracle can only continue its guidance within your account."

**CTA action:** `router.push('/register')` — passes guest data via URL params or relies on localStorage

---

## Task 4: Upload Guest Data on Registration

**What:** After successful registration, read localStorage guest data, POST to backend, then clear localStorage.

**Files to modify:**
- `frontend/src/lib/auth-context.tsx` — in the `signUp` function, after successful registration

**After registration success:**
```ts
// 1. Check for guest birth data
const guestBirthData = localStorage.getItem('astrologaai_guest_birth_data')
if (guestBirthData) {
  // POST to /api/v1/birth-data with the parsed data + auth token
}

// 2. Check for guest messages
const guestMessages = localStorage.getItem('astrologaai_guest_messages')
if (guestMessages) {
  // POST to /api/v1/chat/sessions with title "My first reading"
  // POST messages to that session
}

// 3. Clear guest localStorage
localStorage.removeItem('astrologaai_guest_birth_data')
localStorage.removeItem('astrologaai_guest_messages')
localStorage.removeItem('astrologaai_guest_oracle_count')
localStorage.removeItem('astrologaai_guest_user_count')

// 4. Redirect to /chat (NOT /dashboard)
router.push('/chat')
```

**Backend endpoints to check exist:**
- `POST /api/v1/birth-data` — saves birth profile
- `POST /api/v1/chat` or similar — creates chat session with messages

---

## Task 5: Post-Registration → Chat with Oracle Greeting

**What:** When a user registers WITHOUT guest data (direct registration flow), redirect to `/chat` where oracle greets them and birth data form appears inline.

**Files to modify:**
- `frontend/src/lib/auth-context.tsx` — redirect to `/chat` not `/dashboard`
- Homepage chat or chat page to detect "new user, no birth data" state

**Logic:**
```
On /chat page load:
  if user has no birth data → show oracle greeting message + birth data form inline
  if user has birth data → normal chat
```

**Oracle greeting text (no birth data):**
*"Welcome. To begin your reading, I need to know when and where you were born."*
Then the birth data form appears inline as a chat bubble/card.

---

## Task 6: Pin to Top in Chat History Sidebar

**What:** Each chat session in sidebar gets a pin icon. Pinned chats float to top of list, persist across sessions.

**Files to modify:**
- `frontend/src/components/shell/chat-history-list.tsx`

**localStorage key:** `astrologaai_pinned_chats` → `string[]` (array of session IDs)

**UI:**
- Hover a chat item → show pin icon (📌) on right
- Click pin → adds to pinned array, moves to top section
- Pinned section shows above unpinned, with subtle separator
- Pin again to unpin

---

## Task 7: Settings — Birth Data Page

**What:** Ensure `/settings/profile` or a dedicated page shows birth data entry/edit. This is what the popover "My Birth Data" links to.

**Check first:** Does `birth-data-form.tsx` component work standalone? If yes, embed it in `/settings/profile` page.

---

## Implementation Order

1. Task 1 (User Card Popover) — isolated, no dependencies
2. Task 7 (Birth Data in Settings) — check existing, minimal work
3. Task 2 + 3 (Guest localStorage + prompts) — do together
4. Task 4 (Upload on register) — depends on 2+3
5. Task 5 (Post-registration chat flow) — depends on 4
6. Task 6 (Pin to top) — isolated, do last

---

## Backend Endpoints to Verify Exist Before Task 4

Run these checks at start of Task 4:
- `POST /api/v1/birth-data` — create birth profile
- `POST /api/v1/chat/sessions` — create chat session
- `POST /api/v1/chat/sessions/:id/messages` — add messages to session

If any are missing, note and build them first.
