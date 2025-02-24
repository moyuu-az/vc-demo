import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ErrorInjectionOptions } from "@/lib/vc/types";

export const ErrorInjectionForm: React.FC<{
  onErrorOptionsChange: (options: ErrorInjectionOptions) => void;
}> = ({ onErrorOptionsChange }) => {
  const [options, setOptions] = useState<ErrorInjectionOptions>({
    invalidSignature: false,
    expiredCredential: false,
    invalidIssuer: false,
    missingFields: false,
    revokedCredential: false,
  });

  const handleChange = (key: keyof ErrorInjectionOptions) => {
    const newOptions = {
      ...options,
      [key]: !options[key],
    };
    setOptions(newOptions);
    onErrorOptionsChange(newOptions);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">エラー注入オプション</h3>
      <div className="space-y-2">
        {Object.entries(options).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox
              id={key}
              checked={value}
              onCheckedChange={() =>
                handleChange(key as keyof ErrorInjectionOptions)
              }
            />
            <Label htmlFor={key}>
              {key === "invalidSignature" && "無効な署名"}
              {key === "expiredCredential" && "有効期限切れ"}
              {key === "invalidIssuer" && "無効な発行者"}
              {key === "missingFields" && "必須フィールド欠落"}
              {key === "revokedCredential" && "失効済み"}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};
