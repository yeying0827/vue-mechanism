## Vuex状态管理的工作原理

### 为什么使用

一些组件间共享的数据或状态、或是需要通过props深层传递的一些数据

应用规模较小时，可使用props、事件等进行父子组件的通信，或是通过事件总线来进行任意两个组件的通信。

当应用逐渐复杂后，这样的通信方式会导致数据流混乱。

此时，就需要用到状态管理工具了。=》Vuex：将状态抽离到全局，形成一个Store



Vuex：

内部采用了new Vue来将Store内的数据进行「响应式化」，所以Vuex是利用Vue内部机制的库，与Vue高度契合。



### 安装

Vuejs提供了一个`Vue.use`的方法来安装插件，内部会调用**插件提供**的`install`方法。

```javascript
Vue.use( Vuex );
```

所以Vuex插件需要提供一个`install`方法来安装

```javascript
let Vue;
export default install (_Vue) {
  Vue.mixin( { beforeCreate: vuexInit } );
  Vue = _Vue;
}
```

这里采用`Vue.mixin`方法将`vuexInit`方法混淆进`beforeCreate`钩子中，并用`Vue`变量保存Vue对象。那么`vuexInit`究竟实现了什么呢？

在使用Vuex的时候，我们需要将`store`传入到Vue实例中去。

```javascript
new Vue({
  el: '#app',
  store
});
```

但是我们却可以在每一个vm中访问该`store`，这就需要靠`vuexInit`了。

```javascript
function vuexInit () {
  const options = this.$options;
  if (options.store) {
    this.$store = options.store;
  } else {
    this.$store = options.parent.$store;
  }
}
```

因为之前已经用`Vue.mixin`方法将`vuexInit`方法混淆进`beforeCreate`钩子中，所以每一个vm实例都会调用`vuexInit`方法。

这样就可以在任意一个vm中通过`this.$store`来访问`Store`的实例

### Store

**~数据的响应式化**

首先，需要在**`Store`**的构造函数中对`state`进行「响应式化」。

```javascript
constructor () {
  this._vm = new Vue( {
    data: {
      $$state: this.state
    }
  } )
}
```

在这个步骤以后，`state`会将需要的依赖收集在`Dep`中，在被修改时更新对应视图。

**~一个例子：**

```javascript
let globalData = {
  d: 'hello world'
};

new Vue( {
  data () {
    return {
      $$state: {
      	globalData
    	}
    }
  }
} );

setTimeout( ()=> {
  globalData.d = 'hi~';
}, 1000 );

Vue.prototype.globalData = globalData;
```

任意模板中：

```html
<div>
  {{globalData.d}}
</div>
```

上例中在全局有一个`gloalData`（模拟Store？？），被传入一个`Vue`对象的`data`中，之后在任意Vue模板中对该变量进行展示，（因为此时`globalData`已经在Vue的`prototype`上了，所以直接通过`this.prototype`访问，）也就是在模板中的`{{globalData.d}}`。

`setTimeout`在1s之后将`globalData.d`进行修改，发现模板中的`globalData.d`发生了变化。

上述就是Vuex依赖Vue核心实现数据的「响应式化」。

**~两个常用的`Store`的API**

* commit

  用于触发`mutation`。

  ```javascript
  commit (type, payload, _options) {
    const entry = this._mutations[type];
    entry.forEach( function commitIterator (handler) {
      handler( payload );
    } );
  }
  ```

  从`_mutations`中取出对应的mutation，循环执行其中的每一个mutation。

* dispatch

  用于触发action，可以包含异步状态。

  ```javascript
  dispatch (type, payload) {
    const entry = this._actions[type];
    
    return entry.length > 1
    ? Promise.all( entry.map( handler => handler( payload ) ) )
    : entry[0](payload);
  }
  ```

  取出`_actions`中的所有对应action，将其执行，如有多个则用`Promise.all`进行包装。



### 最后

理解Vuex的核心在于理解其如何与Vue本身结合，如何利用Vue的响应式机制来实现核心Store的「响应式化」。

[Vuex源码](https://github.com/vuejs/vuex)

store有一个自己对应的Vue实例（？？）