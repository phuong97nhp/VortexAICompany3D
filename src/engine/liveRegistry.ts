import { AGENTS as SEED_AGENTS } from '../agents';
import { DEPARTMENTS as SEED_DEPARTMENTS, ROOMS as SEED_ROOMS } from '../config/departments';
import { AgentProfile, DepartmentConfig, DepartmentId } from '../types';

type RegistryProvider = {
  getAgents: () => AgentProfile[];
  getDepartments: () => DepartmentConfig[];
};

let provider: RegistryProvider | null = null;

export function registerLiveRegistry(p: RegistryProvider) {
  provider = p;
}

export function buildSeedDepartments(): DepartmentConfig[] {
  return Object.values(SEED_DEPARTMENTS).map((d) => {
    const room = SEED_ROOMS.find((r) => r.department === d.id) || SEED_ROOMS[0];
    return {
      id: d.id,
      name: d.name,
      shortName: d.shortName,
      floor: d.floor,
      color: d.color,
      bgTint: d.bgTint,
      badgeText: d.badgeText,
      description: d.description,
      roomId: room.id,
      roomCenter: [...room.center] as [number, number, number],
      roomSize: [...room.size] as [number, number],
      cameraOffset: [...room.cameraOffset] as [number, number, number],
      isCustom: false,
      collapsed: false,
    };
  });
}

export function buildSeedAgents(): AgentProfile[] {
  const now = Date.now();
  const femaleIds = new Set([
    'secretary',
    'cmo',
    'content_writer',
    'social_media',
    'designer',
    'sdr_1',
    'pricing_proposal',
    'support_agent',
    'onboarding_specialist',
    'cfo',
    'hr',
    'receptionist',
    'legal_researcher',
    'compliance_reviewer',
    'dpo_agent',
    'aff_scout_home',
    'aff_audience',
    'aff_review',
    'aff_seo',
    'aff_channel',
    'aff_community',
    'aff_compliance',
  ]);
  return SEED_AGENTS.map((a) => ({
    ...a,
    gender: a.gender || (femaleIds.has(a.id) ? 'female' : 'male'),
    employmentStatus: 'active',
    providerOverride: 'company_default',
    sleepWhenIdle: false,
    reportsTo:
      a.department === 'exec'
        ? 'ceo'
        : a.role === 'Dept Head'
        ? 'secretary'
        : a.department === 'sales'
        ? 'sales_director'
        : a.department === 'marketing'
        ? 'cmo'
        : a.department === 'cs'
        ? 'support_lead'
        : a.department === 'product'
        ? 'pm'
        : a.department === 'backoffice'
        ? 'cfo'
        : a.department === 'legal'
        ? 'legal'
        : String(a.department).startsWith('aff_')
        ? 'aff_manager'
        : 'secretary',
    createdAt: now,
    updatedAt: now,
  }));
}

export function getLiveAgents(includeArchived = false): AgentProfile[] {
  const list = provider ? provider.getAgents() : buildSeedAgents();
  if (includeArchived) return list;
  return list.filter((a) => a.employmentStatus !== 'archived');
}

export function getLiveAgentById(id: string): AgentProfile | undefined {
  const list = provider ? provider.getAgents() : buildSeedAgents();
  return list.find((a) => a.id === id);
}

export function getLiveDepartments(): DepartmentConfig[] {
  return provider ? provider.getDepartments() : buildSeedDepartments();
}

export function getLiveDepartmentById(id: DepartmentId): DepartmentConfig | undefined {
  return getLiveDepartments().find((d) => d.id === id);
}
