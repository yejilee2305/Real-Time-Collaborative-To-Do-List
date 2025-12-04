import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTodoStore } from '../stores/todoStore';
import { TodoList } from '../components/TodoList';
import { AddTodoForm } from '../components/AddTodoForm';
import { Header } from '../components/Header';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { TypingIndicator } from '../components/TypingIndicator';
import { OnlineUsers } from '../components/OnlineUsers';
import { ShareLink } from '../components/ShareLink';
import { SyncStatus } from '../components/SyncStatus';

export function ListPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const {
    fetchTodos,
    initializeSocket,
    joinList,
    isLoading,
    error,
    currentListId,
  } = useTodoStore();

  useEffect(() => {
    if (!listId) {
      // No list ID provided, redirect to home
      navigate('/');
      return;
    }

    // Initialize socket and join the list
    initializeSocket();

    // Join the specific list
    if (listId !== currentListId) {
      joinList(listId);
      fetchTodos(listId);
    }
  }, [listId, currentListId, fetchTodos, initializeSocket, joinList, navigate]);

  if (!listId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <ConnectionStatus />
            <ShareLink listId={listId} />
          </div>
          <OnlineUsers />
        </div>

        <SyncStatus />

        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900 sm:p-6">
          <AddTodoForm />

          <TypingIndicator />

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-400">
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
