// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

// https://astro.build/config
export default defineConfig({
	site: 'https://mzleman.github.io',
	devToolbar: {
		enabled: false,
	},
	markdown: {
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			defaultColor: false,
		},
		processor: unified({
			rehypePlugins: [rehypeWrapTables],
		}),
	},
});

/** 让宽表格能在自己的区域内横向滚动，而不是撑破正文。 */
function rehypeWrapTables() {
	return (tree) => {
		wrap(tree);
	};
}

function wrap(node) {
	if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
	for (let index = 0; index < node.children.length; index += 1) {
		const child = node.children[index];
		if (child?.type === 'element' && child.tagName === 'table') {
			node.children[index] = {
				type: 'element',
				tagName: 'div',
				properties: { className: ['table-wrap'] },
				children: [child],
			};
			continue;
		}
		wrap(child);
	}
}
