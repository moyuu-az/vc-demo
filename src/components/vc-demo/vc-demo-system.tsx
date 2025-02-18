"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VCProcessVisualization from "./vc-process-visualization";
import VCWalletView from "./vc-wallet-view";
import {
  VerifiableCredential,
  AuthorizationRequest,
  AuthorizationResponse,
} from "@/lib/types/vc";
import {
  generateAuthorizationRequest,
  createVerifiableCredential,
  generateAuthorizationResponse,
} from "@/lib/vc/utils";
import {
  saveCredential,
  getStoredCredentials,
  deleteCredential,
} from "@/lib/vc/storage-utils";

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
        "This is a demo credential issuance request for testing purposes.",
      );
      setCurrentRequest(request);
      setVcRequested(true);
    } catch (error) {
      console.error("Error generating authorization request:", error);
    }
  };

  const handleAcceptVC = async () => {
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

      const vc = await createVerifiableCredential(holderDid, {
        type: "DemoCredential",
        name: "Demo Credential",
        description: "This is a demo credential for testing purposes",
        issuedAt: new Date().toISOString(),
        status: "valid",
      });

      // VCを保存し、保存完了を待つ
      await saveCredential(vc);

      // 最新のクレデンシャルリストを取得
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="issuer">発行者 (Issuer)</TabsTrigger>
          <TabsTrigger value="holder">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="issuer">
          <Card>
            <CardHeader>
              <CardTitle>Verifiable Credential発行デモ</CardTitle>
              <CardDescription>
                VCの発行プロセスを体験できます。各ステップでどのような処理が行われているかを確認できます。
              </CardDescription>
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
              <CardDescription>
                発行されたVerifiable Credentialを確認できます
              </CardDescription>
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
      </Tabs>

      <Dialog open={showWallet} onOpenChange={setShowWallet}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Web Wallet</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">認証リクエスト</h3>
            <p className="mb-4">以下の証明書の発行をリクエストしています：</p>
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
                  <p>
                    <strong>リクエストID:</strong> {currentRequest.requestId}
                  </p>
                  <p>
                    <strong>タイムスタンプ:</strong>{" "}
                    {new Date(currentRequest.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="relative w-full">
                  <pre className="bg-gray-100 p-4 rounded text-sm w-full whitespace-pre-wrap break-all">
                    {prettifyJson(currentRequest)}
                  </pre>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={() => setShowWallet(false)}>
                拒否
              </Button>
              <Button onClick={handleAcceptVC}>承認</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VCDemoSystem;
