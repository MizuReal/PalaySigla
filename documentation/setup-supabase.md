# Supabase Setup

The project uses one Supabase project for auth, PostgreSQL, and Storage. The
frontend talks to it with the anon key; the backend uses the **service-role
key** for server-side session validation on protected routes (`POST
/api/chat` validates the caller's JWT against Supabase's `auth/v1/user`
endpoint).

## One-time dashboard configuration

1. **Project Settings → API** — copy **Project URL** and the **anon public**
   key into `website/.env` and `mobile/.env` (see `documentation/frontend.md`
   and `documentation/mobile.md`). Copy the **service_role** key into
   `backend/.env` as `SUPABASE_SERVICE_ROLE_KEY` (`SUPABASE_SECRET_KEY` is
   accepted as an alias) together with `SUPABASE_URL`.
2. **Authentication → Sign In / Up → Providers → Email**
   - **Confirm email: ON** — registration requires a verified email; the UI
     relies on the "check your inbox" flow.
   - **Password minimum length: 8** (matches the client-side rule).
3. **Authentication → URL Configuration**
   - **Site URL:** `http://localhost:5173` (dev).
   - **Redirect URLs:** add the same value — the password-reset email link
     bounces here (website).

> **ACTION REQUIRED — mobile auth return URLs.** The mobile app completes
> email-verification and password-reset links *inside the app* (deep links on
> the `palaysigla` scheme, handled by `utils/authUrlHint.ts` +
> `services/auth.ts#completeAuthRedirect`). Without the entry below those
> email links resolve in a browser instead of returning to the app:
> 1. Run `npx expo start` inside `mobile/` and read the printed dev URL.
> 2. Append `/--/auth/callback` (e.g. `exp://192.168.1.10:8081/--/auth/callback`)
>    and add it to **Redirect URLs**.
> 3. Also add `palaysigla://auth/callback` for standalone/dev builds.
>
> The exact runtime target is `EXPO_PUBLIC_AUTH_REDIRECT_URL` when set in
> `mobile/.env`, otherwise `Linking.createURL('auth/callback')`. PKCE and
> implicit flow types are both handled automatically by the mobile session
> hand-off — no dashboard flow-type change is needed.
4. No OAuth providers are enabled; email/password only.

## Schema changes

**All schema changes ship as SQL files in `schemas/`.** Never alter the schema
through the dashboard without a corresponding migration file.

Workflow:

1. Add `schemas/00N_<name>.sql` (or edit an unapplied one).
2. Open **Supabase → SQL Editor**, paste the file contents, Run.
3. Repeat in any other environment (staging, production).

Current migrations:

