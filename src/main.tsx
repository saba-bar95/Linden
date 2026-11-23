import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import { ClerkGate } from "./ClerkGate.tsx";
import { setAuthToken } from "./lib/api.ts";
import "./index.css";

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

setAuthToken(null);

const app = (
  <StrictMode>
    <BrowserRouter>
      {pk ? (
        <ClerkProvider publishableKey={pk}>
          <ClerkGate>
            <App />
          </ClerkGate>
        </ClerkProvider>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(app);
