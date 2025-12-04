import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTodoStore } from '../stores/todoStore';
import { SortableTodoItem } from './SortableTodoItem';

export function TodoList() {
  const { todos, reorderTodo } = useTodoStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (todos.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No todos yet</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Get started by adding a new todo item above.
        </p>
      </div>
    );
  }

  const pendingTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const allTodos = [...pendingTodos, ...completedTodos];
      const newIndex = allTodos.findIndex((t) => t.id === over.id);

      if (newIndex !== -1) {
        reorderTodo(active.id as string, newIndex);
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {pendingTodos.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              To Do ({pendingTodos.length})
            </h2>
            <SortableContext items={pendingTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {pendingTodos.map((todo) => (
                  <SortableTodoItem key={todo.id} todo={todo} />
                ))}
              </ul>
            </SortableContext>
          </section>
        )}

        {completedTodos.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Completed ({completedTodos.length})
            </h2>
            <SortableContext items={completedTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {completedTodos.map((todo) => (
                  <SortableTodoItem key={todo.id} todo={todo} />
                ))}
              </ul>
            </SortableContext>
          </section>
        )}
      </div>
    </DndContext>
  );
}
