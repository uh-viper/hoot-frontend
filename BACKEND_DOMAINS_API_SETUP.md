# Backend Server Setup: Active Domains API

This guide explains how to integrate your backend server with the Hoot Frontend API to fetch active domains for email routing.

## Overview

The `/api/domains/active` endpoint returns a list of all active domains from the database. This is used by your backend server to dynamically fetch domains instead of hardcoding them.

**Endpoint:** `GET https://your-frontend-domain.com/api/domains/active`  
**Response:** JSON array of domain names  
**Example Response:**
```json
["example.com", "test.com", "another.com"]
```

## Step 1: Get the API Key from Vercel

1. Log in to your Vercel account
2. Navigate to your Hoot Frontend project
3. Go to **Settings** → **Environment Variables**
4. Find the `FETCH_DOMAINS` variable
5. **Copy the value** (this is your API key)
   - If it doesn't exist, create it with a strong random value:
     ```bash
     openssl rand -hex 32
     ```
   - Add it as `FETCH_DOMAINS` in Vercel
   - Deploy the project to apply changes

## Step 2: Set Up API Key on Your Backend Server

Since your backend server is separate from Vercel, you need to manually copy the API key value.

### Option A: Environment File (`.env`)

Create or edit `.env` file in your backend project:

```bash
FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here
```

**Important:** Replace `paste-the-exact-value-from-vercel-here` with the actual value you copied from Vercel.

### Option B: System Environment Variable (Linux/Mac)

```bash
export FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here
```

To make it permanent, add to `~/.bashrc` or `~/.zshrc`:
```bash
echo 'export FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here' >> ~/.bashrc
source ~/.bashrc
```

### Option C: Systemd Service

Edit your systemd service file (e.g., `/etc/systemd/system/your-service.service`):

```ini
[Service]
Environment="FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here"
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart your-service
```

### Option D: Docker

In your `docker-compose.yml`:

```yaml
services:
  your-backend:
    environment:
      - FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here
```

Or in Dockerfile:
```dockerfile
ENV FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here
```

## Step 3: Call the API from Your Backend

### Python Example

```python
import os
import requests

# Get API key from environment
API_KEY = os.getenv('FETCH_DOMAINS_API_KEY')
FRONTEND_URL = 'https://your-frontend-domain.com'  # Replace with your actual domain

def get_active_domains():
    """Fetch active domains from Hoot Frontend API"""
    headers = {
        'X-API-Key': API_KEY
    }
    
    try:
        response = requests.get(
            f'{FRONTEND_URL}/api/domains/active',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            domains = response.json()
            return domains  # Returns: ["example.com", "test.com"]
        elif response.status_code == 401:
            raise Exception('Invalid API key. Check FETCH_DOMAINS_API_KEY environment variable.')
        else:
            raise Exception(f'API error: {response.status_code} - {response.text}')
            
    except requests.exceptions.RequestException as e:
        raise Exception(f'Failed to fetch domains: {e}')

# Usage
try:
    active_domains = get_active_domains()
    print(f"Active domains: {active_domains}")
except Exception as e:
    print(f"Error: {e}")
```

### Node.js Example

```javascript
// Get API key from environment
const API_KEY = process.env.FETCH_DOMAINS_API_KEY;
const FRONTEND_URL = 'https://your-frontend-domain.com'; // Replace with your actual domain

async function getActiveDomains() {
    try {
        const response = await fetch(`${FRONTEND_URL}/api/domains/active`, {
            method: 'GET',
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const domains = await response.json();
            return domains; // Returns: ["example.com", "test.com"]
        } else if (response.status === 401) {
            throw new Error('Invalid API key. Check FETCH_DOMAINS_API_KEY environment variable.');
        } else {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        throw new Error(`Failed to fetch domains: ${error.message}`);
    }
}

// Usage
getActiveDomains()
    .then(domains => {
        console.log('Active domains:', domains);
    })
    .catch(error => {
        console.error('Error:', error);
    });
```

### Go Example

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

