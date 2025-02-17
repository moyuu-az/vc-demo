"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifiableCredential } from "@/lib/types/vc";
import { FileCheck, Calendar, Globe } from "lucide-react";

interface VCWalletViewProps {
  credentials: VerifiableCredential[];
}

const VCCard = ({ credential }: { credential: VerifiableCredential }) => {
  const issueDate = new Date(credential.issuanceDate);
  const expiryDate = credential.expirationDate
    ? new Date(credential.expirationDate)
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-500 to-green-600 text-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileCheck className="w-6 h-6" />
          <CardTitle className="text-lg">
            {credential.type[credential.type.length - 1]}
          </CardTitle>
        </div>
        <CardDescription className="text-green-100">
          発行者: {credential.issuer.name || credential.issuer.id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            <span>発行日: {issueDate.toLocaleDateString()}</span>
          </div>
          {expiryDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>有効期限: {expiryDate.toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4" />
            <span>Holder: {credential.credentialSubject.id}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const VCWalletView = ({ credentials }: VCWalletViewProps) => {
  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            保存されているVCはありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {credentials.map((credential, index) => (
        <VCCard key={credential.id || index} credential={credential} />
      ))}
    </div>
  );
};

export default VCWalletView;
