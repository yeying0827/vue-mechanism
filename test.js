var a = 10;

var foo = {
	a: 20,
	bar: function () {
		var a = 30;
		console.log( this.a );
		return this.a;
	}
}

foo.bar();
let b = foo.bar;
(foo.bar)();
b();
(foo.bar = foo.bar)();
(foo.bar, foo.bar.bind(foo))();