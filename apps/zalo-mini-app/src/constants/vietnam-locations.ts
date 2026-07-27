// Vietnam Administrative Divisions Dataset (Provinces, Districts, Wards)

export interface IWard {
  name: string;
}

export interface IDistrict {
  name: string;
  wards: string[];
}

export interface IProvince {
  name: string;
  districts: IDistrict[];
}

export const VIETNAM_PROVINCES: IProvince[] = [
  {
    name: "TP. Hồ Chí Minh",
    districts: [
      { name: "Quận 1", wards: ["Phường Bến Nghé", "Phường Bến Thành", "Phường Phạm Ngũ Lão", "Phường Tân Định", "Phường Đa Kao", "Phường Nguyễn Thái Bình"] },
      { name: "Quận 3", wards: ["Phường Võ Thị Sáu", "Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 9", "Phường 14"] },
      { name: "Quận 4", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 6", "Phường 8", "Phường 9", "Phường 10", "Phường 13", "Phường 15"] },
      { name: "Quận 5", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10"] },
      { name: "Quận 7", wards: ["Phường Tân Thuận Đông", "Phường Tân Thuận Tây", "Phường Tân Kiểng", "Phường Tân Phong", "Phường Phú Mỹ", "Phường Phú Thuận"] },
      { name: "Quận 10", wards: ["Phường 1", "Phường 2", "Phường 4", "Phường 9", "Phường 10", "Phường 12", "Phường 13", "Phường 15"] },
      { name: "TP. Thủ Đức", wards: ["Phường Thảo Điền", "Phường An Phú", "Phường Bình An", "Phường Thủ Thiêm", "Phường Linh Trung", "Phường Linh Xuân", "Phường Phước Long A", "Phường Phước Long B", "Phường Tăng Nhơn Phú A", "Phường Hiệp Phú"] },
      { name: "Quận Bình Thạnh", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 12", "Phường 14", "Phường 15", "Phường 17", "Phường 25", "Phường 26"] },
      { name: "Quận Tân Bình", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 12", "Phường 13", "Phường 15"] },
      { name: "Quận Gò Vấp", wards: ["Phường 1", "Phường 3", "Phường 5", "Phường 7", "Phường 8", "Phường 10", "Phường 11", "Phường 12", "Phường 15"] },
      { name: "Quận Phú Nhuận", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 5", "Phường 7", "Phường 8", "Phường 9", "Phường 15"] },
      { name: "Quận Bình Tân", wards: ["Phường An Lạc", "Phường An Lạc A", "Phường Bình Hưng Hòa", "Phường Bình Trị Đông", "Phường Tân Tạo"] },
      { name: "Huyện Củ Chi", wards: ["Thị trấn Củ Chi", "Xã An Nhơn Tây", "Xã Bình Mỹ", "Xã Nhuận Đức", "Xã Tân Thạnh Đông", "Xã Tân Thông Hội"] },
      { name: "Huyện Hóc Môn", wards: ["Thị trấn Hóc Môn", "Xã Bà Điểm", "Xã Đông Thạnh", "Xã Tân Hiệp", "Xã Thới Tam Thôn", "Xã Xuân Thới Sơn"] },
      { name: "Huyện Bình Chánh", wards: ["Thị trấn Tân Túc", "Xã An Phú Tây", "Xã Bình Hưng", "Xã Phong Phú", "Xã Vĩnh Lộc A", "Xã Vĩnh Lộc B"] },
      { name: "Huyện Nhà Bè", wards: ["Thị trấn Nhà Bè", "Xã Hiệp Phước", "Xã Phước Kiển", "Xã Phước Lộc", "Xã Phú Xuân"] },
    ]
  },
  {
    name: "Hà Nội",
    districts: [
      { name: "Quận Hoàn Kiếm", wards: ["Phường Hàng Bạc", "Phường Hàng Bồ", "Phường Hàng Đào", "Phường Hàng Gai", "Phường Tràng Tiền", "Phường Cửa Nam"] },
      { name: "Quận Ba Đình", wards: ["Phường Điện Biên", "Phường Đội Cấn", "Phường Kim Mã", "Phường Liễu Giai", "Phường Quán Thánh", "Phường Trúc Bạch"] },
      { name: "Quận Đống Đa", wards: ["Phường Cát Linh", "Phường Hàng Bột", "Phường Láng Hạ", "Phường Ô Chợ Dừa", "Phường Văn Miếu", "Phường Trung Liệt"] },
      { name: "Quận Cầu Giấy", wards: ["Phường Dịch Vọng", "Phường Dịch Vọng Hậu", "Phường Mai Dịch", "Phường Nghĩa Đô", "Phường Trung Hòa", "Phường Yên Hòa"] },
      { name: "Quận Hai Bà Trưng", wards: ["Phường Bạch Đằng", "Phường Bách Khoa", "Phường Đồng Tâm", "Phường Lê Đại Hành", "Phường Minh Khai", "Phường Trương Định"] },
      { name: "Quận Hoàng Mai", wards: ["Phường Định Công", "Phường Giáp Bát", "Phường Hoàng Liệt", "Phường Linh Nam", "Phường Tân Mai", "Phường Yên Sở"] },
      { name: "Quận Tây Hồ", wards: ["Phường Bưởi", "Phường Nhật Tân", "Phường Phú Thượng", "Phường Quảng An", "Phường Thụy Khuê", "Phường Yên Phụ"] },
      { name: "Quận Thanh Xuân", wards: ["Phường Hạ Đình", "Phường Khương Trung", "Phường Nhân Chính", "Phường Phương Liệt", "Phường Thanh Xuân Bắc"] },
      { name: "Quận Nam Từ Liêm", wards: ["Phường Cầu Diễn", "Phường Mỹ Đình 1", "Phường Mỹ Đình 2", "Phường Phương Canh", "Phường Trung Văn"] },
      { name: "Quận Bắc Từ Liêm", wards: ["Phường Cổ Nhuế 1", "Phường Cổ Nhuế 2", "Phường Đông Ngạc", "Phường Đức Thắng", "Phường Minh Khai", "Phường Phú Diễn"] },
      { name: "Quận Hà Đông", wards: ["Phường Biên Giang", "Phường Dương Nội", "Phường Hà Cầu", "Phường Mộ Lao", "Phường Nguyễn Trãi", "Phường Quang Trung", "Phường Văn Quán"] },
      { name: "Quận Long Biên", wards: ["Phường Bồ Đề", "Phường Cự Khối", "Phường Đức Giang", "Phường Gia Thụy", "Phường Ngọc Thụy", "Phường Phúc Đồng"] },
      { name: "Huyện Đông Anh", wards: ["Thị trấn Đông Anh", "Xã Bắc Hồng", "Xã Cổ Loa", "Xã Hải Bối", "Xã Kim Chung", "Xã Vân Nội"] },
      { name: "Huyện Gia Lâm", wards: ["Thị trấn Trâu Quỳ", "Xã Bát Tràng", "Xã Cổ Bi", "Xã Đặng Xá", "Xã Ninh Hiệp", "Xã Phù Đổng"] },
      { name: "Huyện Thanh Trì", wards: ["Thị trấn Văn Điển", "Xã Đại Áng", "Xã Ngọc Hồi", "Xã Ngũ Hiệp", "Xã Tả Thanh Oai", "Xã Tân Triều"] },
    ]
  },
  {
    name: "Đà Nẵng",
    districts: [
      { name: "Quận Hải Châu", wards: ["Phường Hải Châu I", "Phường Hải Châu II", "Phường Hòa Cường Bắc", "Phường Hòa Cường Nam", "Phường Nam Dương", "Phường Phước Ninh", "Phường Thạch Thang"] },
      { name: "Quận Thanh Khê", wards: ["Phường An Khê", "Phường Chính Gián", "Phường Hòa Khê", "Phường Tân Chính", "Phường Thanh Khê Đông", "Phường Vĩnh Trung"] },
      { name: "Quận Sơn Trà", wards: ["Phường An Hải Bắc", "Phường An Hải Tây", "Phường An Hải Đông", "Phường Mẫn Thái", "Phường Phước Mỹ", "Phường Thọ Quang"] },
      { name: "Quận Ngũ Hành Sơn", wards: ["Phường Hòa Hải", "Phường Hòa Quý", "Phường Khuê Mỹ", "Phường Mỹ An"] },
      { name: "Quận Liên Chiểu", wards: ["Phường Hòa Hiệp Bắc", "Phường Hòa Hiệp Nam", "Phường Hòa Khánh Bắc", "Phường Hòa Khánh Nam", "Phường Hòa Minh"] },
      { name: "Quận Cẩm Lệ", wards: ["Phường Hòa An", "Phường Hòa Phát", "Phường Hòa Thọ Đông", "Phường Hòa Thọ Tây", "Phường Hòa Xuân"] },
    ]
  },
  {
    name: "Cần Thơ",
    districts: [
      { name: "Quận Ninh Kiều", wards: ["Phường An Bình", "Phường An Cư", "Phường An Hòa", "Phường An Khánh", "Phường Tân An", "Phường Thới Bình", "Phường Xuân Khánh"] },
      { name: "Quận Bình Thủy", wards: ["Phường An Thới", "Phường Bình Thủy", "Phường Bùi Hữu Nghĩa", "Phường Long Hòa", "Phường Long Tuyền", "Phường Trà An"] },
      { name: "Quận Cái Răng", wards: ["Phường Ba Láng", "Phường Hưng Thạnh", "Phường Hưng Phú", "Phường Lê Bình", "Phường Tân Phú", "Phường Phước Thới"] },
      { name: "Quận Ô Môn", wards: ["Phường Chau Văn Liêm", "Phường Phước Thới", "Phường Thới An", "Phường Thới Hòa", "Phường Thới Long"] },
    ]
  },
  {
    name: "Hải Phòng",
    districts: [
      { name: "Quận Hồng Bàng", wards: ["Phường Hoàng Văn Thụ", "Phường Minh Khai", "Phường Phan Bội Châu", "Phường Quán Toan", "Phường Thượng Lý"] },
      { name: "Quận Ngô Quyền", wards: ["Phường Cầu Đất", "Phường Đằng Giang", "Phường Đông Khê", "Phường Lạc Viên", "Phường Máy Chai"] },
      { name: "Quận Lê Chân", wards: ["Phường An Biên", "Phường Cát Dài", "Phường Dư Hàng", "Phường Hàng Kênh", "Phường Niệm Nghĩa"] },
      { name: "Quận Hải An", wards: ["Phường Cát Bi", "Phường Đằng Hải", "Phường Đằng Lâm", "Phường Đông Hải 1", "Phường Tràng Cát"] },
    ]
  },
  {
    name: "Bình Dương",
    districts: [
      { name: "TP. Thủ Dầu Một", wards: ["Phường Phú Hòa", "Phường Phú Cường", "Phường Phú Lợi", "Phường Chánh Nghĩa", "Phường Hiệp Thành", "Phường Hòa Phú"] },
      { name: "TP. Thuận An", wards: ["Phường Lái Thiêu", "Phường An Thạnh", "Phường An Phú", "Phường Thuận Giao", "Phường Bình Hòa"] },
      { name: "TP. Dĩ An", wards: ["Phường Dĩ An", "Phường Tân Bình", "Phường Đông Hòa", "Phường Bình An", "Phường Tân Đông Hiệp"] },
      { name: "TP. Tân Uyên", wards: ["Phường Uyên Hưng", "Phường Tân Phước Khánh", "Phường Thái Hòa", "Phường Khánh Bình"] },
      { name: "TP. Bến Cát", wards: ["Phường Mỹ Phước", "Phường Thới Hòa", "Phường Hòa Lợi", "Phường Tân Định"] },
    ]
  },
  {
    name: "Đồng Nai",
    districts: [
      { name: "TP. Biên Hòa", wards: ["Phường Trảng Dài", "Phường Tân Phong", "Phường Thống Nhất", "Phường Quyết Thắng", "Phường Trung Dũng", "Phường Tân Tiến", "Phường Hố Nai"] },
      { name: "TP. Long Khánh", wards: ["Phường Xuân Trung", "Phường Xuân Thanh", "Phường Xuân Bình", "Phường Xuân Hòa"] },
      { name: "Huyện Long Thành", wards: ["Thị trấn Long Thành", "Xã An Phước", "Xã Bình Sơn", "Xã Lộc An", "Xã Phước Thái"] },
      { name: "Huyện Nhơn Trạch", wards: ["Thị trấn Hiệp Phước", "Xã Đại Phước", "Xã Phú Hữu", "Xã Phước Thiền"] },
    ]
  },
  {
    name: "Bà Rịa - Vũng Tàu",
    districts: [
      { name: "TP. Vũng Tàu", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 7", "Phường 8", "Phường 9", "Phường Thắng Tam", "Phường Nguyễn An Ninh"] },
      { name: "TP. Bà Rịa", wards: ["Phường Phước Trung", "Phường Phước Hưng", "Phường Phước Nguyên", "Phường Long Hương"] },
      { name: "Thị xã Phú Mỹ", wards: ["Phường Phú Mỹ", "Phường Mỹ Xuân", "Phường Tân Phước", "Phường Hắc dịch"] },
    ]
  },
  {
    name: "Quảng Ninh",
    districts: [
      { name: "TP. Hạ Long", wards: ["Phường Bãi Cháy", "Phường Hồng Gai", "Phường Hòn Gai", "Phường Cao Xanh", "Phường Tuần Châu"] },
      { name: "TP. Cẩm Phả", wards: ["Phường Cẩm Bình", "Phường Cẩm Đông", "Phường Cẩm Tây", "Phường Cẩm Thủy"] },
      { name: "TP. Uông Bí", wards: ["Phường Quang Trung", "Phường Thanh Sơn", "Phường Yên Thanh", "Phường Vàng Danh"] },
      { name: "TP. Móng Cái", wards: ["Phường Hòa Lạc", "Phường Ka Long", "Phường Tran Phú"] },
    ]
  },
  {
    name: "Khánh Hòa",
    districts: [
      { name: "TP. Nha Trang", wards: ["Phường Lộc Thọ", "Phường Tân Lập", "Phường Phước Tiến", "Phường Phương Sài", "Phường Vĩnh Hải", "Phường Vĩnh Nguyên"] },
      { name: "TP. Cam Ranh", wards: ["Phường Cam Lợi", "Phường Cam Lộc", "Phường Cam Thuận", "Phường Cam Phú"] },
    ]
  },
  {
    name: "Lâm Đồng",
    districts: [
      { name: "TP. Đà Lạt", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 8", "Phường 9", "Phường 10"] },
      { name: "TP. Bảo Lộc", wards: ["Phường 1", "Phường 2", "Phường B'Lao", "Phường Lộc Phát"] },
    ]
  },
  {
    name: "Thừa Thiên Huế",
    districts: [
      { name: "TP. Huế", wards: ["Phường Phú Hội", "Phường Vĩnh Ninh", "Phường Phước Vĩnh", "Phường Hương Sơ", "Phường Thuận Lộc"] },
    ]
  },
  {
    name: "An Giang",
    districts: [
      { name: "TP. Long Xuyên", wards: ["Phường Mỹ Bình", "Phường Mỹ Long", "Phường Mỹ Phước", "Phường Mỹ Xuyên", "Phường Bình Khánh"] },
      { name: "TP. Châu Đốc", wards: ["Phường Châu Phú A", "Phường Châu Phú B", "Phường Núi Sam"] },
    ]
  },
  {
    name: "Kiên Giang",
    districts: [
      { name: "TP. Rạch Giá", wards: ["Phường Vĩnh Thanh", "Phường Vĩnh Hiệp", "Phường Vĩnh Lạc", "Phường An Hòa"] },
      { name: "TP. Phú Quốc", wards: ["Phường Dương Đông", "Phường An Thới", "Xã Cửa Dương", "Xã Gành Dầu"] },
    ]
  },
  {
    name: "Tiền Giang",
    districts: [
      { name: "TP. Mỹ Tho", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường Tân Long"] },
    ]
  },
  {
    name: "Bến Tre",
    districts: [
      { name: "TP. Bến Tre", wards: ["Phường An Hội", "Phường Phú Khương", "Phường Phú Tân", "Phường 6"] },
    ]
  },
  {
    name: "Tây Ninh",
    districts: [
      { name: "TP. Tây Ninh", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường Hiệp Ninh"] },
    ]
  },
  {
    name: "Long An",
    districts: [
      { name: "TP. Tân An", wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường Khánh Hậu"] },
    ]
  },
  {
    name: "Bình Thuận",
    districts: [
      { name: "TP. Phan Thiết", wards: ["Phường Đức Thắng", "Phường Phú Thủy", "Phường Hưng Long", "Phường Mũi Né"] },
    ]
  },
  {
    name: "Nghệ An",
    districts: [
      { name: "TP. Vinh", wards: ["Phường Hưng Dũng", "Phường Lê Mao", "Phường Quang Trung", "Phường Bến Thủy", "Phường Trường Thi"] },
    ]
  },
  {
    name: "Thanh Hóa",
    districts: [
      { name: "TP. Thanh Hóa", wards: ["Phường Ba Đình", "Phường Điện Biên", "Phường Đông Thọ", "Phường Ngọc Trạo", "Phường Tân Sơn"] },
    ]
  },
  {
    name: "Bắc Ninh",
    districts: [
      { name: "TP. Bắc Ninh", wards: ["Phường Ninh Xá", "Phường Suối Hoa", "Phường Vệ An", "Phường Tiền An"] },
    ]
  },
  {
    name: "Thái Nguyên",
    districts: [
      { name: "TP. Thái Nguyên", wards: ["Phường Hoàng Văn Thụ", "Phường Phan Đình Phùng", "Phường Quang Trung", "Phường Gia Sàng"] },
    ]
  }
];

export const getProvinces = (): string[] => {
  return VIETNAM_PROVINCES.map((p) => p.name);
};

export const getDistricts = (provinceName: string): string[] => {
  if (!provinceName) return [];
  const found = VIETNAM_PROVINCES.find(
    (p) => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  if (found) {
    return found.districts.map((d) => d.name);
  }
  return ["Quận / Huyện Trung Tâm", "Quận / Huyện 1", "Quận / Huyện 2"];
};

export const getWards = (provinceName: string, districtName: string): string[] => {
  if (!provinceName || !districtName) return [];
  const foundProv = VIETNAM_PROVINCES.find(
    (p) => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  if (foundProv) {
    const foundDist = foundProv.districts.find(
      (d) => d.name.toLowerCase() === districtName.toLowerCase()
    );
    if (foundDist) {
      return foundDist.wards;
    }
  }
  return ["Phường / Xã 1", "Phường / Xã 2", "Phường / Xã 3", "Phường / Xã 4"];
};

export const parseAddressComponents = (fullStreetString: string, cityString: string) => {
  const parts = (fullStreetString || "").split(",").map((s) => s.trim());
  let houseNumber = fullStreetString || "";
  let ward = "";
  let district = "";
  let city = cityString || "TP. Hồ Chí Minh";

  if (parts.length >= 3) {
    district = parts.pop() || "";
    ward = parts.pop() || "";
    houseNumber = parts.join(", ");
  } else if (parts.length === 2) {
    ward = parts.pop() || "";
    houseNumber = parts[0] || "";
  }

  return { houseNumber, ward, district, city };
};
