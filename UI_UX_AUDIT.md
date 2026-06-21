# Allverse GPT UI/UX Audit

> Audit scope: the Expo/React Native mobile app (`apps/mobile`) primarily, with cross-references to the Next.js web app (`apps/web`). Every finding below is tied to real code that was inspected, not generic advice. No fixes were implemented — this is the report only.

---

## Executive Summary

This app has good bones and a real backend, but right now it reads as a **capable demo, not a marketplace people trust with money**. The single biggest conversion killer is **trust**: there is no seller rating system, no reviews, no transaction history, no buyer-protection messaging, and listing detail pages reduce the seller to a username plus "Member since 2026." Buyers are being asked to pay a stranger with zero social proof. The second killer is **forced friction before value**: a brand-new user must verify email **and** complete a long preference profile (interests, budget, shopping frequency, condition preference, address) before they can browse a single item — you are gating your funnel at the most fragile moment. Third, the app **leaks its own seams**: the home screen prints raw developer errors like `No listings found. Status: 404` to users, prices render inconsistently (`$1,250` on cards but `$1,250.00` in cart), the home feed shows only 4 "Featured" items so the marketplace feels empty, and favorites are stored device-locally so the heart state lies. Fourth, the **core AI value prop is undersold and not made trustworthy** — the sell flow literally offers a "Skip AI Analysis" button, never previews the finished listing, never labels listings as AI-assisted, and dumps the user to the search page after posting instead of showing them their live listing. Finally, the **navigation is six unlabeled icon tabs**, which forces users to guess what "storefront" vs "home" vs "sparkles" mean. None of this is unfixable — most of it is a focused 1–2 week sprint — but as it stands, a first-time user has too many reasons to hesitate and too few reasons to believe.

---

## Conversion Goals

1. **Visitor signs up** — completes account creation and gets to a usable state fast.
2. **User browses listings** — sees a full, trustworthy feed worth scrolling.
3. **User creates a listing** — uploads photos and gets a live, accurate AI listing with minimal effort.
4. **User messages or makes an offer** — initiates contact/negotiation without fear.
5. **User buys an item** — completes checkout with confidence in price, shipping, and protection.
6. **Seller completes a sale** — gets notified, ships, and gets paid with clear status.

---

## Critical Issues

### Raw developer error text shown to users on the home feed

**Where:** `apps/mobile/app/(tabs)/index.tsx` (`fetchListings`, ~lines 91–95): `setError(`No listings found. Status: ${response.status}`)` and `setError(`Error: ${err?.message || err}`)`.
**Problem:** When the listings call fails or returns an unexpected shape, the user sees literal strings like "No listings found. Status: 404" or "Error: Network request failed." This is debug output, not UX.
**Why it hurts conversion:** The home screen is the first impression. Surfacing HTTP status codes screams "unfinished software" and destroys trust instantly — users assume the whole app is broken and leave.
**User reaction:** "Status 404? Is this thing even real? I'm out."
**Fix:** Replace with a friendly, branded error state: an icon, "Couldn't load listings," a one-line reassurance, and a "Try again" button. Never render `response.status` or `err.message` to users. Log the technical detail to console only.
**Implementation notes:** Add a reusable `ErrorState` component (mirrors the existing empty states). Replace the two `setError(...)` strings with a generic message; keep the raw error in `console.error`.

### No seller trust signals — ratings, reviews, sales count, or verification

**Where:** `apps/mobile/app/listing/[id].tsx` seller card (~lines 531–555); `Profile` interface in `apps/mobile/app/(tabs)/profile.tsx` (no rating/review/sales fields exist anywhere).
**Problem:** The seller is represented only by a username, avatar, and "Member since {year}." There is no rating, no number of completed sales, no reviews, no "verified" badge, no response time. The data model has no concept of seller reputation.
**Why it hurts conversion:** This is the #1 reason a buyer abandons a marketplace purchase. On Depop/Poshmark/Mercari, the seller's rating and sales count are the deciding factor. Without them, every purchase is a leap of faith with a stranger.
**User reaction:** "Who is this person? Have they sold anything before? What if I get scammed?"
**Fix:** Introduce a lightweight reputation system: completed-sales count, a 1–5 star rating with review count, and "Member since." Even before reviews exist, show sales count and account age prominently. Add a post-delivery "Rate your seller" prompt to seed reviews.
**Implementation notes:** Add `ratingAvg`, `ratingCount`, `salesCount` to the profile/seller model (server: `adminProfiles`, increment `salesCount` in the order webhook where payouts settle). Render a rating row in the listing detail seller card and on `profile/[userId].tsx`. New `reviews` collection + a review API.

### New users are forced through email verification + a long preference profile before they can browse

**Where:** `apps/mobile/app/_layout.tsx` `AuthGate` (redirects to `/auth/verify-email` if `!emailVerified`, then `/auth/setup-profile` if `!hasProfile`); `apps/mobile/app/auth/setup-profile.tsx` (interests, budget, shopping frequency, condition preference, activity, address — 7 `Alert.alert` validation paths).
**Problem:** A brand-new user cannot see a single listing until they (1) verify email and (2) fill out a multi-field lifestyle questionnaire. The value of the marketplace is hidden behind a wall of forms.
**Why it hurts conversion:** This is the classic "ask for commitment before showing value" mistake. Drop-off on forced multi-step onboarding is brutal (often 40–60%). Users want to browse first and commit later.
**User reaction:** "I just wanted to look around and you're already asking my budget and address? Forget it."
**Fix:** Let users **browse without an account**. Gate only the actions that require identity (buy, sell, message, offer) behind sign-up. Make the preference profile **optional and skippable** ("Skip for now"), collected progressively. Keep email verification but allow browsing while unverified.
**Implementation notes:** In `AuthGate`, stop hard-redirecting unauthenticated/incomplete users away from browse tabs. Add a "Skip" path through `setup-profile.tsx`. Convert mandatory fields to optional; collect address only at first checkout (you already collect it there).

