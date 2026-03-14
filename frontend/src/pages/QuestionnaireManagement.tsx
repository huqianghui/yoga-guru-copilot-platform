import { useState } from "react";
import { Plus, FileQuestion, Send, MessageSquare, TrendingUp, Star, Users } from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  StatCard,
  SectionTitle,
  FormField,
  Badge,
} from "@/components/shared";

export default function QuestionnaireManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<number | null>(null);

  const questionnaires = [
    {
      title: "阴瑜伽体验课反馈", date: "2026-03-12", responses: 32,
      questions: ["今天的练习中，哪个体式让你感受最深？", "课程节奏是否适合你？", "希望在下次课程中加入什么内容？"],
      feedback: [
        { question: 0, answer: "鸽子式让我的髋部得到了很好的放松", satisfaction: 5 },
        { question: 1, answer: "节奏很舒适，适合放松", satisfaction: 5 },
        { question: 2, answer: "希望能多一些肩颈放松的练习", satisfaction: 4 },
      ],
    },
    {
      title: "流瑜伽主题课问卷", date: "2026-03-08", responses: 28,
      questions: ["本节课的体式编排是否流畅？", "口令引导是否清晰易懂？"],
      feedback: [
        { question: 0, answer: "编排很流畅，整体感觉很好", satisfaction: 5 },
        { question: 1, answer: "口令清晰，跟随起来很轻松", satisfaction: 5 },
      ],
    },
    {
      title: "核心力量课程反馈", date: "2026-03-05", responses: 24,
      questions: ["课程强度如何？", "是否感受到核心力量的提升？", "有什么改进建议？"],
      feedback: [
        { question: 0, answer: "强度适中，有挑战性但不会太难", satisfaction: 4 },
        { question: 1, answer: "能明显感觉到核心在发力", satisfaction: 5 },
        { question: 2, answer: "希望能加入更多变体选择", satisfaction: 4 },
      ],
    },
  ];

  const generateReply = (feedback: string) => {
    return `感谢你的真诚反馈！很高兴听到${feedback.includes("好") || feedback.includes("舒适") ? "你有这样美好的体验" : "你的宝贵建议"}。我会继续优化课程内容，为大家带来更好的练习体验。期待下次课上见到你！`;
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="问卷管理"
        description="收集学员反馈，持续优化教学质量"
        action={
          <GradientButton onClick={() => setShowCreateForm(!showCreateForm)}>
            <span className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              创建问卷
            </span>
          </GradientButton>
        }
      />

      {/* Create Form */}
      {showCreateForm && (
        <GlassCard padding="lg" className="space-y-6">
          <SectionTitle>智能生成课后问卷</SectionTitle>
          <FormField type="select" label="选择课程" options={["春季养生流瑜伽序列", "核心力量强化序列", "阴瑜伽深度放松序列"]} />

          <div className="p-6 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 border border-purple-200/30">
            <p className="text-sm text-gray-700 mb-4">系统将根据课程内容自动生成不超过3个问题的问卷，帮助你快速收集学员反馈。</p>
            <div className="space-y-3">
              {["今天的练习中，哪个体式让你感受最深？", "课程节奏是否适合你？", "希望在下次课程中加入什么内容？"].map((q, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/70">
                  <p className="text-sm font-medium text-gray-800">建议问题 {i + 1}</p>
                  <p className="text-sm text-gray-600 mt-1">{q}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <GradientButton fullWidth size="lg">
              <span className="flex items-center justify-center gap-2">
                <Send className="w-5 h-5" />
                创建并发送问卷
              </span>
            </GradientButton>
            <GradientButton variant="secondary" onClick={() => setShowCreateForm(false)} size="lg">
              取消
            </GradientButton>
          </div>
        </GlassCard>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="总问卷数" value="24" icon={FileQuestion} color="purple" />
        <StatCard label="总反馈数" value="156" icon={MessageSquare} color="green" />
        <StatCard label="平均满意度" value="4.7" icon={Star} color="amber" />
      </div>

      {/* Questionnaires */}
      <div className="space-y-4">
        <SectionTitle>问卷列表</SectionTitle>
        {questionnaires.map((q, index) => (
          <div key={q.title} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-purple-50/50 to-green-50/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{q.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <Badge variant="outline"><FileQuestion className="w-4 h-4 mr-1" />{q.questions.length} 个问题</Badge>
                    <Badge variant="outline"><Users className="w-4 h-4 mr-1" />{q.responses} 份回复</Badge>
                    <span>{q.date}</span>
                  </div>
                </div>
                <GradientButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedQuestionnaire(selectedQuestionnaire === index ? null : index)}
                >
                  {selectedQuestionnaire === index ? "收起" : "查看反馈"}
                </GradientButton>
              </div>
              <div className="space-y-2">
                {q.questions.map((question, qIndex) => (
                  <div key={qIndex} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="font-medium">{qIndex + 1}.</span>
                    <span>{question}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedQuestionnaire === index && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800">学员反馈示例</h4>
                  <Badge variant="success"><TrendingUp className="w-4 h-4 mr-1" />平均满意度: 4.6/5</Badge>
                </div>
                {q.feedback.map((fb, fbIndex) => (
                  <div key={fbIndex} className="p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">问题 {fb.question + 1}</p>
                      <p className="text-sm font-medium text-gray-800 mb-2">{q.questions[fb.question]}</p>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{fb.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < fb.satisfaction ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-purple-200/30">
                      <p className="text-xs text-gray-600 mb-2">建议回复文案：</p>
                      <div className="p-3 rounded-lg bg-white/70 text-sm text-gray-700 italic">{generateReply(fb.answer)}</div>
                      <button className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium cursor-pointer">编辑并发送</button>
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
