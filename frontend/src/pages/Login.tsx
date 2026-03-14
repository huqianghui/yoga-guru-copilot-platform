import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard, GradientButton, FormField } from "@/components/shared";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn, loginError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      navigate("/");
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            瑜
          </div>
          <h1 className="text-2xl font-bold text-gray-800">瑜伽 Guru Copilot</h1>
          <p className="text-gray-500 mt-1">教学管理平台</p>
        </div>
        <GlassCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              type="input"
              label="用户名"
              placeholder="请输入用户名"
              value={username}
              onChange={setUsername}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">用户名或密码错误</p>
            )}
            <GradientButton type="submit" fullWidth size="lg" disabled={isLoggingIn}>
              {isLoggingIn ? "登录中..." : "登录"}
            </GradientButton>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            测试账号: guru / guru123 | admin / admin123
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
