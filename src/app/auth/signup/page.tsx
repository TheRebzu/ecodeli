// src/app/auth/signup/page.tsx
import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <SignUpForm />
    </div>
  );
}