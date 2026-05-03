import { Icon } from '../components/Icon.jsx';

export function AppMenuBar({ items, activeApp, onChangeApp }) {
  return (
    <nav className="app-menu-bar" aria-label="主菜单">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={item.id === activeApp ? 'app-menu-item is-active' : 'app-menu-item'}
          aria-label={item.label}
          aria-current={item.id === activeApp ? 'page' : undefined}
          disabled={Boolean(item.disabled)}
          onClick={() => onChangeApp(item.id)}
        >
          <Icon name={item.icon} className="app-menu-icon" />
        </button>
      ))}
    </nav>
  );
}
