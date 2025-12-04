import { useTodoStore } from '../stores/todoStore';

export function ConnectionStatus() {
  const isConnected = useTodoStore((state) => state.isConnected);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
