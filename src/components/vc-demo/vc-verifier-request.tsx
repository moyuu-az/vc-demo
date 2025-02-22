import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface VerifierRequestProps {
  onRequestSubmit: (requiredClaims: string[]) => void;
}

export const VerifierRequest: React.FC<VerifierRequestProps> = ({
  onRequestSubmit,
}) => {
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const availableClaims = ["name", "dateOfBirth", "address"];

  const handleToggleClaim = (claim: string) => {
    setSelectedClaims((prev) =>
      prev.includes(claim) ? prev.filter((c) => c !== claim) : [...prev, claim],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>必要な個人情報の設定</CardTitle>
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
              <Label htmlFor={claim}>
                {claim === "name"
                  ? "氏名"
                  : claim === "dateOfBirth"
                    ? "生年月日"
                    : "住所"}
              </Label>
            </div>
          ))}
          <Button
            onClick={() => onRequestSubmit(selectedClaims)}
            disabled={selectedClaims.length === 0}
            className="w-full mt-4"
          >
            要求する情報を確定
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
