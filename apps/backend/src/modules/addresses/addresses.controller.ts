import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Headers,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ApiTags } from '@nestjs/swagger';

import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  label: string;

  @IsString()
  phone: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@ApiTags('Users & Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  private getRequiredZaloUserId(zaloUserId?: string): string {
    if (!zaloUserId) {
      throw new BadRequestException('x-zalo-user-id header is required');
    }
    return zaloUserId;
  }

  @Get()
  async getAddresses(@Headers('x-zalo-user-id') zaloUserId?: string) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.addressesService.findAll(userId);
  }

  @Post()
  async createAddress(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Body() body: CreateAddressDto,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.addressesService.create(userId, body);
  }

  @Put(':id')
  async updateAddress(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAddressDto,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.addressesService.update(id, userId, body);
  }

  @Delete(':id')
  async deleteAddress(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.addressesService.delete(id, userId);
  }

  @Patch(':id/default')
  async setDefault(
    @Headers('x-zalo-user-id') zaloUserId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.getRequiredZaloUserId(zaloUserId);
    return this.addressesService.setDefault(id, userId);
  }
}
