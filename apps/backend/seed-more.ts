import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCT_TEMPLATES = [
  { name: 'Classic T-Shirt', categoryId: 1, basePrice: 20 },
  { name: 'Denim Jeans', categoryId: 1, basePrice: 50 },
  { name: 'Leather Belt', categoryId: 2, basePrice: 25 },
  { name: 'Running Sneakers', categoryId: 3, basePrice: 80 },
  { name: 'Ceramic Mug', categoryId: 4, basePrice: 15 },
  { name: 'Cotton Hoodie', categoryId: 1, basePrice: 40 },
  { name: 'Sunglasses', categoryId: 2, basePrice: 30 },
  { name: 'Formal Oxford Shoes', categoryId: 3, basePrice: 120 },
  { name: 'Throw Pillow', categoryId: 4, basePrice: 22 },
  { name: 'Summer Dress', categoryId: 1, basePrice: 45 },
];

const SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['39', '40', '41', '42'];
const IMAGES = [
  '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80"]',
  '["https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=300&q=80"]',
  '["https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=300&q=80"]',
  '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80"]',
  '["https://images.unsplash.com/photo-1610824352934-c10d87b700cc?auto=format&fit=crop&w=300&q=80"]',
];

async function main() {
  console.log('Resetting postgres sequences for Product and ProductVariant...');
  await prisma.$executeRawUnsafe(`SELECT setval('"Product_id_seq"', (SELECT MAX(id) FROM "Product"));`);
  await prisma.$executeRawUnsafe(`SELECT setval('"ProductVariant_id_seq"', (SELECT MAX(id) FROM "ProductVariant"));`);
  
  console.log('Seeding 30 additional products...');
  for (let i = 1; i <= 30; i++) {
    const template = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    const categoryId = template.categoryId;
    const name = `${template.name} - Version ${i}`;
    const price = template.basePrice + Math.floor(Math.random() * 20);
    const image = IMAGES[i % IMAGES.length];

    const product = await prisma.product.create({
      data: {
        name,
        description: `This is a high quality ${template.name.toLowerCase()} for everyday use. Specially crafted for comfort and durability.`,
        price,
        categoryId,
        tags: i % 3 === 0 ? 'New' : 'Popular',
        images: image,
        materialCare: 'Machine wash cold, tumble dry low.',
        shippingReturn: 'Free shipping on orders over $50.',
      },
    });

    // Create variants
    const sizes = categoryId === 1 ? SIZES : categoryId === 3 ? SHOE_SIZES : ['DEFAULT'];
    
    for (const size of sizes) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          size,
          stock: Math.floor(Math.random() * 50) + 10,
        },
      });
    }
  }

  console.log('Successfully seeded 30 products.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
