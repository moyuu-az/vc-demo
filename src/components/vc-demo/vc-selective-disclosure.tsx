import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VerifiableCredential } from "@/lib/types/vc";
import { createSelectiveDisclosure, createVerifiablePresentation } from "@/lib/vc/utils";
import React, { useState } from "react";

// 複数のクレデンシャルから選択する場合の型
interface SelectiveDisclosureMultipleProps {
  credentials: VerifiableCredential[];
  requiredClaims: string[];
  onVerify: (credential: VerifiableCredential | any) => void;
  isVerifying: boolean;
  credential?: never; // credential は設定しない
  onSubmit?: never; // onSubmit は設定しない
}

// 単一のクレデンシャルを使用する場合の型
interface SelectiveDisclosureSingleProps {
  credential: VerifiableCredential;
  requiredClaims: string[];
  onSubmit: (credential: VerifiableCredential | any) => void;
  credentials?: never; // credentials は設定しない
  onVerify?: never; // onVerify は設定しない
  isVerifying?: never; // isVerifying は設定しない
}

// 共用型
export type SelectiveDisclosureProps =
  | SelectiveDisclosureMultipleProps
  | SelectiveDisclosureSingleProps;

export const SelectiveDisclosure: React.FC<SelectiveDisclosureProps> = (props) => {
  const [selectedClaims, setSelectedClaims] = useState<string[]>(props.requiredClaims);
  const [selectedCredential, setSelectedCredential] = useState<VerifiableCredential | null>(
    'credential' in props ? props.credential : null
  );

  const handleSubmit = async () => {
    try {
      if (!selectedCredential || !selectedCredential.credentialSubject) {
        console.error("クレデンシャルが選択されていません");
        return;
      }

      // 必ず id を含めるようにする
      const finalSelectedClaims = [...selectedClaims];
      if (
        !finalSelectedClaims.includes("id") &&
        selectedCredential.credentialSubject.id
      ) {
        finalSelectedClaims.push("id");
      }

      // プレゼンテーション形式を確認 (デフォルトはSD-JWT)
      const presentationFormat =
        selectedCredential.credentialSubject.presentationFormat || "sd-jwt";

      let disclosureResponse;

      // プレゼンテーション形式に応じて処理を分ける
      if (presentationFormat === "vp") {
        // Verifiable Presentation形式
        disclosureResponse = await createVerifiablePresentation(
          selectedCredential,
          finalSelectedClaims
        );
        console.log("作成したVP:", disclosureResponse);
      } else {
        // SD-JWT形式
        disclosureResponse = await createSelectiveDisclosure(
          selectedCredential,
          finalSelectedClaims
        );
        console.log("作成したSD-JWT:", disclosureResponse);
      }

      if ('onVerify' in props && props.onVerify) {
        props.onVerify(disclosureResponse);
      } else if ('onSubmit' in props && props.onSubmit) {
        props.onSubmit(disclosureResponse);
      }
    } catch (error) {
      console.error("Error creating selective disclosure:", error);
    }
  };

  // 複数クレデンシャルから選択する場合のコンポーネント
  const renderCredentialSelection = () => {
    if (!('credentials' in props) || !props.credentials || props.credentials.length === 0) {
      return (
        <div className="text-center text-red-500">
          利用可能なクレデンシャルがありません
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>クレデンシャルを選択</CardTitle>
            <CardDescription>
              提示するクレデンシャルを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {props.credentials.map((cred, index) => (
                <div
                  key={cred.id}
                  className={`p-2 border rounded-lg cursor-pointer ${selectedCredential?.id === cred.id
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                    }`}
                  onClick={() => setSelectedCredential(cred)}
                >
                  <div className="font-medium">
                    {cred.type[cred.type.length - 1]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    発行者: {cred.issuer.name || cred.issuer.id}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {'credentials' in props && props.credentials && props.credentials.length > 0
        ? renderCredentialSelection()
        : null}

      {selectedCredential && (
        <Card>
          <CardHeader>
            <CardTitle>開示する情報を選択</CardTitle>
            <CardDescription>
              要求されている情報: {props.requiredClaims.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(selectedCredential.credentialSubject)
                .filter((key) => key !== "id" && key !== "type" && key !== "presentationFormat")
                .map((claim) => (
                  <div key={claim} className="flex items-center space-x-2">
                    <Checkbox
                      id={claim}
                      checked={selectedClaims.includes(claim)}
                      onCheckedChange={() => {
                        setSelectedClaims((prev) =>
                          prev.includes(claim)
                            ? prev.filter((c) => c !== claim)
                            : [...prev, claim],
                        );
                      }}
                    />
                    <Label htmlFor={claim}>
                      {claim === "name"
                        ? "氏名"
                        : claim === "dateOfBirth"
                          ? "生年月日"
                          : claim === "address"
                            ? "住所"
                            : claim}
                      {props.requiredClaims.includes(claim) && " (必須)"}
                    </Label>
                  </div>
                ))}
              <Button
                onClick={handleSubmit}
                className="w-full mt-4"
                disabled={'isVerifying' in props && props.isVerifying || !selectedCredential}
              >
                {'isVerifying' in props && props.isVerifying
                  ? "検証中..."
                  : "選択した情報を開示"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
