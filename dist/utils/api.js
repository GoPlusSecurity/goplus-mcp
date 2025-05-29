"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoPlusAccessToken = getGoPlusAccessToken;
exports.createAuthorizedClient = createAuthorizedClient;
const axios_1 = __importDefault(require("axios"));
const index_js_1 = require("../config/index.js");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Tool function to get the GoPlus access token
 * @returns {Promise<string>} Access token
 */
async function getGoPlusAccessToken() {
    const apiKey = index_js_1.GOPLUS_API_KEY;
    const apiSecret = index_js_1.GOPLUS_API_SECRET;
    if (!apiKey || !apiSecret) {
        throw new Error("API key or secret not found");
    }
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signString = apiKey + timestamp + apiSecret;
    const sign = crypto_1.default.createHash('sha1').update(signString).digest('hex');
    const response = await axios_1.default.post("https://api.gopluslabs.io/api/v1/token", {
        app_key: apiKey,
        time: timestamp,
        sign: sign
    }, {
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.data?.result?.access_token) {
        throw new Error(response.data?.message || "Failed to get token");
    }
    const token = response.data.result.access_token;
    return token;
}
/**
 * Create an axios instance with an authorization header
 * @returns {Promise<import("axios").AxiosInstance>} axios instance
 */
async function createAuthorizedClient() {
    const token = await getGoPlusAccessToken();
    if (!token) {
        throw new Error('Failed to get authorization token');
    }
    return axios_1.default.create({
        baseURL: index_js_1.API_BASE_URL,
        headers: { Authorization: token }
    });
}