### Cold notification permission prompt with no priming

**Where:** `apps/mobile/app/_layout.tsx` `NotificationSetup` — calls `registerForPushNotifications()` immediately when `currentUser` becomes available.
**Problem:** The iOS/Android system permission dialog fires with zero context, the moment the user logs in. There's no pre-prompt explaining *why* notifications help (offers, messages, sold alerts).
**Why it hurts conversion:** A cold system prompt gets denied often, and once denied on iOS you cannot ask again. You permanently lose the ability to notify users about offers and sales — the exact events that drive marketplace retention.
**User reaction:** "Why does this app I just opened want to send me notifications already? Deny."
**Fix:** Add a custom in-app priming screen first ("Get notified when someone messages you or buys your item") with "Enable" / "Not now." Only call the system prompt after they tap Enable, and only at a relevant moment (e.g., after listing an item or sending a first message).
**Implementation notes:** Gate `registerForPushNotifications()` behind a custom modal. Trigger it contextually (after first listing/message) rather than on login.

### Inconsistent price formatting across the app

**Where:** `ListingCard.tsx` `formatPrice` = `$${price.toLocaleString()}` (no decimals); `listing/[id].tsx` price = `$${listing.price.toLocaleString()}` (no decimals); but `cart.tsx`/`checkout.tsx` use `toLocaleString('en-US',{minimumFractionDigits:2})` ($1,250.00).
**Problem:** The same item shows as "$1,250" on the card and detail page, then "$1,250.00" in the cart. Different decimal treatment in different places.
**Why it hurts conversion:** Inconsistent money formatting reads as sloppy and, worse, makes users double-check whether the price changed. Price clarity is sacred in commerce.
**User reaction:** "Wait, was it $1,250 or $1,250.00? Did something get added?"
**Fix:** One shared `formatPrice` used everywhere. Decide a single rule (recommend: no trailing `.00` for whole dollars, 2 decimals otherwise) and apply it on cards, detail, cart, checkout, assistant, orders.
**Implementation notes:** Create `apps/mobile/lib/format.ts` exporting one `formatPrice`. Replace all local copies (ListingCard, listing/[id], cart, checkout, assistant, orders).

### Favorites are device-local, so the heart state is wrong

**Where:** `ListingCard.tsx` favorites use `AsyncStorage.getItem('favorites')`; a separate favorites **API** and `/favorites` page exist server-side.
**Problem:** The heart toggle on cards writes to local device storage, not the user's account. So favorites don't sync across devices, don't match the favorites page, and reset if storage clears. Two sources of truth for the same feature.
**Why it hurts conversion:** Favoriting is a key re-engagement and purchase-intent signal. If hearts don't persist or don't match the favorites screen, users lose saved items and trust the app less.
**User reaction:** "I hearted this earlier, why isn't it in my saved items?"
**Fix:** Make the card's heart call the favorites API (the same one `/favorites` uses) and reflect server state.
**Implementation notes:** Replace the AsyncStorage favorites logic in `ListingCard.tsx` with the favorites API client used by the favorites screen; hydrate initial state from a favorites context/hook.

### Home feed shows only 4 listings — the marketplace looks empty

**Where:** `apps/mobile/app/(tabs)/index.tsx` `fetchListings` → `apiClient.get('/api/listings?limit=4')`, section titled "Featured Listings" / "AI-recommended items for you."
**Problem:** The home screen pulls only 4 items, labeled as "AI-recommended" though they're just the latest listings. A marketplace home with 4 items feels dead, and the "AI-recommended for you" subtitle over-promises personalization that isn't happening.
**Why it hurts conversion:** Density signals liquidity. A near-empty home tells users "nothing to buy here." Over-promising AI personalization that's actually `limit=4 newest` erodes trust when noticed.
**User reaction:** "Only four things? And these aren't recommended for me at all."
**Fix:** Show more items (e.g., 10–20 in a 2-col grid with infinite scroll), and either make "Recommended" real (use `interestCategories`) or rename to honest copy like "Fresh listings" / "New today."
**Implementation notes:** Raise the limit, paginate. If keeping "Recommended," filter by the user's `interestCategories`; otherwise change the subtitle copy.

### No shipping cost or buyer protection shown until the very end of checkout

**Where:** `apps/mobile/app/listing/[id].tsx` (detail shows price, category, condition, description, seller — no shipping line); shipping is only computed in `apps/mobile/app/checkout.tsx` after entering an address.
**Problem:** Buyers don't learn shipping cost until deep in checkout, and there is no buyer-protection / secure-payment messaging anywhere on the listing or cart. "Secure checkout powered by Stripe" appears only at the bottom of cart/checkout.
**Why it hurts conversion:** Hidden shipping is the #1 cause of cart abandonment in e-commerce. Missing protection cues at decision time makes buyers nervous about paying a stranger.
**User reaction:** "How much is shipping? Am I protected if this never arrives? I'll just not risk it."
**Fix:** Show a shipping estimate (or "Shipping calculated at checkout") and a "Buyer protection" line on the listing detail and cart. Add a short "Protected by [platform] — pay securely, get your item or your money back" reassurance near the buy actions.
**Implementation notes:** Add a shipping/protection row in `listing/[id].tsx` content section and in the cart summary card. If real protection isn't built, message what is true (secure Stripe payment, dispute support).

