# Developer Guide - Working with Keycloak in ShopQuiet

This guide explains how to work with Keycloak authentication in your ShopQuiet development.

## 🎯 Quick Reference

### Environment Setup

```bash
# 1. Start Keycloak
docker compose up -d

# 2. Verify it's running
curl http://localhost:8080/health

# 3. Start development apps
pnpm dev
```

### Default Credentials

```
Username: admin
Password: admin123
Email: admin@shopquiet.local
```

---

## 🔐 Frontend Authentication (React + Keycloak-JS)

### How it Works

```typescript
// apps/cms/src/App.tsx
import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://localhost:8080",
  realm: "shopquiet",
  clientId: "shopquiet-cms",
});

useEffect(() => {
  keycloak
    .init({
      onLoad: "login-required", // Redirect to login if not authenticated
      checkLoginIframe: false,
    })
    .then((authenticated) => {
      if (authenticated) {
        // Store tokens
        localStorage.setItem("cms_access_token", keycloak.token);
        localStorage.setItem("cms_refresh_token", keycloak.refreshToken);

        // Extract user info from token
        const profile = {
          zaloId: keycloak.tokenParsed?.preferred_username,
          name: keycloak.tokenParsed?.name,
          role: keycloak.tokenParsed?.realm_access?.roles?.includes("admin")
            ? "admin"
            : "user",
        };
        localStorage.setItem("zalo_profile_custom", JSON.stringify(profile));
      }
    });
}, []);
```

### Making API Requests

```typescript
// apps/cms/src/utils/api/api.util.ts
export async function apiRequest<T = any>(
  path: string,
  method: TApiHttpMethod = "GET",
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Automatically add token to requests
  const token = localStorage.getItem("cms_access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Token expired, trigger logout
    window.dispatchEvent(new Event("cms:unauthorized"));
    throw new Error("Unauthorized");
  }

  return response.json();
}
```

### Accessing User Profile

```typescript
// Get from localStorage
const profile = JSON.parse(localStorage.getItem("zalo_profile_custom"));
console.log(profile.name); // "Admin User"
console.log(profile.role); // "admin"
console.log(profile.zaloId); // "admin"

// Or from Keycloak object
console.log(keycloak.tokenParsed?.name);
console.log(keycloak.tokenParsed?.realm_access?.roles);
```

### Token Refresh

```typescript
// Automatic refresh every 60 seconds (already configured)
setInterval(() => {
  keycloak.updateToken(70).then((refreshed) => {
    if (refreshed) {
      // Token was refreshed, update storage
      localStorage.setItem("cms_access_token", keycloak.token);
    }
  });
}, 60000);
```

### Logout

```typescript
function handleLogout() {
  localStorage.removeItem("cms_access_token");
  localStorage.removeItem("cms_refresh_token");
  localStorage.removeItem("zalo_profile_custom");
  keycloak.logout(); // Redirects to Keycloak logout
}
```

---

## 🔑 Backend Authentication (NestJS + JWT)

### How it Works

```typescript
// apps/backend/src/modules/auth/strategies/jwt.strategy.ts
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // Extract token from Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Don't accept expired tokens
      ignoreExpiration: false,

      // Use Keycloak JWKS to verify signature
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        // Keycloak public keys endpoint
        jwksUri:
          "http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs",
      }),

      // Use RS256 algorithm (Keycloak default)
      algorithms: ["RS256"],
    });
  }

  // Validate and extract user info from token
  async validate(payload: any) {
    const username = payload.preferred_username;
    const user = await this.authService.validateUser(username);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Extract roles from Keycloak token
    const kcRoles = payload.realm_access?.roles || [];
    const role = kcRoles.includes("admin") ? "admin" : "user";

    // Return user object attached to request
    return {
      zaloId: user.zaloId,
      name: user.name,
      role: role,
    };
  }
}
```

### Protecting Routes

```typescript
// Use JwtAuthGuard to protect routes
@Controller("api/v1/users")
export class UsersController {
  // Public route
  @Get("public")
  getPublic() {
    return { message: "Public data" };
  }

  // Protected by JWT
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    return req.user; // User from JWT token
  }

  // Protected by JWT + Admin role required
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  deleteUser(@Param("id") id: string) {
    // Only admin can delete users
    return { message: "User deleted" };
  }
}
```

### Accessing User in Handlers

```typescript
@Get('my-profile')
@UseGuards(JwtAuthGuard)
getMyProfile(@Req() req: Request) {
  // req.user contains the validated payload
  console.log(req.user.zaloId);
  console.log(req.user.role);

  return {
    user: req.user
  };
}
```

---

## 🔄 Common Workflows

### Workflow 1: User Logs In (CMS Frontend)

```
1. User visits http://localhost:5173
2. App.tsx initializes Keycloak
3. No token found → Redirect to Keycloak login
4. User enters admin / admin123
5. Keycloak validates credentials
6. Returns access_token + refresh_token
7. Frontend stores tokens in localStorage
8. Frontend extracts user profile from token
9. Redirect to CMS dashboard
10. User authenticated! ✅
```

### Workflow 2: API Request with Authentication

```
1. Frontend needs user data
2. Calls apiRequest('/api/v1/users/profile')
3. api.util.ts reads token from localStorage
4. Adds "Authorization: Bearer <token>" header
5. Sends GET request to backend
6. Backend JwtAuthGuard intercepts
7. JwtStrategy validates token with Keycloak JWKS
8. If valid: Extract user, attach to request
9. If invalid: Return 401 Unauthorized
10. Controller receives request.user
11. Returns user data
12. Frontend receives response ✅
```

### Workflow 3: Token Expires

