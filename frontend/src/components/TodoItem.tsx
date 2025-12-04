import { useState } from 'react';
import { TodoItem as TodoItemType } from '@sync/shared';
import { useTodoStore } from '../stores/todoStore';

interface TodoItemProps {
  todo: TodoItemType;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export function TodoItem({ todo }: TodoItemProps) {
  const { toggleTodo, updateTodo, deleteTodo } = useTodoStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);

  const handleToggle = () => {
    toggleTodo(todo.id);
  };

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== todo.title) {
      updateTodo(todo.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(todo.title);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    deleteTodo(todo.id);
  };

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm">
      <button
        onClick={handleToggle}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
          todo.completed
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {todo.completed && (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-blue-500 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer truncate text-sm ${
              todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'
            }`}
          >
            {todo.title}
          </p>
        )}
      </div>

      <span
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[todo.priority]}`}
      >
        {todo.priority}
      </span>

      <button
        onClick={handleDelete}
        className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  );
}
