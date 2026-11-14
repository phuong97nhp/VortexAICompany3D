import { ContractTemplate, LegalDocument, LegalSettings } from '../../types';

export function createDefaultLegalSettings(): LegalSettings {
  return {
    companyLegalName: '[CẦN BỔ SUNG TÊN PHÁP NHÂN DOANH NGHIỆP]',
    taxCode: '[CẦN BỔ SUNG MÃ SỐ THUẾ]',
    legalAddress: '[CẦN BỔ SUNG ĐỊA CHỈ TRỤ SỞ CHÍNH]',
    representativeName: '[CẦN BỔ SUNG HỌ TÊN NGƯỜI ĐẠI DIỆN PHÁP LUẬT]',
    representativeTitle: 'Giám đốc / Chủ tịch',
    bankAccountInfo: '[CẦN BỔ SUNG STK NGÂN HÀNG DOANH NGHIỆP]',
    lawyerEscalationThresholdVnd: 100_000_000,
    defaultStampSignatureNote: 'Hợp đồng lập thành 02 bản gốc có giá trị pháp lý như nhau hoặc ký điện tử theo Luật Giao dịch điện tử 2023.',
    lastLawCheckAt: '2026-01-15',
  };
}

export function buildSeedLegalDocuments(): LegalDocument[] {
  return [
    {
      id: 'law_blds_2015',
      docType: 'Bộ luật',
      docNumber: '91/2015/QH13',
      title: 'Bộ luật Dân sự năm 2015',
      issuingBody: 'Quốc hội',
      issuedDate: '2015-11-24',
      effectiveDate: '2017-01-01',
      effectiveStatus: 'effective',
      domain: 'civil_commerce',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=95942',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 385–429: Giao kết, thực hiện, sửa đổi, chấm dứt hợp đồng dân sự.',
        'Điều 418: Thỏa thuận phạt vi phạm hợp đồng dân sự.',
        'Điều 351–364: Trách nhiệm dân sự & bồi thường thiệt hại.',
      ],
    },
    {
      id: 'law_ltm_2005',
      docType: 'Luật',
      docNumber: '36/2005/QH11',
      title: 'Luật Thương mại năm 2005',
      issuingBody: 'Quốc hội',
      issuedDate: '2005-06-14',
      effectiveDate: '2006-01-01',
      effectiveStatus: 'effective',
      domain: 'civil_commerce',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=16885',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 74–87: Hợp đồng cung ứng dịch vụ.',
        'Điều 300–301: Phạt vi phạm hợp đồng thương mại không quá 8% giá trị phần nghĩa vụ bị vi phạm.',
        'Điều 306: Quyền yêu cầu tiền lãi do chậm thanh toán.',
      ],
    },
    {
      id: 'law_gddt_2023',
      docType: 'Luật',
      docNumber: '20/2023/QH15',
      title: 'Luật Giao dịch điện tử năm 2023',
      issuingBody: 'Quốc hội',
      issuedDate: '2023-06-22',
      effectiveDate: '2024-07-01',
      effectiveStatus: 'effective',
      domain: 'civil_commerce',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=162780',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 8–14: Giá trị pháp lý của thông điệp dữ liệu.',
        'Điều 22–28: Chữ ký điện tử & chữ ký số chuyên dùng.',
        'Điều 34–38: Giao kết và thực hiện hợp đồng điện tử.',
      ],
    },
    {
      id: 'law_bvntd_2023',
      docType: 'Luật',
      docNumber: '19/2023/QH15',
      title: 'Luật Bảo vệ quyền lợi người tiêu dùng năm 2023',
      issuingBody: 'Quốc hội',
      issuedDate: '2023-06-20',
      effectiveDate: '2024-07-01',
      effectiveStatus: 'effective',
      domain: 'civil_commerce',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=162779',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 15–18: Bảo vệ thông tin của người tiêu dùng.',
        'Điều 23–25: Hợp đồng theo mẫu, điều kiện giao dịch chung (cấm điều khoản bất lợi vô hiệu).',
        'Điều 37–40: Giao dịch từ xa & trên không gian mạng.',
      ],
    },
    {
      id: 'law_shtt',
      docType: 'Luật hợp nhất',
      docNumber: '07/2022/QH15 (sửa đổi Luật SHTT)',
      title: 'Luật Sở hữu trí tuệ (được sửa đổi, bổ sung năm 2022)',
      issuingBody: 'Quốc hội',
      issuedDate: '2022-06-16',
      effectiveDate: '2023-01-01',
      effectiveStatus: 'effective',
      domain: 'software_ip',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=156660',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 22: Quyền tác giả đối với chương trình máy tính & sưu tập dữ liệu.',
        'Điều 39–41: Chủ sở hữu quyền tác giả khi giao việc / thuê thiết kế phần mềm.',
      ],
    },
    {
      id: 'law_cncns_2025',
      docType: 'Luật',
      docNumber: '71/2025/QH15',
      title: 'Luật Công nghiệp công nghệ số năm 2025',
      issuingBody: 'Quốc hội',
      issuedDate: '2025-06-14',
      effectiveDate: '2026-01-01',
      effectiveStatus: 'unverified',
      domain: 'ai_cyber',
      sourceUrl: 'https://vbpl.vn/',
      lastCheckedAt: '2026-01-15',
      statusAlertNote: 'Văn bản ban hành 2025–2026: cần bấm "Kiểm tra cập nhật pháp luật" hoặc luật sư đối chiếu văn bản hợp nhất trên vbpl.vn.',
      keyArticlesSummary: [
        'Khung pháp lý doanh nghiệp công nghệ số, sản phẩm phần mềm, tài sản số & thử nghiệm có kiểm soát (sandbox).',
      ],
    },
    {
      id: 'law_dlcn_2025',
      docType: 'Luật',
      docNumber: '91/2025/QH15',
      title: 'Luật Bảo vệ dữ liệu cá nhân năm 2025',
      issuingBody: 'Quốc hội',
      issuedDate: '2025-06-26',
      effectiveDate: '2026-01-01',
      effectiveStatus: 'unverified',
      domain: 'data_privacy',
      sourceUrl: 'https://vbpl.vn/',
      lastCheckedAt: '2026-01-15',
      statusAlertNote: 'Cần xác minh điều khoản chi tiết & hiệu lực hướng dẫn thi hành mới nhất với NĐ 356/2025/NĐ-CP và NĐ 13/2023/NĐ-CP.',
      keyArticlesSummary: [
        'Nguyên tắc đồng ý rõ ràng (opt-in) của chủ thể dữ liệu, Đánh giá tác động xử lý DLCN & chuyển dữ liệu ra nước ngoài.',
        'Quy định nghiêm ngặt bảo vệ dữ liệu trẻ em (cần sự đồng ý của cha mẹ/người giám hộ — trọng yếu với SaaS Mầm non).',
      ],
    },
    {
      id: 'law_nd_356_2025',
      docType: 'Nghị định',
      docNumber: '356/2025/NĐ-CP',
      title: 'Nghị định quy định chi tiết một số điều Luật Bảo vệ dữ liệu cá nhân',
      issuingBody: 'Chính phủ',
      issuedDate: '2025-12-31',
      effectiveDate: '2026-01-01',
      effectiveStatus: 'unverified',
      domain: 'data_privacy',
      sourceUrl: 'https://congbao.chinhphu.vn/',
      lastCheckedAt: '2026-01-15',
      statusAlertNote: 'Văn bản hướng dẫn cuối 2025 — yêu cầu kiểm tra lại số hiệu & tình trạng công bố chính thức trên Công báo.',
      keyArticlesSummary: [
        'Hồ sơ đánh giá tác động xử lý DLCN, chỉ định nhân sự DPO và quy trình thông báo vi phạm dữ liệu.',
      ],
    },
    {
      id: 'law_ai_2025',
      docType: 'Luật',
      docNumber: '134/2025/QH15',
      title: 'Luật Trí tuệ nhân tạo năm 2025',
      issuingBody: 'Quốc hội',
      issuedDate: '2025-12-10',
      effectiveDate: '2026-03-01',
      effectiveStatus: 'unverified',
      domain: 'ai_cyber',
      sourceUrl: 'https://vbpl.vn/',
      lastCheckedAt: '2026-01-15',
      statusAlertNote: 'Cần kiểm tra hiệu lực chi tiết (dự kiến 01/03/2026) & nghĩa vụ gắn nhãn nội dung tạo bởi AI trước khi áp dụng bắt buộc.',
      keyArticlesSummary: [
        'Phân loại hệ thống AI theo mức độ rủi ro, nghĩa vụ minh bạch & gắn nhãn nội dung do AI tạo lập.',
      ],
    },
    {
      id: 'law_anm_2025',
      docType: 'Luật',
      docNumber: 'Luật An ninh mạng (sửa đổi 2025)',
      title: 'Luật An ninh mạng & an toàn thông tin mạng',
      issuingBody: 'Quốc hội',
      issuedDate: '2025-11-01',
      effectiveDate: '2026-07-01',
      effectiveStatus: 'unverified',
      domain: 'ai_cyber',
      sourceUrl: 'https://vbpl.vn/',
      lastCheckedAt: '2026-01-15',
      statusAlertNote: 'Cần xác minh số hiệu văn bản hợp nhất trên vbpl.vn.',
      keyArticlesSummary: [
        'Lưu trữ dữ liệu tại Việt Nam khi thuộc diện quy định, ứng cứu sự cố an ninh mạng.',
      ],
    },
    {
      id: 'law_tmdt_2025',
      docType: 'Luật & Nghị định',
      docNumber: 'Luật TMĐT 2025 & NĐ 248 (cần kiểm chứng)',
      title: 'Quy định Thương mại điện tử, sàn giao dịch & tiếp thị liên kết',
      issuingBody: 'Quốc hội / Chính phủ',
      issuedDate: '2025-12-01',
      effectiveDate: '2026-07-01',
      effectiveStatus: 'unverified',
      domain: 'advertising_ecommerce',
      sourceUrl: 'https://vbpl.vn/',
      lastCheckedAt: '2026-01-15',
      statusAlertNote: 'ĐÁNH DẤU CẦN XÁC MINH: Không tự khẳng định số hiệu NĐ 248 hay hiệu lực 01/07/2026 khi chưa tra cứu nguồn vbpl.vn.',
      keyArticlesSummary: [
        'Trách nhiệm định danh người bán, công khai thông tin khuyến mãi & minh bạch tiếp thị liên kết.',
      ],
    },
    {
      id: 'law_quang_cao',
      docType: 'Luật',
      docNumber: '16/2012/QH13 (và Luật sửa đổi 2025 nếu có)',
      title: 'Luật Quảng cáo & NĐ 91/2020/NĐ-CP chống tin nhắn rác',
      issuingBody: 'Quốc hội / Chính phủ',
      issuedDate: '2012-06-21',
      effectiveDate: '2013-01-01',
      effectiveStatus: 'effective',
      domain: 'advertising_ecommerce',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=27793',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 8 Luật Quảng cáo: Các hành vi bị cấm (quảng cáo sai sự thật, so sánh trực tiếp, thiếu xác nhận đối với sản phẩm đặc biệt).',
        'NĐ 91/2020/NĐ-CP: Chống tin nhắn/email/cuộc gọi rác — phải có cơ chế từ chối ("Nhắn DỪNG").',
      ],
    },
    {
      id: 'law_doanh_nghiep',
      docType: 'Luật',
      docNumber: '59/2020/QH14',
      title: 'Luật Doanh nghiệp năm 2020',
      issuingBody: 'Quốc hội',
      issuedDate: '2020-06-17',
      effectiveDate: '2021-01-01',
      effectiveStatus: 'effective',
      domain: 'civil_commerce',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=143065',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 12–13: Người đại diện theo pháp luật của doanh nghiệp và thẩm quyền ký kết hợp đồng.',
      ],
    },
    {
      id: 'law_blld_2019',
      docType: 'Bộ luật',
      docNumber: '45/2019/QH14',
      title: 'Bộ luật Lao động năm 2019',
      issuingBody: 'Quốc hội',
      issuedDate: '2019-11-20',
      effectiveDate: '2021-01-01',
      effectiveStatus: 'effective',
      domain: 'tax_labor',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=139252',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 13–21: Hợp đồng lao động, phân biệt hợp đồng lao động với hợp đồng dịch vụ CTV.',
        'Điều 24–27: Thời gian thử việc & tiền lương thử việc tối thiểu 85%.',
      ],
    },
    {
      id: 'law_thue_hddt',
      docType: 'Nghị định',
      docNumber: '123/2020/NĐ-CP (sửa đổi bởi NĐ 70/2025 nếu áp dụng)',
      title: 'Quy định về Hóa đơn điện tử, Chứng từ & Thuế GTGT/TNCN/TNDN',
      issuingBody: 'Chính phủ',
      issuedDate: '2020-10-19',
      effectiveDate: '2022-07-01',
      effectiveStatus: 'effective',
      domain: 'tax_labor',
      sourceUrl: 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=144511',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 4 & Điều 9 NĐ 123/2020/NĐ-CP: Nguyên tắc lập, thời điểm lập hóa đơn điện tử khi cung cấp dịch vụ phần mềm & thu tiền.',
        'Khấu trừ thuế TNCN 10% đối với khoản chi hoa hồng CTV/Affiliate từ 2.000.000đ/lần theo quy định thuế TNCN.',
      ],
    },
    {
      id: 'law_mam_non',
      docType: 'Thông tư',
      docNumber: '52/2020/TT-BGDĐT & NĐ 13/2023/NĐ-CP',
      title: 'Điều lệ Trường mầm non & Bảo vệ dữ liệu trẻ em',
      issuingBody: 'Bộ GD&ĐT / Chính phủ',
      issuedDate: '2020-12-31',
      effectiveDate: '2021-03-22',
      effectiveStatus: 'effective',
      domain: 'education_preschool',
      sourceUrl: 'https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146055',
      lastCheckedAt: '2026-01-15',
      keyArticlesSummary: [
        'Điều 20 NĐ 13/2023/NĐ-CP: Xử lý dữ liệu cá nhân của trẻ em phải có sự đồng ý của cha, mẹ hoặc người giám hộ.',
        'Quản lý hồ sơ, hình ảnh, thực đơn, sức khỏe trẻ mầm non phải phân quyền chặt chẽ & lưu trữ an toàn.',
      ],
    },
  ];
}

