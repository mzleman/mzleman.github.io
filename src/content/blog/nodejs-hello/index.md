---
title: Node.js 入门：跑起第一个脚本
description: 写一个几行的脚本，用 Node.js 在终端打印一句问候。
date: 2026-11-03
tags:
  - node.js
draft: false
---

Node.js 让 JavaScript 跑在浏览器之外。把下面的代码存成 `hello.js`，在终端执行 `node hello.js`，就会看到这句问候。

```js
console.log("Hello, Node.js");
```

脚本、运行时和终端输出的关系是这样的：

![hello.js 交给 Node.js 运行，终端打印 Hello, Node.js](./assets/nodejs-hello.svg)

