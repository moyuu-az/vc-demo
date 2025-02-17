// src/lib/vc/storage-utils.ts

import { VerifiableCredential } from "../types/vc";

const VC_STORAGE_KEY = "stored_credentials";

export const saveCredential = (credential: VerifiableCredential): void => {
  try {
    // 既存のクレデンシャルを取得
    const existingCredentials = getStoredCredentials();

    // 新しいクレデンシャルを追加
    const updatedCredentials = [...existingCredentials, credential];

    // localStorageに保存
    localStorage.setItem(VC_STORAGE_KEY, JSON.stringify(updatedCredentials));
  } catch (error) {
    console.error("Error saving credential:", error);
  }
};

export const getStoredCredentials = (): VerifiableCredential[] => {
  try {
    const storedData = localStorage.getItem(VC_STORAGE_KEY);
    if (!storedData) return [];

    return JSON.parse(storedData);
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    return [];
  }
};

export const clearStoredCredentials = (): void => {
  localStorage.removeItem(VC_STORAGE_KEY);
};
