import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface SocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside provider");
  return ctx;
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      toast.success("Connected to server", { duration: 2000 });
    };

    socket.onclose = (event) => {
      console.log("WebSocket disconnected", event.reason);
      setIsConnected(false);
      toast.error("Disconnected from server", { duration: 2500 });
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      toast.error("Connection error", { duration: 3000 });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data);
        // Handle incoming messages dynamically
        // This can be extended to forward data to other contexts if needed
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    setWs(socket);

    return () => {
      socket.close(1000, "Component unmounted"); // Close with a reason
    };
  }, []);

  const sendMessage = (msg: any) => {
    if (!ws || !isConnected) {
      toast.error("Server not connected", { duration: 2500 });
      return;
    }
    ws.send(JSON.stringify(msg));
  };

  return (
    <SocketContext.Provider value={{ ws, isConnected, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
};
