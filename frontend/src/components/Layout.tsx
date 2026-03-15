import { Outlet, Link, Navigate, useLocation } from "react-router";
import { Video, Calendar, FileQuestion, Image, LayoutDashboard, Menu, LogOut, Settings, Bot, Zap, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { PageAgentProvider } from "@/contexts/PageAgentContext";

const navItems = [
  { path: "/", label: "仪表板", icon: LayoutDashboard },
  { path: "/video-analysis", label: "视频分析", icon: Video },
  { path: "/course-planning", label: "课程规划", icon: Calendar },
  { path: "/questionnaire", label: "问卷管理", icon: FileQuestion },
  { path: "/photo-processing", label: "照片处理", icon: Image },
  { path: "/playground", label: "Agent Playground", icon: Play },
  { path: "/admin/settings", label: "系统配置", icon: Settings },
  { path: "/admin/agents", label: "Agent 管理", icon: Bot },
  { path: "/admin/skills", label: "Skills 管理", icon: Zap },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PageAgentProvider>
      <div className="flex h-screen bg-gradient-to-br from-purple-50 via-green-50 to-amber-50">
        {/* Left Sidebar */}
        <aside
          className={cn(
            "bg-white/80 backdrop-blur-sm border-r border-purple-200/50 transition-all duration-300 flex flex-col shadow-lg flex-shrink-0",
            sidebarOpen ? "w-64" : "w-20"
          )}
        >
          {/* Logo */}
          <div className="p-6 border-b border-purple-200/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                瑜
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">瑜伽助手</h1>
                  <p className="text-xs text-gray-500">教学管理平台</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    isActive
                      ? "bg-gradient-to-r from-purple-400 to-green-400 text-white shadow-md"
                      : "text-gray-700 hover:bg-purple-100/50"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Logout + Toggle */}
          <div className="border-t border-purple-200/50">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 w-full text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">退出登录</span>}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-4 w-full hover:bg-purple-100/50 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>

        {/* Right Agent Panel */}
        <AgentChatPanel open={agentOpen} onToggle={() => setAgentOpen(!agentOpen)} />
      </div>
    </PageAgentProvider>
  );
}
