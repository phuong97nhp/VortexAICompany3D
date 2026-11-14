import { getAgentById } from '../agents';
import { PRODUCTS } from '../config/products';

export interface MockLlmInput {
  agentId: string;
  userPrompt: string;
  model: 'deepseek-chat' | 'deepseek-reasoner';
  hasTools?: boolean;
}

export interface MockToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MockLlmOutput {
  content: string;
  reasoningContent?: string;
  toolCalls?: MockToolCall[];
}

export function runMockVietnameseLlm(input: MockLlmInput): MockLlmOutput {
  const agent = getAgentById(input.agentId);
  const lower = input.userPrompt.toLowerCase();
  const product =
    PRODUCTS.find((p) => lower.includes(p.shortName.toLowerCase()) || lower.includes(p.id)) ||
    PRODUCTS[0];

  if (input.model === 'deepseek-reasoner') {
    return {
      content: `Kế hoạch hành động cho ${agent?.name || input.agentId}:
1. Phân tích mục tiêu CEO giao liên quan đến ${product.name}.
2. Điều phối đúng phòng ban phụ trách, giữ tuân thủ RBAC và hạn mức an toàn.
3. Thực thi bước gọi công cụ và báo cáo kết quả cụ thể bằng số liệu.`,
      reasoningContent: `Đánh giá ngữ cảnh yêu cầu: "${input.userPrompt.slice(0, 120)}". Ưu tiên phân khúc khách hàng mục tiêu ${product.targetAudience[0]}. Đảm bảo mọi hành động ra ngoài tuân thủ DRY_RUN và mức tự chủ hiện tại.`,
    };
  }

  // Context-aware Vietnamese responses per agent role
  if (input.agentId === 'secretary') {
    if (lower.includes('họp') || lower.includes('/hop')) {
      return {
        content:
          'Dạ thưa Chủ tịch, em đã triệu tập ngay cuộc họp liên phòng ban tại Phòng Họp Lớn (Tầng 1). Các trưởng phòng Marketing, Sales, Product, CS và Tài chính đang di chuyển tới bàn họp ạ.',
      };
    }
    if (lower.includes('báo cáo') || lower.includes('/bao-cao') || lower.includes('kpi')) {
      return {
        content:
          'Dạ em đã yêu cầu Data Analyst (Lý Hoàng Nam) trích xuất số liệu thực từ DB và tổng hợp báo cáo điều hành gửi Chủ tịch ngay sau đây.',
      };
    }
    return {
      content: `Dạ thưa Chủ tịch, em (**Nguyễn Minh Anh – Thư ký CEO**) đã tiếp nhận chỉ đạo: *"${input.userPrompt.slice(0, 100)}"*.\n\nEm đã lập kế hoạch phân công:\n- **Phòng Marketing (CMO Lê Thảo Vy)**: Chuẩn hóa thông điệp & bộ nội dung cho **${product.shortName}**.\n- **Phòng Sales (GĐ Nguyễn Hoàng Long)**: Rà soát phễu Lead và ưu tiên tiếp cận khách hàng mục tiêu.\n- **Data & Tài chính**: Theo dõi tỉ lệ chuyển đổi & kiểm soát ngân sách token.\n\nChủ tịch có thể theo dõi luồng công việc trên Task Board hoặc xem các nhân sự di chuyển trong văn phòng 3D.`,
    };
  }

  if (input.agentId === 'sales_director') {
    return {
      content: `Báo cáo từ **Nguyễn Hoàng Long (Sales Director)**:\n- Đã rà soát pipeline cho **${product.shortName}**.\n- Giao Lead Hunter (Trịnh Gia Huy & Kiều Xuân Bách) tìm thêm khách hàng tiềm năng tại TP.HCM, Hà Nội, Đà Nẵng.\n- SDR tuân thủ khung giờ 8h–20h, giới hạn ngày và gắn câu hủy nhận tin theo Nghị định 91/2020.`,
    };
  }

  if (input.agentId === 'cmo') {
    return {
      content: `**Lê Thảo Vy (CMO)** đã hoàn tất khung chiến dịch 30 ngày cho **${product.shortName}**:\n- Định vị thông điệp: *${product.tagline}*\n- Phân bổ kênh: SEO Google (40%), Facebook/Zalo Lead Ads (35%), Content & Case study (25%).\n- Đã giao các chuyên viên triển khai và trình duyệt bài đăng công khai lên Chủ tịch.`,
    };
  }

  if (input.agentId === 'account_provisioning') {
    return {
      content:
        'Em (**Lương Thế Vinh – Account Provisioning**) đã kiểm tra trạng thái tài khoản qua Playbook chuẩn. Lưu ý: mọi mật khẩu được mã hóa AES-256-GCM trong Vault ở `/worker`, không bao giờ hiển thị lên chat. Nếu gặp CAPTCHA/OTP, em sẽ dừng lại và gọi `ask_ceo` qua Zalo.',
    };
  }

  if (input.agentId === 'cfo') {
    return {
      content:
        'Báo cáo tài chính từ **Đoàn Thu Trang (CFO)**: Ngân sách token và chi phí chiến dịch đang nằm trong ngưỡng an toàn. Mọi khoản chi vượt định mức hoặc giảm giá ngoài bảng giá niêm yết đều đã chuyển vào mục **Phê duyệt** chờ Chủ tịch ký.',
    };
  }

  if (input.agentId === 'data_analyst') {
    return {
      content:
        'Số liệu từ **Lý Hoàng Nam (Data Analyst)** đã được cập nhật lên Màn hình KPI Lớn (Tầng 2) và Dashboard Báo cáo. Chủ tịch có thể nhấn vào phòng **Data & Analytics** để quan sát trực tiếp.',
    };
  }

  return {
    content: `**${agent?.name || input.agentId} (${agent?.title || 'AI Agent'})** đã tiếp nhận yêu cầu và xử lý xong phần việc chuyên môn liên quan đến **${product.shortName}**. Kết quả đã được ghi nhận vào hệ thống và bộ nhớ phòng ban.`,
  };
}
