import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { MarketingListService } from './marketing-list.service';

@Controller('marketing-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MarketingListController {
  constructor(private readonly marketingListService: MarketingListService) {}

  @Post()
  create(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('phones') phones: string[],
  ) {
    return this.marketingListService.createList(name, description, 'PASTE', null, phones);
  }

  @Get()
  findAll() {
    return this.marketingListService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketingListService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marketingListService.deleteList(+id);
  }
}