| File | Contents |
|---|---|
| `schemas/001_marketplace.sql` | `listings`, `listing_images`, private `listings` bucket, indexes, `updated_at` trigger, RLS policies |
| `schemas/002_profiles.sql` | `profiles` (name, PH contact number in E.164, avatar path, rating aggregates), private `avatars` bucket, signup-trigger row creation, RLS policies |
| `schemas/003_listing_history.sql` | `listings.sold_at` + transition trigger, `(user_id, created_at desc)` index, owner-select RLS policy for soft-deleted rows |
| `schemas/004_forum.sql` | `forum_posts`, `forum_comments`, `forum_reactions`, indexes, edited-at/counter triggers, RLS policies |
| `schemas/005_forum_categories.sql` | `forum_posts.category` (CHECK-constrained, defaults to `general`), `(category, created_at desc)` index, category-aware edited-at trigger, `forum_category_counts()` RPC |
| `schemas/006_forum_images.sql` | `forum_images` (optional post photos, up to 4), private `forum` bucket, indexes, RLS policies (rows scoped to visible posts) |
| `schemas/007_messaging.sql` | `conversations` + `messages` (listing-scoped buyer/seller chat), indexes, last-message trigger, `unread_message_counts()` RPC, participant RLS, Realtime publication + `replica identity full` |
| `schemas/008_listing_transactions.sql` | `listings` reserved/sold columns (`reserved_at`, `reserved_for(_name)`, `sold_to(_name)`), extended status CHECK (`active`/`reserved`/`sold`), transaction-state trigger with a terminal `sold` state, indexes |
| `schemas/009_transactions.sql` | `transactions` durable record (listing/buyer/seller snapshots, `status`, dates), `sync_listing_transaction` definer trigger, participant RLS, backfill |
| `schemas/010_reviews.sql` | `reviews` (public mutual reviews per sold transaction), party-only insert RLS, `sync_profile_rating` aggregate trigger, public-safe `user_rating(user_id)` RPC |
| `schemas/011_farmer_verification.sql` | Farmer wall fields on `profiles` (location, farm size/experience, varieties, RSBSA, `verification_status`), column-level revokes for verification/rating columns, four verification record tables (credentials, affiliations, endorsements, documents) with owner RLS + verified-lock and a pending-verification trigger, private `credentials` bucket, authenticated avatar read policy, and the `farmer_profile` / `farmer_credentials` / `farmer_affiliations` / `farmer_endorsements` definer RPCs |
| `schemas/012_profile_wall_certificates.sql` | Final wall taxonomy (`credential_type`: BPI Seed Grower / PhilGAP / SRP / RMN seal / Other; `profile_endorsements.endorsement_type`), public certificate storage policy via the `certificate_is_public` definer helper, avatar policy fixed on `profile_exists` (011's policy could not match other users because of owner-only RLS), and rebuilt wall RPCs that expose certificate paths but hide the typed RSBSA number and membership IDs |
| `schemas/seed_demo_listings.sql` | Demo rows for local testing (idempotent inserts; safe to run anytime) |

## Row-level security model

Every table and the storage bucket have RLS enabled; policies are explicit —
there is no implicit public access.

| Resource | Read | Write |
|---|---|---|
| `listings` | Everyone for `deleted_at IS NULL` rows (any status); owners also read their own rows including soft-deleted | Insert/update: owner (`user_id = auth.uid()`). No hard-delete policy — removals are soft deletes via `UPDATE`. |
| `listing_images` | Everyone | Insert/update/delete: must own the parent listing |
| `storage.objects` (`listings` bucket) | Everyone (object metadata) | Insert/update/delete: path must start with `auth.uid()::text/` |
| `profiles` | Owner only (`auth.uid() = id`, `deleted_at IS NULL`) for direct reads; signed-in users read the wall subset through the `farmer_profile` definer RPC (phone, typed RSBSA number, and membership IDs never exposed) | Insert/update: owner. A row is created by trigger on `auth.users` insert; pre-existing users get one on their first profile save (upsert). `verification_status`, `verified_at`, `rating_avg`, and `rating_count` are revoked at the column level, so clients cannot self-verify or forge aggregates. |
| `storage.objects` (`avatars` bucket) | Owner, **plus any signed-in user** when the object's owner has a non-deleted profile (wall avatars; checked through the `profile_exists` definer helper, since the `profiles` policy is owner-only) | Insert/update/delete: path must start with `auth.uid()::text/` |
| `profile_credentials` / `profile_affiliations` / `profile_endorsements` / `profile_documents` | Owner only | Insert/update/delete: owner, and blocked while the owner's profile is `verified` (evidence is locked after review). First insert flips `unverified → pending` through a definer trigger. |
| `storage.objects` (`credentials` bucket) | Owner for every path; **any signed-in user for public certificate paths** — `certificate_is_public` allows `profile_credentials.document_path`, `profile_affiliations.proof_path`, `profile_endorsements.document_path`, and `profiles.rsbsa_document_path` of non-deleted profiles. `profile_documents` paths are deliberately excluded and stay private. | Insert/update/delete: path must start with `auth.uid()::text/` |
| `forum_posts` | Everyone for `deleted_at IS NULL` rows | Insert/update: owner (`user_id = auth.uid()`). No hard-delete policy — removals are soft deletes via `UPDATE`. |
| `forum_comments` | Everyone for `deleted_at IS NULL` rows | Insert/update: owner. No hard-delete policy — removals are soft deletes via `UPDATE`. |
| `forum_reactions` | Everyone (reaction rows/counts) | Insert/delete: owner. `forum_category_counts()` is `SECURITY INVOKER`, so the caller's row policy still applies. |
| `forum_images` | Photos of visible (`deleted_at IS NULL`) posts | Insert/update/delete: owner of the parent post. No hard-delete policy on posts — photo rows are deleted by the owner when a photo is removed, and cascade with a hard post delete. |
| `storage.objects` (`forum` bucket) | Signed URLs only while the parent post is visible | Insert/update/delete: path must start with `auth.uid()::text/` |
| `conversations` | Participants only (`buyer_id = auth.uid()` or `seller_id = auth.uid()`) | Insert: the buyer, against an active listing they do not own (seller derived from `listings.user_id`). Update: participants (read watermark only). No hard-delete policy. |
| `messages` | Participants of the parent conversation only | Insert: the sender, into a conversation they belong to (`sender_id = auth.uid()`). No update/delete policy — messages are an immutable, append-only log. |
| `transactions` | Either participant (`buyer_id = auth.uid()` or `seller_id = auth.uid()`), independent of the listing's visibility | No client write policies: rows are written only by the `sync_listing_transaction` `SECURITY DEFINER` trigger on `listings`. |
| `reviews` | Public (`using (true)`) — a marketplace reputation signal | Insert: only a party of a **sold** transaction, reviewing the counterparty (counterparty + role checked in the policy). No update/delete policies — reviews are append-only. `user_rating(user_id)` is a `SECURITY DEFINER` RPC exposing only `rating_avg`/`rating_count` for public surfaces. |

Consequences:

- Anyone (signed out) can browse listings and see photos via signed URLs.
- Only the logged-in owner can post, mark sold, or remove their listing.
- Owners see their own soft-deleted listings (with `sold_at` / `deleted_at`
  timestamps) in the profile **Selling history** tab; everyone else only ever
  reads non-deleted rows.
- Profile rows are private to their owner; avatar photos of non-deleted
  profiles are readable by signed-in users so the wall can display them.
- The farmer profile wall is a signed-in surface: it reads the
  `farmer_profile` RPC plus the certificate/affiliation/endorsement RPCs, and
  signs wall avatars and certificate images through the authenticated
  policies. Anonymous visitors only see the sign-in prompt. The wall is not
  gated on verification status — the badge is an independent trust signal.
- Certificate images are public to signed-in users as soon as they are
  uploaded (RSBSA stub, credentials, affiliation proofs, endorsements), but
  the typed RSBSA number, membership IDs, and phone numbers are never exposed
  by the wall RPCs. Supporting documents (`profile_documents`) stay private
  and are no longer written by the app.
- The backend already uses the service-role key for server-side JWT checks
  (`/api/chat`); the same key will let it read listing/profile objects later
  (e.g. for ML inference). It never leaves the server — see the key layout
  notes in `documentation/backend.md`.

## Storage usage

- Client uploads go to `{user_id}/{listing_id}/0.jpg` in the private
  `listings` bucket.
- Forum photos go to `{user_id}/{post_id}/{position}.jpg` in the private
  `forum` bucket; the storage select policy only signs URLs while the parent
  post is visible.
- Verification documents go to `{user_id}/{unique}.jpg` in the private
  `credentials` bucket. Owners read and write their own files; any signed-in
  user may sign the certificate paths listed by `certificate_is_public`
  (RSBSA stub, credentials, affiliation proofs, endorsements). Supporting
  documents and all other paths stay owner-only, and staff review through the
  service role.
- Images are served to clients through short-lived signed URLs
  (`createSignedUrl`, 60 s expiry; the frontend caches them ~45 s).
- There is no public bucket.

## Farmer verification (manual review)

There is no reviewer role or admin UI yet; verification is a staff action in
the Supabase dashboard/SQL editor. The flow:

1. A farmer adds an RSBSA stub, RMN seal, certification, affiliation, or
   endorsement. The first insert moves the profile from `unverified` to
   `pending` (the trigger only ever sets `pending`).
2. Review the uploaded files in **Storage → credentials** (they are stored
   under the farmer's uid folder) alongside the profile's record rows. Confirm
   the farmer followed the on-screen notes: the RSBSA number should be covered
   or blurred on the stub, and membership IDs / sensitive information hidden
   in affiliation photos.
3. Approve by running, in the SQL editor:

   ```sql
   update public.profiles
   set verification_status = 'verified', verified_at = now()
   where id = '<farmer-user-id>';
   ```

   Or reject by setting `verification_status = 'unverified'` (the farmer can
   then correct and resubmit).
4. The Verified Rice Farmer badge appears on the farmer's wall
   (`/farmers/<user-id>`, signed-in). Certificate images and metadata are
   already visible there as soon as they are uploaded — approval only grants
   the badge. Changing a verified profile back to `unverified` (or `pending`)
   unlocks the record cards for corrections; re-verify once the corrected
   documents are in.

After applying `012`, regenerate the typed schema and sync it to mobile (see
`documentation/frontend.md`): the committed
`website/src/types/database.ts` is hand-maintained until the migration is
applied against the project, and the `mobile/src/types/database.ts` copy must
match.

## Realtime (marketplace messaging)

`schemas/007_messaging.sql` adds `conversations` and `messages` to the
`supabase_realtime` publication and sets `replica identity full` on both, so
the frontends can subscribe with `postgres_changes` filters
(`conversation_id=eq.<id>` for a thread; `buyer_id` / `seller_id` for the
inbox). Realtime honours RLS: a subscriber only receives rows matching the
same participant policies as a normal `SELECT`. No dashboard toggle is
required — the publication change is applied by the migration.

## Verifying a fresh setup

After applying the migrations, run the anon-key checks (they must show RLS
rejections for writes):

- `SELECT` from `listings` succeeds.
- `INSERT` into `listings` / `listing_images` as anon is rejected.
- `SELECT` from `forum_images` returns rows only for visible posts.
- Uploading to storage under a non-`auth.uid()` path is rejected.
- `farmer_profile('<user-id>')` succeeds for an authenticated caller and is
  rejected for anon; the result contains `rsbsa_document_path` but never
  `rsbsa_number`, `phone`, or membership IDs.
- An owner's own `UPDATE` that includes `verification_status` (or
  `verified_at`, `rating_avg`, `rating_count`) is rejected with a column
  permission error; updates to the other profile fields still succeed.
- `farmer_credentials` / `farmer_affiliations` / `farmer_endorsements` return
  rows for any non-deleted profile (no verification gating), including
  `document_path` / `proof_path`.
- Signing a `profile_credentials.document_path` as a different signed-in user
  succeeds (public certificate policy); signing a `profile_documents`
  document path as a non-owner is denied.
- A verified owner's credential insert/update/delete is rejected by the
  locked-record policies.
