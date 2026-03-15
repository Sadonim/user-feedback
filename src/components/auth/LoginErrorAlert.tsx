interface LoginErrorAlertProps {
  message: string;
}

export function LoginErrorAlert({ message }: LoginErrorAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
