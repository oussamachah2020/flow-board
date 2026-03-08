import * as React from "react";
import { useNavigate } from "react-router";

import { RootLoader } from "~/components/root-loader";
import { attemptRefresh } from "~/middleware/auth.middleware";
import { useAuthStore } from "~/stores/auth.store";

const REDIRECT_TIMEOUT_MS = 8000;

export function LoadingPage() {
  const navigate = useNavigate();
  const didRedirect = React.useRef(false);

  React.useEffect(() => {
    if (didRedirect.current) return;
    didRedirect.current = true;

    let cancelled = false;

    async function runRedirect() {
      try {
        let token = useAuthStore.getState().accessToken;
        if (!token) {
          const newToken = await Promise.race([
            attemptRefresh(),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), REDIRECT_TIMEOUT_MS)
            ),
          ]);
          if (newToken) {
            useAuthStore.getState().setAccessToken(newToken);
            token = newToken;
          }
        }
        if (cancelled) return;
        if (token) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch {
        if (!cancelled) navigate("/login", { replace: true });
      }
    }

    runRedirect();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <RootLoader />;
}
