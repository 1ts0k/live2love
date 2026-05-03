const PATHS = {
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  bookmark: <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.4L6 21V4.5Z" />,
  bookOpen: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" />,
  gift: <path d="M20 12v8H4v-8M3 8h18v4H3V8ZM12 8v12M12 8H8.5a2.5 2.5 0 1 1 2.1-3.85L12 8ZM12 8h3.5a2.5 2.5 0 1 0-2.1-3.85L12 8Z" />,
  heart: <path d="M12 20.5S4.5 16.2 4.5 9.9A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.6c0 6.3-7.5 10.6-7.5 10.6Z" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  letter: <path d="M4 6h16v12H4V6ZM4 7l8 6 8-6" />,
  map: <path d="M9 18.5 4 20V5.5l5-1.5 6 1.5 5-1.5v14.5l-5 1.5-6-1.5ZM9 4v14.5M15 5.5V20" />,
  message: <path d="M5 6.5h14v9.8H9.2L5 20v-3.7h0V6.5Z" />,
  moreHorizontal: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  pin: <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11ZM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  route: <path d="M6 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM18 13.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM8.2 8h4.3a2.5 2.5 0 0 1 0 5H11a2.5 2.5 0 0 0 0 5h4.8" />,
  search: <path d="m20 20-4.2-4.2M10.8 17a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Z" />,
  send: <path d="M20 4 9.5 14.5M20 4l-6.7 16-3.8-5.5L4 10.7 20 4Z" />,
  settings: <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 15a8 8 0 0 0 .1-1.1 8 8 0 0 0-.1-1.1l2-1.5-2-3.5-2.4 1a7.4 7.4 0 0 0-1.9-1.1L14.8 5h-4l-.4 2.7a7.4 7.4 0 0 0-1.9 1.1l-2.4-1-2 3.5 2 1.5A8 8 0 0 0 6 13.9c0 .4 0 .8.1 1.1l-2 1.5 2 3.5 2.4-1a7.4 7.4 0 0 0 1.9 1.1l.4 2.7h4l.4-2.7a7.4 7.4 0 0 0 1.9-1.1l2.4 1 2-3.5-2.1-1.5Z" />,
  star: <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.4l-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 3Z" />,
  stop: <path d="M8 8h8v8H8V8Z" />,
  trash: <path d="M5 7h14M10 11v6M14 11v6M8 7l.6 12.2A2 2 0 0 0 10.6 21h2.8a2 2 0 0 0 2-1.8L16 7M10 7V4h4v3" />,
  user: <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.8 20a7.2 7.2 0 0 1 14.4 0" />,
  video: <path d="M4.8 7.2A2.2 2.2 0 0 1 7 5h7.2a2.2 2.2 0 0 1 2.2 2.2v9.6a2.2 2.2 0 0 1-2.2 2.2H7a2.2 2.2 0 0 1-2.2-2.2V7.2ZM16.4 10.2 20 7.7v8.6l-3.6-2.5" />,
  stamp: <path d="M7 4h10l1 2 2 1v10l-2 1-1 2H7l-1-2-2-1V7l2-1 1-2ZM8.5 9.5h7M8.5 14.5h4" />,
};

export function Icon({ name, className = 'icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
