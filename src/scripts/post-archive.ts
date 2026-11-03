type ArchivePost = {
	id: string;
	title: string;
	description: string;
	date: string;
	tags: string[];
};

const PAGE_SIZE = 6;
const dateFormat = new Intl.DateTimeFormat('zh-CN', {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
});

const root = document.querySelector<HTMLElement>('[data-archive]');
const dataNode = document.querySelector<HTMLScriptElement>('#archive-data');
if (!root || !dataNode?.textContent) {
	throw new Error('笔记列表数据不存在');
}

const posts = JSON.parse(dataNode.textContent) as ArchivePost[];
const searchInput = root.querySelector<HTMLInputElement>('[data-archive-search]');
const list = root.querySelector<HTMLElement>('[data-archive-list]');
const pager = root.querySelector<HTMLElement>('[data-archive-pager]');
const status = root.querySelector<HTMLElement>('[data-archive-status]');

if (!searchInput || !list || !pager || !status) {
	throw new Error('笔记列表结构不完整');
}

let query = '';
let page = 1;

function matches(post: ArchivePost) {
	const keyword = query.trim().toLowerCase();
	if (!keyword) return true;
	return [post.title, post.description, post.tags.join(' ')].join(' ').toLowerCase().includes(keyword);
}

function filteredPosts() {
	return posts.filter(matches);
}

function render({ preserveScroll = false } = {}) {
	const scrollX = window.scrollX;
	const scrollY = window.scrollY;
	const result = filteredPosts();
	const pageCount = Math.max(1, Math.ceil(result.length / PAGE_SIZE));
	page = Math.min(page, pageCount);
	const start = (page - 1) * PAGE_SIZE;
	const visible = result.slice(start, start + PAGE_SIZE);

	list.innerHTML = visible
		.map(
			(post) => `<li>
				<a href="/blog/${post.id}">
					<time datetime="${post.date}">${dateFormat.format(new Date(post.date))}</time>
					<h3>${escapeHtml(post.title)}</h3>
					<p>${escapeHtml(post.description)}</p>
				</a>
			</li>`,
		)
		.join('');

	if (result.length === 0) {
		status.textContent = query ? `没有找到“${query.trim()}”相关的笔记` : '还没有笔记';
	} else {
		status.textContent = query
			? `找到 ${result.length} 篇，第 ${page} / ${pageCount} 页`
			: `共 ${result.length} 篇，第 ${page} / ${pageCount} 页`;
	}

	pager.hidden = result.length <= PAGE_SIZE;
	if (!pager.hidden) {
		pager.innerHTML = `
			<button type="button" data-page-delta="-1" ${page === 1 ? 'disabled' : ''}>上一页</button>
			<span>${page} / ${pageCount}</span>
			<button type="button" data-page-delta="1" ${page === pageCount ? 'disabled' : ''}>下一页</button>
		`;
	}

	if (preserveScroll) {
		window.scrollTo(scrollX, scrollY);
	}
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

searchInput.addEventListener('input', () => {
	query = searchInput.value;
	page = 1;
	render({ preserveScroll: true });
});

pager.addEventListener('click', (event) => {
	const button = event.target;
	if (!(button instanceof HTMLButtonElement)) return;
	const delta = Number(button.dataset.pageDelta);
	if (!delta) return;
	page += delta;
	render();
});

render();
