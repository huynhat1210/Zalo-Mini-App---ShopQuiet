import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    zaloId: '123456',
    name: 'Test User',
    avatar: 'avatar.jpg',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    birthday: '',
    phone: '',
    email: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            syncUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when valid zaloId is provided', async () => {
      usersService.syncUser.mockResolvedValue(mockUser);

      const result = await service.validateUser('123456');

      expect(result).toEqual(mockUser);
      expect(usersService.syncUser).toHaveBeenCalledWith('123456', '', '');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersService.syncUser.mockResolvedValue(null);

      await expect(service.validateUser('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      usersService.syncUser.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login('123456', 'Test User', 'avatar.jpg');

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          zaloId: mockUser.zaloId,
          name: mockUser.name,
          avatar: mockUser.avatar,
          role: mockUser.role,
        },
      });
      expect(usersService.syncUser).toHaveBeenCalledWith(
        '123456',
        'Test User',
        'avatar.jpg',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.zaloId,
        zaloId: mockUser.zaloId,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when user sync fails', async () => {
      usersService.syncUser.mockResolvedValue(null);

      await expect(service.login('invalid', 'Test', 'avatar')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle user without role', async () => {
      const userWithoutRole = { ...mockUser, role: null as any };
      usersService.syncUser.mockResolvedValue(userWithoutRole);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login('123456', 'Test User', 'avatar.jpg');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: userWithoutRole.zaloId,
        zaloId: userWithoutRole.zaloId,
        role: 'user',
      });
      expect(result.user.role).toBe('user');
    });
  });

  describe('verifyToken', () => {
    it('should return decoded token when valid token is provided', async () => {
      const decodedToken = { sub: '123456', zaloId: '123456', role: 'user' };
      jwtService.verify.mockReturnValue(decodedToken);

      const result = await service.verifyToken('valid-token');

      expect(result).toEqual(decodedToken);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with message when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken('invalid-token')).rejects.toThrow(
        'Invalid token',
      );
    });
  });
});
