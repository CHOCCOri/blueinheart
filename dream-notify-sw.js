'use strict';

// 梦角传讯：仅负责 Android 持久系统通知的点击跳转。
// 不缓存文件、不拦截网络请求、不做后台定时、不做音频保活，也不包含 Push 后端。

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

function buildNotificationTarget(data = {}) {
  const route = data.route && typeof data.route === 'object' ? data.route : {};
  let url;
  try { url = new URL(data.pageUrl || self.registration.scope, self.registration.scope); }
  catch (error) { url = new URL(self.registration.scope); }
  url.searchParams.set('dreamNotification', '1');
  url.searchParams.set('tab', route.tab || 'messages');
  if (route.roleId) url.searchParams.set('roleId', route.roleId);
  if (route.longRecipient) url.searchParams.set('longRecipient', route.longRecipient);
  if (route.mailLetterId) url.searchParams.set('mailLetterId', route.mailLetterId);
  return { url, route };
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = buildNotificationTarget(event.notification.data || {});
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => {
      try {
        const clientUrl = new URL(client.url);
        return clientUrl.origin === target.url.origin && clientUrl.pathname === target.url.pathname;
      } catch (error) { return false; }
    });
    if (existing) {
      existing.postMessage({ type: 'DREAM_NOTIFICATION_CLICK', route: target.route });
      return existing.focus();
    }
    return self.clients.openWindow(target.url.href);
  })());
});
