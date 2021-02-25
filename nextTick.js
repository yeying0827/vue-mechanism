//----------------- 重写Wacher ---------------//
let uid = 0;

class Watcher {
	constructor () {
		this.id = ++uid;
	}

	update () {
		console.log( 'watch' + this.id + 'update' );
		queueWatcher( this );
	}

	run () {
		console.log( 'watch' + this.id + '视图更新啦~' );
	}
}

//----------------- nextTick ---------------//
let callbacks = [];
let pending = false; // false-空闲  true-执行中

function nextTick (cb) {
	callbacks.push( cb ); // 把需要执行的cb缓存在数组中

	if (!pending) { // 如果此时空闲，进入执行状态
		pending = true;
		setTimeout( flushCallbacks, 0 );
	}
}

function flushCallbacks () {
	pending = false;
	const copies = callbacks.slice( 0 );
	callbacks.length = 0;
	for (let i = 0; i < copies.length; i ++) {
		copies[i]();
	}
}

//----------------- queueWatcher ---------------//
let has = {}; // 使用Watcher.id 映射 是否在queque中的状态
let queue = [];
let waiting = false;

function queueWatcher (watcher) {
	const id = watcher.id;
	if (has[id] == null) {
		has[id] = true;
		queue.push( watcher );

		if (!waiting) { //  是否正在出队中
			waiting = true;
			nextTick( flushSchedulerQueue );
		}
	}
}

function flushSchedulerQueue () {
	let watcher, id;

	for (index = 0; index < queue.length; index ++) {
		watcher = queue[index];
		id = watcher.id;
		has[id] = null;
		watcher.run();
	}

	waiting = false;
}

//----------------- 🌰 ---------------//
(function () {
    let watch1 = new Watcher();
    let watch2 = new Watcher();

    watch1.update();
    watch1.update();
    watch2.update();
})();