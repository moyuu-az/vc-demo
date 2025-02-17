// src/components/vc-demo/vc-demo-system.tsx
"use client";

import React, { useState } from "react";
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

const VCDemoSystem = () => {
  // State management
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

  // VC発行リクエスト
  const handleRequestVC = () => {
    const request = generateAuthorizationRequest(
      ["DemoCredential"],
      "Demo purpose for VC issuance",
    );
    setCurrentRequest(request);
    setVcRequested(true);
  };

  // handleAcceptVC関数を修正
  const handleAcceptVC = () => {
    if (!currentRequest) return;

    // 承認レスポンスの生成
    const response = generateAuthorizationResponse(
      currentRequest.requestId,
      holderDid,
      true,
    );

    // レスポンスを状態に保存
    setCurrentResponse(response);

    // VCの生成
    const vc = createVerifiableCredential(holderDid, {
      type: "DemoCredential",
      name: "Demo Credential",
      description: "This is a demo credential",
      issuedAt: new Date().toISOString(),
      status: "valid",
    });

    setIssuedVC(vc);
    setShowWallet(false);
  };

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="issuer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="issuer">Issuer</TabsTrigger>
          <TabsTrigger value="holder">Holder</TabsTrigger>
        </TabsList>

        <TabsContent value="issuer">
          <Card>
            <CardHeader>
              <CardTitle>VC Issuer Demo</CardTitle>
              <CardDescription>Verifiable Credentialの発行デモ</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleRequestVC} className="w-full mb-4">
                Issue VC
              </Button>

              {vcRequested && !issuedVC && currentRequest && (
                <div className="flex flex-col items-center">
                  <p className="mb-4">QRコードをスキャンしてください</p>
                  <QRCodeSVG
                    value={JSON.stringify(currentRequest)}
                    size={200}
                  />
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
                    {JSON.stringify(currentResponse, null, 2)}
                  </pre>
                </div>
              )}

              {issuedVC && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">発行されたVC:</h3>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(issuedVC, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holder">
          <Card>
            <CardHeader>
              <CardTitle>VC Holder Demo</CardTitle>
              <CardDescription>VCの保持者設定</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="holderDid">Holder DID</Label>
                  <Input
                    id="holderDid"
                    value={holderDid}
                    onChange={(e) => setHolderDid(e.target.value)}
                  />
                </div>
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
              <pre className="bg-gray-100 p-4 rounded mb-4 max-h-96 overflow-auto">
                {JSON.stringify(currentRequest, null, 2)}
              </pre>
            )}
            <div className="flex justify-end gap-4">
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
