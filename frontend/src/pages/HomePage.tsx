import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [recentLists, setRecentLists] = useState<string[]>(() => {
    const stored = localStorage.getItem('sync-recent-lists');
    return stored ? JSON.parse(stored) : [];
  });
  const [joinListId, setJoinListId] = useState('');

  const createNewList = () => {
    const newListId = nanoid(10);
    saveRecentList(newListId);
    navigate(`/list/${newListId}`);
  };

  const joinExistingList = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinListId.trim()) {
      // Extract list ID from URL if full URL is pasted
      let listId = joinListId.trim();
      const urlMatch = listId.match(/\/list\/([a-zA-Z0-9_-]+)/);
      if (urlMatch) {
        listId = urlMatch[1];
      }
      saveRecentList(listId);
      navigate(`/list/${listId}`);
    }
  };

  const saveRecentList = (listId: string) => {
    const updated = [listId, ...recentLists.filter((id) => id !== listId)].slice(0, 5);
    setRecentLists(updated);
    localStorage.setItem('sync-recent-lists', JSON.stringify(updated));
  };

  const removeFromRecent = (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentLists.filter((id) => id !== listId);
    setRecentLists(updated);
    localStorage.setItem('sync-recent-lists', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Auth section */}
        <div className="mb-8 flex justify-center">
          {!user ? (
            <div className="flex gap-3">
              <Link
                to="/sign-in"
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                Go to My Lists
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Real-time Collaborative Todo Lists
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Create a list and share the link with your team. Everyone can add,
            edit, and check off items in real-time.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create New List */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
            <div className="mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Create New List
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start a fresh todo list and invite your team
              </p>
            </div>
            <button
              onClick={createNewList}
              className="w-full rounded-lg bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600"
            >
              Create List
            </button>
          </div>

          {/* Join Existing List */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
            <div className="mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Join Existing List
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paste a link or list ID to join
              </p>
            </div>
            <form onSubmit={joinExistingList} className="flex gap-2">
              <input
                type="text"
                value={joinListId}
                onChange={(e) => setJoinListId(e.target.value)}
                placeholder="Paste link or list ID..."
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={!joinListId.trim()}
                className="rounded-lg bg-green-500 px-4 py-2 font-medium text-white transition-colors hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Recent Lists */}
        {recentLists.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Recent Lists
            </h3>
            <div className="space-y-2">
              {recentLists.map((listId) => (
                <button
                  key={listId}
                  onClick={() => {
                    saveRecentList(listId);
                    navigate(`/list/${listId}`);
                  }}
                  className="w-full flex items-center justify-between rounded-lg bg-white px-4 py-3 text-left shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group dark:bg-gray-900 dark:border-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-950"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-gray-400 group-hover:text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <span className="font-medium text-gray-700 group-hover:text-blue-700 dark:text-gray-300 dark:group-hover:text-blue-400">
                      List {listId.slice(0, 8)}...
                    </span>
                  </div>
                  <button
                    onClick={(e) => removeFromRecent(listId, e)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove from recent"
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
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
