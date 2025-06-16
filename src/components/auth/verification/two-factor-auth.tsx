"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Copy, Shield } from "lucide-react";
import Image from "next/image";

export default function TwoFactorSetup() {
  const t = useTranslations("auth.twoFactor");
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Setup 2FA
  const {
    data: setupData,
    isLoading: isSetupLoading,
    isError: isSetupError,
    refetch: refetchSetup} = api.auth.setupTwoFactor.useQuery(undefined, {
    enabled: true, // Auto-run the query
    refetchOnWindowFocus: false});

  // Verify 2FA code
  const verifyTwoFactor = api.auth.verifyTwoFactor.useMutation({ onSuccess: (data) => {
      toast({
        title: t("setup.success.title"),
        description: t("setup.success.description"),
        variant: "default" });
      // Show backup codes after successful verification
      setShowBackupCodes(true);
    },
    onError: (error) => {
      toast({ title: t("setup.error.title"),
        description: error.message || t("setup.error.description"),
        variant: "destructive" });
    }});

  // Disable 2FA
  const disableTwoFactor = api.auth.disableTwoFactor.useMutation({ onSuccess: () => {
      toast({
        title: t("disable.success.title"),
        description: t("disable.success.description"),
        variant: "default" });
      // Refetch setup data to show setup form again
      refetchSetup();
      setShowBackupCodes(false);
    },
    onError: (error) => {
      toast({ title: t("disable.error.title"),
        description: error.message || t("disable.error.description"),
        variant: "destructive" });
    }});

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({ title: t("setup.codeError.title"),
        description: t("setup.codeError.description"),
        variant: "destructive" });
      return;
    }

    try {
      await verifyTwoFactor.mutateAsync({ token  });
      setVerificationCode("");
    } catch (error) {
      // Error is handled in onError callback
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disableTwoFactor.mutateAsync();
    } catch (error) {
      // Error is handled in onError callback
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("backupCodes.copied"),
      variant: "default" });
  };

  // Render loading state
  if (isSetupLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (isSetupError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("setup.error.title")}</CardTitle>
          <CardDescription>{t("setup.error.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("setup.error.title")}</AlertTitle>
            <AlertDescription>{t("setup.error.retry")}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={() => refetchSetup()}>
            {t("setup.error.retryButton")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Handle already enabled 2FA
  if (setupData?.isEnabled && !showBackupCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("alreadyEnabled.title")}</CardTitle>
          <CardDescription>{t("alreadyEnabled.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-success/10 border-success">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle>{t("alreadyEnabled.alert.title")}</AlertTitle>
            <AlertDescription>
              {t("alreadyEnabled.alert.description")}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-x-2 sm:space-y-0">
          <Button variant="outline" onClick={() => setShowBackupCodes(true)}>
            {t("alreadyEnabled.showBackupCodes")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable2FA}
            disabled={disableTwoFactor.isLoading}
          >
            {disableTwoFactor.isLoading
              ? t("disable.loading")
              : t("disable.button")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show backup codes
  if (showBackupCodes && setupData?.backupCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("backupCodes.title")}</CardTitle>
          <CardDescription>{t("backupCodes.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert
            variant="default"
            className="mb-4 bg-warning/10 border-warning"
          >
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertTitle>{t("backupCodes.warning.title")}</AlertTitle>
            <AlertDescription>
              {t("backupCodes.warning.description")}
            </AlertDescription>
          </Alert>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <Label>{t("backupCodes.label")}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() =>
                  copyToClipboard(setupData.backupCodes.join("\n"))
                }
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                {t("backupCodes.copy")}
              </Button>
            </div>
            <div className="rounded-md border bg-muted/50 p-4">
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code, index) => (
                  <code key={index} className="font-mono text-sm">
                    {code}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowBackupCodes(false)}>
            {t("backupCodes.done")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable2FA}
            disabled={disableTwoFactor.isLoading}
          >
            {disableTwoFactor.isLoading
              ? t("disable.loading")
              : t("disable.button")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Render setup form
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("setup.title")}</CardTitle>
        <CardDescription>{t("setup.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-lg border p-2 bg-white">
            {setupData?.qrCodeUrl && (
              <Image
                src={setupData.qrCodeUrl}
                alt="QR Code for 2FA setup"
                width={200}
                height={200}
                className="mx-auto"
              />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-1">{t("setup.manualCode")}</p>
            <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
              {setupData?.secret}
            </code>
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>{t("setup.instructions.title")}</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>{t("setup.instructions.step1")}</li>
              <li>{t("setup.instructions.step2")}</li>
              <li>{t("setup.instructions.step3")}</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="verification-code">
            {t("setup.verificationCode")}
          </Label>
          <div className="flex space-x-2">
            <Input
              id="verification-code"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest"
            />
            <Button
              onClick={handleVerifyCode}
              disabled={
                verificationCode.length !== 6 || verifyTwoFactor.isLoading
              }
            >
              {verifyTwoFactor.isLoading
                ? t("setup.verifying")
                : t("setup.verify")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("setup.verificationHelp")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
