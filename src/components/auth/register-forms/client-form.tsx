"use client";

import { useState } from "react";
import { PersonalInfo, PersonalInfoData } from "@/components/auth/form-steps/personal-info";
import { AccountDetails, AccountDetailsData } from "@/components/auth/form-steps/account-details";

type RegistrationStep = "personal-info" | "account-details" | "confirmation";

interface FormData {
  personalInfo?: PersonalInfoData;
  accountDetails?: AccountDetailsData;
}

export function ClientRegistrationForm() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("personal-info");
  const [formData, setFormData] = useState<FormData>({});
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handlePersonalInfoSubmit = (data: PersonalInfoData) => {
    setFormData((prev) => ({ ...prev, personalInfo: data }));
    setCurrentStep("account-details");
  };

  const handleAccountDetailsSubmit = async (data: AccountDetailsData) => {
    setFormData((prev) => ({ ...prev, accountDetails: data }));
    
    // Submit the complete form data to the server
    try {
      // Combine data
      const completeData = {
        ...formData.personalInfo,
        password: data.password,
        role: "CLIENT",
      };
      
      // API call would go here
      console.log("Submitting client registration:", completeData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success state
      setCurrentStep("confirmation");
      setRegistrationComplete(true);
    } catch (error) {
      console.error("Registration error:", error);
      // Would handle error state here
    }
  };

  const handleBackToPersonalInfo = () => {
    setCurrentStep("personal-info");
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-center">Inscription Client</h1>
        <p className="text-center text-muted-foreground">
          Rejoignez EcoDeli pour profiter de nos services de livraison et bien plus
        </p>
      </div>

      {/* Progress tracker */}
      <div className="w-full max-w-md mx-auto mb-10">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "personal-info" 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary text-primary-foreground"
            }`}>
              1
            </div>
            <span className="text-xs mt-1">Informations</span>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "account-details" || currentStep === "confirmation"
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              2
            </div>
            <span className="text-xs mt-1">Compte</span>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "confirmation" && registrationComplete
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              3
            </div>
            <span className="text-xs mt-1">Confirmation</span>
          </div>
        </div>
      </div>

      {/* Form steps */}
      <div className="mt-8">
        {currentStep === "personal-info" && (
          <PersonalInfo 
            onSubmit={handlePersonalInfoSubmit} 
            defaultValues={formData.personalInfo}
          />
        )}
        
        {currentStep === "account-details" && (
          <AccountDetails 
            onSubmit={handleAccountDetailsSubmit} 
            onBack={handleBackToPersonalInfo}
          />
        )}
        
        {currentStep === "confirmation" && registrationComplete && (
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-green-600"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Inscription réussie!</h2>
            <p className="text-muted-foreground">
              Votre compte a été créé avec succès. Un email de confirmation a été envoyé à 
              <span className="font-medium text-foreground"> {formData.personalInfo?.email}</span>.
            </p>
            <div className="pt-4">
              <a 
                href="/login" 
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md inline-block"
              >
                Se connecter
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientRegistrationForm; 