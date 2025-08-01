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
import {
  createSelectiveDisclosure,
  createVerifiablePresentation,
} from "@/lib/vc/utils";
import React, { useState, useEffect } from "react";

// 型定義は変更なし
export type SelectiveDisclosureProps =
  | SelectiveDisclosureMultipleProps
  | SelectiveDisclosureSingleProps;

export const SelectiveDisclosure: React.FC<SelectiveDisclosureProps> = (
  props,
) => {
  const [selectedClaims, setSelectedClaims] = useState<string[]>(
    props.requiredClaims,
  );
  const [selectedCredential, setSelectedCredential] =
    useState<VerifiableCredential | null>(
      "credential" in props ? props.credential : null,
    );

  // 技術的フィールド（選択対象にならないフィールド）を定義
  const technicalFields = ["id", "type", "presentationFormat"];

  // 利用可能な属性を取得（技術的フィールドを除外）
  const getAvailableClaims = (credential: VerifiableCredential) => {
    return Object.keys(credential.credentialSubject).filter(
      (key) => !technicalFields.includes(key),
    );
  };

  // すべての利用可能属性が選択されているかチェック
  const areAllClaimsSelected = (
    credential: VerifiableCredential,
    claims: string[],
  ) => {
    const availableClaims = getAvailableClaims(credential);
    return availableClaims.every((claim) => claims.includes(claim));
  };

  // 初期化時にすべての属性を選択
  useEffect(() => {
    if (selectedCredential) {
      const availableClaims = getAvailableClaims(selectedCredential);
      setSelectedClaims([...props.requiredClaims, ...availableClaims]);
    }
  }, [selectedCredential, props.requiredClaims]);

  const handleSubmit = async () => {
    try {
      if (!selectedCredential || !selectedCredential.credentialSubject) {
        console.error("クレデンシャルが選択されていません");
        return;
      }

      // id を常に含める
      const finalSelectedClaims = [...selectedClaims];
      if (
        !finalSelectedClaims.includes("id") &&
        selectedCredential.credentialSubject.id
      ) {
        finalSelectedClaims.push("id");
      }

      // プレゼンテーション形式を取得（デフォルトはSD-JWT）
      const presentationFormat =
        selectedCredential.credentialSubject.presentationFormat || "sd-jwt";

      // 完全開示かどうかを判断するためのログ
      console.log("選択された属性:", finalSelectedClaims);
      console.log("利用可能な属性:", getAvailableClaims(selectedCredential));
      console.log(
        "すべて選択されているか:",
        areAllClaimsSelected(selectedCredential, finalSelectedClaims),
      );

      let disclosureResponse;

      // 形式に基づいて処理を選択
      if (presentationFormat === "vp") {
        // Verifiable Presentation形式
        disclosureResponse = await createVerifiablePresentation(
          selectedCredential,
          finalSelectedClaims,
        );
        console.log("VP作成結果:", disclosureResponse);
      } else {
        // SD-JWT形式
        disclosureResponse = await createSelectiveDisclosure(
          selectedCredential,
          finalSelectedClaims,
        );
        console.log("SD-JWT作成結果:", disclosureResponse);
      }

      // 結果を適切なハンドラに渡す
      if ("onVerify" in props && props.onVerify) {
        props.onVerify(disclosureResponse);
      } else if ("onSubmit" in props && props.onSubmit) {
        props.onSubmit(disclosureResponse);
      }
    } catch (error) {
      console.error("選択的開示の作成中にエラーが発生しました:", error);
    }
  };

  // クレデンシャル選択コンポーネントのレンダリング
  const renderCredentialSelection = () => {
    if (
      !("credentials" in props) ||
      !props.credentials ||
      props.credentials.length === 0
    ) {
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
                  className={`p-2 border rounded-lg cursor-pointer ${
                    selectedCredential?.id === cred.id
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  }`}
                  onClick={() => {
                    setSelectedCredential(cred);
                    // クレデンシャル選択時にすべての属性を自動選択
                    const availableClaims = getAvailableClaims(cred);
                    setSelectedClaims([
                      ...props.requiredClaims,
                      ...availableClaims,
                    ]);
                  }}
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
      {"credentials" in props &&
      props.credentials &&
      props.credentials.length > 0
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
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="select-all"
                  checked={areAllClaimsSelected(
                    selectedCredential,
                    selectedClaims,
                  )}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // すべての利用可能属性を選択
                      const availableClaims =
                        getAvailableClaims(selectedCredential);
                      setSelectedClaims([
                        ...props.requiredClaims,
                        ...availableClaims,
                      ]);
                    } else {
                      // 必須属性のみを選択
                      setSelectedClaims([...props.requiredClaims]);
                    }
                  }}
                />
                <Label htmlFor="select-all" className="font-medium">
                  すべて選択
                </Label>
              </div>

              {/* 個別の属性のチェックボックス */}
              {Object.keys(selectedCredential.credentialSubject)
                .filter((key) => !technicalFields.includes(key))
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
                disabled={
                  ("isVerifying" in props && props.isVerifying) ||
                  !selectedCredential
                }
              >
                {"isVerifying" in props && props.isVerifying
                  ? "検証中..."
                  : "選択した情報を開示"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
