import { createClient } from 'redis';
// Redis客户端
// Redis client
let redisClient = null;
// Redis配置
// Redis configuration
const REDIS_CONFIG = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    tokenCacheKey: 'goplus_token_cache'
};
/**
 * 创建并连接Redis客户端
 * @returns Redis客户端
 */
async function getRedisClient() {
    if (redisClient && redisClient.isReady) {
        return redisClient;
    }
    try {
        // 创建新客户端
        // Create a new client
        redisClient = createClient({
            url: REDIS_CONFIG.url
        });
        // 设置错误处理
        // Set error handling
        redisClient.on('error', (err) => {
            redisClient = null;
        });
        // 连接Redis
        // Connect to Redis
        await redisClient.connect();
        return redisClient;
    }
    catch (error) {
        // 如果连接失败，返回模拟客户端
        // If connection fails, return a mock client
        return createMockRedisClient();
    }
}
/**
 * 创建模拟的Redis客户端（当Redis不可用时使用内存存储）
 * @returns 模拟的Redis客户端
 */
function createMockRedisClient() {
    // 内存存储
    // In-memory storage
    const storage = new Map();
    // 模拟Redis客户端
    // Mock Redis client
    return {
        isReady: true,
        isConnected: true,
        // 设置值
        // Set value
        set: async (key, value, options = {}) => {
            storage.set(key, value);
            // 如果设置了过期时间
            // If expiration time is set
            if (options.EX) {
                setTimeout(() => {
                    storage.delete(key);
                }, options.EX * 1000);
            }
            return 'OK';
        },
        // 获取值
        // Get value
        get: async (key) => {
            const value = storage.get(key);
            return value;
        },
        // 删除值
        // Delete value
        del: async (key) => {
            const existed = storage.has(key);
            storage.delete(key);
            return existed ? 1 : 0;
        },
        // 关闭连接（什么都不做）
        // Close connection (do nothing)
        quit: async () => {
            return 'OK';
        }
    };
}
/**
 * 从Redis获取令牌
 * @returns 缓存的令牌
 */
export async function getTokenFromRedis() {
    try {
        const client = await getRedisClient();
        const token = await client.get(REDIS_CONFIG.tokenCacheKey);
        return token;
    }
    catch (error) {
        throw error;
    }
}
/**
 * 保存令牌到Redis
 * @param token 要缓存的令牌
 * @param expiresInSeconds 过期时间（秒）
 */
export async function saveTokenToRedis(token, expiresInSeconds) {
    try {
        const client = await getRedisClient();
        await client.set(REDIS_CONFIG.tokenCacheKey, token, {
            EX: expiresInSeconds
        });
    }
    catch (error) {
        throw error;
    }
}
