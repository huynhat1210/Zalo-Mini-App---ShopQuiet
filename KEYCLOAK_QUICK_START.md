# Quick Start Guide - Keycloak Realm Import

This guide explains how to quickly set up Keycloak using the pre-configured realm export.

## ⚡ Quick Setup (5 minutes)

### Step 1: Start Keycloak

```bash
docker compose up -d
```

Wait for container to be ready (30-60 seconds).

### Step 2: Access Keycloak Admin Console

Open browser and go to:

```
http://localhost:8080/admin
```

**Login:**

- Username: `admin`
- Password: `admin123`

### Step 3: Import Realm

#### Option A: Using CLI (Easiest)

```bash
# Copy the realm file into Keycloak container
docker cp keycloak-realm-export.json shopquiet-keycloak:/opt/keycloak/data/

# Import realm
docker exec shopquiet-keycloak /opt/keycloak/bin/kc.sh import --file=/opt/keycloak/data/keycloak-realm-export.json --realm=shopquiet

# Restart Keycloak
docker compose restart
```

#### Option B: Using Admin Console (Manual)

1. Click on "Master" dropdown → Select "Add realm"
2. Click "Import" button
3. Select the `keycloak-realm-export.json` file
4. Click "Create"

### Step 4: Verify Import

1. Select "shopquiet" realm (should appear in dropdown)
2. Check these were created:
   - **Clients:** `shopquiet-cms`, `shopquiet-campaign`, `shopquiet-backend`
   - **Roles:** `admin`, `user`, `moderator`, `analytics`
   - **Users:** `admin` (password: `admin123`)

### Step 5: Start Applications

```bash
# Terminal 1: Backend
pnpm dev:backend

# Terminal 2: CMS
pnpm dev:cms

# Terminal 3: Campaign
pnpm dev:crm-fe
```

### Step 6: Test SSO

1. Go to http://localhost:5173 (CMS)
2. Login with: `admin` / `admin123`
3. Navigate to http://localhost:5174 (Campaign)
4. ✅ Should be already logged in (SSO working!)

---

## Common Issues

| Issue                  | Solution                                           |
| ---------------------- | -------------------------------------------------- |
| Keycloak not starting  | Check logs: `docker logs shopquiet-keycloak`       |
| Import fails           | Ensure realm JSON is valid, restart Keycloak first |
| Client secrets not set | Edit each client in Admin Console → Credentials    |
| CORS errors            | Verify redirect URIs match your localhost ports    |

---

## Realm Configuration Summary

### Clients Created

| Client ID            | Type        | Redirect URIs            | Purpose                     |
| -------------------- | ----------- | ------------------------ | --------------------------- |
| `shopquiet-cms`      | Public      | http://localhost:5173/\* | CMS Frontend (Port 5173)    |
| `shopquiet-campaign` | Public      | http://localhost:5174/\* | Campaign Portal (Port 5174) |
| `shopquiet-backend`  | Bearer-only | http://localhost:3000/\* | Backend API (Port 3000)     |

### Roles Created

| Role        | Description                  |
| ----------- | ---------------------------- |
| `admin`     | Full system access           |
| `user`      | Standard user access         |
| `moderator` | Content moderation access    |
| `analytics` | Analytics & reporting access |

### Default Admin User

| Property | Value                   |
| -------- | ----------------------- |
| Username | `admin`                 |
| Password | `admin123`              |
| Email    | `admin@shopquiet.local` |
| Roles    | `admin`                 |

---

## Next Steps

1. ✅ Realm imported
2. ✅ Clients configured
3. ✅ Roles created
4. ✅ Admin user set up
5. 📖 Read full guide: [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md)

---

## Modifying Realm Export

To export your current configuration after making changes:

```bash
docker exec shopquiet-keycloak /opt/keycloak/bin/kc.sh export --realm shopquiet --file=/opt/keycloak/data/shopquiet-export.json
docker cp shopquiet-keycloak:/opt/keycloak/data/shopquiet-export.json ./keycloak-realm-export-updated.json
```

---

**For detailed configuration guide, see:** [KEYCLOAK_SETUP.md](./KEYCLOAK_SETUP.md)
