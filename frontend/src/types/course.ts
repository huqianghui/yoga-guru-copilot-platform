export interface Pose {
  id?: string;
  name: string;
  duration: string;
  notes: string;
  order_index?: number;
}

export interface Course {
  id: string;
  title: string;
  theme: string;
  duration: string;
  level: string;
  style: string;
  focus: string;
  created_at: string;
  poses: Pose[];
}

export interface CreateCourseRequest {
  title: string;
  theme?: string;
  duration: string;
  level: string;
  style: string;
  focus?: string;
  poses: Pose[];
}

export interface GenerateCourseRequest {
  theme: string;
  duration: string;
  level: string;
  style: string;
  focus?: string;
}
