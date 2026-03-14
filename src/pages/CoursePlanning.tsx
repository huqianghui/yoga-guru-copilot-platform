import { useState } from "react";
import { Sparkles, Plus, Calendar, Clock, Target, Users, ChevronDown, ChevronUp } from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  FormField,
  SectionTitle,
  Badge,
} from "@/components/shared";

export default function CoursePlanning() {
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedSequence, setExpandedSequence] = useState<number | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowForm(false);
    }, 2500);
  };

  const savedSequences = [
    {
      title: "春季养生流瑜伽序列", date: "2026-03-10", duration: "60分钟", level: "中级",
      theme: "疏肝理气，舒展身心",
      poses: [
        { name: "山式", duration: "2分钟", notes: "建立觉知，调整呼吸" },
        { name: "猫牛式", duration: "3分钟", notes: "唤醒脊柱" },
        { name: "下犬式", duration: "5次呼吸", notes: "拉伸后侧链" },
        { name: "战士一式", duration: "5次呼吸/侧", notes: "建立力量" },
        { name: "战士二式", duration: "5次呼吸/侧", notes: "打开髋部" },
        { name: "三角式", duration: "5次呼吸/侧", notes: "侧弯拉伸" },
        { name: "树式", duration: "8次呼吸/侧", notes: "平衡练习" },
        { name: "鸽子式", duration: "3分钟/侧", notes: "深度开髋" },
        { name: "仰卧脊柱扭转", duration: "2分钟/侧", notes: "放松脊柱" },
        { name: "挺尸式", duration: "10分钟", notes: "完全放松" },
      ],
    },
    {
      title: "核心力量强化序列", date: "2026-03-05", duration: "45分钟", level: "中高级",
      theme: "激活核心，提升稳定性",
      poses: [
        { name: "平板支撑", duration: "1分钟", notes: "激活核心" },
        { name: "侧平板", duration: "30秒/侧", notes: "侧腹力量" },
        { name: "船式", duration: "5次呼吸 x3组", notes: "腹部力量" },
        { name: "鸟狗式", duration: "8次/侧", notes: "稳定性训练" },
        { name: "蝗虫式", duration: "5次呼吸 x3组", notes: "背部力量" },
      ],
    },
    {
      title: "阴瑜伽深度放松序列", date: "2026-02-28", duration: "75分钟", level: "全级别",
      theme: "释放深层筋膜，恢复身心",
      poses: [
        { name: "婴儿式", duration: "5分钟", notes: "进入静止状态" },
        { name: "龙式", duration: "5分钟/侧", notes: "开髋前侧" },
        { name: "天鹅式", duration: "5分钟/侧", notes: "开髋外侧" },
        { name: "毛毛虫式", duration: "5分钟", notes: "后侧链放松" },
        { name: "鞍式", duration: "5分钟", notes: "开胸开髋" },
      ],
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="课程序列规划"
        description="智能生成体式编排，让教学更专业"
        action={
          <GradientButton onClick={() => setShowForm(!showForm)}>
            <span className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              创建新序列
            </span>
          </GradientButton>
        }
      />

      {/* Create Form */}
      {showForm && (
        <GlassCard padding="lg" className="space-y-6">
          <SectionTitle>新建课程序列</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField type="input" label="课程主题" placeholder="例如：春季养生流瑜伽" />
            <FormField type="select" label="课程时长" options={["45分钟", "60分钟", "75分钟", "90分钟"]} />
            <FormField type="select" label="难度级别" options={["全级别", "初级", "中级", "中高级", "高级"]} />
            <FormField type="select" label="课程类型" options={["流瑜伽", "哈他瑜伽", "阴瑜伽", "艾扬格瑜伽", "阿斯汤加"]} />
          </div>
          <FormField type="textarea" label="课程重点" placeholder="例如：侧重开髋、加强核心力量、改善肩颈问题等" />
          <div className="flex items-center gap-4">
            <GradientButton onClick={handleGenerate} disabled={generating} fullWidth size="lg">
              <span className="flex items-center justify-center gap-2">
                <Sparkles className={`w-5 h-5 ${generating ? "animate-spin" : ""}`} />
                {generating ? "智能生成中..." : "智能生成序列"}
              </span>
            </GradientButton>
            <GradientButton variant="secondary" onClick={() => setShowForm(false)} size="lg">
              取消
            </GradientButton>
          </div>
        </GlassCard>
      )}

      {/* Saved Sequences */}
      <div className="space-y-4">
        <SectionTitle>已保存的序列</SectionTitle>
        {savedSequences.map((sequence, index) => (
          <div key={sequence.title} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-purple-50/50 to-green-50/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{sequence.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{sequence.theme}</p>
                </div>
                <button
                  onClick={() => setExpandedSequence(expandedSequence === index ? null : index)}
                  className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  {expandedSequence === index ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <Badge variant="outline"><Calendar className="w-4 h-4 text-purple-600 mr-1" />{sequence.date}</Badge>
                <Badge variant="outline"><Clock className="w-4 h-4 text-green-600 mr-1" />{sequence.duration}</Badge>
                <Badge variant="outline"><Target className="w-4 h-4 text-amber-600 mr-1" />{sequence.level}</Badge>
                <Badge variant="outline"><Users className="w-4 h-4 text-pink-600 mr-1" />{sequence.poses.length} 个体式</Badge>
              </div>
            </div>

            {expandedSequence === index && (
              <div className="p-6 space-y-3">
                {sequence.poses.map((pose, poseIndex) => (
                  <div key={pose.name} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {poseIndex + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-gray-800">{pose.name}</p>
                        <span className="text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full">{pose.duration}</span>
                      </div>
                      <p className="text-sm text-gray-600">{pose.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
