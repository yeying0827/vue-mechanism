// -------------------------【generate】---------------------------//
// --------------- 将AST转化成render function字符串 -----------------//
// ----------- 最终得到render的字符串以及staticRenderFns字符串 --------//

/**
 * 渲染v-for列表
 */
function renderList (val, render) {
	let ret = new Array( val.length );
	for (let i = 0, l = val.length; i < l; i++) {
		ret[ i ] = render( val[ i ], i );
	}
}

/* 预期的render函数 */
render () {
	return isShow ? ( new VNode( 'div', {
		'staticClass': 'demo',
		'class': c
	},
	/* 这里还有子节点 */
	/* begin */
	renderList( sz, item => {
		return new VNode( 'span', {}, [
			createTextVNode( item )
		] );
	} )
	/* end */
	) ) : createEmptyVNode();
}


/**
 * 处理`if`条件
 */
function genIf (el) {
	el.ifProcessed = true;
	if (!el.ifConditions.length) {
		return '_e()';
	}
	return `(${el.ifConditions[0].exp})?${genElement(el.ifConditions[0].block)}: _e()`;
}

/**
 * 处理`for`循环
 */
function genFor (el) {
	el.forProcessed = true;

	const exp = el.for, // 循环的对象
		alias = el.alias,
		iterator1 = el.iterator1 ? `,${el.iterator1}` : '',
		iterator2 = el.iterator2 ? `,${el.iterator2}` : '';

	return `_l((${exp}),` +
		`function(${alias}${iterator1}${iterator2}){` +
		`return ${genElement(el)}` +
	'})';
}

/**
 * 处理文本节点
 */
function genText (el) {
	return `_v(${el.expression})`;
}

/**
 * 处理标签节点。
 * 根据是否有`if`或者`for`标记，判断是否要用`genIf`或者`genFor`处理，
 * 否则通过`genChildren`处理子节点，同时得到`staticClass`、`class`等属性
 */
function genElement (el) {
	if (el.if && !el.ifProcessed) {
		return genIf (el);
	} else if (el.for && !el.forProcessed) {
		return genFor (el);
	} else {
		const children = genChildren( el );
		let code;
		code = `_c('${el.tag},'{
			staticClass: ${el.attrsMap && el.attrsMap['class']},
			class: ${el.attrsMap && el.attrsMap[':class']},
		}${
			children ? `,${children}` : ''
		}`;
		return code;
	}
}

function genNode (el) {
	if (el.type === 1) {
		return genElement( el );
	} else {
		return genText( el );
	}
}

/**
 * 遍历所有子节点，通过`genNode`处理后用“,”隔开拼接成字符串
 */
function genChildren (el) {
	const children = el.children;

	if (children && children.length > 0) {
		return `${children.map(genNode).join(',')}`;
	}
}

function generate (rootAst) {
	const code = rootAst ? genElement( rootAst ) : '_c("div")';
	return {
		render: `with(this){return ${code}`,
	} 
}