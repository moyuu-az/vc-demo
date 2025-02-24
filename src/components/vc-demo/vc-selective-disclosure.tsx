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
  credential: VerifiableCredential;
  requiredClaims: string[];
  onSubmit: (credential: VerifiableCredential) => void;
}

export const SelectiveDisclosure: React.FC<SelectiveDisclosureProps> = ({
  credential,
  requiredClaims,
  onSubmit,
}) => {
  const [selectedClaims, setSelectedClaims] =
    useState<string[]>(requiredClaims);

  const handleSubmit = async () => {
    try {
      if (!credential || !credential.credentialSubject) {
        console.error("Invalid credential format");
        return;
      }

      const disclosureResponse = await createSelectiveDisclosure(
        credential,
        selectedClaims,
      );
      onSubmit(disclosureResponse);
    } catch (error) {
      console.error("Error creating selective disclosure:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>開示する情報を選択</CardTitle>
        <CardDescription>
          要求されている情報: {requiredClaims.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.keys(credential.credentialSubject)
            .filter((key) => key !== "id")
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
                  disabled={claim === "type"}
                />
                <Label htmlFor={claim}>{claim}</Label>
              </div>
            ))}
          <Button onClick={handleSubmit} className="w-full mt-4">
            選択した情報を開示
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
