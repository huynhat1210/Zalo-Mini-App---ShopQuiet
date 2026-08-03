# ShopQuiet Keycloak IAM Integration - Complete Setup Summary

## 📌 Overview

This document provides a comprehensive summary of the Keycloak IAM integration that has been implemented for the ShopQuiet e-commerce platform.

**Status:** ✅ **READY FOR DEPLOYMENT**

---

## 🎯 What Has Been Implemented

### ✅ Infrastructure

- [x] Docker Compose configuration for Keycloak (Port 8080)
- [x] Keycloak 24.0.5 with development mode enabled
- [x] Persistent volume for Keycloak data
- [x] Default admin credentials: `admin` / `admin123`

### ✅ Backend Integration

- [x] **apps/backend**: Keycloak JWT strategy with JWKS validation
- [x] **apps/zalo-crm-backend**: Keycloak JWT strategy with JWKS validation
- [x] RolesGuard configured for Keycloak realm roles
- [x] Auth modules properly configured
- [x] Environment variables: `KEYCLOAK_URL`, `KEYCLOAK_REALM`

### ✅ Frontend Integration

- [x] **apps/cms**: Keycloak initialization with `shopquiet-cms` client
- [x] **apps/zalo-crm-frontend**: Keycloak initialization with `shopquiet-campaign` client
- [x] Token storage in localStorage
- [x] Auto token refresh every 60 seconds
- [x] API utils with Bearer token injection
- [x] SSO seamless login flow

### ✅ Configuration Files

- [x] `.env` files for frontend apps with Keycloak variables
- [x] `.env.example` files as templates
- [x] `keycloak-realm-export.json` for quick realm setup
- [x] Comprehensive documentation files

---

## 📂 New Files Created

### Documentation

1. **KEYCLOAK_SETUP.md** (1200+ lines)
   - Complete step-by-step setup guide
   - Realm configuration instructions
   - Client setup procedures
   - Troubleshooting guide
   - Production deployment guide

2. **KEYCLOAK_QUICK_START.md**
   - Quick 5-minute setup guide
   - Realm import instructions
   - Common issues & solutions
   - Configuration summary

3. **KEYCLOAK_INTEGRATION_SUMMARY.md** (this file)
   - Overview of implementation
   - Architecture documentation
   - Quick reference guide

### Configuration

1. **keycloak-realm-export.json**
   - Pre-configured Keycloak realm
   - 3 clients ready to use
   - 4 roles configured
   - Default admin user included
   - Can be imported directly into Keycloak

2. **apps/cms/.env.example**

   ```env
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   VITE_KEYCLOAK_URL=http://localhost:8080
   VITE_KEYCLOAK_REALM=shopquiet
   ```

3. **apps/zalo-crm-frontend/.env.example**
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   VITE_CRM_API_BASE_URL=http://localhost:3002/api/v1
   VITE_KEYCLOAK_URL=http://localhost:8080
   VITE_KEYCLOAK_REALM=shopquiet
   ```

---

## 🏗️ Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Keycloak (8080)                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Realm: shopquiet                                       │ │
│  │  - Clients: cms, campaign, backend                      │ │
│  │  - Roles: admin, user, moderator, analytics             │ │
│  │  - Users: admin (with admin role)                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │ OIDC / JWT
    ┌──────────┴──────────┬──────────────┐
    │                     │              │
    ▼                     ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌─────────────────┐
│  CMS App    │ │  Campaign    │ │  Backend APIs   │
│  (5173)     │ │  Portal      │ │  (3000, 3002)   │
│  ├─ React   │ │  (5174)      │ │  ├─ NestJS      │
│  ├─ keycloak-js│  ├─ React   │ │  ├─ JWT Strategy│
│  ├─ Token   │ │  ├─ keycloak-js│ │  ├─ JWKS Validation
│  │  Storage │ │  ├─ Token    │ │  └─ RolesGuard │
│  └─ SSO     │ │  │  Storage  │ └─────────────────┘
└─────────────┘ │  └─ SSO      │
                └──────────────┘
```

---

## 🔐 Authentication Flow

### User Login Flow (SSO)

