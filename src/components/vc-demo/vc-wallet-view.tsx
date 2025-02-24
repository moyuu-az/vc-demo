// src/components/vc-demo/vc-wallet-view.tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiableCredential } from "@/lib/types/vc";
import { Calendar, FileCheck, Globe, Share2, Trash2 } from "lucide-react";
import React from "react";
import { SelectiveDisclosure } from "./vc-selective-disclosure";

interface VCWalletViewProps {
  credentials: VerifiableCredential[];
  onDeleteCredential: (credentialId: string) => void;
}

const VCCard = ({
  credential,
  onDelete,
  onSubmit,
}: {
  credential: VerifiableCredential;
  onDelete: () => void;
  onSubmit: (credential: VerifiableCredential) => void;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = React.useState(false);
  const [showDisclosureDialog, setShowDisclosureDialog] = React.useState(false);
  const [requiredClaims, setRequiredClaims] = React.useState<string[]>([]);
  const issueDate = new Date(credential.issuanceDate || credential.validFrom);
  const expiryDate = credential.validUntil
    ? new Date(credential.validUntil)
    : null;

  // デフォルトのスタイルを設定
  const cardStyle = credential.style || {
    backgroundColor: "from-green-500 to-green-600",
    textColor: "text-white",
  };

  // デバッグ用のログ出力を追加
  React.useEffect(() => {
    console.log("Current credential:", credential);
  }, [credential]);

  const renderCardActions = () => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-green-500 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          setShowDisclosureDialog(true);
        }}
      >
        <Share2 className="w-5 h-5" />
      </Button>
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
  );

  return (
    <>
      <Card
        className={`hover:shadow-lg transition-shadow bg-gradient-to-br ${cardStyle.backgroundColor} ${cardStyle.textColor}`}
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
            {renderCardActions()}
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

      <Dialog
        open={showDisclosureDialog}
        onOpenChange={setShowDisclosureDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選択的開示</DialogTitle>
            <DialogDescription>
              開示する情報を選択してください
            </DialogDescription>
          </DialogHeader>
          {credential && credential.credentialSubject ? (
            <SelectiveDisclosure
              credential={credential}
              requiredClaims={requiredClaims}
              onSubmit={(disclosureResponse) => {
                onSubmit(disclosureResponse);
                setShowDisclosureDialog(false);
              }}
            />
          ) : (
            <div className="text-red-600 p-4">
              クレデンシャルの形式が正しくありません
            </div>
          )}
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
          onSubmit={(credential) => {
            // Implement the logic to handle the submission of disclosure response
          }}
        />
      ))}
    </div>
  );
};

export default VCWalletView;
