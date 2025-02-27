"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AuthorizationRequest,
  AuthorizationResponse,
  VerifiableCredential,
} from "@/lib/types/vc";
import {
  deleteCredential,
  getStoredCredentials,
  saveCredential,
} from "@/lib/vc/storage-utils";
import {
  createVerifiableCredential,
  generateAuthorizationRequest,
  generateAuthorizationResponse,
} from "@/lib/vc/utils";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import VCIssueForm from "./vc-issue-form";
import VCProcessVisualization from "./vc-process-visualization";
import { VerifierComponent } from "./vc-verifier";
import VCWalletView from "./vc-wallet-view";

const VCDemoSystem = () => {
  const [showWallet, setShowWallet] = useState(false);
  const [vcRequested, setVcRequested] = useState(false);
  const [currentRequest, setCurrentRequest] =
    useState<AuthorizationRequest | null>(null);
  const [issuedVC, setIssuedVC] = useState<VerifiableCredential | null>(null);
  const [holderDid, setHolderDid] = useState<string>(
    "did:web:demo-holder.example.com",
  );
  const [currentResponse, setCurrentResponse] =
    useState<AuthorizationResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [storedCredentials, setStoredCredentials] = useState<
    VerifiableCredential[]
  >([]);
  const [activeTab, setActiveTab] = useState("issuer");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCredential, setSelectedCredential] =
    useState<VerifiableCredential | null>(null);

  // タブ切り替え時にVCをリロード
  useEffect(() => {
    const loadCredentials = async () => {
      if (activeTab === "holder") {
        try {
          const credentials = await getStoredCredentials();
          setStoredCredentials(credentials || []);
        } catch (error) {
          console.error("Error loading credentials:", error);
        }
      }
    };
    loadCredentials();
  }, [activeTab]);

  const handleRequestVC = async () => {
    try {
      setCurrentStep(1);
      const request = await generateAuthorizationRequest(
        ["DemoCredential"],
        "デモ用のVC発行リクエスト",
      );
      setCurrentRequest(request);
      setVcRequested(true);
    } catch (error) {
      console.error("Error generating authorization request:", error);
    }
  };

  const handleAcceptVC = async (personalInfo: any) => {
    if (!currentRequest) return;
    setIsLoading(true);

    try {
      setCurrentStep(2);
      const response = await generateAuthorizationResponse(
        currentRequest.requestId,
        holderDid,
        true,
      );
      setCurrentResponse(response);

      const vc = await createVerifiableCredential(
        holderDid,
        {
          name: personalInfo.name,
          dateOfBirth: personalInfo.dateOfBirth,
          address: personalInfo.address,
          credentialType: personalInfo.credentialType,
          style: personalInfo.style,
          errorTypes: personalInfo.errorTypes,
          presentationFormat: personalInfo.presentationFormat,
        },
        personalInfo.errorOptions,
      );

      await saveCredential(vc);
      const updatedCredentials = await getStoredCredentials();
      setStoredCredentials(updatedCredentials);

      setCurrentStep(3);
      setIssuedVC(vc);
      setShowWallet(false);
    } catch (error) {
      console.error("Error accepting VC:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      setIsLoading(true);
      await deleteCredential(credentialId);
      const updatedCredentials = await getStoredCredentials();
      setStoredCredentials(updatedCredentials);
    } catch (error) {
      console.error("Error deleting credential:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const prettifyJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="container mx-auto p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issuer">発行者 (Issuer)</TabsTrigger>
          <TabsTrigger value="holder">Wallet</TabsTrigger>
          <TabsTrigger value="verifier">検証者 (Verifier)</TabsTrigger>
        </TabsList>

        <TabsContent value="issuer">
          <Card>
            <CardHeader>
              <CardTitle>Verifiable Credential発行デモ</CardTitle>
            </CardHeader>
            <CardContent>
              <VCProcessVisualization currentStep={currentStep} />

              <Button
                onClick={handleRequestVC}
                className="w-full mt-6 mb-4"
                disabled={vcRequested && !issuedVC}
              >
                VCを発行
              </Button>

              {vcRequested && !issuedVC && currentRequest && (
                <div className="flex flex-col items-center mt-6">
                  <p className="mb-4">
                    QRコードをスキャンするか、Webウォレットで開いてください
                  </p>
                  <QRCodeSVG value={prettifyJson(currentRequest)} size={200} />
                  <Button onClick={() => setShowWallet(true)} className="mt-4">
                    Webウォレットで開く
                  </Button>
                </div>
              )}

              {currentResponse && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">
                    認証レスポンス:
                  </h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    {prettifyJson(currentResponse)}
                  </pre>
                </div>
              )}

              {issuedVC && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">発行されたVC:</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-300">
                    {prettifyJson(issuedVC)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holder">
          <Card>
            <CardHeader>
              <CardTitle>保存されたVC一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <div className="flex flex-col space-y-1.5 mb-4">
                  <Label htmlFor="holderDid">Holder DID</Label>
                  <Input
                    id="holderDid"
                    value={holderDid}
                    onChange={(e) => setHolderDid(e.target.value)}
                  />
                </div>
                <VCWalletView
                  credentials={storedCredentials}
                  onDeleteCredential={handleDeleteCredential}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifier">
          <Card>
            <CardHeader>
              <CardTitle>Verifiable Credential検証</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storedCredentials.length === 0 ? (
                  <div className="text-center text-gray-500">
                    検証可能なクレデンシャルがありません
                  </div>
                ) : (
                  <VerifierComponent storedCredentials={storedCredentials} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showWallet} onOpenChange={setShowWallet}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verifiable Credential発行</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">認証リクエスト</h3>
            {currentRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    <strong>クレデンシャルタイプ:</strong>{" "}
                    {currentRequest.credentialType.join(", ")}
                  </p>
                  <p>
                    <strong>目的:</strong> {currentRequest.purpose}
                  </p>
                  <p>
                    <strong>発行者:</strong> {currentRequest.issuer.name} (
                    {currentRequest.issuer.id})
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">リクエスト詳細</h4>
                  <div className="bg-gray-100 p-4 rounded-md">
                    <Tabs defaultValue="formatted" className="w-full">
                      <TabsList className="mb-2">
                        <TabsTrigger value="formatted">整形表示</TabsTrigger>
                        <TabsTrigger value="raw">生データ</TabsTrigger>
                      </TabsList>
                      <TabsContent
                        value="formatted"
                        className="min-h-[200px] max-h-[300px] overflow-y-auto"
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-500">
                              リクエストID:
                            </span>
                            <p className="text-sm break-all">
                              {currentRequest.requestId}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">
                              タイムスタンプ:
                            </span>
                            <p className="text-sm">
                              {new Date(
                                currentRequest.timestamp,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent
                        value="raw"
                        className="min-h-[200px] max-h-[300px] overflow-y-auto"
                      >
                        <pre className="text-sm whitespace-pre-wrap break-all">
                          {JSON.stringify(currentRequest, null, 2)}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
                <VCIssueForm
                  onSubmit={async (personalInfo) => {
                    await handleAcceptVC(personalInfo);
                    setShowWallet(false);
                  }}
                  onCancel={() => setShowWallet(false)}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VCDemoSystem;
