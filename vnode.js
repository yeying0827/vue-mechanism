/**
 * VNode类的简单实现
 * 使用一些属性正确直观地描述清楚当前节点的信息
 */
class VNode {
	constructor (tag, data, children, text, elm) {
		/* 当前节点的标签名 */
		this.tag = tag;
		/* 当前节点的一些数据信息，如props、attrs等 */
		this.data = data;
		/* 当前节点的子节点，是一个数组 */
		this.children = children;
		/* 当前节点的文本 */
		this.text = text;
		/* 当前虚拟节点对应的真实dom节点 */
		this.elm = elm;
	}
}

`
<template>
	<span class="demo" v-show="isShow">
		This is a span.
	</span>
</template>
`;
// 组件渲染模拟
function render () {
	return new VNode(
		'span',
		{
			directives: [
				{
					rawName: 'v-show',
					expression: 'isShow',
					name: 'show',
					value: true
				}
			],
			staticClass: 'demo'
		},
		[ new VNode(undefined, undefined, undefined, 'This is a span.') ]
	);
}
// 转换成的VNode
vnode = {
	tag: 'span',
	data: {
		/* 指令集合数组 */
		directives: [
			{
				rawName: 'v-show',
				expression: 'isShow',
				name: 'show',
				value: true
			}
		],
		/* 静态class */
		staticClass: 'demo'
	},
	children: [
		/* 子节点是一个文本VNode节点 */
		{
			tag: undefined,
			data: undefined,
			children: undefined,
			text: 'This is a span.'
		}
	],
	text: undefined
}

/**
 * 产生常用VNode的方法
 */
 // 创建一个空节点
 function createEmptyVNode () {
 	const node = new VNode();
 	node.text = '';
 	return node;
 }
 // 创建一个文本节点
 function createTextVNode (val) {
 	return new VNode( undefined, undefined, undefined, String( val ) );
 }
 // 克隆一个VNode节点
 function cloneVNode (node) {
 	const cloneVnode = new VNode(
 		node.tag,
 		node.data,
 		node.children,
 		node.text,
 		node.elm
 	);
 	return cloneVnode;
 }