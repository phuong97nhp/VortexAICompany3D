import { AgentProfile } from '../types';
import { secretaryAgent } from './secretary';
import { cooAgent } from './coo';
import { cmoAgent } from './cmo';
import { marketResearchAgent } from './market_research';
import { contentWriterAgent } from './content_writer';
import { seoSpecialistAgent } from './seo_specialist';
import { socialMediaAgent } from './social_media';
import { adsSpecialistAgent } from './ads_specialist';
import { designerAgent } from './designer';
import { salesDirectorAgent } from './sales_director';
import { leadHunterEduAgent } from './lead_hunter_edu';
import { leadHunterSmbAgent } from './lead_hunter_smb';
import { accountProvisioningAgent } from './account_provisioning';
import { sdr1Agent } from './sdr_1';
import { sdr2Agent } from './sdr_2';
import { accountExecutiveAgent } from './account_executive';
import { pricingProposalAgent } from './pricing_proposal';
import { supportLeadAgent } from './support_lead';
import { supportAgent } from './support_agent';
import { onboardingSpecialistAgent } from './onboarding_specialist';
import { retentionUpsellAgent } from './retention_upsell';
import { pmAgent } from './pm';
import { techLeadAgent } from './tech_lead';
import { developerAgent } from './developer';
import { qaEngineerAgent } from './qa_engineer';
import { dataAnalystAgent } from './data_analyst';
import { cfoAgent } from './cfo';
import { legalAgent } from './legal';
import { hrAgent } from './hr';
import { receptionistAgent } from './receptionist';

export const AGENTS: AgentProfile[] = [
  secretaryAgent,
  cooAgent,
  cmoAgent,
  marketResearchAgent,
  contentWriterAgent,
  seoSpecialistAgent,
  socialMediaAgent,
  adsSpecialistAgent,
  designerAgent,
  salesDirectorAgent,
  leadHunterEduAgent,
  leadHunterSmbAgent,
  accountProvisioningAgent,
  sdr1Agent,
  sdr2Agent,
  accountExecutiveAgent,
  pricingProposalAgent,
  supportLeadAgent,
  supportAgent,
  onboardingSpecialistAgent,
  retentionUpsellAgent,
  pmAgent,
  techLeadAgent,
  developerAgent,
  qaEngineerAgent,
  dataAnalystAgent,
  cfoAgent,
  legalAgent,
  hrAgent,
  receptionistAgent,
];

export const AGENT_MAP: Record<string, AgentProfile> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
);

export const getAgentById = (id: string): AgentProfile | undefined => AGENT_MAP[id];
