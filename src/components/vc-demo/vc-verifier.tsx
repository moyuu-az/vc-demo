import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiableCredential } from "@/lib/types/vc";
import {
  DetailedVerificationResult,
  detectPresentationFormat,
  verifyCredentialDetailed,
  verifyCredentialOrPresentation,
} from "@/lib/vc/utils";
import { CheckCircle2, XCircle } from "lucide-react";
import React, { useState } from "react";
import { SelectiveDisclosure } from "./vc-selective-disclosure";
import { VerifierRequest } from "./vc-verifier-request";

interface VerifierProps {
  storedCredentials: VerifiableCredential[];
}

const VerifierComponent: React.FC<VerifierProps> = ({ storedCredentials }) => {
  const [requiredClaims, setRequiredClaims] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] =
    useState<DetailedVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedCredential, setSelectedCredential] =
    useState<VerifiableCredential | null>(null);
  const [isRequestConfirmed, setIsRequestConfirmed] = useState(false);
  const [showCredentialSelection, setShowCredentialSelection] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const handleRequestSubmit = (claims: string[]) => {
    setRequiredClaims(claims);
    setIsRequestConfirmed(true);
    setShowCredentialSelection(true);
  };

  const handleVerify = async (
    disclosureResponse: VerifiableCredential | any,
  ) => {
    setIsVerifying(true);
    try {
      console.log("検証開始: disclosureResponse = ", disclosureResponse); // デバッグログ

      // プレゼンテーション形式を検出
      const format = detectPresentationFormat(disclosureResponse);
      console.log("検出された形式:", format);

      let result;
      // VP形式の場合
      if (
        format === "vp" &&
        Array.isArray(disclosureResponse.verifiableCredential)
      ) {
        // 最初のクレデンシャルを使用
        const vcInPresentation = disclosureResponse.verifiableCredential[0];

        // 詳細な検証を実行
        result = await verifyCredentialDetailed(vcInPresentation);
        // VP自体の検証も行う
        const vpResult =
          await verifyCredentialOrPresentation(disclosureResponse);

        // VPの検証結果を統合
        result.isValid = result.isValid && vpResult.isValid;
        if (!vpResult.isValid) {
          result.errors.push(...vpResult.errors);
        }

        // VP全体を表示対象に設定
        setSelectedCredential(disclosureResponse);
        // 生データとしてもVP全体を保存
        result.rawCredential = disclosureResponse;
        // VP形式であることを記録
        result.presentationFormat = "vp";
      } else {
        // 詳細な検証を実行 (SD-JWTまたは通常のVC)
        result = await verifyCredentialDetailed(disclosureResponse as any);
        setSelectedCredential(disclosureResponse);
        // 形式を記録
        result.presentationFormat = format;
      }

      console.log("検証結果: ", result); // デバッグログ
      setVerificationResult(result);

      // 要求情報の検証
      const subjectToCheck =
        format === "vp"
          ? disclosureResponse.verifiableCredential[0].credentialSubject
          : disclosureResponse.credentialSubject;

      const missingClaims = requiredClaims.filter(
        (claim) => !(claim in subjectToCheck),
      );

      if (missingClaims.length > 0) {
        // スキーマ検証の結果を更新
        result.checks.schemaValid = false;
        result.isValid = false;
        result.errors.push(
          `必須フィールドが欠落しています: ${missingClaims.join(", ")}`,
        );
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

    // VP内の最初のVCを取得（VP形式の場合）
    const isVPFormat = verificationResult.presentationFormat === "vp";
    const vcObject =
      isVPFormat &&
      Array.isArray((selectedCredential as any)?.verifiableCredential)
        ? (selectedCredential as any).verifiableCredential[0]
        : selectedCredential;

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
            reference: `発行日: ${vcObject?.validFrom}\n有効期限: ${vcObject?.validUntil || "無期限"}`,
          };
        case "notRevoked":
          return {
            title: "失効状態",
            description: "クレデンシャルが失効していないか確認",
            reference: vcObject?.credentialStatus
              ? `失効確認用ID: ${vcObject.credentialStatus.id}`
              : "失効情報なし",
          };
        case "proofValid":
          return {
            title: "署名検証",
            description: "発行者の電子署名が有効か確認",
            reference: vcObject?.proof
              ? `署名タイプ: ${vcObject.proof.type}\n署名日時: ${vcObject.proof.created}`
              : "署名情報なし",
          };
        case "issuerValid":
          return {
            title: "発行者検証",
            description: "発行者のDIDが有効か確認",
            reference: vcObject?.issuer
              ? `発行者: ${vcObject.issuer.name || "N/A"}\nDID: ${vcObject.issuer.id || "N/A"}`
              : "発行者情報なし",
          };
        default:
          return { title: "", description: "", reference: "" };
      }
    };

    // 要求情報の開示状態を確認
    const subjectToCheck =
      isVPFormat &&
      Array.isArray((selectedCredential as any)?.verifiableCredential)
        ? (selectedCredential as any).verifiableCredential[0].credentialSubject
        : selectedCredential?.credentialSubject;

    const disclosureStatus = requiredClaims.map((claim) => ({
      claim,
      isDisclosed: subjectToCheck ? claim in subjectToCheck : false,
    }));
    const allClaimsDisclosed = disclosureStatus.every(
      (status) => status.isDisclosed,
    );

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>検証結果</CardTitle>
            {(verificationResult as any).presentationFormat && (
              <p className="text-sm text-muted-foreground">
                形式:{" "}
                {(verificationResult as any).presentationFormat === "vp"
                  ? "Verifiable Presentation (W3C標準)"
                  : (verificationResult as any).presentationFormat === "sd-jwt"
                    ? "Selective Disclosure JWT"
                    : "通常のVerifiable Credential"}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList className="mb-4">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="technical">技術詳細</TabsTrigger>
                <TabsTrigger value="raw">生データ</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
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
                      <h4 className="font-medium text-red-700 mb-2">
                        検証エラー
                      </h4>
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
              </TabsContent>

              <TabsContent value="technical">
                <div className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    {/* 署名検証の詳細 */}
                    <AccordionItem value="proof">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <span>署名検証の詳細</span>
                          {getStatusIcon(verificationResult.checks.proofValid)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {verificationResult.technicalDetails?.proof ? (
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">署名タイプ:</div>
                              <div>
                                {verificationResult.technicalDetails.proof.type}
                              </div>

                              <div className="font-medium">
                                署名アルゴリズム:
                              </div>
                              <div>
                                {
                                  verificationResult.technicalDetails.proof
                                    .cryptosuite
                                }
                              </div>

                              <div className="font-medium">署名日時:</div>
                              <div>
                                {
                                  verificationResult.technicalDetails.proof
                                    .created
                                }
                              </div>

                              <div className="font-medium">検証メソッド:</div>
                              <div>
                                {
                                  verificationResult.technicalDetails.proof
                                    .verificationMethod
                                }
                              </div>
                            </div>

                            {verificationResult.technicalDetails.proof
                              .verificationDetails && (
                              <div className="mt-3 p-3 bg-gray-50 rounded">
                                <h5 className="font-medium mb-2">検証詳細</h5>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="font-medium">署名検証:</div>
                                  <div>
                                    {getStatusIcon(
                                      verificationResult.technicalDetails.proof
                                        .verificationDetails.signatureValid,
                                    )}
                                  </div>

                                  <div className="font-medium">
                                    検証メソッド解決:
                                  </div>
                                  <div>
                                    {getStatusIcon(
                                      verificationResult.technicalDetails.proof
                                        .verificationDetails.methodResolved,
                                    )}
                                  </div>

                                  <div className="font-medium">
                                    プルーフパーパス検証:
                                  </div>
                                  <div>
                                    {getStatusIcon(
                                      verificationResult.technicalDetails.proof
                                        .verificationDetails.proofPurposeValid,
                                    )}
                                  </div>

                                  <div className="font-medium">
                                    暗号スイート対応:
                                  </div>
                                  <div>
                                    {getStatusIcon(
                                      verificationResult.technicalDetails.proof
                                        .verificationDetails
                                        .cryptosuiteSupported,
                                    )}
                                  </div>
                                </div>

                                {verificationResult.technicalDetails.proof
                                  .verificationDetails.signatureData && (
                                  <div className="mt-2">
                                    <div className="font-medium">署名値:</div>
                                    <div className="bg-gray-100 p-2 rounded mt-1 break-all text-xs">
                                      {
                                        verificationResult.technicalDetails
                                          .proof.verificationDetails
                                          .signatureData.signatureValue
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-500">
                            署名情報がありません
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* スキーマ検証の詳細 */}
                    <AccordionItem value="schema">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <span>スキーマ検証の詳細</span>
                          {getStatusIcon(verificationResult.checks.schemaValid)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {verificationResult.technicalDetails?.schema && (
                          <div className="space-y-3 text-sm">
                            <div>
                              <h5 className="font-medium mb-1">
                                必須フィールド
                              </h5>
                              <div className="bg-gray-50 p-2 rounded">
                                {verificationResult.technicalDetails.schema.requiredFields?.join(
                                  ", ",
                                )}
                              </div>
                            </div>

                            <div>
                              <h5 className="font-medium mb-1">
                                オプションフィールド
                              </h5>
                              <div className="bg-gray-50 p-2 rounded">
                                {verificationResult.technicalDetails.schema.optionalFields?.join(
                                  ", ",
                                )}
                              </div>
                            </div>

                            {verificationResult.technicalDetails.schema
                              .validationErrors && (
                              <div>
                                <h5 className="font-medium mb-1 text-red-600">
                                  検証エラー
                                </h5>
                                <ul className="list-disc list-inside text-red-600 bg-red-50 p-2 rounded">
                                  {verificationResult.technicalDetails.schema.validationErrors.map(
                                    (error, idx) => (
                                      <li key={idx}>{error}</li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* 発行者検証の詳細 */}
                    <AccordionItem value="issuer">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <span>発行者検証の詳細</span>
                          {getStatusIcon(verificationResult.checks.issuerValid)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {verificationResult.technicalDetails?.issuer ? (
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">発行者DID:</div>
                              <div className="break-all">
                                {verificationResult.technicalDetails.issuer.did}
                              </div>
                            </div>

                            {verificationResult.technicalDetails.issuer
                              .didDocument && (
                              <div>
                                <h5 className="font-medium mb-1">
                                  DIDドキュメント
                                </h5>
                                <div className="bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                  <pre className="text-xs">
                                    {JSON.stringify(
                                      verificationResult.technicalDetails.issuer
                                        .didDocument,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-500">
                            発行者情報を取得できませんでした
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* 有効期限検証の詳細 */}
                    <AccordionItem value="expiry">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <span>有効期限検証の詳細</span>
                          {getStatusIcon(verificationResult.checks.notExpired)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {verificationResult.technicalDetails?.timing && (
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">有効開始日:</div>
                              <div>
                                {
                                  verificationResult.technicalDetails.timing
                                    .validFrom
                                }
                              </div>

                              <div className="font-medium">有効期限:</div>
                              <div>
                                {verificationResult.technicalDetails.timing
                                  .validUntil || "無期限"}
                              </div>

                              <div className="font-medium">現在時刻:</div>
                              <div>
                                {
                                  verificationResult.technicalDetails.timing
                                    .currentTime
                                }
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* 失効検証の詳細 */}
                    {verificationResult.technicalDetails?.revocation && (
                      <AccordionItem value="revocation">
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span>失効検証の詳細</span>
                            {getStatusIcon(
                              verificationResult.checks.notRevoked,
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">失効目的:</div>
                              <div>
                                {
                                  verificationResult.technicalDetails.revocation
                                    .status
                                }
                              </div>

                              <div className="font-medium">
                                失効リストクレデンシャル:
                              </div>
                              <div className="break-all">
                                {
                                  verificationResult.technicalDetails.revocation
                                    .statusListCredential
                                }
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              </TabsContent>

              <TabsContent value="raw">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">クレデンシャル生データ</h4>
                    </div>
                    <div className="bg-gray-100 p-3 rounded overflow-auto max-h-96">
                      <pre className="text-xs">
                        {JSON.stringify(
                          verificationResult.rawCredential,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
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
              </div>
            </CardContent>
          </Card>

          {showCredentialSelection && !verificationResult && (
            <SelectiveDisclosure
              credentials={storedCredentials}
              requiredClaims={requiredClaims}
              onVerify={handleVerify}
              isVerifying={isVerifying}
            />
          )}

          {verificationResult && renderVerificationDetails()}
        </>
      )}
    </div>
  );
};

export { VerifierComponent };
