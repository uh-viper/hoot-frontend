# Backend Update Guide: Support ES256 JWT Tokens

Your Supabase project uses **ES256** (ECC P-256) algorithm by default, but your backend currently only accepts **HS256** tokens. You need to update your backend to validate ES256 tokens using Supabase's JWKS endpoint.

## Quick Summary

**What changed:**
- Supabase now uses ES256 (ECC P-256) by default
- Your backend currently expects HS256 tokens
- Backend must validate ES256 using Supabase's JWKS endpoint

**What you need:**
1. Your Supabase project URL (from `NEXT_PUBLIC_SUPABASE_URL`)
2. Update JWT validation to support ES256 algorithm
3. Fetch and cache public keys from Supabase's JWKS endpoint

---

## Step 1: Get Your Supabase JWKS Endpoint

Your JWKS endpoint URL format:
```
https://<your-project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

**Example:**
If your Supabase URL is `https://abcdefghijklmnop.supabase.co`, then:
```
https://abcdefghijklmnop.supabase.co/auth/v1/.well-known/jwks.json
```

**Test it:**
Open the URL in your browser - you should see a JSON response with public keys.

---

## Step 2: Update Your Backend JWT Validation

The implementation depends on your backend framework. Here are examples for common frameworks:

---

### Option A: Node.js / Express

**1. Install dependencies:**
```bash
npm install jwks-rsa jsonwebtoken
# or
yarn add jwks-rsa jsonwebtoken
```

**2. Update your JWT middleware:**

```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Your Supabase project URL (without trailing slash)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';

// Create JWKS client
const client = jwksClient({
  jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

// Function to get signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// JWT verification middleware
function verifySupabaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Decode token header to check algorithm
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  // Support both HS256 (legacy) and ES256 (modern)
  if (decoded.header.alg === 'HS256') {
    // Legacy HS256 validation using JWT secret
    const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }
    
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = verified;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token', details: err.message });
    }
  } else if (decoded.header.alg === 'ES256') {
    // Modern ES256 validation using JWKS
    jwt.verify(token, getKey, {
      algorithms: ['ES256'],
      audience: 'authenticated', // Supabase access tokens have this audience
      issuer: `${SUPABASE_URL}/auth/v1`
    }, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token', details: err.message });
      }
      req.user = decoded;
      next();
    });
  } else {
    return res.status(401).json({ error: `Unsupported algorithm: ${decoded.header.alg}` });
  }
}

// Use in your routes
app.post('/api/create-accounts', verifySupabaseToken, async (req, res) => {
  // req.user contains the decoded JWT payload
  const userId = req.user.sub; // Supabase user ID
  // ... your logic here
});
```

**Environment variables:**
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_SECRET=your-legacy-jwt-secret  # Only needed for HS256 (legacy)
```

---

### Option B: Python / FastAPI

**1. Install dependencies:**
```bash
pip install pyjwt[crypto] cryptography requests cachetools
```

**2. Update your JWT validation:**

```python
import jwt
import requests
from functools import lru_cache
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project-ref.supabase.co")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # For legacy HS256

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_jwks():
    """Cache JWKS keys (updates every 24 hours due to @lru_cache)"""
    response = requests.get(JWKS_URL)
    response.raise_for_status()
    return response.json()

def get_signing_key(kid):
    """Get signing key from JWKS"""
    jwks = get_jwks()
    for key in jwks.get('keys', []):
        if key.get('kid') == kid:
            return key
    raise ValueError(f"Key {kid} not found in JWKS")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Supabase JWT token"""
    token = credentials.credentials
    
    # Decode without verification to check algorithm
    unverified = jwt.decode(token, options={"verify_signature": False})
    header = jwt.get_unverified_header(token)
    
    try:
        if header['alg'] == 'HS256':
            # Legacy HS256 validation
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(status_code=500, detail="JWT secret not configured")
            
            decoded = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=['HS256'],
                audience='authenticated',
                issuer=f"{SUPABASE_URL}/auth/v1"
            )
            return decoded
        elif header['alg'] == 'ES256':
            # Modern ES256 validation using JWKS
            kid = header.get('kid')
            if not kid:
                raise HTTPException(status_code=401, detail="Token missing kid header")
            
            signing_key = get_signing_key(kid)
            # Convert JWK to PEM format for ES256
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives import serialization
            
            # This is a simplified version - you may need to adjust based on your crypto library
            decoded = jwt.decode(
                token,
                signing_key,
                algorithms=['ES256'],
                audience='authenticated',
                issuer=f"{SUPABASE_URL}/auth/v1",
                options={"verify_signature": True}
            )
            return decoded
        else:
            raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {header['alg']}")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Use in your routes
@app.post("/api/create-accounts")
async def create_accounts(user_data: dict = Depends(verify_token)):
    user_id = user_data['sub']  # Supabase user ID
    # ... your logic here
```

---

### Option C: Python / Flask

**1. Install dependencies:**
```bash
pip install pyjwt[crypto] cryptography requests flask
```

**2. Create JWT validation function:**

```python
import jwt
import requests
from functools import lru_cache
from flask import request, jsonify
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project-ref.supabase.co")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

@lru_cache(maxsize=1)
def get_jwks():
    response = requests.get(JWKS_URL)
    response.raise_for_status()
    return response.json()

def verify_token():
    """Flask decorator for JWT verification"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, jsonify({'error': 'Missing or invalid authorization header'}), 401
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    try:
        # Decode header to check algorithm
        header = jwt.get_unverified_header(token)
        
        if header['alg'] == 'HS256':
            # Legacy HS256
            if not SUPABASE_JWT_SECRET:
                return None, jsonify({'error': 'JWT secret not configured'}), 500
            
            decoded = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=['HS256'],
                audience='authenticated',
                issuer=f"{SUPABASE_URL}/auth/v1"
            )
            return decoded, None, None
        elif header['alg'] == 'ES256':
            # Modern ES256 using JWKS
            kid = header.get('kid')
            signing_key = get_signing_key(kid)
            decoded = jwt.decode(
                token,
                signing_key,
                algorithms=['ES256'],
                audience='authenticated',
                issuer=f"{SUPABASE_URL}/auth/v1"
            )
            return decoded, None, None
        else:
            return None, jsonify({'error': f'Unsupported algorithm: {header["alg"]}'}), 401
    except jwt.ExpiredSignatureError:
        return None, jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError as e:
        return None, jsonify({'error': f'Invalid token: {str(e)}'}), 401

