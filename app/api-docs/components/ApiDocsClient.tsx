"use client";

import { useState, useEffect } from 'react'

export default function ApiDocsClient() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    // Handle hash navigation
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash) {
        setActiveSection(hash)
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <div className="api-docs-container">
      <div className="api-docs-sidebar">
        <nav className="api-docs-nav">
          <a href="#getting-started" className="api-docs-nav-link">Getting Started</a>
          <a href="#authentication" className="api-docs-nav-link">Authentication</a>
          <a href="#rate-limits" className="api-docs-nav-link">Rate Limits</a>
          <a href="#error-handling" className="api-docs-nav-link">Error Handling</a>
          <a href="#endpoints" className="api-docs-nav-link">Endpoints</a>
          <a href="#accounts" className="api-docs-nav-link api-docs-nav-link-sub">Accounts</a>
          <a href="#verification-codes" className="api-docs-nav-link api-docs-nav-link-sub">Verification Codes</a>
          <a href="#statistics" className="api-docs-nav-link api-docs-nav-link-sub">Statistics</a>
          <a href="#code-examples" className="api-docs-nav-link">Code Examples</a>
          <a href="#security" className="api-docs-nav-link">Security Best Practices</a>
        </nav>
      </div>

      <div className="api-docs-content">
        <div className="api-docs-intro">
          <div className="api-docs-badge">
            <span className="material-icons">api</span>
            <span>API v1.0</span>
          </div>
          <p className="api-docs-base-url">
            <strong>Base URL:</strong> <code>https://api.hootservices.com</code>
          </p>
        </div>

        <section id="getting-started" className="api-docs-section">
          <h2 className="api-docs-section-title">Getting Started</h2>
          <p className="api-docs-text">
            The Hoot Services API allows you to programmatically manage your TikTok Business Center accounts. 
            All requests require authentication using an API key.
          </p>

          <h3 className="api-docs-subtitle">Quick Start</h3>
          <ol className="api-docs-list">
            <li>Generate an API key from your Hoot Services dashboard</li>
            <li>Include the API key in every request header:
              <ApiCodeBlock language="http">
{`Authorization: Bearer <your-70-character-api-key>`}
              </ApiCodeBlock>
            </li>
            <li>Make requests to <code>https://api.hootservices.com/api/user/*</code></li>
          </ol>
        </section>

        <section id="authentication" className="api-docs-section">
          <h2 className="api-docs-section-title">Authentication</h2>
          <p className="api-docs-text">
            All API requests must include your API key in the <code>Authorization</code> header using the Bearer token format.
          </p>

          <h3 className="api-docs-subtitle">API Key Format</h3>
          <ul className="api-docs-list">
            <li><strong>Length:</strong> Exactly 70 characters</li>
            <li><strong>Allowed characters:</strong> <code>a-z</code>, <code>A-Z</code>, <code>0-9</code>, <code>_</code> (underscore), <code>-</code> (dash)</li>
            <li><strong>Example:</strong> <code>a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2g3H4i5J6k7L8m9N0</code></li>
          </ul>

          <h3 className="api-docs-subtitle">Request Format</h3>
          <ApiCodeBlock language="http">
{`Authorization: Bearer <your-70-character-api-key>`}
          </ApiCodeBlock>

          <h3 className="api-docs-subtitle">Example</h3>
          <ApiCodeBlock language="bash">
{`curl -X GET "https://api.hootservices.com/api/user/accounts" \\
  -H "Authorization: Bearer a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2g3H4i5J6k7L8m9N0"`}
          </ApiCodeBlock>

          <h3 className="api-docs-subtitle">Authentication Errors</h3>
          <p className="api-docs-text">
            If your API key is invalid or missing, you'll receive a <code>401 Unauthorized</code> response:
          </p>
          <ApiCodeBlock language="json">
{`{
  "error": "Invalid API key"
}`}
          </ApiCodeBlock>
        </section>

        <section id="rate-limits" className="api-docs-section">
          <h2 className="api-docs-section-title">Rate Limits</h2>
          <p className="api-docs-text">
            Rate limits are applied per API key to ensure fair usage:
          </p>
          <div className="api-docs-table-wrapper">
            <table className="api-docs-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Rate Limit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>List accounts</td>
                  <td>300 requests/minute</td>
                </tr>
                <tr>
                  <td>Get account</td>
                  <td>300 requests/minute</td>
                </tr>
                <tr>
                  <td>Get verification code</td>
                  <td>300 requests/minute</td>
                </tr>
                <tr>
                  <td>Delete account</td>
                  <td>100 requests/minute</td>
                </tr>
                <tr>
                  <td>Get statistics</td>
                  <td>100 requests/minute</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="api-docs-text">
            If you exceed the rate limit, you'll receive a <code>429 Too Many Requests</code> response:
          </p>
          <ApiCodeBlock language="json">
{`{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}`}
          </ApiCodeBlock>
        </section>

        <section id="error-handling" className="api-docs-section">
          <h2 className="api-docs-section-title">Error Handling</h2>
          <p className="api-docs-text">
            The API uses standard HTTP status codes and returns JSON error responses.
          </p>

          <h3 className="api-docs-subtitle">Status Codes</h3>
          <div className="api-docs-table-wrapper">
            <table className="api-docs-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>200</code></td>
                  <td>Success</td>
                </tr>
                <tr>
                  <td><code>400</code></td>
                  <td>Bad Request - Missing or invalid parameters</td>
                </tr>
                <tr>
                  <td><code>401</code></td>
                  <td>Unauthorized - Invalid or missing API key</td>
                </tr>
                <tr>
                  <td><code>404</code></td>
                  <td>Not Found - Resource doesn't exist or doesn't belong to you</td>
                </tr>
                <tr>
                  <td><code>429</code></td>
                  <td>Too Many Requests - Rate limit exceeded</td>
                </tr>
                <tr>
                  <td><code>500</code></td>
                  <td>Internal Server Error - Server-side error</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="api-docs-subtitle">Error Response Format</h3>
          <p className="api-docs-text">All errors follow this structure:</p>
          <ApiCodeBlock language="json">
{`{
  "success": false,
  "error": "Error message describing what went wrong"
}`}
          </ApiCodeBlock>

          <h3 className="api-docs-subtitle">Common Errors</h3>
          <div className="api-docs-error-examples">
            <div>
              <p><strong>Missing API Key:</strong></p>
              <ApiCodeBlock language="json">
{`{
  "error": "Missing or invalid Authorization header"
}`}
              </ApiCodeBlock>
            </div>
            <div>
              <p><strong>Invalid API Key Format:</strong></p>
              <ApiCodeBlock language="json">
{`{
  "error": "Invalid API key format"
}`}
              </ApiCodeBlock>
            </div>
            <div>
              <p><strong>Resource Not Found:</strong></p>
              <ApiCodeBlock language="json">
{`{
  "success": false,
  "error": "Account not found"
}`}
              </ApiCodeBlock>
            </div>
            <div>
              <p><strong>Missing Required Parameter:</strong></p>
              <ApiCodeBlock language="json">
{`{
  "success": false,
  "error": "Email parameter required"
}`}
              </ApiCodeBlock>
            </div>
          </div>
        </section>

        <section id="endpoints" className="api-docs-section">
          <h2 className="api-docs-section-title">Endpoints</h2>
        </section>

        <section id="accounts" className="api-docs-section">
          <h2 className="api-docs-section-title">Accounts</h2>

          <div className="api-docs-endpoint">
            <div className="api-docs-endpoint-header">
              <span className="api-docs-method api-docs-method-get">GET</span>
              <code className="api-docs-endpoint-path">/api/user/accounts</code>
            </div>
            <p className="api-docs-text">Retrieve all TikTok Business Center accounts associated with your API key.</p>

            <h3 className="api-docs-subtitle">Request</h3>
            <ApiCodeBlock language="bash">
{`curl -X GET "https://api.hootservices.com/api/user/accounts" \\
  -H "Authorization: Bearer <your-api-key>"`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Success)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "accounts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com",
      "password": "Abc123!xyz",
      "region": "US",
      "currency": "USD",
      "job_id": "abc-123-def-456",
      "created_at": "2026-01-25T05:41:29.000Z"
    }
  ],
  "count": 1
}`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response Fields</h3>
            <ul className="api-docs-list">
              <li><code>success</code> (boolean): Whether the request was successful</li>
              <li><code>accounts</code> (array): List of account objects</li>
              <li><code>count</code> (number): Total number of accounts returned</li>
            </ul>
            <p className="api-docs-text"><strong>Rate Limit:</strong> 300 requests/minute</p>
          </div>

          <div className="api-docs-endpoint">
            <div className="api-docs-endpoint-header">
              <span className="api-docs-method api-docs-method-get">GET</span>
              <code className="api-docs-endpoint-path">/api/user/accounts/&lt;account_id&gt;</code>
            </div>
            <p className="api-docs-text">Retrieve details for a specific account by its ID.</p>

            <h3 className="api-docs-subtitle">Parameters</h3>
            <ul className="api-docs-list">
              <li><code>account_id</code> (path, required): The UUID of the account to retrieve</li>
            </ul>

            <h3 className="api-docs-subtitle">Request</h3>
            <ApiCodeBlock language="bash">
{`curl -X GET "https://api.hootservices.com/api/user/accounts/550e8400-e29b-41d4-a716-446655440000" \\
  -H "Authorization: Bearer <your-api-key>"`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Success)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "account": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com",
    "password": "Abc123!xyz",
    "region": "US",
    "currency": "USD",
    "job_id": "abc-123-def-456",
    "created_at": "2026-01-25T05:41:29.000Z"
  }
}`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Not Found)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": false,
  "error": "Account not found"
}`}
            </ApiCodeBlock>
            <p className="api-docs-text"><strong>Status Code:</strong> <code>404</code> if account doesn't exist or doesn't belong to your account</p>
            <p className="api-docs-text"><strong>Rate Limit:</strong> 300 requests/minute</p>
          </div>

          <div className="api-docs-endpoint">
            <div className="api-docs-endpoint-header">
              <span className="api-docs-method api-docs-method-delete">DELETE</span>
              <code className="api-docs-endpoint-path">/api/user/accounts/&lt;account_id&gt;</code>
            </div>
            <p className="api-docs-text">Permanently delete an account. This action cannot be undone.</p>

            <h3 className="api-docs-subtitle">Parameters</h3>
            <ul className="api-docs-list">
              <li><code>account_id</code> (path, required): The UUID of the account to delete</li>
            </ul>

            <h3 className="api-docs-subtitle">Request</h3>
            <ApiCodeBlock language="bash">
{`curl -X DELETE "https://api.hootservices.com/api/user/accounts/550e8400-e29b-41d4-a716-446655440000" \\
  -H "Authorization: Bearer <your-api-key>"`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Success)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "message": "Account deleted successfully"
}`}
            </ApiCodeBlock>

            <div className="api-docs-warning">
              <span className="material-icons">warning</span>
              <p><strong>Warning:</strong> Deleting an account is permanent and cannot be undone. Make sure you have a backup of the account credentials if needed.</p>
            </div>
            <p className="api-docs-text"><strong>Rate Limit:</strong> 100 requests/minute</p>
          </div>
        </section>

        <section id="verification-codes" className="api-docs-section">
          <h2 className="api-docs-section-title">Verification Codes</h2>

          <div className="api-docs-endpoint">
            <div className="api-docs-endpoint-header">
              <span className="api-docs-method api-docs-method-get">GET</span>
              <code className="api-docs-endpoint-path">/api/user/codes</code>
            </div>
            <p className="api-docs-text">Retrieve the latest verification code for an account by email address. The email must belong to one of your accounts.</p>

            <h3 className="api-docs-subtitle">Query Parameters</h3>
            <ul className="api-docs-list">
              <li><code>email</code> (required): The email address of the account</li>
            </ul>

            <h3 className="api-docs-subtitle">Request</h3>
            <ApiCodeBlock language="bash">
{`curl -X GET "https://api.hootservices.com/api/user/codes?email=hoot%2Btt7f3a2b1c9dexyz%40hootserv.onmicrosoft.com" \\
  -H "Authorization: Bearer <your-api-key>"`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Code Found)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "code": "HY2PPD",
  "found": true,
  "subject": "Your TikTok verification code",
  "type": "code",
  "to": "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com",
  "timestamp": 1706167823000,
  "receivedAt": "2026-01-25T05:41:29.000Z"
}`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (No Code Found)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "code": null,
  "found": false,
  "message": "No verification code found for this email"
}`}
            </ApiCodeBlock>

            <p className="api-docs-text"><strong>Status Codes:</strong> <code>200</code> (success), <code>400</code> (missing email), <code>404</code> (email not owned)</p>
            <p className="api-docs-text"><strong>Rate Limit:</strong> 300 requests/minute</p>
          </div>

          <div className="api-docs-endpoint">
            <div className="api-docs-endpoint-header">
              <span className="api-docs-method api-docs-method-get">GET</span>
              <code className="api-docs-endpoint-path">/api/user/accounts/&lt;account_id&gt;/code</code>
            </div>
            <p className="api-docs-text">Retrieve the latest verification code for a specific account by its ID.</p>

            <h3 className="api-docs-subtitle">Parameters</h3>
            <ul className="api-docs-list">
              <li><code>account_id</code> (path, required): The UUID of the account</li>
            </ul>

            <h3 className="api-docs-subtitle">Request</h3>
            <ApiCodeBlock language="bash">
{`curl -X GET "https://api.hootservices.com/api/user/accounts/550e8400-e29b-41d4-a716-446655440000/code" \\
  -H "Authorization: Bearer <your-api-key>"`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Code Found)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "code": "HY2PPD",
  "found": true,
  "subject": "Your TikTok verification code",
  "type": "code",
  "to": "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com",
  "timestamp": 1706167823000,
  "receivedAt": "2026-01-25T05:41:29.000Z",
  "account_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com"
}`}
            </ApiCodeBlock>

            <p className="api-docs-text"><strong>Status Codes:</strong> <code>200</code> (success), <code>404</code> (account not found or not owned)</p>
            <p className="api-docs-text"><strong>Rate Limit:</strong> 300 requests/minute</p>
          </div>
        </section>

        <section id="statistics" className="api-docs-section">
          <h2 className="api-docs-section-title">Statistics</h2>

          <div className="api-docs-endpoint">
            <div className="api-docs-endpoint-header">
              <span className="api-docs-method api-docs-method-get">GET</span>
              <code className="api-docs-endpoint-path">/api/user/stats</code>
            </div>
            <p className="api-docs-text">Retrieve statistics about your account creation jobs.</p>

            <h3 className="api-docs-subtitle">Request</h3>
            <ApiCodeBlock language="bash">
{`curl -X GET "https://api.hootservices.com/api/user/stats" \\
  -H "Authorization: Bearer <your-api-key>"`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response (Success)</h3>
            <ApiCodeBlock language="json">
{`{
  "success": true,
  "stats": {
    "requested": 100,
    "successful": 95,
    "failures": 5,
    "business_centers": 95
  }
}`}
            </ApiCodeBlock>

            <h3 className="api-docs-subtitle">Response Fields</h3>
            <ul className="api-docs-list">
              <li><code>success</code> (boolean): Whether the request was successful</li>
              <li><code>stats</code> (object): Statistics object
                <ul>
                  <li><code>requested</code> (number): Total number of accounts requested</li>
                  <li><code>successful</code> (number): Total number of successfully created accounts</li>
                  <li><code>failures</code> (number): Total number of failed account creations</li>
                  <li><code>business_centers</code> (number): Total number of business centers created</li>
                </ul>
              </li>
            </ul>
            <p className="api-docs-text"><strong>Rate Limit:</strong> 100 requests/minute</p>
          </div>
        </section>

        <section id="code-examples" className="api-docs-section">
          <h2 className="api-docs-section-title">Code Examples</h2>

          <h3 className="api-docs-subtitle">Python</h3>
          <ApiCodeBlock language="python">
{`import requests

