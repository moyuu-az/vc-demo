import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifiableCredential } from "@/lib/types/vc";
import { verifyCredential } from "@/lib/vc/utils";
import { CheckCircle2, XCircle } from "lucide-react";
import React, { useState } from "react";
import { SelectiveDisclosure } from "./vc-selective-disclosure";
import { VerifierRequest } from "./vc-verifier-request";

interface VerifierProps {
  storedCredentials: VerifiableCredential[];
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

const VerifierComponent: React.FC<VerifierProps> = ({ storedCredentials }) => {
  const [requiredClaims, setRequiredClaims] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedCredential, setSelectedCredential] =
    useState<VerifiableCredential | null>(null);
  const [isRequestConfirmed, setIsRequestConfirmed] = useState(false);
  const [showCredentialSelection, setShowCredentialSelection] = useState(false);

  const handleRequestSubmit = (claims: string[]) => {
    setRequiredClaims(claims);
    setIsRequestConfirmed(true);
    setShowCredentialSelection(true);
  };

  const handleVerify = async (disclosureResponse: VerifiableCredential) => {
    setIsVerifying(true);
    try {
      // 通常のVC検証を実行
      const result = await verifyCredential(disclosureResponse);

      setVerificationResult(result);
      setSelectedCredential(disclosureResponse);

      // 要求情報の検証
      const hasAllRequiredClaims = requiredClaims.every((claim) =>
        claim in disclosureResponse.credentialSubject
      );

      if (!hasAllRequiredClaims) {
        result.isValid = false;
        result.errors.push("要求された情報が不足しています");
      }
    } catch (error) {
      console.error("検証エラー:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const renderVerificationDetails = () => {
    if (!verificationResult) return null;

    const getCheckDetails = (key: string) => {
      switch (key) {
        case "schemaValid":
          return {
            title: "スキーマ検証",
            description: "クレデンシャルが標準的なVC形式に準拠しているか確認",
            reference:
              "@context, type, issuer, credentialSubject などの必須フィールドの存在を確認",
          };
        case "notExpired":
          return {
            title: "有効期限",
            description: "クレデンシャルが有効期限内かどうか確認",
            reference: `発行日: ${selectedCredential?.validFrom}\n有効期限: ${selectedCredential?.validUntil || "無期限"}`,
          };
        case "notRevoked":
          return {
            title: "失効状態",
            description: "クレデンシャルが失効していないか確認",
            reference: selectedCredential?.credentialStatus
              ? `失効確認用ID: ${selectedCredential.credentialStatus.id}`
              : "失効情報なし",
          };
        case "proofValid":
          return {
            title: "署名検証",
            description: "発行者の電子署名が有効か確認",
            reference: selectedCredential?.proof
              ? `署名タイプ: ${selectedCredential.proof.type}\n署名日時: ${selectedCredential.proof.created}`
              : "署名情報なし",
          };
        case "issuerValid":
          return {
            title: "発行者検証",
            description: "発行者のDIDが有効か確認",
            reference: `発行者: ${selectedCredential?.issuer.name}\nDID: ${selectedCredential?.issuer.id}`,
          };
        default:
          return { title: "", description: "", reference: "" };
      }
    };

    // 要求情報の開示状態を確認
    const disclosureStatus = requiredClaims.map((claim) => ({
      claim,
      isDisclosed: claim in selectedCredential?.credentialSubject,
    }));
    const allClaimsDisclosed = disclosureStatus.every(
      (status) => status.isDisclosed,
    );

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>検証結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 要求情報の検証結果を最初に表示 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">要求情報の開示状態</h4>
                <div className="space-y-2">
                  {disclosureStatus.map(({ claim, isDisclosed }) => (
                    <div key={claim} className="flex items-center gap-2">
                      {getStatusIcon(isDisclosed)}
                      <span className="text-sm">
                        {claim === "name"
                          ? "氏名"
                          : claim === "dateOfBirth"
                            ? "生年月日"
                            : "住所"}
                        :
                      </span>
                      <span
                        className={`text-sm ${isDisclosed ? "text-green-600" : "text-red-600"}`}
                      >
                        {isDisclosed ? "開示" : "未開示"}
                      </span>
                    </div>
                  ))}
                </div>
                {!allClaimsDisclosed && (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                    一部の要求情報が開示されていません
                  </div>
                )}
              </div>

              {/* 既存の検証項目の表示 */}
              <div className="space-y-3">
                <h4 className="font-medium">技術的検証結果</h4>
                {Object.entries(verificationResult.checks).map(
                  ([key, value]) => {
                    const details = getCheckDetails(key);
                    return (
                      <div
                        key={key}
                        className="flex items-start gap-2 bg-gray-50 p-3 rounded"
                      >
                        {getStatusIcon(value)}
                        <div>
                          <h5 className="font-medium">{details.title}</h5>
                          <p className="text-sm text-gray-600">
                            {details.description}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {details.reference}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* エラーメッセージの表示 */}
              {verificationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-700 mb-2">検証エラー</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {verificationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 総合判定 */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">総合判定:</span>
                  {getStatusIcon(verificationResult.isValid)}
                  <span
                    className={
                      verificationResult.isValid
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {verificationResult.isValid
                      ? "有効なクレデンシャル"
                      : "無効なクレデンシャル"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {!isRequestConfirmed ? (
        <VerifierRequest onRequestSubmit={handleRequestSubmit} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>要求情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>以下の情報の提示を要求しています：</p>
                <ul className="list-disc list-inside">
                  {requiredClaims.map((claim) => (
                    <li key={claim}>
                      {claim === "name"
                        ? "氏名"
                        : claim === "dateOfBirth"
                          ? "生年月日"
                          : "住所"}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    setIsRequestConfirmed(false);
                    setShowCredentialSelection(false);
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  要求情報を変更
                </Button>
              </div>
            </CardContent>
          </Card>

          {showCredentialSelection && (
            <Card>
              <CardHeader>
                <CardTitle>クレデンシャル選択</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {storedCredentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedCredential(cred)}
                    >
                      <p className="font-medium">
                        {cred.type[cred.type.length - 1]}
                      </p>
                      <p className="text-sm text-gray-600">
                        発行者: {cred.issuer.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedCredential && (
            <SelectiveDisclosure
              credential={selectedCredential}
              requiredClaims={requiredClaims}
              onSubmit={handleVerify}
            />
          )}

          {verificationResult && renderVerificationDetails()}
        </>
      )}
    </div>
  );
};

export default VerifierComponent;
