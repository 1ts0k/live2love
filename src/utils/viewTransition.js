import { flushSync } from 'react-dom';

export function runViewTransition(update) {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(update);
    });
    return;
  }

  update();
}
