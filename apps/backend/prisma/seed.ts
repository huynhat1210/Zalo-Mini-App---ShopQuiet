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
  await prisma.voucher.deleteMany({});
  await prisma.banner.deleteMany({});

  // Seed categories
  const clothing = await prisma.category.create({
    data: { id: 1, name: 'Quần áo', slug: 'clothing' },
  });
  const accessories = await prisma.category.create({
    data: { id: 2, name: 'Phụ kiện', slug: 'accessories' },
  });
  const shoes = await prisma.category.create({
    data: { id: 3, name: 'Giày dép', slug: 'shoes' },
  });
  const home = await prisma.category.create({
    data: { id: 4, name: 'Đồ gia dụng', slug: 'home' },
  });

  // Seed products
  await prisma.product.createMany({
    data: [
      {
        id: 1,
        name: 'Bình hoa Tối giản',
        description: 'Bình hoa bằng gốm thủ công với bề mặt hoàn thiện mờ mịn. Hoàn hảo để cắm hoa đơn hoặc làm vật trưng bày điêu khắc độc lập. Kết cấu tinh tế và các đường nét sạch sẽ mang lại cảm giác yên bình cho mọi không gian.',
        price: 1125000,
        categoryId: home.id,
        tags: 'Mới',
        images: JSON.stringify(['https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Chỉ lau bằng khăn khô mềm, tránh va đập mạnh.',
        shippingReturn: 'Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000 đ.',
      },
      {
        id: 2,
        name: 'Áo sơ mi Linen',
        description: 'Áo sơ mi vải linen hữu cơ mỏng nhẹ chất lượng cao. Sợi dệt thoáng khí, cổ bẻ tiêu chuẩn và tông màu trung tính mềm mại cho trang phục mùa hè vượt thời gian.',
        price: 2225000,
        categoryId: clothing.id,
        tags: 'Bán Chạy',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
        ]),
        soldCount: 152,
        likeCount: 45,
        materialCare: 'Giặt máy chế độ nhẹ hoặc giặt tay, phơi trong bóng râm.',
        shippingReturn: 'Đổi trả miễn phí trong vòng 7 ngày nếu không vừa size.',
      },
      {
        id: 3,
        name: 'Đèn đọc sách Task Lamp',
        description: 'Đèn đọc sách tối giản phong cách công nghiệp với cổ thép điều chỉnh được và đế gỗ tần bì nguyên khối. Ánh sáng ấm áp, tập trung và không gây chói mắt.',
        price: 3000000,
        categoryId: home.id,
        tags: 'Giảm 15%',
        images: JSON.stringify(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Rút phích cắm trước khi lau chùi bằng khăn khô.',
        shippingReturn: 'Bảo hành chính hãng 12 tháng, miễn phí vận chuyển.',
      },
      {
        id: 4,
        name: 'Chậu cây Bê tông',
        description: 'Chậu trồng cây bằng bê tông đúc thủ công có lỗ thoát nước phía dưới. Lý tưởng để trưng bày các loại cây mọng nước, xương rồng nhỏ hoặc thảo mộc trên bàn.',
        price: 700000,
        categoryId: home.id,
        tags: 'Phổ Biến',
        images: JSON.stringify(['https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Rửa sạch bụi bẩn bằng nước nhẹ, để ráo trước khi cho đất.',
        shippingReturn: 'Hỗ trợ đổi trả nếu sản phẩm bị nứt vỡ trong quá trình vận chuyển.',
      },
      {
        id: 5,
        name: 'Túi Tote vải Linen',
        description: 'Túi tote bằng vải linen hữu cơ dày dặn. Cực kỳ bền bỉ với quai đeo dệt chắc chắn và ngăn khóa kéo bên trong tiện lợi cho hoạt động hằng ngày.',
        price: 1625000,
        categoryId: accessories.id,
        tags: 'Thân Thiện',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
        ]),
        materialCare: 'Giặt tay bằng xà phòng trung tính, không sử dụng chất tẩy mạnh.',
        shippingReturn: 'Giao hàng nhanh toàn quốc từ 2-4 ngày làm việc.',
      },
      {
        id: 6,
        name: 'Dép da mang trong nhà',
        description: 'Dép da đi trong nhà cao cấp bằng da thuộc thảo mộc. Đệm lót êm ái và đế da mềm mại ôm khít theo cấu trúc chân của bạn theo thời gian.',
        price: 1875000,
        categoryId: shoes.id,
        tags: 'Giới Hạn',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80',
        ]),
        materialCare: 'Tránh tiếp xúc trực tiếp với nước, lau bằng dung dịch dưỡng da chuyên dụng.',
        shippingReturn: 'Đổi sản phẩm mới nếu có lỗi từ nhà sản xuất trong vòng 3 ngày.',
      },
      {
        id: 7,
        name: 'Áo khoác Trench Coat Cổ điển',
        description: 'Áo khoác dạ dáng dài hai hàng khuy thanh lịch màu be mềm mại. Kiểu dáng vượt thời gian với đai lưng điều chỉnh và lớp lót cao cấp.',
        price: 4625000,
        categoryId: clothing.id,
        tags: 'Cao Cấp',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80'
        ]),
        soldCount: 89,
        likeCount: 120,
        materialCare: 'Khuyến khích giặt khô để giữ phom dáng áo len dạ.',
        shippingReturn: 'Miễn phí vận chuyển hỏa tốc khu vực nội thành.',
      },
      {
        id: 8,
        name: 'Áo len dệt cổ tròn',
        description: 'Áo len dệt cổ tròn dáng rộng ấm áp, thoải mái được làm từ len lông cừu và len alpaca siêu mềm. Bo gấu và cổ tay áo tạo phong cách năng động.',
        price: 2375000,
        categoryId: clothing.id,
        tags: 'Ấm Áp',
        images: JSON.stringify(['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Giặt tay nhẹ nhàng bằng nước ấm, phơi nằm ngang trên lưới.',
        shippingReturn: 'Hỗ trợ đổi size linh hoạt trong 7 ngày trên toàn quốc.',
      },
      {
        id: 9,
        name: 'Quần tây xếp ly Casual',
        description: 'Quần tây ống đứng thời trang với tông màu đất trung tính. Chất liệu linen-cotton thoáng khí, mỏng nhẹ hoàn hảo cho trang phục lịch sự hoặc năng động.',
        price: 1950000,
        categoryId: clothing.id,
        tags: 'Phổ Biến',
        images: JSON.stringify(['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Ủi ở nhiệt độ trung bình, giặt máy chế độ cotton.',
        shippingReturn: 'Hoàn tiền 100% nếu sản phẩm không đúng như mô tả.',
      },
      {
        id: 10,
        name: 'Áo khoác Denim Stonewashed',
        description: 'Áo khoác denim phom cổ điển được làm từ cotton hữu cơ. Đi kèm khuy đồng giả cổ và hai túi trước ngực tiện lợi.',
        price: 2750000,
        categoryId: clothing.id,
        tags: 'Cổ Điển',
        images: JSON.stringify(['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Lộn trái khi giặt máy, giặt chung với quần áo tối màu.',
        shippingReturn: 'Bao phí vận chuyển đổi size nếu có sai sót đơn hàng.',
      },
      {
        id: 11,
        name: 'Váy lụa tơ tằm Mulberry',
        description: 'Váy hai dây thướt tha được làm từ 100% lụa tơ tằm mulberry cao cấp. Thiết kế hai dây mảnh, lưng trần gợi cảm và chất liệu rủ cực kỳ sang trọng.',
        price: 3625000,
        categoryId: clothing.id,
        tags: 'Sang Trọng',
        images: JSON.stringify(['https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Giặt hấp chuyên dụng hoặc giặt tay cực nhẹ bằng dầu gội đầu.',
        shippingReturn: 'Sản phẩm cao cấp được tặng kèm hộp đựng gỗ sang trọng.',
      },
      {
        id: 12,
        name: 'Thắt lưng da khóa đồng',
        description: 'Thắt lưng da bò Ý thuộc thảo mộc nguyên tấm với khóa con lăn bằng đồng chải chắc chắn. Càng dùng càng bóng đẹp theo thời gian.',
        price: 1225000,
        categoryId: accessories.id,
        tags: 'Mới',
        images: JSON.stringify(['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Tránh tiếp xúc môi trường ẩm ướt, thoa xi dưỡng da định kỳ.',
        shippingReturn: 'Đầy đủ phụ kiện đột lỗ dây thắt lưng đi kèm.',
      },
      {
        id: 13,
        name: 'Khăn choàng len Merino',
        description: 'Khăn choàng ấm áp được dệt từ 100% len merino mịn của Úc. Mềm mại khi chạm vào, giữ nhiệt tốt và hoàn thiện với các đường tua rua tinh tế.',
        price: 1450000,
        categoryId: accessories.id,
        tags: 'Đồ Đông',
        images: JSON.stringify(['https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Không vắt xoắn, phơi khô tự nhiên trên mặt phẳng nằm ngang.',
        shippingReturn: 'Thích hợp làm quà tặng ý nghĩa cho người thân.',
      },
      {
        id: 14,
        name: 'Ví đựng thẻ Slim Card Holder',
        description: 'Ví đựng thẻ bằng da tối giản. Chứa tối đa 6 thẻ và tiền mặt gấp gọn. Thiết kế siêu mỏng bỏ túi trước tích hợp công nghệ chống quét trộm RFID.',
        price: 975000,
        categoryId: accessories.id,
        tags: 'Bán Chạy',
        images: JSON.stringify(['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Lau sạch bụi bằng khăn ẩm nhẹ vắt kiệt nước.',
        shippingReturn: 'Bảo hành đường chỉ may 6 tháng sử dụng.',
      },
      {
        id: 15,
        name: 'Mũ lưỡi trai vải Linen',
        description: 'Mũ thể thao 6 múi có thể điều chỉnh bằng vải linen giặt mềm. Đai thấm hút mồ hôi bên trong cho cảm giác mát mẻ trong thời tiết nóng bức.',
        price: 800000,
        categoryId: accessories.id,
        tags: 'Mát Mẻ',
        images: JSON.stringify(['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Nên giặt bằng tay nhẹ nhàng để bảo vệ form lưỡi trai.',
        shippingReturn: 'Mũ freesize có khóa cài chỉnh kích thước ở sau.',
      },
      {
        id: 16,
        name: 'Kính râm gọng Acetate Phân cực',
        description: 'Kính râm gọng chữ D cổ điển được chế tác thủ công từ chất liệu acetate sinh học cao cấp. Tròng kính phân cực màu xanh lá bảo vệ mắt tối đa chống tia UV400.',
        price: 2125000,
        categoryId: accessories.id,
        tags: 'Phổ Biến',
        images: JSON.stringify(['https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Lau tròng kính bằng khăn chuyên dụng, cất vào bao da khi không dùng.',
        shippingReturn: 'Đi kèm hộp kính sang trọng và khăn lau sợi microfiber.',
      },
      {
        id: 17,
        name: 'Giày Sneakers vải Canvas cổ thấp',
        description: 'Giày sneakers cổ thấp bền bỉ làm từ vải canvas cotton hữu cơ. Đế ngoài bằng cao su lưu hóa tự nhiên cho độ bám đường chắc chắn hằng ngày.',
        price: 1700000,
        categoryId: shoes.id,
        tags: 'Thân Thiện',
        images: JSON.stringify(['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Giặt tay phần thân vải, chà đế cao su bằng bàn chải mềm.',
        shippingReturn: 'Hỗ trợ đổi size nếu giày chưa qua sử dụng và còn nguyên tem.',
      },
      {
        id: 18,
        name: 'Giày Chelsea Boots da lộn',
        description: 'Giày Chelsea cổ điển bằng da lộn màu cát sang trọng. Các tấm thun co giãn hai bên hông linh hoạt, quai kéo tiện lợi và đế da xếp lớp chắc chắn.',
        price: 4000000,
        categoryId: shoes.id,
        tags: 'Cao Cấp',
        images: JSON.stringify(['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Xịt dung dịch chống thấm nước cho da lộn, vệ sinh bằng bàn chải chuyên dụng.',
        shippingReturn: 'Tặng kèm lót giày tăng size êm ái.',
      },
      {
        id: 19,
        name: 'Dép quai ngang đế trấu',
        description: 'Dép quai ngang đôi cổ điển bằng da mềm. Đế trấu-latex định hình ôm chân mang lại sự hỗ trợ chỉnh hình cá nhân hóa cho bàn chân.',
        price: 2050000,
        categoryId: shoes.id,
        tags: 'Êm Ái',
        images: JSON.stringify(['https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Hạn chế dầm mưa lâu ngày, phơi khô tự nhiên trong bóng râm.',
        shippingReturn: 'Bảo hành keo đế trấu trong 3 tháng.',
      },
      {
        id: 20,
        name: 'Giày lười Penny Loafers da bê',
        description: 'Giày lười penny loafers thanh lịch bằng da bê màu đen bóng. Chi tiết khâu tay thủ công tỉ mỉ, lót da và gót cao su bền bỉ.',
        price: 3500000,
        categoryId: shoes.id,
        tags: 'Lịch Sự',
        images: JSON.stringify(['https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Đánh xi dưỡng đen chuyên dụng bảo vệ độ bóng loáng của da bê.',
        shippingReturn: 'Tặng kèm dụng cụ đón gót giày bằng gỗ.',
      },
      {
        id: 21,
        name: 'Giày chạy bộ lưới tái chế',
        description: 'Giày sneakers chạy bộ hiệu suất cao làm từ lưới nhựa tái chế đại dương. Lớp đệm bọt sinh học phản hồi tốt hỗ trợ mỗi bước chạy.',
        price: 2875000,
        categoryId: shoes.id,
        tags: 'Thể Thao',
        images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Tháo miếng lót giặt riêng, giặt thân giày bằng nước lạnh nhẹ.',
        shippingReturn: 'Đổi trả miễn phí 30 ngày cho các sản phẩm chưa dùng.',
      },
      {
        id: 22,
        name: 'Nến thơm oải hương gỗ đàn hương',
        description: 'Nến sáp đậu nành tự nhiên làm dịu tinh thần kết hợp hoa oải hương và tinh dầu gỗ đàn hương ấm áp. Thời gian cháy sạch lên đến 40 giờ.',
        price: 600000,
        categoryId: home.id,
        tags: 'Mới',
        images: JSON.stringify(['https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Cắt ngắn bấc nến còn khoảng 0.5cm trước mỗi lần đốt.',
        shippingReturn: 'Tặng kèm nắp đậy gỗ giữ mùi hương bền lâu.',
      },
      {
        id: 23,
        name: 'Bộ vỏ chăn ga vải Linen',
        description: 'Bộ vỏ chăn ga và vỏ gối cao cấp làm từ vải linen Pháp giặt mềm. Giữ mát vào mùa hè và ấm áp vào mùa đông.',
        price: 5250000,
        categoryId: home.id,
        tags: 'Sang Trọng',
        images: JSON.stringify(['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Giặt máy bằng nước lạnh với bột giặt dịu nhẹ, sấy ở nhiệt độ thấp.',
        shippingReturn: 'Hộp đựng bọc giấy bảo vệ môi trường cao cấp.',
      },
      {
        id: 24,
        name: 'Thớt gỗ óc chó thủ công',
        description: 'Thớt thái và bày đồ ăn đa năng tuyệt đẹp được khắc từ gỗ óc chó đen nguyên khối của Mỹ. Đã được xử lý sẵn bằng dầu khoáng thực phẩm.',
        price: 1300000,
        categoryId: home.id,
        tags: 'Thủ Công',
        images: JSON.stringify(['https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Rửa sạch ngay sau khi sử dụng, lau khô hoàn toàn và bảo quản nơi thoáng mát.',
        shippingReturn: 'Nhận hàng kiểm tra ưng ý mới thanh toán.',
      },
      {
        id: 25,
        name: 'Đồng hồ treo tường gỗ Silent',
        description: 'Đồng hồ treo tường bằng gỗ chạy êm ái được chế tác từ gỗ sồi tự nhiên nguyên khối. Mặt số tối giản thanh lịch với chuyển động quét không tiếng ồn.',
        price: 1625000,
        categoryId: home.id,
        tags: 'Tối Giản',
        images: JSON.stringify(['https://images.unsplash.com/photo-1617043786394-f977fa12eddf?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Thay pin định kỳ mỗi 6 tháng để bảo vệ động cơ chạy giờ chính xác.',
        shippingReturn: 'Đã bao gồm pin AA cao cấp chính hãng đi kèm.',
      },
      {
        id: 26,
        name: 'Khăn tắm dệt tổ ong',
        description: 'Khăn tắm kích thước lớn với kiểu dệt tổ ong thoáng khí. Làm từ cotton Thổ Nhĩ Kỳ hữu cơ giúp khô nhanh và tẩy tế bào chết nhẹ nhàng.',
        price: 875000,
        categoryId: home.id,
        tags: 'Phổ Biến',
        images: JSON.stringify(['https://images.unsplash.com/photo-1616627547584-bf28cee262db?auto=format&fit=crop&w=600&q=80']),
        materialCare: 'Giặt máy nước ấm chung với các loại khăn vải dệt sợi tự nhiên.',
        shippingReturn: 'Đổi trả miễn phí trong vòng 7 ngày nếu không ưng ý.',
      },
    ],
  });

  // Seed 30 additional products programmatically
  const PRODUCT_TEMPLATES = [
    { name: 'Áo thun Classic', categoryId: 1, basePrice: 500000 },
    { name: 'Quần Jean Denim', categoryId: 1, basePrice: 1250000 },
    { name: 'Thắt lưng da', categoryId: 2, basePrice: 625000 },
    { name: 'Giày thể thao chạy bộ', categoryId: 3, basePrice: 2000000 },
    { name: 'Cốc sứ cao cấp', categoryId: 4, basePrice: 375000 },
    { name: 'Áo Hoodie Cotton', categoryId: 1, basePrice: 1000000 },
    { name: 'Kính râm thời trang', categoryId: 2, basePrice: 750000 },
    { name: 'Giày tây Oxford', categoryId: 3, basePrice: 3000000 },
    { name: 'Gối tựa lưng', categoryId: 4, basePrice: 550000 },
    { name: 'Váy đầm mùa hè', categoryId: 1, basePrice: 1125000 },
  ];

  const IMAGES = [
    '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80"]',
    '["https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=600&q=80"]',
    '["https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80"]',
    '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"]',
    '["https://images.unsplash.com/photo-1610824352934-c10d87b700cc?auto=format&fit=crop&w=600&q=80", "https://images.unsplash.com/photo-1610824352934-c10d87b700cc?auto=format&fit=crop&w=600&q=80"]',
  ];

  const additionalProductsData = [];
  for (let i = 1; i <= 30; i++) {
    const template = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    const categoryId = template.categoryId;
    const name = `${template.name} - Bản ${i}`;
    const price = template.basePrice + Math.floor(Math.random() * 20) * 20000;
    const image = IMAGES[i % IMAGES.length];

    additionalProductsData.push({
      id: 26 + i,
      name,
      description: `Đây là sản phẩm ${template.name.toLowerCase()} chất lượng cao cho nhu cầu sử dụng hằng ngày. Được chế tác đặc biệt mang lại sự thoải mái và độ bền tối đa.`,
      price,
      categoryId,
      tags: i % 3 === 0 ? 'Mới' : 'Phổ biến',
      images: image,
      soldCount: Math.floor(Math.random() * 500),
      likeCount: Math.floor(Math.random() * 200),
      materialCare: 'Giặt máy bằng nước lạnh, sấy ở nhiệt độ thấp.',
      shippingReturn: 'Miễn phí vận chuyển cho đơn hàng từ 1.000.000 đ.',
    });
  }
  await prisma.product.createMany({
    data: additionalProductsData,
  });

  // Seed Product Variants (Size & Color & Stock)
  const allProducts = await prisma.product.findMany();
  for (const p of allProducts) {
    if (p.categoryId === clothing.id) {
      const colors = [
        { color: 'Trắng', colorImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=150&q=80' },
        { color: 'Đen', colorImage: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=150&q=80' }
      ];
      const sizes = ['S', 'M', 'L', 'XL'];
      const variants = [];
      for (const c of colors) {
        for (const s of sizes) {
          variants.push({
            productId: p.id,
            color: c.color,
            colorImage: c.colorImage,
            size: s,
            stock: Math.floor(Math.random() * 20)
          });
        }
      }
      await prisma.productVariant.createMany({ data: variants });
    } else if (p.categoryId === shoes.id) {
      const colors = [
        { color: 'Đen', colorImage: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=150&q=80' },
        { color: 'Nâu', colorImage: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=150&q=80' }
      ];
      const sizes = ['39', '40', '41', '42'];
      const variants = [];
      for (const c of colors) {
        for (const s of sizes) {
          variants.push({
            productId: p.id,
            color: c.color,
            colorImage: c.colorImage,
            size: s,
            stock: Math.floor(Math.random() * 15)
          });
        }
      }
      await prisma.productVariant.createMany({ data: variants });
    } else {
      await prisma.productVariant.createMany({
        data: [
          { productId: p.id, size: 'DEFAULT', color: 'DEFAULT', stock: 30 },
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
      { zaloUserId: 'user-1', label: 'Nhà riêng', phone: '0987654321', street: '123 Đường Yên Bình', city: 'Thành phố Hà Nội', isDefault: true },
      { zaloUserId: 'user-1', label: 'Văn phòng', phone: '0912345678', street: '456 Phố Tài Chính', city: 'Quận 1, TP. Hồ Chí Minh', isDefault: false },
      { zaloUserId: 'user-2', label: 'Nhà riêng', phone: '0933344555', street: '789 Đại lộ Hòa Bình', city: 'Thành phố Đà Nẵng', isDefault: true },
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

  // Seed vouchers
  await prisma.voucher.createMany({
    data: [
      { code: 'WELCOME10', type: 'FIXED', value: 250000, minOrderVal: 1250000, expiresAt: null, stock: 999 },
      { code: 'WELCOME50', type: 'FIXED', value: 1250000, minOrderVal: 2500000, expiresAt: null, stock: 999 },
      { code: 'SUMMER26', type: 'PERCENT', value: 15, minOrderVal: 0, expiresAt: null, stock: 999 },
      { code: 'FREESHIP', type: 'FREESHIP', value: 125000, minOrderVal: 1250000, expiresAt: null, stock: 999 },
    ],
  });

  // Seed banners
  await prisma.banner.createMany({
    data: [
      {
        id: 1,
        imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
        tag: 'Mùa hè 2026',
        title: 'BST Linen Thoáng Mát',
        description: 'Chất liệu linen hữu cơ tự nhiên mỏng nhẹ cho những ngày nắng gió.',
        cta: 'Xem ngay',
        link: 'clothing',
        active: true,
      },
      {
        id: 2,
        imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
        tag: 'Không gian sống',
        title: 'Đồ Gốm Thủ Công',
        description: 'Mang sự mộc mạc và tĩnh lặng vào ngôi nhà thân yêu của bạn.',
        cta: 'Khám phá',
        link: 'home',
        active: true,
      },
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
        content: 'Giao hàng thành công: Đơn hàng gồm Bình hoa Tối giản đã được giao tới Khánh Linh.',
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
        content: 'Chào mừng bạn đến với ShopQuiet. Tặng bạn mã miễn phí vận chuyển cho đơn hàng đầu tiên từ 1.000.000 đ.',
        date: '09:00 - 01/07/2026',
        read: true,
      },
    ],
  });

  // Seed some mock orders for history
  const order1 = await prisma.order.create({
    data: {
      id: 'SQ-82955',
      totalAmount: 1462500,
      status: 'SHIPPED',
      createdAt: new Date('2026-07-06T09:15:00Z'),
      zaloUserId: 'user-1',
      paymentMethod: 'COD',
      voucherCode: 'WELCOME10',
      discountAmount: 162500,
      shippingAddress: '123 Đường Yên Bình, Thành phố Hà Nội',
      shippingPhone: '0987654321',
      shippingName: 'Khánh Linh',
    },
  });

  await prisma.orderItem.create({
    data: {
      quantity: 1,
      price: 1625000,
      productId: 5, // Túi Tote vải Linen
      size: 'DEFAULT',
      color: 'DEFAULT',
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
