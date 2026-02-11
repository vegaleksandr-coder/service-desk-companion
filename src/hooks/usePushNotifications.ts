import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

async function subscribeWebPush(registration: ServiceWorkerRegistration & { pushManager: any }, vapidPublicKey: string) {
  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
    }
    return subscription;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return null;
  }
}

async function saveSubscription(userId: string, platform: string, subscription: unknown) {
  const subJson = typeof subscription === "string" ? JSON.parse(subscription) : subscription;
  
  // Upsert: delete old subscription for this platform, insert new one
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("platform", platform);

  const { error } = await supabase
    .from("push_subscriptions")
    .insert({
      user_id: userId,
      platform,
      subscription: subJson,
    });

  if (error) {
    console.error("Failed to save push subscription:", error);
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  // Fetch VAPID public key from edge function
  useEffect(() => {
    supabase.functions.invoke("get-vapid-key").then(({ data, error }) => {
      if (!error && data?.vapid_public_key) {
        setVapidKey(data.vapid_public_key);
      }
    });
  }, []);

  const initWebPush = useCallback(async () => {
    if (!user || !vapidKey || !("Notification" in window) || !("PushManager" in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await registerServiceWorker();
    if (!registration) return;

    const subscription = await subscribeWebPush(registration as any, vapidKey);
    if (!subscription) return;

    await saveSubscription(user.id, "web", subscription.toJSON());
    console.log("Web Push subscription saved");
  }, [user, vapidKey]);

  useEffect(() => {
    if (user && vapidKey) {
      initWebPush();
    }
  }, [user, vapidKey, initWebPush]);

  return { initWebPush };
}
