// Register service worker and subscribe to push, then save subscription on the backend.
export async function setupPush(hostName, token) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    // Register SW (index.js also registers, but this ensures available before subscription)
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    // Get VAPID public key
    const keyRes = await fetch(`${hostName}/push/key`);
    const { key } = await keyRes.json();
    if (!key) return false;
    // Ask permission
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    // Subscribe
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });
    // Save on backend
    const body = JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys });
    await fetch(`${hostName}/push/save`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': token }, body });
    return true;
  } catch (e) {
    return false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
