import { useState } from "react";
import {
  Image as ImageIcon, Grid3x3, Sparkles, Download, Copy, CheckCircle,
  ThumbsUp, AlertTriangle, Lightbulb, Share2, Loader2,
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
import { useVideos, useGenerateCaption } from "@/hooks/useVideos";
import type { VideoFrame } from "@/types/video";

export default function PhotoProcessing() {
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedType, setSelectedType] = useState<"quality" | "teaching" | null>(null);
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [generatingCollage, setGeneratingCollage] = useState(false);
  const [collageGenerated, setCollageGenerated] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [captionStyle, setCaptionStyle] = useState("轻松愉悦");

  const { data: videos, isLoading } = useVideos();
  const captionMutation = useGenerateCaption();

  // Only show analyzed videos
  const analyzedVideos = videos?.filter((v) => v.status === "analyzed") ?? [];

  // For the selected video, we'd normally fetch frames via useVideo(id)
  // Since list endpoint doesn't return frames, we show placeholder frames
  // In production, this would use the detail API
  const mockQualityFrames: VideoFrame[] = selectedVideoId
    ? [
        { id: "q1", frame_path: "", timestamp: "05:23", frame_type: "quality", pose_name: "下犬式", description: "体式标准，线条优美" },
        { id: "q2", frame_path: "", timestamp: "12:45", frame_type: "quality", pose_name: "战士二式", description: "力量感强，气质专注" },
        { id: "q3", frame_path: "", timestamp: "18:30", frame_type: "quality", pose_name: "三角式", description: "伸展充分，表情自然" },
        { id: "q4", frame_path: "", timestamp: "25:10", frame_type: "quality", pose_name: "树式", description: "平衡稳定，姿态优雅" },
      ]
    : [];

  const mockTeachingFrames: VideoFrame[] = selectedVideoId
    ? [
        { id: "t1", frame_path: "", timestamp: "08:15", frame_type: "teaching", pose_name: "下犬式", description: "膝盖锁死 → 微屈膝盖" },
        { id: "t2", frame_path: "", timestamp: "15:30", frame_type: "teaching", pose_name: "战士一式", description: "髋部未正位 → 后脚转内45度" },
        { id: "t3", frame_path: "", timestamp: "22:40", frame_type: "teaching", pose_name: "三角式", description: "上半身前倾 → 保持同一平面" },
      ]
    : [];

  const frames = selectedType === "quality" ? mockQualityFrames : mockTeachingFrames;

  const toggleFrame = (id: string) => {
    setSelectedFrameIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleGenerateCollage = () => {
    setGeneratingCollage(true);
    // Simulate collage generation
    setTimeout(() => {
      setGeneratingCollage(false);
      setCollageGenerated(true);
    }, 1500);
  };

  const handleGenerateCaption = async () => {
    const selectedFrames = frames.filter((f) => selectedFrameIds.includes(f.id));
    const descriptions = selectedFrames.map((f) => `${f.pose_name}: ${f.description}`);
    try {
      const result = await captionMutation.mutateAsync({
        frame_descriptions: descriptions,
        style: captionStyle,
      });
      setCaptionText(result.caption);
    } catch {
      console.error("Failed to generate caption");
    }
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader title="关键帧处理" description="从视频分析中提取的关键帧，智能分类与应用" />

      {/* Video Selection */}
      <GlassCard>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : analyzedVideos.length > 0 ? (
          <FormField
            type="select"
            label="选择已分析的视频"
            value={selectedVideoId}
            onChange={(v) => {
              setSelectedVideoId(v);
              setSelectedType(null);
              setSelectedFrameIds([]);
              setCollageGenerated(false);
              setCaptionText("");
            }}
            options={analyzedVideos.map((v) => v.title)}
          />
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>暂无已分析的视频</p>
            <p className="text-sm mt-1">请先在视频分析模块上传并分析视频</p>
          </div>
        )}
      </GlassCard>

      {selectedVideoId && (
        <>
          {/* Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectionCard
              active={selectedType === "quality"}
              onClick={() => { setSelectedType("quality"); setSelectedFrameIds([]); setCollageGenerated(false); setCaptionText(""); }}
              icon={<IconBox icon={ThumbsUp} size="lg" color="green" />}
              title="优质展示帧"
              description="学员表现优秀的瞬间"
              color="green"
              stats={[
                { value: String(mockQualityFrames.length), label: "可用帧数" },
                { value: "朋友圈", label: "分享渠道" },
                { value: "拼图", label: "输出形式" },
              ]}
            />
            <SelectionCard
              active={selectedType === "teaching"}
              onClick={() => { setSelectedType("teaching"); setSelectedFrameIds([]); setCollageGenerated(false); setCaptionText(""); }}
              icon={<IconBox icon={AlertTriangle} size="lg" color="amber" />}
              title="教学改进帧"
              description="需要纠正的体式示范"
              color="amber"
              stats={[
                { value: String(mockTeachingFrames.length), label: "可用帧数" },
                { value: "课堂", label: "使用场景" },
                { value: "对比", label: "教学方式" },
              ]}
            />
          </div>

          {/* Quality Frames */}
          {selectedType === "quality" && (
            <div className="space-y-6">
              <GlassCard padding="lg">
                <SectionTitle
                  action={
                    <span className="text-sm text-gray-600">
                      已选择 <span className="font-semibold text-green-600">{selectedFrameIds.length}</span> 帧
                    </span>
                  }
                >
                  优质展示帧 ({mockQualityFrames.length})
                </SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
                  {mockQualityFrames.map((frame) => (
                    <div
                      key={frame.id}
                      onClick={() => toggleFrame(frame.id)}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                        selectedFrameIds.includes(frame.id)
                          ? "border-green-500 shadow-lg scale-105"
                          : "border-purple-200 hover:border-green-300 hover:shadow-md"
                      }`}
                    >
                      <div className="aspect-square bg-gradient-to-br from-green-200 to-emerald-300 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-green-600" />
                      </div>
                      {selectedFrameIds.includes(frame.id) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="p-3 bg-white/90">
                        <p className="text-sm font-semibold text-gray-800">{frame.pose_name}</p>
                        <p className="text-xs text-gray-600">{frame.timestamp}</p>
                        <p className="text-xs text-green-600 mt-1">{frame.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedFrameIds.length > 0 && !collageGenerated && (
                  <GradientButton
                    onClick={handleGenerateCollage}
                    disabled={generatingCollage}
                    fullWidth
                    size="lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {generatingCollage ? (
                        <Sparkles className="w-5 h-5 animate-spin" />
                      ) : (
                        <Grid3x3 className="w-5 h-5" />
                      )}
                      {generatingCollage ? "生成拼图中..." : `生成拼图 (${selectedFrameIds.length} 张)`}
                    </span>
                  </GradientButton>
                )}
              </GlassCard>

              {/* Collage + Caption */}
              {collageGenerated && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GlassCard padding="lg" className="space-y-6">
                    <SectionTitle
                      action={
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg transition-all cursor-pointer">
                            <Download className="w-5 h-5" />
                          </button>
                          <button className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all cursor-pointer">
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      }
                    >
                      拼图预览
                    </SectionTitle>
                    <div className="rounded-2xl overflow-hidden border-2 border-green-200/50 bg-white">
                      <div className={`grid gap-1 p-1 ${selectedFrameIds.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {selectedFrameIds.slice(0, 9).map((_, i) => (
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
                    <SectionTitle>AI文案生成</SectionTitle>
                    <FormField
                      type="select"
                      label="文案风格"
                      value={captionStyle}
                      onChange={setCaptionStyle}
                      options={["轻松愉悦", "专业引导", "鼓励感恩"]}
                    />
                    <GradientButton
                      onClick={handleGenerateCaption}
                      disabled={captionMutation.isPending}
                      fullWidth
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className={`w-5 h-5 ${captionMutation.isPending ? "animate-spin" : ""}`} />
                        {captionMutation.isPending ? "AI生成中..." : "生成文案"}
                      </span>
                    </GradientButton>

                    {captionText && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/30">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="purple">{captionStyle}</Badge>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(captionText);
                              setCopiedCaption(true);
                              setTimeout(() => setCopiedCaption(false), 2000);
                            }}
                            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white hover:bg-purple-100 transition-colors text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            {copiedCaption ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                复制
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{captionText}</p>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}
            </div>
          )}

          {/* Teaching Frames */}
          {selectedType === "teaching" && (
            <GlassCard padding="lg">
              <SectionTitle
                action={
                  <Badge variant="warning">
                    <Lightbulb className="w-4 h-4 mr-1" />
                    用于课堂教学纠正
                  </Badge>
                }
              >
                教学改进帧 ({mockTeachingFrames.length})
              </SectionTitle>
              <div className="space-y-4 mt-6">
                {mockTeachingFrames.map((frame) => {
                  const [issue, suggestion] = frame.description.split(" → ");
                  return (
                    <div
                      key={frame.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-orange-50/50 border border-amber-200/30 hover:border-amber-300 transition-all"
                    >
                      <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-12 h-12 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{frame.pose_name}</h3>
                            <p className="text-sm text-gray-500">{frame.timestamp}</p>
                          </div>
                          <button className="p-2 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200/50">
                            <p className="text-xs text-red-600 font-medium mb-1">需要改进</p>
                            <p className="text-sm text-gray-700">{issue}</p>
                          </div>
                          {suggestion && (
                            <div className="p-3 rounded-lg bg-green-50 border border-green-200/50">
                              <p className="text-xs text-green-600 font-medium mb-1">纠正建议</p>
                              <p className="text-sm text-gray-700">{suggestion}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <InfoBox
                variant="warning"
                icon={<Lightbulb className="w-5 h-5 text-amber-600" />}
                title="教学应用建议"
                className="mt-6"
              >
                <ul className="space-y-2">
                  <li>- 可以将这些帧制作成对比图，展示"错误 vs 正确"</li>
                  <li>- 在课堂开始前播放，提醒学员注意常见错误</li>
                  <li>- 可匿名使用，保护学员隐私的同时进行教学</li>
                  <li>- 配合口头讲解，帮助学员理解体式要点</li>
                </ul>
              </InfoBox>
            </GlassCard>
          )}
        </>
      )}

      {/* Empty State */}
      {!selectedVideoId && !isLoading && (
        <GlassCard padding="lg" className="text-center">
          <ImageIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">请选择已分析的视频</h3>
          <p className="text-gray-600">选择一个已分析的视频，查看提取的关键帧</p>
        </GlassCard>
      )}
    </div>
  );
}
