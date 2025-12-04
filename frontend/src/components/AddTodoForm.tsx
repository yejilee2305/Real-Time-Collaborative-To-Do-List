import { useState } from 'react';
import { TodoPriority } from '@sync/shared';
import { useTodoStore } from '../stores/todoStore';

export function AddTodoForm() {
  const { addTodo, isLoading } = useTodoStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addTodo({ title: title.trim(), priority });
    setTitle('');
    setPriority('medium');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoPriority)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button
          type="submit"
          disabled={!title.trim() || isLoading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}