API_BASE_URL = "https://api.hootservices.com"
API_KEY = "your-70-character-api-key-here"

headers = {
    "Authorization": f"Bearer {API_KEY}"
}

# List all accounts
response = requests.get(f"{API_BASE_URL}/api/user/accounts", headers=headers)
accounts = response.json()
print(f"Found {accounts['count']} accounts")

# Get a specific account
account_id = accounts['accounts'][0]['id']
response = requests.get(
    f"{API_BASE_URL}/api/user/accounts/{account_id}",
    headers=headers
)
account = response.json()
print(f"Account email: {account['account']['email']}")

# Get verification code by email
email = account['account']['email']
response = requests.get(
    f"{API_BASE_URL}/api/user/codes",
    params={"email": email},
    headers=headers
)
code_data = response.json()
if code_data['found']:
    print(f"Verification code: {code_data['code']}")
else:
    print("No verification code found")

# Get statistics
response = requests.get(f"{API_BASE_URL}/api/user/stats", headers=headers)
stats = response.json()
print(f"Successfully created: {stats['stats']['successful']} accounts")

# Delete an account
response = requests.delete(
    f"{API_BASE_URL}/api/user/accounts/{account_id}",
    headers=headers
)
if response.json()['success']:
    print("Account deleted successfully")`}
          </ApiCodeBlock>

          <h3 className="api-docs-subtitle">JavaScript (Node.js)</h3>
          <ApiCodeBlock language="javascript">
{`const axios = require('axios');

