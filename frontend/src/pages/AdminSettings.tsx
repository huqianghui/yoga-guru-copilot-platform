import { useState } from "react";
import {
  Settings, Wifi, WifiOff, CheckCircle, AlertTriangle,
  Loader2, Save, Eye, EyeOff,
} from "lucide-react";
import {
  PageHeader, GlassCard, GradientButton, SectionTitle,
  Badge, InfoBox,
} from "@/components/shared";
import {
  useServiceConfigs, useUpsertConfig, useTestConnection,
  useSeedDefaults,
} from "@/hooks/useAdmin";
import type { ConnectionTestResult } from "@/types/admin";

export default function AdminSettings() {
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});

  const { data: configs, isLoading } = useServiceConfigs();
  const upsertMutation = useUpsertConfig();
  const testMutation = useTestConnection();
  const seedMutation = useSeedDefaults();

  const categories = configs
    ? [...new Set(configs.map((c) => c.category))]
    : [];

  const categoryLabels: Record<string, string> = {
    azure_openai: "Azure OpenAI",
    azure_cu: "Azure Content Understanding",
    general: "通用配置",
  };

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (value !== undefined) {
      await upsertMutation.mutateAsync({ key, value });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleTest = async (serviceName: string) => {
    const result = await testMutation.mutateAsync(serviceName);
    setTestResults((prev) => ({ ...prev, [serviceName]: result }));
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="系统配置"
        description="管理 Azure 服务连接和系统设置"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : configs && configs.length === 0 ? (
        <GlassCard padding="lg" className="text-center">
          <Settings className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            尚未初始化配置
          </h3>
          <p className="text-gray-600 mb-4">点击下方按钮加载默认配置项</p>
          <GradientButton
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? "初始化中..." : "初始化默认配置"}
          </GradientButton>
        </GlassCard>
      ) : (
        <>
          {/* Connection Tests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: "azure-openai", label: "Azure OpenAI" },
              { name: "azure-cu", label: "Azure Content Understanding" },
            ].map(({ name, label }) => {
              const result = testResults[name];
              return (
                <GlassCard key={name} padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <SectionTitle>{label}</SectionTitle>
                    <GradientButton
                      size="sm"
                      onClick={() => handleTest(name)}
                      disabled={testMutation.isPending}
                    >
                      <span className="flex items-center gap-2">
                        {testMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wifi className="w-4 h-4" />
                        )}
                        测试连接
                      </span>
                    </GradientButton>
                  </div>
                  {result && (
                    <div
                      className={`p-3 rounded-xl flex items-center gap-3 ${
                        result.status === "connected"
                          ? "bg-green-50 border border-green-200"
                          : result.status === "error"
                          ? "bg-red-50 border border-red-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {result.status === "connected" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : result.status === "error" ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-sm">{result.message}</span>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>

          {/* Config Groups */}
          {categories.map((cat) => (
            <GlassCard key={cat} padding="lg">
              <SectionTitle>
                {categoryLabels[cat] || cat}
              </SectionTitle>
              <div className="space-y-4 mt-4">
                {configs
                  ?.filter((c) => c.category === cat)
                  .map((config) => (
                    <div
                      key={config.key}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-purple-700">
                            {config.key}
                          </code>
                          {config.is_secret && (
                            <Badge variant="warning">Secret</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {config.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type={
                              config.is_secret && !showSecrets[config.key]
                                ? "password"
                                : "text"
                            }
                            value={
                              editValues[config.key] !== undefined
                                ? editValues[config.key]
                                : config.value
                            }
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [config.key]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm font-mono"
                            placeholder="未设置"
                          />
                          {config.is_secret && (
                            <button
                              onClick={() =>
                                setShowSecrets((prev) => ({
                                  ...prev,
                                  [config.key]: !prev[config.key],
                                }))
                              }
                              className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                            >
                              {showSecrets[config.key] ? (
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          )}
                          {editValues[config.key] !== undefined && (
                            <button
                              onClick={() => handleSave(config.key)}
                              disabled={upsertMutation.isPending}
                              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </GlassCard>
          ))}

          <InfoBox variant="tip" title="配置说明">
            <ul className="space-y-1">
              <li>- 数据库中的配置会覆盖环境变量中的默认值</li>
              <li>- Secret 类型的值在显示时会被遮罩处理</li>
              <li>- 修改配置后，使用"测试连接"验证服务可用性</li>
            </ul>
          </InfoBox>
        </>
      )}
    </div>
  );
}
