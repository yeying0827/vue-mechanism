/**
 * 订阅器——
 * Dependent（？）发布中心？
 */
class Dep {
	constructor() {
		// 一个用来存放Watcher对象的数组
		this.subs = [];
	}

	/**
	 * 向subs中添加一个Watcher对象
	 */
	addSub(sub) {
		this.subs.push(sub);
	}

    /**
     * 通知所有的Watcher对象更新视图
     */
	notify() {
		console.log( this.subs );
		this.subs.forEach( sub => {
			sub.update();
		} )
	}
}

/**
 * 观察者——1.每一个引用数据的都是订阅者
 */
class Watcher {
	constructor() {
		// 在new一个Watcher对象的时候，将该对象赋值给Dep.target，在get中会用到
		// 1.每次订阅时告诉告诉发布者我是谁（？)
		Dep.target = this;
	}

	update() {
		console.log( '视图更新啦~' );
	}
}

Dep.target = null;

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
	const dep = new Dep();

	Object.defineProperty( obj, key, {
		enumerable: true,
		configurable: true,
		get: function reactiveGetter() {
			// 将Dep.tartget（即当前Vue的Watcher对象）存入dep的subs中
			// 在获取属性时收集所有的关联视图的观察者
			// 1.需要知道有谁订阅了我，在订阅时保存下订阅者
			dep.addSub(Dep.target);
			return val;
		},
		set: function reactiveSetter(newVal) {
			if(newVal === val) return;
			val = newVal;
			// 触发dep的notify来通知所有的Watcher对象更新视图
			// 通知该属性关联的所有观察者可以去做一些操作了
			// 1.通知所有订阅者我更新了
			dep.notify();
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
 		observer( this._data ); // 监控数据
 		// 此时Dep.tart指向这个Watcher对象
 		new Watcher(); // 1.真正的订阅发生在数据被引用的时候（getter）
 		console.log( '模拟渲染啦~', options.id, this._data.text1 );
 		console.log( '模拟渲染啦w~', options.id, this._data.text2 );
 		// console.log( '模拟渲染啦dd~', options.id, this._data.text2 );
 	}
 }

let globalObj = {
	text1: 'text1',
	text2: 'text2'
};

let o1 = new Vue( {
	id: 'v1',
	template: 
		`<div>
			<span>{{text1}}</span>
		</div>`,
	data: globalObj
} );

let o2 = new Vue( {
	id: 'v2',
	template: 
		`<div>
			<span>{{text1}}</span>
		</div>`,
	data: globalObj
} );

// o1._data.text1 = 'hello';
// o1._data.text2 = 'moto';
globalObj.text2 = 'hello';
console.log( globalObj.text2 );