interface SkipNavProps {
  href?: string;
  label?: string;
}

export function SkipNav({ href = '#main-content', label = '본문으로 바로가기' }: SkipNavProps) {
  return (
    <a
      href={href}
      className={[
        'sr-only',
        'focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50',
        'focus:rounded-md focus:bg-background focus:px-4 focus:py-2',
        'focus:text-sm focus:font-medium focus:shadow-md',
        'focus:ring-2 focus:ring-ring focus:outline-none',
      ].join(' ')}
    >
      {label}
    </a>
  );
}
