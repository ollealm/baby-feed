-- Real food entries + BabySemp 2 switch
-- Applied to production via the Supabase SQL editor on 2026-09-15. Every statement is idempotent.

-- 1. New flag: real food (not formula). For these rows amount_ml holds kcal, not ml.
alter table feedings add column if not exists is_food boolean not null default false;

-- 2. Entries tagged "estimate" (~) from 2026-08-30 onward are real-food meals.
--    amount_ml was already logged as kcal for these, so only the flags change.
--    Older "~" entries keep is_estimate.
update feedings
set is_food = true, is_estimate = false
where family_id = '63bf5256-3388-480c-9800-ecd5e87fa9bb'
  and is_estimate
  and time >= '2026-08-30T00:00:00+02:00';

-- 3. Formula switch BabySemp 1 -> BabySemp 2 around mid-August (cutoff 2026-08-15 local time).
update feedings
set formula = 'BabySemp 2'
where family_id = '63bf5256-3388-480c-9800-ecd5e87fa9bb'
  and time >= '2026-08-15T00:00:00+02:00';

update families
set current_formula = 'BabySemp 2'
where code = '8j8hap';
