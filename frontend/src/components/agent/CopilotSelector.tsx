import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import type { AgentConfig } from "@/types/agent";

interface CopilotSelectorProps {
  agents: AgentConfig[];
  selected: string;
  onSelect: (name: string) => void;
}

export function CopilotSelector({ agents, selected, onSelect }: CopilotSelectorProps) {
  const current = agents.find((a) => a.name === selected);

  return (
    <Select.Root value={selected} onValueChange={onSelect}>
      <Select.Trigger className="inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-xl bg-white/70 border border-purple-200 text-sm text-gray-800 hover:bg-purple-50/50 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-purple-400">
        <span className="flex items-center gap-2 truncate">
          <span>{current?.icon || "💬"}</span>
          <span className="font-medium">{current?.display_name || "选择助手"}</span>
        </span>
        <Select.Icon>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-[100] overflow-hidden rounded-xl bg-white/95 backdrop-blur-xl border border-purple-200/50 shadow-2xl"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-1">
            {agents.map((agent) => (
              <Select.Item
                key={agent.name}
                value={agent.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-purple-50 data-[highlighted]:to-green-50 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-100 data-[state=checked]:to-green-100 transition-colors"
              >
                <span className="text-base flex-shrink-0">{agent.icon}</span>
                <div className="flex flex-col min-w-0">
                  <Select.ItemText>
                    <span className="font-medium text-gray-800">{agent.display_name}</span>
                  </Select.ItemText>
                  <span className="text-xs text-gray-500 truncate">{agent.description}</span>
                </div>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
