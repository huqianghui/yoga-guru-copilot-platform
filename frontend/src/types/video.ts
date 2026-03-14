export interface VideoAnalysis {
  teaching_style: string;
  rhythm: string;
  guidance_method: string;
  core_philosophy: string;
  high_freq_words: string[];
}

export interface VideoFrame {
  id: string;
  frame_path: string;
  timestamp: string;
  frame_type: string;
  pose_name: string;
  description: string;
}

export interface Video {
  id: string;
  title: string;
  filename: string;
  file_size: number;
  status: string;
  created_at: string;
}

export interface VideoDetail extends Video {
  analysis: VideoAnalysis | null;
  frames: VideoFrame[];
}

export interface GenerateCaptionRequest {
  frame_descriptions: string[];
  style?: string;
}
