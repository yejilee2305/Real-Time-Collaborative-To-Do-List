import { useState, useEffect } from 'react';
import { TodoItem as TodoItemType } from '@sync/shared';
import { useTodoStore } from '../stores/todoStore';

interface TodoItemProps {
  todo: TodoItemType;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

export function TodoItem({ todo, dragHandleProps, isDragging }: TodoItemProps) {
  const { toggleTodo, updateTodo, deleteTodo, sendSelecting, getSelectingUsers } =
    useTodoStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [isFocused, setIsFocused] = useState(false);

  // Get users who are selecting this todo
  const selectingUsers = getSelectingUsers(todo.id);
  const hasOtherSelections = selectingUsers.length > 0;

  // Send selection status when focused/unfocused
  useEffect(() => {
    if (isFocused || isEditing) {
      sendSelecting(todo.id);
    }
    return () => {
      if (isFocused || isEditing) {
        sendSelecting(null);
      }
    };
  }, [isFocused, isEditing, todo.id, sendSelecting]);

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

  // Get the border color for selection indicator
  const selectionBorderColor = hasOtherSelections ? selectingUsers[0].color : undefined;

  return (
    <li
      className={`group relative flex items-center gap-2 sm:gap-3 rounded-lg border-2 bg-white dark:bg-gray-800 p-2 sm:p-3 transition-all ${
        isDragging
          ? 'shadow-lg ring-2 ring-blue-500'
          : hasOtherSelections
          ? 'shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:shadow-sm'
      }`}
      style={{
        borderColor: selectionBorderColor || undefined,
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => !isEditing && setIsFocused(false)}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>
      )}

      {/* Selection indicator avatars */}
      {hasOtherSelections && (
        <div className="absolute -top-2 -right-2 flex -space-x-1">
          {selectingUsers.slice(0, 3).map((user) => (
            <div
              key={user.userId}
              className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-gray-800 text-[10px] font-medium text-white shadow-sm"
              style={{ backgroundColor: user.color }}
              title={`${user.name} is viewing`}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          ))}
          {selectingUsers.length > 3 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 text-[10px] font-medium text-white shadow-sm">
              +{selectingUsers.length - 3}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleToggle}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
          todo.completed
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
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
            className="w-full rounded border border-blue-500 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer truncate text-sm ${
              todo.completed
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {todo.title}
          </p>
        )}
      </div>

      <span
        className={`hidden sm:inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[todo.priority]}`}
      >
        {todo.priority}
      </span>

      <button
        onClick={handleDelete}
        className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 group-hover:opacity-100 sm:group-hover:opacity-100"
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
