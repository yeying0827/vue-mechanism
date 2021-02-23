/**
 * 数据状态更新时的差异diff及patch机制
 */

// 跨平台适配器 (举例)
const nodeOps = {
	// 设置文本内容
	setTextContent (text) {
		if (platform === 'weex') {
			node.parentNode.setAttr( 'value', text );
		} else if (platform === 'web') {
			node.textContent = text;
		}
	},
	// 获取父节点
	parentNode () {
		// ...
	},
	// 移除某个子节点
	removeChild () {
		// ...
	},
	// 获取兄弟节点
	nextSibling () {
		// ...
	},
	// 在前面插入
	insertBefore () {
		// ...
	},
	// ...
};

/**
 * 关键API (调用nodeOps中的相应函数)
 */
/**
 * 用于在`parent`下插入一个子节点，如果指定了`ref`，则插入到`ref`这个子节点前面
 */
function insert (parent, elm, ref) {
	if (parent) {
		if (ref) {
			if (ref.parentNode === parent) {
				nodeOps.insertBefore( parent, elm, ref );
			}
		} else {
			nodeOps.appendChild( parent, elm );
		}
	}
}
/**
 * 用于创建一个新节点，`tag`存在就创建一个标签节点，否则创建一个文本节点
 */
function createElm (vnode, parentElm, refElm) {
	if (vnode.tag) {
		insert( parentElm, nodeOps.createElement( vnode.tag ), refElm );
	} else {
		insert( parentElm, nodeOps.createTextNode( vnode.text ), refElm );
	}
}
/**
 * 用于批量调用`createElm`新建节点
 */
function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx) {
	for (; startIdx <= endIdx; ++startIdx) {
		createElm( vnodes[startIdx], parentElm, refElm );
	}
}
/**
 * 用于移除节点
 */
function removeNode (el) {
	const parent = nodeOps.parentNode( el );
	if (parent) {
		nodeOps.removeChild( parent, el );
	}
}
/**
 * 用于批量调用`removeNode`移除节点
 */
function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
	for (; startIdx <= endIdx; ++startIdx) {
		const ch = vnodes[startIdx];
		if (ch) {
			removeNode(ch.elm);
		}
	}
}


/**
 * patch！！
 * diff算法：通过同层的树节点进行比较、而非对树进行逐层搜索遍历的方式
 */
function patch (oldVnode, vnode, parentElm) {
	if (!oldVnode) { // 没有老节点（即增加新节点）
		addVnodes( parentElm, null, vnode, 0, vnode.length - 1 ); // 不是用createElm??
	} else if (!vnode) { // 没有新节点（即删除老节点）
		removeVnodes( parentElm, oldVnode, 0, oldVnode.length - 1 ); // 不是用removeNode??
	} else { 
		// 更新前后都存在节点
		if (sameVnode( oldVnode, vnode )) { // 节点基本信息相同->进行更细的比对
			patchVnode( oldVnode, vnode );
		} else { // 节点基本信息存在不同(即不同节点)->删除老节点，增加新节点
			removeVnodes( parentElm, oldVnode, 0, oldVnode.length - 1 );
			addVnodes( parentElm, null, vnode, 0, vnode.length - 1 );
		}
	}
}

/**
 * 判断是否为同个节点
 */
function sameVnode (a, b) {
	return (
		a.key === b.key &&
		a.tag === b.tag &&
		a.isComment === b.isComment &&
		(!!a.data) === (!!b.data) &&
		sameInputType( a, b )
	)
}

function sameInputType (a, b) {
	if (a.tag !== 'input') return true;
	let i;
	const typeA = (i = a.data) && (i = i.attrs) && i.type;
	const typeB = (i = b.data) && (i = i.attrs) && i.type;
	return typeA === typeB;
}

/**
 * 节点比对
 */
function patchVnode (oldVnode, vnode) {
	if (oldVnode === vnode) { // 新老vnode相同
		return;
	}

	if (vnode.isStatic && oldVnode.isStatic && vnode.key === oldVnode.key) { // 新老节点都是静态的且key相同
		vnode.elm = oldVnode.elm;
		vnode.componentInstance = oldVnode.componentInstance;
		return;
	}

	const elm = vnode.elm = oldVnode.elm;
	const oldCh = oldVnode.children;
	const ch = vnode.children;

	if (vnode.text) { // 新vnode节点是文本节点
		nodeOps.setTextContent( elm, vnode.text );
	} else {
		if (oldCh && ch) { // 新旧节点都存在子节点
			if (oldCh !== ch) {
				updateChildren( elm, oldCh, ch );
			}
		} else if (ch) { // 只有新节点有子节点
			if (oldVnode.text) nodeOps.setTextContent( elm, '' );
			addVnodes( elm, null, ch, 0, ch.length - 1 );
		} else if (oldCh) { // 只有旧节点有子节点
			removeVnodes( elm, oldCh, 0, oldCh.length - 1 );
		} else if (oldVnode.text) { // 新旧节点都没子节点且旧节点是文本节点
			nodeOps.setTextContent( elm, '' );
		}
	}
}

