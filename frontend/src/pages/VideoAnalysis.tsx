import { useState } from "react";
import {
  Upload,
  Video,
  PlayCircle,
  Image,
  Trash2,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  ProgressBar,
  Badge,
  InfoBox,
  SectionTitle,
} from "@/components/shared";
import {
  useVideos,
  useUploadVideo,
  useDeleteVideo,
  useAnalyzeVideo,
} from "@/hooks/useVideos";

export default function VideoAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: videos, isLoading } = useVideos();
  const uploadMutation = useUploadVideo();
  const deleteMutation = useDeleteVideo();
  const analyzeMutation = useAnalyzeVideo();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      if (!videoTitle) {
        const name = e.target.files[0].name.replace(/\.[^.]+$/, "");
        setVideoTitle(name);
      }
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;
    try {
      const video = await uploadMutation.mutateAsync({
        title: videoTitle || selectedFile.name,
        file: selectedFile,
      });
      setSelectedFile(null);
      setVideoTitle("");
      // Auto-start analysis
      await analyzeMutation.mutateAsync(video.id);
    } catch {
      console.error("Failed to upload/analyze video");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedVideoId === id) setSelectedVideoId(null);
    } catch {
      console.error("Failed to delete video");
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      await analyzeMutation.mutateAsync(id);
    } catch {
      console.error("Failed to analyze video");
    }
  };

  // Find selected video detail
  const selectedVideo = videos?.find((v) => v.id === selectedVideoId);

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
                    <button
                      onClick={() => { setSelectedFile(null); setVideoTitle(""); }}
                      className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      移除
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="视频标题（可选）"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-purple-200 focus:border-purple-400 focus:outline-none"
                  />
                  <GradientButton
                    onClick={handleUploadAndAnalyze}
                    disabled={uploadMutation.isPending || analyzeMutation.isPending}
                    fullWidth
                    size="lg"
                  >
                    {uploadMutation.isPending
                      ? "上传中..."
                      : analyzeMutation.isPending
                        ? "分析中..."
                        : "上传并分析"}
                  </GradientButton>
                  {(uploadMutation.isPending || analyzeMutation.isPending) && (
                    <ProgressBar animated label={uploadMutation.isPending ? "正在上传视频..." : "正在提取授课风格与教学理念..."} />
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Selected video info */}
          {selectedVideo && selectedVideo.status === "analyzed" && (
            <GlassCard padding="lg">
              <SectionTitle>视频详情 - {selectedVideo.title}</SectionTitle>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p>状态：<Badge variant="gradient">已分析</Badge></p>
                <p>上传时间：{new Date(selectedVideo.created_at).toLocaleString("zh-CN")}</p>
                <p>文件大小：{(selectedVideo.file_size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </GlassCard>
          )}

          {/* Frame extraction info */}
          <GlassCard padding="lg">
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
              <Link
                to="/photo-processing"
                className="block w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 shadow-lg hover:shadow-xl transition-all text-center"
              >
                前往照片处理模块查看
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar: History */}
        <div className="space-y-4">
          <GlassCard>
            <SectionTitle>历史分析记录</SectionTitle>
            <div className="space-y-3 mt-4">
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : videos && videos.length > 0 ? (
                videos.map((video) => (
                  <div
                    key={video.id}
                    className={`p-4 rounded-xl transition-colors border ${
                      selectedVideoId === video.id
                        ? "bg-purple-100/70 border-purple-300"
                        : "bg-gradient-to-r from-purple-50/50 to-green-50/50 border-purple-100/30 hover:from-purple-100/50 hover:to-green-100/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <PlayCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">{video.title}</p>
                        <p className="text-xs text-gray-500">{new Date(video.created_at).toLocaleDateString("zh-CN")}</p>
                      </div>
                    </div>
                    <div className="ml-8 space-y-1 text-xs text-gray-600">
                      <p>大小: {(video.file_size / 1024 / 1024).toFixed(1)} MB</p>
                      <Badge variant={video.status === "analyzed" ? "gradient" : "outline"}>
                        {video.status === "uploaded" ? "待分析" : video.status === "analyzing" ? "分析中" : "已分析"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 ml-8">
                      {video.status === "uploaded" && (
                        <button
                          onClick={() => handleAnalyze(video.id)}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                        >
                          开始分析
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVideoId(selectedVideoId === video.id ? null : video.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        {selectedVideoId === video.id ? "收起" : "查看"}
                      </button>
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="text-xs text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">暂无分析记录</p>
              )}
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
