import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

// Request notification permissions and register high-importance system channel
export async function initPushNotifications() {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== "granted") {
        await LocalNotifications.requestPermissions();
      }

      // Create Android High-Importance Channel respecting System Sound & Vibration modes
      await LocalNotifications.createChannel({
        id: "boraq_alerts",
        name: "تنبيهات طرود البراق",
        description: "إشعارات طرود البراق المباشرة",
        importance: 5, // High importance (Heads-up banner)
        visibility: 1, // Public on lockscreen
        sound: undefined, // Respects phone ringer (Sound when Sound mode, Silent/Vibration when Vibrate mode)
        vibration: true,
        lights: true,
        lightColor: "#38bdf8"
      });
    } else if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
  } catch (e) {
    console.warn("initPushNotifications error:", e);
  }
}

// Trigger background system push notification (respects phone system sound / vibrate mode)
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
            schedule: { at: new Date(Date.now() + 150) },
            channelId: "boraq_alerts"
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
