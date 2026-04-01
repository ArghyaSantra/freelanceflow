"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { publicApi } from "@/lib/api";
import { DocumentField } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, FileText, PenLine } from "lucide-react";
import { toast } from "sonner";

interface PublicDocument {
  id: string;
  title: string;
  status: string;
  documentFields: DocumentField[];
  viewUrl: string;
  workspace: {
    name: string;
    logoUrl?: string;
  };
}

type SigningStep = "loading" | "view" | "sign" | "complete" | "error";

export default function SignDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<PublicDocument | null>(null);
  const [step, setStep] = useState<SigningStep>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureTab, setSignatureTab] = useState("draw");

  // canvas refs for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await publicApi.getDocument(token);
        setDoc(response.data);
        setStep("view");
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "This signing link is invalid or has expired";
        setErrorMessage(message);
        setStep("error");
      }
    };

    fetchDocument();
  }, [token]);

  // canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureImage = (): string => {
    if (signatureTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return "";
      return canvas.toDataURL("image/png");
    } else {
      // typed signature — render on a canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.font = "italic 36px Georgia";
      ctx.fillStyle = "#1e293b";
      ctx.fillText(signerName, 20, 60);
      return canvas.toDataURL("image/png");
    }
  };

  const handleSubmit = async () => {
    if (!signerName || !signerEmail) {
      toast.error("Please enter your name and email");
      return;
    }

    if (signatureTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // check if canvas is blank
      const ctx = canvas.getContext("2d");
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      const isBlank = imageData?.data.every((val, i) =>
        i % 4 === 3 ? val === 0 : true,
      );
      if (isBlank) {
        toast.error("Please draw your signature");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const signatureImage = getSignatureImage();
      await publicApi.signDocument(token, {
        signatureImage,
        signerName,
        signerEmail,
      });
      setStep("complete");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to submit signature";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-slate-500 text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Link unavailable
            </h2>
            <p className="text-slate-500 text-sm">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state
  if (step === "complete") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Document signed successfully
            </h2>
            <p className="text-slate-500 text-sm">
              Thank you {signerName}. You will receive a copy of the signed
              document via email shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main signing view
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {doc?.workspace.name} has sent you a document to sign
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {doc?.title}
            </h1>
          </div>
          <Button onClick={() => setStep("sign")} className="gap-2">
            <PenLine className="w-4 h-4" />
            Sign Document
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* PDF viewer */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <iframe
              src={doc?.viewUrl}
              className="w-full h-[600px] rounded-lg"
              title={doc?.title}
            />
          </CardContent>
        </Card>

        {/* Signature panel */}
        {step === "sign" && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Sign Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signerName">Full name *</Label>
                  <Input
                    id="signerName"
                    placeholder="Riya Sharma"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signerEmail">Email *</Label>
                  <Input
                    id="signerEmail"
                    type="email"
                    placeholder="riya@bakery.com"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Signature *</Label>
                <Tabs value={signatureTab} onValueChange={setSignatureTab}>
                  <TabsList>
                    <TabsTrigger value="draw">Draw</TabsTrigger>
                    <TabsTrigger value="type">Type</TabsTrigger>
                  </TabsList>

                  <TabsContent value="draw" className="mt-3">
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={150}
                        className="w-full cursor-crosshair bg-white"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      className="mt-2 text-slate-500"
                    >
                      Clear
                    </Button>
                  </TabsContent>

                  <TabsContent value="type" className="mt-3">
                    <div className="border border-slate-200 rounded-lg p-4 bg-white min-h-[100px] flex items-center justify-center">
                      <p
                        className="text-4xl text-slate-800"
                        style={{
                          fontFamily: "Georgia, serif",
                          fontStyle: "italic",
                        }}
                      >
                        {signerName || "Your signature will appear here"}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("view")}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Signature
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
