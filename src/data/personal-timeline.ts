export interface PersonalTimelineEntry {
  id: string;
  dateTime: string;
  period: string;
  phase: string;
  title: string;
  description: string;
  href: string;
  destination: string;
}

export const personalTimeline: PersonalTimelineEntry[] = [
  {
    id: 'ai-product-internship',
    dateTime: '2026-06',
    period: '2026.06 — 至今',
    phase: '03 / Practice',
    title: 'AI 产品开发实习',
    description: '参与跨平台 AI 聊天产品的页面维护、问题排查、移动端适配与自测协作。',
    href: '/projects/ai-chat-app/',
    destination: '查看实习项目',
  },
  {
    id: 'heart-island',
    dateTime: '2026-04',
    period: '2026.04 — 至今',
    phase: '02 / Building',
    title: '持续开发「心屿」',
    description: '围绕情绪记录、AI 回复、社区互动和长期记忆逐步构建个人长期项目。',
    href: '/projects/heart-island/',
    destination: '查看心屿项目',
  },
  {
    id: 'software-engineering',
    dateTime: '2024-09',
    period: '2024.09 — 至今',
    phase: '01 / Learning',
    title: '软件工程学习',
    description: '从前后端基础出发，持续理解页面、接口、数据与交付之间的完整关系。',
    href: '/campus/',
    destination: '查看在校经历',
  },
];
