"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useClientAuth } from "@/hooks/useClientAuth";

const registerSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function ClientRegisterPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, _hasHydrated } = useClientAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<{
    clientName: string;
    workspaceName: string;
    email: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    // auto-login check
    if (_hasHydrated) {
      if (isAuthenticated) {
        router.replace("/client/dashboard");
        return;
      }

      const existingToken = localStorage.getItem("clientAccessToken");
      if (existingToken) {
        api
          .get("/client/auth/me", {
            headers: { Authorization: `Bearer ${existingToken}` },
          })
          .then(({ data }) => {
            setAuth(data.user, data.client, existingToken);
            router.replace("/client/dashboard");
          })
          .catch(() => {
            localStorage.removeItem("clientAccessToken");
          });
      }
    }

    // existing invitation token verification
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }
      try {
        const response = await api.get(`/client/auth/invitation/${token}`);
        setInvitationInfo(response.data);
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      }
    };

    verifyToken();

    verifyToken();
  }, [token, _hasHydrated, isAuthenticated]);

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const response = await api.post("/client/auth/register", {
        token,
        password: data.password,
      });

      // store client token
      const { accessToken, user, client } = response.data;
      setAuth(user, client, accessToken); // ← sets isAuthenticated: true

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/client/dashboard");
      }, 2000);
      document.cookie = `clientAccessToken=${response.data.accessToken}; path=/; max-age=86400`;

      setIsSuccess(true);

      setTimeout(() => {
        router.push("/client/dashboard");
      }, 2000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create account";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Invalid invitation
            </h2>
            <p className="text-slate-500 text-sm">
              This invitation link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Account created!
            </h2>
            <p className="text-slate-500 text-sm">
              Redirecting you to your portal...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">FreelanceFlow</h1>
          <p className="text-slate-500 mt-2">Client Portal</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              {invitationInfo ? (
                <>
                  You've been invited by{" "}
                  <strong>{invitationInfo.workspaceName}</strong>.
                  <br />
                  Signing up as <strong>{invitationInfo.email}</strong>
                </>
              ) : (
                "Set a password to access your client portal"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
