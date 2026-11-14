import { DepartmentId } from '../types';

export interface DepartmentMeta {
  id: DepartmentId;
  name: string;
  shortName: string;
  floor: 1 | 2;
  color: string;
  bgTint: string;
  badgeText: string;
  description: string;
}

export interface RoomMeta {
  id: string;
  name: string;
  shortName: string;
  department: DepartmentId | 'shared';
  floor: 1 | 2;
  center: [number, number, number];
  size: [number, number]; // width (x), depth (z)
  cameraOffset: [number, number, number];
  color: string;
  subtitle: string;
}

export const DEPARTMENTS: Record<DepartmentId, DepartmentMeta> = {
  exec: {
    id: 'exec',
    name: 'Ban Giám đốc',
    shortName: 'Giám đốc',
    floor: 2,
    color: '#F59E0B',
    bgTint: 'rgba(245, 158, 11, 0.14)',
    badgeText: 'Tầng 2',
    description: 'Điều hành chiến lược, Thư ký CEO & COO điều phối liên phòng ban.',
  },
  marketing: {
    id: 'marketing',
    name: 'Phòng Marketing',
    shortName: 'Marketing',
    floor: 2,
    color: '#EC4899',
    bgTint: 'rgba(236, 72, 153, 0.14)',
    badgeText: 'Tầng 2',
    description: 'Nghiên cứu thị trường, nội dung, SEO, Social, Ads & Thiết kế.',
  },
  sales: {
    id: 'sales',
    name: 'Phòng Sales Tự Chủ',
    shortName: 'Sales',
    floor: 1,
    color: '#10B981',
    bgTint: 'rgba(16, 185, 129, 0.14)',
    badgeText: 'Tầng 1',
    description: 'Đội chủ lực: Lead Hunter, Account Provisioning, SDR, AE & Pricing.',
  },
  cs: {
    id: 'cs',
    name: 'Customer Success',
    shortName: 'CSKH',
    floor: 1,
    color: '#06B6D4',
    bgTint: 'rgba(6, 182, 212, 0.14)',
    badgeText: 'Tầng 1',
    description: 'Tổng đài hỗ trợ, Onboarding triển khai & Giữ chân khách hàng.',
  },
  product: {
    id: 'product',
    name: 'Product & Engineering',
    shortName: 'Product',
    floor: 2,
    color: '#6366F1',
    bgTint: 'rgba(99, 102, 241, 0.14)',
    badgeText: 'Tầng 2',
    description: 'PM, Tech Lead, Developer & QA hoàn thiện giải pháp và demo.',
  },
  data: {
    id: 'data',
    name: 'Data & Analytics',
    shortName: 'Data KPI',
    floor: 2,
    color: '#3B82F6',
    bgTint: 'rgba(59, 130, 246, 0.14)',
    badgeText: 'Tầng 2',
    description: 'Phân tích số liệu phễu bán hàng, doanh thu và chi phí token.',
  },
  backoffice: {
    id: 'backoffice',
    name: 'Tài chính – Pháp chế – NS',
    shortName: 'Tài chính',
    floor: 2,
    color: '#8B5CF6',
    bgTint: 'rgba(139, 92, 246, 0.14)',
    badgeText: 'Tầng 2',
    description: 'Kiểm soát ngân sách, hợp đồng pháp lý và nhân sự RBAC.',
  },
  reception: {
    id: 'reception',
    name: 'Sảnh & Lễ tân',
    shortName: 'Lễ tân',
    floor: 1,
    color: '#F97316',
    bgTint: 'rgba(249, 115, 22, 0.14)',
    badgeText: 'Tầng 1',
    description: 'Tiếp đón khách tham quan, phân luồng thông tin vào công ty.',
  },
};

/**
 * Compact 26m x 18m 2-floor building layout (X in [-13, 13], Z in [-9, 9], corridor Z in [-1.2, 1.2])
 * Floor 1 y = 0, Floor 2 y = 3.8
 */
