// src/app/api/credentials/route.ts
import { VerifiableCredential } from "@/lib/types/vc";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const dataFilePath = path.join(process.cwd(), "data", "credentials.json");

// ファイルを読み込む関数
async function readCredentialsFile(): Promise<VerifiableCredential[]> {
  try {
    const fileContents = await fs.readFile(dataFilePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    // ファイルが存在しない場合は空の配列を返す
    return [];
  }
}

// ファイルに書き込む関数
async function writeCredentialsFile(
  data: VerifiableCredential[],
): Promise<void> {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

// GET: すべてのクレデンシャルを取得
export async function GET() {
  try {
    const credentials = await readCredentialsFile();
    return NextResponse.json(credentials);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 },
    );
  }
}

// POST: 新しいクレデンシャルを追加
export async function POST(request: Request) {
  try {
    const credential = await request.json();
    const credentials = await readCredentialsFile();

    // IDの重複チェック
    const exists = credentials.some((c) => c.id === credential.id);
    if (exists) {
      return NextResponse.json(
        { error: "Credential with this ID already exists" },
        { status: 400 },
      );
    }

    credentials.push(credential);
    await writeCredentialsFile(credentials);

    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save credential" },
      { status: 500 },
    );
  }
}

// DELETE: クレデンシャルを削除
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const credentials = await readCredentialsFile();

    const filteredCredentials = credentials.filter((c) => c.id !== id);
    await writeCredentialsFile(filteredCredentials);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 },
    );
  }
}
