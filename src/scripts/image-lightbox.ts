const MIN_SCALE = 1;
const MAX_SCALE = 5;

const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.setAttribute('aria-label', '图片预览');
lightbox.hidden = true;

const preview = document.createElement('img');
preview.alt = '';
preview.draggable = false;
lightbox.append(preview);
document.body.append(lightbox);

const viewport = document.querySelector('meta[name="viewport"]');
const originalViewport = viewport?.getAttribute('content') ?? 'width=device-width, initial-scale=1';

const pointers = new Map<number, { x: number; y: number }>();
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let pinchDistance = 0;
let pinchScale = 1;
let panX = 0;
let panY = 0;
let originX = 0;
let originY = 0;
let moved = false;

function isTouchDevice() {
	return window.matchMedia('(pointer: coarse)').matches;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function center(a: { x: number; y: number }, b: { x: number; y: number }) {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function applyTransform() {
	preview.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
}

function clampPan() {
	if (scale <= 1) {
		offsetX = 0;
		offsetY = 0;
		return;
	}

	const width = preview.offsetWidth * scale;
	const height = preview.offsetHeight * scale;
	const maxX = Math.max(0, (width - window.innerWidth) / 2 + 24);
	const maxY = Math.max(0, (height - window.innerHeight) / 2 + 24);
	offsetX = clamp(offsetX, -maxX, maxX);
	offsetY = clamp(offsetY, -maxY, maxY);
}

function resetView() {
	scale = 1;
	offsetX = 0;
	offsetY = 0;
	pointers.clear();
	moved = false;
	applyTransform();
}

function lockPageZoom() {
	viewport?.setAttribute(
		'content',
		'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
	);
}

function unlockPageZoom() {
	viewport?.setAttribute('content', originalViewport);
}

function closeLightbox() {
	lightbox.classList.remove('is-open');
	lightbox.hidden = true;
	document.body.classList.remove('lightbox-open');
	preview.removeAttribute('src');
	preview.alt = '';
	resetView();
	unlockPageZoom();
}

function openLightbox(image: HTMLImageElement) {
	resetView();
	preview.src = image.currentSrc || image.src;
	preview.alt = image.alt || '放大图片';
	lightbox.hidden = false;
	lightbox.classList.add('is-open');
	document.body.classList.add('lightbox-open');
	if (isTouchDevice()) lockPageZoom();
}

function bindImages() {
	for (const image of document.querySelectorAll('article.prose img')) {
		if (!(image instanceof HTMLImageElement)) continue;
		if (image.dataset.lightboxBound === 'true') continue;
		if (image.closest('a')) continue;

		image.dataset.lightboxBound = 'true';
		image.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			openLightbox(image);
		});
	}
}

lightbox.addEventListener('click', (event) => {
	if (moved) {
		moved = false;
		return;
	}

	if (isTouchDevice() && event.target === preview && scale > 1) {
		return;
	}

	closeLightbox();
});

lightbox.addEventListener(
	'pointerdown',
	(event) => {
		if (!lightbox.classList.contains('is-open')) return;
		if (event.pointerType === 'mouse') return;

		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		moved = false;

		if (pointers.size === 1) {
			originX = event.clientX;
			originY = event.clientY;
			panX = offsetX;
			panY = offsetY;
		}

		if (pointers.size === 2) {
			const [first, second] = pointers.values();
			pinchDistance = distance(first, second);
			pinchScale = scale;
			const mid = center(first, second);
			originX = mid.x;
			originY = mid.y;
			panX = offsetX;
			panY = offsetY;
		}

		try {
			preview.setPointerCapture(event.pointerId);
		} catch {
			// Some browsers reject capture on synthetic events.
		}
	},
	{ passive: true },
);

lightbox.addEventListener(
	'pointermove',
	(event) => {
		if (!pointers.has(event.pointerId)) return;

		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (pointers.size === 2) {
			const [first, second] = pointers.values();
			const nextDistance = distance(first, second);
			if (pinchDistance > 0) {
				scale = clamp((pinchScale * nextDistance) / pinchDistance, MIN_SCALE, MAX_SCALE);
			}

			const mid = center(first, second);
			offsetX = panX + (mid.x - originX);
			offsetY = panY + (mid.y - originY);
			clampPan();
			applyTransform();
			moved = true;
			return;
		}

		if (pointers.size === 1 && scale > 1) {
			const point = pointers.values().next().value;
			if (!point) return;
			offsetX = panX + (point.x - originX);
			offsetY = panY + (point.y - originY);
			clampPan();
			applyTransform();
			moved = true;
		}
	},
	{ passive: true },
);

function releasePointer(event: PointerEvent) {
	pointers.delete(event.pointerId);
	if (pointers.size === 1) {
		const remaining = pointers.values().next().value;
		if (!remaining) return;
		originX = remaining.x;
		originY = remaining.y;
		panX = offsetX;
		panY = offsetY;
	}
	if (scale <= 1) {
		offsetX = 0;
		offsetY = 0;
		applyTransform();
	}
}

lightbox.addEventListener('pointerup', releasePointer);
lightbox.addEventListener('pointercancel', releasePointer);

lightbox.addEventListener(
	'touchmove',
	(event) => {
		if (lightbox.classList.contains('is-open')) {
			event.preventDefault();
		}
	},
	{ passive: false },
);

lightbox.addEventListener('gesturestart', (event) => event.preventDefault());
lightbox.addEventListener('gesturechange', (event) => event.preventDefault());

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
		closeLightbox();
	}
});

bindImages();
