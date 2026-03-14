import { Outlet, Link, useLocation } from "react-router";
import { Video, Calendar, FileQuestion, Image, LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "仪表板", icon: LayoutDashboard },
  { path: "/video-analysis", label: "视频分析", icon: Video },
  { path: "/course-planning", label: "课程规划", icon: Calendar },
  { path: "/questionnaire", label: "问卷管理", icon: FileQuestion },
  { path: "/photo-processing", label: "照片处理", icon: Image },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-green-50 to-amber-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white/80 backdrop-blur-sm border-r border-purple-200/50 transition-all duration-300 flex flex-col shadow-lg",
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

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-purple-200/50 hover:bg-purple-100/50 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