```
1. User visits http://localhost:5173 (CMS)
   ↓
2. App.tsx checks if Keycloak token exists
   ↓
3. No token → Redirect to Keycloak login page
   ↓
4. User enters credentials (username: admin, password: admin123)
   ↓
5. Keycloak validates and returns:
   - Access Token (15 minutes lifetime)
   - Refresh Token (7 days lifetime)
   ↓
6. Frontend stores tokens in localStorage:
   - cms_access_token
   - cms_refresh_token
   ↓
7. Frontend stores user profile:
   - zaloId, name, role (from token claims)
   ↓
8. Setup auto-refresh: Every 60 seconds, check if token needs refresh
   ↓
9. User can now access CMS
```

### API Request Flow

```
1. Frontend makes API request
   ↓
2. api.util.ts reads token from localStorage
   ↓
3. Injects Authorization header: Bearer <token>
   ↓
4. Request sent to backend
   ↓
5. Backend JwtAuthGuard intercepts request
   ↓
6. JwtStrategy validates JWT:
   - Fetches JWKS from Keycloak
   - Verifies RS256 signature
   - Validates token not expired
   ↓
7. Extract user from token claims:
   - preferred_username
   - realm_access.roles
   ↓
8. If valid → Request proceeds
   If invalid → 401 Unauthorized → Frontend logged out
```

---

## 🚀 Quick Start (Choose One)

### Option 1: Fastest (CLI Import)

```bash
# 1. Start Keycloak
docker compose up -d

# 2. Import realm
docker cp keycloak-realm-export.json shopquiet-keycloak:/opt/keycloak/data/
docker exec shopquiet-keycloak /opt/keycloak/bin/kc.sh import \
  --file=/opt/keycloak/data/keycloak-realm-export.json \
  --realm=shopquiet
docker compose restart

# 3. Start apps
pnpm dev

# 4. Done! Login at:
# - CMS: http://localhost:5173 (admin/admin123)
# - Campaign: http://localhost:5174 (admin/admin123)
```

### Option 2: Manual Setup

Follow the detailed guide: [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md)

### Option 3: UI Import

1. Go to http://localhost:8080/admin (admin/admin123)
2. Click "Add Realm" → Select `keycloak-realm-export.json`
3. Done!

---

## 📋 Configuration Checklist

### Environment Variables

**Backend (.env):**

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=shopquiet
```

**Frontend (.env):**

```env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=shopquiet
```

### Keycloak Realm Setup

- [x] Realm name: `shopquiet`
- [x] Access token lifespan: 15 minutes
- [x] Refresh token lifespan: 7 days

### Keycloak Clients

| Client               | Redirect URIs            | Purpose              |
| -------------------- | ------------------------ | -------------------- |
| `shopquiet-cms`      | http://localhost:5173/\* | CMS Frontend         |
| `shopquiet-campaign` | http://localhost:5174/\* | Campaign Portal      |
| `shopquiet-backend`  | N/A                      | Bearer-only for APIs |

### Keycloak Roles

- [x] `admin` - Full access
- [x] `user` - Standard access
- [x] `moderator` - Content moderation
- [x] `analytics` - Reporting access

### Default Admin User

- [x] Username: `admin`
- [x] Password: `admin123`
- [x] Email: `admin@shopquiet.local`
- [x] Role: `admin`

---

## 🔍 Verification Steps

### 1. Verify Keycloak is Running

```bash
curl http://localhost:8080/health
# Should return 200 OK
```

### 2. Verify JWKS Endpoint

```bash
curl http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs
# Should return JSON with public keys
```

### 3. Get Test Token

```bash
curl -X POST "http://localhost:8080/realms/shopquiet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=shopquiet-cms" \
  -d "username=admin" \
  -d "password=admin123" \
  -d "grant_type=password"
# Should return access_token
```

### 4. Test Backend API

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/v1/users/profile
# Should return user profile or 401 if token invalid
```

### 5. Test Frontend Login

- Navigate to http://localhost:5173
- Should redirect to Keycloak login
- Login with admin/admin123
- Should redirect back to CMS

---

## 📖 Documentation Files

| File                                                       | Purpose                 | Lines |
| ---------------------------------------------------------- | ----------------------- | ----- |
| [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md)                   | Complete setup guide    | 1200+ |
| [KEYCLOAK_QUICK_START.md](./KEYCLOAK_QUICK_START.md)       | Quick 5-min setup       | 150+  |
| [keycloak-realm-export.json](./keycloak-realm-export.json) | Importable realm config | 500+  |

---

## 🛠️ Troubleshooting

### Common Issues

**Keycloak won't start:**

```bash
docker logs shopquiet-keycloak
```

**Frontend stuck in login loop:**

