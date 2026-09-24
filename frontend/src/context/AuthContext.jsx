import { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tf_user"));
    } catch {
      return null;
    }
  });

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    persist(data);
    return data.user;
  }

  async function register(name, email, password) {
    const { data } = await api.post("/auth/register", { name, email, password });
    persist(data);
    return data.user;
  }

  function persist(data) {
    localStorage.setItem("tf_token", data.token);
    localStorage.setItem("tf_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("tf_token");
    localStorage.removeItem("tf_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);