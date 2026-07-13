import { getPhoneNumber, getAccessToken } from "zmp-sdk/apis";
import { apiRequest } from "./api";

/**
 * Gọi Zalo SDK để lấy token số điện thoại và access token,
 * sau đó gửi lên Backend giải mã qua Zalo Graph API.
 */
export async function getDecryptedZaloPhone(): Promise<string> {
  try {
    // 1. Lấy Access Token từ Zalo SDK
    const accessToken = await getAccessToken({});
    if (!accessToken) {
      throw new Error("Không lấy được Zalo Access Token");
    }

    // 2. Lấy Token số điện thoại
    return new Promise((resolve, reject) => {
      getPhoneNumber({
        success: async (data) => {
          const { token } = data;
          if (!token) {
            reject(new Error("Không lấy được token số điện thoại từ Zalo SDK"));
            return;
          }

          try {
            // 3. Gửi token và accessToken lên backend để giải mã qua Zalo Graph API
            const res = await apiRequest<{ phoneNumber: string }>('/users/decrypt-phone', 'POST', {
              token,
              accessToken,
            });

            if (res && res.phoneNumber) {
              resolve(res.phoneNumber);
            } else {
              reject(new Error("Giải mã số điện thoại thất bại ở Backend"));
            }
          } catch (backendErr) {
            reject(backendErr);
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  } catch (err) {
    console.error("Lỗi khi lấy số điện thoại Zalo:", err);
    throw err;
  }
}
