"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(usersService, jwtService, prisma) {
            this.usersService = usersService;
            this.jwtService = jwtService;
            this.prisma = prisma;
        }
        AuthService_1.prototype.validateUser = function (zaloId) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.usersService.syncUser(zaloId, '', '')];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException();
                            }
                            return [2 /*return*/, user];
                    }
                });
            });
        };
        AuthService_1.prototype.validateZaloAccessToken = function (accessToken) {
            return __awaiter(this, void 0, void 0, function () {
                var mockId, secretKey, headers, appsecretProof, response, data, error_1;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            // 1. If it's a mock token for local testing, return mock data
                            if (accessToken.startsWith('mock_zalo_token_')) {
                                mockId = accessToken.replace('mock_zalo_token_', '') || 'cust-zalo-id-1';
                                return [2 /*return*/, {
                                        zaloId: mockId,
                                        name: "Zalo User ".concat(mockId),
                                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                                    }];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 4, , 5]);
                            secretKey = process.env.ZALO_APP_SECRET || '';
                            headers = {
                                access_token: accessToken,
                            };
                            if (secretKey) {
                                appsecretProof = (0, crypto_1.createHmac)('sha256', secretKey)
                                    .update(accessToken)
                                    .digest('hex');
                                headers['appsecret_proof'] = appsecretProof;
                            }
                            return [4 /*yield*/, fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
                                    method: 'GET',
                                    headers: headers,
                                })];
                        case 2:
                            response = _c.sent();
                            if (!response.ok) {
                                throw new Error("Zalo API returned status ".concat(response.status));
                            }
                            return [4 /*yield*/, response.json()];
                        case 3:
                            data = _c.sent();
                            if (data && data.error === -501) {
                                console.warn('[Zalo Auth] Server IP is outside Vietnam (Error -501). Zalo blocked profile retrieval. Bypassing validation for demo.');
                                return [2 /*return*/, null];
                            }
                            if (!data || !data.id) {
                                console.error('[Zalo Auth] Invalid Zalo profile response:', data);
                                throw new Error((data === null || data === void 0 ? void 0 : data.message) || 'Zalo API returned invalid profile data');
                            }
                            return [2 /*return*/, {
                                    zaloId: data.id,
                                    name: data.name || 'Khách hàng Zalo',
                                    avatar: ((_b = (_a = data.picture) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.url) || '',
                                }];
                        case 4:
                            error_1 = _c.sent();
                            console.error('[Zalo Auth] Failed to verify Zalo access token:', error_1);
                            // Fallback for local development
                            if (process.env.NODE_ENV !== 'production') {
                                return [2 /*return*/, {
                                        zaloId: accessToken,
                                        name: 'Zalo Test User',
                                        avatar: '',
                                    }];
                            }
                            throw new common_1.UnauthorizedException('Không thể xác thực tài khoản Zalo');
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        AuthService_1.prototype.login = function (zaloId, name, avatar, password, accessToken) {
            return __awaiter(this, void 0, void 0, function () {
                var targetZaloId, targetName, targetAvatar, zaloProfile, err_1, isAdminId_1, isAdminId, adminPassword, user, payload, access_token, refresh_token, refreshTokenExpiresAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            targetZaloId = zaloId;
                            targetName = name;
                            targetAvatar = avatar;
                            if (!accessToken) return [3 /*break*/, 5];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.validateZaloAccessToken(accessToken)];
                        case 2:
                            zaloProfile = _a.sent();
                            if (zaloProfile) {
                                targetZaloId = zaloProfile.zaloId;
                                targetName = zaloProfile.name;
                                if (zaloProfile.avatar && zaloProfile.avatar !== '') {
                                    targetAvatar = zaloProfile.avatar;
                                }
                            }
                            else {
                                // Fallback to client-provided parameters if Zalo blocked verification due to server geolocation (-501)
                                targetZaloId = zaloId;
                                targetName = name;
                                targetAvatar = avatar;
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _a.sent();
                            console.warn('[Zalo Auth] validateZaloAccessToken failed, falling back to client-provided parameters:', err_1);
                            targetZaloId = zaloId;
                            targetName = name;
                            targetAvatar = avatar;
                            return [3 /*break*/, 4];
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            isAdminId_1 = zaloId.toLowerCase().includes('admin') || zaloId.toLowerCase() === 'admin-zalo-id-1';
                            if (!isAdminId_1 && process.env.NODE_ENV === 'production') {
                                throw new common_1.UnauthorizedException('Yêu cầu Zalo Access Token để đăng nhập an toàn.');
                            }
                            _a.label = 6;
                        case 6:
                            isAdminId = targetZaloId.toLowerCase().includes('admin') || targetZaloId.toLowerCase() === 'admin-zalo-id-1';
                            if (isAdminId) {
                                adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
                                if (!password || password !== adminPassword) {
                                    throw new common_1.UnauthorizedException('Mật khẩu quản trị viên không chính xác');
                                }
                            }
                            return [4 /*yield*/, this.usersService.syncUser(targetZaloId, targetName, targetAvatar)];
                        case 7:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException();
                            }
                            payload = { sub: user.zaloId, zaloId: user.zaloId, role: user.role || 'user' };
                            access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
                            refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
                            refreshTokenExpiresAt = new Date();
                            refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);
                            // Delete old refresh tokens for this user
                            return [4 /*yield*/, this.prisma.refreshToken.deleteMany({
                                    where: { zaloUserId: user.zaloId }
                                })];
                        case 8:
                            // Delete old refresh tokens for this user
                            _a.sent();
                            // Create new refresh token
                            return [4 /*yield*/, this.prisma.refreshToken.create({
                                    data: {
                                        token: refresh_token,
                                        zaloUserId: user.zaloId,
                                        expiresAt: refreshTokenExpiresAt,
                                    },
                                })];
                        case 9:
                            // Create new refresh token
                            _a.sent();
                            return [2 /*return*/, {
                                    access_token: access_token,
                                    refresh_token: refresh_token,
                                    user: {
                                        zaloId: user.zaloId,
                                        name: user.name,
                                        avatar: user.avatar,
                                        role: user.role || 'user',
                                        phone: user.phone || '',
                                        email: user.email || '',
                                        birthday: user.birthday || '',
                                        totalSpent: user.totalSpent || 0,
                                        membershipTier: user.membershipTier || 'Đồng',
                                    },
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.refreshTokens = function (refreshToken) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, storedToken, newPayload, new_access_token, new_refresh_token, newExpiresAt, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 7, , 8]);
                            payload = this.jwtService.verify(refreshToken);
                            return [4 /*yield*/, this.prisma.refreshToken.findUnique({
                                    where: { token: refreshToken },
                                    include: { user: true },
                                })];
                        case 1:
                            storedToken = _a.sent();
                            if (!(!storedToken || storedToken.expiresAt < new Date())) return [3 /*break*/, 4];
                            if (!storedToken) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.refreshToken.delete({
                                    where: { id: storedToken.id },
                                })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: throw new common_1.UnauthorizedException('Invalid or expired refresh token');
                        case 4:
                            newPayload = {
                                sub: storedToken.user.zaloId,
                                zaloId: storedToken.user.zaloId,
                                role: storedToken.user.role || 'user'
                            };
                            new_access_token = this.jwtService.sign(newPayload, { expiresIn: '15m' });
                            new_refresh_token = this.jwtService.sign(newPayload, { expiresIn: '7d' });
                            newExpiresAt = new Date();
                            newExpiresAt.setDate(newExpiresAt.getDate() + 7);
                            // Delete old refresh token and create new one
                            return [4 /*yield*/, this.prisma.refreshToken.delete({
                                    where: { id: storedToken.id },
                                })];
                        case 5:
                            // Delete old refresh token and create new one
                            _a.sent();
                            return [4 /*yield*/, this.prisma.refreshToken.create({
                                    data: {
                                        token: new_refresh_token,
                                        zaloUserId: storedToken.user.zaloId,
                                        expiresAt: newExpiresAt,
                                    },
                                })];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, {
                                    access_token: new_access_token,
                                    refresh_token: new_refresh_token,
                                }];
                        case 7:
                            error_2 = _a.sent();
                            throw new common_1.UnauthorizedException('Invalid refresh token');
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        AuthService_1.prototype.logout = function (refreshToken) {
            return __awaiter(this, void 0, void 0, function () {
                var error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            // Delete refresh token from database
                            return [4 /*yield*/, this.prisma.refreshToken.deleteMany({
                                    where: { token: refreshToken },
                                })];
                        case 1:
                            // Delete refresh token from database
                            _a.sent();
                            return [2 /*return*/, { message: 'Logged out successfully' }];
                        case 2:
                            error_3 = _a.sent();
                            // Don't throw error if token doesn't exist
                            return [2 /*return*/, { message: 'Logged out successfully' }];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        AuthService_1.prototype.verifyToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    try {
                        return [2 /*return*/, this.jwtService.verify(token)];
                    }
                    catch (error) {
                        throw new common_1.UnauthorizedException('Invalid token');
                    }
                    return [2 /*return*/];
                });
            });
        };
        AuthService_1.prototype.decryptPhone = function (zaloId, token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (token === 'user_rejected') {
                        return [2 /*return*/, { success: false, message: 'User rejected permission' }];
                    }
                    if (!token) {
                        return [2 /*return*/, { success: false, message: 'Invalid token' }];
                    }
                    // TODO: Integrate real Zalo merchant decryption here when keys are available
                    // Real integration: call Zalo API with merchant keys to decrypt the token
                    // For now: return failure so user must enter phone manually
                    // Only allow if the token contains a pre-verified real phone (set by real Zalo webhook)
                    return [2 /*return*/, { success: false, message: 'Phone decryption requires Zalo merchant keys configuration' }];
                });
            });
        };
        AuthService_1.prototype.testZaloVerification = function (accessToken) {
            return __awaiter(this, void 0, void 0, function () {
                var secretKey, headers, appsecretProof, response, data, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            secretKey = process.env.ZALO_APP_SECRET || '';
                            headers = {
                                access_token: accessToken,
                            };
                            appsecretProof = '';
                            if (secretKey) {
                                appsecretProof = (0, crypto_1.createHmac)('sha256', secretKey)
                                    .update(accessToken)
                                    .digest('hex');
                                headers['appsecret_proof'] = appsecretProof;
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
                                    method: 'GET',
                                    headers: headers,
                                })];
                        case 2:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 3:
                            data = _a.sent();
                            return [2 /*return*/, {
                                    status: response.status,
                                    ok: response.ok,
                                    secretKeyLength: secretKey.length,
                                    appsecretProof: appsecretProof,
                                    zaloResponse: data,
                                }];
                        case 4:
                            e_1 = _a.sent();
                            return [2 /*return*/, {
                                    error: e_1.message,
                                    stack: e_1.stack,
                                }];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
