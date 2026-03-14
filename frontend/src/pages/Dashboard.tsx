import { Video, Calendar, FileQuestion, Image, TrendingUp, Users, Star } from "lucide-react";
import {
  PageHeader,
  StatCard,
  GlassCard,
  QuickActionCard,
  SectionTitle,
  ListItem,
  InsightCard,
  IconBox,
  Badge,
} from "@/components/shared";
import { useDashboardStats } from "@/hooks/useDashboard";

export default function Dashboard() {
  const { data: dashboardStats } = useDashboardStats();

  const stats = [
    { label: "已分析视频", value: dashboardStats?.videos ?? 0, icon: Video, color: "purple" as const },
    { label: "课程序列", value: dashboardStats?.courses ?? 0, icon: Calendar, color: "green" as const },
    { label: "学员反馈", value: dashboardStats?.feedbacks ?? 0, icon: Users, color: "amber" as const },
    { label: "生成问卷", value: dashboardStats?.surveys ?? 0, icon: FileQuestion, color: "pink" as const },
  ];

  const quickActions = [
    { title: "上传新视频", description: "分析授课风格与教学理念", icon: Video, path: "/video-analysis", color: "purple" as const },
    { title: "创建课程序列", description: "规划下期主题课体式编排", icon: Calendar, path: "/course-planning", color: "green" as const },
    { title: "生成课后问卷", description: "收集学员反馈与建议", icon: FileQuestion, path: "/questionnaire", color: "amber" as const },
    { title: "处理课堂照片", description: "自动筛选并生成分享文案", icon: Image, path: "/photo-processing", color: "pink" as const },
  ];

  const recentActivity = [
    { type: "video", title: "流瑜伽主题课 - 第8期", time: "2小时前", status: "分析完成", icon: Video },
    { type: "course", title: "春季养生序列规划", time: "1天前", status: "已保存", icon: Calendar },
    { type: "questionnaire", title: "阴瑜伽体验课问卷", time: "2天前", status: "32份回复", icon: FileQuestion },
    { type: "photo", title: "周末工作坊照片", time: "3天前", status: "已发布", icon: Image },
  ];

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="欢迎回来"
        description="今天也是充满正能量的一天"
        rightContent={
          <div className="text-right">
            <p className="text-sm text-gray-500">今天</p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
            </p>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <SectionTitle>快捷操作</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.path} {...action} />
          ))}
        </div>
      </div>

      {/* Recent Activity + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <SectionTitle>最近活动</SectionTitle>
          <div className="space-y-4 mt-4">
            {recentActivity.map((activity) => (
              <ListItem
                key={activity.title}
                icon={<IconBox icon={activity.icon} size="md" color="brand" />}
                title={activity.title}
                subtitle={activity.time}
                badge={<Badge variant="success">{activity.status}</Badge>}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle>教学洞察</SectionTitle>
          <div className="space-y-4 mt-4">
            <InsightCard
              icon={TrendingUp}
              title="授课风格"
              description="您的流瑜伽序列节奏感提升了15%"
              color="purple"
            />
            <InsightCard
              icon={Star}
              title="学员反馈"
              description="体式讲解清晰度获得92%好评"
              color="green"
            />
            <InsightCard
              icon={Users}
              title="课程热度"
              description="阴瑜伽主题课最受欢迎"
              color="amber"
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
