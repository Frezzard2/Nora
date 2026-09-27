/** Vonalas ikonok — nincs emoji, nincs ikonkönyvtár. */
type P = { size?: number; className?: string };

const svg = (size: number, className: string | undefined, children: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Bubble = ({ size = 16, className }: P) =>
  svg(size, className, <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />);

export const Check = ({ size = 20, className }: P) =>
  svg(size, className, <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.3 2.4 2.4 4.6-4.9" /></>);

export const Send = ({ size = 19, className }: P) =>
  svg(size, className, <path d="M21 4 3.8 10.6l6.1 2.4 2.4 6.1L21 4Z" />);

export const Instagram = ({ size = 19, className }: P) =>
  svg(size, className, <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" /></>);

export const Messenger = ({ size = 19, className }: P) =>
  svg(size, className, <><path d="M12 3c5 0 9 3.7 9 8.3 0 4.6-4 8.3-9 8.3a10 10 0 0 1-2.6-.35L5 21l.1-3.3A8 8 0 0 1 3 11.3C3 6.7 7 3 12 3Z" /><path d="m7.5 13.2 3-3.2 2.3 2.2 3.2-2.9" /></>);

export const WhatsApp = ({ size = 19, className }: P) =>
  svg(size, className, <><path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 20.5 11.8Z" /><path d="M9 9.5c.3 2.2 2.2 4.4 4.6 5.1l1.2-1.4 1.8.9" /></>);

export const Telegram = ({ size = 19, className }: P) =>
  svg(size, className, <path d="M21 5 3.6 11.4l4.6 1.6L19 6.6l-8.2 8v4.2l2.7-3.3 4.1 2.9L21 5Z" />);

export const WebChat = ({ size = 19, className }: P) =>
  svg(size, className, <><rect x="3" y="4" width="18" height="14" rx="3" /><path d="M3 8.5h18M7 21h10" /></>);
