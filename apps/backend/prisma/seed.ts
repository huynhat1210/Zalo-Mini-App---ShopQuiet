import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.notification.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.userAddress.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  // Seed categories
  const clothing = await prisma.category.create({
    data: { id: 1, name: 'Clothing', slug: 'clothing' },
  });
  const accessories = await prisma.category.create({
    data: { id: 2, name: 'Accessories', slug: 'accessories' },
  });
  const shoes = await prisma.category.create({
    data: { id: 3, name: 'Shoes', slug: 'shoes' },
  });
  const home = await prisma.category.create({
    data: { id: 4, name: 'Home', slug: 'home' },
  });

  // Seed products
  await prisma.product.createMany({
    data: [
      {
        id: 1,
        name: 'Minimalist Vase',
        description: 'Hand-crafted ceramic vase with a matte finish. Perfect for single stems or as a standalone sculptural piece. Its subtle texture and clean lines bring a sense of calm to any space.',
        price: 45.00,
        categoryId: home.id,
        tags: 'New',
        images: JSON.stringify(['https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 2,
        name: 'Linen Shirt',
        description: 'Premium quality lightweight organic linen shirt. Breathable weave, standard collar, and soft neutral tones for timeless summer wear.',
        price: 89.00,
        categoryId: clothing.id,
        tags: 'Best Seller',
        images: JSON.stringify(['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 3,
        name: 'Task Lamp',
        description: 'Industrial minimalist task lamp with an adjustable solid steel neck and solid ash wood base. Casts a warm, glare-free, focused reading glow.',
        price: 120.00,
        categoryId: home.id,
        tags: '15% Off',
        images: JSON.stringify(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 4,
        name: 'Concrete Planter',
        description: 'Hand-poured textured concrete planter with bottom drainage. Ideal for showcasing succulents, small cacti, or herbs on tables.',
        price: 28.00,
        categoryId: home.id,
        tags: 'Popular',
        images: JSON.stringify(['https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 5,
        name: 'Artisanal Linen Tote',
        description: 'Heavyweight organic flax linen tote bag. Extremely durable with thick woven straps and internal zipper pocket for modern everyday runs.',
        price: 65.00,
        categoryId: accessories.id,
        tags: 'Eco-Friendly',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
        ]),
      },
      {
        id: 6,
        name: 'Leather Slippers',
        description: 'Premium vegetable-tanned leather slip-on home shoes. Cushioned footbed and flexible leather sole that conforms to your foot structure over time.',
        price: 75.0,
        categoryId: shoes.id,
        tags: 'Limited',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80',
        ]),
      },
      {
        id: 7,
        name: 'Classic Trench Coat',
        description: 'Elegant double-breasted wool-blend trench coat in soft beige. Timeless silhouette with adjustable waist belt and premium lining.',
        price: 185.00,
        categoryId: clothing.id,
        tags: 'Premium',
        images: JSON.stringify(['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 8,
        name: 'Knit Crewneck Sweater',
        description: 'Warm, cozy oversized crewneck knit sweater made from ultra-soft wool and alpaca blend. Ribbed hem and cuffs for casual styling.',
        price: 95.00,
        categoryId: clothing.id,
        tags: 'Cozy',
        images: JSON.stringify(['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 9,
        name: 'Pleated Casual Trousers',
        description: 'Straight-leg tailored trousers in dynamic earth tones. Lightweight breathable linen-cotton blend perfect for formal or smart casual wear.',
        price: 78.00,
        categoryId: clothing.id,
        tags: 'Popular',
        images: JSON.stringify(['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 10,
        name: 'Stonewashed Denim Jacket',
        description: 'Classic fit denim jacket crafted from organic ring-spun cotton. Features antique brass button hardware and dual breast pockets.',
        price: 110.00,
        categoryId: clothing.id,
        tags: 'Classic',
        images: JSON.stringify(['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 11,
        name: 'Mulberry Silk Slip Dress',
        description: 'Flowing slip dress made from 100% pure premium mulberry silk. Spaghetti straps, low scoop back, and a gorgeous drape finish.',
        price: 145.00,
        categoryId: clothing.id,
        tags: 'Luxury',
        images: JSON.stringify(['https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 12,
        name: 'Brass Buckle Leather Belt',
        description: 'Full-grain vegetable-tanned Italian leather belt with a solid brushed brass roller buckle. Built to age beautifully.',
        price: 49.00,
        categoryId: accessories.id,
        tags: 'New',
        images: JSON.stringify(['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 13,
        name: 'Merino Wool Scarf',
        description: 'Cozy scarf knitted from 100% fine Australian merino wool. Soft to the touch, warm, and finished with delicate fringe edges.',
        price: 58.00,
        categoryId: accessories.id,
        tags: 'Winter Wear',
        images: JSON.stringify(['https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 14,
        name: 'Slim Card Holder Wallet',
        description: 'Minimalist leather card wallet. Accommodates up to 6 cards and folded cash. Slim front-pocket design with RFID blocking technology.',
        price: 39.00,
        categoryId: accessories.id,
        tags: 'Best Seller',
        images: JSON.stringify(['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 15,
        name: 'Breathable Flax Linen Cap',
        description: 'Adjustable 6-panel sports cap in pre-washed flax linen. Moisture-wicking inner band for breezy hot weather protection.',
        price: 32.00,
        categoryId: accessories.id,
        tags: 'Hot Weather',
        images: JSON.stringify(['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 16,
        name: 'Acetate Polarized Sunglasses',
        description: 'Classic D-frame sunglasses handcrafted from premium biological acetate. Polarized green-tint lenses offering complete UV400 safety.',
        price: 85.00,
        categoryId: accessories.id,
        tags: 'Popular',
        images: JSON.stringify(['https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 17,
        name: 'Low-Top Canvas Sneakers',
        description: 'Durable low-profile sneakers crafted from organic cotton canvas. Features a natural vulcanized rubber outsole for robust daily traction.',
        price: 68.00,
        categoryId: shoes.id,
        tags: 'Eco-Friendly',
        images: JSON.stringify(['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 18,
        name: 'Sand Suede Chelsea Boots',
        description: 'Timeless Chelsea boots in rich sand suede. Flexible elasticated side panels, pull tabs, and robust leather stacked soles.',
        price: 160.00,
        categoryId: shoes.id,
        tags: 'Premium',
        images: JSON.stringify(['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 19,
        name: 'Cork Footbed Sandals',
        description: 'Classic double-strap sandals in supple leather. Contoured cork-latex footbed provides personalized orthopedic arch support.',
        price: 82.00,
        categoryId: shoes.id,
        tags: 'Comfort',
        images: JSON.stringify(['https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 20,
        name: 'Calfskin Penny Loafers',
        description: 'Elegant slip-on penny loafers in polished black calfskin. Hand-stitched detailing, leather lining, and durable rubber heels.',
        price: 140.00,
        categoryId: shoes.id,
        tags: 'Formal',
        images: JSON.stringify(['https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 21,
        name: 'Recycled Mesh Trainers',
        description: 'High-performance running sneakers made from ocean-bound recycled plastic mesh. Responsive bio-foam cushions every stride.',
        price: 115.00,
        categoryId: shoes.id,
        tags: 'Sport',
        images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 22,
        name: 'Lavender Sandalwood Candle',
        description: 'Soothing natural soy wax candle infused with lavender bud and warm sandalwood essential oils. 40-hour clean burn time.',
        price: 24.00,
        categoryId: home.id,
        tags: 'New',
        images: JSON.stringify(['https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 23,
        name: 'Flax Linen Duvet Set',
        description: 'Luxurious pre-washed duvet cover and pillowcase set made from French flax linen. Keeps cool in summer and cozy in winter.',
        price: 210.00,
        categoryId: home.id,
        tags: 'Luxury',
        images: JSON.stringify(['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 24,
        name: 'Hand-Carved Walnut Board',
        description: 'Beautiful multi-use serving and cutting board carved from solid American black walnut. Pre-oiled with food-grade mineral oil.',
        price: 52.00,
        categoryId: home.id,
        tags: 'Artisanal',
        images: JSON.stringify(['https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 25,
        name: 'Silent Wooden Wall Clock',
        description: 'Silent wooden wall clock crafted from solid natural oak. Elegant minimalist dial with quiet sweep movement, adding functional beauty to your space.',
        price: 65.00,
        categoryId: home.id,
        tags: 'Minimalist',
        images: JSON.stringify(['https://images.unsplash.com/photo-1617043786394-f977fa12eddf?auto=format&fit=crop&w=600&q=80']),
      },
      {
        id: 26,
        name: 'Waffle Knit Bath Towel',
        description: 'Generously sized bath towel in a waffle knit weave. Made from organic Turkish cotton for rapid drying and gentle exfoliation.',
        price: 35.00,
        categoryId: home.id,
        tags: 'Popular',
        images: JSON.stringify(['https://images.unsplash.com/photo-1616627547584-bf28cee262db?auto=format&fit=crop&w=600&q=80']),
      },
    ],
  });

  // Seed 30 additional products from seed-more.ts
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

  const IMAGES = [
    '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80"]',
    '["https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=300&q=80"]',
    '["https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=300&q=80"]',
    '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80"]',
    '["https://images.unsplash.com/photo-1610824352934-c10d87b700cc?auto=format&fit=crop&w=300&q=80"]',
  ];

  const additionalProductsData = [];
  for (let i = 1; i <= 30; i++) {
    const template = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    const categoryId = template.categoryId;
    const name = `${template.name} - Version ${i}`;
    const price = template.basePrice + Math.floor(Math.random() * 20);
    const image = IMAGES[i % IMAGES.length];

    additionalProductsData.push({
      id: 26 + i,
      name,
      description: `This is a high quality ${template.name.toLowerCase()} for everyday use. Specially crafted for comfort and durability.`,
      price,
      categoryId,
      tags: i % 3 === 0 ? 'New' : 'Popular',
      images: image,
      materialCare: 'Machine wash cold, tumble dry low.',
      shippingReturn: 'Free shipping on orders over $50.',
    });
  }
  await prisma.product.createMany({
    data: additionalProductsData,
  });

  // Seed Product Variants (Size & Stock)
  const allProducts = await prisma.product.findMany();
  for (const p of allProducts) {
    if (p.categoryId === clothing.id) {
      await prisma.productVariant.createMany({
        data: [
          { productId: p.id, size: 'S', stock: 15 },
          { productId: p.id, size: 'M', stock: 20 },
          { productId: p.id, size: 'L', stock: 10 },
          { productId: p.id, size: 'XL', stock: 5 },
        ],
      });
    } else if (p.categoryId === shoes.id) {
      await prisma.productVariant.createMany({
        data: [
          { productId: p.id, size: '39', stock: 12 },
          { productId: p.id, size: '40', stock: 18 },
          { productId: p.id, size: '41', stock: 15 },
          { productId: p.id, size: '42', stock: 8 },
        ],
      });
    } else {
      await prisma.productVariant.createMany({
        data: [
          { productId: p.id, size: 'DEFAULT', stock: 30 },
        ],
      });
    }
  }

  // Seed Users for comments
  const user1 = await prisma.user.create({
    data: { zaloId: 'user-1', name: 'Khánh Linh', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  });
  const user2 = await prisma.user.create({
    data: { zaloId: 'user-2', name: 'Minh Quân', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  });
  const user3 = await prisma.user.create({
    data: { zaloId: 'user-3', name: 'Lan Anh', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80' },
  });

  // Seed User Addresses
  await prisma.userAddress.createMany({
    data: [
      { zaloUserId: 'user-1', label: 'Nhà riêng', phone: '0987654321', street: '123 Serenity Lane', city: 'Calm City, ST 12345', isDefault: true },
      { zaloUserId: 'user-1', label: 'Văn phòng', phone: '0912345678', street: '456 Business Road', city: 'Metropolis, NY 10001', isDefault: false },
      { zaloUserId: 'user-2', label: 'Nhà riêng', phone: '0933344555', street: '789 Peaceful Avenue', city: 'Serenity Hills', isDefault: true },
    ],
  });

  // Seed Comments
  await prisma.comment.createMany({
    data: [
      { productId: 2, zaloUserId: user1.zaloId, content: 'Áo mặc cực kỳ mát, vải linen xịn sò, form chuẩn!', rating: 5 },
      { productId: 2, zaloUserId: user2.zaloId, content: 'Áo đẹp nhưng hơi dễ nhăn, giặt xong phải là ủi cẩn thận.', rating: 4 },
      { productId: 6, zaloUserId: user2.zaloId, content: 'Dép đi êm chân, da thật sờ rất sướng tay. Đáng đồng tiền!', rating: 5 },
      { productId: 6, zaloUserId: user3.zaloId, content: 'Giao hàng nhanh, đóng gói đẹp mắt. Dép đi ôm chân.', rating: 5 },
    ],
  });

  // Seed notifications
  await prisma.notification.createMany({
    data: [
      {
        id: 1,
        zaloUserId: 'user-1',
        type: 'order',
        title: 'Đơn hàng #SQ-82934 giao thành công',
        content: 'Giao hàng thành công: Đơn hàng gồm Minimalist Ceramic Mug đã được giao tới Khánh Linh.',
        date: '10:30 - 06/07/2026',
        read: false,
      },
      {
        id: 2,
        zaloUserId: null,
        type: 'promo',
        title: 'Chào hè rực rỡ - Nhập mã SUMMER26 giảm 15%',
        content: 'Nhập mã SUMMER26 để được giảm thêm 15% cho toàn bộ sưu tập Linen mùa hè này. Hạn dùng đến 15/07.',
        date: '08:00 - 05/07/2026',
        read: false,
      },
      {
        id: 3,
        zaloUserId: 'user-1',
        type: 'order',
        title: 'Đơn hàng #SQ-82941 đã được gửi đi',
        content: 'Đơn hàng của bạn đã bàn giao cho đơn vị vận chuyển và đang trên đường giao tới bạn.',
        date: '14:22 - 04/07/2026',
        read: true,
      },
      {
        id: 4,
        zaloUserId: null,
        type: 'promo',
        title: 'Ưu đãi thành viên mới - Miễn phí vận chuyển',
        content: 'Chào mừng bạn đến với ShopQuiet. Tặng bạn mã miễn phí vận chuyển cho đơn hàng đầu tiên từ $50.',
        date: '09:00 - 01/07/2026',
        read: true,
      },
    ],
  });

  // Seed some mock orders for history
  const order1 = await prisma.order.create({
    data: {
      id: 'SQ-82955',
      totalAmount: 58.50,
      status: 'SHIPPED',
      createdAt: new Date('2026-07-06T09:15:00Z'),
      zaloUserId: 'user-1',
      paymentMethod: 'COD',
      voucherCode: 'WELCOME10',
      discountAmount: 6.50,
      shippingAddress: '123 Serenity Lane, Calm City, ST 12345',
      shippingPhone: '0987654321',
      shippingName: 'Khánh Linh',
    },
  });

  await prisma.orderItem.create({
    data: {
      quantity: 1,
      price: 65.00,
      productId: 5, // Artisanal Linen Tote
      size: 'DEFAULT',
      orderId: order1.id,
    },
  });

  // Reset postgres sequences for Product, Category, and ProductVariant if using PostgreSQL
  try {
    console.log('Resetting postgres sequences...');
    await prisma.$executeRawUnsafe(`SELECT setval('"Product_id_seq"', (SELECT MAX(id) FROM "Product"));`);
    await prisma.$executeRawUnsafe(`SELECT setval('"ProductVariant_id_seq"', (SELECT MAX(id) FROM "ProductVariant"));`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Category_id_seq"', (SELECT MAX(id) FROM "Category"));`);
  } catch (err) {
    console.log('Skip sequence reset (not using PostgreSQL or sequences do not exist yet).');
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
