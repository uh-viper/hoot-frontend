# Backend API Format Issue - "accounts" must be a number

## Problem

The frontend is sending the new per-account format, but the backend validation is rejecting it with: **"accounts" must be a number**

## What Frontend is Sending

**POST** `https://api.hootservices.com/api/create-accounts`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Request Body (New Format):**
```json
{
  "accounts": [
    {"region": "US", "currency": "USD"},
    {"region": "US", "currency": "USD"},
    {"region": "US", "currency": "USD"},
    {"region": "US", "currency": "USD"},
    {"region": "US", "currency": "USD"}
  ]
}
```

## Expected Backend Behavior

The backend should accept **BOTH** formats:

### Option 1: New Format (Per-Account Config)
```json
{
  "accounts": [
    {"region": "US", "currency": "USD"},
    {"region": "CA", "currency": "CAD"},
    ...
  ]
}
```

### Option 2: Legacy Format (All Same Region/Currency)
```json
{
  "accounts": 5,
  "region": "US",
  "currency": "USD"
}
```

## Backend Validation Fix Needed

The backend validation should check:

```python
# Pseudo-code example
if isinstance(request_data.get('accounts'), list):
    # New format - array of configs
    account_configs = request_data['accounts']
    # Validate each config has 'region', optional 'currency'
    for config in account_configs:
        if 'region' not in config:
            raise ValidationError("Each account config must have 'region'")
        # currency is optional, defaults to region's default
elif isinstance(request_data.get('accounts'), int):
    # Legacy format - number
    accounts_count = request_data['accounts']
    region = request_data.get('region')
    currency = request_data.get('currency')
    if not region or not currency:
        raise ValidationError("Legacy format requires 'region' and 'currency'")
else:
    raise ValidationError("'accounts' must be either a number (legacy) or an array (new format)")
```

## Current Frontend Implementation

The frontend is correctly sending the new format. The issue is in backend validation that's checking `typeof accounts === 'number'` and rejecting arrays before checking if it's a valid array format.

## Action Required

**Backend team needs to update validation to accept both formats:**
1. Check if `accounts` is an array → validate new format
2. Check if `accounts` is a number → validate legacy format
3. Don't reject arrays just because they're not numbers
