import axios from "axios";
import { GOPLUS_API_KEY, GOPLUS_API_SECRET, API_BASE_URL } from "../config/index.js";
import { getTokenFromRedis, saveTokenToRedis } from "./redis.js";
import crypto from "crypto";
/**
 * 获取GoPlus访问令牌的工具函数
 * @returns {Promise<string>} 访问令牌
 */
export async function getGoPlusAccessToken() {
    try {
        // 尝试从Redis中获取令牌
        try {
            const cachedToken = await getTokenFromRedis();
            if (cachedToken) {
                return cachedToken;
            }
        }
        catch (redisError) {
            // Redis出错，继续从API获取新令牌
        }
        // 如果没有从Redis中获取到令牌，则从API获取新令牌
        const apiKey = GOPLUS_API_KEY;
        const apiSecret = GOPLUS_API_SECRET;
        if (!apiKey || !apiSecret) {
            throw new Error("API密钥或密钥不存在，请检查环境变量");
        }
        // 生成时间戳（整数秒）
        const timestamp = Math.floor(Date.now() / 1000).toString();
        // 按文档要求生成签名：连接 app_key + time + app_secret，然后进行SHA1哈希
        const signString = apiKey + timestamp + apiSecret;
        const sign = crypto.createHash('sha1').update(signString).digest('hex');
        const url = "https://api.gopluslabs.io/api/v1/token";
        // 按照API要求构建请求体参数
        const requestBody = {
            app_key: apiKey,
            time: timestamp,
            sign: sign
        };
        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.data && response.data.code === 1 && response.data.result) {
            // 直接获取access_token字段
            const accessToken = response.data.result.access_token;
            if (!accessToken) {
                throw new Error("API returned a successful response, but the token is empty");
            }
            // 使用返回的accessToken (可能已包含Bearer前缀)
            let token = accessToken;
            // 确保token有Bearer前缀
            if (!token.startsWith("Bearer ")) {
                token = `Bearer ${token}`;
            }
            // GoPlus令牌有效期为2小时，这里设置为1.9小时以确保安全边界
            const expiresInSeconds = Math.floor(1.9 * 60 * 60); // 1.9 hours, in seconds
            // 保存令牌到Redis
            try {
                await saveTokenToRedis(token, expiresInSeconds);
            }
            catch (redisError) {
                // 即使Redis保存失败，我们仍然返回令牌
            }
            // 直接返回获取到的令牌
            return token;
        }
        else {
            const errorMessage = response.data?.message || "Unknown error";
            throw new Error(`Failed to get token: ${errorMessage}`);
        }
    }
    catch (error) {
        throw error;
    }
}
/**
 * 创建带有授权头的axios实例
 * @returns {Promise<import("axios").AxiosInstance>} axios实例
 */
export async function createAuthorizedClient() {
    try {
        const token = await getGoPlusAccessToken();
        // 添加安全检查，防止token为undefined时调用substring方法
        if (!token) {
            throw new Error('Failed to get authorization token: token is empty');
        }
        // 使用token创建axios实例（token已经包含Bearer前缀）
        const client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                Authorization: token // 直接使用token，不再添加额外的Bearer前缀
            }
        });
        return client;
    }
    catch (error) {
        throw error;
    }
}
