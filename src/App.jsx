import { useEffect, useState } from 'react';
import { Live2LoveApp } from './pages/Live2LoveApp.jsx';
import { PhoneDesktop } from './shell/PhoneDesktop.jsx';

const appUrl = (path = '') => `${import.meta.env.BASE_URL}${path}`;

const APP_ROUTES = {
  contacts: appUrl('contacts.html'),
  messages: appUrl('messages.html'),
  worldbook: appUrl('worldbook.html'),
  settings: appUrl('contacts.html#settings'),
};

function getRouteApp() {
  if (typeof window === 'undefined') return null;

  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (pathname.endsWith('/messages.html')) return 'messages';
  if (pathname.endsWith('/worldbook.html')) return 'worldbook';
  if (pathname.endsWith('/contacts.html')) return hash === '#settings' ? 'settings' : 'contacts';

  return null;
}

export default function App() {
  const [routeApp, setRouteApp] = useState(getRouteApp);

  useEffect(() => {
    const handlePopState = () => {
      setRouteApp(getRouteApp());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!routeApp) {
      document.title = '聊天 桌面';
    }
  }, [routeApp]);

  const openApp = (appId = 'messages') => {
    const nextApp = APP_ROUTES[appId] ? appId : 'messages';
    const targetUrl = APP_ROUTES[nextApp];
    const currentUrl = `${window.location.pathname}${window.location.hash}`;

    if (currentUrl !== targetUrl) {
      window.history.pushState({ app: nextApp }, '', targetUrl);
    }

    setRouteApp(nextApp);
  };

  const closeApp = () => {
    const currentUrl = `${window.location.pathname}${window.location.hash}`;

    if (currentUrl !== import.meta.env.BASE_URL) {
      window.history.pushState({ screen: 'desktop' }, '', import.meta.env.BASE_URL);
    }

    setRouteApp(null);
  };

  if (!routeApp) {
    return <PhoneDesktop onOpenApp={openApp} />;
  }

  return <Live2LoveApp initialApp={routeApp} activeApp={routeApp} onChangeApp={openApp} onCloseApp={closeApp} />;
}