```
1. Token is valid, user making requests
2. 15 minutes pass (access token lifetime)
3. Frontend tries to make API request
4. Token is expired
5. Backend returns 401 Unauthorized
6. Frontend catches 401
7. Dispatches 'cms:unauthorized' event
8. App.tsx handles event
9. Clears localStorage
10. Redirects to Keycloak login
11. User logs in again
12. New tokens issued ✅
```

### Workflow 4: Auto Token Refresh

```
1. Frontend app running
2. Every 60 seconds:
   a. Check if token expires in <70 minutes
   b. If yes: Call keycloak.updateToken(70)
   c. Keycloak exchanges refresh_token for new access_token
   d. Update localStorage with new token
   e. Continue using new token
3. User never gets logged out during session
4. Seamless experience ✅
```

---

## 🧪 Testing & Debugging

### Get a Test Token

```bash
# Request token using password flow
curl -X POST "http://localhost:8080/realms/shopquiet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=shopquiet-cms" \
  -d "username=admin" \
  -d "password=admin123" \
  -d "grant_type=password"

# Response will include:
# {
#   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
#   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
#   "expires_in": 900,
#   "token_type": "Bearer"
# }
```

### Decode Token

1. Copy the `access_token` value (without "Bearer ")
2. Go to https://jwt.io
3. Paste in "Encoded" section
4. Token payload shows in "Decoded" section:
   ```json
   {
     "sub": "...",
     "preferred_username": "admin",
     "name": "Admin User",
     "realm_access": {
       "roles": ["admin"]
     },
     "exp": 1234567890
   }
   ```

### Test Backend API with Token

```bash
# Get token first
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/shopquiet/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=shopquiet-cms" \
  -d "username=admin" \
  -d "password=admin123" \
  -d "grant_type=password" | jq -r '.access_token')

# Use token in API request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/users/profile

# Should return user profile
# If 401: Token invalid or expired
```

### Check JWKS Endpoint

```bash
curl http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs

# Should return JSON with public keys:
# {
#   "keys": [
#     {
#       "kty": "RSA",
#       "use": "sig",
#       "kid": "...",
#       "n": "...",
#       "e": "AQAB"
#     }
#   ]
# }
```

### Debug Frontend Token Issues

```typescript
// Check if token is stored
console.log(localStorage.getItem("cms_access_token"));

// Check if Keycloak initialized
console.log(keycloak.authenticated);
console.log(keycloak.token);
console.log(keycloak.tokenParsed);

// Check token expiration
if (keycloak.tokenParsed) {
  const exp = new Date(keycloak.tokenParsed.exp * 1000);
  console.log("Token expires at:", exp);
  console.log("Token expired?", new Date() > exp);
}
```

### Debug Backend Token Issues

Check logs in terminal running backend:

```
Error: Invalid token signature
Error: Token expired
Error: User not found in database
```

These indicate:

- Token signature invalid → JWKS endpoint issue
- Token expired → Frontend should refresh
- User not in DB → validateUser() method issue

---

## 🎓 Key Concepts

### Access Token (JWT)

- Short-lived (15 minutes)
- Contains user info and roles
- Sent with every API request
- Signed by Keycloak private key
- Verified using public key from JWKS

### Refresh Token

- Long-lived (7 days)
- Used to get new access token
- Stored securely in localStorage
- Sent to Keycloak to exchange for new access_token

### JWKS (JSON Web Key Set)

- Endpoint that provides public keys
- Backend uses keys to verify JWT signatures
- Keys automatically rotate
- Backend caches keys for performance

### Roles

- Assigned in Keycloak admin console
- Included in JWT token payload
- Backend checks with @Roles() decorator
- Used for authorization decisions

### SSO (Single Sign-On)

- Login once, access multiple apps
- Keycloak maintains session across clients
- All clients share same authentication state
- Logout anywhere logs out everywhere

---

## 📋 Checklist for Development

- [ ] Keycloak running: `http://localhost:8080`
- [ ] Can login to admin console: admin/admin123
- [ ] Can view shopquiet realm
- [ ] Can see 3 clients: cms, campaign, backend
- [ ] Can see admin user with admin role
- [ ] Backend environment variables set
- [ ] Frontend environment variables set
- [ ] CMS app redirects to Keycloak login
- [ ] Can login via Keycloak login page
- [ ] Redirected back to CMS after login
- [ ] API requests include Authorization header
- [ ] Backend validates tokens successfully
- [ ] SSO works between CMS and Campaign

---

## 🔗 Useful Links

- **Keycloak Admin Console:** http://localhost:8080/admin
- **JWT Decoder:** https://jwt.io
- **JWKS Endpoint:** http://localhost:8080/realms/shopquiet/protocol/openid-connect/certs
- **Keycloak OpenAPI Docs:** https://www.keycloak.org/docs-api/latest/rest-api/

---

## ❓ FAQ

**Q: How long does access token last?**
A: 15 minutes. After that, backend returns 401, frontend refreshes or redirects to login.

**Q: Can I change token lifetime?**
A: Yes, in Keycloak Admin → Realm settings → Tokens section.

**Q: How do I add a new user?**
A: Keycloak Admin Console → Users → Add user → Set credentials → Assign roles.

**Q: How do I change admin password?**
A: Keycloak Admin Console → Users → admin → Set password.

**Q: What if JWKS endpoint is down?**
A: Keycloak caches JWKS keys, so it will work for ~5 minutes. After that, tokens can't be verified.

**Q: Can I use multiple roles?**
A: Yes! A user can have multiple roles. Check them in backend with `requiredRoles.some(role => user.role === role)`.

**Q: How do I debug token issues?**
A: Check backend logs, verify JWKS endpoint, decode token at jwt.io, check frontend console for errors.

---

**Updated:** August 3, 2026
**Version:** 1.0
**Status:** Complete ✅
