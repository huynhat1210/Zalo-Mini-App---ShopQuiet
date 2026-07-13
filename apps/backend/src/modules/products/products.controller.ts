import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  async getProducts(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.productsService.findAll(search, categoryId, pageNum, limitNum);
  }

  @Get('products/:id')
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Get('categories')
  async getCategories() {
    return this.productsService.findCategories();
  }

  @Post('products')
  async createProduct(
    @Body()
    body: {
      name: string;
      description: string;
      price: number;
      categoryId: number;
      tags?: string;
      images?: string;
    },
  ) {
    return this.productsService.create(body);
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: number;
      tags?: string;
      images?: string;
    },
  ) {
    return this.productsService.update(id, body);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.delete(id);
  }

  // ── Variant (Stock) management ──────────────────────────────────────────────

  @Post('products/:id/variants')
  async addVariant(
    @Param('id', ParseIntPipe) productId: number,
    @Body() body: { size: string; stock: number },
  ) {
    return this.productsService.upsertVariant(productId, body.size, body.stock);
  }

  @Patch('variants/:id')
  async updateVariantStock(
    @Param('id', ParseIntPipe) variantId: number,
    @Body('stock') stock: number,
  ) {
    return this.productsService.updateVariantStock(variantId, stock);
  }

  @Delete('variants/:id')
  async deleteVariant(@Param('id', ParseIntPipe) variantId: number) {
    return this.productsService.deleteVariant(variantId);
  }
}
