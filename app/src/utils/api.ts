// app/src/utils/api.ts
export const addAuthHeader = (options?: RequestInit): RequestInit => {
  const userId = localStorage.getItem('currentUserId');
  const headers = {
    ...options?.headers,
    ...(userId ? { 'X-User-Id': userId } : {}), // カスタムヘッダーとしてユーザーIDを追加
  };

  return {
    ...options,
    headers: headers,
  };
};
