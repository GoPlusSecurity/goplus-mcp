import axios from "axios";
import { GOPLUS_API_KEY, GOPLUS_API_SECRET, API_BASE_URL } from "../config/index.js";
import crypto from "crypto";

/**
 * Tool function to get the GoPlus access token
 * @returns {Promise<string>} Access token
 */
export async function getGoPlusAccessToken(): Promise<string> {
  const apiKey = GOPLUS_API_KEY;
  const apiSecret = GOPLUS_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error("API key or secret not found");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signString = apiKey + timestamp + apiSecret;
  const sign = crypto.createHash('sha1').update(signString).digest('hex');

  const response = await axios.post(
    "https://api.gopluslabs.io/api/v1/token",
    {
      app_key: apiKey,
      time: timestamp,
      sign: sign
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

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
export async function createAuthorizedClient(): Promise<any> {
  const token = await getGoPlusAccessToken();
  
  if (!token) {
    throw new Error('Failed to get authorization token');
  }
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: token }
  });
} 