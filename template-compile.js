// template例子

// <div :class="c" class="demo" v-if="isShow">
// 	<span v-for="item in sz">{{item}}</span>
// </div>


// 转化成的template字符串
let html = '<div :class="c" class="demo" v-if="isShow"><span v-for="item in sz">{{item}}</span></div>';


/**
 * compile
 */
 // parse得到的AST的样子
 {
 	'attrsMap': {
 		':class': 'c',
 		'class': 'demo',
 		'v-if': 'isShow'
 	},
 	'classBinding': 'c',
 	'if': 'isShow',
 	'ifCondition': [
 		{
 			'exp': 'isShow'
 		}
 	], 
 	'staticClass': 'demo',
 	'tag': 'div',
 	'children': [
 		{
 			'attrsMap': {
 				'v-for': 'item in sz'
 			},
 			'alias': 'item',
 			'for': 'sz',
 			'forProcessed': true,
 			'tag': 'span',
 			'children': [
 				{
 					'expression': '_s(item)',
 					'text': '{{item}}'
 				}
 			]
 		}
 	]
 }

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
const startTagClose = /^\s*(\/?>)/;
const endTag = new RegExp('<\\/' + qnameCapture + '[^>]*>');

const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g;

const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/;

let index = 0;

/**
 * 移动指针。
 * 每匹配解析完一段，需要将已经匹配掉的去掉，头部的指针指向接下来需要匹配的部分
 */
function advance (n) {
	index += n;
	html = html.substring( n );
}

/**
 * 维护一个stack栈来保存已经解析好的标签头：
 * 在解析尾部标签的时候得到所属的层级关系以及父标签。
 */
 const stack = [];
 let currentParent, // 用于存放当前标签的父标签节点的引用
 	root; // 用于指向根标签节点

/**
 * 循环解析template对应字符串。
 * 循环进行字符串匹配
 * 用正则在匹配到标签头、标签尾以及文本的时候分别进行不同的处理
 */
function parseHTML () {
	while( html ) {
		let textEnd = html.indexOf( '<' );
		if (textEnd === 0) {
			if (html.match( endTag )) {
				// ...process end tag
				const endTagMatch = htmlm.match( endTag );
				if (endTagMatch) {
					advance(endTagMatch[0].length);
					parseEndTag( endTagMatch[1] );
				}
				continue;
			} else if (html.match( startTagOpen )) {
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
				stack.push( element ); 
				currentParent = element;
				continue;
			}
		} else {
			// ...process text
			let text = html.substring( 0, textEnd );
			advance( textEnd );
			let expression;
			if (expression = parseText(text)) {
				currentParent.children.push({
					type: 2,
					text,
					expression
				});
			} else {
				currentParent.children.push({
					type: 3,
					text
				});
			}
			continue;
		}
	}
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

	if (pos >=0) {
		stack.length = pos;
		currentParent = stack[pos];
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
	while ((match = defaultTagRE.exec( text ))) {
		index = match.index; // 匹配到的内容的下标

		if (index > lastIndex) { // 大于lastIndex， 说明表达式前面存在普通文本，直接先push这段到tokens数组中
			tokens.push( JSON.stringify( text.slice(lastIndex, index) ) );
		}

		const exp = match[1].trim(); // 匹配到的表达式，转化成特定形式push进tokens数组
		tokens.push( `_s(${exp})` );
		lastIndex = index + match[0].length;
	}

	if (lastIndex < text.length) { // 如果剩下的内容无法匹配vue表达式的正则，就全部都push进tokens数组
		tokens.push( JSON.stringify( text.slice(lastIndex) ) );
	}

	return tokens.join( '+' );
}

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