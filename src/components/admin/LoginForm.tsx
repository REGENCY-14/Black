"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useLogin, useSession } from "@/hooks/admin";

const schema = z.object({
  email: z.email("Enter the email you sign in with."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

/** Shown only while the mock API is active, so demo accounts are never advertised in production. */
const showDemo = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export function LoginForm() {
  const router = useRouter();
  const session = useSession();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // Already signed in: go straight to the dashboard.
  useEffect(() => {
    if (session.data) router.replace("/admin");
  }, [session.data, router]);

  const onSubmit = handleSubmit((v) => login.mutate(v, { onSuccess: () => router.replace("/admin") }));

  return (
    <div className="container-page flex flex-1 items-center justify-center py-10">
      <Card size="lg" className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Wordmark />
          <h1 className="text-2xl font-semibold">Sign in to admin</h1>
          <p className="text-fg-secondary">For the store owner and Ghana staff.</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Email" error={errors.email?.message}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              {...register("email")}
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register("password")} />
          </Field>
          {login.isError && (
            <p role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
              {login.error.message}
            </p>
          )}
          <Button type="submit" size="lg" block="always" loading={login.isPending}>
            Sign in
          </Button>
        </form>
        {showDemo && (
          <details className="rounded-card bg-subtle p-4 text-sm">
            <summary className="min-h-hit cursor-pointer font-medium">Demo accounts (test mode)</summary>
            <ul className="mt-2 flex flex-col gap-1 text-fg-secondary">
              <li>Owner: owner@example.com / owner123</li>
              <li>Ghana staff: staff@example.com / staff123</li>
            </ul>
          </details>
        )}
      </Card>
    </div>
  );
}
