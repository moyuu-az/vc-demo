"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, FileText, Key, Shield } from "lucide-react";

const ProcessStep = ({
  icon: Icon,
  title,
  description,
  isActive,
  isCompleted,
}) => (
  <div
    className={`flex items-start space-x-4 p-4 rounded-lg transition-all
    ${isActive ? "bg-secondary" : ""} 
    ${isCompleted ? "text-primary" : "text-muted-foreground"}`}
  >
    <div className="shrink-0">
      <div
        className={`p-2 rounded-full ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        {isCompleted ? (
          <Check className="w-5 h-5" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
    </div>
    <div className="flex-1">
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  </div>
);

const VCProcessVisualization = ({ currentStep }) => {
  const steps = [
    {
      icon: Key,
      title: "1. DIDs生成",
      description:
        "発行者と保持者のDecentralized Identifiers (DIDs)を生成します。これはVC発行の基盤となる識別子です。",
    },
    {
      icon: FileText,
      title: "2. 認証リクエスト",
      description:
        "発行者が保持者に対してVC発行の認証リクエストを送信します。このリクエストには発行するVCの種類や目的が含まれます。",
    },
    {
      icon: Shield,
      title: "3. 承認と署名",
      description:
        "保持者が認証リクエストを承認すると、発行者はVCを作成し、電子署名を付与します。",
    },
    {
      icon: Check,
      title: "4. VC発行完了",
      description:
        "署名されたVCが保持者に発行され、保持者のウォレットに保存されます。このVCは第三者への提示に使用できます。",
    },
  ];

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Verifiable Credential発行プロセス</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <ProcessStep
                {...step}
                isActive={currentStep === index}
                isCompleted={currentStep > index}
              />
              {index < steps.length - 1 && (
                <div className="absolute left-7 top-14 h-8 w-0.5 bg-muted-foreground/20" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VCProcessVisualization;