---

## High Impact Improvements

### Six unlabeled icon tabs force users to guess

**Where:** `apps/mobile/app/(tabs)/_layout.tsx` — all tabs use `tabBarLabel: ''`; tabs are Home, Search (storefront icon), AI (sparkles), Sell (add-circle), Messages, Profile.
**Problem:** Six icons, no labels. "Storefront" vs "home" vs "sparkles" are ambiguous; new users can't tell Search from Browse, or what the sparkles tab does.
**Why it hurts conversion:** Ambiguous nav lowers exploration. Users who can't find Sell or Messages don't use them. Six tabs is also at the upper limit of comfortable.
**User reaction:** "What's the sparkle button? What's the difference between the house and the shop?"
**Fix:** Add short labels (Home, Shop, AI, Sell, Inbox, You) at least for the non-obvious ones, or consolidate to 5 by merging Home/Search. Make the Sell action visually primary (center, accented) since it's a core goal.
**Implementation notes:** Set `tabBarLabel` strings and re-enable `tabBarShowLabel`. Consider a center elevated "Sell" button pattern.

### The sell flow lets users "Skip AI Analysis" — undermining the entire value prop

**Where:** `apps/mobile/app/(tabs)/sell.tsx` step 2, "Skip AI Analysis" secondary button (~line 609).
**Problem:** Your differentiator is AI-generated listings, but step 2 invites users to skip it and fill everything manually. You're training users away from your moat.
**Why it hurts conversion:** Every skip is a worse listing (slower, lower quality) and a user who never experiences the magic that makes this app different from Facebook Marketplace.
**User reaction:** "Oh I can just skip the AI? Then this is the same as any other app."
**Fix:** Make AI the default and only happy path. Replace "Skip AI Analysis" with "I'll add details manually" presented as a small text link, not an equal-weight button — or remove it and let users edit AI output instead.
**Implementation notes:** Demote the skip to a tertiary link; always run analysis on continue. Editing in step 4 already covers manual overrides.

### After posting a listing, the user is dumped on the search page, not their live listing

**Where:** `apps/mobile/app/(tabs)/sell.tsx` `handleCreateListing` success → `router.replace('/(tabs)/search')`.
**Problem:** The user finishes the magical AI flow and lands on a generic search screen. They never see their finished, live listing — the payoff moment.
**Why it hurts conversion:** The "I made this and it's live" moment is what makes sellers come back and list again. Hiding it kills the dopamine and the share loop.
**User reaction:** "Did it actually post? Where is it?"
**Fix:** Redirect to the new listing detail page with a success toast and a "Share / View live listing" CTA. Offer "List another."
**Implementation notes:** `handleCreateListing` already gets `listingData` back — route to `/listing/${listingData.id}` instead of `/search`. Add a share action.

### No AI transparency or preview before posting reduces trust in generated content

**Where:** `apps/mobile/app/(tabs)/sell.tsx` step 4 "Review & Edit" (form fields), and buyer-side `listing/[id].tsx` (no indication the copy is AI-assisted).
**Problem:** Sellers edit raw fields but never see a true "this is how buyers will see it" preview. Buyers never know a description is AI-assisted, and generic AI phrasing can read as fake.
**Why it hurts conversion:** Sellers post lower-confidence listings; buyers distrust descriptions that sound auto-generated. Both reduce transactions.
**User reaction (seller):** "Is this what it'll look like?" **(buyer):** "This description sounds like a robot wrote it."
**Fix:** Add a real listing **preview card** in step 4 (render the actual `ListingCard` + detail layout with the entered data). Keep AI copy natural and specific (avoid boilerplate). Optionally a subtle "AI-assisted listing" tag that signals modern tooling rather than low effort.
**Implementation notes:** Reuse `ListingCard` and the detail content block as a live preview in step 4. Tune AI prompts (`apps/web/src/lib/aiAnalysis.ts`) for specific, human phrasing.

### "Add to Cart" on every grid card competes with the tap-to-view intent

**Where:** `apps/mobile/components/ListingCard.tsx` — every grid/list card renders a full-width "Add to Cart" button.
**Problem:** On a marketplace of unique 1-of-1 items, "Add to Cart" on every card is heavy and presumes purchase intent before the user has even seen the item. It also crowds the card and competes with the primary action (open the listing).
**Why it hurts conversion:** Premature CTAs add visual noise and decision fatigue while browsing. Depop/Poshmark cards are clean — tap to view, heart to save; buying happens on the detail page.
**User reaction:** "Why is every card yelling 'Add to Cart' at me? I haven't even looked yet."
**Fix:** Remove "Add to Cart" from the card; keep the heart (save) and tap-to-open. Put buy/cart actions on the detail page where the decision is made. Optionally keep a small cart icon button instead of a full-width bar.
**Implementation notes:** Remove the `addToCartButton` block from both variants in `ListingCard.tsx`; lean on the detail page actions (already present).

### Make an Offer is the most prominent buyer action, above buying

