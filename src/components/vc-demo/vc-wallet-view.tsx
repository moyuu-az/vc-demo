// src/components/vc-demo/vc-wallet-view.tsx
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface VCWalletViewProps {
  credentials: VerifiableCredential[];
  onDeleteCredential: (credentialId: string) => void;
}

const VCCard = ({
  credential,
  onDelete,
}: {
  credential: VerifiableCredential;
  onDelete: () => void;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = React.useState(false);
  const issueDate = new Date(credential.issuanceDate);
  const expiryDate = credential.expirationDate
    ? new Date(credential.expirationDate)
    : null;

  return (
    <>
      <Card
        className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500 to-green-600 text-white"
        onClick={() => setShowDetailsDialog(true)}
        role="button"
        tabIndex={0}
      >
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
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
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

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>クレデンシャル詳細</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">基本情報</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">氏名</dt>
                    <dd>{credential.credentialSubject.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">生年月日</dt>
                    <dd>{credential.credentialSubject.dateOfBirth}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">住所</dt>
                    <dd>{credential.credentialSubject.address}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="font-semibold mb-2">クレデンシャル情報</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">発行日</dt>
                    <dd>{issueDate.toLocaleDateString()}</dd>
                  </div>
                  {expiryDate && (
                    <div>
                      <dt className="text-sm text-gray-500">有効期限</dt>
                      <dd>{expiryDate.toLocaleDateString()}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-gray-500">発行者</dt>
                    <dd>{credential.issuer.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">発行者DID</dt>
                    <dd className="break-all text-sm">
                      {credential.issuer.id}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">技術情報</h4>
              <div className="bg-gray-100 p-4 rounded-md">
                <Tabs defaultValue="formatted" className="w-full">
                  <TabsList className="mb-2">
                    <TabsTrigger value="formatted">整形表示</TabsTrigger>
                    <TabsTrigger value="raw">生データ</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="formatted"
                    className="min-h-[300px] max-h-[500px] overflow-y-auto"
                  >
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">ID:</span>
                        <p className="text-sm break-all">{credential.id}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">タイプ:</span>
                        <p className="text-sm">{credential.type.join(", ")}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">
                          コンテキスト:
                        </span>
                        <p className="text-sm break-all">
                          {credential["@context"].join(", ")}
                        </p>
                      </div>
                      {credential.credentialStatus && (
                        <div>
                          <span className="text-sm text-gray-500">
                            ステータス:
                          </span>
                          <p className="text-sm break-all">
                            {credential.credentialStatus.type}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="raw"
                    className="min-h-[300px] max-h-[500px] overflow-y-auto"
                  >
                    <pre className="text-sm whitespace-pre-wrap break-all">
                      {JSON.stringify(credential, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
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

const VCWalletView = ({
  credentials,
  onDeleteCredential,
}: VCWalletViewProps) => {
  // 型チェックと配列の確認を追加
  const validCredentials = Array.isArray(credentials) ? credentials : [];

  if (validCredentials.length === 0) {
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
      {validCredentials.map((credential, index) => (
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
