import { createBrowserRouter, Navigate } from 'react-router';
import { WebPlayerLayout } from './features/player/WebPlayerLayout';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { ArtistPage } from './pages/ArtistPage';
import { AlbumPage } from './pages/AlbumPage';
import { TrackPage } from './pages/TrackPage';
import { GenrePage } from './pages/GenrePage';
import { TagPage } from './pages/TagPage';
import { AdminTagsPage } from './pages/admin/AdminTagsPage';
import { AdminAppearancePage } from './pages/admin/AdminAppearancePage';
import { AdminEmailPage } from './pages/admin/AdminEmailPage';
import { AdminAuthPage } from './pages/admin/AdminAuthPage';
import { AdminLocalizationsPage } from './pages/admin/AdminLocalizationsPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { SearchPage } from './pages/SearchPage';
import { RadioPage } from './pages/RadioPage';
import { LandingPage } from './pages/LandingPage';
import { SocialCallbackPage } from './pages/SocialCallbackPage';
import { EmbedAlbumPage, EmbedTrackPage } from './pages/EmbedPage';
import { AdminImportPage } from './pages/AdminImportPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRolesPage } from './pages/admin/AdminRolesPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminCatalogPage } from './pages/admin/AdminCatalogPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminSettingsLayout } from './pages/admin/AdminSettingsLayout';
import { AdminModerationPage } from './pages/admin/AdminModerationPage';
import { AdminBackstagePage } from './pages/admin/AdminBackstagePage';
import { AdminPagesPage } from './pages/admin/AdminPagesPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminMenusPage } from './pages/admin/AdminMenusPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminFilesPage } from './pages/admin/AdminFilesPage';
import { AccountPage } from './pages/AccountPage';
import { UploadPage } from './pages/UploadPage';
import { BackstagePage } from './pages/BackstagePage';
import { RequirePermission } from './features/auth/RequirePermission';
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
      { path: '/search', element: <SearchPage /> },
      { path: '/radio', element: <RadioPage /> },
      { path: '/artist/:id', element: <ArtistPage /> },
      { path: '/album/:id', element: <AlbumPage /> },
      { path: '/track/:id', element: <TrackPage /> },
      { path: '/genre/:id', element: <GenrePage /> },
      { path: '/tag/:id', element: <TagPage /> },
      { path: '/playlist/:id', element: <PlaylistPage /> },
      { path: '/u/:username', element: <ProfilePage /> },
      {
        path: '/library',
        element: (
          <RequireAuth>
            <LibraryPage />
          </RequireAuth>
        ),
      },
      {
        path: '/upload',
        element: (
          <RequireAuth>
            <UploadPage />
          </RequireAuth>
        ),
      },
      {
        path: '/backstage',
        element: (
          <RequireAuth>
            <BackstagePage />
          </RequireAuth>
        ),
      },
      {
        path: '/account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      {
        path: '/account/profile',
        element: (
          <RequireAuth>
            <ProfileEditPage />
          </RequireAuth>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequirePermission permission="content.manage">
            <AdminLayout />
          </RequirePermission>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/analytics" replace /> },
          { path: 'analytics', element: <AdminAnalyticsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'roles', element: <AdminRolesPage /> },
          { path: 'notifications', element: <AdminNotificationsPage /> },
          { path: 'catalog', element: <AdminCatalogPage /> },
          { path: 'tags', element: <AdminTagsPage /> },
          { path: 'import', element: <AdminImportPage /> },
          {
            path: 'settings',
            element: <AdminSettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/admin/settings/general" replace /> },
              { path: 'general', element: <AdminSettingsPage /> },
              { path: 'email', element: <AdminEmailPage /> },
              { path: 'auth', element: <AdminAuthPage /> },
              { path: 'appearance', element: <AdminAppearancePage /> },
              { path: 'localizations', element: <AdminLocalizationsPage /> },
              { path: 'menus', element: <AdminMenusPage /> },
            ],
          },
          // Redirects de las rutas viejas (compatibilidad con enlaces/bookmarks).
          { path: 'email', element: <Navigate to="/admin/settings/email" replace /> },
          { path: 'auth', element: <Navigate to="/admin/settings/auth" replace /> },
          { path: 'appearance', element: <Navigate to="/admin/settings/appearance" replace /> },
          { path: 'localizations', element: <Navigate to="/admin/settings/localizations" replace /> },
          { path: 'menus', element: <Navigate to="/admin/settings/menus" replace /> },
          { path: 'moderation', element: <AdminModerationPage /> },
          { path: 'backstage', element: <AdminBackstagePage /> },
          { path: 'pages', element: <AdminPagesPage /> },
          { path: 'logs', element: <AdminLogsPage /> },
          { path: 'files', element: <AdminFilesPage /> },
        ],
      },
    ],
  },
  { path: '/embed/track/:id', element: <EmbedTrackPage /> },
  { path: '/embed/album/:id', element: <EmbedAlbumPage /> },
  { path: '/welcome', element: <LandingPage /> },
  { path: '/auth/social', element: <SocialCallbackPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
]);
