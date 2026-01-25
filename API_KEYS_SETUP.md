# API Keys Feature - Setup Instructions

## What Was Created

### 1. **Database Migration**
- **File**: `supabase/migrations/044_create_user_keys.sql`
- **Table**: `user_keys`
- **Purpose**: Stores API keys for user authentication

### 2. **API Endpoints**
- **GET `/api/api-keys`** - List all API keys for authenticated user
- **POST `/api/api-keys`** - Create a new API key
- **DELETE `/api/api-keys/[keyId]`** - Delete an API key

### 3. **UI Components**
- **`ApiKeysManager.tsx`** - Component for managing API keys in Settings
- **Updated `SettingsForm.tsx`** - Replaced "Coming Soon" with API key manager
- **Updated `settings.css`** - Added styles for API key UI

### 4. **Documentation**
- **`BACKEND_API_KEY_INTEGRATION.md`** - Complete guide for backend developers

## Setup Steps

### 1. **Run Database Migration**

You need to run the migration in Supabase to create the `user_keys` table:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/044_create_user_keys.sql`

Or if you're using Supabase CLI:
```bash
supabase db push
```

### 2. **Verify Table Creation**

After running the migration, verify the table exists:
- Table: `public.user_keys`
- Columns: `id`, `user_id`, `key_name`, `api_key`, `last_used_at`, `created_at`, `updated_at`
- Indexes: `idx_user_keys_user_id`, `idx_user_keys_api_key`
- RLS Policies: Enabled with user-scoped policies

### 3. **Test the Feature**

1. Go to `/dashboard/settings`
2. Scroll to "API Access" section
3. Create a new API key with a name (e.g., "Test API")
4. Copy the generated key (shown only once)
5. Verify the key appears in the list
6. Test deleting a key

## API Key Format

API keys are generated as:
```
hoot_<64 random hex characters>
```

Example: `hoot_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

## Backend Integration

See `BACKEND_API_KEY_INTEGRATION.md` for complete backend integration guide.

**Quick Summary:**
1. Users send API key in `Authorization: Bearer <api_key>` header
2. Backend validates format: `hoot_` + 64 hex chars
3. Backend queries `user_keys` table to get `user_id`
4. Backend uses `user_id` for authorization and resource access

## Security Features

✅ **Row Level Security (RLS)** - Users can only see/manage their own keys
✅ **UUID Validation** - Prevents injection attacks
✅ **Ownership Verification** - Double-checks ownership before deletion
✅ **One-Time Display** - API key shown only once on creation
✅ **Secure Generation** - Uses `crypto.randomBytes()` for secure randomness
✅ **One Key Per User** - UNIQUE constraint on `user_id` ensures only one key per user
✅ **User Data Isolation** - API keys can ONLY access data belonging to the `user_id` from the key lookup
✅ **No Bypass** - API keys have the same permissions as the user's session - they cannot bypass authentication or access other users' data

## Next Steps

1. **Run the migration** in Supabase
2. **Test the UI** in Settings page
3. **Share `BACKEND_API_KEY_INTEGRATION.md`** with your backend team
4. **Backend implements** API key authentication for their endpoints

## Notes

- **One Key Per User**: Users can only have ONE API key at a time. Creating a new key deletes the old one (regeneration).
- **Security**: API keys can ONLY access data belonging to the `user_id` from the key lookup. They cannot bypass authentication or access other users' data.
- API keys are stored in plain text in the database (for lookup purposes)
- Consider hashing API keys in the future for additional security
- The `last_used_at` field tracks when keys are used (backend should update this)
- Backend MUST always verify resource ownership using `user_id` from the API key lookup
