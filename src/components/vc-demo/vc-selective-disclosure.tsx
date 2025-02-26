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
import { createSelectiveDisclosure } from "@/lib/vc/utils";
import React, { useState } from "react";

interface SelectiveDisclosureProps {
  credentials: VerifiableCredential[];
  requiredClaims: string[];
  onVerify: (credential: VerifiableCredential) => void;
  isVerifying: boolean;
}

export const SelectiveDisclosure: React.FC<SelectiveDisclosureProps> = ({
  credentials,
  requiredClaims,
  onVerify,
  isVerifying,
}) => {
  const [selectedClaims, setSelectedClaims] =
    useState<string[]>(requiredClaims);
  const [selectedCredential, setSelectedCredential] =
    useState<VerifiableCredential | null>(null);

  const handleSubmit = async () => {
    try {
      if (!selectedCredential || !selectedCredential.credentialSubject) {
        console.error("クレデンシャルが選択されていません");
        return;
      }

      // 必ず id を含めるようにする
      const finalSelectedClaims = [...selectedClaims];
      if (!finalSelectedClaims.includes("id") && selectedCredential.credentialSubject.id) {
        finalSelectedClaims.push("id");
      }

      const disclosureResponse = await createSelectiveDisclosure(
        selectedCredential,
        finalSelectedClaims,
      );
      onVerify(disclosureResponse);
    } catch (error) {
      console.error("Error creating selective disclosure:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* クレデンシャル選択 */}
      <Card>
        <CardHeader>
          <CardTitle>クレデンシャル選択</CardTitle>
          <CardDescription>
            開示するクレデンシャルを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${selectedCredential?.id === cred.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
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

      {/* 開示情報選択 */}
      {selectedCredential && (
        <Card>
          <CardHeader>
            <CardTitle>開示する情報を選択</CardTitle>
            <CardDescription>
              要求されている情報: {requiredClaims.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(selectedCredential.credentialSubject)
                .filter((key) => key !== "id" && key !== "type")
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
                      disabled={requiredClaims.includes(claim)}
                    />
                    <Label htmlFor={claim}>
                      {claim === "name"
                        ? "氏名"
                        : claim === "dateOfBirth"
                          ? "生年月日"
                          : claim === "address"
                            ? "住所"
                            : claim}
                      {requiredClaims.includes(claim) && " (必須)"}
                    </Label>
                  </div>
                ))}
              <Button
                onClick={handleSubmit}
                className="w-full mt-4"
                disabled={isVerifying || !selectedCredential}
              >
                {isVerifying ? "検証中..." : "選択した情報を開示して検証"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
