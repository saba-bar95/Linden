import { HandleSSOCallback } from "@clerk/react";
import { useNavigate } from "react-router-dom";

function go(url: string, navigate: (to: string) => void) {
  if (url.startsWith("http")) window.location.href = url;
  else navigate(url);
}

export function SsoCallback() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center text-[var(--muted)]">
      <div className="jm-fade-up text-center">
        <p className="text-sm font-medium tracking-wide">Finishing Google sign-in…</p>
        <HandleSSOCallback
          navigateToApp={({ decorateUrl }) => {
            go(decorateUrl("/"), navigate);
          }}
          navigateToSignIn={() => navigate("/")}
          navigateToSignUp={() => navigate("/")}
        />
      </div>
    </div>
  );
}