**Where:** `apps/mobile/app/listing/[id].tsx` action bar — "Make an Offer" sits as the top, full-width accent-outlined button above Message/Cart.
**Problem:** The primary visual action is to *negotiate down*, not to buy. For unique items, leading with "Make an Offer" trains every buyer to haggle and delays purchase.
**Why it hurts conversion:** You're optimizing for lowball offers over instant purchase. The fastest revenue path (Buy / Add to cart) should be the most prominent.
**User reaction:** "I guess I'm supposed to offer less than asking?"
**Fix:** Make "Buy now / Add to cart" the primary (filled, brand) button. Demote "Make an Offer" and "Message" to secondary. Keep offers available but not the headline.
**Implementation notes:** Reorder/restyle the buyer action bar in `listing/[id].tsx`; primary = Buy, secondary row = Offer + Message.

### Onboarding profile is a wall of personal questions with no payoff shown

**Where:** `apps/mobile/app/auth/setup-profile.tsx` — interests, budget, shopping frequency, condition preference, activity type, address.
**Problem:** Even if kept, the profile asks for budget, frequency, and address up front with no explanation of how it improves the experience, and no progress/skip affordances visible.
**Why it hurts conversion:** Long forms with unclear benefit have steep drop-off. Asking budget/address before the user trusts the app feels invasive.
**User reaction:** "Why do you need my budget and address just to sign up?"
**Fix:** Cut to the minimum (username + maybe interests), make the rest optional/progressive, show a clear progress bar and "Skip," and explain the benefit ("Pick interests so your feed isn't random").
**Implementation notes:** Trim required fields; add skip + progress; defer address to checkout.

### Listing detail uses `via.placeholder.com` for non-HTTP images

