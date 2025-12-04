import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MemberRole, ListInvite } from '@sync/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface InviteModalProps {
  listId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ listId, isOpen, onClose }: InviteModalProps) {
  const { getToken } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invites, setInvites] = useState<ListInvite[]>([]);

  const fetchInvites = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/lists/${listId}/invites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch invites');
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/lists/${listId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(`Invitation sent to ${email}`);
        setEmail('');
        setInvites((prev) => [...prev, data.data]);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send invite');
      }
    } catch (err) {
      setError('Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/lists/${listId}/invites/${inviteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to delete invite');
    }
  };

  const copyInviteLink = (inviteToken: string) => {
    const link = `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard.writeText(link);
    setSuccess('Invite link copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Fetch invites when modal opens
  useState(() => {
    if (isOpen) {
      fetchInvites();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Members</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Invite form */}
        <form onSubmit={sendInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="editor">Editor - Can add and edit todos</option>
              <option value="viewer">Viewer - Can only view todos</option>
            </select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">{success}</div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </form>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pending Invites</h3>
            <div className="space-y-2">
              {invites
                .filter((i) => i.status === 'pending')
                .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div>
                      <span className="text-sm text-gray-900 dark:text-white">{invite.email}</span>
                      <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 capitalize dark:bg-gray-700 dark:text-gray-300">
                        {invite.role}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyInviteLink(invite.token)}
                        className="text-gray-400 hover:text-blue-500"
                        title="Copy invite link"
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteInvite(invite.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Cancel invite"
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
          </div>
        )}
      </div>
    </div>
  );
}
