import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  const mockUser = {
    zaloId: '123456',
    name: 'Test User',
    avatar: 'avatar.jpg',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers = [
    mockUser,
    {
      zaloId: '789012',
      name: 'Another User',
      avatar: 'avatar2.jpg',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(mockUser),
        findMany: jest.fn().mockResolvedValue(mockUsers),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService) as jest.Mocked<any>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncUser', () => {
    it('should return null when zaloId is not provided', async () => {
      const result = await service.syncUser('', 'Test User', 'avatar.jpg');

      expect(result).toBeNull();
      expect(prismaService.user.upsert).not.toHaveBeenCalled();
    });

    it('should create new user when zaloId does not exist', async () => {
      const result = await service.syncUser('123456', 'Test User', 'avatar.jpg');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.upsert).toHaveBeenCalledWith({
        where: { zaloId: '123456' },
        update: { name: 'Test User', avatar: 'avatar.jpg', role: 'user', gender: undefined },
        create: { zaloId: '123456', name: 'Test User', avatar: 'avatar.jpg', phone: undefined, birthday: undefined, email: undefined, gender: undefined, role: 'user' },
      });
    });

    it('should update existing user when zaloId exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.syncUser('123456', 'Updated Name', 'new-avatar.jpg');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.upsert).toHaveBeenCalledWith({
        where: { zaloId: '123456' },
        update: { name: 'Test User', avatar: 'new-avatar.jpg', role: 'user', gender: undefined },
        create: { zaloId: '123456', name: 'Updated Name', avatar: 'new-avatar.jpg', phone: undefined, birthday: undefined, email: undefined, gender: undefined, role: 'user' },
      });
    });

    it('should handle user without avatar', async () => {
      const result = await service.syncUser('123456', 'Test User');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.upsert).toHaveBeenCalledWith({
        where: { zaloId: '123456' },
        update: { name: 'Test User', avatar: '', role: 'user', gender: undefined },
        create: { zaloId: '123456', name: 'Test User', avatar: '', phone: undefined, birthday: undefined, email: undefined, gender: undefined, role: 'user' },
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users ordered by createdAt desc', async () => {
      const result = await service.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      });
    });

    it('should return empty array when no users exist', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getAllUsers();

      expect(result).toEqual([]);
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });
  });
});