export const ROOMS: RoomMeta[] = [
  // Tầng 1 (y = 0)
  {
    id: 'room-reception',
    name: 'Sảnh & Lễ tân',
    shortName: 'Lễ tân',
    department: 'reception',
    floor: 1,
    center: [-9.0, 0, 5.1],
    size: [8.0, 7.8],
    cameraOffset: [-2.0, 7.5, 13.5],
    color: '#F97316',
    subtitle: 'Tầng 1 · Tiếp đón',
  },
  {
    id: 'room-sales',
    name: 'Phòng Sales (Trung tâm)',
    shortName: 'Sales',
    department: 'sales',
    floor: 1,
    center: [4.0, 0, 5.1],
    size: [18.0, 7.8],
    cameraOffset: [12.5, 9.5, 14.5],
    color: '#10B981',
    subtitle: 'Tầng 1 · 8 chuyên viên AI',
  },
  {
    id: 'room-cs',
    name: 'Customer Success & Tổng đài',
    shortName: 'CSKH',
    department: 'cs',
    floor: 1,
    center: [-7.25, 0, -5.1],
    size: [11.5, 7.8],
    cameraOffset: [1.5, 8.2, 3.8],
    color: '#06B6D4',
    subtitle: 'Tầng 1 · Tổng đài CSKH',
  },
  {
    id: 'room-meeting',
    name: 'Phòng Họp Lớn',
    shortName: 'Phòng Họp',
    department: 'shared',
    floor: 1,
    center: [5.75, 0, -5.1],
    size: [14.5, 7.8],
    cameraOffset: [14.0, 8.8, 4.2],
    color: '#EAB308',
    subtitle: 'Tầng 1 · Họp liên phòng ban',
  },
  // Tầng 2 (y = 3.8)
  {
    id: 'room-exec',
    name: 'Phòng Giám đốc & Thư ký',
    shortName: 'Giám đốc',
    department: 'exec',
    floor: 2,
    center: [-8.5, 3.8, -5.1],
    size: [9.0, 7.8],
    cameraOffset: [-0.5, 11.8, 3.8],
    color: '#F59E0B',
    subtitle: 'Tầng 2 · CEO & Thư ký',
  },
  {
    id: 'room-marketing',
    name: 'Phòng Marketing',
    shortName: 'Marketing',
    department: 'marketing',
    floor: 2,
    center: [4.5, 3.8, -5.1],
    size: [17.0, 7.8],
    cameraOffset: [13.5, 13.0, 4.5],
    color: '#EC4899',
    subtitle: 'Tầng 2 · Bảng ý tưởng & Growth',
  },
  {
    id: 'room-product',
    name: 'Product & Engineering',
    shortName: 'Product',
    department: 'product',
    floor: 2,
    center: [-8.5, 3.8, 5.1],
    size: [9.0, 7.8],
    cameraOffset: [-0.5, 11.8, 13.5],
    color: '#6366F1',
    subtitle: 'Tầng 2 · PM, Tech Lead, Dev, QA',
  },
  {
    id: 'room-data',
    name: 'Data & Analytics (KPI)',
    shortName: 'Data KPI',
    department: 'data',
    floor: 2,
    center: [-0.25, 3.8, 5.1],
    size: [7.5, 7.8],
    cameraOffset: [6.8, 11.4, 13.0],
    color: '#3B82F6',
    subtitle: 'Tầng 2 · Màn hình KPI trực tiếp',
  },
  {
    id: 'room-backoffice',
    name: 'Tài chính – Pháp chế – NS',
    shortName: 'Tài chính',
    department: 'backoffice',
    floor: 2,
    center: [8.25, 3.8, 5.1],
    size: [9.5, 7.8],
    cameraOffset: [15.5, 11.8, 13.5],
    color: '#8B5CF6',
    subtitle: 'Tầng 2 · CFO, Legal, HR',
  },
];
