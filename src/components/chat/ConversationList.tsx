import { useRef, useState } from "react";

import { useClickOutside } from "../../hooks/useClickOutside";
import type { Conversation } from "../../types";
import { Icon } from "../common/Icon";

export interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onRemove: (conversationId: string) => void;
}

/** 历史会话下拉列表 */
export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onRemove,
}: ConversationListProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(rootRef, () => setOpen(false), open);

  return (
    <div className="conversation-list" ref={rootRef}>
      <button
        type="button"
        className="conversation-list__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="历史会话"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon name="history" size={14} />
        <span>历史会话</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={12} />
      </button>

      {open ? (
        <ul className="conversation-list__menu" role="listbox">
          {conversations.length === 0 ? (
            <li className="conversation-list__empty">暂无历史会话</li>
          ) : (
            conversations.map((conversation) => (
              <li key={conversation.id} className="conversation-list__item">
                <button
                  type="button"
                  role="option"
                  aria-selected={conversation.id === activeConversationId}
                  className={`conversation-list__button ${
                    conversation.id === activeConversationId
                      ? "conversation-list__button--active"
                      : ""
                  }`.trim()}
                  onClick={() => {
                    onSelect(conversation.id);
                    setOpen(false);
                  }}
                >
                  <span className="conversation-list__title">
                    {conversation.title}
                  </span>
                </button>
                <button
                  type="button"
                  className="conversation-list__remove"
                  title={`删除会话 ${conversation.title}`}
                  aria-label={`删除会话 ${conversation.title}`}
                  onClick={() => onRemove(conversation.id)}
                >
                  <Icon name="trash" size={12} />
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