# Use in routes
@app.route('/api/create-accounts', methods=['POST'])
def create_accounts():
    user_data, error_response, status_code = verify_token()
    if error_response:
        return error_response, status_code
    
    user_id = user_data['sub']  # Supabase user ID
    # ... your logic here
```

---

### Option D: Go

**1. Install dependencies:**
```bash
go get github.com/golang-jwt/jwt/v5
go get github.com/lestrrat-go/jwx/v2/jwk
```

**2. JWT validation code:**

```go
package main

import (
    "context"
    "crypto/ecdsa"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "strings"
    "time"
    
    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/v2/jwk"
)

var (
    supabaseURL = os.Getenv("SUPABASE_URL")
    jwksURL     = fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", supabaseURL)
    jwtSecret   = os.Getenv("SUPABASE_JWT_SECRET") // For legacy HS256
)

func verifyToken(r *http.Request) (*jwt.Token, error) {
    authHeader := r.Header.Get("Authorization")
    if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
        return nil, fmt.Errorf("missing or invalid authorization header")
    }
    
    tokenString := strings.TrimPrefix(authHeader, "Bearer ")
    
    // Parse without verification to check algorithm
    token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
    if err != nil {
        return nil, err
    }
    
    alg := token.Header["alg"].(string)
    
    if alg == "HS256" {
        // Legacy HS256
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return []byte(jwtSecret), nil
        })
        
        if err != nil {
            return nil, err
        }
        
        return token, nil
    } else if alg == "ES256" {
        // Modern ES256 using JWKS
        keySet, err := jwk.Fetch(context.Background(), jwksURL)
        if err != nil {
            return nil, err
        }
        
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            kid, ok := token.Header["kid"].(string)
            if !ok {
                return nil, fmt.Errorf("kid not found in token header")
            }
            
            key, ok := keySet.LookupKeyID(kid)
            if !ok {
                return nil, fmt.Errorf("key %s not found in JWKS", kid)
            }
            
            var pubkey ecdsa.PublicKey
            if err := key.Raw(&pubkey); err != nil {
                return nil, err
            }
            
            return &pubkey, nil
        })
        
        if err != nil {
            return nil, err
        }
        
        return token, nil
    }
    
    return nil, fmt.Errorf("unsupported algorithm: %s", alg)
}

// Use in handler
func createAccountsHandler(w http.ResponseWriter, r *http.Request) {
    token, err := verifyToken(r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusUnauthorized)
        return
    }
    
    claims := token.Claims.(jwt.MapClaims)
    userID := claims["sub"].(string)
    
    // ... your logic here
}
```

---

## Important Configuration Notes

### 1. Algorithm Support
Your backend should support **both** algorithms:
- **HS256** (legacy) - for older Supabase projects or if users rotate back
- **ES256** (modern) - for new Supabase projects (current default)

### 2. Token Claims to Verify

Make sure to verify these claims:
- `aud` (audience) - should be `"authenticated"`
- `iss` (issuer) - should be `"https://your-project-ref.supabase.co/auth/v1"`
- `exp` (expiration) - token should not be expired
- `sub` (subject) - contains the Supabase user ID

### 3. JWKS Caching

**Important:** Cache the JWKS keys! Don't fetch them on every request.
- Cache for 24 hours (keys rarely change)
- Implement cache invalidation if keys rotate
- Handle JWKS fetch errors gracefully

### 4. Environment Variables

Set these in your backend environment:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_SECRET=your-legacy-jwt-secret  # Optional, only for HS256
```

---

## Testing

After updating your backend:

1. **Test with a real token:**
   - Log in via your frontend
   - Copy the `access_token` from the browser's localStorage or network tab
   - Send a test request to your backend with `Authorization: Bearer <token>`

2. **Verify the token:**
   - Decode the token header (use jwt.io)
   - Check that `alg` is `ES256`
   - Verify backend successfully validates it

3. **Check logs:**
   - Look for any JWKS fetch errors
   - Verify token validation succeeds
   - Check that user ID is extracted correctly

---

## Need Help?

If you're using a different framework or need specific help:
1. Share your backend framework/language
2. Share your current JWT validation code
3. I can provide framework-specific guidance

---

## Summary Checklist

- [ ] Get Supabase JWKS endpoint URL
- [ ] Install required JWT/JWKS libraries for your framework
- [ ] Update JWT validation to support ES256 algorithm
- [ ] Implement JWKS fetching and caching
- [ ] Update environment variables (SUPABASE_URL)
- [ ] Test with real ES256 tokens
- [ ] Handle both HS256 (legacy) and ES256 (modern) algorithms
- [ ] Verify token claims (aud, iss, exp, sub)
- [ ] Deploy and test end-to-end