func getActiveDomains() ([]string, error) {
    apiKey := os.Getenv("FETCH_DOMAINS_API_KEY")
    frontendURL := "https://your-frontend-domain.com" // Replace with your actual domain
    
    req, err := http.NewRequest("GET", frontendURL+"/api/domains/active", nil)
    if err != nil {
        return nil, err
    }
    
    req.Header.Set("X-API-Key", apiKey)
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode == 200 {
        body, err := io.ReadAll(resp.Body)
        if err != nil {
            return nil, err
        }
        
        var domains []string
        err = json.Unmarshal(body, &domains)
        if err != nil {
            return nil, err
        }
        
        return domains, nil
    } else if resp.StatusCode == 401 {
        return nil, fmt.Errorf("invalid API key. Check FETCH_DOMAINS_API_KEY environment variable")
    } else {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("API error: %d - %s", resp.StatusCode, string(body))
    }
}

// Usage
func main() {
    domains, err := getActiveDomains()
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("Active domains: %v\n", domains)
}
```

### cURL Example (Testing)

```bash
# Set the API key
export FETCH_DOMAINS_API_KEY=paste-the-exact-value-from-vercel-here

# Call the endpoint
curl -H "X-API-Key: $FETCH_DOMAINS_API_KEY" \
     https://your-frontend-domain.com/api/domains/active
```

## Step 4: Replace Hardcoded Domains

Instead of hardcoding domains in your backend:

```python
# OLD - Hardcoded
DOMAINS = ["example.com", "test.com", "another.com"]
```

Use the API to fetch them dynamically:

```python
# NEW - Dynamic
def get_domains():
    return get_active_domains()  # Fetches from API

# Use in your email routing logic
domains = get_domains()
for domain in domains:
    # Process domain...
    pass
```

## Error Handling

The API returns different status codes:

- **200 OK**: Success, returns array of domain names
- **401 Unauthorized**: Invalid or missing API key
  - Check that `FETCH_DOMAINS_API_KEY` is set correctly
  - Verify the key matches the value in Vercel
- **500 Internal Server Error**: Server error
  - Check Vercel logs for details
  - Verify `FETCH_DOMAINS` is set in Vercel

## Security Best Practices

1. **Never commit the API key to git**
   - Add `.env` to `.gitignore`
   - Use environment variables, not hardcoded values

2. **Use the same key value in both places**
   - Vercel: `FETCH_DOMAINS`
   - Backend: `FETCH_DOMAINS_API_KEY` (or any name you prefer)

3. **Rotate keys periodically**
   - Generate a new key in Vercel
   - Update your backend server with the new value
   - Old key will stop working immediately

4. **Keep keys secure**
   - Don't share keys in chat logs or emails
   - Use secure methods to transfer keys between systems

## Troubleshooting

### "Invalid API key" error
- Verify the key value matches exactly (no extra spaces)
- Check that the environment variable is loaded in your backend process
- Restart your backend server after setting the environment variable

### "Server configuration error" (500)
- Check that `FETCH_DOMAINS` is set in Vercel
- Redeploy the Vercel project after adding the environment variable

### Empty array returned
- This is normal if no domains are marked as "active" in the database
- Check the admin dashboard to verify domain statuses

### Connection timeout
- Verify the frontend URL is correct
- Check network connectivity from your backend server
- Ensure the Vercel deployment is live and accessible

## Example Integration

Here's a complete example of integrating this into an email routing system:

```python
import os
import requests
from typing import List

class DomainFetcher:
    def __init__(self):
        self.api_key = os.getenv('FETCH_DOMAINS_API_KEY')
        self.frontend_url = os.getenv('FRONTEND_URL', 'https://your-frontend-domain.com')
        
    def fetch_active_domains(self) -> List[str]:
        """Fetch active domains from Hoot Frontend API"""
        headers = {'X-API-Key': self.api_key}
        
        response = requests.get(
            f'{self.frontend_url}/api/domains/active',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f'Failed to fetch domains: {response.status_code}')
    
    def is_valid_domain(self, domain: str) -> bool:
        """Check if a domain is in the active domains list"""
        active_domains = self.fetch_active_domains()
        return domain in active_domains

# Usage in your email routing
fetcher = DomainFetcher()

# Get all active domains
domains = fetcher.fetch_active_domains()
print(f"Active domains: {domains}")

# Check if a specific domain is active
if fetcher.is_valid_domain("example.com"):
    print("Domain is active!")
```

## Summary

1. ✅ Copy `FETCH_DOMAINS` value from Vercel
2. ✅ Set it as `FETCH_DOMAINS_API_KEY` on your backend server
3. ✅ Call `/api/domains/active` with `X-API-Key` header
4. ✅ Replace hardcoded domains with API calls
5. ✅ Handle errors appropriately

That's it! Your backend server can now dynamically fetch active domains from the Hoot Frontend database.
