import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    zaloId: '123456',
    name: 'Test User',
    avatar: 'avatar.jpg',
    role: 'user',
  };

  const mockLoginResponse = {
    access_token: 'mock-jwt-token',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            verifyToken: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      const loginDto = {
        zaloId: '123456',
        name: 'Test User',
        avatar: 'avatar.jpg',
      };
      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(
        loginDto.zaloId,
        loginDto.name,
        loginDto.avatar,
      );
    });
  });

  describe('verify', () => {
    it('should return decoded token when valid token is provided', async () => {
      const verifyTokenDto = { token: 'valid-token' };
      const decodedToken = { sub: '123456', zaloId: '123456', role: 'user' };
      authService.verifyToken.mockResolvedValue(decodedToken);

      const result = await controller.verify(verifyTokenDto);

      expect(result).toEqual(decodedToken);
      expect(authService.verifyToken).toHaveBeenCalledWith(verifyTokenDto.token);
    });
  });

  describe('getAdminData', () => {
    it('should return admin data', () => {
      const result = controller.getAdminData();

      expect(result).toEqual({ message: 'This is admin only data' });
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', () => {
      const mockRequest = { user: mockUser };
      const result = controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });
});
