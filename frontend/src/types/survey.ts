export interface SurveyQuestion {
  id?: string;
  text: string;
  question_type: string;
  order_index?: number;
}

export interface SurveyFeedback {
  id: string;
  question_id: string;
  respondent_name: string;
  answer: string;
  satisfaction: number | null;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  questions: SurveyQuestion[];
  responses: SurveyFeedback[];
}

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  course_id?: string;
  questions: { text: string; question_type?: string }[];
}

export interface GenerateQuestionsRequest {
  course_title: string;
  course_style?: string;
  course_theme?: string;
}

export interface GenerateReplyRequest {
  feedback: string;
  question: string;
}
