import { getLiveDepartmentById } from './liveRegistry';
import {
  AccessoryId,
  AgentAppearance,
  AgentProfile,
  HairStyleId,
  OutfitStyleId,
} from '../types';

export const HAIR_STYLES: Array<{ id: HairStyleId; label: string }> = [
  { id: 'short_neat', label: 'Tóc ngắn gọn' },
  { id: 'side_part', label: 'Rẽ ngôi lịch lãm' },
  { id: 'bob', label: 'Tóc Bob trẻ trung' },
  { id: 'ponytail', label: 'Buộc đuôi ngựa' },
  { id: 'curly', label: 'Tóc xoăn bồng' },
  { id: 'spiky', label: 'Tóc dựng năng động' },
  { id: 'bun', label: 'Búi củ tỏi' },
  { id: 'long_wave', label: 'Tóc dài uốn sóng' },
  { id: 'undercut', label: 'Undercut hiện đại' },
  { id: 'cap_hat', label: 'Đội mũ lưỡi trai' },
];

export const SKIN_TONES = [
  '#FDE2C8',
  '#F7CFA8',
  '#EBB88E',
  '#D99B6C',
  '#FFE6D5',
];

export const HAIR_COLORS = [
  '#1E293B',
  '#3B2314',
  '#5C3317',
  '#111827',
  '#7C2D12',
  '#9A3412',
  '#4338CA',
  '#831843',
];

export const OUTFIT_STYLES: Array<{ id: OutfitStyleId; label: string }> = [
  { id: 'shirt', label: 'Sơ mi công sở' },
  { id: 'vest', label: 'Áo Vest lãnh đạo' },
  { id: 'hoodie', label: 'Áo Hoodie tech' },
  { id: 'casual', label: 'Áo thun đồng phục' },
];

export const ACCESSORIES: Array<{ id: AccessoryId; label: string }> = [
  { id: 'none', label: 'Không phụ kiện' },
  { id: 'glasses', label: 'Kính tri thức' },
  { id: 'headset', label: 'Tai nghe tổng đài/SDR' },
  { id: 'tie', label: 'Cà vạt' },
  { id: 'beret', label: 'Mũ nghệ sĩ Beret' },
  { id: 'badge', label: 'Thẻ nhân viên' },
  { id: 'backpack', label: 'Ba lô' },
];

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getDefaultAppearance(agent: AgentProfile): AgentAppearance {
  const seed = hashSeed(agent.id);
  const deptColor = getLiveDepartmentById(agent.department)?.color || agent.avatarColor;

  let hairStyle = HAIR_STYLES[seed % HAIR_STYLES.length].id;
  let outfitStyle: OutfitStyleId = 'shirt';
  let accessory: AccessoryId = 'badge';

  // Role-authentic defaults
  if (agent.id === 'secretary') {
    hairStyle = 'bun';
    outfitStyle = 'vest';
    accessory = 'glasses';
  } else if (agent.id === 'coo' || agent.id === 'sales_director' || agent.id === 'cfo') {
    outfitStyle = 'vest';
    accessory = 'tie';
  } else if (agent.id === 'developer' || agent.id === 'tech_lead' || agent.id === 'qa_engineer') {
    outfitStyle = 'hoodie';
    accessory = agent.id === 'tech_lead' ? 'glasses' : 'backpack';
  } else if (agent.id === 'designer') {
    hairStyle = 'long_wave';
    outfitStyle = 'casual';
    accessory = 'beret';
  } else if (agent.department === 'cs' || agent.id.startsWith('sdr_')) {
    outfitStyle = 'shirt';
    accessory = 'headset';
  } else if (agent.id === 'data_analyst' || agent.id === 'legal') {
    outfitStyle = 'shirt';
    accessory = 'glasses';
  } else if (agent.id.startsWith('lead_hunter')) {
    hairStyle = 'cap_hat';
    outfitStyle = 'casual';
    accessory = 'backpack';
  } else if (agent.id === 'cmo' || agent.id === 'content_writer' || agent.id === 'social_media') {
    hairStyle = seed % 2 === 0 ? 'bob' : 'ponytail';
    outfitStyle = 'casual';
  }

  return {
    agentId: agent.id,
    hairStyle,
    hairColor: HAIR_COLORS[seed % HAIR_COLORS.length],
    skinTone: SKIN_TONES[(seed >> 3) % SKIN_TONES.length],
    outfitStyle,
    outfitColor: agent.avatarColor || deptColor,
    outfitAccent: agent.accentColor,
    pantsColor: seed % 3 === 0 ? '#1E293B' : seed % 3 === 1 ? '#334155' : '#0F172A',
    accessory,
    useUniform: true,
    logoPlacement: 'chest',
    showBadge: true,
  };
}

export function generateRandomAppearance(agentId: string, baseDeptColor: string): AgentAppearance {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    agentId,
    hairStyle: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS),
    skinTone: pick(SKIN_TONES),
    outfitStyle: pick(OUTFIT_STYLES).id,
    outfitColor: baseDeptColor,
    outfitAccent: '#F8FAFC',
    pantsColor: pick(['#1E293B', '#334155', '#0F172A', '#312E81']),
    accessory: pick(ACCESSORIES).id,
    useUniform: true,
    logoPlacement: 'chest',
    showBadge: true,
  };
}
