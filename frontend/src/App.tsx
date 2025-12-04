import { useEffect } from 'react';
import { useTodoStore } from './stores/todoStore';
import { TodoList } from './components/TodoList';
import { AddTodoForm } from './components/AddTodoForm';
import { Header } from './components/Header';

function App() {
  const { fetchTodos, isLoading, error } = useTodoStore();

  useEffect(() => {
    // Using a demo list ID for now. Will be dynamic in Phase 2
    fetchTodos();
  }, [fetchTodos]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <AddTodoForm />

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <TodoList />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
