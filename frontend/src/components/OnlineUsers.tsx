import { useTodoStore } from '../stores/todoStore';

export function OnlineUsers() {
  const onlineUsers = useTodoStore((state) => state.onlineUsers);
  const currentUserId = useTodoStore((state) => state.currentUserId);

  const totalOnline = onlineUsers.length;

  if (totalOnline === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {/* Show avatars for users (up to 3) */}
        {onlineUsers.slice(0, 3).map((userId, index) => (
          <div
            key={userId}
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white ${
              userId === currentUserId ? 'bg-blue-500' : 'bg-gray-400'
            }`}
            style={{ zIndex: 3 - index }}
            title={userId === currentUserId ? 'You' : userId}
          >
            {userId === currentUserId ? 'You' : userId.slice(5, 7).toUpperCase()}
          </div>
        ))}
        {totalOnline > 3 && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
            style={{ zIndex: 0 }}
          >
            +{totalOnline - 3}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600">
        {totalOnline === 1
          ? 'Just you'
          : `${totalOnline} online`}
      </span>
    </div>
  );
}
