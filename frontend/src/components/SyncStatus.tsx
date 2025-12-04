import { useTodoStore } from '../stores/todoStore';

export function SyncStatus() {
  const isConnected = useTodoStore((state) => state.isConnected);
  const pendingOperations = useTodoStore((state) => state.pendingOperations);
  const conflicts = useTodoStore((state) => state.conflicts);
  const retryPendingOperations = useTodoStore((state) => state.retryPendingOperations);
  const dismissConflict = useTodoStore((state) => state.dismissConflict);

  const hasPending = pendingOperations.length > 0;
  const hasConflicts = conflicts.length > 0;

  if (isConnected && !hasPending && !hasConflicts) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {/* Offline indicator */}
      {!isConnected && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300">
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <span>You're offline. Changes will sync when you reconnect.</span>
        </div>
      )}

      {/* Pending operations indicator */}
      {hasPending && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>
              {pendingOperations.length} pending{' '}
              {pendingOperations.length === 1 ? 'change' : 'changes'} to sync
            </span>
          </div>
          {!isConnected && (
            <button
              onClick={retryPendingOperations}
              className="rounded bg-blue-100 px-2 py-1 text-xs font-medium hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Conflicts indicator */}
      {hasConflicts && (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div
              key={conflict.todoId}
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Sync conflict detected</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Someone else edited this item. Your version: v{conflict.clientVersion}, Server
                      version: v{conflict.serverVersion}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissConflict(conflict.todoId)}
                  className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-800"
                  title="Dismiss"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
