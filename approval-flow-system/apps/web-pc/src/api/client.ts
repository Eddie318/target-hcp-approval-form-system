import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin.replace(/:\d+$/, ":3000") : "http://localhost:3000");

export const apiClient = axios.create({
  baseURL,
});

export function setAuthHeaders(actorCode?: string | null, actorRole?: string | null, email?: string | null) {
  if (actorCode) {
    apiClient.defaults.headers.common["x-actor-code"] = actorCode;
  } else {
    delete apiClient.defaults.headers.common["x-actor-code"];
  }
  if (actorRole) {
    apiClient.defaults.headers.common["x-actor-role"] = actorRole;
  } else {
    delete apiClient.defaults.headers.common["x-actor-role"];
  }
  if (email) {
    apiClient.defaults.headers.common["x-user-email"] = email;
  } else {
    delete apiClient.defaults.headers.common["x-user-email"];
  }
}
