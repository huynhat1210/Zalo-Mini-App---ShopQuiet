# Keycloak IAM Integration Guide - ShopQuiet E-Commerce Platform

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step 1: Launch Keycloak](#step-1-launch-keycloak)
4. [Step 2: Configure Keycloak Realm](#step-2-configure-keycloak-realm)
5. [Step 3: Create Clients](#step-3-create-clients)
6. [Step 4: Configure Roles](#step-4-configure-roles)
7. [Step 5: Create Admin User](#step-5-create-admin-user)
8. [Step 6: Environment Variables Setup](#step-6-environment-variables-setup)
9. [Step 7: Verify Integration](#step-7-verify-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions to integrate **Keycloak** as a centralized Identity and Access Management (IAM) solution for the ShopQuiet e-commerce platform.

### Benefits:

- **Single Sign-On (SSO)**: Users log in once to access multiple applications (CMS, Campaign Portal)
- **OpenID Connect (OIDC) Compliance**: Industry-standard security protocol
- **JWT Token Management**: Secure token-based authentication with automatic key rotation
- **Centralized User Management**: All authentication in one place
- **Role-Based Access Control**: Fine-grained permission management

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Keycloak (Port 8080)                     │
│  - Realm: shopquiet                                             │
│  - OIDC Compliant                                               │
│  - JWT Token Generation (RS256)                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌────────────┐ ┌────────────┐ ┌──────────────┐
   │ CMS App    │ │ Campaign   │ │ Backend APIs │
   │ (5173)     │ │ Portal     │ │ (3000, 3002) │
   │ shopquiet- │ │ (5174)     │ │              │
   │ cms        │ │ shopquiet- │ │ Uses JWKS    │
   │            │ │ campaign   │ │ to validate  │
   └────────────┘ └────────────┘ │ JWT tokens   │
                                  └──────────────┘
```

---

## Step 1: Launch Keycloak

### Method 1: Using Docker Compose (Recommended)

```bash
# Navigate to project root
cd "d:\Zalo Mini App e-commerce"

# Launch Keycloak
docker compose up -d

# Wait 30-60 seconds for Keycloak to start
```

### Verify Keycloak is Running

Open your browser and go to:

```
http://localhost:8080/admin
```

**Login credentials (default):**

- Username: `admin`
- Password: `admin123`

> ⚠️ **Important**: Change the admin password in production!

---

## Step 2: Configure Keycloak Realm

### Create a New Realm

1. **Log in to Keycloak Admin Console**
   - Go to `http://localhost:8080/admin`
   - Login with `admin` / `admin123`

2. **Create Realm**
   - Click on "Master" dropdown in top-left
   - Click "Create Realm"
   - **Realm name:** `shopquiet`
   - **Enabled:** Toggle ON
   - Click "Create"

3. **Realm Settings**
   - Go to "Realm settings" from left sidebar
   - **Display name:** `ShopQuiet Platform`
   - **Frontend URL:** `http://localhost:8080/`
   - Scroll to "Tokens" section:
     - **Access Token Lifespan:** `15 minutes`
     - **Refresh Token Lifespan:** `7 days`
   - Click "Save"

---

## Step 3: Create Clients

### Client 1: ShopQuiet CMS (Frontend)

1. **Create Client**
   - Go to "Clients" from left sidebar
   - Click "Create client"
   - **Client ID:** `shopquiet-cms`
   - **Client type:** Choose based on your needs (typically "Public" for SPAs)
   - Click "Next"

2. **Capability config**
   - Enable: `Standard flow`
   - Enable: `Direct access grants` (optional, for password flow)
   - Disable: `Implicit flow`
   - Disable: `Implicit flow`
   - Click "Next"

3. **Login settings**
   - **Valid redirect URIs:**
     ```
     http://localhost:5173/*
     http://localhost:5173
     ```
   - **Web origins:**
     ```
     http://localhost:5173
     ```
   - Click "Save"

4. **Access Settings**
   - Go to "Access settings" tab
   - **Access Type:** `public`
   - **Root URL:** `http://localhost:5173`
   - Click "Save"

---

### Client 2: ShopQuiet Campaign Portal (Frontend)

Repeat the same process for campaign portal:

1. **Create Client**
   - **Client ID:** `shopquiet-campaign`
   - **Client type:** `Public`

2. **Login settings**
   - **Valid redirect URIs:**
     ```
     http://localhost:5174/*
     http://localhost:5174
     ```
   - **Web origins:**
     ```
     http://localhost:5174
     ```

---

### Client 3: ShopQuiet Backend (APIs)

1. **Create Client**
   - **Client ID:** `shopquiet-backend`
   - **Client type:** Choose based on your needs

2. **Capability config**
   - Enable: `Service accounts roles`
   - This allows backend-to-backend communication

3. **Access settings**
   - **Access Type:** `Bearer-only` or `Confidential`
   - If confidential, keep the Client Secret safe

---

## Step 4: Configure Roles

### Create Admin Role

1. **Navigate to Roles**
   - Go to "Realm roles" from left sidebar

2. **Create Role**
   - Click "Create role"
   - **Role name:** `admin`
   - **Description:** `Administrator with full access`
   - Click "Save"

3. **Repeat for other roles** (optional):
   - `user` - Standard user
   - `moderator` - Content moderation
   - `analytics` - Analytics access

---

## Step 5: Create Admin User

### Create Admin User Account

1. **Navigate to Users**
   - Go to "Users" from left sidebar
   - Click "Add user"

2. **User details**
   - **Username:** `admin`
   - **Email:** `admin@shopquiet.local`
   - **First name:** `Admin`
   - **Last name:** `User`
   - **Enabled:** Toggle ON
   - Click "Create"

3. **Set Password**
   - Go to "Credentials" tab
   - Click "Set password"
   - **Password:** Choose a strong password
   - **Temporary:** Toggle OFF
   - Click "Set password"

4. **Assign Roles**
   - Go to "Role mapping" tab
   - Click "Assign role"
   - Select `admin` role
   - Click "Assign"

5. **Verify User**
   - Go to "Groups" or "Role mapping" to confirm admin role is assigned

---

## Step 6: Environment Variables Setup

### Backend Environment Variables

Update `.env` file in `apps/backend/` and `apps/zalo-crm-backend/`:

```env
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=shopquiet

# JWT Configuration
JWT_SECRET=your-secret-key-here
```

### Frontend Environment Variables

The frontend apps already have Keycloak configuration in `.env` files:

**`apps/cms/.env`:**

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=shopquiet
```

**`apps/zalo-crm-frontend/.env`:**

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_CRM_API_BASE_URL=http://localhost:3002/api/v1
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=shopquiet
```

---

## Step 7: Verify Integration

### Test Backend Token Validation

1. **Get a Token from Keycloak**

```bash
# Request token using Resource Owner Password Credentials flow
curl -X POST "http://localhost:8080/realms/shopquiet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=shopquiet-cms" \
  -d "username=admin" \
  -d "password=YOUR_PASSWORD_HERE" \
  -d "grant_type=password"
```

2. **Use Token to Call Backend API**

```bash
# Test with the token
curl -X GET "http://localhost:3000/api/v1/users/profile" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Frontend Login

1. **Start Development Servers**

```bash
# Terminal 1: Start Backend
pnpm dev:backend

# Terminal 2: Start CMS
pnpm dev:cms

# Terminal 3: Start Campaign Portal
pnpm dev:crm-fe
```

2. **Navigate to Applications**
   - CMS: `http://localhost:5173`
   - Campaign: `http://localhost:5174`

3. **Verify SSO**
   - Log in to CMS
   - Navigate to Campaign Portal
   - Should already be logged in (SSO working!)

---

## Token Refresh Flow

### How Token Refresh Works

1. **Access Token (15 minutes)**
   - Short-lived token for API requests
   - Sent in `Authorization: Bearer` header

2. **Refresh Token (7 days)**
   - Used to obtain new access tokens
   - Stored securely in localStorage
   - Automatically refreshed by frontend

3. **Refresh Cycle** (in `App.tsx`)
   ```typescript
   // Auto-refresh every 60 seconds if needed
   setInterval(() => {
     keycloak.updateToken(70).then((refreshed) => {
       if (refreshed) {
         localStorage.setItem("cms_access_token", keycloak.token);
       }
     });
   }, 60000);
   ```

---

## JWT Token Structure

Keycloak issues JWT tokens with the following structure:

```json
{
  "sub": "user-id",
  "preferred_username": "admin",
  "name": "Admin User",
  "email": "admin@shopquiet.local",
  "realm_access": {
    "roles": ["admin", "user"]
  },
  "resource_access": {
    "shopquiet-cms": {
      "roles": ["admin"]
    }
  },
  "exp": 1234567890,
  "iat": 1234567800
}
```

### Key Fields Used by Backend:

- `preferred_username`: User identifier
- `realm_access.roles`: User roles from Keycloak
- `exp`: Token expiration time
- `iat`: Token issued time

---

## API Request Flow

### CMS Frontend → Backend API

1. **User Login**
   - Frontend redirects to Keycloak login page
   - User enters credentials
   - Keycloak returns access token + refresh token

2. **API Request**

   ```typescript
   // From apps/cms/src/utils/api/api.util.ts
   const token = localStorage.getItem("cms_access_token");
   headers["Authorization"] = `Bearer ${token}`;

   // Send request
   fetch("/api/v1/endpoint", {
     headers: { Authorization: `Bearer ${token}` },
   });
   ```

3. **Backend Token Validation**

   ```typescript
   // JwtStrategy validates token using JWKS
   // Keycloak URL: http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs
   secretOrKeyProvider: passportJwtSecret({
     jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
   });
   ```

4. **Response**
   - If token valid: Request processed
   - If token invalid: 401 Unauthorized
   - Frontend receives event and redirects to login

---

## Troubleshooting

### Issue 1: Can't Access Keycloak Admin Console

**Problem:** `http://localhost:8080/admin` not responding

**Solution:**

1. Check if Docker container is running:

   ```bash
   docker ps | grep keycloak
   ```

2. Check container logs:

   ```bash
   docker logs shopquiet-keycloak
   ```

3. Wait 30-60 seconds for startup
4. Try accessing health endpoint:
   ```bash
   curl http://localhost:8080/health
   ```

---

### Issue 2: Frontend Redirect Loop

**Problem:** App keeps redirecting to Keycloak login

**Causes & Solutions:**

1. Check if `VITE_KEYCLOAK_URL` is correct in `.env`
2. Verify Keycloak realm exists: `shopquiet`
3. Verify client ID matches:
   - CMS should use `shopquiet-cms`
   - Campaign should use `shopquiet-campaign`
4. Check browser console for CORS errors
5. Verify redirect URIs in Keycloak client settings

---

### Issue 3: Backend Returns 401 Unauthorized

**Problem:** API requests return 401 even with token

**Causes & Solutions:**

1. Verify token is being sent:

   ```bash
   # Token should appear after "Bearer "
   curl -v http://localhost:3000/api/v1/endpoint \
     -H "Authorization: Bearer token_here"
   ```

2. Check backend logs for JWT validation errors
3. Verify KEYCLOAK_URL and KEYCLOAK_REALM in backend `.env`
4. Test JWKS endpoint is accessible:

   ```bash
   curl http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs
   ```

5. Verify token is not expired:
   ```bash
   # Decode token (paste at jwt.io)
   ```

---

### Issue 4: CORS Errors

**Problem:** Browser shows CORS error when calling backend

**Solution:**

1. Backend should have CORS enabled for frontend URL
2. In backend main.ts, ensure:

   ```typescript
   app.enableCors({
     origin: ["http://localhost:5173", "http://localhost:5174"],
     credentials: true,
   });
   ```

3. Keycloak should also allow origins:
   - Go to Client Settings
   - Verify "Web origins" includes frontend URL

---

### Issue 5: Token Not Being Stored

**Problem:** `localStorage` doesn't have access token after login

**Solutions:**

1. Check browser DevTools → Application → Local Storage
2. Verify Keycloak login succeeded:
   - Check browser console for errors
   - Verify Keycloak login page loaded and form submitted

3. Check that token storage logic runs:
   ```typescript
   // In App.tsx after successful auth
   localStorage.setItem("cms_access_token", keycloak.token);
   ```

---

## Production Deployment

### Important Configuration Changes

1. **Change Admin Password**

   ```
   KEYCLOAK_ADMIN_PASSWORD=strong-password-here
   ```

2. **Set Keycloak URL**

   ```env
   VITE_KEYCLOAK_URL=https://auth.yourdomain.com
   KEYCLOAK_URL=https://auth.yourdomain.com
   ```

3. **Use Database**
   - Keycloak in dev mode uses H2 (in-memory)
   - For production, use PostgreSQL:

   ```bash
   KC_DB=postgres
   KC_DB_URL=jdbc:postgresql://db:5432/keycloak
   KC_DB_USERNAME=keycloak
   KC_DB_PASSWORD=password
   ```

4. **Enable HTTPS**

   ```bash
   KC_HTTPS_ENABLED=true
   ```

5. **Configure Email**
   - Set up SMTP for password reset emails
   - Configure email templates

---

## Quick Reference: Common Commands

```bash
# Start Keycloak
docker compose up -d

# View Keycloak logs
docker logs shopquiet-keycloak -f

# Stop Keycloak
docker compose down

# Restart Keycloak
docker compose restart

# Get token for user (testing)
curl -X POST "http://localhost:8080/realms/shopquiet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=shopquiet-cms" \
  -d "username=admin" \
  -d "password=admin123" \
  -d "grant_type=password"

# Validate token with backend
curl http://localhost:3000/api/v1/auth/verify \
  -H "Authorization: Bearer <token>"
```

---

## References

- [Keycloak Official Docs](https://www.keycloak.org/documentation)
- [OpenID Connect Spec](https://openid.net/connect/)
- [JWT.io - Decode Tokens](https://jwt.io)
- [NestJS Passport Integration](https://docs.nestjs.com/recipes/passport)

---

## Support & Questions

For issues or questions about Keycloak integration:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Keycloak logs: `docker logs shopquiet-keycloak`
3. Check backend logs for JWT validation errors
4. Verify all environment variables are correctly set

---

**Last Updated:** August 2026
**Keycloak Version:** 24.0.5
**Status:** Production Ready ✅
