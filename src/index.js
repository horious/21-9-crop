import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA 서비스 워커 등록 (프로덕션 모드에서만)
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
} else {
  // 개발 모드에서는 Service Worker 등록 해제 (HMR 방해 방지)
  serviceWorkerRegistration.unregister();
}

