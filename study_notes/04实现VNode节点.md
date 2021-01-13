## 实现Virtual DOM下的一个VNode节点



### 什么是VNode

render function会被转化成VNode节点。

Virtual DOM其实就是一棵**以JavaScript对象（VNode节点）作为基础**的树，用对象属性来描述节点，实际上它只是一层对真实DOM的抽象。

最终通过一系列操作使这棵树映射到真实环境上。

Virtual DOM以JavaScript对象为基础而不依赖真实平台环境，所以具有跨平台的能力。（浏览器、Weex、Node等）



### 实现一个VNode

VNode归根结底就是一个JavaScript对象，只要这个类的一些属性可以正确直观地描述清楚当前节点的信息即可。

```javascript
class VNode {
  constructor (tag, data, children, text, elm) {
    // ...
  }
}
```

🌰：一个vue组件

```vue
<template>
	<span class="demo" v-show="isShow">
  	This is a span.
  </span>
</template>
```

JavaScript代码形式（模拟组件渲染）：

```javascript
function render () {
  return new VNode(
  	'span',
    // ...
  );
}
```

转换成的VNode：

```json
{
  tag: 'span',
  data: {
    // ...
  },
  children: [
    // ...
  ],
  text: undefined
}
```



「一些产生常用VNode的方法」:

```javascript
// 创建一个空节点
function createEmptyVNode () {
  // ...
}
// 创建一个文本节点
function createTextVNode (val) {
  // ...
}
// 克隆一个VNode节点
function cloneVNode (node) {
  // ...
}
```



「补充」：

文本节点有text无tag；非文本节点有tag无text。