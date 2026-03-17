import { forwardRef } from 'react';

interface LoginErrorAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
}

export const LoginErrorAlert = forwardRef<HTMLDivElement, LoginErrorAlertProps>(
  function LoginErrorAlert({ message, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="alert"
        {...props}
        className={[
          'rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive',
          props.className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {message}
      </div>
    );
  }
);