**Where:** `apps/mobile/components/ListingCard.tsx` `normalizeImageUrl` returns `https://via.placeholder.com/300` for non-http URLs.
**Problem:** Relying on an external placeholder service means broken/blank images if it's slow or blocked, and it looks generic.
**Why it hurts conversion:** Broken images on a visual marketplace are fatal — users won't buy what they can't see.
**User reaction:** "The photos won't load. Sketchy."
**Fix:** Use a local in-app placeholder (icon + neutral background, like the cart's image placeholder) instead of an external URL.
**Implementation notes:** Replace the `via.placeholder.com` fallback with a local `<View>` placeholder component used consistently (cart already has one).

---

## Nice To Have Polish

### Loading states are full-screen spinners instead of skeletons in most places

**Where:** `LoadingSpinner` used in cart, checkout, search, profile, orders; `SkeletonCard` exists but is only used on home/search lists.
**Problem:** Most screens flash a centered spinner with text ("Loading cart...") rather than skeletons of the content shape.
**Why it hurts conversion:** Skeletons feel faster and more premium; spinners feel like waiting on a server.
**User reaction:** "It's loading... still loading..."
**Fix:** Use content-shaped skeletons on detail, cart, checkout, profile, orders.
**Implementation notes:** Extend the existing `SkeletonCard` pattern into skeletons for detail/cart rows.

### "Member since {year}" computed from `Date.now()` fallback can show the current year for everyone

**Where:** `apps/mobile/app/listing/[id].tsx` seller card: `new Date(seller.createdAt || Date.now()).getFullYear()`.
**Problem:** If `createdAt` is missing, it falls back to *now*, so every such seller shows "Member since 2026," which is meaningless and slightly dishonest.
**Why it hurts conversion:** A fake-looking trust stat is worse than none.
**Fix:** Only render "Member since" when `createdAt` exists; otherwise omit.
**Implementation notes:** Guard the render on `seller.createdAt`.

### Inconsistent header patterns across screens

**Where:** Home has a custom scrollable header; cart/checkout/orders have their own back-button headers; tabs layout has a `CustomHeader`. Spacing and title sizes vary (`fontSize: 32` page titles vs `24` vs `xl`).
**Problem:** Title sizes, back-button styles, and paddings differ screen to screen.
**Why it hurts conversion:** Subtle inconsistency makes the app feel assembled from parts rather than designed.
**Fix:** One shared `ScreenHeader` component (title size, back button, optional right action) used everywhere.
**Implementation notes:** Extract a `ScreenHeader`; replace ad-hoc headers in cart, checkout, orders, favorites, listing.

### Empty states are functional but flat

**Where:** Messages "No Messages," cart empty, sell sign-in gate, etc.
**Problem:** Empty states are icon + title + one line + a button — fine, but not motivating or branded.
**Why it hurts conversion:** Empty states are prime real estate to push the next action.
**Fix:** Add specific, action-oriented empty states ("No saved items yet — tap the heart on anything you like" with a "Browse" CTA).
**Implementation notes:** Standardize an `EmptyState` component with illustration slot, title, subtitle, primary CTA.

### Suggestion chips and category labels are generic

**Where:** `assistant.tsx` suggestions, `sell.tsx` `CATEGORIES = ['Electronics','Fashion','Home','Sports','Automotive','Other']`.
**Problem:** Categories are thin and generic; "Other" is a catch-all that becomes a junk drawer.
**Fix:** Expand to marketplace-real categories (Sneakers, Streetwear, Vintage, Tech, Gaming, Collectibles, Home, Beauty...) matching your actual inventory and audience.
**Implementation notes:** Centralize the category list (shared between sell, search filters, AI) and expand it.

---

## Copywriting Fixes

| Location | Current Copy | Problem | Better Copy |
|---|---|---|---|
| `index.tsx` error | `No listings found. Status: 404` | Leaks HTTP status; reads broken | `We couldn't load listings right now. Tap to retry.` |
| `index.tsx` error | `Error: Network request failed` | Developer error to user | `Something went wrong. Check your connection and try again.` |
| `index.tsx` featured subtitle | `AI-recommended items for you` | Over-promises personalization | `Fresh listings, just in` |
| `index.tsx` hero | `Find Anything, Anywhere` | Generic SaaS tagline | `Buy and sell anything — AI does the boring part` |
| `sell.tsx` step 2 | `Skip AI Analysis` | Trains users off your core feature | `I'll add details myself` (as a small link) |
| `sell.tsx` success | `Listing created successfully!` | Flat, no next step | `You're live! 🎉 Your listing is now on the marketplace.` |
| `listing/[id].tsx` action | `Make an Offer` (primary) | Leads with haggling | Keep label, demote; primary = `Buy now` |
| `signin.tsx` | `Sign in to continue to AllVerse` | Fine but bland | `Welcome back — let's get you selling` |
| `cart.tsx` note | `Secure checkout powered by Stripe` | Buried at bottom | Surface earlier: `Pay securely. Protected by Stripe.` |
| `assistant.tsx` empty | `What are you looking for?` | OK; could convert | `Describe what you want — I'll find it on the marketplace` |
| `sell.tsx` upload | `Tap to Upload` / `or select from gallery` | Functional | `Add photos — the clearer, the better the AI listing` |
| `messages.tsx` empty | `No Messages` | Dead end | `No messages yet. Message a seller to start a deal.` |
| `setup-profile.tsx` | (form with no benefit framing) | No reason to fill it | `Pick a few interests so your feed isn't random (optional)` |

---

## Mobile Responsiveness Problems

| Page | Issue | Severity | Fix |
|---|---|---|---|
| Home `index.tsx` | Only 4 listings; screen feels empty on tall devices | High | Increase count + 2-col grid + infinite scroll |
| Tabs `_layout.tsx` | 6 unlabeled icon tabs; cramped, ambiguous on small phones | High | Add labels or reduce to 5; emphasize Sell |
| `ListingCard.tsx` | Full-width "Add to Cart" on every card inflates card height, fewer items per screen | High | Remove card-level Add to Cart |
| `listing/[id].tsx` | Image carousel uses manual `width - 40` math for paging; fragile across widths/rotation | Medium | Use `FlatList` paging with `onViewableItemsChanged` |
| `checkout.tsx` | Multi-seller stacked cards get very long; no progress indicator for sequential pay until you tap Pay | Medium | Add a "Step X of N sellers" header during pay |
| `sell.tsx` | 4-step flow has a progress bar only inside the questions step, not across all steps | Medium | Global step indicator (1–4) across the flow |
| `assistant.tsx` | Multiline input "send" via return key is unreliable on Android multiline | Low | Already has Send button; document behavior |
| Profile/orders | Full-screen spinners cause layout jumps when content loads | Low | Skeletons |
| Detail/cart | External `via.placeholder.com` image can blank out on slow networks | Medium | Local placeholder |

---

## Component Consistency Problems

| Component/Pattern | Problem | Fix |
|---|---|---|
| Price formatting | Cards/detail = no decimals; cart/checkout = 2 decimals | One shared `formatPrice` everywhere |
| Headers | Home custom header vs per-screen back-button headers vs tabs `CustomHeader`; title sizes 32/24/xl differ | Single `ScreenHeader` component |
| Buttons | Primary buttons vary (filled brand, accent-outline offer, glass icon buttons, gradient?) without a defined hierarchy | Define button variants (primary/secondary/tertiary/destructive) and use consistently |
| Empty states | Each screen rolls its own icon+title+text+button | Shared `EmptyState` component |
| Error states | Home uses raw text; others use `Alert`; no unified error UI | Shared `ErrorState` + use themed `Alert` consistently (already added) |
| Image placeholders | Cart has local placeholder; cards use external URL | One local placeholder component |
| Favorites | Card heart = AsyncStorage; favorites page = API | Single server-backed favorites source |
| Loading | Mix of `LoadingSpinner` and `SkeletonCard` | Skeletons for content screens; spinner only for actions |
| Cards | Grid card vs list card vs cart item vs assistant listing card — 4 different listing visualizations | Consolidate to one card with variants |

---

## Marketplace Trust Problems

1. **Missing seller info** — Listing detail shows username + (often fake) "Member since 2026" only. No sales count, rating, or verification. *Highest-priority trust gap.*
2. **Weak listing details** — No item specifics surfaced as structured fields (brand, size, model) on detail; just category + condition chips + a paragraph. Buyers can't quickly assess fit.
3. **Unclear pricing** — Inconsistent decimals; no "or best offer," no original/markdown context; price-drop exists server-side but isn't surfaced on the listing.
4. **Unclear shipping** — No shipping cost or estimated delivery on the listing or cart; only revealed deep in checkout.
5. **Missing buyer protection cues** — No "money-back / item-not-received protection" messaging at the decision point; only a small "Stripe" line at the bottom of cart.
6. **Order status clarity** — Orders screen has decent status chips (pending/paid/shipped/delivered) and tracking, but the buyer isn't told what each status means or what to do next.
7. **Weak profile trust signals** — Profiles carry preferences (budget, frequency) but no public reputation (sales, reviews, joined date, response rate).
8. **Suspicious AI copy** — AI descriptions can sound generic/auto-generated; no human-sounding tuning and no "verified by seller" pass.
9. **Missing moderation/reporting** — No visible "Report listing/user" or block flow; buyers/sellers have no safety valve.
10. **General safety** — No identity verification, no review system, no dispute/return guidance — collectively the app feels pre-trust.

---

## AI Listing Flow Problems

1. **Does the user understand what AI will do?** Partially. Step 2 says "Let our AI analyze your photos and generate product details," but the equal-weight "Skip AI Analysis" button muddies the message and the value.
2. **Does the user trust the generated listing?** Not strongly — there's no confidence indicator, no "here's what I detected vs. what I guessed," and no labeling of AI-assisted content for buyers.
3. **Is editing easy?** Yes — step 4 is a standard editable form, which is good. But there's no live preview of the final listing.
4. **Are title/description/category/price/tags/condition clear?** Title, description, category, condition, and suggested price are handled. **Tags are not surfaced** in the mobile flow, and the suggested price has no rationale ("based on similar items") to build trust.
5. **Does generated copy sound natural?** Risk of generic phrasing; prompts should push specific, human, scannable copy (the web prompts in `aiAnalysis.ts` should be tuned and shared).
6. **Is there a clear preview before posting?** **No** — step 4 is fields only; the user never sees the buyer-facing card/detail.
7. **Is the path from photo → live listing clear?** Mostly, but it ends poorly: success dumps the user on `/search` instead of their live listing, breaking the payoff and the re-list loop. Also "missing info" questions are dynamically generated and can feel arbitrary ("Please provide: ...").

**Net:** The AI flow is the app's biggest asset and is 70% there. The wins are: kill the "skip," add a real preview, show price rationale, surface tags, label AI-assisted, and end on the live listing.

---

## Recommended Redesign Priorities

1. **Stop forcing onboarding before browsing; let users explore first**
   **Why first:** It's the top-of-funnel leak — fix it and every downstream metric rises. Low effort, huge impact.
   **Expected impact:** Large lift in activation and D1 retention.
   **Effort:** Low

2. **Kill raw error text + fix price formatting + local image placeholders**
   **Why:** Cheap credibility wins; these are the most visible "demo smell" issues.
   **Expected impact:** Immediate trust improvement on first impression.
   **Effort:** Low

3. **Add seller trust signals (sales count, rating/reviews, honest "member since")**
   **Why:** The #1 reason buyers abandon. Unlocks purchase confidence.
   **Expected impact:** Large lift in buy-through and message/offer rates.
   **Effort:** Medium–High (data model + review flow)

4. **Rework listing detail: Buy primary, shipping + protection visible, structured specs**
   **Why:** This is the conversion page. Clarity here = sales.
   **Expected impact:** Higher add-to-cart / buy rate.
   **Effort:** Medium

5. **Fix the AI sell flow ending + add preview + demote "skip"**
   **Why:** Drives seller activation and re-listing (supply side of the marketplace).
   **Expected impact:** More listings posted, more supply, more liquidity.
   **Effort:** Medium

6. **Navigation labels + clean cards (remove card-level Add to Cart) + server-backed favorites**
   **Why:** Improves browsing density, clarity, and re-engagement.
   **Expected impact:** More browsing depth and saved-item return visits.
   **Effort:** Low–Medium

7. **Notification permission priming + contextual ask**
   **Why:** Protects your highest-retention channel (offer/sale alerts).
   **Expected impact:** Higher opt-in → better retention.
   **Effort:** Low

8. **Trust/safety: report & block, buyer-protection messaging, reviews seeding**
   **Why:** Long-term marketplace integrity and brand trust.
   **Expected impact:** Sustained trust; fewer scam-fear abandonments.
   **Effort:** Medium

---

## Implementation Checklist For Claude Code

### Critical Fixes

* [ ] Replace raw error strings in `index.tsx` `fetchListings` with a friendly `ErrorState` (no status codes/messages shown).
* [ ] Stop hard-gating browse behind email verification + profile in `_layout.tsx` `AuthGate`; allow browsing, gate only buy/sell/message/offer.
* [ ] Make `setup-profile.tsx` skippable + optional fields + progress + benefit copy; defer address to checkout.
* [ ] Create one shared `apps/mobile/lib/format.ts` `formatPrice` and replace all local price formatters (ListingCard, listing/[id], cart, checkout, assistant, orders).
* [ ] Add seller trust data: `salesCount`, `ratingAvg`, `ratingCount` to profile model; increment `salesCount` in the order webhook; render on listing detail + profile.
* [ ] Replace `via.placeholder.com` fallback in `ListingCard.tsx` with a local placeholder component.
* [ ] Move notification permission behind a custom priming modal triggered contextually (after first listing/message), not on login.
* [ ] Make card heart use the server favorites API (remove AsyncStorage favorites source).

### High Impact Fixes

* [ ] Listing detail: make Buy/Add-to-cart the primary action; demote Make an Offer + Message.
* [ ] Listing detail + cart: show shipping estimate ("calculated at checkout") and a buyer-protection line.
* [ ] Sell flow: redirect to `/listing/${id}` on success with a success toast + "Share" + "List another."
* [ ] Sell flow: demote "Skip AI Analysis" to a tertiary link; AI runs by default.
* [ ] Sell flow: add a real listing preview (reuse `ListingCard` + detail layout) in step 4; surface tags; show price rationale.
* [ ] Home: raise listing count, paginate/infinite scroll, fix "AI-recommended" copy (or make it real via `interestCategories`).
* [ ] Tabs: add labels (or reduce to 5) and make Sell visually primary.
* [ ] Remove card-level "Add to Cart" from `ListingCard.tsx`; keep heart + tap-to-open.
* [ ] Add a global 1–4 step progress indicator to the sell flow.

### Polish Fixes

* [ ] Extract a shared `ScreenHeader` and apply to cart, checkout, orders, favorites, listing.
* [ ] Extract a shared `EmptyState` component; rewrite empty-state copy to be action-oriented.
* [ ] Replace full-screen spinners with content skeletons on detail, cart, checkout, profile, orders.
* [ ] Guard "Member since" to only render when `createdAt` exists.
* [ ] Expand and centralize the category list (shared by sell, search filters, AI).
* [ ] Add "Report / Block" affordances on listing detail and profile.
* [ ] Convert the image carousel in `listing/[id].tsx` to `FlatList` paging.
* [ ] Apply copywriting table changes across the app.
* [ ] Tune AI prompts (`apps/web/src/lib/aiAnalysis.ts`) for specific, human-sounding copy; share the category list.

---

## Implemented Fixes

> This pass implemented the **Critical Issues** that are safe to change without altering payments, auth, database, or product logic. Mobile-first. Two Critical items require backend/product decisions and are marked **Needs human decision** below rather than guessed at. Typecheck after changes: **no new errors** (the 6 remaining errors are pre-existing baseline issues in `_layout.tsx` header options, `listing/[id].tsx`, `firebase/config.ts`, `notifications.ts` — untouched by this work).

### ✅ Done

**1. Consistent price formatting (Critical #5)**
- **New:** `apps/mobile/lib/format.ts` — single `formatPrice` (whole dollars show no cents, e.g. `$1,250`; cents show two decimals, e.g. `$1,250.50`).
- **Applied in:** `components/ListingCard.tsx`, `app/listing/[id].tsx`, `app/(tabs)/cart.tsx`, `app/checkout.tsx`, `app/(tabs)/assistant.tsx`, `app/(tabs)/search.tsx` (external price). Removed the per-file local formatters.
- **Note:** `app/orders.tsx` shows `order.total / 100`. Left unchanged — see Needs human decision (possible unit mismatch).

**2. Friendly home error state + feed density + honest copy (Critical #1, #7)**
- **`app/(tabs)/index.tsx`:** Raw `No listings found. Status: 404` / `Error: ...` replaced with a branded error block (offline icon, "We couldn't load listings right now.", subtext, and a **Try again** button); technical detail now goes to `console.error` only.
- Home feed limit raised `4 → 8` (request and slice), skeletons `4 → 6`; the marketplace no longer looks empty.
- Over-promising copy `Featured Listings / AI-recommended items for you` → honest `Fresh listings / Just added to the marketplace`.

**3. Local image placeholder (Critical)**
- **`components/ListingCard.tsx`:** Removed the external `via.placeholder.com` fallback. Cards now render a local icon placeholder when there's no valid `http(s)` image or on load error (grid + list variants).

**4. Server-backed favorites (Critical #6)**
- **New:** `apps/mobile/contexts/FavoritesContext.tsx` — loads the user's favorites from the real `/api/favorites` endpoint and exposes optimistic `isFavorite` / `toggle` / `count`.
- **`components/ListingCard.tsx`:** heart now reads/writes the server via the context (was device-local AsyncStorage); prompts sign-in if logged out.
- **`hooks/useFavoritesCount.ts`:** now derives from the context (was AsyncStorage polling), so the home/sell badge matches the favorites screen.
- **`app/_layout.tsx`:** wrapped the app in `<FavoritesProvider>`.

**5. Shipping + buyer-protection trust cues (Critical #8 + trust)**
- **`app/listing/[id].tsx`:** added a trust box on buyable listings — "Shipping calculated at checkout" + "Buyer protection — pay securely with Stripe."
- **`app/(tabs)/cart.tsx`:** added a "Buyer protection — pay securely with Stripe" line in the order summary.
- **`app/listing/[id].tsx`:** "Member since {year}" now only renders when the seller actually has a `createdAt` (was falling back to `Date.now()`, showing the current year for everyone).

**6. Notification permission priming (Critical #4)**
- **New:** `apps/mobile/components/NotificationPrimer.tsx` — a themed pre-permission modal ("Stay in the loop") that explains the value and only calls the OS prompt on opt-in; silently refreshes the token if already granted; shown once (AsyncStorage flag).
- **`app/_layout.tsx`:** removed the cold `registerForPushNotifications()` call from `NotificationSetup` (kept the foreground/tap listeners); mounted `<NotificationPrimer />`.

### Files touched

```
NEW   apps/mobile/lib/format.ts
NEW   apps/mobile/contexts/FavoritesContext.tsx
NEW   apps/mobile/components/NotificationPrimer.tsx
EDIT  apps/mobile/app/_layout.tsx
EDIT  apps/mobile/app/(tabs)/index.tsx
EDIT  apps/mobile/app/(tabs)/cart.tsx
EDIT  apps/mobile/app/(tabs)/search.tsx
EDIT  apps/mobile/app/(tabs)/assistant.tsx
EDIT  apps/mobile/app/checkout.tsx
EDIT  apps/mobile/app/listing/[id].tsx
EDIT  apps/mobile/components/ListingCard.tsx
EDIT  apps/mobile/hooks/useFavoritesCount.ts
```

### 🟡 Needs human decision (Critical, not auto-implemented)

**A. Seller reputation system (Critical #2 — ratings/reviews/sales count)**
Showing real trust signals requires backend changes: new `ratingAvg`/`ratingCount`/`salesCount` fields, incrementing `salesCount` in the Stripe order webhook, a `reviews` collection + API, and a post-delivery review prompt. This touches payments/order logic and adds a new data model — out of scope for a safe UI-only pass, and it must not invent fake ratings (Rule 10). **Decision needed:** approve building the reputation backend (recommended next), or ship sales-count-only first.

**B. Let users browse before email verification + full profile (Critical #3)**
The `AuthGate` in `_layout.tsx` currently hard-redirects unverified users to `/auth/verify-email` and users without a profile to `/auth/setup-profile` before they can browse. Loosening this is a real auth/anti-spam/product tradeoff (you may *intentionally* require verification). **Decision needed:** (a) allow browsing while unverified and make `setup-profile` skippable/progressive, or (b) keep the hard gate. If (a), the safe sub-fix is making the profile questionnaire optional with a "Skip for now" and deferring address to checkout.

**C. Orders total unit (`order.total / 100`) in `app/orders.tsx`**
Order totals from the checkout snapshot are stored in **dollars**, but the orders screen divides by 100 (treating them as cents), which would display a $1,350 order as $13.50. This looks like a real display bug, but confirming requires checking live order documents (some legacy orders may differ). **Decision needed:** confirm the stored unit so this can be corrected without breaking legacy orders. *(Resolved in the Launch Polish Pass below — verified totals are dollars and fixed.)*

---

## Implemented Fixes — Launch Polish Pass

> Scope: `apps/mobile` only. No backend / API / Firestore / payments / shipping / AI server changes. No new dependencies, no new state/nav/design-system. Existing components, theme tokens, hooks, and endpoints reused as-is. Tasks done in order, typecheck + lint after. **Typecheck: 5 errors, all pre-existing baseline (none in changed files). Lint: 0 new warnings** (the home and card rewrites produce zero warnings).

### Step 0 — Verified against real code
- Listings endpoint `GET /api/listings` supports real pagination: `?page=N&limit=20&sort=newest` → `{ data: Listing[], pagination: { page, limit, total, hasMore } }`. Each listing carries `sellerProfile: { username?, profilePicture? }`.

### Task 1 — Home → real feed *(highest priority)* — `app/(tabs)/index.tsx`
- Removed the marketing hero, "AI-Powered Features" cards, the "Start Selling" CTA card, and the footer.
- New layout: a **pinned header** (brand + search bar + favorites/cart icons) that does not scroll, then a **2-column `FlatList` grid** of real listings loaded on mount.
- **Real infinite scroll** using the endpoint's `page`/`hasMore` (20/page), plus **pull-to-refresh**, an instant-cache prime, and a background silent refresh.
- States: **`SkeletonCard` grid** on first load, a **designed empty state**, and a **friendly error + "Try again"** retry (no raw error text).

### Task 2 — ListingCard polish — `components/ListingCard.tsx`
- **Removed the per-card "Add to Cart"** button (and its handler/state); tapping the card still opens the listing detail.
- Added a **seller row** (small `ProfilePicture` avatar + handle) via new optional `sellerName` / `sellerAvatar` props (home passes `sellerProfile`).
- Fixed-aspect image with the existing local placeholder/fallback; favorite heart still uses the existing `FavoritesContext`. Removed the now-unused `apiClient`/`ActivityIndicator` imports.

### Task 3 — Loading / empty / error states
- Home now uses skeletons + empty + error/retry (Task 1). **Verified** search, favorites, and profile/my-listings already render `LoadingSpinner` + designed empty states (and profile shows errors) — no blank screens on any list. Left unchanged to keep diffs minimal.

### Task 4 — Tab bar clarity — `app/(tabs)/_layout.tsx`
- Added clear labels to every tab — **Home · Shop · AI · Sell · Inbox · Profile** — and tightened the label font for six tabs. Active/inactive theme colors already applied. **No routes moved or removed.**

### Task 5 — Cart & favorites entry points
- Already satisfied: home header has a favorites heart (with the server-backed count badge) → `/favorites` and a cart icon → `/(tabs)/cart`, both one tap. No cart-count source exists, so cart is left unbadged ("if available"). No change.

### Task 6 — Sell flow ends on a win — `app/(tabs)/sell.tsx`
- **Removed "Skip AI Analysis"** — AI is now the only path; added a short hint explaining what the AI does and that everything stays editable (the existing Step 4 "Review & Edit" remains the preview/edit).
- After posting, the seller now lands on their **live listing** (`/listing/[id]`, which already has a Share action) instead of `/search`; the form resets for the next listing.

### Task 7 — Orders price — `app/orders.tsx`
- **Verified** order totals are stored in **dollars** (`order.total = snapshot.total = subtotal+tax+fees+shipping`; orders API doesn't transform). The screen's `order.total / 100` was genuinely wrong (100× too small). Fixed to `formatPrice(order.total)` using the shared helper.

### Files touched (this pass)
```
EDIT  apps/mobile/app/(tabs)/index.tsx
EDIT  apps/mobile/components/ListingCard.tsx
EDIT  apps/mobile/app/(tabs)/_layout.tsx
EDIT  apps/mobile/app/(tabs)/sell.tsx
EDIT  apps/mobile/app/orders.tsx
```

### Notes / not done (kept out of scope per brief)
- No new strategic features (universal-search-as-front-door, social graph, follows, ratings/reviews/sales-count, niche pivot).
- Did not convert search/favorites/my-listings from `LoadingSpinner` to skeletons (already graceful; would exceed "change only what's required").
- Some now-unused styles remain in `index.tsx`/`ListingCard.tsx` from removed sections (harmless dead CSS); left in place to keep the diff scoped. Can be cleaned in a follow-up if desired.

```
