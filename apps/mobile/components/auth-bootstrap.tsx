import { useEffect } from "react";

import { hasSupabaseConfig } from "@/lib/env";
import { getMobileSession, subscribeToMobileAuth } from "@/services/auth";
import { getProfileSummary } from "@/services/profile";
import { getQuestProgressSnapshot } from "@/services/quests";
import { useAppStore } from "@/store/app-store";

export function AuthBootstrap() {
  const hydrated = useAppStore((state) => state.hydrated);
  const setAuthBootstrapped = useAppStore((state) => state.setAuthBootstrapped);
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const hydrateAccount = useAppStore((state) => state.hydrateAccount);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    const syncSession = async (session: Awaited<ReturnType<typeof getMobileSession>>) => {
      if (!session) {
        if (!cancelled) {
          setAuthSession(null);
          setAuthBootstrapped(true);
        }
        return;
      }

      if (cancelled) {
        return;
      }

      setAuthSession({
        authMode: "supabase",
        email: session.user.email ?? null,
        userId: session.user.id,
      });

      try {
        const [profileSummary, questProgress] = await Promise.all([
          getProfileSummary({ userId: session.user.id }),
          getQuestProgressSnapshot(),
        ]);

        if (cancelled) {
          return;
        }

        hydrateAccount({
          email: session.user.email ?? null,
          mode: "supabase",
          profileSummary,
          questProgress,
        });
      } finally {
        if (!cancelled) {
          setAuthBootstrapped(true);
        }
      }
    };

    if (!hasSupabaseConfig) {
      setAuthBootstrapped(true);
      return;
    }

    void getMobileSession().then(syncSession);

    const subscription = subscribeToMobileAuth((session) => {
      void syncSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrateAccount, hydrated, setAuthBootstrapped, setAuthSession]);

  return null;
}
