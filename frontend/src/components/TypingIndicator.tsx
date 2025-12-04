import { useTodoStore } from '../stores/todoStore';

export function TypingIndicator() {
  const typingUsers = useTodoStore((state) => state.typingUsers);
  const currentUserId = useTodoStore((state) => state.currentUserId);

  // Filter out current user
  const otherTypingUsers = typingUsers.filter((u) => u.userId !== currentUserId);

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const formatTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return (
        <>
          <span style={{ color: otherTypingUsers[0].color, fontWeight: 500 }}>
            {otherTypingUsers[0].name}
          </span>{' '}
          is typing...
        </>
      );
    } else if (otherTypingUsers.length === 2) {
      return (
        <>
          <span style={{ color: otherTypingUsers[0].color, fontWeight: 500 }}>
            {otherTypingUsers[0].name}
          </span>{' '}
          and{' '}
          <span style={{ color: otherTypingUsers[1].color, fontWeight: 500 }}>
            {otherTypingUsers[1].name}
          </span>{' '}
          are typing...
        </>
      );
    } else {
      return `${otherTypingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex gap-1">
        <span
          className="animate-bounce"
          style={{ animationDelay: '0ms', color: otherTypingUsers[0]?.color }}
        >
          .
        </span>
        <span
          className="animate-bounce"
          style={{ animationDelay: '150ms', color: otherTypingUsers[0]?.color }}
        >
          .
        </span>
        <span
          className="animate-bounce"
          style={{ animationDelay: '300ms', color: otherTypingUsers[0]?.color }}
        >
          .
        </span>
      </div>
      <span>{formatTypingText()}</span>
    </div>
  );
}
