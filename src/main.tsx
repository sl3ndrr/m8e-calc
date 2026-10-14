import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/base.css';
import { initializeTheme } from './app/theme';
import { installGlobalErrorHandlers } from './app/globalErrors';
const disposeTheme = initializeTheme();
const disposeErrors = installGlobalErrorHandlers();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    disposeTheme();
    disposeErrors();
  });

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
const mount = () =>
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
void Promise.all([
  document.fonts.load('16px "Roboto Flex"'),
  document.fonts.load('16px "Roboto Mono"'),
  document.fonts.load('24px "Material Symbols Rounded"'),
])
  .catch(() => {})
  .then(mount);
