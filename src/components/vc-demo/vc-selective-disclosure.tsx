import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VerifiableCredential } from "@/lib/types/vc";

interface SelectiveDisclosureProps {
  credential: VerifiableCredential;
  onSubmit: (selectedClaims: string[]) => void;
}

export const SelectiveDisclosure: React.FC<SelectiveDisclosureProps> = ({
  credential,
  onSubmit,
}) => {
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const availableClaims = Object.keys(credential.credentialSubject).filter(
    (key) => key !== "id" && key !== "type",
  );

  const handleToggleClaim = (claim: string) => {
    setSelectedClaims((prev) =>
      prev.includes(claim) ? prev.filter((c) => c !== claim) : [...prev, claim],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>開示する情報を選択</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {availableClaims.map((claim) => (
            <div key={claim} className="flex items-center space-x-2">
              <Checkbox
                id={claim}
                checked={selectedClaims.includes(claim)}
                onCheckedChange={() => handleToggleClaim(claim)}
              />
              <Label htmlFor={claim}>{claim}</Label>
            </div>
          ))}
          <Button
            onClick={() => onSubmit(selectedClaims)}
            disabled={selectedClaims.length === 0}
            className="w-full mt-4"
          >
            選択した情報を開示
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
