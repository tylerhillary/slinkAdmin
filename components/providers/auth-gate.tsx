"use client";

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { LogIn, LogOut, ShieldAlert } from "lucide-react";
import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { firebaseAuth } from "@/lib/firebase/client";

type GateState =
  | { status: "checking" }
  | { status: "signed-out"; error: string | null }
  | { status: "forbidden"; user: User }
  | { status: "admin"; user: User };

interface Session {
  user: User;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/** Sign-in failures worth explaining. Anything else gets the generic line. */
function describeSignInError(code: string): string | null {
  switch (code) {
    // Closing the popup is a choice, not a failure.
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/unauthorized-domain":
      return "This address is not yet allowed to sign in. Add it in Firebase under Authentication → Settings → Authorized domains.";
    case "auth/network-request-failed":
      return "Could not reach Google. Check the connection and try again.";
    default:
      return "Sign-in did not complete. Try again.";
  }
}

/**
 * Nothing behind this renders for anybody without the `admin` claim.
 *
 * The server checks the same claim on every request, so this gate is not the
 * protection — it is what keeps the console from mounting, polling and
 * failing for somebody the server will refuse anyway, and what tells them why.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ status: "checking" });
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), async (user) => {
      if (!user) {
        setState((previous) =>
          previous.status === "signed-out" ? previous : { status: "signed-out", error: null },
        );
        return;
      }

      try {
        // Forced refresh: a claim granted since this browser's token was
        // minted only appears in a new one.
        const { claims } = await user.getIdTokenResult(true);
        setState(claims.admin === true ? { status: "admin", user } : { status: "forbidden", user });
      } catch (error) {
        console.error("Could not verify the signed-in account", error);
        setState({ status: "signed-out", error: "Could not verify your account. Try again." });
      }
    });
  }, []);

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(firebaseAuth(), provider);
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      const message = describeSignInError(typeof code === "string" ? code : "");
      if (message) setState({ status: "signed-out", error: message });
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(firebaseAuth());
  }, []);

  const session = useMemo<Session | null>(
    () => (state.status === "admin" ? { user: state.user, signOut: handleSignOut } : null),
    [state, handleSignOut],
  );

  if (state.status === "checking") {
    return (
      <GateFrame>
        <p className="animate-pulse text-sm text-content-muted">Checking your session…</p>
      </GateFrame>
    );
  }

  if (state.status === "signed-out") {
    return (
      <GateFrame>
        <h1 className="text-lg font-semibold text-content">Sign in to Slink Admin</h1>
        <p className="mt-1.5 text-sm text-content-muted">
          Use the Google account that has console access.
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={() => void handleSignIn()}
          loading={signingIn}
          disabled={signingIn}
          leading={<LogIn className="h-4 w-4" aria-hidden />}
          className="mt-5 w-full justify-center"
        >
          {signingIn ? "Waiting for Google…" : "Continue with Google"}
        </Button>

        {state.error ? (
          <p role="alert" className="mt-3 text-xs leading-relaxed text-danger">
            {state.error}
          </p>
        ) : null}
      </GateFrame>
    );
  }

  if (state.status === "forbidden") {
    return (
      <GateFrame>
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-danger/25 bg-danger-soft text-danger">
          <ShieldAlert className="h-4 w-4" aria-hidden />
        </span>
        <h1 className="mt-3 text-lg font-semibold text-content">No console access</h1>
        <p className="mt-1.5 text-sm text-content-muted">
          <span className="font-medium text-content">{state.user.email ?? "This account"}</span>{" "}
          is signed in but is not an administrator. Ask an existing administrator to grant
          access.
        </p>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => void handleSignOut()}
          leading={<LogOut className="h-4 w-4" aria-hidden />}
          className="mt-5 w-full justify-center"
        >
          Use a different account
        </Button>
      </GateFrame>
    );
  }

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** The signed-in administrator. Only valid beneath [AuthGate]. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used beneath AuthGate");
  }
  return session;
}

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
        <Image
          src="/img/slink.png"
          alt="Slink"
          width={36}
          height={36}
          className="mx-auto mb-4 h-9 w-9 rounded object-contain"
          priority
        />
        {children}
      </div>
    </div>
  );
}