const API_BASE_URL = 'https://api.hootservices.com';
const API_KEY = 'your-70-character-api-key-here';

const headers = {
  Authorization: \`Bearer \${API_KEY}\`
};

// List all accounts
async function listAccounts() {
  try {
    const response = await axios.get(\`\${API_BASE_URL}/api/user/accounts\`, { headers });
    console.log(\`Found \${response.data.count} accounts\`);
    return response.data.accounts;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Get a specific account
async function getAccount(accountId) {
  try {
    const response = await axios.get(
      \`\${API_BASE_URL}/api/user/accounts/\${accountId}\`,
      { headers }
    );
    return response.data.account;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Account not found');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
    throw error;
  }
}

// Get verification code by email
async function getCodeByEmail(email) {
  try {
    const response = await axios.get(
      \`\${API_BASE_URL}/api/user/codes\`,
      {
        params: { email },
        headers
      }
    );
    if (response.data.found) {
      return response.data.code;
    }
    return null;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Email not found or not owned by you');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
    throw error;
  }
}

// Get statistics
async function getStats() {
  try {
    const response = await axios.get(\`\${API_BASE_URL}/api/user/stats\`, { headers });
    return response.data.stats;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Delete an account
async function deleteAccount(accountId) {
  try {
    const response = await axios.delete(
      \`\${API_BASE_URL}/api/user/accounts/\${accountId}\`,
      { headers }
    );
    if (response.data.success) {
      console.log('Account deleted successfully');
    }
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Account not found');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
    throw error;
  }
}

// Example usage
(async () => {
  const accounts = await listAccounts();
  if (accounts.length > 0) {
    const account = await getAccount(accounts[0].id);
    const code = await getCodeByEmail(account.email);
    console.log(\`Code for \${account.email}: \${code || 'Not found'}\`);
    
    const stats = await getStats();
    console.log(\`Total successful: \${stats.successful}\`);
  }
})();`}
          </ApiCodeBlock>

          <h3 className="api-docs-subtitle">cURL</h3>
          <ApiCodeBlock language="bash">
{`# Set your API key
API_KEY="your-70-character-api-key-here"
BASE_URL="https://api.hootservices.com"

# List all accounts
curl -X GET "\${BASE_URL}/api/user/accounts" \\
  -H "Authorization: Bearer \${API_KEY}"

# Get a specific account
ACCOUNT_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X GET "\${BASE_URL}/api/user/accounts/\${ACCOUNT_ID}" \\
  -H "Authorization: Bearer \${API_KEY}"

# Get verification code by email
EMAIL="hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com"
curl -X GET "\${BASE_URL}/api/user/codes?email=\${EMAIL}" \\
  -H "Authorization: Bearer \${API_KEY}"

# Get verification code by account ID
curl -X GET "\${BASE_URL}/api/user/accounts/\${ACCOUNT_ID}/code" \\
  -H "Authorization: Bearer \${API_KEY}"

# Get statistics
curl -X GET "\${BASE_URL}/api/user/stats" \\
  -H "Authorization: Bearer \${API_KEY}"

# Delete an account
curl -X DELETE "\${BASE_URL}/api/user/accounts/\${ACCOUNT_ID}" \\
  -H "Authorization: Bearer \${API_KEY}"`}
          </ApiCodeBlock>
        </section>

        <section id="security" className="api-docs-section">
          <h2 className="api-docs-section-title">Security Best Practices</h2>
          <ul className="api-docs-list">
            <li><strong>Keep your API key secret</strong> - Never commit API keys to version control or share them publicly</li>
            <li><strong>Use HTTPS only</strong> - Always make requests to <code>https://api.hootservices.com</code> (never HTTP)</li>
            <li><strong>Rotate keys regularly</strong> - Generate new API keys periodically and revoke old ones</li>
            <li><strong>Monitor usage</strong> - Check your API usage regularly for any suspicious activity</li>
            <li><strong>Handle errors gracefully</strong> - Implement proper error handling in your code</li>
            <li><strong>Respect rate limits</strong> - Implement exponential backoff if you hit rate limits</li>
          </ul>
        </section>

        <section className="api-docs-section">
          <h2 className="api-docs-section-title">Support</h2>
          <p className="api-docs-text">
            For API support, please contact:
          </p>
          <ul className="api-docs-list">
            <li><strong>Email:</strong> support@hootservices.com</li>
            <li><strong>Documentation:</strong> This page</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

// Code Block Component
function ApiCodeBlock({ children, language }: { children: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="api-docs-code-block">
      <div className="api-docs-code-header">
        <span className="api-docs-code-language">{language}</span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="api-docs-code-copy"
          title="Copy code"
        >
          {copied ? (
            <>
              <span className="material-icons">check</span>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <span className="material-icons">content_copy</span>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="api-docs-code">
        <code>{children}</code>
      </pre>
    </div>
  )
}
