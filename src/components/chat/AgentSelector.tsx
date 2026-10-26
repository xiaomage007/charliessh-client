import { useRef, useState } from "react";

import { useClickOutside } from "../../hooks/useClickOutside";
import type { AgentDefinition } from "../../types";
import { Icon } from "../common/Icon";

export interface AgentSelectorProps {
  agents: AgentDefinition[];
  /** 当前选中的智能体 id */
  value: string;
  /** 切换智能体 */
  onChange: (agentId: string) => void;
  disabled?: boolean;
}

/** 智能体选择下拉框 */
export function AgentSelector({
  agents,
  value,
  onChange,
  disabled = false,
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(rootRef, () => setOpen(false), open);

  const current = agents.find((agent) => agent.id === value) ?? agents[0];

  return (
    <div className="agent-selector" ref={rootRef}>
      <button
        type="button"
        className="agent-selector__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon name="robot" size={14} />
        <span className="agent-selector__name">{current?.name ?? "智能体"}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={12} />
      </button>

      {open ? (
        <ul className="agent-selector__menu" role="listbox">
          {agents.map((agent) => (
            <li key={agent.id}>
              <button
                type="button"
                role="option"
                aria-selected={agent.id === value}
                className={`agent-selector__item ${
                  agent.id === value ? "agent-selector__item--active" : ""
                }`.trim()}
                onClick={() => {
                  onChange(agent.id);
                  setOpen(false);
                }}
              >
                <span className="agent-selector__item-head">
                  <span className="agent-selector__item-name">{agent.name}</span>
                  <span className="agent-selector__item-model">
                    {agent.defaultModel}
                  </span>
                </span>
                <span className="agent-selector__item-desc">
                  {agent.description}
                </span>
                {agent.includeTerminalContext ? (
                  <span className="agent-selector__item-tag">含终端上下文</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
