import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CLOTHING_CHART = JSON.stringify([
  { size: "XS", height: "< 155", weight: "< 45", bust: "80-84", waist: "62-66" },
  { size: "S",  height: "155-160", weight: "45-53", bust: "84-88", waist: "66-70" },
  { size: "M",  height: "160-168", weight: "53-62", bust: "88-92", waist: "70-74" },
  { size: "L",  height: "168-175", weight: "62-72", bust: "92-96", waist: "74-80" },
  { size: "XL", height: "175-180", weight: "72-82", bust: "96-100", waist: "80-86" },
  { size: "XXL",height: "> 180",  weight: "> 82",  bust: "100-108", waist: "86-94" }
]);

const DEFAULT_SHOES_CHART = JSON.stringify([
  { size: "35", footLength: "21.5-22.0", euSize: "35" },
  { size: "36", footLength: "22.0-22.5", euSize: "36" },
  { size: "37", footLength: "22.5-23.0", euSize: "37" },
  { size: "38", footLength: "23.5-24.0", euSize: "38" },
  { size: "39", footLength: "24.0-24.5", euSize: "39" },
  { size: "40", footLength: "25.0-25.5", euSize: "40" },
  { size: "41", footLength: "25.5-26.0", euSize: "41" },
  { size: "42", footLength: "26.5-27.0", euSize: "42" },
  { size: "43", footLength: "27.0-27.5", euSize: "43" },
  { size: "44", footLength: "28.0-28.5", euSize: "44" }
]);

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true }
  });

  let updatedCount = 0;
  for (const product of products) {
    const catName = (product.category?.name || "").toLowerCase();
    const isShoes = ["giày", "dép", "shoes", "sandal"].some(k => catName.includes(k));
    const isClothing = ["áo", "quần", "váy", "đầm", "jacket", "khoác", "len", "sơ mi", "thun", "clothing", "thời trang"].some(k => catName.includes(k));

    if (!product.sizeChart) {
      if (isShoes) {
        await prisma.product.update({
          where: { id: product.id },
          data: { sizeChart: DEFAULT_SHOES_CHART }
        });
        updatedCount++;
        console.log(`[DB Seed] Updated shoes sizeChart for product #${product.id}: ${product.name}`);
      } else if (isClothing) {
        await prisma.product.update({
          where: { id: product.id },
          data: { sizeChart: DEFAULT_CLOTHING_CHART }
        });
        updatedCount++;
        console.log(`[DB Seed] Updated clothing sizeChart for product #${product.id}: ${product.name}`);
      }
    }
  }

  console.log(`Successfully populated sizeChart for ${updatedCount} products in database.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