- Check VITE_KEYCLOAK_URL in .env
- Verify realm exists: shopquiet
- Check redirect URIs match localhost port

**Backend returns 401:**

- Verify token is being sent: `curl -v http://localhost:3000/api/v1/endpoint`
- Check backend logs for JWT errors
- Verify KEYCLOAK_URL is correct
- Test JWKS endpoint: `curl http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs`

**CORS errors:**

- Verify web origins in Keycloak clients
- Check backend CORS config

See full troubleshooting guide: [KEYCLOAK_SETUP.md#troubleshooting](./KEYCLOAK_SETUP.md#troubleshooting)

---

## 🔄 Token Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                   Token Lifecycle                       │
├─────────────────────────────────────────────────────────┤
│ 1. User logs in                                         │
│    → Access Token issued (15 minutes)                   │
│    → Refresh Token issued (7 days)                      │
│                                                         │
│ 2. Token stored in localStorage                         │
│    → cms_access_token                                   │
│    → cms_refresh_token                                  │
│                                                         │
│ 3. Every API request includes token                     │
│    → Authorization: Bearer <token>                      │
│                                                         │
│ 4. Every 60 seconds, check if refresh needed           │
│    → If <70 min remaining → refresh                     │
│    → Get new access token                               │
│    → Store new token                                    │
│                                                         │
│ 5. When access token expires                            │
│    → Backend returns 401 Unauthorized                   │
│    → Frontend redirects to login                        │
│                                                         │
│ 6. When refresh token expires (7 days)                 │
│    → User must login again                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Concepts

### Single Sign-On (SSO)

- User logs in once
- Can access multiple apps without re-logging in
- Keycloak manages sessions across all clients

### OpenID Connect (OIDC)

- Industry-standard authentication protocol
- Built on top of OAuth 2.0
- Provides both authentication AND authorization

### JWT (JSON Web Tokens)

- Stateless tokens
- Contains user info and roles
- Signed by Keycloak private key
- Verified using Keycloak public key (JWKS)

### JWKS (JSON Web Key Set)

- Endpoint that provides public keys
- Backend uses keys to verify JWT signatures
- Automatic key rotation for security

### Roles & Authorization

- User assigned roles in Keycloak
- Roles included in JWT token
- Backend checks roles using `@Roles()` decorator

---

## 📊 Integration Status

| Component            | Status      | Notes                         |
| -------------------- | ----------- | ----------------------------- |
| Docker Compose       | ✅ Complete | Ready to launch               |
| Keycloak Docker      | ✅ Complete | 24.0.5 image configured       |
| Backend JWT Strategy | ✅ Complete | Using JWKS validation         |
| Backend RolesGuard   | ✅ Complete | Keycloak roles supported      |
| CMS Frontend         | ✅ Complete | Keycloak initialization done  |
| Campaign Frontend    | ✅ Complete | Keycloak initialization done  |
| API Utils            | ✅ Complete | Token injection configured    |
| Documentation        | ✅ Complete | Comprehensive guides provided |
| Realm Export         | ✅ Complete | Can import directly           |
| Environment Files    | ✅ Complete | .env and .env.example ready   |

---

## 🚦 Next Steps

1. **Start Keycloak:**

   ```bash
   docker compose up -d
   ```

2. **Import Realm (choose one method):**
   - CLI import (fastest)
   - Admin console import
   - Manual setup

3. **Update Environment Variables:**
   - Verify .env files have Keycloak config
   - Already included in provided files

4. **Start Applications:**

   ```bash
   pnpm dev
   ```

5. **Test Integration:**
   - Navigate to http://localhost:5173
   - Login with admin/admin123
   - Test SSO with http://localhost:5174

6. **Read Full Documentation:**
   - [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md) for detailed guide
   - [KEYCLOAK_QUICK_START.md](./KEYCLOAK_QUICK_START.md) for quick reference

---

## 📞 Support Resources

- **Keycloak Official Docs:** https://www.keycloak.org/documentation
- **OpenID Connect Spec:** https://openid.net/connect/
- **JWT Decoder:** https://jwt.io
- **Docker Compose Reference:** https://docs.docker.com/compose/

---

## 📝 Document History

| Date       | Version | Changes                         |
| ---------- | ------- | ------------------------------- |
| 2026-08-03 | 1.0     | Initial implementation complete |

---

**Status:** ✅ Ready for development and testing

**Last Updated:** August 3, 2026

**Implemented By:** GitHub Copilot - Keycloak Integration Assistant
