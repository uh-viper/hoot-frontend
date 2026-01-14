# Database Migrations

## Important Notes for Future Migrations

### When Adding New User-Related Tables

**CRITICAL**: If you add a new table that requires one row per user (like `user_credits`, `user_profiles`), you MUST:

1. **Update `handle_new_user()` trigger function** in a migration to create the row for new signups
2. **Update `initializeUserData()` function** in `lib/api/user-initialization.ts` to check and create the row for existing users
3. **Create a backfill migration** to create rows for all existing users who don't have entries yet
4. **Call `initializeUserData()`** on pages/actions that access the new table to ensure data exists

### Example Pattern

```sql
-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.new_user_table (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- other columns
);

-- 2. Update handle_new_user() function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- existing inserts...
  INSERT INTO public.new_user_table (user_id, ...)
  VALUES (NEW.id, ...)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create backfill migration for existing users
INSERT INTO public.new_user_table (user_id, ...)
SELECT id, ...
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.new_user_table WHERE user_id = auth.users.id)
ON CONFLICT (user_id) DO NOTHING;
```

Then update `initializeUserData()` to check and create the row if missing.
