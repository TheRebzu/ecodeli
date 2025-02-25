// src/app/auth/signin/page.tsx
import SignInForm from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <SignInForm />
    </div>
  );
}