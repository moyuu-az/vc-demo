import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerifiableCredential } from "@/lib/types/vc";
import { FileCheck, Calendar, Globe, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface VCWalletViewProps {
  credentials: VerifiableCredential[];
  onDeleteCredential: (credentialId: string) => void;
}

const VCCard = ({
  credential,
  onDelete
}: {
  credential: VerifiableCredential;
  onDelete: () => void;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const issueDate = new Date(credential.issuanceDate);
  const expiryDate = credential.expirationDate
    ? new Date(credential.expirationDate)
    : null;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-6 h-6" />
              <CardTitle className="text-lg">
                {credential.type[credential.type.length - 1]}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-red-500 hover:text-white"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クレデンシャルの削除</DialogTitle>
            <DialogDescription>
              このVerifiable Credentialを削除してもよろしいですか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const VCWalletView = ({ credentials, onDeleteCredential }: VCWalletViewProps) => {
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
        <VCCard
          key={credential.id || index}
          credential={credential}
          onDelete={() => onDeleteCredential(credential.id)}
        />
      ))}
    </div>
  );
};

export default VCWalletView;
