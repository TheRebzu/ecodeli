import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { verifyEmailSchema } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import Image from "next/image";
import { useState } from "react";

interface Setup2FAFormProps {
  className?: string;
}

export function Setup2FAForm({ className }: Setup2FAFormProps) {
  const router = useRouter();
  const { setup2FA, verify2FA } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  const setupTwoFactor = async () => {
    try {
      const { qrCode, secret: twoFactorSecret } = await setup2FA();
      setQrCodeUrl(qrCode);
      setSecret(twoFactorSecret);
    } catch (error) {
      toast.error("Une erreur est survenue lors de la configuration de la 2FA.");
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (!secret) {
        throw new Error("Secret not found");
      }
      await verify2FA(secret, data.code);
      toast.success("2FA configurée avec succès !");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Code invalide. Veuillez réessayer.");
    }
  };

  return (
    <div className={className}>
      {!qrCodeUrl ? (
        <Button onClick={setupTwoFactor} className="w-full">
          Configurer la 2FA
        </Button>
      ) : (
        <>
          <div className="flex flex-col items-center space-y-4 mb-4">
            <Image
              src={qrCodeUrl}
              alt="QR Code for 2FA"
              width={200}
              height={200}
              className="rounded-lg"
            />
            <p className="text-sm text-muted-foreground text-center">
              Scannez ce QR code avec votre application d'authentification
              (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code de vérification</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Vérifier
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
} 