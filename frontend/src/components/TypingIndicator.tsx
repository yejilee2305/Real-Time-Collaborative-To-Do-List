import { useTodoStore } from '../stores/todoStore';

export function TypingIndicator() {
  const typingUsers = useTodoStore((state) => state.typingUsers);
  const currentUserId = useTodoStore((state) => state.currentUserId);

  // Filter out current user
  const otherTypingUsers = typingUsers.filter((u) => u !== currentUserId);

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const formatTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].slice(5, 12)} is typing...`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].slice(5, 12)} and ${otherTypingUsers[1].slice(5, 12)} are typing...`;
    } else {
      return `${otherTypingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
          .
        </span>
      </div>
      <span>{formatTypingText()}</span>
    </div>
  );
}
