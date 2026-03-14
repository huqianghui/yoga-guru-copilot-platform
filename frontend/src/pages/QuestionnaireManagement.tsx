import { useState } from "react";
import {
  Plus,
  FileQuestion,
  Send,
  MessageSquare,
  Star,
  Users,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  StatCard,
  SectionTitle,
  FormField,
  Badge,
} from "@/components/shared";
import {
  useSurveys,
  useCreateSurvey,
  useDeleteSurvey,
  useGenerateQuestions,
} from "@/hooks/useSurveys";
import type { SurveyQuestion } from "@/types/survey";

export default function QuestionnaireManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseStyle, setCourseStyle] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<SurveyQuestion[]>([]);

  const { data: surveys, isLoading } = useSurveys();
  const createMutation = useCreateSurvey();
  const deleteMutation = useDeleteSurvey();
  const generateMutation = useGenerateQuestions();

  const resetForm = () => {
    setTitle("");
    setCourseTitle("");
    setCourseStyle("");
    setGeneratedQuestions([]);
  };

  const handleGenerateQuestions = async () => {
    try {
      const result = await generateMutation.mutateAsync({
        course_title: courseTitle || "瑜伽课程",
        course_style: courseStyle,
      });
      try {
        const content = result.generated_content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setGeneratedQuestions(
            parsed.map((q: { text: string; type?: string }) => ({
              text: q.text,
              question_type: q.type || "text",
            }))
          );
          if (!title) {
            setTitle(`${courseTitle || "瑜伽课程"}课后反馈`);
          }
        }
      } catch {
        console.warn("Failed to parse AI response as questions");
      }
    } catch {
      console.error("Failed to generate questions");
    }
  };

  const handleCreate = async () => {
    if (!title || generatedQuestions.length === 0) return;
    try {
      await createMutation.mutateAsync({
        title,
        description: `关于${courseTitle || "瑜伽课程"}的课后反馈问卷`,
        questions: generatedQuestions.map((q) => ({
          text: q.text,
          question_type: q.question_type,
        })),
      });
      resetForm();
      setShowCreateForm(false);
    } catch {
      console.error("Failed to create survey");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      console.error("Failed to delete survey");
    }
  };

  const totalResponses = surveys?.reduce((sum, s) => sum + s.responses.length, 0) ?? 0;
  const allSatisfactions = surveys?.flatMap((s) =>
    s.responses.filter((r) => r.satisfaction !== null).map((r) => r.satisfaction!)
  ) ?? [];
  const avgSatisfaction =
    allSatisfactions.length > 0
      ? (allSatisfactions.reduce((a, b) => a + b, 0) / allSatisfactions.length).toFixed(1)
      : "N/A";

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="问卷管理"
        description="收集学员反馈，持续优化教学质量"
        action={
          <GradientButton onClick={() => { setShowCreateForm(!showCreateForm); if (!showCreateForm) resetForm(); }}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              type="input"
              label="课程名称"
              placeholder="例如：春季养生流瑜伽"
              value={courseTitle}
              onChange={setCourseTitle}
            />
            <FormField
              type="select"
              label="课程类型"
              options={["流瑜伽", "哈他瑜伽", "阴瑜伽", "艾扬格瑜伽", "阿斯汤加"]}
              value={courseStyle}
              onChange={setCourseStyle}
            />
          </div>
          <FormField
            type="input"
            label="问卷标题"
            placeholder="例如：春季养生流瑜伽课后反馈"
            value={title}
            onChange={setTitle}
          />

          <GradientButton
            onClick={handleGenerateQuestions}
            disabled={generateMutation.isPending}
            fullWidth
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className={`w-5 h-5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              {generateMutation.isPending ? "AI生成中..." : "智能生成问题"}
            </span>
          </GradientButton>

          {/* Generated Questions Preview */}
          {generatedQuestions.length > 0 && (
            <div className="p-6 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 border border-purple-200/30">
              <p className="text-sm text-gray-700 mb-4">AI生成的问题：</p>
              <div className="space-y-3">
                {generatedQuestions.map((q, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/70">
                    <p className="text-sm font-medium text-gray-800">问题 {i + 1}</p>
                    <p className="text-sm text-gray-600 mt-1">{q.text}</p>
                    <Badge variant="outline" className="mt-1">{q.question_type === "rating" ? "评分" : "文本"}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedQuestions.length > 0 && (
            <div className="flex items-center gap-4">
              <GradientButton
                onClick={handleCreate}
                disabled={createMutation.isPending || !title}
                fullWidth
                size="lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" />
                  {createMutation.isPending ? "创建中..." : "创建问卷"}
                </span>
              </GradientButton>
              <GradientButton variant="secondary" onClick={() => setShowCreateForm(false)} size="lg">
                取消
              </GradientButton>
            </div>
          )}

          {generatedQuestions.length === 0 && (
            <GradientButton variant="secondary" onClick={() => setShowCreateForm(false)}>
              取消
            </GradientButton>
          )}
        </GlassCard>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="总问卷数" value={surveys?.length ?? 0} icon={FileQuestion} color="purple" />
        <StatCard label="总反馈数" value={totalResponses} icon={MessageSquare} color="green" />
        <StatCard label="平均满意度" value={avgSatisfaction} icon={Star} color="amber" />
      </div>

      {/* Questionnaire List */}
      <div className="space-y-4">
        <SectionTitle>问卷列表</SectionTitle>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : surveys && surveys.length > 0 ? (
          surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-purple-50/50 to-green-50/50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{survey.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <Badge variant="outline">
                        <FileQuestion className="w-4 h-4 mr-1" />
                        {survey.questions.length} 个问题
                      </Badge>
                      <Badge variant="outline">
                        <Users className="w-4 h-4 mr-1" />
                        {survey.responses.length} 份回复
                      </Badge>
                      <span>{new Date(survey.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <GradientButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedSurvey(selectedSurvey === survey.id ? null : survey.id)
                      }
                    >
                      {selectedSurvey === survey.id ? "收起" : "查看详情"}
                    </GradientButton>
                  </div>
                </div>
                <div className="space-y-2">
                  {survey.questions.map((question, qIndex) => (
                    <div key={question.id || qIndex} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="font-medium">{qIndex + 1}.</span>
                      <span>{question.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSurvey === survey.id && survey.responses.length > 0 && (
                <div className="p-6 space-y-4">
                  <h4 className="font-semibold text-gray-800">学员反馈</h4>
                  {survey.responses.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30 space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{fb.respondent_name}</p>
                          <p className="text-sm text-gray-700">{fb.answer}</p>
                        </div>
                      </div>
                      {fb.satisfaction && (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < fb.satisfaction!
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedSurvey === survey.id && survey.responses.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">
                  暂无反馈
                </div>
              )}
            </div>
          ))
        ) : (
          <GlassCard padding="lg">
            <div className="text-center py-8 text-gray-500">
              <p>还没有创建问卷</p>
              <p className="text-sm mt-2">点击"创建问卷"开始</p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