/**
 * 更新子节点
 */
function updateChildren (parentElm, oldCh, newCh) {
	let oldStartIdx = 0;
	let oldEndIdx = oldCh.length - 1;
	let oldStartVnode = oldCh[0];
	let oldEndVnode = oldCh[oldEndIdx];

	let newStartIdx = 0;
	let newEndIdx = newCh.length - 1;
	let newStartVnode = newCh[0];
	let newEndVnode = newCh[newEndIdx];

	let oldKeyToIdx, idxInOld, elmToMove, refElm;

	// `oldStartIdx`、`newStartIdx`、`oldEndIdx`以及`newEndIdx`逐渐向中间靠拢的过程
	while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
		if (!oldStartVnode) { // 旧头部为空
			oldStartVnode = oldCh[++oldStartIdx];
		} else if (!oldEndVnode) { // 旧尾部为空
			oldEndVnode = oldCh[--oldEndIdx];
		} else if (sameVnode( oldStartVnode, newStartVnode )) { // 头部是相同的vnode节点
			patchVnode( oldStartVnode, newStartVnode );
			oldStartVnode = oldCh[++oldStartIdx];
			newStartVnode = newCh[++newStartIdx];
		} else if (sameVnode( oldEndVnode, newEndVnode )) { // 尾部相同
			patchVnode( oldEndVnode, newEndVnode );
			oldEndVnode = oldCh[--oldEndIdx];
			newEndVnode = newCh[--newEndIdx];
		} else if (sameVnode( oldStartVnode, newEndVnode )) { // 旧头部与新尾部相同
			patchVnode( oldStartVnode, newEndVnode );
			nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling( oldEndVnode.elm ));
			oldStartVnode = oldCh[++oldStartIdx];
			newEndVnode = newCh[--newEndIdx];
		} else if (sameVnode( oldEndVnode, newStartVnode )) { // 旧尾部与新头部相同
			patchVnode( oldEndVnode, newStartVnode );
			nodeOps.insertBefore( parentElm, oldEndVnode.elm, oldStartVnode.elm );
			oldEndVnode = oldCh[--oldEndIdx];
			newStartVnode = newCh[++newStartIdx];
		} else { // 
			let elmToMove = oldCh[idxInOld];
			if (!oldKeyToIdx) oldKeyToIdx = createKeyToOldIdx( oldCh, oldStartIdx, oldEndIdx ); // key和index的映射
			idxInOld = newStartVnode.key ? oldKeyToIdx[newStartVnode.key] : null;
			if (!idxInOld) { // 如果通过key没有找到旧节点对应的id->说明是新增元素
				createElm( newStartVnode, parentElm, oldStartVnode.elm );
				newStartVnode = newCh[++newStartIdx];
			} else {
				elmToMove = oldCh[idxInOld]; // 与新头部key相同的元素
				if (sameVnode( elmToMove, newStartVnode )) { // 新头部与旧数组中key相同的元素 比对
					patchVnode( elmToMove, newStartVnode );
					oldCh[idxInOld] = undefined;
					nodeOps.insertBefore( parentElm, newStartVnode.elm, oldStartVnode.elm );
					newStartVnode = newCh[++newStartIdx];
				} else {
					createElm( newStartVnode, parentElm, oldStartVnode.elm );
					newStartVnode = newCh[++newStartIdx];
				}
			}
		}
	}

	if (oldStartIdx > oldEndIdx) { // 跳出循环后：旧节点比对完了（需要增加新节点）
		refElm = (newCh[newEndIdx + 1]) ? newCh[newEndIdx + 1].elm : null;
		addVnodes( parentElm, refElm, newCh, newStartIdx, newEndIdx );
	} else if (newStartIdx > newEndIdx) { // 跳出循环后：新节点比对完了（需要删除旧节点）
		removeVnodes( parentElm, oldCh, oldStartIdx, oldEndIdx );
	}
}

/**
 * 产生`key`与`index`索引对应的一个map表
 */
function createKeyToOldIdx (children, beginIdx, endInx) {
	let i, key;
	const map = {};
	for (i = beginIdx; i <= endInx; ++ i ) {
		key = children[i].key;
		if (isDef(key)) map[key] = i;
	}
	return map;
}