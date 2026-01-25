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

        </section>

        <section id="endpoints" className="api-docs-section">
          <h2 className="api-docs-section-title">Endpoints</h2>

          <h3 className="api-docs-subtitle">Accounts</h3>

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
