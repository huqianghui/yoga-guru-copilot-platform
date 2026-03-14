import { useState } from "react";
import {
  Image as ImageIcon, Grid3x3, Sparkles, Download, Copy, CheckCircle,
  ThumbsUp, AlertTriangle, Lightbulb, Share2,
} from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  SelectionCard,
  SectionTitle,
  Badge,
  FormField,
  InfoBox,
  IconBox,
} from "@/components/shared";

export default function PhotoProcessing() {
  const [selectedVideo, setSelectedVideo] = useState("流瑜伽主题课 - 第8期");
  const [selectedType, setSelectedType] = useState<"quality" | "teaching" | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<number[]>([]);
  const [generatingCollage, setGeneratingCollage] = useState(false);
  const [collageGenerated, setCollageGenerated] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const extractedVideos = [
    { title: "流瑜伽主题课 - 第8期", date: "2026-03-12", qualityFrames: 12, teachingFrames: 6 },
    { title: "阴瑜伽修复课程", date: "2026-03-08", qualityFrames: 8, teachingFrames: 4 },
  ];

  const qualityFrames = [
    { id: 1, time: "05:23", pose: "下犬式", note: "体式标准，线条优美" },
    { id: 2, time: "12:45", pose: "战士二式", note: "力量感强，气质专注" },
    { id: 3, time: "18:30", pose: "三角式", note: "伸展充分，表情自然" },
    { id: 4, time: "25:10", pose: "树式", note: "平衡稳定，姿态优雅" },
    { id: 5, time: "32:15", pose: "鸽子式", note: "开髋深度好，呼吸平稳" },
    { id: 6, time: "38:50", pose: "轮式", note: "后弯完整，控制力强" },
    { id: 7, time: "42:20", pose: "头倒立", note: "核心稳定，垂直度佳" },
    { id: 8, time: "48:05", pose: "舞王式", note: "动作流畅，富有美感" },
  ];

  const teachingFrames = [
    { id: 9, time: "08:15", pose: "下犬式", issue: "膝盖锁死", suggestion: "微屈膝盖，重心后移" },
    { id: 10, time: "15:30", pose: "战士一式", issue: "髋部未正位", suggestion: "后脚脚跟转向内侧45度" },
    { id: 11, time: "22:40", pose: "三角式", issue: "上半身前倾", suggestion: "保持身体在同一平面" },
    { id: 12, time: "29:55", pose: "侧角式", issue: "肩膀耸起", suggestion: "肩膀下沉，远离耳朵" },
    { id: 13, time: "35:20", pose: "鸽子式", issue: "骨盆不正", suggestion: "使用砖块垫高臀部" },
    { id: 14, time: "44:10", pose: "轮式", issue: "手肘外开", suggestion: "手肘内收，对齐肩膀" },
  ];

  const suggestedCaptions = [
    { type: "轻松愉悦", content: "今日份的美好瑜伽时光\n感谢每一位用心练习的伙伴\n在垫子上，遇见更好的自己\n\n#瑜伽生活 #身心平衡 #瑜伽练习" },
    { type: "专业引导", content: "【流瑜伽主题课】精彩瞬间\n\n今天看到大家的进步真的很欣慰：\n- 下犬式的延展越来越好\n- 战士系列的力量感更强了\n- 平衡体式的稳定性提升明显\n\n感恩每一次相遇，期待下次课堂见\n\n#瑜伽教学 #流瑜伽 #学员风采" },
    { type: "鼓励感恩", content: "看到你们的成长是我最大的欣慰\n\n每一个体式的进步\n每一次突破的喜悦\n都值得被记录和庆祝\n\n感恩遇见，感恩陪伴\n\n#瑜伽老师 #学员进步 #感恩有你" },
  ];

  const toggleFrame = (id: number) => {
    setSelectedFrames((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const handleGenerateCollage = () => {
    setGeneratingCollage(true);
    setTimeout(() => { setGeneratingCollage(false); setCollageGenerated(true); }, 2000);
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader title="关键帧处理" description="从视频分析中提取的关键帧，智能分类与应用" />

      {/* Video Selection */}
      <GlassCard>
        <FormField
          type="select"
          label="选择视频"
          value={selectedVideo}
          onChange={(v) => setSelectedVideo(v)}
          options={extractedVideos.map((v) => `${v.title} - ${v.date} (优质 ${v.qualityFrames} 帧 / 教学 ${v.teachingFrames} 帧)`)}
        />
      </GlassCard>

      {/* Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectionCard
          active={selectedType === "quality"}
          onClick={() => { setSelectedType("quality"); setSelectedFrames([]); setCollageGenerated(false); }}
          icon={<IconBox icon={ThumbsUp} size="lg" color="green" />}
          title="优质展示帧"
          description="学员表现优秀的瞬间"
          color="green"
          stats={[{ value: "12", label: "可用帧数" }, { value: "朋友圈", label: "分享渠道" }, { value: "拼图", label: "输出形式" }]}
        />
        <SelectionCard
          active={selectedType === "teaching"}
          onClick={() => { setSelectedType("teaching"); setSelectedFrames([]); setCollageGenerated(false); }}
          icon={<IconBox icon={AlertTriangle} size="lg" color="amber" />}
          title="教学改进帧"
          description="需要纠正的体式示范"
          color="amber"
          stats={[{ value: "6", label: "可用帧数" }, { value: "课堂", label: "使用场景" }, { value: "对比", label: "教学方式" }]}
        />
      </div>

      {/* Quality Frames */}
      {selectedType === "quality" && (
        <div className="space-y-6">
          <GlassCard padding="lg">
            <SectionTitle action={<span className="text-sm text-gray-600">已选择 <span className="font-semibold text-green-600">{selectedFrames.length}</span> 帧</span>}>
              优质展示帧 ({qualityFrames.length})
            </SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
              {qualityFrames.map((frame) => (
                <div
                  key={frame.id}
                  onClick={() => toggleFrame(frame.id)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selectedFrames.includes(frame.id) ? "border-green-500 shadow-lg scale-105" : "border-purple-200 hover:border-green-300 hover:shadow-md"
                  }`}
                >
                  <div className="aspect-square bg-gradient-to-br from-green-200 to-emerald-300 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-green-600" />
                  </div>
                  {selectedFrames.includes(frame.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="p-3 bg-white/90">
                    <p className="text-sm font-semibold text-gray-800">{frame.pose}</p>
                    <p className="text-xs text-gray-600">{frame.time}</p>
                    <p className="text-xs text-green-600 mt-1">{frame.note}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedFrames.length > 0 && !collageGenerated && (
              <GradientButton onClick={handleGenerateCollage} disabled={generatingCollage} fullWidth size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                <span className="flex items-center justify-center gap-2">
                  {generatingCollage ? <Sparkles className="w-5 h-5 animate-spin" /> : <Grid3x3 className="w-5 h-5" />}
                  {generatingCollage ? "生成拼图中..." : `生成拼图 (${selectedFrames.length} 张)`}
                </span>
              </GradientButton>
            )}
          </GlassCard>

          {/* Collage Result */}
          {collageGenerated && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard padding="lg" className="space-y-6">
                <SectionTitle action={
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transition-all cursor-pointer"><Download className="w-5 h-5" /></button>
                    <button className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all cursor-pointer"><Share2 className="w-5 h-5" /></button>
                  </div>
                }>拼图预览</SectionTitle>
                <div className="rounded-2xl overflow-hidden border-2 border-green-200/50 bg-white">
                  <div className={`grid gap-1 p-1 ${selectedFrames.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {selectedFrames.slice(0, 9).map((_, i) => (
                      <div key={i} className="aspect-square bg-gradient-to-br from-green-200 to-emerald-300 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-green-600" />
                      </div>
                    ))}
                  </div>
                </div>
                <InfoBox variant="success" icon={<CheckCircle className="w-4 h-4 text-green-600" />}>
                  拼图已生成，可直接下载或分享到朋友圈
                </InfoBox>
              </GlassCard>

              <GlassCard padding="lg" className="space-y-6">
                <SectionTitle>推荐文案</SectionTitle>
                {suggestedCaptions.map((caption) => (
                  <div key={caption.type} className="p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="purple">{caption.type}</Badge>
                      <button
                        onClick={() => { setCopiedCaption(true); setTimeout(() => setCopiedCaption(false), 2000); }}
                        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white hover:bg-purple-100 transition-colors text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        {copiedCaption ? <><CheckCircle className="w-4 h-4 text-green-600" />已复制</> : <><Copy className="w-4 h-4" />复制</>}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{caption.content}</p>
                  </div>
                ))}
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* Teaching Frames */}
      {selectedType === "teaching" && (
        <GlassCard padding="lg">
          <SectionTitle action={<Badge variant="warning"><Lightbulb className="w-4 h-4 mr-1" />用于课堂教学纠正</Badge>}>
            教学改进帧 ({teachingFrames.length})
          </SectionTitle>
          <div className="space-y-4 mt-6">
            {teachingFrames.map((frame) => (
              <div key={frame.id} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-orange-50/50 border border-amber-200/30 hover:border-amber-300 transition-all">
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-12 h-12 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">{frame.pose}</h3>
                      <p className="text-sm text-gray-500">{frame.time}</p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200/50">
                      <p className="text-xs text-red-600 font-medium mb-1">需要改进</p>
                      <p className="text-sm text-gray-700">{frame.issue}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200/50">
                      <p className="text-xs text-green-600 font-medium mb-1">纠正建议</p>
                      <p className="text-sm text-gray-700">{frame.suggestion}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <InfoBox variant="warning" icon={<Lightbulb className="w-5 h-5 text-amber-600" />} title="教学应用建议" className="mt-6">
            <ul className="space-y-2">
              <li>- 可以将这些帧制作成对比图，展示"错误 vs 正确"</li>
              <li>- 在课堂开始前播放，提醒学员注意常见错误</li>
              <li>- 可匿名使用，保护学员隐私的同时进行教学</li>
              <li>- 配合口头讲解，帮助学员理解体式要点</li>
            </ul>
          </InfoBox>
        </GlassCard>
      )}

      {/* Empty State */}
      {!selectedType && (
        <GlassCard padding="lg" className="text-center">
          <ImageIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">请选择关键帧类型</h3>
          <p className="text-gray-600">选择"优质展示帧"生成朋友圈拼图，或选择"教学改进帧"查看纠正建议</p>
        </GlassCard>
      )}
    </div>
  );
}
