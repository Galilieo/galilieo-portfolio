export const siteConfig = {
  name: 'Galilieo',
  title: 'Galilieo — Portfolio & Notes',
  description: 'Galilieo 的个人作品集与技术博客，记录 AI 应用开发、真实项目、实习经历和持续学习。',
  url: 'https://galilieo.heart-island.cn',
  email: 'jiangdavis021@gmail.com',
  github: 'https://github.com/Galilieo',
  heartIsland: 'https://heart-island.cn',
  defaultSeoImage: '/images/island-reference-no-heart-hd.png',
  author: {
    name: 'Galilieo',
    location: 'Shanghai, China',
    role: '软件工程专业学生 / 开发实习生',
  },
  navigation: [
    { label: '首页', href: '/' },
    { label: '关于我', href: '/#about' },
    { label: '项目', href: '/projects' },
    { label: '经历', href: '/#experience' },
    { label: '技术栈', href: '/#stack' },
    { label: '博客', href: '/notes' },
    { label: '联系', href: '/#contact' },
  ],
  socialLinks: [
    { label: 'GitHub', href: 'https://github.com/Galilieo' },
    { label: '心屿', href: 'https://heart-island.cn' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
