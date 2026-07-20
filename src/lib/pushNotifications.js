import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

// Request notification permissions on App launch for both Mobile APK & Web
export async function initPushNotifications() {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== "granted") {
        await LocalNotifications.requestPermissions();
      }
    } else if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
  } catch (e) {
    console.warn("initPushNotifications error:", e);
  }
}

// Trigger background system push notification (sound, vibration, status bar banner)
export async function sendPushNotification(title, body) {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== "granted") return;
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title || "⚡ البراق - Boraq",
            body: body || "تحديث جديد فـ الطرود",
            id: Math.floor(Math.random() * 1000000) + 1,
            schedule: { at: new Date(Date.now() + 200) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null
          }
        ]
      });
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title || "⚡ البراق - Boraq", {
        body: body || "تحديث جديد فـ الطرود",
        icon: "/icon-192.png"
      });
    }
  } catch (e) {
    console.warn("sendPushNotification error:", e);
  }
}
