import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { verifyEmailSchema } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

interface VerifyEmailFormProps {
  className?: string;
}

export function VerifyEmailForm({ className }: VerifyEmailFormProps) {
  const router = useRouter();
  const { verifyEmail } = useAuth();

  const form = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await verifyEmail(data.code);
      router.push("/dashboard");
      toast.success("Email vérifié avec succès !");
    } catch (error) {
      toast.error("Code de vérification invalide. Veuillez réessayer.");
    }
  };

  return (
    <div className={className}>
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
    </div>
  );
} 