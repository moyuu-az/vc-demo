import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createVerifiableCredential } from "@/lib/vc/utils";
import type {
  ErrorInjectionOptions,
  PersonalInfo,
  VerifiableCredential,
} from "@/lib/types/vc";

interface IssuerProps {
  onIssue: (credential: VerifiableCredential) => void;
}

export const IssuerComponent: React.FC<IssuerProps> = ({ onIssue }) => {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: "",
    dateOfBirth: "",
    address: "",
  });

  const [errorOptions, setErrorOptions] = useState<ErrorInjectionOptions>({
    invalidSignature: false,
    expiredCredential: false,
    invalidIssuer: false,
    missingFields: false,
    revokedCredential: false,
  });

  const handleSubmit = async () => {
    try {
      const credential = await createVerifiableCredential(
        "did:web:demo-holder.example.com",
        personalInfo,
        errorOptions,
      );
      onIssue(credential);
    } catch (error) {
      console.error("Error issuing credential:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>個人情報クレデンシャルの発行</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">氏名</Label>
            <Input
              id="name"
              value={personalInfo.name}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">生年月日</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={personalInfo.dateOfBirth}
              onChange={(e) =>
                setPersonalInfo({
                  ...personalInfo,
                  dateOfBirth: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={personalInfo.address}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, address: e.target.value })
              }
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">エラー注入オプション</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="invalidSignature"
                  checked={errorOptions.invalidSignature}
                  onCheckedChange={(checked) =>
                    setErrorOptions({
                      ...errorOptions,
                      invalidSignature: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="invalidSignature">無効な署名</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="expiredCredential"
                  checked={errorOptions.expiredCredential}
                  onCheckedChange={(checked) =>
                    setErrorOptions({
                      ...errorOptions,
                      expiredCredential: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="expiredCredential">有効期限切れ</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="invalidIssuer"
                  checked={errorOptions.invalidIssuer}
                  onCheckedChange={(checked) =>
                    setErrorOptions({
                      ...errorOptions,
                      invalidIssuer: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="invalidIssuer">無効な発行者</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="missingFields"
                  checked={errorOptions.missingFields}
                  onCheckedChange={(checked) =>
                    setErrorOptions({
                      ...errorOptions,
                      missingFields: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="missingFields">必須フィールド欠落</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="revokedCredential"
                  checked={errorOptions.revokedCredential}
                  onCheckedChange={(checked) =>
                    setErrorOptions({
                      ...errorOptions,
                      revokedCredential: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="revokedCredential">失効済み</Label>
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            クレデンシャルを発行
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
