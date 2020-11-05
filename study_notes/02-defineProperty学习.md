## Object.defineProperty

用于在一个对象上定义一个新的属性，或者修改一个已有属性，并返回该对象本身。

使用语法：

`Object.defineProperty(obj, prop, descriptor)`

obj: 需要被定义属性的对象

prop：被新增或修改的属性的name或者Symbol

descriptor：对于属性的描述



通过赋值操作新增的属性可以在枚举对象属性时（for..in循环或Object.keys方法）被列举，他们的值可以被修改，属性本身也可以被删除。

通过`Object.defineProperty`定义的属性默认是不可更改，也不可枚举。



###descriptor描述符

**descriptor有两种主要类型：data型和accessor型。**

data型定义属性的value，和writtable；

accessor型定义属性的一对setter和getter函数。

descriptor必然是两者之一，不会同时既是data型又是accessor型。

**descriptor可定义的key：**

* configurable：**默认false**

  如果descriptor的类型可更改，并且属性本身可被删除，就设置为true。

* enumerable：**默认false**

  如果属性要在枚举对象属性时被列举，就设置为true。

* value：**默认undefined**

  对象属性的值

* writtable：默认false

  如果属性的值可以通过赋值操作被更改，就设置为true。

* get：**默认undefined**

  提供属性的一个getter函数

  当属性被访问时，这个函数被调用（继承属性也是如此），函数返回值被用作属性的值。

* set：**默认undefined**

  提供属性的一个setter函数

  当属性被赋值时，这个函数被调用，传入的参数被赋值给对应属性。

如果一个descriptor没有`value`、`writable`、`get`、`set`中的任意一个key，则会被当作data型的descriptor。如果一个descriptor同时有data型和accessor型的key，就会抛出异常TypeError。

定义descriptor时key可以不用全部设置，未设置的他们会使用默认值。



###例子

* 修改属性

  当属性已经存在，使用`Object.defineProperty`就会根据descriptor和对象的当前配置尝试去修改属性。

  如果`configurable`为false，accessor型的属性的任一key的值都不能被更改；而data型的属性，如果`writable`是true就可以更改value值，`writable`也可以由true改为false。但是不能在data型和accesso型之间切换。

  `configurable`为false时，如果尝试修改不可配置的key的值（暂时不管value和writable），将会抛出`TypeError`，除非新值和旧值相同。

* 修改writable为false的data型属性的value

  通过赋值操作不会修改成功，也不会抛出异常（严格模式会抛出TypeError）

* enumerable

  此key的值定义了是否属性可以被`Object.assign()`或者`spead`操作获取到；对于非Symbols的属性，也定义了是否会在`for..in()`和`Object.keys()`时被列举（Symbol的属性不会被列举）

* configurable

  用于控制属性是否可被删除，以及key对应的值（除了value和writable）是否可更改。

* 定制化的Setters和Getters

* 继承属性

  如果一个accessor属性被继承了，当子类对象访问或修改对应属性时，`get`和`set`方法会被调用

  `value`总是被设置在对象自身，不是在原型上。但如果一个只读的`value`的属性被继承，对属性的修改会被阻止。

  

###兼容

* Array对象的length属性

* IE8的使用

  * 只可以在DOM对象上使用
  * data属性必须设置configurable、enumerable和writable为true；accessor属性需要设置configurable为true、enumerable为false
  * 修改一个属性的配置时必须先删除，否则更改无效

* Chrome 37（及之前版本）

  当尝试在一个函数上定义一个名为prototype的属性时有bug，`writable:false`不会是期望中的效果。



[MDN文档：Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)

