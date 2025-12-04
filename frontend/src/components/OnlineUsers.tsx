import { useTodoStore } from '../stores/todoStore';

export function OnlineUsers() {
  const onlineUsers = useTodoStore((state) => state.onlineUsers);
  const currentUserId = useTodoStore((state) => state.currentUserId);

  const totalOnline = onlineUsers.length;

  if (totalOnline === 0) {
    return null;
  }

  // Sort to put current user first
  const sortedUsers = [...onlineUsers].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {/* Show avatars for users (up to 4) */}
        {sortedUsers.slice(0, 4).map((user, index) => {
          const isCurrentUser = user.userId === currentUserId;
          const initials = isCurrentUser
            ? 'You'
            : user.name.slice(0, 2).toUpperCase();

          return (
            <div
              key={user.userId}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 text-xs font-medium text-white shadow-sm transition-transform hover:scale-110 hover:z-10"
              style={{
                backgroundColor: user.color,
                zIndex: 4 - index,
              }}
              title={isCurrentUser ? 'You' : user.name}
            >
              {initials}
            </div>
          );
        })}
        {totalOnline > 4 && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300"
            style={{ zIndex: 0 }}
            title={sortedUsers
              .slice(4)
              .map((u) => u.name)
              .join(', ')}
          >
            +{totalOnline - 4}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {totalOnline === 1 ? 'Just you' : `${totalOnline} online`}
      </span>
    </div>
  );
}
