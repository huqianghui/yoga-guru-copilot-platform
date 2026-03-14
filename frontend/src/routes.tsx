import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import VideoAnalysis from "./pages/VideoAnalysis";
import CoursePlanning from "./pages/CoursePlanning";
import QuestionnaireManagement from "./pages/QuestionnaireManagement";
import PhotoProcessing from "./pages/PhotoProcessing";
import AdminSettings from "./pages/AdminSettings";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "video-analysis", Component: VideoAnalysis },
      { path: "course-planning", Component: CoursePlanning },
      { path: "questionnaire", Component: QuestionnaireManagement },
      { path: "photo-processing", Component: PhotoProcessing },
      { path: "admin/settings", Component: AdminSettings },
    ],
  },
]);
