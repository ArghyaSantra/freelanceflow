"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClientAuth } from "@/hooks/useClientAuth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function ClientLoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, _hasHydrated } = useClientAuth();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    // already logged in via persisted store
    if (isAuthenticated) {
      router.replace("/client/dashboard");
      return;
    }

    // token exists but store isn't hydrated with user/client yet — try /me
    const token = localStorage.getItem("clientAccessToken");
    if (!token) return;

    const tryAutoLogin = async () => {
      try {
        const response = await api.get("/client/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { user, client } = response.data;
        setAuth(user, client, token);
        router.replace("/client/dashboard");
      } catch {
        // token is invalid/expired, stay on login page
        localStorage.removeItem("clientAccessToken");
      }
    };

    tryAutoLogin();
  }, [_hasHydrated, isAuthenticated]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await api.post("/client/auth/login", data);
      const { accessToken, user, client } = response.data;
      setAuth(user, client, accessToken); // ← this sets isAuthenticated: true in the store
      router.push("/client/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Invalid email or password";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">FreelanceFlow</h1>
          <p className="text-slate-500 mt-2">Client Portal</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your client portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="riya@bakery.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-slate-500">
              Are you a freelancer?{" "}
              <Link
                href="/login"
                className="text-slate-900 font-medium hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
