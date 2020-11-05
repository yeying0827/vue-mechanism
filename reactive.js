/*
 * 模拟视图更新，被调用即代表更新视图
 */
function cb (val) {
	console.log( "视图更新啦~" );
}

/*
 * 对对象的`响应式化`，
 * 经过处理后，
 * obj的key属性在`读`时会触发`reactiveGetter`方法，
 * 在被`写`时会触发`reactiveSetter`方法
 * @param obj 绑定到的对象
 * @param key 属性名
 * @param val 具体的值 
 */
function defineReactive (obj, key, val) {
	Object.defineProperty( obj, key, {
		enumerable: true,
		configurable: true,
		get: function reactiveGetter() {
			// 实际中会依赖收集
			return val;
		},
		set: function reactiveSetter(newVal) {
			if(newVal === val) return;
			val = newVal;
			cb( newVal );
		},
	} );
}

/*
 * 在上面再封装一层，通过遍历所有属性的方式对对象的每一个属性都通过`defineReactive`处理，
 * 实际中observer会进行递归调用，为了便于理解省略递归过程
 * @param value 需要`响应式化`的对象
 */
function observer (value) {
	if(!value || (typeof value !== 'object')) {
		return;
	}

	Object.keys( value ).forEach( key => {
		defineReactive( value, key, value[key] );
	} );
}

/*
 * 用`observer`封装一个Vue!
 * data实际上是一个函数，这里用一个对象来简单处理
 */
 class Vue {
 	/*
 	 * 构造函数
 	 */
 	constructor (options) {
 		this._data = options.data;
 		observer( this._data );
 	}
 }


 // test
 // 只要new一个Vue对象，就会将data中的数据进行`响应式化`
 let o = new Vue( {
 	data: {
 		test: 'I am test.'
 	}
 } );
 o._data.test = 'Hello, world.';
 console.log(o._data.test);