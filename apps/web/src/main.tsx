import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { AppBootstrap } from './AppBootstrap';
import { queryClient } from './lib/query-client';
import { router } from './router';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No se encontró el elemento #root');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppBootstrap>
        <RouterProvider router={router} />
      </AppBootstrap>
    </QueryClientProvider>
  </StrictMode>,
);
