import React from 'react';
import { MultiStepSignupForm } from "@/components/forms/multi-step-signup-form";

export default function RegisterPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Inscription</h1>
      <MultiStepSignupForm />
    </div>
  );
} 