export function buildSeedContractTemplates(): ContractTemplate[] {
  const now = Date.now();
  return [
    {
      id: 'tpl_saas_preschool',
      code: 'HD-SAAS-MN',
      name: 'Hợp đồng SaaS Quản lý Trường Mầm non (+ Bảo vệ Dữ liệu Trẻ em)',
      category: 'saas_preschool',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Trường Mầm non (Bên B)', sourceHint: 'HubCW / Khách hàng cung cấp' },
        { key: 'partyB.taxCode', label: 'Mã số thuế / Mã đơn vị', sourceHint: 'Giấy phép thành lập trường' },
        { key: 'partyB.address', label: 'Địa chỉ trụ sở', sourceHint: 'Hồ sơ pháp lý Bên B' },
        { key: 'partyB.representative', label: 'Người đại diện (Hiệu trưởng/Chủ trường)', sourceHint: 'Quyết định bổ nhiệm' },
        { key: 'contractValueVnd', label: 'Giá trị hợp đồng (VNĐ)', sourceHint: 'Báo giá đã duyệt' },
        { key: 'durationMonths', label: 'Thời hạn sử dụng (tháng)', sourceHint: '12 tháng mặc định' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_ltm_2005', 'law_gddt_2023', 'law_mam_non', 'law_dlcn_2025'],
      updatedAt: now,
      defaultBody: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---
HỢP ĐỒNG CUNG CẤP DỊCH VỤ PHẦN MỀM QUẢN LÝ TRƯỜNG MẦM NON (SAAS)
Số: {{CONTRACT_CODE}}

Căn cứ Bộ luật Dân sự số 91/2015/QH13;
Căn cứ Luật Thương mại số 36/2005/QH11;
Căn cứ Luật Giao dịch điện tử số 20/2023/QH15;
Căn cứ quy định về bảo vệ dữ liệu cá nhân và dữ liệu trẻ em (Nghị định 13/2023/NĐ-CP và các văn bản hướng dẫn có hiệu lực).

BÊN CUNG CẤP DỊCH VỤ (BÊN A): {{PARTY_A_NAME}}
- Mã số thuế: {{PARTY_A_TAX}}
- Địa chỉ: {{PARTY_A_ADDRESS}}
- Người đại diện theo pháp luật: {{PARTY_A_REP}} — Chức vụ: {{PARTY_A_TITLE}}
- Tài khoản ngân hàng: {{PARTY_A_BANK}}

BÊN SỬ DỤNG DỊCH VỤ (BÊN B): {{PARTY_B_NAME}}
- Mã số thuế / Mã đơn vị: {{PARTY_B_TAX}}
- Địa chỉ: {{PARTY_B_ADDRESS}}
- Người đại diện: {{PARTY_B_REP}}

ĐIỀU 1. PHẠM VI DỊCH VỤ PHẦN MỀM
1.1. Bên A cấp quyền truy cập và sử dụng hệ thống SaaS Quản lý Trường Mầm non (điểm danh, thực đơn, sổ liên lạc phụ huynh, thu chi học phí) trong thời hạn {{DURATION_MONTHS}} tháng.
1.2. Phần mềm được cung cấp dưới hình thức dịch vụ đám mây (SaaS); quyền sở hữu trí tuệ mã nguồn thuộc về Bên A theo Luật Sở hữu trí tuệ.

ĐIỀU 2. BẢO VỆ DỮ LIỆU TRẺ EM & PHỤ HUYNH (ĐIỀU KHOẢN BẮT BUỘC)
2.1. Bên B là Bên kiểm soát dữ liệu đối với hồ sơ học sinh, hình ảnh, thông tin sức khỏe của trẻ mầm non; Bên A đóng vai trò Bên xử lý dữ liệu theo ủy quyền hợp pháp của Bên B.
2.2. Bên B cam kết đã thu thập sự ĐỒNG Ý BẰNG VĂN BẢN HOẶC ĐIỆN TỬ CÓ XÁC THỰC của cha, mẹ hoặc người giám hộ hợp pháp trước khi nhập dữ liệu, hình ảnh của trẻ lên hệ thống (Điều 20 NĐ 13/2023/NĐ-CP).
2.3. Hai bên áp dụng mã hóa truyền tải (TLS), phân quyền truy cập theo lớp/tài khoản, không chia sẻ dữ liệu trẻ em cho bên thứ ba phục vụ quảng cáo.

ĐIỀU 3. PHÍ DỊCH VỤ & THANH TOÁN
3.1. Tổng giá trị hợp đồng: {{CONTRACT_VALUE_VND}} VNĐ.
3.2. Thời điểm xuất hóa đơn điện tử thực hiện theo Nghị định 123/2020/NĐ-CP khi hoàn thành nghiệm thu kích hoạt hoặc thu tiền theo kỳ.

ĐIỀU 4. CAM KẾT MỨC DỊCH VỤ (SLA) & PHẠT VI PHẠM
4.1. Cam kết uptime tối thiểu 99,5%/tháng (trừ lịch bảo trì thông báo trước 48 giờ).
4.2. Mức phạt vi phạm hợp đồng thương mại không vượt quá 8% giá trị phần nghĩa vụ bị vi phạm theo Điều 301 Luật Thương mại 2005.

ĐIỀU 5. HIỆU LỰC & GIẢI QUYẾT TRANH CHẤP
5.1. Hợp đồng có hiệu lực kể từ ngày ký hợp lệ (bản giấy hoặc chữ ký số theo Luật Giao dịch điện tử 2023).
5.2. Tranh chấp được giải quyết trước hết bằng thương lượng trong 30 ngày; nếu không thành sẽ đưa ra Tòa án nhân dân có thẩm quyền tại Việt Nam.

{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_saas_edu',
      code: 'HD-SAAS-EDU',
      name: 'Hợp đồng SaaS Quản lý Trung tâm Ngoại ngữ',
      category: 'saas_edu',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Trung tâm Ngoại ngữ (Bên B)', sourceHint: 'HubCW / ĐKKD' },
        { key: 'partyB.taxCode', label: 'Mã số thuế Bên B', sourceHint: 'Giấy phép ĐKKD' },
        { key: 'partyB.address', label: 'Địa chỉ Bên B', sourceHint: 'Giấy phép ĐKKD' },
        { key: 'partyB.representative', label: 'Đại diện Bên B', sourceHint: 'Giám đốc trung tâm' },
        { key: 'contractValueVnd', label: 'Giá trị hợp đồng (VNĐ)', sourceHint: 'Báo giá' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_ltm_2005', 'law_gddt_2023', 'law_shtt'],
      updatedAt: now,
      defaultBody: `HỢP ĐỒNG CUNG CẤP DỊCH VỤ PHẦN MỀM QUẢN LÝ TRUNG TÂM NGOẠI NGỮ
Số: {{CONTRACT_CODE}}

Căn cứ Bộ luật Dân sự 91/2015/QH13, Luật Thương mại 36/2005/QH11 và Luật Giao dịch điện tử 20/2023/QH15.

BÊN A (BÊN CUNG CẤP): {{PARTY_A_NAME}} — MST: {{PARTY_A_TAX}} — Đại diện: {{PARTY_A_REP}}
BÊN B (BÊN SỬ DỤNG): {{PARTY_B_NAME}} — MST: {{PARTY_B_TAX}} — Địa diện: {{PARTY_B_REP}}

Điều 1. Nội dung dịch vụ: Cung cấp phần mềm quản lý tuyển sinh CRM, xếp lịch lớp học, điểm danh, tính lương giáo viên và nhắc học phí qua Zalo OA trong thời hạn {{DURATION_MONTHS}} tháng.
Điều 2. Giá trị hợp đồng: {{CONTRACT_VALUE_VND}} VNĐ. Xuất hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP.
Điều 3. Sở hữu trí tuệ & Dữ liệu: Dữ liệu học viên thuộc quyền kiểm soát của Bên B; mã nguồn thuộc Bên A theo Luật Sở hữu trí tuệ.
Điều 4. Phạt vi phạm tối đa 8% giá trị phần nghĩa vụ vi phạm (Điều 301 Luật Thương mại 2005).
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_saas_warehouse',
      code: 'HD-SAAS-KHO',
      name: 'Hợp đồng SaaS Quản lý Kho hàng & Tồn kho',
      category: 'saas_warehouse',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Doanh nghiệp Kho (Bên B)', sourceHint: 'HubCW / ĐKKD' },
        { key: 'partyB.taxCode', label: 'Mã số thuế', sourceHint: 'ĐKKD' },
        { key: 'partyB.representative', label: 'Đại diện ký', sourceHint: 'ĐKKD' },
        { key: 'contractValueVnd', label: 'Giá trị hợp đồng (VNĐ)', sourceHint: 'Báo giá' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_ltm_2005', 'law_thue_hddt'],
      updatedAt: now,
      defaultBody: `HỢP ĐỒNG CUNG CẤP PHẦN MỀM QUẢN LÝ KHO HÀNG (WMS SAAS)
Số: {{CONTRACT_CODE}}

BÊN A: {{PARTY_A_NAME}} (MST: {{PARTY_A_TAX}}, Đại diện: {{PARTY_A_REP}})
BÊN B: {{PARTY_B_NAME}} (MST: {{PARTY_B_TAX}}, Đại diện: {{PARTY_B_REP}})

Điều 1. Phạm vi: Cấp quyền sử dụng hệ thống quản lý nhập-xuất-tồn, quét mã vạch, cảnh báo tồn kho tối thiểu trong {{DURATION_MONTHS}} tháng.
Điều 2. Phí dịch vụ: {{CONTRACT_VALUE_VND}} VNĐ.
Điều 3. Giới hạn trách nhiệm: Tổng mức bồi thường thiệt hại trực tiếp tối đa không vượt quá 100% phí dịch vụ Bên B đã thanh toán trong 12 tháng liền kề.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_web_dev',
      code: 'HD-WEB-DEV',
      name: 'Hợp đồng Thiết kế & Xây dựng Website theo yêu cầu',
      category: 'website_dev',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Khách hàng (Bên B)', sourceHint: 'HubCW' },
        { key: 'partyB.taxCode', label: 'MST / CCCD', sourceHint: 'Hồ sơ Bên B' },
        { key: 'partyB.representative', label: 'Đại diện Bên B', sourceHint: 'Hồ sơ Bên B' },
        { key: 'contractValueVnd', label: 'Giá trị hợp đồng (VNĐ)', sourceHint: 'Báo giá' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_ltm_2005', 'law_shtt'],
      updatedAt: now,
      defaultBody: `HỢP ĐỒNG THIẾT KẾ VÀ XÂY DỰNG WEBSITE
Số: {{CONTRACT_CODE}}

BÊN A (NHẬN THẦU): {{PARTY_A_NAME}} — MST: {{PARTY_A_TAX}} — Đại diện: {{PARTY_A_REP}}
BÊN B (CHỦ ĐẦU TƯ): {{PARTY_B_NAME}} — MST: {{PARTY_B_TAX}} — Đại diện: {{PARTY_B_REP}}

Điều 1. Hạng mục & Nghiệm thu: Thiết kế giao diện UI/UX, lập trình frontend/backend, tối ưu SEO kỹ thuật và bàn giao theo 03 mốc nghiệm thu.
Điều 2. Giá trị & Tiến độ thanh toán: Tổng giá trị {{CONTRACT_VALUE_VND}} VNĐ (Tạm ứng 40% - Nghiệm thu Alpha 30% - Bàn giao Production 30%).
Điều 3. Sở hữu trí tuệ (Điều 39 Luật SHTT): Quyền sử dụng giao diện & mã nguồn riêng của dự án chuyển giao cho Bên B sau khi thanh toán đủ 100%; các thư viện mã nguồn mở và framework nền tảng giữ nguyên giấy phép gốc.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_sla',
      code: 'HD-SLA',
      name: 'Phụ lục Cam kết chất lượng dịch vụ (SLA) & Bảo trì',
      category: 'sla_maintenance',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Khách hàng', sourceHint: 'Hợp đồng gốc' },
        { key: 'contractValueVnd', label: 'Phí bảo trì/năm (VNĐ)', sourceHint: 'Báo giá' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_ltm_2005'],
      updatedAt: now,
      defaultBody: `PHỤ LỤC CAM KẾT CHẤT LƯỢNG DỊCH VỤ (SLA) & BẢO TRÌ HỆ THỐNG
Số: {{CONTRACT_CODE}}

Bên A: {{PARTY_A_NAME}} | Bên B: {{PARTY_B_NAME}}
- Mức sẵn sàng (Uptime): >= 99,5%/tháng.
- Thời gian phản hồi sự cố P1 (ngừng hệ thống): <= 30 phút; khắc phục tạm thời <= 4 giờ.
- Phí bảo trì: {{CONTRACT_VALUE_VND}} VNĐ/năm.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_dpa',
      code: 'HD-DPA',
      name: 'Thỏa thuận Xử lý Dữ liệu Cá nhân (DPA)',
      category: 'dpa_privacy',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Bên Kiểm soát dữ liệu (Bên B)', sourceHint: 'Hợp đồng chính' },
      ],
      relatedLegalDocIds: ['law_dlcn_2025', 'law_nd_356_2025', 'law_mam_non'],
      updatedAt: now,
      defaultBody: `THỎA THUẬN XỬ LÝ DỮ LIỆU CÁ NHÂN (DPA)
Số: {{CONTRACT_CODE}}

Bên Kiểm soát dữ liệu (Bên B): {{PARTY_B_NAME}}
Bên Xử lý dữ liệu (Bên A): {{PARTY_A_NAME}}

1. Mục đích xử lý: Chỉ xử lý dữ liệu cá nhân theo đúng chỉ thị bằng văn bản của Bên B nhằm vận hành phần mềm.
2. Dữ liệu nhạy cảm & Dữ liệu trẻ em: Yêu cầu cơ chế xác nhận đồng ý hợp lệ của cha mẹ/người giám hộ và phân quyền tối thiểu.
3. Thông báo sự cố: Thông báo trong vòng 24–72 giờ kể từ khi phát hiện sự cố xâm phạm dữ liệu cá nhân.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_nda',
      code: 'HD-NDA',
      name: 'Thỏa thuận Bảo mật Thông tin (NDA 2 chiều)',
      category: 'nda',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Đối tác (Bên B)', sourceHint: 'ĐKKD / CCCD' },
        { key: 'partyB.representative', label: 'Đại diện Bên B', sourceHint: 'ĐKKD' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_shtt'],
      updatedAt: now,
      defaultBody: `THỎA THUẬN BẢO MẬT THÔNG TIN (NDA)
Số: {{CONTRACT_CODE}}

Bên A: {{PARTY_A_NAME}} | Bên B: {{PARTY_B_NAME}}
Hai bên cam kết giữ bí mật mã nguồn, danh sách khách hàng, chiến lược giá và tài liệu kỹ thuật trong thời hạn 03 năm kể từ ngày chấm dứt hợp tác.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_affiliate_ctv',
      code: 'HD-CTV-AFF',
      name: 'Hợp đồng Cộng tác viên / Đối tác Tiếp thị liên kết (Affiliate)',
      category: 'affiliate_ctv',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Họ tên / Đơn vị CTV (Bên B)', sourceHint: 'CCCD / ĐKKD' },
        { key: 'partyB.taxCode', label: 'Mã số thuế TNCN / CCCD', sourceHint: 'Hồ sơ CTV' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_quang_cao', 'law_tmdt_2025', 'law_thue_hddt'],
      updatedAt: now,
      defaultBody: `HỢP ĐỒNG CỘNG TÁC VIÊN TIẾP THỊ LIÊN KẾT (AFFILIATE)
Số: {{CONTRACT_CODE}}

Bên A: {{PARTY_A_NAME}} | Bên B (CTV/Đối tác): {{PARTY_B_NAME}} (MST/CCCD: {{PARTY_B_TAX}})
1. Minh bạch quảng cáo: Bên B BẮT BUỘC gắn nhãn công khai liên kết tiếp thị, không bịa trải nghiệm dùng thử hoặc thổi phồng công dụng trái Luật Quảng cáo.
2. Đối soát hoa hồng: Chỉ tính trên đơn hàng thành công (Approved/Paid), không tính đơn hủy/gian lận self-order.
3. Thuế TNCN: Bên A khấu trừ 10% thuế TNCN tại nguồn đối với thu nhập từ 2.000.000đ/lần trở lên theo quy định pháp luật thuế Việt Nam (nếu Bên B là cá nhân không xuất hóa đơn).
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_labor_service',
      code: 'HD-DV-NS',
      name: 'Hợp đồng Dịch vụ Chuyên gia / Lao động thời vụ',
      category: 'labor_service',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Họ tên Cá nhân / Nhà cung cấp', sourceHint: 'CCCD' },
        { key: 'partyB.taxCode', label: 'MST / Số CCCD', sourceHint: 'Hồ sơ' },
        { key: 'contractValueVnd', label: 'Thù lao / Mức lương (VNĐ)', sourceHint: 'Thỏa thuận' },
      ],
      relatedLegalDocIds: ['law_blld_2019', 'law_blds_2015', 'law_thue_hddt'],
      updatedAt: now,
      defaultBody: `HỢP ĐỒNG CUNG ỨNG DỊCH VỤ CHUYÊN MÔN
Số: {{CONTRACT_CODE}}

Bên A: {{PARTY_A_NAME}} | Bên B: {{PARTY_B_NAME}} (MST/CCCD: {{PARTY_B_TAX}})
1. Bản chất quan hệ: Hợp đồng dịch vụ theo Bộ luật Dân sự 2015; không phát sinh quan hệ quản lý, điều hành giờ làm hành chính như Hợp đồng lao động (tránh rủi ro bị xem xét lại theo Điều 13 BLLĐ 2019).
2. Thù lao: {{CONTRACT_VALUE_VND}} VNĐ. Thuế TNCN khấu trừ theo quy định hiện hành.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_tos_privacy',
      code: 'TOS-PP-VN',
      name: 'Điều khoản Sử dụng (ToS) & Chính sách Bảo mật Website/App',
      category: 'tos_privacy',
      version: 1,
      requiredFields: [{ key: 'partyB.name', label: 'Tên Sản phẩm / Website áp dụng', sourceHint: 'Sản phẩm' }],
      relatedLegalDocIds: ['law_bvntd_2023', 'law_dlcn_2025', 'law_ai_2025'],
      updatedAt: now,
      defaultBody: `ĐIỀU KHOẢN SỬ DỤNG & CHÍNH SÁCH BẢO MẬT DỮ LIỆU
Áp dụng cho nền tảng: {{PARTY_B_NAME}} — Đơn vị vận hành: {{PARTY_A_NAME}}

1. Minh bạch thu thập dữ liệu, mục đích xử lý, quyền rút lại sự đồng ý và quyền xóa dữ liệu của người dùng.
2. Không chứa điều khoản miễn trừ trách nhiệm trái Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15.
3. Công khai minh bạch khi nội dung/tương tác được hỗ trợ bởi AI.
{{STAMP_NOTE}}`,
    },
    {
      id: 'tpl_acceptance',
      code: 'BB-NGHIEM-THU',
      name: 'Biên bản Nghiệm thu, Thanh lý & Phụ lục Gia hạn',
      category: 'quote_acceptance_notice',
      version: 1,
      requiredFields: [
        { key: 'partyB.name', label: 'Tên Khách hàng', sourceHint: 'Hợp đồng gốc' },
        { key: 'contractValueVnd', label: 'Giá trị thanh toán nghiệm thu (VNĐ)', sourceHint: 'Hợp đồng gốc' },
      ],
      relatedLegalDocIds: ['law_blds_2015', 'law_ltm_2005', 'law_thue_hddt'],
      updatedAt: now,
      defaultBody: `BIÊN BẢN NGHIỆM THU VÀ THANH LÝ HỢP ĐỒNG
Số: {{CONTRACT_CODE}}

Bên A: {{PARTY_A_NAME}} | Bên B: {{PARTY_B_NAME}}
Hai bên thống nhất nghiệm thu hoàn thành hạng mục công việc/kích hoạt dịch vụ phần mềm. Tổng giá trị thanh toán: {{CONTRACT_VALUE_VND}} VNĐ.
{{STAMP_NOTE}}`,
    },
  ];
}
