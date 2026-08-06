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
      void this.matchEntriesToUsers(list.id);
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

  async updateList(id: number, name: string, description: string, phones: string[]) {
    await this.findOne(id);
    if (!name || !name.trim()) throw new BadRequestException('List name is required.');

    const cleanPhones = [...new Set((phones || [])
      .map((phone) => phone.trim().replace(/[^0-9]/g, ''))
      .filter((phone) => phone.length >= 9 && phone.length <= 11))];
    if (!cleanPhones.length) throw new BadRequestException('At least one valid phone number is required.');

    await this.prisma.$transaction(async (tx) => {
      await tx.marketingList.update({
        where: { id },
        data: { name: name.trim(), description: description?.trim() || null },
      });
      await tx.marketingListEntry.deleteMany({ where: { listId: id } });
      await tx.marketingListEntry.createMany({
        data: cleanPhones.map((phone) => ({ listId: id, phone, status: 'PENDING', hasZalo: false })),
      });
    });
    void this.matchEntriesToUsers(id);
    return this.findOne(id);
  }

  async deleteList(id: number) {
    await this.findOne(id);
    await this.prisma.marketingList.delete({
      where: { id },
    });
    return { success: true };
  }
  // Resolve imported phone numbers against first-party ShopQuiet users.
  private async matchEntriesToUsers(listId: number) {
    try {
      const entries = await this.prisma.marketingListEntry.findMany({
        where: { listId, status: 'PENDING' },
      });
      const phones = entries.map((entry) => entry.phone);
      const users = await this.prisma.user.findMany({
        where: { phone: { in: phones } },
        select: { zaloId: true, phone: true, name: true },
      });
      const usersByPhone = new Map(users.filter((user) => user.phone).map((user) => [user.phone!, user]));

      for (const entry of entries) {
        const user = usersByPhone.get(entry.phone);
        await this.prisma.marketingListEntry.update({
          where: { id: entry.id },
          data: {
            status: 'VERIFIED',
            hasZalo: Boolean(user),
            name: user?.name || null,
            zaloUid: user?.zaloId || null,
          },
        });
      }

      this.logger.log(`Matched ${users.length}/${entries.length} imported contacts to ShopQuiet users for list ${listId}`);
    } catch (err) {
      this.logger.error(`Failed to match imported contacts for list ${listId}:`, err);
    }
  }
}
