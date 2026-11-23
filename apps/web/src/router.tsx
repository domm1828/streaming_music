import { createBrowserRouter } from 'react-router';
import { WebPlayerLayout } from './features/player/WebPlayerLayout';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { ArtistPage } from './pages/ArtistPage';
import { AlbumPage } from './pages/AlbumPage';
import { TrackPage } from './pages/TrackPage';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { RequireAuth } from './features/auth/RequireAuth';

export const router = createBrowserRouter([
  {
    element: <WebPlayerLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/browse', element: <BrowsePage /> },
      { path: '/artist/:id', element: <ArtistPage /> },
      { path: '/album/:id', element: <AlbumPage /> },
      { path: '/track/:id', element: <TrackPage /> },
      {
        path: '/account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
]);
