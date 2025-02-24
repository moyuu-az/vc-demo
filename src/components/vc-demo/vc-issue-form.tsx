import React, { useState } from "react";
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

const colorOptions = [
  { bg: "from-green-500 to-green-600", text: "text-white", label: "緑" },
  { bg: "from-blue-500 to-blue-600", text: "text-white", label: "青" },
  { bg: "from-purple-500 to-purple-600", text: "text-white", label: "紫" },
  { bg: "from-red-500 to-red-600", text: "text-white", label: "赤" },
];

const VCIssueForm: React.FC<VCIssueFormProps> = ({ onSubmit, onCancel }) => {
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
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
    onSubmit({
      ...personalInfo,
      style: {
        backgroundColor: selectedColor.bg,
        textColor: selectedColor.text,
      },
    });
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
