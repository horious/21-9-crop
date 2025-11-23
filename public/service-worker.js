const CACHE_NAME = 'crop-picture-v2';
const urlsToCache = [
	'./',
	'./index.html',
	'./manifest.json',
	'./favicon.ico',
	'./logo.svg'
];

// 설치 이벤트
self.addEventListener('install', event => {
	self.skipWaiting(); // 대기 중인 워커를 즉시 활성화
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => {
				return cache.addAll(urlsToCache);
			})
	);
});

// 활성화 이벤트
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim(); // 클라이언트 즉시 제어
});

// Fetch 이벤트 - Network First Strategy (모든 요청에 대해)
self.addEventListener('fetch', event => {
	// http/https 요청만 처리
	if (!event.request.url.startsWith('http')) {
		return;
	}

	event.respondWith(
		fetch(event.request)
			.then(response => {
				// 네트워크 요청 성공 시 캐시 업데이트
				if (!response || response.status !== 200 || response.type !== 'basic') {
					return response;
				}
				const responseToCache = response.clone();
				caches.open(CACHE_NAME).then(cache => {
					cache.put(event.request, responseToCache);
				});
				return response;
			})
			.catch(() => {
				// 네트워크 실패(오프라인) 시 캐시 사용
				return caches.match(event.request)
					.then(response => {
						if (response) {
							return response;
						}
						// 캐시에도 없으면 오프라인 페이지(index.html) 반환 (HTML 요청인 경우)
						if (event.request.mode === 'navigate') {
							return caches.match('./index.html');
						}
					});
			})
	);
});

