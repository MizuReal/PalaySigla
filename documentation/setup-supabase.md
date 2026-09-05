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
> the `palaysigla` scheme, handled by `utils/authUrlHint.js` +
> `services/auth.js#completeAuthRedirect`). Without the entry below those
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
| `schemas/seed_demo_listings.sql` | Demo rows for local testing (idempotent inserts; safe to run anytime) |

## Row-level security model

Every table and the storage bucket have RLS enabled; policies are explicit —
there is no implicit public access.

| Resource | Read | Write |
|---|---|---|
| `listings` | Everyone, but only `status = 'active'` and `deleted_at IS NULL` | Insert/update: owner (`user_id = auth.uid()`). No hard-delete policy — removals are soft deletes via `UPDATE`. |
| `listing_images` | Everyone | Insert/update/delete: must own the parent listing |
| `storage.objects` (`listings` bucket) | Everyone (object metadata) | Insert/update/delete: path must start with `auth.uid()::text/` |
| `profiles` | Owner only (`auth.uid() = id`, `deleted_at IS NULL`) | Insert/update: owner. A row is created by trigger on `auth.users` insert; pre-existing users get one on their first profile save (upsert). |
| `storage.objects` (`avatars` bucket) | Owner only | Insert/update/delete: path must start with `auth.uid()::text/` |

Consequences:

- Anyone (signed out) can browse listings and see photos via signed URLs.
- Only the logged-in owner can post, mark sold, or remove their listing.
- Profile rows and avatars are private to their owner; avatar photos are
  served through the same signed-URL path as listing photos.
- The backend already uses the service-role key for server-side JWT checks
  (`/api/chat`); the same key will let it read listing/profile objects later
  (e.g. for ML inference). It never leaves the server — see the key layout
  notes in `documentation/backend.md`.

## Storage usage

- Client uploads go to `{user_id}/{listing_id}/0.jpg` in the private
  `listings` bucket.
- Images are served to clients through short-lived signed URLs
  (`createSignedUrl`, 60 s expiry; the frontend caches them ~45 s).
- There is no public bucket.

## Verifying a fresh setup

After applying the migrations, run the anon-key checks (they must show RLS
rejections for writes):

- `SELECT` from `listings` succeeds.
- `INSERT` into `listings` / `listing_images` as anon is rejected.
- Uploading to storage under a non-`auth.uid()` path is rejected.
