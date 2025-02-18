// src/lib/vc/storage-utils.ts
import { VerifiableCredential } from "../types/vc";

export const saveCredential = async (
  credential: VerifiableCredential,
): Promise<void> => {
  try {
    const response = await fetch("/api/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credential),
    });

    if (!response.ok) {
      throw new Error("Failed to save credential");
    }

    // ローカルストレージにも保存（オプション - オフライン対応用）
    const existingCredentials = await getStoredCredentials();
    localStorage.setItem(
      "stored_credentials",
      JSON.stringify([...existingCredentials, credential]),
    );
  } catch (error) {
    console.error("Error saving credential:", error);
    throw error;
  }
};

export const getStoredCredentials = async (): Promise<
  VerifiableCredential[]
> => {
  try {
    const response = await fetch("/api/credentials");
    if (!response.ok) {
      throw new Error("Failed to fetch credentials");
    }
    const data = await response.json();
    const credentials = Array.isArray(data) ? data : [];

    // ローカルストレージも更新（オプション - オフライン対応用）
    localStorage.setItem("stored_credentials", JSON.stringify(credentials));

    return credentials;
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    // APIが失敗した場合はローカルストレージから取得を試みる
    const storedData = localStorage.getItem("stored_credentials");
    return storedData ? JSON.parse(storedData) : [];
  }
};

export const deleteCredential = async (credentialId: string): Promise<void> => {
  try {
    const response = await fetch("/api/credentials", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: credentialId }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete credential");
    }

    // ローカルストレージも更新（オプション - オフライン対応用）
    const credentials = await getStoredCredentials();
    const updatedCredentials = credentials.filter(
      (cred) => cred.id !== credentialId,
    );
    localStorage.setItem(
      "stored_credentials",
      JSON.stringify(updatedCredentials),
    );
  } catch (error) {
    console.error("Error deleting credential:", error);
    throw error;
  }
};
