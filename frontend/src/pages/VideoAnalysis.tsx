import { useState } from "react";
import { Upload, Video, PlayCircle, FileText, TrendingUp, Clock, Target, Image, Check } from "lucide-react";
import { Link } from "react-router";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  ProgressBar,
  InsightCard,
  Badge,
  InfoBox,
  SectionTitle,
} from "@/components/shared";

export default function VideoAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [extractingFrames, setExtractingFrames] = useState(false);
  const [framesExtracted, setFramesExtracted] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  const handleExtractFrames = () => {
    setExtractingFrames(true);
    setTimeout(() => {
      setExtractingFrames(false);
      setFramesExtracted(true);
    }, 2500);
  };

  const previousAnalyses = [
    { title: "流瑜伽主题课 - 第8期", date: "2026-03-12", duration: "60分钟", style: "动态流畅", theme: "核心力量", framesExtracted: true },
    { title: "阴瑜伽修复课程", date: "2026-03-08", duration: "75分钟", style: "静态舒缓", theme: "深度放松", framesExtracted: true },
    { title: "哈他瑜伽基础班", date: "2026-03-05", duration: "90分钟", style: "稳定平衡", theme: "体式精准", framesExtracted: false },
  ];

  const highFreqWords = ["呼吸", "觉知", "放松", "伸展", "稳定", "流动", "核心", "平衡"];

  return (
    <div className="p-8 space-y-8">
      <PageHeader title="视频内容分析" description="提取授课风格与教学理念，智能抽取关键帧" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Upload */}
          <GlassCard padding="lg">
            <SectionTitle>上传录播视频</SectionTitle>
            <div className="mt-6">
              {!selectedFile ? (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-purple-300 rounded-2xl p-12 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-all">
                    <Upload className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">点击上传或拖拽视频文件</p>
                    <p className="text-sm text-gray-500">支持 MP4, MOV, AVI 格式，最大 2GB</p>
                  </div>
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-100/70 to-green-100/70">
                    <Video className="w-10 h-10 text-purple-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-sm text-red-600 hover:text-red-700 cursor-pointer">
                      移除
                    </button>
                  </div>
                  <GradientButton onClick={handleAnalyze} disabled={analyzing} fullWidth size="lg">
                    {analyzing ? "分析中..." : "开始分析"}
                  </GradientButton>
                  {analyzing && <ProgressBar animated label="正在提取授课风格与教学理念..." />}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Analysis Results */}
          {analysisComplete && (
            <GlassCard padding="lg" className="space-y-6">
              <SectionTitle>分析结果</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InsightCard icon={Target} title="授课风格" description="动态流畅型" color="purple" />
                <InsightCard icon={Clock} title="节奏掌控" description="中等偏快" color="green" />
                <InsightCard icon={TrendingUp} title="引导方式" description="口令+示范" color="amber" />
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  核心教学理念
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>- 强调呼吸与动作的同步配合</li>
                  <li>- 注重身体觉知的培养</li>
                  <li>- 鼓励学员倾听身体信号</li>
                  <li>- 提供体式变体选择，尊重个体差异</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">高频使用词汇</h3>
                <div className="flex flex-wrap gap-2">
                  {highFreqWords.map((word) => (
                    <Badge key={word} variant="gradient">{word}</Badge>
                  ))}
                </div>
              </div>

              {/* Frame Extraction */}
              <div className="pt-6 border-t border-purple-200/50">
                <InfoBox variant="info" icon={<Image className="w-6 h-6 text-blue-600" />} title="关键帧智能提取">
                  <p>
                    系统将自动识别并提取两类关键帧：
                    <br />
                    <span className="text-green-600">- 优质展示帧</span> - 学员表现优秀的瞬间，用于朋友圈分享
                    <br />
                    <span className="text-amber-600">- 教学改进帧</span> - 需要纠正的体式，用于后续教学示范
                  </p>
                </InfoBox>

                <div className="mt-4">
                  {!framesExtracted ? (
                    <GradientButton
                      onClick={handleExtractFrames}
                      disabled={extractingFrames}
                      fullWidth
                      size="lg"
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Image className={`w-5 h-5 ${extractingFrames ? "animate-pulse" : ""}`} />
                        {extractingFrames ? "正在提取关键帧..." : "提取关键帧"}
                      </span>
                    </GradientButton>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-100/70 text-green-700">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">关键帧提取完成！共提取 18 帧（优质 12 帧 + 教学 6 帧）</span>
                      </div>
                      <Link
                        to="/photo-processing"
                        className="block w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 shadow-lg hover:shadow-xl transition-all text-center"
                      >
                        前往照片处理模块查看
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <GlassCard>
            <SectionTitle>历史分析记录</SectionTitle>
            <div className="space-y-3 mt-4">
              {previousAnalyses.map((analysis) => (
                <div key={analysis.title} className="p-4 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 hover:from-purple-100/50 hover:to-green-100/50 transition-colors cursor-pointer border border-purple-100/30">
                  <div className="flex items-start gap-3 mb-2">
                    <PlayCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{analysis.title}</p>
                      <p className="text-xs text-gray-500">{analysis.date}</p>
                    </div>
                  </div>
                  <div className="ml-8 space-y-1 text-xs text-gray-600">
                    <p>时长: {analysis.duration}</p>
                    <p>风格: {analysis.style}</p>
                    <p>主题: {analysis.theme}</p>
                    {analysis.framesExtracted && <p className="text-green-600 font-medium">已提取关键帧</p>}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <InfoBox variant="tip" title="分析建议">
            建议每月上传2-3个录播视频进行分析，以便更好地追踪教学风格的演变与进步。
          </InfoBox>
        </div>
      </div>
    </div>
  );
}
