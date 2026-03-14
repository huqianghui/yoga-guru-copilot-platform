import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

/** Maps route paths to their default agent name */
export const ROUTE_AGENT_MAP: Record<string, string> = {
  "/": "yoga-general",
  "/video-analysis": "video-analyzer",
  "/course-planning": "course-planner",
  "/questionnaire": "survey-helper",
  "/photo-processing": "content-creator",
};

/** Maps route paths to Chinese page labels */
export const ROUTE_LABEL_MAP: Record<string, string> = {
  "/": "仪表板",
  "/video-analysis": "视频分析",
  "/course-planning": "课程规划",
  "/questionnaire": "问卷管理",
  "/photo-processing": "照片处理",
};

export interface PageContext {
  /** Current page task description — pages can set this to give the agent more context */
  taskHint: string;
}

interface PageAgentContextValue {
  pageContext: PageContext;
  setTaskHint: (hint: string) => void;
}

const PageAgentCtx = createContext<PageAgentContextValue>({
  pageContext: { taskHint: "" },
  setTaskHint: () => {},
});

export function PageAgentProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<PageContext>({ taskHint: "" });

  const setTaskHint = useCallback((hint: string) => {
    setPageContext((prev) => ({ ...prev, taskHint: hint }));
  }, []);

  return (
    <PageAgentCtx.Provider value={{ pageContext, setTaskHint }}>
      {children}
    </PageAgentCtx.Provider>
  );
}

export function usePageAgent() {
  return useContext(PageAgentCtx);
}
