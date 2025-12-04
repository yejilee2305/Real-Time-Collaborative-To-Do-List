import { Routes, Route } from 'react-router-dom';
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react';
import { HomePage } from './pages/HomePage';
import { ListPage } from './pages/ListPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvitePage } from './pages/InvitePage';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />

      {/* Auth routes */}
      <Route
        path="/sign-in/*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
          </div>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
          </div>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <DashboardPage />
            </SignedIn>
            <SignedOut>
              <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
              </div>
            </SignedOut>
          </>
        }
      />
      <Route path="/list/:listId" element={<ListPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
    </Routes>
  );
}

export default App;
