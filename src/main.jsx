import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const shouldRegisterServiceWorker =
  import.meta.env.PROD && 'serviceWorker' in navigator && window.location.protocol.startsWith('http');

function preventPinchZoom() {
  const preventGesture = (event) => event.preventDefault();
  const preventMultiTouch = (event) => {
    if (event.touches?.length > 1) {
      event.preventDefault();
    }
  };
  const preventTrackpadZoom = (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };

  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });
  document.addEventListener('touchmove', preventMultiTouch, { passive: false });
  window.addEventListener('wheel', preventTrackpadZoom, { passive: false });
}

if (shouldRegisterServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).catch((error) => {
      console.warn('live2love service worker registration failed:', error);
    });
  });
}

preventPinchZoom();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
