import React, { useState } from 'react';
import { useAuth } from './authContextDef';
import { useRouter } from '../../router/routerContext';
import { Link } from '../../router/Router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Banner } from '../../components/Banner';
import { strings } from '../../strings';
import { ApiError } from '../../api/client';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { navigate } = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim() || !email.trim() || !password) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      navigate('/boards', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setErrorMessage(strings.auth.emailTaken);
      } else if (err instanceof ApiError && err.details.detail) {
        setErrorMessage(err.details.detail);
      } else {
        setErrorMessage(strings.errors.genericFailure);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex flex-col items-center pt-[10vh] p-4 text-ink">
      <div className="w-full max-w-[360px] text-left">
        <span className="text-[14px] leading-5 font-semibold text-ink">
          {strings.app.name}
        </span>
        <h1 className="text-[20px] leading-[28px] font-semibold text-ink mt-4 mb-6">
          {strings.auth.registerHeading}
        </h1>

        {errorMessage && (
          <Banner
            message={errorMessage}
            variant="error"
            onDismiss={() => setErrorMessage(null)}
            className="mb-4"
          />
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label={strings.auth.displayNameLabel}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            autoFocus
          />

          <TextField
            label={strings.auth.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <TextField
            label={strings.auth.passwordLabel}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? strings.auth.submittingRegister : strings.auth.register}
          </Button>
        </form>

        <div className="mt-4">
          <Link
            href="/login"
            className="text-[14px] leading-5 text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {strings.auth.haveAccountPrompt}
          </Link>
        </div>
      </div>
    </div>
  );
};
