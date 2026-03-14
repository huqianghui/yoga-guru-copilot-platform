import { useState } from "react";
import {
  Sparkles,
  Plus,
  Calendar,
  Clock,
  Target,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  FormField,
  SectionTitle,
  Badge,
} from "@/components/shared";
import { useCourses, useCreateCourse, useDeleteCourse, useGenerateCourse } from "@/hooks/useCourses";
import type { Pose } from "@/types/course";

export default function CoursePlanning() {
  const [showForm, setShowForm] = useState(false);
  const [expandedSequence, setExpandedSequence] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [duration, setDuration] = useState("60分钟");
  const [level, setLevel] = useState("中级");
  const [style, setStyle] = useState("流瑜伽");
  const [focus, setFocus] = useState("");
  const [poses, setPoses] = useState<Pose[]>([]);

  const { data: courses, isLoading } = useCourses();
  const createMutation = useCreateCourse();
  const deleteMutation = useDeleteCourse();
  const generateMutation = useGenerateCourse();

  const resetForm = () => {
    setTitle("");
    setTheme("");
    setDuration("60分钟");
    setLevel("中级");
    setStyle("流瑜伽");
    setFocus("");
    setPoses([]);
  };

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({
        theme: theme || style + "课程",
        duration,
        level,
        style,
        focus,
      });
      // Try to parse the AI response as JSON
      try {
        const content = result.generated_content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Pose[];
          setPoses(parsed);
          if (!title) {
            setTitle(theme || `${style}课程 - ${level}`);
          }
        }
      } catch {
        // If parsing fails, keep empty poses
        console.warn("Failed to parse AI response as poses");
      }
    } catch {
      console.error("Failed to generate course");
    }
  };

  const handleSave = async () => {
    if (!title) return;
    try {
      await createMutation.mutateAsync({
        title,
        theme,
        duration,
        level,
        style,
        focus,
        poses,
      });
      resetForm();
      setShowForm(false);
    } catch {
      console.error("Failed to save course");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      console.error("Failed to delete course");
    }
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="课程序列规划"
        description="智能生成体式编排，让教学更专业"
        action={
          <GradientButton onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}>
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
            <FormField
              type="input"
              label="课程主题"
              placeholder="例如：春季养生流瑜伽"
              value={theme}
              onChange={setTheme}
            />
            <FormField
              type="select"
              label="课程时长"
              options={["45分钟", "60分钟", "75分钟", "90分钟"]}
              value={duration}
              onChange={setDuration}
            />
            <FormField
              type="select"
              label="难度级别"
              options={["全级别", "初级", "中级", "中高级", "高级"]}
              value={level}
              onChange={setLevel}
            />
            <FormField
              type="select"
              label="课程类型"
              options={["流瑜伽", "哈他瑜伽", "阴瑜伽", "艾扬格瑜伽", "阿斯汤加"]}
              value={style}
              onChange={setStyle}
            />
          </div>
          <FormField
            type="textarea"
            label="课程重点"
            placeholder="例如：侧重开髋、加强核心力量、改善肩颈问题等"
            value={focus}
            onChange={setFocus}
          />
          <FormField
            type="input"
            label="课程标题"
            placeholder="例如：春季养生流瑜伽序列"
            value={title}
            onChange={setTitle}
          />

          <div className="flex items-center gap-4">
            <GradientButton
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              fullWidth
              size="lg"
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className={`w-5 h-5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                {generateMutation.isPending ? "智能生成中..." : "智能生成序列"}
              </span>
            </GradientButton>
            <GradientButton variant="secondary" onClick={() => setShowForm(false)} size="lg">
              取消
            </GradientButton>
          </div>

          {/* Generated Poses Preview */}
          {poses.length > 0 && (
            <div className="space-y-3">
              <SectionTitle>生成的体式序列</SectionTitle>
              {poses.map((pose, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-gray-800">{pose.name}</p>
                      <span className="text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full">
                        {pose.duration}
                      </span>
                    </div>
                    {pose.notes && <p className="text-sm text-gray-600">{pose.notes}</p>}
                  </div>
                </div>
              ))}
              <GradientButton onClick={handleSave} disabled={createMutation.isPending || !title} fullWidth>
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" />
                  {createMutation.isPending ? "保存中..." : "保存课程"}
                </span>
              </GradientButton>
            </div>
          )}
        </GlassCard>
      )}

      {/* Saved Sequences */}
      <div className="space-y-4">
        <SectionTitle>已保存的序列</SectionTitle>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : courses && courses.length > 0 ? (
          courses.map((course) => (
            <div
              key={course.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-purple-50/50 to-green-50/50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{course.title}</h3>
                    {course.theme && <p className="text-sm text-gray-600 mb-3">{course.theme}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() =>
                        setExpandedSequence(expandedSequence === course.id ? null : course.id)
                      }
                      className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      {expandedSequence === course.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <Badge variant="outline">
                    <Calendar className="w-4 h-4 text-purple-600 mr-1" />
                    {new Date(course.created_at).toLocaleDateString("zh-CN")}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-4 h-4 text-green-600 mr-1" />
                    {course.duration}
                  </Badge>
                  <Badge variant="outline">
                    <Target className="w-4 h-4 text-amber-600 mr-1" />
                    {course.level}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="w-4 h-4 text-pink-600 mr-1" />
                    {course.poses.length} 个体式
                  </Badge>
                </div>
              </div>

              {expandedSequence === course.id && course.poses.length > 0 && (
                <div className="p-6 space-y-3">
                  {course.poses.map((pose, poseIndex) => (
                    <div
                      key={pose.id || poseIndex}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {poseIndex + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-gray-800">{pose.name}</p>
                          <span className="text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full">
                            {pose.duration}
                          </span>
                        </div>
                        {pose.notes && <p className="text-sm text-gray-600">{pose.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <GlassCard padding="lg">
            <div className="text-center py-8 text-gray-500">
              <p>还没有保存的课程序列</p>
              <p className="text-sm mt-2">点击"创建新序列"开始</p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
