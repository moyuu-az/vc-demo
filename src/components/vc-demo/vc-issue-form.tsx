import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonalInfo } from "@/lib/types/vc";
import { fetchAddressFromPostalCode } from "@/lib/utils/address";
import { ErrorInjectionOptions } from "@/lib/vc/types";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { ErrorInjectionForm } from "./error-injection-form";

interface VCIssueFormProps {
  onSubmit: (personalInfo: PersonalInfo, errorOptions: ErrorInjectionOptions) => void;
  onCancel: () => void;
}

const colorOptions = [
  { bg: "from-green-500 to-green-600", text: "text-white", label: "緑" },
  { bg: "from-blue-500 to-blue-600", text: "text-white", label: "青" },
  { bg: "from-purple-500 to-purple-600", text: "text-white", label: "紫" },
  { bg: "from-red-500 to-red-600", text: "text-white", label: "赤" },
];

const predefinedTypes = [
  "PersonalInfoCredential",
  "StudentCredential",
  "EmployeeCredential",
  "MembershipCredential",
  "HealthCredential",
];

const VCIssueForm: React.FC<VCIssueFormProps> = ({ onSubmit, onCancel }) => {
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [credentialType, setCredentialType] = useState("PersonalInfoCredential");
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState("");
  const [personalInfo, setPersonalInfo] = React.useState<PersonalInfo>({
    name: "",
    dateOfBirth: "",
    address: "",
  });
  const [postalCode, setPostalCode] = React.useState("");
  const [isLoadingAddress, setIsLoadingAddress] = React.useState(false);
  const [errorOptions, setErrorOptions] = useState<ErrorInjectionOptions>({
    invalidSignature: false,
    expiredCredential: false,
    invalidIssuer: false,
    missingFields: false,
    revokedCredential: false,
  });

  // エラータイプの設定
  const [errorTypes, setErrorTypes] = useState({
    invalidSignature: "InvalidSignatureCredential",
    expiredCredential: "ExpiredCredential",
    invalidIssuer: "InvalidIssuerCredential",
    missingFields: "MissingFieldsCredential",
    revokedCredential: "RevokedCredential",
  });

  const handlePostalCodeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setPostalCode(value);

    // 7桁の数字が入力されたら住所を検索
    if (value.replace(/-/g, "").match(/^\d{7}$/)) {
      setIsLoadingAddress(true);
      try {
        const address = await fetchAddressFromPostalCode(value);
        if (address) {
          setPersonalInfo((prev) => ({ ...prev, address }));
        }
      } finally {
        setIsLoadingAddress(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // エラーオプションに応じてタイプを変更
    let finalType = isCustomType ? customType : credentialType;

    onSubmit({
      ...personalInfo,
      style: {
        backgroundColor: selectedColor.bg,
        textColor: selectedColor.text,
      },
      credentialType: finalType,
      errorOptions: errorOptions  // エラーオプションを明示的に追加
    }, errorOptions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>クレデンシャルタイプ</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="customType"
            checked={isCustomType}
            onCheckedChange={(checked) => setIsCustomType(checked as boolean)}
          />
          <Label htmlFor="customType">カスタムタイプを使用</Label>
        </div>

        {isCustomType ? (
          <Input
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="カスタムタイプを入力"
            className="mt-2"
          />
        ) : (
          <select
            value={credentialType}
            onChange={(e) => setCredentialType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            {predefinedTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* エラー注入オプションのタイプ設定 */}
      {Object.entries(errorOptions).map(([key, value]) => (
        value && (
          <div key={key} className="space-y-2">
            <Label htmlFor={`errorType_${key}`}>{`${key}のタイプ名`}</Label>
            <Input
              id={`errorType_${key}`}
              value={errorTypes[key as keyof typeof errorTypes]}
              onChange={(e) => setErrorTypes(prev => ({
                ...prev,
                [key]: e.target.value
              }))}
              placeholder="エラータイプ名を入力"
            />
          </div>
        )
      ))}

      <div>
        <Label htmlFor="name">氏名</Label>
        <Input
          id="name"
          value={personalInfo.name}
          onChange={(e) =>
            setPersonalInfo({ ...personalInfo, name: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="dateOfBirth">生年月日</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={personalInfo.dateOfBirth}
          onChange={(e) =>
            setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="postalCode">郵便番号</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="postalCode"
            value={postalCode}
            onChange={handlePostalCodeChange}
            placeholder="例: 100-0001"
            maxLength={8}
          />
          {isLoadingAddress && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
      </div>
      <div>
        <Label htmlFor="address">住所</Label>
        <Input
          id="address"
          value={personalInfo.address}
          onChange={(e) =>
            setPersonalInfo({ ...personalInfo, address: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label>カードの色</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {colorOptions.map((color) => (
            <button
              key={color.label}
              type="button"
              className={`h-10 rounded-md bg-gradient-to-br ${color.bg} ${color.text} 
                ${selectedColor.bg === color.bg ? "ring-2 ring-offset-2 ring-black" : ""}`}
              onClick={() => setSelectedColor(color)}
            >
              {color.label}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t pt-4">
        <ErrorInjectionForm onErrorOptionsChange={setErrorOptions} />
      </div>
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit">発行</Button>
      </div>
    </form>
  );
};

export default VCIssueForm;
