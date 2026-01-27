# Admin Dashboard (Verification Hub)

Admin route:

- `/admin/pending-verifications`

Backend access control:

- All admin-only reads run through `public.is_admin()` and `public.admin_pending_verifications()` in [supabase_schema_zero_knowledge.sql](file:///Users/testaccount/Documents/trae_projects/digtalestate/supabase_schema_zero_knowledge.sql).
- Approve/Reject actions run through `public.admin_approve_verification_request()` and `public.admin_reject_verification_request()`.
- To grant yourself access, insert your Supabase Auth user id into `public.app_admins`.

## One-time setup

1. Deploy/apply the SQL in:
   - [supabase_schema_zero_knowledge.sql](file:///Users/testaccount/Documents/trae_projects/digtalestate/supabase_schema_zero_knowledge.sql)
   - [storage_proof_of_death.sql](file:///Users/testaccount/Documents/trae_projects/digtalestate/supabase/storage_proof_of_death.sql)

2. Add your admin user id:

```sql
insert into public.app_admins (user_id)
values ('YOUR_SUPABASE_AUTH_UID'::uuid)
on conflict do nothing;
```

## Data flow

- Heir uploads “proof of death” to the private `proof-of-death` bucket under:
  - `vault/<vault_id>/<heir_user_id>/...`
- Heir creates a verification request row in `public.vault_verification_requests` with `proof_of_death_path` pointing to that object name.
- Admin dashboard calls `public.admin_pending_verifications()` to list only:
  - released vaults
  - verification requests with `status = 'verification_required'`
- Admin approves/rejects. This updates both:
  - `public.vault_verification_requests.status`
  - `public.heir_relationships.status`
- Heirs can only access released vault data after approval (RLS enforces `heir_relationships.status = 'approved'`).
- Reject action also triggers a Resend email to the heir with the admin-provided reason (via the `admin-verification-email` Edge Function).
