"use client";

import { IssuerComponent } from "@/components/vc-demo/vc-issuer";
import VerifierComponent from "@/components/vc-demo/vc-verifier";
import VCDemoSystem from "@/components/vc-demo/vc-demo-system";
import type { VerifiableCredential } from "@/lib/types/vc";

export default function Home() {
  return (
    <main className="min-h-screen py-8">
      <VCDemoSystem />
    </main>
  );
}
