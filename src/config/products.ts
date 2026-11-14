export interface ProductTier {
  name: string;
  priceLabel: string;
  priceVnd: number;
  billingCycle: string;
  targetCustomer: string;
  features: string[];
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface ProductCatalogItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  priorityRank: number;
  targetAudience: string[];
  tagline: string;
  description: string;
  strengths: string[];
  tiers: [ProductTier, ProductTier, ProductTier];
  faqs: ProductFaq[];
}

export const PRODUCTS: ProductCatalogItem[] = [
  {
    id: 'edu-center',
    code: 'SP-01',
    name: 'Phần mềm Quản lý Trung tâm Ngoại ngữ & Đào tạo (EduCenter Pro)',
    shortName: 'QL Trung tâm Ngoại ngữ',
    priorityRank: 1,
    targetAudience: [
      'Trung tâm tiếng Anh, IELTS, TOEIC, Giao tiếp',
      'Trung tâm tiếng Nhật, Hàn, Trung',
      'Trung tâm kỹ năng mềm & luyện thi',
    ],
    tagline: 'Tự động hóa tuyển sinh, xếp lịch học thông minh và nhắc học phí qua Zalo OA.',
    description:
      'EduCenter Pro giúp chủ trung tâm ngoại ngữ quản lý trọn vẹn từ lúc phụ huynh/học viên để lại thông tin tư vấn đến xếp lớp, điểm danh, chấm công giáo viên bản ngữ/Việt Nam, theo dõi lộ trình CEFR và thu học phí tự động.',
    strengths: [
      'Xếp lịch học & phòng học tự động, cảnh báo trùng lịch giáo viên trong 1 giây.',
      'Tích hợp Zalo OA gửi thông báo điểm danh, nhận xét sau buổi học và nhắc đóng học phí tự động.',
      'CRM tuyển sinh đa kênh (Facebook, Zalo, Landing Page) giúp tăng 32% tỉ lệ chuyển đổi học thử.',
      'Tính lương giáo viên theo giờ dạy thực tế, ca dạy bù và KPI giữ chân học viên.',
    ],
    tiers: [
      {
        name: 'Gói Khởi Động (Starter)',
        priceLabel: '990.000đ / tháng',
        priceVnd: 990000,
        billingCycle: 'Thanh toán 6 hoặc 12 tháng',
        targetCustomer: '1 cơ sở, tối đa 250 học viên đang học',
        features: [
          'CRM tuyển sinh & quản lý học thử',
          'Xếp lịch lớp học, điểm danh QR/App',
          'Quản lý thu chi & hóa đơn học phí',
          'Báo cáo sĩ số & công nợ cơ bản',
        ],
      },
      {
        name: 'Gói Tăng Trưởng (Growth)',
        priceLabel: '2.490.000đ / tháng',
        priceVnd: 2490000,
        billingCycle: 'Thanh toán năm giảm 15%',
        targetCustomer: '1–3 cơ sở, tối đa 1.200 học viên',
        features: [
          'Tất cả tính năng Gói Khởi Động',
          'Tích hợp Zalo OA nhắc lịch & học phí tự động',
          'App phụ huynh / học viên xem bảng điểm & bài tập',
          'Chấm công & bảng lương giáo viên tự động',
        ],
      },
      {
        name: 'Gói Chuỗi Hệ Thống (Enterprise)',
        priceLabel: '4.990.000đ / tháng',
        priceVnd: 4990000,
        billingCycle: 'Hợp đồng năm + SLA 99.9%',
        targetCustomer: 'Chuỗi từ 4 cơ sở trở lên, không giới hạn học viên',
        features: [
          'Quản trị đa chi nhánh tập trung theo thời gian thực',
          'Thương hiệu riêng (White-label App & tên miền riêng)',
          'API kết nối kế toán, cổng thanh toán VietQR động',
          'Chuyên viên hỗ trợ riêng & đào tạo trực tiếp',
        ],
      },
    ],
    faqs: [
      {
        question: 'Trung tâm đang dùng file Excel có chuyển dữ liệu sang được không?',
        answer:
          'Có. Đội Onboarding hỗ trợ nhập toàn bộ danh sách học viên, lớp học và công nợ từ Excel sang hệ thống miễn phí trong 24 giờ.',
      },
      {
        question: 'Giáo viên lớn tuổi hoặc không rành công nghệ có dễ dùng không?',
        answer:
          'Giao diện tiếng Việt tối giản, giáo viên chỉ mất 2 chạm trên điện thoại để điểm danh và nhập nhận xét cuối buổi.',
      },
      {
        question: 'Có dùng thử miễn phí trước khi ký hợp đồng không?',
        answer: 'Có, trung tâm được dùng thử đầy đủ tính năng trong 14 ngày kèm 1 buổi demo 1-1.',
      },
    ],
  },
  {
    id: 'warehouse-pro',
    code: 'SP-02',
    name: 'Phần mềm Quản lý Kho hàng Thông minh (KhoViet 360)',
    shortName: 'QL Kho hàng',
    priorityRank: 2,
    targetAudience: [
      'Doanh nghiệp thương mại, phân phối bán sỉ/lẻ',
      'Xưởng sản xuất vừa và nhỏ',
      'Shop đa kênh Shopee, TikTok Shop, Lazada',
    ],
    tagline: 'Kiểm soát chính xác 99.8% tồn kho theo lô, hạn sử dụng và mã vạch QR.',
    description:
      'KhoViet 360 loại bỏ thất thoát kho hàng và lệch số liệu giữa kế toán với thủ kho. Hỗ trợ quét mã vạch bằng điện thoại, định vị kệ kho, quản lý nhập-xuất-chuyển kho đa chi nhánh và cảnh báo tồn kho tối thiểu.',
    strengths: [
      'Quét mã vạch/QR bằng camera điện thoại, kiểm kho nhanh gấp 4 lần cách đếm thủ công.',
      'Theo dõi chi tiết theo số lô (Batch/Lot), ngày hết hạn (FEFO) và số Serial/IMEI.',
      'Đồng bộ tồn kho tức thì với sàn TMĐT và phần mềm bán hàng, tránh hủy đơn do hết hàng.',
      'Báo cáo giá vốn xuất kho bình quân gia quyền/FIFO chuẩn kế toán Việt Nam.',
    ],
    tiers: [
      {
        name: 'Gói Kho Cơ Bản',
        priceLabel: '790.000đ / tháng',
        priceVnd: 790000,
        billingCycle: 'Thanh toán theo năm',
        targetCustomer: '1 kho, tối đa 3.000 SKU',
        features: [
          'Nhập/xuất/kiểm kê bằng mã vạch điện thoại',
          'Cảnh báo hàng sắp hết & hàng tồn lâu',
          'Phân quyền thủ kho – kế toán – quản lý',
        ],
      },
      {
        name: 'Gói Đa Kho & TMĐT',
        priceLabel: '1.890.000đ / tháng',
        priceVnd: 1890000,
        billingCycle: 'Thanh toán năm giảm 15%',
        targetCustomer: 'Tối đa 5 kho, không giới hạn SKU',
        features: [
          'Điều chuyển hàng giữa nhiều kho chi nhánh',
          'Quản lý Lô/Hạn sử dụng & Serial/IMEI',
          'Đồng bộ tồn kho Shopee, Lazada, TikTok Shop',
        ],
      },
      {
        name: 'Gói Doanh Nghiệp (ERP Kho)',
        priceLabel: '3.990.000đ / tháng',
        priceVnd: 3990000,
        billingCycle: 'Hợp đồng năm',
        targetCustomer: 'Chuỗi phân phối & nhà máy sản xuất',
        features: [
          'Định mức nguyên vật liệu (BOM) & lệnh sản xuất',
          'Tích hợp máy PDA chuyên dụng & API ERP/MISA',
          'Phân tích vòng quay vốn hàng tồn kho nâng cao',
        ],
      },
    ],
    faqs: [
      {
        question: 'Có cần mua máy quét mã vạch đắt tiền không?',
        answer:
          'Không bắt buộc. Thủ kho có thể dùng ngay app trên điện thoại iOS/Android hoặc kết nối súng bắn mã vạch USB/Bluetooth sẵn có.',
      },
      {
        question: 'Kho mất mạng Internet có xuất hàng được không?',
        answer: 'Ứng dụng hỗ trợ lưu tạm ngoại tuyến và tự động đồng bộ ngay khi có Wi-Fi/4G.',
      },
    ],
  },
  {
    id: 'preschool-care',
    code: 'SP-03',
    name: 'Phần mềm Quản lý Trường Mầm non (MamNon Care)',
    shortName: 'QL Trường Mầm non',
    priorityRank: 3,
    targetAudience: [
      'Trường mầm non tư thục & song ngữ',
      'Nhóm trẻ độc lập quy mô 30–300 bé',
      'Hệ thống trường mầm non liên cấp',
    ],
    tagline: 'Kết nối nhà trường & phụ huynh ấm áp, minh bạch khẩu phần dinh dưỡng và học phí.',
    description:
      'MamNon Care giúp ban giám hiệu và giáo viên mầm non giảm 70% giấy tờ sổ sách mỗi ngày: điểm danh đưa đón an toàn, nhật ký ăn-ngủ-sức khỏe kèm ảnh gửi phụ huynh, lập thực đơn cân đối dinh dưỡng và tính tiền ăn hoàn trả tự động.',
    strengths: [
      'Tính tiền ăn theo ngày đi học thực tế và hoàn trừ tiền ăn ngày nghỉ hoàn toàn tự động.',
      'Gửi ảnh hoạt động, thực đơn, chỉ số chiều cao/cân nặng hàng tháng trực tiếp qua Zalo/App.',
      'Quản lý người đón trẻ có xác thực ảnh & mã OTP an toàn tuyệt đối.',
      'Quản lý kho bếp, định lượng thực phẩm hàng ngày tránh lãng phí.',
    ],
    tiers: [
      {
        name: 'Gói Nhóm Trẻ',
        priceLabel: '690.000đ / tháng',
        priceVnd: 690000,
        billingCycle: 'Thanh toán 6 hoặc 12 tháng',
        targetCustomer: 'Quy mô dưới 80 bé',
        features: [
          'Điểm danh lớp & xác nhận người đón trẻ',
          'Sổ liên lạc điện tử gửi ảnh hoạt động',
          'Tính học phí & tiền ăn theo ngày thực học',
        ],
      },
      {
        name: 'Gói Trường Chuẩn',
        priceLabel: '1.590.000đ / tháng',
        priceVnd: 1590000,
        billingCycle: 'Thanh toán năm giảm 15%',
        targetCustomer: '80–300 bé',
        features: [
          'Tất cả tính năng Gói Nhóm Trẻ',
          'Quản lý thực đơn dinh dưỡng & kho bếp',
          'Theo dõi sức khỏe, tiêm chủng, biểu đồ BMI',
          'Tích hợp thanh toán QR học phí qua Zalo OA',
        ],
      },
      {
        name: 'Gói Hệ Thống Song Ngữ',
        priceLabel: '3.290.000đ / tháng',
        priceVnd: 3290000,
        billingCycle: 'Hợp đồng năm',
        targetCustomer: 'Chuỗi trường hoặc trên 300 bé',
        features: [
          'Quản lý đa cơ sở & báo cáo tài chính hợp nhất',
          'App mang thương hiệu riêng của trường',
          'Hồ sơ đánh giá phát triển trẻ theo chuẩn Bộ GD&ĐT',
        ],
      },
    ],
    faqs: [
      {
        question: 'Phụ huynh có phải cài app phức tạp mới xem được ảnh con không?',
        answer:
          'Trường có thể gửi bản tin tổng hợp hàng ngày thẳng qua Zalo OA hoặc phụ huynh dùng app gọn nhẹ chỉ 15MB.',
      },
      {
        question: 'Phần mềm có tính được tiền ăn hoàn lại khi bé nghỉ có phép không?',
        answer:
          'Có, hệ thống liên kết trực tiếp dữ liệu điểm danh buổi sáng để tự động cấn trừ tiền ăn vào kỳ thu tháng sau.',
      },
    ],
  },
  {
    id: 'web-design',
    code: 'SP-04',
    name: 'Dịch vụ Thiết kế & Xây dựng Website Chuẩn Chuyển đổi (WebCraft VN)',
    shortName: 'Thiết kế Website',
    priorityRank: 4,
    targetAudience: [
      'Trung tâm giáo dục, phòng khám, thẩm mỹ viện',
      'Doanh nghiệp B2B cần hồ sơ năng lực số',
      'Cửa hàng & thương hiệu bán lẻ cần trang đặt hàng riêng',
    ],
    tagline: 'Website tốc độ dưới 1.5s, chuẩn SEO Google & tích hợp phễu thu Lead Zalo/CRM.',
    description:
      'WebCraft VN thiết kế website may đo theo nhận diện thương hiệu riêng, tối ưu tỷ lệ chuyển đổi khách hàng tại Việt Nam với nút chat Zalo, form đăng ký học thử/báo giá đẩy thẳng vào CRM và cấu trúc chuẩn SEO.',
    strengths: [
      'Thiết kế UI/UX độc quyền theo ngành, tương thích 100% di động và máy tính bảng.',
      'Điểm Google PageSpeed > 90, chuẩn schema SEO local giúp dễ lên top tìm kiếm.',
      'Tích hợp sẵn Zalo OA, Facebook Pixel, Google Analytics 4 và webhook đổ Lead về CRM.',
      'Bàn giao toàn bộ mã nguồn, hướng dẫn tự chỉnh sửa nội dung không phụ thuộc kỹ thuật.',
    ],
    tiers: [
      {
        name: 'Gói Landing Page Chuyển Đổi',
        priceLabel: '6.500.000đ (trọn gói)',
        priceVnd: 6500000,
        billingCycle: 'Thanh toán 1 lần, bàn giao trong 7 ngày',
        targetCustomer: 'Chiến dịch quảng cáo / Tuyển sinh / Ra mắt khóa học',
        features: [
          'Thiết kế 1 trang đích dài chuẩn AIDA',
          'Form đăng ký đổ về Google Sheet / CRM / Zalo',
          'Tặng SSL + tối ưu tốc độ tải trang',
        ],
      },
      {
        name: 'Gói Website Doanh Nghiệp Pro',
        priceLabel: '14.500.000đ (trọn gói)',
        priceVnd: 14500000,
        billingCycle: 'Bàn giao trong 14–18 ngày',
        targetCustomer: 'Trung tâm ngoại ngữ, trường học, công ty SME',
        features: [
          'Thiết kế 8–12 trang chức năng & CMS quản trị tin tức',
          'Chuẩn SEO kỹ thuật, sitemap, schema doanh nghiệp',
          'Tích hợp đặt lịch tư vấn & chat Zalo OA',
          'Bảo hành kỹ thuật 12 tháng',
        ],
      },
      {
        name: 'Gói Web App / Thương Mại Điện Tử',
        priceLabel: '29.000.000đ+ (theo phạm vi)',
        priceVnd: 29000000,
        billingCycle: 'Chia 3 đợt nghiệm thu',
        targetCustomer: 'Doanh nghiệp cần cổng thanh toán, đặt lịch, tra cứu riêng',
        features: [
          'Kiến trúc React/Next.js tùy biến tính năng riêng',
          'Thanh toán VietQR / VNPay / MoMo tự động',
          'Kết nối API phần mềm kho hoặc ERP nội bộ',
        ],
      },
    ],
    faqs: [
      {
        question: 'Giá trên đã bao gồm tên miền và hosting chưa?',
        answer:
          'Gói Pro tặng 1 năm hosting tốc độ cao tại Việt Nam và hỗ trợ đăng ký tên miền .vn/.com chính chủ.',
      },
      {
        question: 'Sau khi làm xong tôi có tự sửa được bài viết và bảng giá không?',
        answer:
          'Hoàn toàn được. Hệ thống có trang quản trị tiếng Việt trực quan kèm video hướng dẫn chi tiết.',
      },
    ],
  },
];

export const getProductById = (id?: string) =>
  PRODUCTS.find((p) => p.id === id) || PRODUCTS[0];
