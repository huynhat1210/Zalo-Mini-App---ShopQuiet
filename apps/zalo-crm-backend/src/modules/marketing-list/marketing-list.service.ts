import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketingListService {
  private readonly logger = new Logger(MarketingListService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createList(name: string, description: string, sourceType: string, sourceId: string | null, phones: string[]) {
    if (!name || name.trim() === '') {
      throw new BadRequestException('Tên tệp không được để trống');
    }

    // Filter and clean phone numbers
    const cleanPhones = phones
      .map(p => p.trim().replace(/[^0-9]/g, ''))
      .filter(p => p.length >= 9 && p.length <= 11);

    if (cleanPhones.length === 0 && sourceType === 'PASTE') {
      throw new BadRequestException('Danh sách số điện thoại hợp lệ không được rỗng');
    }

    // Create marketing list
    const list = await this.prisma.marketingList.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sourceType,
        sourceId,
      },
    });

    // Create list entries
    if (cleanPhones.length > 0) {
      const entriesData = cleanPhones.map(phone => ({
        listId: list.id,
        phone,
        status: 'PENDING',
        hasZalo: false,
      }));

      await this.prisma.marketingListEntry.createMany({
        data: entriesData,
      });

      // Start background lookup simulation
      this.simulateZaloLookup(list.id);
    }

    return this.findOne(list.id);
  }

  async findAll() {
    const lists = await this.prisma.marketingList.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        entries: {
          select: {
            hasZalo: true,
            status: true,
          },
        },
      },
    });

    return lists.map(list => {
      const totalEntries = list.entries.length;
      const verifiedEntries = list.entries.filter(e => e.status === 'VERIFIED').length;
      const hasZaloEntries = list.entries.filter(e => e.hasZalo).length;

      return {
        id: list.id,
        name: list.name,
        description: list.description,
        sourceType: list.sourceType,
        sourceId: list.sourceId,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        totalEntries,
        verifiedEntries,
        hasZaloEntries,
        status: totalEntries === 0 ? 'COMPLETED' : verifiedEntries === totalEntries ? 'COMPLETED' : 'PROCESSING',
      };
    });
  }

  async findOne(id: number) {
    const list = await this.prisma.marketingList.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundException(`Không tìm thấy tệp khách hàng có ID ${id}`);
    }

    const totalEntries = list.entries.length;
    const verifiedEntries = list.entries.filter(e => e.status === 'VERIFIED').length;
    const hasZaloEntries = list.entries.filter(e => e.hasZalo).length;

    return {
      ...list,
      totalEntries,
      verifiedEntries,
      hasZaloEntries,
      status: totalEntries === 0 ? 'COMPLETED' : verifiedEntries === totalEntries ? 'COMPLETED' : 'PROCESSING',
    };
  }

  async deleteList(id: number) {
    await this.findOne(id);
    await this.prisma.marketingList.delete({
      where: { id },
    });
    return { success: true };
  }

  // Simulate scanning group members
  async scanGroup(groupUrl: string, listName: string) {
    if (!groupUrl || groupUrl.trim() === '') {
      throw new BadRequestException('Link nhóm Zalo không được để trống');
    }

    const name = listName?.trim() || `Tệp quét nhóm_${new Date().toLocaleDateString('vi-VN')}`;

    // Create the marketing list first
    const list = await this.prisma.marketingList.create({
      data: {
        name,
        description: `Quét thành viên từ nhóm: ${groupUrl}`,
        sourceType: 'GROUP_SCAN',
        sourceId: groupUrl.trim(),
      },
    });

    // Simulated list of Zalo members
    const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Hồ'];
    const middleNames = ['Văn', 'Thị', 'Minh', 'Anh', 'Hoàng', 'Thanh', 'Đức', 'Hải', 'Ngọc', 'Quốc', 'Mỹ', 'Kim'];
    const lastNames = ['An', 'Bình', 'Cường', 'Duy', 'Dũng', 'Đăng', 'Giang', 'Hùng', 'Khoa', 'Khánh', 'Liêm', 'Mỹ', 'Nam', 'Phong', 'Quân', 'Sơn', 'Tuấn', 'Việt', 'Yến', 'Bảo'];

    const totalMembers = Math.floor(Math.random() * 16) + 15; // 15 to 30 members
    const entriesData = [];

    for (let i = 0; i < totalMembers; i++) {
      const randFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
      const randMiddle = middleNames[Math.floor(Math.random() * middleNames.length)];
      const randLast = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${randFirst} ${randMiddle} ${randLast}`;

      // Random phone number
      const phonePrefixes = ['090', '091', '098', '096', '097', '034', '035', '038', '077', '079', '086'];
      const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
      const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
      const phone = `${prefix}${suffix}`;

      // Random Zalo UID
      const zaloUid = `zalo_${Math.floor(100000000 + Math.random() * 900000000)}`;

      // In group scan, members are scanned directly with profiles
      const hasZalo = Math.random() > 0.15; // 85% have Zalo

      entriesData.push({
        listId: list.id,
        phone,
        name: fullName,
        zaloUid: hasZalo ? zaloUid : null,
        hasZalo,
        status: 'VERIFIED',
      });
    }

    await this.prisma.marketingListEntry.createMany({
      data: entriesData,
    });

    return this.findOne(list.id);
  }

  // Background simulation of Tra cứu Zalo SĐT
  private simulateZaloLookup(listId: number) {
    // Run lookup in background
    setTimeout(async () => {
      try {
        const entries = await this.prisma.marketingListEntry.findMany({
          where: { listId, status: 'PENDING' },
        });

        const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
        const lastNames = ['An', 'Bình', 'Chi', 'Dương', 'Hà', 'Minh', 'Nam', 'Tùng', 'Yến', 'Quốc'];

        for (const entry of entries) {
          const hasZalo = Math.random() > 0.3; // 70% have Zalo
          const randFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
          const randLast = lastNames[Math.floor(Math.random() * lastNames.length)];
          const name = hasZalo ? `${randFirst} ${randLast}` : null;
          const zaloUid = hasZalo ? `zalo_${Math.floor(100000000 + Math.random() * 900000000)}` : null;

          await this.prisma.marketingListEntry.update({
            where: { id: entry.id },
            data: {
              status: 'VERIFIED',
              hasZalo,
              name,
              zaloUid,
            },
          });

          // Wait small delay between each check to simulate API throttling
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        this.logger.log(`Completed background Zalo lookup for list ${listId}`);
      } catch (err) {
        this.logger.error(`Error in background Zalo lookup for list ${listId}:`, err);
      }
    }, 1000);
  }
}
