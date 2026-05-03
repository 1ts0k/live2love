import { useEffect, useState } from 'react';

function getTimeLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function PhoneStatusBar({ label = 'local', onHome }) {
  const [timeLabel, setTimeLabel] = useState(getTimeLabel);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLabel(getTimeLabel());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="phone-status-bar" aria-label="手机状态栏">
      <time>{timeLabel}</time>
      {onHome ? (
        <button type="button" className="phone-status-app" onClick={onHome} aria-label="返回手机桌面">
          聊天
        </button>
      ) : (
        <span className="phone-status-app">{label}</span>
      )}
      <span className="phone-status-signals" aria-hidden="true">
        <span>5G</span>
        <span className="phone-signal-bars">
          <i />
          <i />
          <i />
        </span>
        <span className="phone-battery" />
      </span>
    </div>
  );
}
