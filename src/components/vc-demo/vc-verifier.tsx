import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyCredential } from "@/lib/vc/utils";
import { VerifiableCredential } from "@/lib/types/vc";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface VerifierProps {
  credential: VerifiableCredential | null;
}

interface VerificationResult {
  isValid: boolean;
  checks: {
    schemaValid: boolean;
    notExpired: boolean;
    notRevoked: boolean;
    proofValid: boolean;
    issuerValid: boolean;
  };
  errors: string[];
}

const VerificationStatusIcon = ({ isValid }: { isValid: boolean }) => {
  return isValid ? (
    <CheckCircle2 className="w-5 h-5 text-green-500" />
  ) : (
    <XCircle className="w-5 h-5 text-red-500" />
  );
};

const VerifierComponent: React.FC<VerifierProps> = ({ credential }) => {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!credential) {
        setVerificationResult(null);
        return;
      }

      setIsVerifying(true);
      try {
        const result = await verifyCredential(credential);
        console.log('Verification result:', result); // デバッグ用
        setVerificationResult(result);
      } catch (error) {
        console.error("検証エラー:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [credential]);

  if (!credential) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>クレデンシャル検証</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground mr-2" />
            <p>検証するクレデンシャルを選択してください</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>検証結果</CardTitle>
      </CardHeader>
      <CardContent>
        {isVerifying ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : verificationResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-medium">総合判定</span>
              <div className="flex items-center">
                <VerificationStatusIcon isValid={verificationResult.isValid} />
                <span className="ml-2">
                  {verificationResult.isValid ? "有効" : "無効"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(verificationResult.checks).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span>{key}</span>
                  <VerificationStatusIcon isValid={value as boolean} />
                </div>
              ))}
            </div>

            {verificationResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="text-red-700 font-medium mb-2">エラー</h4>
                <ul className="list-disc list-inside space-y-1">
                  {verificationResult.errors.map(
                    (error: string, index: number) => (
                      <li key={index} className="text-red-600 text-sm">
                        {error}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default VerifierComponent;
