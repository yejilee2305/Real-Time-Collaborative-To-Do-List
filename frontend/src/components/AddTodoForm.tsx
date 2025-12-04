import { useState, useCallback, useRef, useEffect } from 'react';
import { TodoPriority } from '@sync/shared';
import { useTodoStore } from '../stores/todoStore';

export function AddTodoForm() {
  const { addTodo, isLoading, sendTyping, isConnected } = useTodoStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = useCallback(
    (value: string) => {
      setTitle(value);

      // Send typing indicator
      if (value.length > 0) {
        sendTyping(true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to clear typing status
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(false);
        }, 2000);
      } else {
        sendTyping(false);
      }
    },
    [sendTyping]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isConnected) return;

    // Clear typing indicator
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    addTodo({ title: title.trim(), priority });
    setTitle('');
    setPriority('medium');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isLoading || !isConnected}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isLoading || !isConnected}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button
          type="submit"
          disabled={!title.trim() || isLoading || !isConnected}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {!isConnected && (
        <p className="mt-2 text-xs text-amber-600">
          Connecting to server... Changes will sync when connected.
        </p>
      )}
    </form>
  );
}
