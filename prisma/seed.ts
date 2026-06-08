import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 创建默认管理员
  const hashedPassword = await bcrypt.hash('Zcw1994@0826', 10)
  await prisma.user.upsert({
    where: { username: '851371707' },
    update: {},
    create: {
      username: '851371707',
      password: hashedPassword,
    },
  })

  // 创建默认站点设置
  const settings = await prisma.siteSettings.findFirst()
  if (!settings) {
    await prisma.siteSettings.create({
      data: {
        tipButtonText: '打赏',
      },
    })
  }

  // 创建示例 Banner
  const bannerCount = await prisma.banner.count()
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: '最新热播资源，每日[更新]',
          highlightWord: '更新',
          subtitle: '精选推荐 · 一键获取',
          gradientFrom: '#D47060',
          gradientTo: '#E89080',
          buttonText: '立即查看',
          buttonLink: '/all',
          sortOrder: 1,
          isActive: true,
        },
        {
          title: '海量剧集资源，[追剧]不等待',
          highlightWord: '追剧',
          subtitle: '热门剧集每日更新',
          gradientFrom: '#D47060',
          gradientTo: '#E89080',
          buttonText: '查看排期',
          buttonLink: '/schedule',
          sortOrder: 2,
          isActive: true,
        },
      ],
    })
  }

  // 创建示例公告
  const annCount = await prisma.announcement.count()
  if (annCount === 0) {
    await prisma.announcement.create({
      data: {
        content: '欢迎来到晨光曦·分享站！资源每日更新，记得收藏本站哦~',
        isActive: true,
      },
    })
  }

  // 创建默认社交链接
  const socialCount = await prisma.socialLink.count()
  if (socialCount === 0) {
    await prisma.socialLink.createMany({
      data: [
        { name: '微博', icon: 'WB', url: '', sortOrder: 1 },
        { name: '抖音', icon: 'DY', url: '', sortOrder: 2 },
        { name: 'B站', icon: 'BL', url: '', sortOrder: 3 },
        { name: '小红书', icon: 'XHS', url: '', sortOrder: 4 },
        { name: '微信公众号', icon: 'WX', url: '', sortOrder: 5 },
      ],
    })
  }

  // 创建示例剧集
  const dramaCount = await prisma.drama.count()
  if (dramaCount === 0) {
    // 追剧日历 - 中国
    await prisma.drama.createMany({
      data: [
        {
          title: '长相思 第二季',
          slug: 'chang-xiang-si-2',
          region: '中国',
          isOnSchedule: true,
          airDays: '1,3,5',
          airTime: '20:00',
          totalEpisodes: 35,
          currentEpisode: 20,
          startDate: new Date('2026-04-01'),
          updateFrequency: '每周一三五更新',
          sortOrder: 10,
          clickCount: 850,
        },
        {
          title: '莲花楼',
          slug: 'lian-hua-lou',
          region: '中国',
          isOnSchedule: true,
          airDays: '0,2,4',
          airTime: '19:30',
          totalEpisodes: 40,
          currentEpisode: 28,
          startDate: new Date('2026-03-15'),
          updateFrequency: '每周二四六更新',
          sortOrder: 8,
          clickCount: 720,
        },
        // 泰剧
        {
          title: 'Only Friends',
          slug: 'only-friends',
          region: '泰国',
          isOnSchedule: true,
          airDays: '5',
          airTime: '22:00',
          totalEpisodes: 12,
          currentEpisode: 8,
          startDate: new Date('2026-03-01'),
          updateFrequency: '每周六更新',
          sortOrder: 9,
          clickCount: 950,
        },
        {
          title: 'My School President',
          slug: 'my-school-president',
          region: '泰国',
          isOnSchedule: true,
          airDays: '3',
          airTime: '21:30',
          totalEpisodes: 16,
          currentEpisode: 10,
          startDate: new Date('2026-02-15'),
          updateFrequency: '每周四更新',
          sortOrder: 7,
          clickCount: 680,
        },
        // 韩剧
        {
          title: '背着善宰跑',
          slug: 'beizheshanzai-pao',
          region: '韩国',
          isOnSchedule: true,
          airDays: '0,1',
          airTime: '22:30',
          totalEpisodes: 16,
          currentEpisode: 12,
          startDate: new Date('2026-04-08'),
          updateFrequency: '每周一二更新',
          sortOrder: 10,
          clickCount: 1200,
        },
        // 日剧
        {
          title: '我的美好婚事',
          slug: 'watakushi-no-yoi-koi',
          region: '日本',
          isOnSchedule: true,
          airDays: '2',
          airTime: '21:00',
          totalEpisodes: 10,
          currentEpisode: 6,
          startDate: new Date('2026-04-15'),
          updateFrequency: '每周三更新',
          sortOrder: 6,
          clickCount: 520,
        },
      ],
    })

    // 最新上线
    await prisma.drama.createMany({
      data: [
        {
          title: '以爱为营',
          slug: 'yi-ai-wei-ying',
          region: '中国',
          isNewlyAired: true,
          totalEpisodes: 30,
          currentEpisode: 30,
          isCompleted: true,
          startDate: new Date('2026-05-01'),
          sortOrder: 5,
          clickCount: 430,
        },
        {
          title: '致我们暖暖的小时光',
          slug: 'zhi-nuan-nuan',
          region: '中国',
          isNewlyAired: true,
          totalEpisodes: 24,
          currentEpisode: 6,
          startDate: new Date('2026-05-15'),
          sortOrder: 4,
          clickCount: 380,
        },
        {
          title: '2gether The Series',
          slug: '2gether',
          region: '泰国',
          isNewlyAired: true,
          totalEpisodes: 13,
          currentEpisode: 13,
          isCompleted: true,
          startDate: new Date('2026-05-10'),
          sortOrder: 6,
          clickCount: 890,
        },
      ],
    })

    // 即将上线
    await prisma.drama.createMany({
      data: [
        {
          title: '你是我的荣耀2',
          slug: 'ni-shi-wo-de-rong-yao-2',
          region: '中国',
          isUpcoming: true,
          expectedDate: new Date('2026-07-01'),
          expectedPrecision: 'month',
          totalEpisodes: 32,
          sortOrder: 5,
          clickCount: 0,
        },
        {
          title: '黑帮少爷爱上我 S2',
          slug: 'kinn-porsche-s2',
          region: '泰国',
          isUpcoming: true,
          expectedDate: new Date('2026-08-15'),
          expectedPrecision: 'day',
          totalEpisodes: 14,
          sortOrder: 8,
          clickCount: 0,
        },
        {
          title: '鱿鱼游戏 第三季',
          slug: 'squid-game-s3',
          region: '韩国',
          isUpcoming: true,
          expectedDate: new Date('2026-06-20'),
          expectedPrecision: 'day',
          totalEpisodes: 8,
          sortOrder: 10,
          clickCount: 0,
        },
      ],
    })

    // 其他地区 + 周五大量剧集
    await prisma.drama.createMany({
      data: [
        {
          title: '新加坡医生',
          slug: 'xin-jia-po-yi-sheng',
          region: '新加坡',
          isOnSchedule: true,
          airDays: '4',
          airTime: '20:00',
          totalEpisodes: 20,
          currentEpisode: 15,
          sortOrder: 3,
          clickCount: 210,
        },
        // 周五 10 部剧测试
        {
          title: '暗格里的秘密',
          slug: 'an-ge-li-de-mi-mi',
          region: '中国',
          isOnSchedule: true,
          airDays: '4',
          airTime: '18:00',
          totalEpisodes: 24,
          currentEpisode: 18,
          sortOrder: 7,
          clickCount: 650,
        },
        {
          title: '致我们单纯的小美好 第二季',
          slug: 'xiao-mei-hao-2',
          region: '中国',
          isOnSchedule: true,
          airDays: '4',
          airTime: '19:00',
          totalEpisodes: 30,
          currentEpisode: 22,
          sortOrder: 8,
          clickCount: 780,
        },
        {
          title: '假偶天成',
          slug: '2gether-the-series',
          region: '泰国',
          isOnSchedule: true,
          airDays: '4',
          airTime: '20:30',
          totalEpisodes: 13,
          currentEpisode: 9,
          sortOrder: 9,
          clickCount: 1100,
        },
        {
          title: '语义错误',
          slug: 'semantic-error',
          region: '韩国',
          isOnSchedule: true,
          airDays: '4',
          airTime: '21:00',
          totalEpisodes: 8,
          currentEpisode: 5,
          sortOrder: 6,
          clickCount: 920,
        },
        {
          title: '美丽的他',
          slug: 'utsukushii-kare',
          region: '日本',
          isOnSchedule: true,
          airDays: '4',
          airTime: '22:00',
          totalEpisodes: 12,
          currentEpisode: 10,
          sortOrder: 5,
          clickCount: 870,
        },
        {
          title: '匆匆心动',
          slug: 'cong-cong-xin-dong',
          region: '中国',
          isOnSchedule: true,
          airDays: '4',
          airTime: '19:30',
          totalEpisodes: 20,
          currentEpisode: 20,
          isCompleted: true,
          sortOrder: 4,
          clickCount: 450,
        },
        {
          title: '以你的心诠释我的爱',
          slug: 'bkpp-the-series',
          region: '泰国',
          isOnSchedule: true,
          airDays: '4',
          airTime: '21:30',
          totalEpisodes: 5,
          currentEpisode: 3,
          sortOrder: 10,
          clickCount: 1300,
        },
        {
          title: '消失的初恋',
          slug: 'kieta-hatsukoi',
          region: '日本',
          isOnSchedule: true,
          airDays: '4',
          airTime: '23:00',
          totalEpisodes: 10,
          currentEpisode: 7,
          sortOrder: 3,
          clickCount: 560,
        },
        {
          title: '大叔的爱',
          slug: 'ossans-love',
          region: '日本',
          isOnSchedule: true,
          airDays: '4',
          airTime: '22:30',
          totalEpisodes: 8,
          currentEpisode: 8,
          isCompleted: true,
          sortOrder: 2,
          clickCount: 340,
        },
      ],
    })

    console.log(`Created ${await prisma.drama.count()} dramas`)
  }

  console.log('Seed data created successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
