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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantStockDto,
} from './dto/create-product.dto';

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get all products with pagination' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for name/description',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: String,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: 'Legacy limit parameter',
  })
  @ApiQuery({
    name: 'page_size',
    required: false,
    type: String,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sorting (e.g. desc:updated_at, asc:price)',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  async getProducts(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('page_size') pageSize?: string,
    @Query('sort') sort?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = pageSize
      ? parseInt(pageSize, 10)
      : limit
        ? parseInt(limit, 10)
        : 10;
    return this.productsService.findAll(
      search,
      categoryId,
      pageNum,
      limitNum,
      sort,
    );
  }

  @Get('products/flash-sale')
  @ApiOperation({ summary: 'Get flash sale products' })
  @ApiResponse({ status: 200, description: 'Flash sale products retrieved' })
  async getFlashSaleProducts() {
    return this.productsService.findFlashSaleProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories() {
    return this.productsService.findCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (Admin only)' })
  async createCategory(@Body() body: { name: string; slug?: string; description?: string; imageUrl?: string }) {
    return this.productsService.createCategory(body);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin only)' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; slug?: string; description?: string; imageUrl?: string },
  ) {
    return this.productsService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (Admin only)' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteCategory(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createProduct(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Put('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    return this.productsService.update(id, body);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.delete(id);
  }

  // ── Variant (Stock) management ──────────────────────────────────────────────

  @Post('products/:id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product variant (Admin only)' })
  @ApiResponse({ status: 201, description: 'Variant added' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async addVariant(
    @Param('id', ParseIntPipe) productId: number,
    @Body() body: CreateVariantDto,
  ) {
    return this.productsService.upsertVariant(productId, body.size, body.stock);
  }

  @Patch('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update variant stock (Admin only)' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateVariantStock(
    @Param('id', ParseIntPipe) variantId: number,
    @Body() body: UpdateVariantStockDto,
  ) {
    return this.productsService.updateVariantStock(variantId, body.stock);
  }

  @Delete('variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete variant (Admin only)' })
  @ApiResponse({ status: 200, description: 'Variant deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteVariant(@Param('id', ParseIntPipe) variantId: number) {
    return this.productsService.deleteVariant(variantId);
  }
}
