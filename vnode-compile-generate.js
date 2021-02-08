/**
 * 将`vnode.js` `template-compile.js` `template-generate.js`组合运行测试结果
 */

// -------------------- vnode -------------------- //
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

// -------------------- compile -------------------- //
// 解析需要用到的正则
const ncname = '[a-zA-Z_][\\w\\-\\.]*';

const singleAttrIdentifier = /([^\s"'<>/=]+)/;
const singleAttrAssign = /(?:=)/;
const singleAttrValues = [
	/"([^"]*)"+/.source,
	/'([^']*)'+/.source,
	/([^\s"'=<>`]+)/.source
];
const attribute = new RegExp(
		'^\\s*' + singleAttrIdentifier.source +
		'(?:\\s*(' + singleAttrAssign.source + ')' +
		'\\s*(?:' + singleAttrValues.join('|') + '))?'
	);

const qnameCapture = '((?:' + ncname + '\\:)?' + ncname + ')';
const startTagOpen = new RegExp('^<' + qnameCapture);
const startTagClose = /^\s*(\/?)>/; // fix error
const endTag = new RegExp('^<\\/' + qnameCapture + '[^>]*>'); // fix bug

const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g;

const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/;

let index = 0;

/**
 * 维护一个stack栈来保存已经解析好的标签头：
 * 在解析尾部标签的时候得到所属的层级关系以及父标签。
 */
 const stack = [];
 let currentParent, // 用于存放当前标签的父标签节点的引用
 	root; // 用于指向根标签节点

/**
 * 移动指针。
 * 每匹配解析完一段，需要将已经匹配掉的去掉，头部的指针指向接下来需要匹配的部分
 */
function advance (n) {
	index += n;
	html = html.substring( n );
}

/**
 * 解析标签头
 */
function parseStartTag () {
	const start = html.match( startTagOpen ); // 通过正则得到`标签的头部`
	if (start) {
		const match = {
			tagName: start[1], // 得到标签名称
			attrs: [], // 用于存放标签内的属性
			start: index
		};
		advance(start[0].length);

		let end, attr;
		// 使用两个正则分别用来解析标签结束以及标签内的属性，一直到匹配到startTagClose为止，解析内部所有的属性
		// 没有匹配到头部标签的关闭且匹配到属性，则循环继续
		while (!(end = html.match( startTagClose )) && (attr = html.match( attribute ))) { 
			advance( attr[0].length );
			match.attrs.push({
				name: attr[1],
				value: attr[3]
			});
		}
		if (end) {
			match.unarySlash = end[1];
			advance( end[0].length );
			match.end = index;
			return match;
		}
	}
}

/**
 * 将attrs转换成map格式
 */
function makeAttrsMap (attrs) {
	const map = {};
	for (let i = 0, l = attrs.length; i < l; i ++) {
		map[ attrs[i].name ] = attrs[ i ].value;
	}
	return map;
}

/**
 * 解析尾标签
 * 从stack栈中取出最近的跟自己标签名一致的那个元素，将`currentParent`指向那个元素，并将该元素之前的元素都从stack中出栈
 */
function parseEndTag (tagName) {
	let pos;
	for (pos = stack.length - 1; pos >=0; pos --) {
		if (stack[pos].lowerCasedTag === tagName.toLowerCase()) {
			break;
		}
	}

	if (pos >= 0) { // fix bug
		if (pos > 0) {
			currentParent = stack[pos - 1];
		} else {
			currentParent = null;
		}
		stack.length = pos;
	}
}

/**
 * 解析文本
 * 1.普通文本，直接构建一个节点push进当前`currentParent`的children即可
 * 2.带表达式，需要用`parseText`来将表达式转化成代码
 *
 * 使用一个`tokens`数组来存放解析结果，通过`defaultTagRE`来循环匹配该文本，
 * 如果是普通文本，直接`push`到`tokens`数组中去，如果是表达式{{item}}，则转化成"_s(${exp})"的形式
 */
function parseText (text) {
	if (!defaultTagRE.test(text)) return;

	const tokens = [];
	let lastIndex = defaultTagRE.lastIndex = 0;
	let match, index;
	// ?? 什么时候跳出循环
	while ((match = defaultTagRE.exec( text ))) {
		index = match.index; // 匹配到的内容的下标

		if (index > lastIndex) { // 大于lastIndex， 说明表达式前面存在普通文本，直接先push这段到tokens数组中
			tokens.push( JSON.stringify( text.slice(lastIndex, index) ) );
		}

		const exp = match[1].trim(); // 匹配到的表达式，转化成特定形式push进tokens数组
		tokens.push( `_s(${exp})` );
		lastIndex = index + match[0].length; // 更新lastIndex
	}

	if (lastIndex < text.length) { // 如果剩下的内容无法匹配vue表达式的正则，就全部都push进tokens数组
		tokens.push( JSON.stringify( text.slice(lastIndex) ) );
	}
	
	return tokens.join( '+' );
}

/**
 * 从`el`的`attrsMap`属性或是`attrsList`属性中取出`name`对应值
 */
function getAndRemoveAttr (el, name) {
	let val;
	if ((val = el.attrsMap[name]) != null) {
		const list = el.attrsList;
		for (let i = 0, l = list.length; i < l; i ++) {
			if (list[i].name === name) {
				list.splice(i, 1);
				break;
			}
		}
	}
	return val;
}

/**
 * 解析v-for指令
 */
function processFor (el) {
	let exp;
	if ((exp = getAndRemoveAttr( el, 'v-for' ))) {
		const inMatch = exp.match( forAliasRE );
		el.for = inMatch[2].trim();
		el.alias = inMatch[1].trim();
	}
}

/**
 * 解析v-if指令
 */
function processIf (el) {
	let exp = getAndRemoveAttr( el, 'v-if' );
	if (exp) {
		el.if = exp;
		if (!el.ifConditions) {
			el.ifConditions = [];
		}
		el.ifConditions.push( {
			exp: exp,
			block: el
		} );
	}
}

/**
 * 循环解析template对应字符串。
 * 循环进行字符串匹配
 * 用正则在匹配到标签头、标签尾以及文本的时候分别进行不同的处理
 */
function parseHTML () {
	while( html ) {
		let textEnd = html.indexOf( '<' );
		if (textEnd === 0) {
			const endTagMatch = html.match( endTag );
			if (endTagMatch) {
				// ...process end tag
				advance(endTagMatch[0].length);
				parseEndTag( endTagMatch[1] );
				continue;
			} 
			if (html.match( startTagOpen )) {
				// ...process start tag
				const startTagMatch = parseStartTag();
				const element = { // 将`startTagMatch`得到的结果首先封装成`element`。即最终形成的AST的节点，标签节点的type为1
					type: 1,
					tag: startTagMatch.tagName,
					lowerCasedTag: startTagMatch.tagName.toLowerCase(),
					attrsList: startTagMatch.attrs,
					attrsMap: makeAttrsMap( startTagMatch.attrs ),
					parent: currentParent,
					children: []
				};

				// 简单处理 v-if|v-for指令
				processIf( element );
				processFor( element );

				if (!root) { // 让`root`指向根节点的引用
					root = element;
				}
				if (currentParent) { // 将当前节点的`element`放入父节点`currentParent`的`children`数组中
					currentParent.children.push( element );
				}
				// 将当前节点`element`压入stack栈中，并将`currentParent`指向当前节点。
				// 如果下一个解析还是头标签或者文本，会成为当前节点的子节点，如果是尾标签，那么将会从栈中取出当前节点
				if (!startTagMatch.unarySlash) {
					stack.push( element ); 
					currentParent = element;
				}
				continue;
			}
		} else {
			// ...process text
			text = html.substring( 0, textEnd );
			advance( textEnd );
			let expression;
			if (expression = parseText(text)) { // vuejs表达式
				currentParent.children.push({
					type: 2, // 表达式节点
					text,
					expression
				});
			} else {
				currentParent.children.push({ // 普通文本
					type: 3, // 文本节点
					text
				});
			}
			continue;
		}
	}
	return root;
}

function parse() {
	return parseHTML();
}

/**
 * 优化函数
 */
function optimize (rootAst) {
	/**
	 * 判断是否为静态节点（为优化做准备，静态节点不需比对更新）
	 */
	function isStatic (node) {
		if (node.type === 2) { // 表达式节点
			return false;
		}
		if (node.type === 3) { // 文本节点
			return true;
		}
		return (!node.if && !node.for); // 是否不存在`if`且不存在`for`这样的条件表达式
	}
	/**
	 * 标记static。
	 * 通过isStatic来判断，并递归判断所有子节点，如果子节点为非静态节点，则当前节点也是非静态节点
	 */
	function markStatic (node) {
		node.static = isStatic( node );
		if (node.type === 1) {
			for (let i = 0, l = node.children.length; i < l; i ++) {
				const child = node.children[i];
				markStatic( child );
				if (!child.static) {
					node.static = false;
				}
			}
		}
	}

	/**
	 * 标记静态根。
	 * 当前节点是静态节点，且存在子节点，并且只有一个子节点时这个子节点不是文本节点（作者认为此种情况的优化消耗大于收益）
	 */
	function martStaticRoots (node) {
		if (node.type === 1) {
			if (node.static && node.children.length && !(
			node.children.length === 1 &&
			node.children[0].type === 3
			)) {
				node.staticRoot = true;
				return;
			} else {
				node.staticRoot = false;
			}
		}
	}

	markStatic( rootAst );
	martStaticRoots( rootAst );
}

// -------------------- generate -------------------- //
function generate (rootAst) {
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
			code = `_c('${el.tag},'{staticClass: ${el.attrsMap && el.attrsMap['class']},class: ${el.attrsMap && el.attrsMap[':class']},}${
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

	const code = rootAst ? genElement( rootAst ) : '_c("div")';
	return {
		render: `with(this){return ${code}`,
	} 
}

// -------------------- TEST -------------------- //
let html = '<div :class="c" class="demo" v-if="isShow"><span v-for="item in sz">hello, {{item}}.</span></div>';
const ast = parse();
optimize( ast );
const result = generate( ast );
console.log( result );