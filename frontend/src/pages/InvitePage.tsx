import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, getToken, loading } = useAuth();

  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setStatus('ready');
    }
  }, [loading]);

  const acceptInvite = async () => {
    if (!token) return;

    setStatus('accepting');
    try {
      const authToken = await getToken();
      const res = await fetch(`${API_URL}/api/lists/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setTimeout(() => {
          navigate(`/list/${data.data.listId}`);
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to accept invite');
        setStatus('error');
      }
    } catch (err) {
      setError('Failed to accept invite');
      setStatus('error');
    }
  };

  const declineInvite = async () => {
    if (!token) return;

    try {
      const authToken = await getToken();
      await fetch(`${API_URL}/api/lists/invites/${token}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to decline invite');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        {!user ? (
          <>
            <div className="mb-6 rounded-lg bg-white p-6 text-center shadow-sm dark:bg-gray-900">
              <svg
                className="mx-auto h-12 w-12 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                You've been invited to collaborate!
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Sign in or create an account to accept this invitation.
              </p>
              <div className="mt-6 flex justify-center gap-3">
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
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm dark:bg-gray-900">
            {status === 'success' ? (
              <>
                <svg
                  className="mx-auto h-16 w-16 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Invitation Accepted!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Redirecting to the list...</p>
              </>
            ) : status === 'error' ? (
              <>
                <svg
                  className="mx-auto h-16 w-16 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Unable to Accept Invite
                </h2>
                <p className="mt-2 text-red-600">{error}</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-6 rounded-md bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
                >
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <svg
                  className="mx-auto h-16 w-16 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                  You've been invited to collaborate!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Hi {user?.user_metadata?.name || 'there'}! Would you like to join this list?
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={declineInvite}
                    className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Decline
                  </button>
                  <button
                    onClick={acceptInvite}
                    disabled={status === 'accepting'}
                    className="rounded-md bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {status === 'accepting' ? 'Accepting...' : 'Accept Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
