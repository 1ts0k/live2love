import { Icon } from '../components/Icon.jsx';

const DESKTOP_APPS = [
  { id: 'chat', label: '聊天', icon: 'message', app: 'messages', className: 'is-chat' },
  { id: 'contacts', label: '联系人', icon: 'user', app: 'contacts', className: 'is-contacts' },
  { id: 'worldbook', label: '世界书', icon: 'bookOpen', app: 'worldbook', className: 'is-worldbook' },
  { id: 'settings', label: '设置', icon: 'settings', app: 'settings', className: 'is-settings' },
];

export function PhoneDesktop({ onOpenApp }) {
  return (
    <main className="app-main">
      <section
        className="app-screen phone-desktop-screen"
        aria-label="仿手机桌面"
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="desktop-wallpaper" aria-hidden="true">
          <span className="desktop-map-line desktop-map-line-a" />
          <span className="desktop-map-line desktop-map-line-b" />
          <span className="desktop-stamp desktop-stamp-a">CHAT</span>
          <span className="desktop-stamp desktop-stamp-b">LOCAL</span>
        </div>

        <header className="desktop-top">
          <span className="desktop-kicker">PRIVATE PHONE</span>
          <h1>聊天</h1>
          <p>local archive · soft signal</p>
        </header>

        <div className="desktop-app-grid" aria-label="桌面 App">
          {DESKTOP_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              className={['desktop-app-button', app.className].filter(Boolean).join(' ')}
              disabled={app.disabled}
              onClick={() => app.app && onOpenApp(app.app)}
            >
              <span className="desktop-app-tile" aria-hidden="true">
                <Icon name={app.icon} className="desktop-app-icon" />
              </span>
              <span className="desktop-app-label">{app.label}</span>
            </button>
          ))}
        </div>

        <span className="desktop-home-indicator" aria-hidden="true" />
      </section>
    </main>
  );
}
