import { IconButton } from "../common/Button";
import { ConversationList } from "./ConversationList";
import type { AgentDefinition, Conversation } from "../../types";

export interface ChatHeaderProps {
  conversation: Conversation | null;
  agent: AgentDefinition;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onRemoveConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

/** AI 对话面板顶部标题栏 */
export function ChatHeader({
  conversation,
  agent,
  conversations,
  activeConversationId,
  onSelectConversation,
  onRemoveConversation,
  onNewConversation,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header__title">
        <span className="chat-header__name">
          {conversation?.title ?? "AI 对话"}
        </span>
        <span className="chat-header__agent">{agent.name}</span>
      </div>

      <div className="chat-header__actions">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={onSelectConversation}
          onRemove={onRemoveConversation}
        />
        <IconButton
          icon="plus"
          label="新建对话"
          onClick={onNewConversation}
        />
      </div>
    </header>
  );
}
