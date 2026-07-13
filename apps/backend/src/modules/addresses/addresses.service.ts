import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async findAll(zaloUserId: string) {
    return this.prisma.userAddress.findMany({
      where: { zaloUserId },
      orderBy: { id: 'asc' },
    });
  }

  async create(
    zaloUserId: string,
    data: {
      label: string;
      phone: string;
      street: string;
      city: string;
      isDefault?: boolean;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { zaloUserId },
        data: { isDefault: false },
      });
    }

    const count = await this.prisma.userAddress.count({
      where: { zaloUserId },
    });
    const isDefault = count === 0 ? true : !!data.isDefault;

    return this.prisma.userAddress.create({
      data: {
        zaloUserId,
        label: data.label,
        phone: data.phone,
        street: data.street,
        city: data.city,
        isDefault,
      },
    });
  }

  async update(
    id: number,
    zaloUserId: string,
    data: {
      label?: string;
      phone?: string;
      street?: string;
      city?: string;
      isDefault?: boolean;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { zaloUserId },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.update({
      where: { id, zaloUserId },
      data,
    });
  }

  async delete(id: number, zaloUserId: string) {
    const address = await this.prisma.userAddress.findUnique({ where: { id } });
    const res = await this.prisma.userAddress.delete({
      where: { id, zaloUserId },
    });

    if (address?.isDefault) {
      const first = await this.prisma.userAddress.findFirst({
        where: { zaloUserId },
      });
      if (first) {
        await this.prisma.userAddress.update({
          where: { id: first.id },
          data: { isDefault: true },
        });
      }
    }

    return res;
  }

  async setDefault(id: number, zaloUserId: string) {
    await this.prisma.userAddress.updateMany({
      where: { zaloUserId },
      data: { isDefault: false },
    });

    return this.prisma.userAddress.update({
      where: { id, zaloUserId },
      data: { isDefault: true },
    });
  }
}
