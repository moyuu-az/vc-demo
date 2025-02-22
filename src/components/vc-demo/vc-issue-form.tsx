import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonalInfo } from "@/lib/types/vc";
import { fetchAddressFromPostalCode } from "@/lib/utils/address";
import { Loader2 } from "lucide-react";

interface VCIssueFormProps {
  onSubmit: (personalInfo: PersonalInfo) => void;
  onCancel: () => void;
}

const VCIssueForm: React.FC<VCIssueFormProps> = ({ onSubmit, onCancel }) => {
  const [personalInfo, setPersonalInfo] = React.useState<PersonalInfo>({
    name: "",
    dateOfBirth: "",
    address: "",
  });
  const [postalCode, setPostalCode] = React.useState("");
  const [isLoadingAddress, setIsLoadingAddress] = React.useState(false);

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
    onSubmit(personalInfo);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
