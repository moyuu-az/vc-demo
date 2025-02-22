export async function fetchAddressFromPostalCode(
  postalCode: string,
): Promise<string | null> {
  try {
    // 郵便番号から"-"を削除
    const cleanedPostalCode = postalCode.replace(/-/g, "");

    // 郵便番号検索APIを使用
    const response = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedPostalCode}`,
    );

    const data = await response.json();

    if (data.results && data.results[0]) {
      const result = data.results[0];
      // 都道府県、市区町村、町域を連結
      return `${result.address1}${result.address2}${result.address3}`;
    }

    return null;
  } catch (error) {
    console.error("郵便番号検索エラー:", error);
    return null;
  }
}
