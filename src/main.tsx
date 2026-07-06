import ReactDOM from 'react-dom/client';

import App from '@/App';
import { TrimbleConnectProvider } from '@/hooks/useTrimbleConnect';
import { setupModus } from '@/utils/modusSetup';
import '@/styles.css';

setupModus();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TrimbleConnectProvider>
    <App />
  </TrimbleConnectProvider>,
);
