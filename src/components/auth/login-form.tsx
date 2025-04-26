"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useTranslations } from "next-intl";
import { useAuth } from "~/hooks/use-auth";
import { loginSchema } from "~/schemas/auth/user.schema";

type LoginFormProps = {
  callbackUrl?: string;
};

export default function LoginForm({ callbackUrl = "/dashboard" }: LoginFormProps) {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(error);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setFormError(null);
    const success = await login(data, callbackUrl);
    if (!success && error) {
      setFormError(error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
            <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
            <Input 
                      placeholder={t("emailPlaceholder")}
              type="email"
              autoComplete="email"
                      disabled={isLoading}
                      {...field}
            />
                  </FormControl>
                  <FormMessage />
                </FormItem>
            )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
            <Input 
                      placeholder={t("passwordPlaceholder")}
              type="password"
              autoComplete="current-password"
                      disabled={isLoading}
                      {...field}
            />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("loading") : t("login")}
          </Button>
        </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center">
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
        <div className="text-sm text-center">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("register")}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
