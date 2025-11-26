if (typeof Promise === "undefined") {
(function () {
	function Promise(resolver) {
		var
		self = this,
		then = self.then = function () {
			return Promise.prototype.then.apply(self, arguments);
		};

		then.fulfilled = [];
		then.rejected = [];

		function timeout(state, object) {
			then.state = 'pending';

			if (then[state].length) setTimeout(function () {
				timeout(state, then.value = then[state].shift().call(self, object));
			}, 0);
			else then.state = state;
		}

		then.fulfill = function (object) {
			timeout('fulfilled', object);
		};

		then.reject = function (object) {
			timeout('rejected', object);
		};

		resolver.call(self, then.fulfill, then.reject);

		return self;
	}

	Promise.prototype = {
		'constructor': Promise,
		'then': function (onFulfilled, onRejected) {
			if (onFulfilled) this.then.fulfilled.push(onFulfilled);
			if (onRejected) this.then.rejected.push(onRejected);

			if (this.then.state === 'fulfilled') this.then.fulfill(this.then.value);

			return this;
		},
		'catch': function (onRejected) {
			if (onRejected) this.then.rejected.push(onRejected);

			return this;
		}
	};

	Promise.all = function () {
		var
		args = Array.prototype.slice.call(arguments),
		countdown = args.length;

		function process(promise, fulfill, reject) {
			promise.then(function onfulfilled(value) {
				if (promise.then.fulfilled.length > 1) promise.then(onfulfilled);
				else if (!--countdown) fulfill(value);

				return value;
			}, function (value) {
				reject(value);
			});
		}

		return new Promise(function (fulfill, reject) {
			while (args.length) process(args.shift(), fulfill, reject);
		});
	};

	window.Promise = Promise;
})();

}
if (!Function.prototype.bind) {
// Function.prototype.bind
Function.prototype.bind = function bind(scope) {
	var
	callback = this,
	prepend = Array.prototype.slice.call(arguments, 1),
	Constructor = function () {},
	bound = function () {
		return callback.apply(
			this instanceof Constructor && scope ? this : scope,
			prepend.concat(Array.prototype.slice.call(arguments, 0))
		);
	};

	Constructor.prototype = bound.prototype = callback.prototype;

	return bound;
};

}
if (typeof window.atob === 'undefined' || typeof window.btoa === 'undefined') {
/** @license MIT David Lindquist (http://www.webtoolkit.info/javascript-base64.html), Andrew Dodson (drew81.com) */
(function () {
	var keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=', keysRe = new RegExp('[^' + keys + ']');

	// Window.prototype.atob
	Window.prototype.atob = function atob(input) {
		var output = [], buffer, bufferB, chrs, index = 0, indexB, length = input.length;

		if ((length % 4 > 0) || (keysRe.test(input)) || (/=/.test(input) && (/=[^=]/.test(input) || /={3}/.test(input)))) {
			throw new Error('Invalid base64 data');
		}

		while (index < length) {
			for (bufferB = [], indexB = index; index < indexB + 4;) {
				bufferB.push(keys.indexOf(input.charAt(index++)));
			}

			buffer = (bufferB[0] << 18) + (bufferB[1] << 12) + ((bufferB[2] & 63) << 6) + (bufferB[3] & 63);

			chrs = [(buffer & (255 << 16)) >> 16, bufferB[2] === 64 ? -1 : (buffer & (255 << 8)) >> 8, bufferB[3] === 64 ? -1 : buffer & 255];

			for (indexB = 0; indexB < 3; ++indexB) {
				if (chrs[indexB] >= 0 || indexB === 0) {
					output.push(String.fromCharCode(chrs[indexB]));
				}
			}
		}

		return output.join('');
	};

	// Window.prototype.btoa
	Window.prototype.btoa = function btoa(input) {
		var output = [], buffer, chrs, index = 0, length = input.length;

		while (index < length) {
			chrs = [input.charCodeAt(index++), input.charCodeAt(index++), input.charCodeAt(index++)];

			buffer = (chrs[0] << 16) + ((chrs[1] || 0) << 8) + (chrs[2] || 0);

			output.push(
				keys.charAt((buffer & (63 << 18)) >> 18),
				keys.charAt((buffer & (63 << 12)) >> 12),
				keys.charAt(isNaN(chrs[1]) ? 64 : (buffer & (63 << 6)) >> 6),
				keys.charAt(isNaN(chrs[2]) ? 64 : (buffer & 63))
			);
		}

		return output.join('');
	};
})();

}

/**
 * Modules
 *
 * Copyright (c) 2013 Filatov Dmitry (dfilatov@yandex-team.ru)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * @version 0.1.2
 */

(function(global) {

var undef,

    DECL_STATES = {
        NOT_RESOLVED : 'NOT_RESOLVED',
        IN_RESOLVING : 'IN_RESOLVING',
        RESOLVED     : 'RESOLVED'
    },

    /**
     * Creates a new instance of modular system
     * @returns {Object}
     */
    create = function() {
        var curOptions = {
                trackCircularDependencies : true,
                allowMultipleDeclarations : true
            },

            modulesStorage = {},
            waitForNextTick = false,
            pendingRequires = [],

            /**
             * Defines module
             * @param {String} name
             * @param {String[]} [deps]
             * @param {Function} declFn
             */
            define = function(name, deps, declFn) {
                if(!declFn) {
                    declFn = deps;
                    deps = [];
                }

                var module = modulesStorage[name];
                if(!module) {
                    module = modulesStorage[name] = {
                        name : name,
                        decl : undef
                    };
                }

                module.decl = {
                    name       : name,
                    prev       : module.decl,
                    fn         : declFn,
                    state      : DECL_STATES.NOT_RESOLVED,
                    deps       : deps,
                    dependents : [],
                    exports    : undef
                };
            },

            /**
             * Requires modules
             * @param {String|String[]} modules
             * @param {Function} cb
             * @param {Function} [errorCb]
             */
            require = function(modules, cb, errorCb) {
                if(typeof modules === 'string') {
                    modules = [modules];
                }

                if(!waitForNextTick) {
                    waitForNextTick = true;
                    nextTick(onNextTick);
                }

                pendingRequires.push({
                    deps : modules,
                    cb   : function(exports, error) {
                        error?
                            (errorCb || onError)(error) :
                            cb.apply(global, exports);
                    }
                });
            },

            /**
             * Returns state of module
             * @param {String} name
             * @returns {String} state, possible values are NOT_DEFINED, NOT_RESOLVED, IN_RESOLVING, RESOLVED
             */
            getState = function(name) {
                var module = modulesStorage[name];
                return module?
                    DECL_STATES[module.decl.state] :
                    'NOT_DEFINED';
            },

            /**
             * Returns whether the module is defined
             * @param {String} name
             * @returns {Boolean}
             */
            isDefined = function(name) {
                return !!modulesStorage[name];
            },

            /**
             * Sets options
             * @param {Object} options
             */
            setOptions = function(options) {
                for(var name in options) {
                    if(options.hasOwnProperty(name)) {
                        curOptions[name] = options[name];
                    }
                }
            },

            getStat = function() {
                var res = {},
                    module;

                for(var name in modulesStorage) {
                    if(modulesStorage.hasOwnProperty(name)) {
                        module = modulesStorage[name];
                        (res[module.decl.state] || (res[module.decl.state] = [])).push(name);
                    }
                }

                return res;
            },

            onNextTick = function() {
                waitForNextTick = false;
                applyRequires();
            },

            applyRequires = function() {
                var requiresToProcess = pendingRequires,
                    i = 0, require;

                pendingRequires = [];

                while(require = requiresToProcess[i++]) {
                    requireDeps(null, require.deps, [], require.cb);
                }
            },

            requireDeps = function(fromDecl, deps, path, cb) {
                var unresolvedDepsCnt = deps.length;
                if(!unresolvedDepsCnt) {
                    cb([]);
                }

                var decls = [],
                    onDeclResolved = function(_, error) {
                        if(error) {
                            cb(null, error);
                            return;
                        }

                        if(!--unresolvedDepsCnt) {
                            var exports = [],
                                i = 0, decl;
                            while(decl = decls[i++]) {
                                exports.push(decl.exports);
                            }
                            cb(exports);
                        }
                    },
                    i = 0, len = unresolvedDepsCnt,
                    dep, decl;

                while(i < len) {
                    dep = deps[i++];
                    if(typeof dep === 'string') {
                        if(!modulesStorage[dep]) {
                            cb(null, buildModuleNotFoundError(dep, fromDecl));
                            return;
                        }

                        decl = modulesStorage[dep].decl;
                    }
                    else {
                        decl = dep;
                    }

                    decls.push(decl);

                    startDeclResolving(decl, path, onDeclResolved);
                }
            },

            startDeclResolving = function(decl, path, cb) {
                if(decl.state === DECL_STATES.RESOLVED) {
                    cb(decl.exports);
                    return;
                }
                else if(decl.state === DECL_STATES.IN_RESOLVING) {
                    curOptions.trackCircularDependencies && isDependenceCircular(decl, path)?
                        cb(null, buildCircularDependenceError(decl, path)) :
                        decl.dependents.push(cb);
                    return;
                }

                decl.dependents.push(cb);

                if(decl.prev && !curOptions.allowMultipleDeclarations) {
                    provideError(decl, buildMultipleDeclarationError(decl));
                    return;
                }

                curOptions.trackCircularDependencies && (path = path.slice()).push(decl);

                var isProvided = false,
                    deps = decl.prev? decl.deps.concat([decl.prev]) : decl.deps;

                decl.state = DECL_STATES.IN_RESOLVING;
                requireDeps(
                    decl,
                    deps,
                    path,
                    function(depDeclsExports, error) {
                        if(error) {
                            provideError(decl, error);
                            return;
                        }

                        depDeclsExports.unshift(function(exports, error) {
                            if(isProvided) {
                                cb(null, buildDeclAreadyProvidedError(decl));
                                return;
                            }

                            isProvided = true;
                            error?
                                provideError(decl, error) :
                                provideDecl(decl, exports);
                        });

                        decl.fn.apply(
                            {
                                name   : decl.name,
                                deps   : decl.deps,
                                global : global
                            },
                            depDeclsExports);
                    });
            },

            provideDecl = function(decl, exports) {
                decl.exports = exports;
                decl.state = DECL_STATES.RESOLVED;

                var i = 0, dependent;
                while(dependent = decl.dependents[i++]) {
                    dependent(exports);
                }

                decl.dependents = undef;
            },

            provideError = function(decl, error) {
                decl.state = DECL_STATES.NOT_RESOLVED;

                var i = 0, dependent;
                while(dependent = decl.dependents[i++]) {
                    dependent(null, error);
                }

                decl.dependents = [];
            };

        return {
            create     : create,
            define     : define,
            require    : require,
            getState   : getState,
            isDefined  : isDefined,
            setOptions : setOptions,
            getStat    : getStat
        };
    },

    onError = function(e) {
        nextTick(function() {
            throw e;
        });
    },

    buildModuleNotFoundError = function(name, decl) {
        return Error(decl?
            'Module "' + decl.name + '": can\'t resolve dependence "' + name + '"' :
            'Required module "' + name + '" can\'t be resolved');
    },

    buildCircularDependenceError = function(decl, path) {
        var strPath = [],
            i = 0, pathDecl;
        while(pathDecl = path[i++]) {
            strPath.push(pathDecl.name);
        }
        strPath.push(decl.name);

        return Error('Circular dependence has been detected: "' + strPath.join(' -> ') + '"');
    },

    buildDeclAreadyProvidedError = function(decl) {
        return Error('Declaration of module "' + decl.name + '" has already been provided');
    },

    buildMultipleDeclarationError = function(decl) {
        return Error('Multiple declarations of module "' + decl.name + '" have been detected');
    },

    isDependenceCircular = function(decl, path) {
        var i = 0, pathDecl;
        while(pathDecl = path[i++]) {
            if(decl === pathDecl) {
                return true;
            }
        }
        return false;
    },

    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                return fns.push(fn) === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        if(typeof process === 'object' && process.nextTick) { // nodejs
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        if(global.setImmediate) { // ie10
            return function(fn) {
                enqueueFn(fn) && global.setImmediate(callFns);
            };
        }

        if(global.postMessage && !global.opera) { // modern browsers
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__modules' + (+new Date()),
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var head = doc.getElementsByTagName('head')[0],
                createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                    };
                    head.appendChild(script);
                };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })();

if(typeof exports === 'object') {
    module.exports = create();
}
else {
    global.modules = create();
}

})(typeof window !== 'undefined' ? window : global);

modules.define(
    'y-block',
    [
        'inherit',
        'y-event-emitter',
        'y-event-manager',
        'y-block-event',
        'jquery',
        'vow',
        'bt',
        'y-extend'
    ],
    function (
        provide,
        inherit,
        YEventEmitter,
        YEventManager,
        YBlockEvent,
        $,
        vow,
        bt,
        extend
    ) {

    /**
     * @name YBlock
     * @augments YEventEmitter
     */
    var YBlock = inherit(YEventEmitter, /** @lends YBlock.prototype */ {
        /**
         * Конструктор базового блока.
         * Его следует вызывать с помощью `this.__base` в наследующих классах.
         *
         * @constructor
         * @param {jQuery} [domNode] Элемент, на котором следует инициализировать блок.
         * @param {Object} [options] Опции блока. Содержит все декларированные опции BH-шаблона блока.
         *
         * @example
         * modules.define('y-control', ['y-block'], function (provide, YBlock) {
         *     var YControl = inherit(YBlock, {
         *         __constructor: function () {
         *             this.__base.apply(this, arguments);
         *             // Дополнительные действия по инициализации
         *         }
         *     }, {
         *         getBlockName: function () {
         *             return 'y-control';
         *         }
         *     }));
         *
         *     provide(YControl);
         * });
         */
        __constructor: function (domNode, options) {
            if (domNode !== null && !(domNode instanceof $)) {
                options = domNode;
                domNode = null;
            }
            if (!domNode) {
                options = options || {};
                domNode = this._createDomElement(options);
            }

            // Если параметры не переданы, извлекаем их из DOM-ноды.
            if (!options) {
                options = this.__self._getDomNodeOptions(domNode).options || {};
            } else if (!options.__complete) {
                options = extend(options, this.__self._getDomNodeOptions(domNode).options || {});
            }

            domNode.addClass(this.__self._autoInitCssClass);

            // Сохраняем ссылку на экземпляр блока в jQuery-хранилище ноды.
            this.__self._getDomNodeDataStorage(domNode).block = this;

            this._initOptions = options;
            this._node = domNode;
            this._eventManager = new YEventManager(this);
            this._stateCache = null;
            this.__self._liveInitIfRequired();
            this._cachedViewName = null;
        },

        /**
         * Уничтожает блок. При уничтожении блок автоматически отвязывает все обработчики событий,
         * которые были привязаны к инстанции блока или привязаны внутри блока, используя метод `_bindTo()`.
         *
         * После уничтожения блока удаляет его из DOM-дерева.
         *
         * Этот метод следует перекрывать, если необходимы дополнительные действия при уничтожении блока.
         * При этом необходимо вызывать базовую реализацию деструктора с помощью `this.__base()`.
         *
         * @example
         * destruct: function () {
         *     this._cache.drop();
         *     this.__base();
         * }
         */
        destruct: function () {
            var nodeStorage;
            if (this._node) {
                nodeStorage = this.__self._getDomNodeDataStorage(this._node);
            }
            if (!nodeStorage || !nodeStorage.block) {
                throw new Error('Block `' + this.__self.getBlockName() + '` was already destroyed');
            }
            delete nodeStorage.block;

            this.__self.destructDomTree(this.getDomNode());

            this.offAll();

            this._eventManager.unbindAll();
            this._eventManager = null;

            this._node.remove();
            this._node = null;

            this._initOptions = null;
            this._stateCache = null;
        },

        /**
         * Возвращает DOM-элемент данного блока.
         *
         * @returns {jQuery}
         */
        getDomNode: function () {
            return this._node;
        },

        /**
         * Добавляет обработчик события `event` объекта `emitter`. Контекстом обработчика
         * является экземпляр данного блока. Обработчик события автоматически удалится при вызове
         * `YBlock.prototype.destruct()`.
         *
         * @protected
         * @param {jQuery|YBlock} emitter
         * @param {String} event
         * @param {Function} callback
         * @returns {YBlock}
         *
         * @example
         * var View = inherit(YBlock, {
         *     __constructor: function (model) {
         *         this.__base();
         *
         *         var hide = this._findElement('hide');
         *         this._bindTo(hide, 'click', this._onHideClick);
         *
         *         this._bindTo(model, 'change-attr', this._onAttrChange);
         *     }
         * });
         */
        _bindTo: function (emitter, event, callback) {
            this._eventManager.bindTo(emitter, event, callback);
            return this;
        },

        /**
         * Удаляет обработчик события `event` объекта `emitter`, добавленный с помощью
         * `YBlock.prototype._bindTo()`.
         *
         * @protected
         * @param {jQuery|YBlock} emitter
         * @param {String} event
         * @param {Function} callback
         * @returns {YBlock}
         */
        _unbindFrom: function (emitter, event, callback) {
            this._eventManager.unbindFrom(emitter, event, callback);
            return this;
        },

        /**
         * Исполняет обработчики события `blockEvent` блока. Первым аргументом в обработчики события будет
         * передан экземпляр класса `YBlockEvent`.
         *
         * @param {String|YBlockEvent} blockEvent Имя события или экземпляр класса `YBlockEvent`.
         * @param {Object} [data] Дополнительные данные, которые можно получить через `e.data` в обработчике.
         * @returns {YBlock}
         *
         * @example
         * var block = new YBlock();
         * block.on('click', function (e) {
         *     console.log(e.type);
         * });
         *
         * block.emit('click'); // => 'click'
         *
         * var event = new YBlockEvent('click');
         * block.emit(event); // => 'click'
         */
        emit: function (blockEvent, data) {
            if (typeof blockEvent === 'string') {
                blockEvent = new YBlockEvent(blockEvent);
            }

            blockEvent.data = data;
            blockEvent.target = this;

            this.__base(blockEvent.type, blockEvent);

            if (!blockEvent.isPropagationStopped()) {
                // Если событие блока надо распространять, кидаем специальное событие на DOM ноде блока.
                var jqEvent = $.Event(this.__self._getPropagationEventName(blockEvent.type));
                blockEvent._jqEvent = jqEvent;
                var domNode = this.getDomNode();
                if (domNode) {
                    this.getDomNode().trigger(jqEvent, blockEvent);
                }
            }

            return this;
        },

        /**
         * Возвращает имя отображения данного блока.
         *
         * @returns {String|undefined}
         */
        getView: function () {
            if (this._cachedViewName === null) {
                var cls = this.getDomNode().attr('class');
                if (cls) {
                    this._cachedViewName = cls.split(' ').shift().split('_')[1];
                } else {
                    this._cachedViewName = undefined;
                }
            }
            return this._cachedViewName;
        },

        /**
         * Устанавливает CSS-класс по имени и значению состояния.
         * Например, для блока `y-button` вызов `this._setState('pressed', 'yes')`
         * добавляет CSS-класс с именем `pressed_yes`.
         *
         * С точки зрения `BEM` похож на метод `setMod`, но не вызывает каких-либо событий.
         *
         * @protected
         * @param {String} stateName Имя состояния.
         * @param {String|Boolean} [stateVal=true] Значение.
         *                                         Если указан `false` или пустая строка, то CSS-класс удаляется.
         * @returns {YBlock}
         */
        _setState: function (stateName, stateVal) {
            if (arguments.length === 1) {
                stateVal = true;
            }
            stateVal = getStateValue(stateVal);
            var domElem = this.getDomNode();
            if (!this._stateCache) {
                this._stateCache = this._parseStateCssClasses(domElem);
            }
            var prevStateVal = this._stateCache[stateName] || false;
            if (stateVal !== prevStateVal) {
                this._stateCache[stateName] = stateVal;
                if (prevStateVal) {
                    domElem.removeClass('_' + stateName + (prevStateVal === true ? '' : '_' + prevStateVal));
                }
                if (stateVal) {
                    domElem.addClass('_' + stateName + (stateVal === true ? '' : '_' + stateVal));
                }
            }
            return this;
        },

        /**
         * Удаляет CSS-класс состояния с заданным именем.
         * Например, для блока `y-button` вызов `this._removeState('side')`
         * удалит CSS-классы с именами `side_left`, `side_right` и т.п.
         *
         * С точки зрения `BEM` похож на метод `delMod`, но не вызывает каких-либо событий.
         *
         * @protected
         * @param {String} stateName
         * @returns {YBlock}
         */
        _removeState: function (stateName) {
            return this._setState(stateName, false); // false удаляет состояние с указанным именем
        },

        /**
         * Возвращает значение состояния на основе CSS-классов блока.
         * Например, для блока `y-button`, у которого на DOM-элементе висит класс `pressed_yes`,
         * вызов `this._getState('pressed')` возвратит значение `yes`.
         *
         * С точки зрения `BEM` похож на метод `getMod`.
         *
         * @protected
         * @param {String} stateName
         * @returns {String|Boolean}
         */
        _getState: function (stateName) {
            if (!this._stateCache) {
                this._stateCache = this._parseStateCssClasses(this.getDomNode());
            }
            return this._stateCache[stateName] || false;
        },

        /**
         * Переключает значение состояния блока (полученное на основе CSS-классов) между двумя значениями.
         * Например, для блока `y-button`, у которого на DOM-элементе висит класс `pressed_yes`,
         * вызов `this._toggleState('pressed', 'yes', '')` удалит класс `pressed_yes`,
         * а повторный вызов — вернет на место.
         *
         * С точки зрения `BEM` похож на метод `toggleMod`, но не вызывает каких-либо событий.
         *
         * @protected
         * @param {String} stateName
         * @param {String|Boolean} stateVal1
         * @param {String|Boolean} stateVal2
         * @returns {YBlock}
         */
        _toggleState: function (stateName, stateVal1, stateVal2) {
            stateVal1 = getStateValue(stateVal1);
            stateVal2 = getStateValue(stateVal2);
            var currentModVal = this._getState(stateName);
            if (currentModVal === stateVal1) {
                this._setState(stateName, stateVal2);
            } else if (currentModVal === stateVal2) {
                this._setState(stateName, stateVal1);
            }
            return this;
        },

        /**
         * Устанавливает CSS-класс для элемента по имени и значению состояния.
         * Например, для элемента `text` блока `y-button` вызов
         * `this._setElementState(this._findElement('text'), 'pressed', 'yes')`
         * добавляет CSS-класс с именем `pressed_yes`.
         *
         * С точки зрения `BEM` похож на метод `setElemMod`.
         *
         * @protected
         * @param {HTMLElement|jQuery} domNode
         * @param {String} stateName Имя состояния.
         * @param {String|Boolean} [stateVal=true] Значение.
         *                                         Если указан `false` или пустая строка, то CSS-класс удаляется.
         * @returns {YBlock}
         */
        _setElementState: function (domNode, stateName, stateVal) {
            if (domNode) {
                domNode = $(domNode);
                if (arguments.length === 2) {
                    stateVal = true;
                }
                stateVal = getStateValue(stateVal);
                var parsedMods = this._parseStateCssClasses(domNode);
                var prevModVal = parsedMods[stateName];
                if (prevModVal) {
                    domNode.removeClass('_' + stateName + (prevModVal === true ? '' : '_' + prevModVal));
                }
                if (stateVal) {
                    domNode.addClass('_' + stateName + (stateVal === true ? '' : '_' + stateVal));
                }
            } else {
                throw new Error('`domNode` should be specified for `_setElementState` method.');
            }
            return this;
        },

        /**
         * Удаляет CSS-класс состояния с заданным именем для элемента.
         * Например, для элемента `text` блока `y-button` вызов
         * `this._removeElementState(this._findElement('text'), 'side')`
         * удалит CSS-классы с именами `side_left`, `side_right` и т.п.
         *
         * С точки зрения `BEM` похож на метод `delElemMod`.
         *
         * @protected
         * @param {HTMLElement|jQuery} domNode
         * @param {String} stateName
         * @returns {YBlock}
         */
        _removeElementState: function (domNode, stateName) {
            // false удаляет состояние с указанным именем
            return this._setElementState(domNode, stateName, false);
        },

        /**
         * Возвращает значение состояния на основе CSS-классов элемента.
         * Например, для элемента `text` блока `y-button`,
         * у которого на DOM-элементе висит класс `pressed_yes`, вызов
         * `this._getElementState(this._findElement('text'), 'pressed')` возвратит значение `yes`.
         *
         * С точки зрения `BEM` похож на метод `getElemMod`.
         *
         * @protected
         * @param {HTMLElement|jQuery} domNode
         * @param {String} stateName
         * @returns {String}
         */
        _getElementState: function (domNode, stateName) {
            if (domNode) {
                domNode = $(domNode);
                return this._parseStateCssClasses(domNode)[stateName] || false;
            } else {
                throw new Error('`domNode` should be specified for `_getElementState` method.');
            }
        },

        /**
         * Переключает значение состояния элемента блока (полученное на основе CSS-классов) между двумя значениями.
         * Например, для элемента `text` блока `y-button`,
         * у которого на DOM-элементе висит класс `pressed_yes`, вызов
         * `this._toggleElementState(this._findElement('text'), 'pressed', 'yes', '')`
         * удалит класс `pressed_yes`, а повторный вызов — вернет на место.
         *
         * С точки зрения `BEM` похож на метод `toggleElemMod`.
         *
         * @protected
         * @param {HTMLElement|jQuery} domNode
         * @param {String} stateName
         * @param {String} stateVal1
         * @param {String} stateVal2
         * @returns {YBlock}
         */
        _toggleElementState: function (domNode, stateName, stateVal1, stateVal2) {
            stateVal1 = getStateValue(stateVal1);
            stateVal2 = getStateValue(stateVal2);
            var currentModVal = this._getElementState(domNode, stateName);
            if (currentModVal === stateVal1) {
                this._setElementState(domNode, stateName, stateVal2);
            } else if (currentModVal === stateVal2) {
                this._setElementState(domNode, stateName, stateVal1);
            }
            return this;
        },

        /**
         * Возвращает первый элемент с указанным именем.
         *
         * @protected
         * @param {String} elementName Имя элемента.
         * @param {HTMLElement|jQuery} [parentElement] Элемент в котором необходимо произвести поиск. Если не указан,
         *                                             то используется результат `this.getDomNode()`.
         * @returns {jQuery|undefined}
         *
         * @example
         * var title = this._findElement('title');
         * title.text('Hello World');
         */
        _findElement: function (elementName, parentElement) {
            return this._findAllElements(elementName, parentElement)[0];
        },

        /**
         * Возвращает все элементы по указанному имени.
         *
         * @protected
         * @param {String} elementName Имя элемента.
         * @param {HTMLElement|jQuery} [parentElement] Элемент в котором необходимо произвести поиск. Если не указан,
         *                                             то используется результат `this.getDomNode()`.
         * @returns {jQuery[]}
         *
         * @example
         * this._findAllElements('item').forEach(function (item) {
         *     item.text('Item');
         * });
         */
        _findAllElements: function (elementName, parentElement) {
            parentElement = parentElement ? $(parentElement) : this.getDomNode();
            var view = this.getView();
            var elems = parentElement.find(
                '.' + this.__self.getBlockName() + (view ? '_' + view : '') + '__' + elementName
            );
            var result = [];
            var l = elems.length;
            for (var i = 0; i < l; i++) {
                result.push($(elems[i]));
            }
            return result;
        },

        /**
         * Возвращает все родительские элементы с заданным именем.
         *
         * @protected
         * @param {String} elementName Имя элемента.
         * @param {HTMLElement|jQuery} childElement Элемент, среди родителей которого необходимо произвести поиск.
         * @returns {jQuery[]}
         *
         * @example
         * var branches = this._findAllParentElements('branch', item);
         */
        _findAllParentElements: function (elementName, childElement) {
            if (childElement) {
                childElement = $(childElement);
                var view = this.getView();
                var elems = childElement.parents(
                    '.' + this.__self.getBlockName() + (view ? '_' + view : '') + '__' + elementName
                );
                var result = [];
                var l = elems.length;
                for (var i = 0; i < l; i++) {
                    result.push($(elems[i]));
                }
                return result;
            } else {
                throw new Error('`childElement` should be specified for `_findAllParentElements` method.');
            }
        },

        /**
         * Возвращает первый родительский элемент с заданным именем.
         *
         * @protected
         * @param {String} elementName Имя элемента.
         * @param {HTMLElement|jQuery} childElement Элемент, среди родителей которого необходимо произвести поиск.
         * @returns {jQuery|undefined}
         *
         * @example
         * var branch = this._findParentElement('branch', item);
         */
        _findParentElement: function (elementName, childElement) {
            if (childElement) {
                return this._findAllParentElements(elementName, childElement)[0];
            } else {
                throw new Error('`childElement` should be specified for `_findParentElement` method.');
            }
        },

        /**
         * Возвращает параметры, которые были переданы блоку при инициализации.
         *
         * @protected
         * @returns {Object}
         *
         * @example
         * var control = YControl.fromDomNode(
         *     $('<div class="y-control _init" onclick="return {\'y-control\':{level:5}}"></div>')
         * );
         * // control:
         * inherit(YBlock, {
         *     myMethod: function() {
         *         console.log(this._getOptions().level);
         *     }
         * }, {
         *     getBlockName: function() {
         *         return 'y-control';
         *     }
         * });
         */
        _getOptions: function () {
            return this._initOptions;
        },

        /**
         * Возвращает параметры, которые были переданы элементу блока при инициализации.
         *
         * @protected
         * @param {HTMLElement|jQuery} domNode
         * @returns {Object}
         *
         * @example
         * // HTML:
         * // <div class="y-control _init">
         * //     <div class="y-control__text" data-options="{options:{level:5}}"></div>
         * // </div>
         *
         * provide(inherit(YBlock, {
         *     __constructor: function() {
         *         this.__base.apply(this, arguments);
         *         this._textParams = this._getElementOptions(this._findElement('text'));
         *     }
         * }, { getBlockName: function() { return 'y-control'; } }));
         */
        _getElementOptions: function (domNode) {
            if (domNode) {
                domNode = $(domNode);
                var elemName = this._getElementName(domNode);
                if (elemName) {
                    return this.__self._getDomNodeOptions(domNode).options || {};
                } else {
                    throw new Error('Unable to get BEM Element name from DOM Node.');
                }
            } else {
                throw new Error('`domNode` should be specified for `_getElementOptions` method.');
            }
        },

        /**
         * Создает и возвращает DOM-элемент на основе BH-опций.
         * Создание нового элемента осуществляется с помощью применения BH-шаблонов.
         *
         * @protected
         * @param {Object} params
         * @returns {jQuery}
         */
        _createDomElement: function (params) {
            return $(bt.apply(extend({}, params, {block: this.__self.getBlockName()})));
        },

        /**
         * Разбирает состояния DOM-элемента, возвращает объект вида `{stateName: stateVal, ...}`.
         *
         * @param {jQuery} domNode
         * @returns {Object}
         */
        _parseStateCssClasses: function (domNode) {
            var result = {};
            var classAttr = domNode.attr('class');
            if (classAttr) {
                var classNames = classAttr.split(' ');
                for (var i = classNames.length - 1; i >= 0; i--) {
                    if (classNames[i].charAt(0) === '_') {
                        var classNameParts = classNames[i].substr(1).split('_');
                        if (classNameParts.length === 2) {
                            result[classNameParts[0]] = classNameParts[1];
                        } else {
                            result[classNameParts[0]] = true;
                        }
                    }
                }
            }
            return result;
        },

        /**
         * Возвращает имя элемента блока на основе DOM-элемента.
         *
         * @param {jQuery} domNode
         * @returns {String|null}
         */
        _getElementName: function (domNode) {
            var view = this.getView();
            var match = (domNode[0].className || '').match(
                new RegExp(this.__self.getBlockName() + (view ? '_' + view : '') + '__([a-zA-Z0-9-]+)(?:\\s|$)')
            );
            return match ? match[1] : null;
        }
    }, {
        /**
         * Возвращает имя блока.
         * Этот метод следует перекрывать при создании новых блоков.
         *
         * @static
         * @returns {String|null}
         *
         * @example
         * provide(inherit(YBlock, {}, {
         *     getBlockName: function() {
         *         return 'my-button';
         *     }
         * });
         */
        getBlockName: function () {
            return 'y-block';
        },

        /**
         * Возвращает инстанцию блока для переданного DOM-элемента.
         *
         * @static
         * @param {HTMLElement|jQuery} domNode
         * @param {Object} [params]
         * @returns {YBlock}
         *
         * @example
         * var page = YPage.fromDomNode(document.body);
         */
        fromDomNode: function (domNode, params) {
            if (!domNode) {
                throw new Error('`domNode` should be specified for `findDomNode` method');
            }
            var blockName = this.getBlockName();
            domNode = $(domNode);
            if (!domNode.length) {
                throw new Error('Cannot initialize "' + blockName + '" from empty jQuery object');
            }
            var instance = this._getDomNodeDataStorage(domNode).block;
            if (!instance) {
                if (params === undefined) {
                    params = this._getDomNodeOptions(domNode).options || {};
                }
                params.__complete = true;
                var BlockClass = this;
                instance = new BlockClass(domNode, params);
            }
            return instance;
        },

        /**
         * Инициализирует блок, если это необходимо.
         * Возвращает `null` для блоков с отложенной (`live`) инициализацией и инстанцию блока для прочих.
         *
         * @static
         * @param {HTMLElement|jQuery} domNode
         * @param {Object} params
         * @returns {YBlock|null}
         */
        initOnDomNode: function (domNode, params) {
            var initBlock;
            if (this._liveInit) {
                this._liveInitIfRequired();
                initBlock = false;
                if (this._instantInitHandlers) {
                    for (var i = 0, l = this._instantInitHandlers.length; i < l; i++) {
                        if (this._instantInitHandlers[i](params, domNode)) {
                            initBlock = true;
                            break;
                        }
                    }
                }
            } else {
                initBlock = true;
            }
            if (initBlock) {
                domNode = $(domNode);
                return this.fromDomNode(domNode, params);
            } else {
                return null;
            }
        },

        /**
         * Запускает `live`-инициализацию, если она определена для блока и не была выполнена ранее.
         *
         * @static
         * @protected
         */
        _liveInitIfRequired: function () {
            var blockName = this.getBlockName();
            if (this._liveInit && (!this._liveInitialized || !this._liveInitialized[blockName])) {
                this._liveInit();
                (this._liveInitialized = this._liveInitialized || {})[blockName] = true;
            }
        },

        /**
         * Если для блока требуется отложенная (`live`) инициализация,
         * следует перекрыть это свойство статическим методом.
         *
         * Этот выполняется лишь однажды, при инициализации первого блока на странице.
         *
         * В рамках `_liveInit` можно пользоваться методами `_liveBind` и `_liveBindToElement` для того,
         * чтобы глобально слушать события на блоке и элементе соответственно.
         *
         * @static
         * @protected
         * @type {Function|null}
         *
         * @example
         * var MyBlock = inherit(YBlock, {}, {
         *     _liveInit: function () {
         *         this._liveBind('click', function(e) {
         *             this._setState('clicked', 'yes');
         *         });
         *         this._liveBindToElement('title', 'click', function(e) {
         *             this._setElementState($(e.currentTarget), 'clicked', 'yes');
         *         });
         *     }
         * });
         */
        _liveInit: null,

        /**
         * Отменяет отложенную инициализацию блока по определенному условию.
         * Условием служит функция, которая принимает параметры и DOM-элемент блока. Если функция возвращает true,
         * то блок инициализируется сразу.
         * Рекомендуется для таких случаев передавать нужные параметры, которые сигнализируют о том,
         * что блок необходимо инициализировать блок сразу.
         *
         * @static
         * @protected
         * @param {Function<Object,jQuery>} condition
         */
        _instantInitIf: function (condition) {
            if (!this._instantInitHandlers) {
                this._instantInitHandlers = [];
            }
            this._instantInitHandlers.push(condition);
        },

        /**
         * Глобально слушает событие на блоке. Используется при отложенной инициализации.
         * Обработчик события выполнится в контексте инстанции блока.
         *
         * @static
         * @protected
         * @param {String} eventName
         * @param {Function} handler
         */
        _liveBind: function (eventName, handler) {
            var blockClass = this;
            this._getLiveEventsScopeElement().on(eventName, '[data-block="' + this.getBlockName() + '"]', function (e) {
                handler.call(blockClass.fromDomNode(e.currentTarget), e);
            });
        },

        /**
         * Глобально слушает событие на элементе блока. Используется при отложенной инициализации.
         * Обработчик события выполнится в контексте инстанции блока.
         *
         * @static
         * @protected
         * @param {String} elementName
         * @param {String} eventName
         * @param {Function} handler
         */
        _liveBindToElement: function (elementName, eventName, handler) {
            var blockClass = this;
            var blockName = this.getBlockName();
            var selectors = [
                '[class^="' + blockName + '_"][class$="__' + elementName + '"]',
                '[class^="' + blockName + '_"][class*="__' + elementName + ' "]'
            ];
            this._getLiveEventsScopeElement().on(
                eventName,
                selectors.join(', '),
                function (e) {
                    handler.call(
                        blockClass.fromDomNode($(e.currentTarget).closest('[data-block="' + blockName + '"]')),
                        e
                    );
                }
            );
        },

        /**
         * Возвращает элемент, на котором будут слушаться глобальные (`live`) события.
         *
         * @static
         * @protected
         * @returns {jQuery}
         */
        _getLiveEventsScopeElement: function () {
            return $(document.body);
        },

        /**
         * Возвращает первую инстанцию блока внутри переданного фрагмента DOM-дерева.
         *
         * @static
         * @param {jQuery|HTMLElement|YBlock} parentElement
         * @returns {YBlock|undefined}
         *
         * @example
         * var input = YInput.find(document.body);
         * if (input) {
         *     input.setValue('Hello World');
         * } else {
         *     throw new Error('Input wasn\'t found in "y-control".');
         * }
         */
        find: function (parentElement) {
            return this.findAll(parentElement)[0];
        },

        /**
         * Возвращает все инстанции блока внутри переданного фрагмента DOM-дерева.
         *
         * @static
         * @param {jQuery|HTMLElement|YBlock} parentElement
         * @returns {YBlock[]}
         *
         * @example
         * var inputs = YInput.findAll(document.body);
         * inputs.forEach(function (input) {
         *     input.setValue("Input here");
         * });
         */
        findAll: function (parentElement) {
            if (!parentElement) {
                throw new Error('`parentElement` should be specified for `findAll` method');
            }

            parentElement = this._getDomNodeFrom(parentElement);

            var domNodes = parentElement.find('[data-block=' + this.getBlockName() + ']');
            if (domNodes.length) {
                var result = [];
                var l = domNodes.length;
                for (var i = 0; i < l; i++) {
                    var domNode = $(domNodes[i]);
                    result.push(this.fromDomNode(domNode));
                }
                return result;
            } else {
                return [];
            }
        },

        /**
         * Инициализирует все блоки на переданном фрагменте DOM-дерева.
         *
         * @static
         * @param {HTMLElement|jQuery|YBlock} domNode
         * @returns {Promise}
         *
         * @example
         * YBlock.initDomTree(document.body).done(function () {
         *     YButton.getEmitter(document.body).on('click', function () {
         *         alert("Button is clicked");
         *     });
         * });
         */
        initDomTree: function (domNode) {
            if (!domNode) {
                throw new Error('`domNode` should be specified for `initDomTree` method');
            }
            domNode = this._getDomNodeFrom(domNode);
            var selector = '.' + this._autoInitCssClass;
            var classesToLoad = {};
            var nodes = domNode.find(selector);

            if (domNode.is(selector)) {
                Array.prototype.unshift.call(nodes, domNode);
            }
            var tasks = [];

            var l = nodes.length;
            for (var i = 0; i < l; i++) {
                var node = $(nodes[i]);
                var params = this._getDomNodeOptions(node) || {};

                var blockName = node.attr('data-block');
                if (blockName) {
                    tasks.push({
                        node: node,
                        className: blockName,
                        options: params.options || {},
                        isMixin: false
                    });
                    classesToLoad[blockName] = null;
                    var mixins = params.mixins;
                    if (mixins) {
                        for (var j = 0, jl = mixins.length; j < jl; j++) {
                            var mixinData = mixins[j];
                            if (mixinData && mixinData.name) {
                                tasks.push({
                                    node: node,
                                    className: mixinData.name,
                                    blockName: blockName,
                                    options: mixinData,
                                    isMixin: true
                                });
                                classesToLoad[mixinData.name] = null;
                            }
                        }
                    }
                }
            }

            function loadModule(moduleName) {
                var deferred = vow.defer();
                if (modules.isDefined(moduleName)) {
                    modules.require([moduleName], function (moduleClass) {
                        classesToLoad[moduleName] = moduleClass;
                        deferred.resolve();
                    });
                    return deferred.promise();
                } else {
                    return null;
                }
            }

            return vow.fulfill().then(function () {
                return vow.all(Object.keys(classesToLoad).map(function (className) {
                    return loadModule(className);
                })).then(function () {
                    var l = tasks.length;
                    for (var i = 0; i < l; i++) {
                        var task = tasks[i];
                        var node = task.node;
                        var className = task.className;
                        var options = task.options;
                        var classDef = classesToLoad[className];
                        if (classDef) {
                            try {
                                if (task.isMixin) {
                                    var blockClass = classesToLoad[task.blockName];
                                    if (blockClass) {
                                        classDef.fromBlock(blockClass.fromDomNode(node), options);
                                    }
                                } else {
                                    classDef.initOnDomNode(node, options);
                                }
                            } catch (e) {
                                e.message = className + ' init error: ' + e.message;
                                throw e;
                            }
                        }
                    }
                });
            });
        },

        /**
         * Уничтожает все инстанции блоков на переданном фрагменте DOM-дерева.
         *
         * @static
         * @param {HTMLElement|jQuery|YBlock} domNode
         */
        destructDomTree: function (domNode) {
            if (!domNode) {
                throw new Error('`domNode` should be specified for `destructDomTree` method');
            }
            domNode = this._getDomNodeFrom(domNode);

            var selector = '.' + this._autoInitCssClass + ',.' + this._delegateEventsCssClass;
            var nodes = domNode.find(selector);

            if (domNode.is(selector)) {
                Array.prototype.unshift.call(nodes, domNode);
            }

            for (var i = 0; i < nodes.length; i++) {
                var node = $(nodes[i]);
                var nodeStorage = this._getDomNodeDataStorage(node, true);
                if (nodeStorage) {
                    if (nodeStorage.block) {
                        nodeStorage.block.destruct();
                    }
                    var blockEvents = nodeStorage.blockEvents;
                    var blockName;
                    for (blockName in blockEvents) {
                        if (blockEvents.hasOwnProperty(blockName)) {
                            blockEvents[blockName].offAll();
                        }
                    }
                    nodeStorage.blockEvents = {};
                }
            }
        },

        /**
         * Возвращает эмиттер событий блока для переданного DOM-элемента.
         * На полученном эмиттере можно слушать блочные события, которые будут всплывать до этого DOM-элемента.
         *
         * @static
         * @param {HTMLElement|jQuery|YBlock} domNode
         * @returns {YEventEmitter}
         *
         * @example
         * YButton.getEmitter(document.body).on('click', function () {
         *     alert('Button is clicked');
         * });
         */
        getEmitter: function (domNode) {
            domNode = this._getDomNodeFrom(domNode);

            var nodeStorage = this._getDomNodeDataStorage(domNode);
            var blockName = this.getBlockName();
            var emitter = nodeStorage.blockEvents[blockName];

            if (!emitter) {
                domNode.addClass(this._delegateEventsCssClass);
                emitter = new YBlockEventEmitter(this, domNode);
                nodeStorage.blockEvents[blockName] = emitter;
            }

            return emitter;
        },

        /**
         * Возвращает jQuery DOM-элемент используя HTMLElement, инстанцию блока или другой jQuery-элемент.
         *
         * @static
         * @protected
         * @param {jQuery|HTMLElement|YBlock} domNode
         * @returns {YBlock}
         */
        _getDomNodeFrom: function (domNode) {
            if (domNode) {
                if (domNode instanceof YBlock) {
                    domNode = domNode.getDomNode();
                }
                domNode = $(domNode);
            } else {
                throw new Error('jQuery element, DOM Element or YBlock instance should be specified');
            }
            return domNode;
        },

        /**
         * Возвращает опции блока или элемента на указанном DOM-элементе.
         *
         * @static
         * @param {jQuery} domNode
         */
        _getDomNodeOptions: function (domNode) {
            var options = domNode.attr('data-options');
            return options ? JSON.parse(options) : {};
        },

        /**
         * Возвращает хранилище данных для DOM-элемента.
         *
         * @static
         * @param {jQuery} domNode
         * @param {Boolean} [skipCreating]
         * @returns {Object}
         */
        _getDomNodeDataStorage: function (domNode, skipCreating) {
            var data = domNode.data('y-block');
            if (!data && !skipCreating) {
                data = {
                    blockEvents: {}
                };
                domNode.data('y-block', data);
            }
            return data;
        },

        /**
         * Возвращает специальное имя события, которое используется для распространения события блока по DOM дереву.
         *
         * @static
         * @param {String} eventName Имя события блока.
         * @returns {String}
         */
        _getPropagationEventName: function (eventName) {
            return 'y-block/' + this.getBlockName() + '/' + eventName;
        },

        /**
         * CSS-класс для автоматической инициализации.
         *
         * @static
         * @type {String}
         */
        _autoInitCssClass: '_init',

        /**
         * CSS-класс для делегирования событий.
         *
         * @static
         * @type {String}
         */
        _delegateEventsCssClass: '_live-events'
    });

    /**
     * Эмиттер, используемый для делегирования событий блока.
     *
     * Делегирование событий блока происходит следующим образом:
     * - Когда блок инициирует событие `eventName`, он также инциирует событие `y-block/blockName/eventName`
     *   на DOM ноде блока. Это событие распространяется вверх по DOM дереву.
     *
     * - При добавлении нового события в `YBlockEventEmitter`, для переданной DOM ноды добавляется обработчик события
     *   `y-block/blockName/eventName`, который инициирует в эмиттере событие `eventName`.
     *
     * - При удалении события из `YBlockEventEmitter`, соответствующий обработчик удаляется из DOM ноды. Тем самым
     *   прекращается делегирование.
     */
    var YBlockEventEmitter = inherit(YEventEmitter, {
        /**
         * Создает эмиттер событий, который позволяет слушать события экземпляров блока `blockClass`
         * на DOM ноде `domNode`.
         *
         * @param {Function} blockClass
         * @param {jQuery} domNode
         */
        __constructor: function (blockClass, domNode) {
            this._blockClass = blockClass;
            this._domNode = domNode;
            this._listeners = {};
        },

        _onAddEvent: function (eventName) {
            var _this = this;
            function listener(jqEvent, blockEvent) {
                _this.emit(eventName, blockEvent);
                if (blockEvent.isPropagationStopped()) {
                    jqEvent.stopPropagation();
                }
            }

            var propagationEventName = this._blockClass._getPropagationEventName(eventName);
            this._domNode.on(propagationEventName, listener);
            this._listeners[eventName] = listener;
        },

        _onRemoveEvent: function (eventName) {
            var propagationEventName = this._blockClass._getPropagationEventName(eventName);
            this._domNode.off(propagationEventName, this._listeners[eventName]);
            delete this._listeners[eventName];
        }
    });

    function getStateValue(stateVal) {
        if (typeof stateVal === 'string') {
            if (stateVal === '') {
                stateVal = false;
            }
        } else {
            if (typeof stateVal === 'number') {
                stateVal = String(stateVal);
            } else {
                stateVal = Boolean(stateVal);
            }
        }
        return stateVal;
    }

    provide(YBlock);
});

/**
 * @module inherit
 * @version 2.2.7
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @description This module provides some syntax sugar for "class" declarations, constructors, mixins, "super" calls and static members.
 */

(function(global) {

var noop = function() {},
    hasOwnProperty = Object.prototype.hasOwnProperty,
    objCreate = Object.create || function(ptp) {
        var inheritance = function() {};
        inheritance.prototype = ptp;
        return new inheritance();
    },
    objKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            hasOwnProperty.call(obj, i) && res.push(i);
        }
        return res;
    },
    extend = function(o1, o2) {
        for(var i in o2) {
            hasOwnProperty.call(o2, i) && (o1[i] = o2[i]);
        }

        return o1;
    },
    extendStatic = Object.setPrototypeOf || extend,
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    isFunction = function(obj) {
        return toStr.call(obj) === '[object Function]';
    },
    needCheckProps = true,
    testPropObj = { toString : '' };

for(var i in testPropObj) { // It's a pity ie hasn't toString, valueOf in for
    testPropObj.hasOwnProperty(i) && (needCheckProps = false);
}

var specProps = needCheckProps? ['toString', 'valueOf'] : null;

function getPropList(obj) {
    var res = objKeys(obj);
    if(needCheckProps) {
        var specProp, i = 0;
        while(specProp = specProps[i++]) {
            obj.hasOwnProperty(specProp) && res.push(specProp);
        }
    }

    return res;
}

function override(base, res, add) {
    var addList = getPropList(add),
        j = 0, len = addList.length,
        name, prop;
    while(j < len) {
        if((name = addList[j++]) === '__self') {
            continue;
        }
        prop = add[name];
        if(isFunction(prop) &&
                (!prop.prototype || !prop.prototype.__self) && // check to prevent wrapping of "class" functions
                (prop.toString().indexOf('.__base') > -1)) {
            res[name] = (function(name, prop) {
                var baseMethod = base[name]?
                        base[name] :
                        name === '__constructor'? // case of inheritance from plain function
                            res.__self.__parent :
                            noop,
                    result = function() {
                        var baseSaved = this.__base;

                        this.__base = result.__base;
                        var res = prop.apply(this, arguments);
                        this.__base = baseSaved;

                        return res;
                    };
                result.__base = baseMethod;

                return result;
            })(name, prop);
        } else {
            res[name] = prop;
        }
    }
}

function applyMixins(mixins, res) {
    var i = 1, mixin;
    while(mixin = mixins[i++]) {
        res?
            isFunction(mixin)?
                inherit.self(res, mixin.prototype, mixin) :
                inherit.self(res, mixin) :
            res = isFunction(mixin)?
                inherit(mixins[0], mixin.prototype, mixin) :
                inherit(mixins[0], mixin);
    }
    return res || mixins[0];
}

/**
* Creates class
* @exports
* @param {Function|Array} [baseClass|baseClassAndMixins] class (or class and mixins) to inherit from
* @param {Object} prototypeFields
* @param {Object} [staticFields]
* @returns {Function} class
*/
function inherit() {
    var args = arguments,
        withMixins = isArray(args[0]),
        hasBase = withMixins || isFunction(args[0]),
        base = hasBase? withMixins? applyMixins(args[0]) : args[0] : noop,
        props = args[hasBase? 1 : 0] || {},
        staticProps = args[hasBase? 2 : 1],
        res = props.__constructor || (hasBase && base.prototype && base.prototype.__constructor)?
            function() {
                return this.__constructor.apply(this, arguments);
            } :
            hasBase?
                function() {
                    return base.apply(this, arguments);
                } :
                function() {};

    if(!hasBase) {
        res.prototype = props;
        res.prototype.__self = res.prototype.constructor = res;
        return extend(res, staticProps);
    }

    extendStatic(res, base);

    res.__parent = base;

    var basePtp = base.prototype,
        resPtp = res.prototype = objCreate(basePtp);

    resPtp.__self = resPtp.constructor = res;

    props && override(basePtp, resPtp, props);
    staticProps && override(base, res, staticProps);

    return res;
}

inherit.self = function() {
    var args = arguments,
        withMixins = isArray(args[0]),
        base = withMixins? applyMixins(args[0], args[0][0]) : args[0],
        props = args[1],
        staticProps = args[2],
        basePtp = base.prototype;

    props && override(basePtp, basePtp, props);
    staticProps && override(base, base, staticProps);

    return base;
};

var defineAsGlobal = true;
/* istanbul ignore next */
if(typeof exports === 'object') {
    module.exports = inherit;
    defineAsGlobal = false;
}
/* istanbul ignore next */
if(typeof modules === 'object' && typeof modules.define === 'function') {
    modules.define('inherit', function(provide) {
        provide(inherit);
    });
    defineAsGlobal = false;
}
/* istanbul ignore next */
if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = inherit;
    });
    defineAsGlobal = false;
}
/* istanbul ignore next */
defineAsGlobal && (global.inherit = inherit);

})(this);

modules.define(
    'y-event-emitter',
    ['inherit'],
    function (provide, inherit) {

    var slice = Array.prototype.slice;

    /**
     * @name YEventEmitter
     */
    var YEventEmitter = inherit({
        /**
         * Добавляет обработчик события.
         *
         * @param {String} event
         * @param {Function} callback
         * @param {Object} [context]
         * @returns {YEventEmitter}
         */
        on: function (event, callback, context) {
            if (typeof callback !== 'function') {
                throw new TypeError('callback must be a function');
            }

            if (!this._events) {
                this._events = {};
            }

            var listener = {
                callback: callback,
                context: context
            };

            var listeners = this._events[event];
            if (listeners) {
                listeners.push(listener);
            } else {
                this._events[event] = [listener];
                this._onAddEvent(event);
            }

            return this;
        },

        /**
         * Добавляет обработчик события, который исполнится только 1 раз, затем удалится.
         *
         * @param {String} event
         * @param {Function} callback
         * @param {Object} [context]
         * @returns {YEventEmitter}
         */
        once: function (event, callback, context) {
            if (typeof callback !== 'function') {
                throw new TypeError('callback must be a function');
            }

            var _this = this;

            function once() {
                _this.off(event, once, context);
                callback.apply(context, arguments);
            }

            // Сохраняем ссылку на оригинальный колбэк. Благодаря этому можно удалить колбэк `once`,
            // используя оригинальный колбэк в методе `off()`.
            once._callback = callback;

            this.on(event, once, context);
            return this;
        },

        /**
         * Удаляет обработчик события.
         *
         * @param {String} event
         * @param {Function} callback
         * @param {Object} [context]
         * @returns {YEventEmitter}
         */
        off: function (event, callback, context) {
            if (typeof callback !== 'function') {
                throw new TypeError('callback must be a function');
            }

            if (!this._events) {
                return this;
            }

            var listeners = this._events[event];
            if (!listeners) {
                return this;
            }

            var len = listeners.length;
            for (var i = 0; i < len; i++) {
                var listener = listeners[i];
                var cb = listener.callback;
                if ((cb === callback || cb._callback === callback) && listener.context === context) {
                    if (len === 1) {
                        delete this._events[event];
                        this._onRemoveEvent(event);
                    } else {
                        listeners.splice(i, 1);
                    }
                    break;
                }
            }

            return this;
        },

        /**
         * Удаляет все обработчики всех событий или все обработчики переданного события `event`.
         *
         * @param {String} [event]
         * @returns {YEventEmitter}
         */
        offAll: function (event) {
            if (this._events) {
                if (event) {
                    if (this._events[event]) {
                        delete this._events[event];
                        this._onRemoveEvent(event);
                    }
                } else {
                    for (event in this._events) {
                        if (this._events.hasOwnProperty(event)) {
                            this._onRemoveEvent(event);
                        }
                    }
                    delete this._events;
                }
            }
            return this;
        },

        /**
         * Исполняет все обработчики события `event`.
         *
         * @param {String} event
         * @param {...*} [args] Аргументы, которые будут переданы в обработчики события.
         * @returns {YEventEmitter}
         */
        emit: function (event) {
            if (!this._events) {
                return this;
            }

            var listeners = this._events[event];
            if (!listeners) {
                return this;
            }

            // Копируем массив обработчиков, чтобы добавление/удаление обработчиков внутри колбэков не оказывало
            // влияния в цикле.
            var listenersCopy = listeners.slice(0);
            var len = listenersCopy.length;
            var listener;
            var i = -1;

            switch (arguments.length) {
                // Оптимизируем наиболее частые случаи.
                case 1:
                    while (++i < len) {
                        listener = listenersCopy[i];
                        listener.callback.call(listener.context);
                    }
                    break;
                case 2:
                    while (++i < len) {
                        listener = listenersCopy[i];
                        listener.callback.call(listener.context, arguments[1]);
                    }
                    break;
                case 3:
                    while (++i < len) {
                        listener = listenersCopy[i];
                        listener.callback.call(listener.context, arguments[1], arguments[2]);
                    }
                    break;
                default:
                    var args = slice.call(arguments, 1);
                    while (++i < len) {
                        listener = listenersCopy[i];
                        listener.callback.apply(listener.context, args);
                    }
            }

            return this;
        },

        /**
         * Вызывается когда было добавлено новое событие.
         *
         * @protected
         * @param {String} event
         */
        _onAddEvent: function () {},

        /**
         * Вызывается когда все обработчики события были удалены.
         *
         * @protected
         * @param {String} event
         */
        _onRemoveEvent: function () {}
    });

    provide(YEventEmitter);
});

modules.define(
    'y-event-manager',
    [
        'inherit',
        'y-event-emitter',
        'jquery'
    ],
    function (
        provide,
        inherit,
        YEventEmitter,
        $
    ) {

    /**
     * Адаптер для YEventEmitter, jQuery. Позволяет привязывать обработчики к разным эмиттерам событий
     * и отвязывать их, используя вызов одной функции. Менеджер всегда привязан к какому-либо объекту, который
     * является контекстом для всех обработчиков.
     *
     * Полезен, когда нужно отвязать все обработчики сразу. Например, при уничтожении объекта.
     *
     * @example
     * function UserView(model, el) {
     *     this._eventManager = new YEventManager(this);
     *
     *     // Привязываем обработчик к YEventEmitter
     *     this._eventManager.bindTo(model, 'change-name', this._changeName);
     *
     *     // Привязываем обработчик к jQuery объекту
     *     var hideEl = el.find('.hide');
     *     this._eventManager.bindTo(hideEl, 'click', this._hide);
     * }
     *
     * UserView.prototype.destruct = function () {
     *     // Удаляем все обработчики
     *     this._eventManager.unbindAll();
     * };
     *
     * UserView.prototype._changeName = function () {};
     *
     * UserView.prototype._hide = function () {};
     */
    var YEventManager = inherit({
        /**
         * Создает менджер событий для переданного объекта.
         *
         * @param {Object} owner Контекст для всех обработчиков событий.
         */
        __constructor: function (owner) {
            this._owner = owner;
            this._listeners = [];
        },

        /**
         * Привязывает обработчик к переданному эмиттеру событий.
         *
         * @param {YEventEmitter|jQuery} emitter
         * @param {String} event
         * @param {Function} callback
         * @returns {YEventManager}
         */
        bindTo: function (emitter, event, callback) {
            if (emitter instanceof YEventEmitter) {
                this._listeners.push({
                    type: 'islets',
                    emitter: emitter.on(event, callback, this._owner),
                    event: event,
                    callback: callback
                });
            } else if (emitter instanceof $) {
                var proxy = callback.bind(this._owner);
                this._listeners.push({
                    type: 'jquery',
                    emitter: emitter.on(event, proxy),
                    event: event,
                    callback: callback,
                    proxy: proxy
                });
            } else {
                throw new Error('Unsupported emitter type');
            }
            return this;
        },

        /**
         * Отвязывает обработчик от переданного эмиттера событий.
         *
         * @param {YEventEmitter|jQuery} emitter
         * @param {String} event
         * @param {Function} callback
         * @returns {YEventManager}
         */
        unbindFrom: function (emitter, event, callback) {
            for (var i = 0; i < this._listeners.length; i++) {
                var listener = this._listeners[i];
                if (listener.emitter === emitter &&
                    listener.event === event &&
                    listener.callback === callback
                ) {
                    this._unbind(listener);
                    this._listeners.splice(i, 1);
                    break;
                }
            }
            return this;
        },

        /**
         * Отвязывает все обработчики от всех эмиттеров событий.
         *
         * @returns {YEventManager}
         */
        unbindAll: function () {
            while (this._listeners.length) {
                var listener = this._listeners.pop();
                this._unbind(listener);
            }
            return this;
        },

        /**
         * Отвязывает обработчик события.
         *
         * @param {Object} listener
         */
        _unbind: function (listener) {
            switch (listener.type) {
                case 'islets':
                    listener.emitter.off(listener.event, listener.callback, this._owner);
                    break;
                case 'jquery':
                    listener.emitter.off(listener.event, listener.proxy);
            }
        }
    });

    provide(YEventManager);
});

/**
 * Загружает (если нет на странице) и предоставляет jQuery.
 */

/* global jQuery */
modules.define(
    'jquery',
    [
        'y-load-script',
        'jquery-config'
    ],
    function (
        provide,
        loadScript,
        config
    ) {

    function doProvide() {
        provide(jQuery.noConflict(true));
    }

    if (typeof jQuery !== 'undefined') {
        doProvide();
    } else {
        loadScript(config.url, doProvide);
    }
});

/**
 * Загружает js-файлы добавляя тэг <script> в DOM.
 */
modules.define('y-load-script', function (provide) {
    var loading = {};
    var loaded = {};
    var head = document.getElementsByTagName('head')[0];

    /**
     * @param {String} path
     */
    function onLoad(path) {
        loaded[path] = true;
        var cbs = loading[path];
        delete loading[path];
        cbs.forEach(function (cb) {
            cb();
        });
    }

    /**
     * Загружает js-файл по переданному пути `path` и вызывает
     * колбэк `cb` по окончании загрузки.
     *
     * @name loadScript
     * @param {String} path
     * @param {Function} cb
     */
    provide(function (path, cb) {
        if (loaded[path]) {
            cb();
            return;
        }

        if (loading[path]) {
            loading[path].push(cb);
            return;
        }

        loading[path] = [cb];

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        // Добавляем `http:` к `//` если страница была открыта, используя `file://`-протокол.
        // Полезно для тестирования через PhantomJS, локальной отладки с внешними скриптами.
        script.src = (location.protocol === 'file:' && path.indexOf('//') === 0 ? 'http:' : '') + path;

        if (script.onreadystatechange === null) {
            script.onreadystatechange = function () {
                var readyState = this.readyState;
                if (readyState === 'loaded' || readyState === 'complete') {
                    script.onreadystatechange = null;
                    onLoad(path);
                }
            };
        } else {
            script.onload = script.onerror = function () {
                script.onload = script.onerror = null;
                onLoad(path);
            };
        }

        head.insertBefore(script, head.lastChild);
    });
});

modules.define('jquery-config', function (provide) {
    provide({
        url: 'jquery.min.js'
    });
});

modules.define(
    'y-block-event',
    [
        'inherit'
    ],
    function (
        provide,
        inherit
    ) {

    /**
     * Класс, представляющий событие блока.
     */
    var YBlockEvent = inherit({
        /**
         * @param {String} type Тип события.
         * @param {Boolean} [isPropagationStopped=false] Запрещает распространение события.
         * @param {Boolean} [isDefaultPrevented=false] Запрещает действие по умолчанию.
         */
        __constructor: function (type, isPropagationStopped, isDefaultPrevented) {
            this.type = type;
            this._isPropagationStopped = Boolean(isPropagationStopped);
            this._isDefaultPrevented = Boolean(isDefaultPrevented);
        },

        /**
         * Определяет, прекращено ли распространение события.
         *
         * @returns {Boolean}
         */
        isPropagationStopped: function () {
            return this._isPropagationStopped;
        },

        /**
         * Проверяет, отменена ли реакция по умолчанию на событие.
         *
         * @returns {Boolean}
         */
        isDefaultPrevented: function () {
            return this._isDefaultPrevented;
        },

        /**
         * Прекращает распространение события.
         */
        stopPropagation: function () {
            this._isPropagationStopped = true;
        },

        /**
         * Отменяет реакцию по умолчанию на событие.
         */
        preventDefault: function () {
            this._isDefaultPrevented = true;
        }
    });

    provide(YBlockEvent);
});

/**
 * @module vow
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @version 0.4.20
 * @license
 * Dual licensed under the MIT and GPL licenses:
 *   * http://www.opensource.org/licenses/mit-license.php
 *   * http://www.gnu.org/licenses/gpl.html
 */

(function(global) {

var undef,
    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                fns.push(fn);
                return fns.length === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        var MutationObserver = global.MutationObserver || global.WebKitMutationObserver; // modern browsers
        if(MutationObserver) {
            var num = 1,
                node = document.createTextNode('');

            new MutationObserver(callFns).observe(node, { characterData : true });

            return function(fn) {
                enqueueFn(fn) && (node.data = (num *= -1));
            };
        }

        if(typeof process === 'object' && process.nextTick) {
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        if(typeof setImmediate === 'function') {
            return function(fn) {
                enqueueFn(fn) && setImmediate(callFns);
            };
        }

        if(global.postMessage) {
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__promise' + Math.random() + '_' +new Date,
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                };
                (doc.documentElement || doc.body).appendChild(script);
            };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })(),
    throwException = function(e) {
        nextTick(function() {
            throw e;
        });
    },
    isFunction = function(obj) {
        return typeof obj === 'function';
    },
    isObject = function(obj) {
        return obj !== null && typeof obj === 'object';
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    getArrayKeys = function(arr) {
        var res = [],
            i = 0, len = arr.length;
        while(i < len) {
            res.push(i++);
        }
        return res;
    },
    getObjectKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            obj.hasOwnProperty(i) && res.push(i);
        }
        return res;
    },
    defineCustomErrorType = function(name) {
        var res = function(message) {
            this.name = name;
            this.message = message;
        };

        res.prototype = new Error();

        return res;
    },
    wrapOnFulfilled = function(onFulfilled, idx) {
        return function(val) {
            onFulfilled.call(this, val, idx);
        };
    },
    emitUnhandledRejection = global.PromiseRejectionEvent?
        function(reason, promise) {
            new global.PromiseRejectionEvent(
                'unhandledrejection',
                {
                    promise : promise,
                    reason : reason
                });
        } :
        typeof process === 'object' && process.emit?
            function(reason, promise) {
                process.emit('unhandledRejection', reason, promise);
            } :
            function() {};

/**
 * @class Deferred
 * @exports vow:Deferred
 * @description
 * The `Deferred` class is used to encapsulate newly-created promise object along with functions that resolve, reject or notify it.
 */

/**
 * @constructor
 * @description
 * You can use `vow.defer()` instead of using this constructor.
 *
 * `new vow.Deferred()` gives the same result as `vow.defer()`.
 */
var Deferred = function() {
    this._promise = new Promise();
};

Deferred.prototype = /** @lends Deferred.prototype */{
    /**
     * Returns the corresponding promise.
     *
     * @returns {vow:Promise}
     */
    promise : function() {
        return this._promise;
    },

    /**
     * Resolves the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.then(function(value) {
     *     // value is "'success'" here
     * });
     *
     * defer.resolve('success');
     * ```
     */
    resolve : function(value) {
        this._promise.isResolved() || this._promise._resolve(value);
    },

    /**
     * Rejects the corresponding promise with the given `reason`.
     *
     * @param {*} reason
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.fail(function(reason) {
     *     // reason is "'something is wrong'" here
     * });
     *
     * defer.reject('something is wrong');
     * ```
     */
    reject : function(reason) {
        if(this._promise.isResolved()) {
            return;
        }

        if(vow.isPromise(reason)) {
            reason = reason.then(function(val) {
                var defer = vow.defer();
                defer.reject(val);
                return defer.promise();
            });
            this._promise._resolve(reason);
        }
        else {
            this._promise._reject(reason);
        }
    },

    /**
     * Notifies the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.progress(function(value) {
     *     // value is "'20%'", "'40%'" here
     * });
     *
     * defer.notify('20%');
     * defer.notify('40%');
     * ```
     */
    notify : function(value) {
        this._promise.isResolved() || this._promise._notify(value);
    }
};

var PROMISE_STATUS = {
    PENDING   : 0,
    RESOLVED  : 1,
    FULFILLED : 2,
    REJECTED  : 3
};

/**
 * @class Promise
 * @exports vow:Promise
 * @description
 * The `Promise` class is used when you want to give to the caller something to subscribe to,
 * but not the ability to resolve or reject the deferred.
 */

/**
 * @constructor
 * @param {Function} resolver See https://github.com/domenic/promises-unwrapping/blob/master/README.md#the-promise-constructor for details.
 * @description
 * You should use this constructor directly only if you are going to use `vow` as DOM Promises implementation.
 * In other case you should use `vow.defer()` and `defer.promise()` methods.
 * @example
 * ```js
 * function fetchJSON(url) {
 *     return new vow.Promise(function(resolve, reject, notify) {
 *         var xhr = new XMLHttpRequest();
 *         xhr.open('GET', url);
 *         xhr.responseType = 'json';
 *         xhr.send();
 *         xhr.onload = function() {
 *             if(xhr.response) {
 *                 resolve(xhr.response);
 *             }
 *             else {
 *                 reject(new TypeError());
 *             }
 *         };
 *     });
 * }
 * ```
 */
var Promise = function(resolver) {
    this._value = undef;
    this._status = PROMISE_STATUS.PENDING;
    this._shouldEmitUnhandledRejection = true;

    this._fulfilledCallbacks = [];
    this._rejectedCallbacks = [];
    this._progressCallbacks = [];

    if(resolver) { // NOTE: see https://github.com/domenic/promises-unwrapping/blob/master/README.md
        var _this = this,
            resolverFnLen = resolver.length;

        try {
            resolver(
                function(val) {
                    _this.isResolved() || _this._resolve(val);
                },
                resolverFnLen > 1?
                    function(reason) {
                        _this.isResolved() || _this._reject(reason);
                    } :
                    undef,
                resolverFnLen > 2?
                    function(val) {
                        _this.isResolved() || _this._notify(val);
                    } :
                    undef);
        }
        catch(e) {
            this._reject(e);
        }
    }
};

Promise.prototype = /** @lends Promise.prototype */ {
    /**
     * Returns the value of the fulfilled promise or the reason in case of rejection.
     *
     * @returns {*}
     */
    valueOf : function() {
        return this._value;
    },

    /**
     * Returns `true` if the promise is resolved.
     *
     * @returns {Boolean}
     */
    isResolved : function() {
        return this._status !== PROMISE_STATUS.PENDING;
    },

    /**
     * Returns `true` if the promise is fulfilled.
     *
     * @returns {Boolean}
     */
    isFulfilled : function() {
        return this._status === PROMISE_STATUS.FULFILLED;
    },

    /**
     * Returns `true` if the promise is rejected.
     *
     * @returns {Boolean}
     */
    isRejected : function() {
        return this._status === PROMISE_STATUS.REJECTED;
    },

    /**
     * Adds reactions to the promise.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise} A new promise, see https://github.com/promises-aplus/promises-spec for details
     */
    then : function(onFulfilled, onRejected, onProgress, ctx) {
        this._shouldEmitUnhandledRejection = false;
        var defer = new Deferred();
        this._addCallbacks(defer, onFulfilled, onRejected, onProgress, ctx);
        return defer.promise();
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(undefined, onRejected)`.
     *
     * @param {Function} onRejected Callback that will be called with a provided 'reason' as argument after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    'catch' : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(null, onRejected)`. It's also an alias for `catch`.
     *
     * @param {Function} onRejected Callback to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds a resolving reaction (for both fulfillment and rejection).
     *
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(onResolved, ctx) {
        var _this = this,
            cb = function() {
                return onResolved.call(this, _this);
            };

        return this.then(cb, cb, ctx);
    },

    /**
     * Adds a resolving reaction (for both fulfillment and rejection). The returned promise will be fullfiled with the same value or rejected with the same reason as the original promise.
     *
     * @param {Function} onFinalized Callback that will be invoked after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    'finally' : function(onFinalized, ctx) {
        var _this = this,
            cb = function() {
                return onFinalized.call(this);
            };
        return this
            .then(cb, cb, ctx)
            .then(function() {
                return _this;
            });
    },

    /**
     * Adds a progress reaction.
     *
     * @param {Function} onProgress Callback that will be called with a provided value when the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(onProgress, ctx) {
        return this.then(undef, undef, onProgress, ctx);
    },

    /**
     * Like `promise.then`, but "spreads" the array into a variadic value handler.
     * It is useful with the `vow.all` and the `vow.allResolved` methods.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise()]).spread(function(arg1, arg2) {
     *     // arg1 is "1", arg2 is "'two'" here
     * });
     *
     * defer1.resolve(1);
     * defer2.resolve('two');
     * ```
     */
    spread : function(onFulfilled, onRejected, ctx) {
        return this.then(
            function(val) {
                return onFulfilled.apply(this, val);
            },
            onRejected,
            ctx);
    },

    /**
     * Like `then`, but terminates a chain of promises.
     * If the promise has been rejected, this method throws it's "reason" as an exception in a future turn of the event loop.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     *
     * @example
     * ```js
     * var defer = vow.defer();
     * defer.reject(Error('Internal error'));
     * defer.promise().done(); // exception to be thrown
     * ```
     */
    done : function(onFulfilled, onRejected, onProgress, ctx) {
        this
            .then(onFulfilled, onRejected, onProgress, ctx)
            .fail(throwException);
    },

    /**
     * Returns a new promise that will be fulfilled in `delay` milliseconds if the promise is fulfilled,
     * or immediately rejected if the promise is rejected.
     *
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(delay) {
        var timer,
            promise = this.then(function(val) {
                var defer = new Deferred();
                timer = setTimeout(
                    function() {
                        defer.resolve(val);
                    },
                    delay);

                return defer.promise();
            });

        promise.always(function() {
            clearTimeout(timer);
        });

        return promise;
    },

    /**
     * Returns a new promise that will be rejected in `timeout` milliseconds
     * if the promise is not resolved beforehand.
     *
     * @param {Number} timeout
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promiseWithTimeout1 = defer.promise().timeout(50),
     *     promiseWithTimeout2 = defer.promise().timeout(200);
     *
     * setTimeout(
     *     function() {
     *         defer.resolve('ok');
     *     },
     *     100);
     *
     * promiseWithTimeout1.fail(function(reason) {
     *     // promiseWithTimeout to be rejected in 50ms
     * });
     *
     * promiseWithTimeout2.then(function(value) {
     *     // promiseWithTimeout to be fulfilled with "'ok'" value
     * });
     * ```
     */
    timeout : function(timeout) {
        var defer = new Deferred(),
            timer = setTimeout(
                function() {
                    defer.reject(new vow.TimedOutError('timed out'));
                },
                timeout);

        this.then(
            function(val) {
                defer.resolve(val);
            },
            function(reason) {
                defer.reject(reason);
            });

        defer.promise().always(function() {
            clearTimeout(timer);
        });

        return defer.promise();
    },

    _vow : true,

    _resolve : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        if(val === this) {
            this._reject(TypeError('Can\'t resolve promise with itself'));
            return;
        }

        this._status = PROMISE_STATUS.RESOLVED;

        if(val && !!val._vow) { // shortpath for vow.Promise
            if(val.isFulfilled()) {
                this._fulfill(val.valueOf());
            }
            else if(val.isRejected()) {
                val._shouldEmitUnhandledRejection = false;
                this._reject(val.valueOf());
            }
            else {
                val.then(
                    this._fulfill,
                    this._reject,
                    this._notify,
                    this);
            }

            return;
        }

        if(isObject(val) || isFunction(val)) {
            var then;
            try {
                then = val.then;
            }
            catch(e) {
                this._reject(e);
                return;
            }

            if(isFunction(then)) {
                var _this = this,
                    isResolved = false;

                try {
                    then.call(
                        val,
                        function(val) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._resolve(val);
                        },
                        function(err) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._reject(err);
                        },
                        function(val) {
                            _this._notify(val);
                        });
                }
                catch(e) {
                    isResolved || this._reject(e);
                }

                return;
            }
        }

        this._fulfill(val);
    },

    _fulfill : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.FULFILLED;
        this._value = val;

        this._callCallbacks(this._fulfilledCallbacks, val);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _reject : function(reason) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.REJECTED;
        this._value = reason;

        this._callCallbacks(this._rejectedCallbacks, reason);

        if(!this._rejectedCallbacks.length) {
            var _this = this;
            nextTick(function() {
                if(_this._shouldEmitUnhandledRejection) {
                    emitUnhandledRejection(reason, _this);
                }
            });
        }

        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _notify : function(val) {
        this._callCallbacks(this._progressCallbacks, val);
    },

    _addCallbacks : function(defer, onFulfilled, onRejected, onProgress, ctx) {
        if(onRejected && !isFunction(onRejected)) {
            ctx = onRejected;
            onRejected = undef;
        }
        else if(onProgress && !isFunction(onProgress)) {
            ctx = onProgress;
            onProgress = undef;
        }

        if(onRejected) {
            this._shouldEmitUnhandledRejection = false;
        }

        var cb;

        if(!this.isRejected()) {
            cb = { defer : defer, fn : isFunction(onFulfilled)? onFulfilled : undef, ctx : ctx };
            this.isFulfilled()?
                this._callCallbacks([cb], this._value) :
                this._fulfilledCallbacks.push(cb);
        }

        if(!this.isFulfilled()) {
            cb = { defer : defer, fn : onRejected, ctx : ctx };
            this.isRejected()?
                this._callCallbacks([cb], this._value) :
                this._rejectedCallbacks.push(cb);
        }

        if(this._status <= PROMISE_STATUS.RESOLVED) {
            this._progressCallbacks.push({ defer : defer, fn : onProgress, ctx : ctx });
        }
    },

    _callCallbacks : function(callbacks, arg) {
        var len = callbacks.length;
        if(!len) {
            return;
        }

        var isResolved = this.isResolved(),
            isFulfilled = this.isFulfilled(),
            isRejected = this.isRejected();

        nextTick(function() {
            var i = 0, cb, defer, fn;
            while(i < len) {
                cb = callbacks[i++];
                defer = cb.defer;
                fn = cb.fn;

                if(fn) {
                    var ctx = cb.ctx,
                        res;
                    try {
                        res = ctx? fn.call(ctx, arg) : fn(arg);
                    }
                    catch(e) {
                        defer.reject(e);
                        continue;
                    }

                    isFulfilled || isRejected?
                        defer.resolve(res) :
                        defer.notify(res);
                }
                else if(isFulfilled) {
                    defer.resolve(arg);
                }
                else if(isRejected) {
                    defer.reject(arg);
                }
                else {
                    defer.notify(arg);
                }
            }
        });
    }
};

/** @lends Promise */
var staticMethods = {
    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return vow.cast(value);
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    all : function(iterable) {
        return vow.all(iterable);
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled or rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    allSettled : function(iterable) {
        return vow.allSettled(iterable);
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    race : function(iterable) {
        return vow.anyResolved(iterable);
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        return vow.resolve(value);
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        return vow.reject(reason);
    }
};

for(var prop in staticMethods) {
    staticMethods.hasOwnProperty(prop) &&
        (Promise[prop] = staticMethods[prop]);
}

var vow = /** @exports vow */ {
    Deferred : Deferred,

    Promise : Promise,

    /**
     * Creates a new deferred. This method is a factory method for `vow:Deferred` class.
     * It's equivalent to `new vow.Deferred()`.
     *
     * @returns {vow:Deferred}
     */
    defer : function() {
        return new Deferred();
    },

    /**
     * Static equivalent to `promise.then`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    when : function(value, onFulfilled, onRejected, onProgress, ctx) {
        return vow.cast(value).then(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.fail`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onRejected Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(value, onRejected, ctx) {
        return vow.when(value, undef, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.always`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(value, onResolved, ctx) {
        return vow.when(value).always(onResolved, ctx);
    },

    /**
     * Static equivalent to `promise.progress`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onProgress Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(value, onProgress, ctx) {
        return vow.when(value).progress(onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.spread`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    spread : function(value, onFulfilled, onRejected, ctx) {
        return vow.when(value).spread(onFulfilled, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.done`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     */
    done : function(value, onFulfilled, onRejected, onProgress, ctx) {
        vow.when(value).done(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Checks whether the given `value` is a promise-like object
     *
     * @param {*} value
     * @returns {Boolean}
     *
     * @example
     * ```js
     * vow.isPromise('something'); // returns false
     * vow.isPromise(vow.defer().promise()); // returns true
     * vow.isPromise({ then : function() { }); // returns true
     * ```
     */
    isPromise : function(value) {
        return isObject(value) && isFunction(value.then);
    },

    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return value && !!value._vow?
            value :
            vow.resolve(value);
    },

    /**
     * Static equivalent to `promise.valueOf`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {*}
     */
    valueOf : function(value) {
        return value && isFunction(value.valueOf)? value.valueOf() : value;
    },

    /**
     * Static equivalent to `promise.isFulfilled`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isFulfilled : function(value) {
        return value && isFunction(value.isFulfilled)? value.isFulfilled() : true;
    },

    /**
     * Static equivalent to `promise.isRejected`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isRejected : function(value) {
        return value && isFunction(value.isRejected)? value.isRejected() : false;
    },

    /**
     * Static equivalent to `promise.isResolved`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isResolved : function(value) {
        return value && isFunction(value.isResolved)? value.isResolved() : true;
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        var res = vow.defer();
        res.resolve(value);
        return res.promise();
    },

    /**
     * Returns a promise that has already been fulfilled with the given `value`.
     * If `value` is a promise, the returned promise will be fulfilled with the fulfill/rejection value of `value`.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    fulfill : function(value) {
        var defer = vow.defer(),
            promise = defer.promise();

        defer.resolve(value);

        return promise.isFulfilled()?
            promise :
            promise.then(null, function(reason) {
                return reason;
            });
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     * If `reason` is a promise, the returned promise will be rejected with the fulfill/rejection value of `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        var defer = vow.defer();
        defer.reject(reason);
        return defer.promise();
    },

    /**
     * Invokes the given function `fn` with arguments `args`
     *
     * @param {Function} fn
     * @param {...*} [args]
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var promise1 = vow.invoke(function(value) {
     *         return value;
     *     }, 'ok'),
     *     promise2 = vow.invoke(function() {
     *         throw Error();
     *     });
     *
     * promise1.isFulfilled(); // true
     * promise1.valueOf(); // 'ok'
     * promise2.isRejected(); // true
     * promise2.valueOf(); // instance of Error
     * ```
     */
    invoke : function(fn, args) {
        var len = Math.max(arguments.length - 1, 0),
            callArgs;
        if(len) { // optimization for V8
            callArgs = Array(len);
            var i = 0;
            while(i < len) {
                callArgs[i++] = arguments[i];
            }
        }

        try {
            return vow.resolve(callArgs?
                fn.apply(global, callArgs) :
                fn.call(global));
        }
        catch(e) {
            return vow.reject(e);
        }
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * with array:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise(), 3])
     *     .then(function(value) {
     *          // value is "[1, 2, 3]" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     *
     * @example
     * with object:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all({ p1 : defer1.promise(), p2 : defer2.promise(), p3 : 3 })
     *     .then(function(value) {
     *          // value is "{ p1 : 1, p2 : 2, p3 : 3 }" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     */
    all : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            len = keys.length,
            res = isPromisesArray? [] : {};

        if(!len) {
            defer.resolve(res);
            return defer.promise();
        }

        var i = len;
        vow._forEach(
            iterable,
            function(value, idx) {
                res[keys[idx]] = value;
                if(!--i) {
                    defer.resolve(res);
                }
            },
            defer.reject,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are resolved.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.allResolved([defer1.promise(), defer2.promise()]).spread(function(promise1, promise2) {
     *     promise1.isRejected(); // returns true
     *     promise1.valueOf(); // returns "'error'"
     *     promise2.isFulfilled(); // returns true
     *     promise2.valueOf(); // returns "'ok'"
     * });
     *
     * defer1.reject('error');
     * defer2.resolve('ok');
     * ```
     */
    allResolved : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            i = keys.length,
            res = isPromisesArray? [] : {};

        if(!i) {
            defer.resolve(res);
            return defer.promise();
        }

        var onResolved = function() {
                --i || defer.resolve(iterable);
            };

        vow._forEach(
            iterable,
            onResolved,
            onResolved,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    allSettled : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                res = isPromisesArray? [] : {},
                len = keys.length, i = 0, key, value, item;

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                value = promise.valueOf();
                item = promise.isRejected()?
                    { status : 'rejected', reason : value } :
                    { status : 'fulfilled', value : value };

                isPromisesArray?
                    res.push(item) :
                    res[key] = item;
            }

            return res;
        });
    },

    allPatiently : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                rejectedPromises, fulfilledPromises,
                len = keys.length, i = 0, key, promise;

            if(!len) {
                return isPromisesArray? [] : {};
            }

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                if(vow.isRejected(promise)) {
                    rejectedPromises || (rejectedPromises = isPromisesArray? [] : {});
                    isPromisesArray?
                        rejectedPromises.push(promise.valueOf()) :
                        rejectedPromises[key] = promise.valueOf();
                }
                else if(!rejectedPromises) {
                    (fulfilledPromises || (fulfilledPromises = isPromisesArray? [] : {}))[key] = vow.valueOf(promise);
                }
            }

            if(rejectedPromises) {
                throw rejectedPromises;
            }

            return fulfilledPromises;
        });
    },

    /**
     * Returns a promise, that will be fulfilled if any of the items in `iterable` is fulfilled.
     * If all of the `iterable` items get rejected, the promise will be rejected (with the reason of the first rejected item).
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    any : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        var i = 0, reason;
        vow._forEach(
            iterable,
            defer.resolve,
            function(e) {
                i || (reason = e);
                ++i === len && defer.reject(reason);
            },
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` is fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    anyResolved : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        vow._forEach(
            iterable,
            defer.resolve,
            defer.reject,
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Static equivalent to `promise.delay`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(value, delay) {
        return vow.resolve(value).delay(delay);
    },

    /**
     * Static equivalent to `promise.timeout`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} timeout
     * @returns {vow:Promise}
     */
    timeout : function(value, timeout) {
        return vow.resolve(value).timeout(timeout);
    },

    _forEach : function(promises, onFulfilled, onRejected, onProgress, ctx, keys) {
        var len = keys? keys.length : promises.length,
            i = 0;

        while(i < len) {
            vow.when(
                promises[keys? keys[i] : i],
                wrapOnFulfilled(onFulfilled, i),
                onRejected,
                onProgress,
                ctx);
            ++i;
        }
    },

    TimedOutError : defineCustomErrorType('TimedOut')
};

var defineAsGlobal = true;
if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = vow;
    defineAsGlobal = false;
}

if(typeof modules === 'object' && isFunction(modules.define)) {
    modules.define('vow', function(provide) {
        provide(vow);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = vow;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.vow = vow);

})(typeof window !== 'undefined'? window : global);

/**
 * Предоставляет функцию для расширения объектов.
 */
modules.define('y-extend', function (provide) {

    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var toString = Object.prototype.toString;

    /**
     * Проверяет, что переданный объект является "плоским" (т.е. созданным с помощью "{}"
     * или "new Object").
     *
     * @param {Object} obj
     * @returns {Boolean}
     */
    function isPlainObject(obj) {
        // Не являются плоским объектом:
        // - Любой объект или значение, чьё внутреннее свойство [[Class]] не равно "[object Object]"
        // - DOM-нода
        // - window
        return !(toString.call(obj) !== '[object Object]' ||
            obj.nodeType ||
            obj.window === window);
    }

    /**
     * Копирует перечислимые свойства одного или нескольких объектов в целевой объект.
     *
     * @param {Boolean} [deep=false] При значении `true` свойства копируются рекурсивно.
     * @param {Object} target Объект для расширения. Он получит новые свойства.
     * @param {...Object} objects Объекты со свойствами для копирования. Аргументы со значениями
     *      `null` или `undefined` игнорируются.
     * @returns {Object}
     */
    provide(function extend() {
        var target = arguments[0];
        var deep;
        var i;

        // Обрабатываем ситуацию глубокого копирования.
        if (typeof target === 'boolean') {
            deep = target;
            target = arguments[1];
            i = 2;
        } else {
            deep = false;
            i = 1;
        }

        for (; i < arguments.length; i++) {
            var obj = arguments[i];
            if (!obj) {
                continue;
            }

            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    var val = obj[key];
                    var isArray = false;

                    // Копируем "плоские" объекты и массивы рекурсивно.
                    if (deep && val && (isPlainObject(val) || (isArray = Array.isArray(val)))) {
                        var src = target[key];
                        var clone;
                        if (isArray) {
                            clone = src && Array.isArray(src) ? src : [];
                        } else {
                            clone = src && isPlainObject(src) ? src : {};
                        }
                        target[key] = extend(deep, clone, val);
                    } else {
                        target[key] = val;
                    }
                }
            }
        }

        return target;
    });
});

modules.define(
    'hammer',
    [],
    function (provide) {


/*! Hammer.JS - v2.0.4 - 2014-09-28
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2014 Jorik Tangelder;
 * Licensed under the MIT license */
    'use strict';

    var VENDOR_PREFIXES = ['', 'webkit', 'moz', 'MS', 'ms', 'o'];
    var TEST_ELEMENT = document.createElement('div');

    var TYPE_FUNCTION = 'function';

    var round = Math.round;
    var abs = Math.abs;
    var now = Date.now;

    /**
     * set a timeout with a given scope
     * @param {Function} fn
     * @param {Number} timeout
     * @param {Object} context
     * @returns {number}
     */
    function setTimeoutContext(fn, timeout, context) {
        return setTimeout(bindFn(fn, context), timeout);
    }

    /**
     * if the argument is an array, we want to execute the fn on each entry
     * if it aint an array we don't want to do a thing.
     * this is used by all the methods that accept a single and array argument.
     * @param {*|Array} arg
     * @param {String} fn
     * @param {Object} [context]
     * @returns {Boolean}
     */
    function invokeArrayArg(arg, fn, context) {
        if (Array.isArray(arg)) {
            each(arg, context[fn], context);
            return true;
        }
        return false;
    }

    /**
     * walk objects and arrays
     * @param {Object} obj
     * @param {Function} iterator
     * @param {Object} context
     */
    function each(obj, iterator, context) {
        var i;

        if (!obj) {
            return;
        }

        if (obj.forEach) {
            obj.forEach(iterator, context);
        } else if (obj.length !== undefined) {
            i = 0;
            while (i < obj.length) {
                iterator.call(context, obj[i], i, obj);
                i++;
            }
        } else {
            for (i in obj) {
                obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
            }
        }
    }

    /**
     * extend object.
     * means that properties in dest will be overwritten by the ones in src.
     * @param {Object} dest
     * @param {Object} src
     * @param {Boolean} [merge]
     * @returns {Object} dest
     */
    function extend(dest, src, merge) {
        var keys = Object.keys(src);
        var i = 0;
        while (i < keys.length) {
            if (!merge || (merge && dest[keys[i]] === undefined)) {
                dest[keys[i]] = src[keys[i]];
            }
            i++;
        }
        return dest;
    }

    /**
     * merge the values from src in the dest.
     * means that properties that exist in dest will not be overwritten by src
     * @param {Object} dest
     * @param {Object} src
     * @returns {Object} dest
     */
    function merge(dest, src) {
        return extend(dest, src, true);
    }

    /**
     * simple class inheritance
     * @param {Function} child
     * @param {Function} base
     * @param {Object} [properties]
     */
    function inherit(child, base, properties) {
        var baseP = base.prototype,
            childP;

        childP = child.prototype = Object.create(baseP);
        childP.constructor = child;
        childP._super = baseP;

        if (properties) {
            extend(childP, properties);
        }
    }

    /**
     * simple function bind
     * @param {Function} fn
     * @param {Object} context
     * @returns {Function}
     */
    function bindFn(fn, context) {
        return function boundFn() {
            return fn.apply(context, arguments);
        };
    }

    /**
     * let a boolean value also be a function that must return a boolean
     * this first item in args will be used as the context
     * @param {Boolean|Function} val
     * @param {Array} [args]
     * @returns {Boolean}
     */
    function boolOrFn(val, args) {
        if (typeof val == TYPE_FUNCTION) {
            return val.apply(args ? args[0] || undefined : undefined, args);
        }
        return val;
    }

    /**
     * use the val2 when val1 is undefined
     * @param {*} val1
     * @param {*} val2
     * @returns {*}
     */
    function ifUndefined(val1, val2) {
        return (val1 === undefined) ? val2 : val1;
    }

    /**
     * addEventListener with multiple events at once
     * @param {EventTarget} target
     * @param {String} types
     * @param {Function} handler
     */
    function addEventListeners(target, types, handler) {
        each(splitStr(types), function (type) {
            target.addEventListener(type, handler, false);
        });
    }

    /**
     * removeEventListener with multiple events at once
     * @param {EventTarget} target
     * @param {String} types
     * @param {Function} handler
     */
    function removeEventListeners(target, types, handler) {
        each(splitStr(types), function (type) {
            target.removeEventListener(type, handler, false);
        });
    }

    /**
     * find if a node is in the given parent
     * @method hasParent
     * @param {HTMLElement} node
     * @param {HTMLElement} parent
     * @return {Boolean} found
     */
    function hasParent(node, parent) {
        while (node) {
            if (node == parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    /**
     * small indexOf wrapper
     * @param {String} str
     * @param {String} find
     * @returns {Boolean} found
     */
    function inStr(str, find) {
        return str.indexOf(find) > -1;
    }

    /**
     * split string on whitespace
     * @param {String} str
     * @returns {Array} words
     */
    function splitStr(str) {
        return str.trim().split(/\s+/g);
    }

    /**
     * find if a array contains the object using indexOf or a simple polyFill
     * @param {Array} src
     * @param {String} find
     * @param {String} [findByKey]
     * @return {Boolean|Number} false when not found, or the index
     */
    function inArray(src, find, findByKey) {
        if (src.indexOf && !findByKey) {
            return src.indexOf(find);
        } else {
            var i = 0;
            while (i < src.length) {
                if ((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
                    return i;
                }
                i++;
            }
            return -1;
        }
    }

    /**
     * convert array-like objects to real arrays
     * @param {Object} obj
     * @returns {Array}
     */
    function toArray(obj) {
        return Array.prototype.slice.call(obj, 0);
    }

    /**
     * unique array with objects based on a key (like 'id') or just by the array's value
     * @param {Array} src [{id:1},{id:2},{id:1}]
     * @param {String} [key]
     * @param {Boolean} [sort=False]
     * @returns {Array} [{id:1},{id:2}]
     */
    function uniqueArray(src, key, sort) {
        var results = [];
        var values = [];
        var i = 0;

        while (i < src.length) {
            var val = key ? src[i][key] : src[i];
            if (inArray(values, val) < 0) {
                results.push(src[i]);
            }
            values[i] = val;
            i++;
        }

        if (sort) {
            if (!key) {
                results = results.sort();
            } else {
                results = results.sort(function sortUniqueArray(a, b) {
                    return a[key] > b[key];
                });
            }
        }

        return results;
    }

    /**
     * get the prefixed property
     * @param {Object} obj
     * @param {String} property
     * @returns {String|Undefined} prefixed
     */
    function prefixed(obj, property) {
        var prefix, prop;
        var camelProp = property[0].toUpperCase() + property.slice(1);

        var i = 0;
        while (i < VENDOR_PREFIXES.length) {
            prefix = VENDOR_PREFIXES[i];
            prop = (prefix) ? prefix + camelProp : property;

            if (prop in obj) {
                return prop;
            }
            i++;
        }
        return undefined;
    }

    /**
     * get a unique id
     * @returns {number} uniqueId
     */
    var _uniqueId = 1;

    function uniqueId() {
        return _uniqueId++;
    }

    /**
     * get the window object of an element
     * @param {HTMLElement} element
     * @returns {DocumentView|Window}
     */
    function getWindowForElement(element) {
        var doc = element.ownerDocument;
        return (doc.defaultView || doc.parentWindow);
    }

    var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

    var SUPPORT_TOUCH = ('ontouchstart' in window);
    var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
    var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

    var INPUT_TYPE_TOUCH = 'touch';
    var INPUT_TYPE_PEN = 'pen';
    var INPUT_TYPE_MOUSE = 'mouse';
    var INPUT_TYPE_KINECT = 'kinect';

    var COMPUTE_INTERVAL = 25;

    var INPUT_START = 1;
    var INPUT_MOVE = 2;
    var INPUT_END = 4;
    var INPUT_CANCEL = 8;

    var DIRECTION_NONE = 1;
    var DIRECTION_LEFT = 2;
    var DIRECTION_RIGHT = 4;
    var DIRECTION_UP = 8;
    var DIRECTION_DOWN = 16;

    var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
    var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
    var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

    var PROPS_XY = ['x', 'y'];
    var PROPS_CLIENT_XY = ['clientX', 'clientY'];

    /**
     * create new input type manager
     * @param {Manager} manager
     * @param {Function} callback
     * @returns {Input}
     * @constructor
     */
    function Input(manager, callback) {
        var self = this;
        this.manager = manager;
        this.callback = callback;
        this.element = manager.element;
        this.target = manager.options.inputTarget;

        // smaller wrapper around the handler, for the scope and the enabled state of the manager,
        // so when disabled the input events are completely bypassed.
        this.domHandler = function (ev) {
            if (boolOrFn(manager.options.enable, [manager])) {
                self.handler(ev);
            }
        };

        this.init();

    }

    Input.prototype = {
        /**
         * should handle the inputEvent data and trigger the callback
         * @virtual
         */
        handler: function () {},

        /**
         * bind the events
         */
        init: function () {
            this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
            this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
            this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
        },

        /**
         * unbind the events
         */
        destroy: function () {
            this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
            this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
            this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
        }
    };

    /**
     * create new input type manager
     * called by the Manager constructor
     * @param {Hammer} manager
     * @returns {Input}
     */
    function createInputInstance(manager) {
        var Type;
        var inputClass = manager.options.inputClass;

        if (inputClass) {
            Type = inputClass;
        } else if (SUPPORT_POINTER_EVENTS) {
            Type = PointerEventInput;
        } else if (SUPPORT_ONLY_TOUCH) {
            Type = TouchInput;
        } else if (!SUPPORT_TOUCH) {
            Type = MouseInput;
        } else {
            Type = TouchMouseInput;
        }
        return new(Type)(manager, inputHandler);
    }

    /**
     * handle input events
     * @param {Manager} manager
     * @param {String} eventType
     * @param {Object} input
     */
    function inputHandler(manager, eventType, input) {
        var pointersLen = input.pointers.length;
        var changedPointersLen = input.changedPointers.length;
        var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
        var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

        input.isFirst = !! isFirst;
        input.isFinal = !! isFinal;

        if (isFirst) {
            manager.session = {};
        }

        // source event is the normalized value of the domEvents
        // like 'touchstart, mouseup, pointerdown'
        input.eventType = eventType;

        // compute scale, rotation etc
        computeInputData(manager, input);

        // emit secret event
        manager.emit('hammer.input', input);

        manager.recognize(input);
        manager.session.prevInput = input;
    }

    /**
     * extend the data with some usable properties like scale, rotate, velocity etc
     * @param {Object} manager
     * @param {Object} input
     */
    function computeInputData(manager, input) {
        var session = manager.session;
        var pointers = input.pointers;
        var pointersLength = pointers.length;

        // store the first input to calculate the distance and direction
        if (!session.firstInput) {
            session.firstInput = simpleCloneInputData(input);
        }

        // to compute scale and rotation we need to store the multiple touches
        if (pointersLength > 1 && !session.firstMultiple) {
            session.firstMultiple = simpleCloneInputData(input);
        } else if (pointersLength === 1) {
            session.firstMultiple = false;
        }

        var firstInput = session.firstInput;
        var firstMultiple = session.firstMultiple;
        var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

        var center = input.center = getCenter(pointers);
        input.timeStamp = now();
        input.deltaTime = input.timeStamp - firstInput.timeStamp;

        input.angle = getAngle(offsetCenter, center);
        input.distance = getDistance(offsetCenter, center);

        computeDeltaXY(session, input);
        input.offsetDirection = getDirection(input.deltaX, input.deltaY);

        input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
        input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

        computeIntervalInputData(session, input);

        // find the correct target
        var target = manager.element;
        if (hasParent(input.srcEvent.target, target)) {
            target = input.srcEvent.target;
        }
        input.target = target;
    }

    function computeDeltaXY(session, input) {
        var center = input.center;
        var offset = session.offsetDelta || {};
        var prevDelta = session.prevDelta || {};
        var prevInput = session.prevInput || {};

        if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
            prevDelta = session.prevDelta = {
                x: prevInput.deltaX || 0,
                y: prevInput.deltaY || 0
            };

            offset = session.offsetDelta = {
                x: center.x,
                y: center.y
            };
        }

        input.deltaX = prevDelta.x + (center.x - offset.x);
        input.deltaY = prevDelta.y + (center.y - offset.y);
    }

    /**
     * velocity is calculated every x ms
     * @param {Object} session
     * @param {Object} input
     */
    function computeIntervalInputData(session, input) {
        var last = session.lastInterval || input,
            deltaTime = input.timeStamp - last.timeStamp,
            velocity, velocityX, velocityY, direction;

        if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
            var deltaX = last.deltaX - input.deltaX;
            var deltaY = last.deltaY - input.deltaY;

            var v = getVelocity(deltaTime, deltaX, deltaY);
            velocityX = v.x;
            velocityY = v.y;
            velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
            direction = getDirection(deltaX, deltaY);

            session.lastInterval = input;
        } else {
            // use latest velocity info if it doesn't overtake a minimum period
            velocity = last.velocity;
            velocityX = last.velocityX;
            velocityY = last.velocityY;
            direction = last.direction;
        }

        input.velocity = velocity;
        input.velocityX = velocityX;
        input.velocityY = velocityY;
        input.direction = direction;
    }

    /**
     * create a simple clone from the input used for storage of firstInput and firstMultiple
     * @param {Object} input
     * @returns {Object} clonedInputData
     */
    function simpleCloneInputData(input) {
        // make a simple copy of the pointers because we will get a reference if we don't
        // we only need clientXY for the calculations
        var pointers = [];
        var i = 0;
        while (i < input.pointers.length) {
            pointers[i] = {
                clientX: round(input.pointers[i].clientX),
                clientY: round(input.pointers[i].clientY)
            };
            i++;
        }

        return {
            timeStamp: now(),
            pointers: pointers,
            center: getCenter(pointers),
            deltaX: input.deltaX,
            deltaY: input.deltaY
        };
    }

    /**
     * get the center of all the pointers
     * @param {Array} pointers
     * @return {Object} center contains `x` and `y` properties
     */
    function getCenter(pointers) {
        var pointersLength = pointers.length;

        // no need to loop when only one touch
        if (pointersLength === 1) {
            return {
                x: round(pointers[0].clientX),
                y: round(pointers[0].clientY)
            };
        }

        var x = 0,
            y = 0,
            i = 0;
        while (i < pointersLength) {
            x += pointers[i].clientX;
            y += pointers[i].clientY;
            i++;
        }

        return {
            x: round(x / pointersLength),
            y: round(y / pointersLength)
        };
    }

    /**
     * calculate the velocity between two points. unit is in px per ms.
     * @param {Number} deltaTime
     * @param {Number} x
     * @param {Number} y
     * @return {Object} velocity `x` and `y`
     */
    function getVelocity(deltaTime, x, y) {
        return {
            x: x / deltaTime || 0,
            y: y / deltaTime || 0
        };
    }

    /**
     * get the direction between two points
     * @param {Number} x
     * @param {Number} y
     * @return {Number} direction
     */
    function getDirection(x, y) {
        if (x === y) {
            return DIRECTION_NONE;
        }

        if (abs(x) >= abs(y)) {
            return x > 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
        }
        return y > 0 ? DIRECTION_UP : DIRECTION_DOWN;
    }

    /**
     * calculate the absolute distance between two points
     * @param {Object} p1 {x, y}
     * @param {Object} p2 {x, y}
     * @param {Array} [props] containing x and y keys
     * @return {Number} distance
     */
    function getDistance(p1, p2, props) {
        if (!props) {
            props = PROPS_XY;
        }
        var x = p2[props[0]] - p1[props[0]],
            y = p2[props[1]] - p1[props[1]];

        return Math.sqrt((x * x) + (y * y));
    }

    /**
     * calculate the angle between two coordinates
     * @param {Object} p1
     * @param {Object} p2
     * @param {Array} [props] containing x and y keys
     * @return {Number} angle
     */
    function getAngle(p1, p2, props) {
        if (!props) {
            props = PROPS_XY;
        }
        var x = p2[props[0]] - p1[props[0]],
            y = p2[props[1]] - p1[props[1]];
        return Math.atan2(y, x) * 180 / Math.PI;
    }

    /**
     * calculate the rotation degrees between two pointersets
     * @param {Array} start array of pointers
     * @param {Array} end array of pointers
     * @return {Number} rotation
     */
    function getRotation(start, end) {
        return getAngle(end[1], end[0], PROPS_CLIENT_XY) - getAngle(start[1], start[0], PROPS_CLIENT_XY);
    }

    /**
     * calculate the scale factor between two pointersets
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @param {Array} start array of pointers
     * @param {Array} end array of pointers
     * @return {Number} scale
     */
    function getScale(start, end) {
        return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
    }

    var MOUSE_INPUT_MAP = {
        mousedown: INPUT_START,
        mousemove: INPUT_MOVE,
        mouseup: INPUT_END
    };

    var MOUSE_ELEMENT_EVENTS = 'mousedown';
    var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

    /**
     * Mouse events input
     * @constructor
     * @extends Input
     */
    function MouseInput() {
        this.evEl = MOUSE_ELEMENT_EVENTS;
        this.evWin = MOUSE_WINDOW_EVENTS;

        this.allow = true; // used by Input.TouchMouse to disable mouse events
        this.pressed = false; // mousedown state

        Input.apply(this, arguments);
    }

    inherit(MouseInput, Input, {
        /**
         * handle mouse events
         * @param {Object} ev
         */
        handler: function MEhandler(ev) {
            var eventType = MOUSE_INPUT_MAP[ev.type];

            // on start we want to have the left mouse button down
            if (eventType & INPUT_START && ev.button === 0) {
                this.pressed = true;
            }

            if (eventType & INPUT_MOVE && ev.which !== 1) {
                eventType = INPUT_END;
            }

            // mouse must be down, and mouse events are allowed (see the TouchMouse input)
            if (!this.pressed || !this.allow) {
                return;
            }

            if (eventType & INPUT_END) {
                this.pressed = false;
            }

            this.callback(this.manager, eventType, {
                pointers: [ev],
                changedPointers: [ev],
                pointerType: INPUT_TYPE_MOUSE,
                srcEvent: ev
            });
        }
    });

    var POINTER_INPUT_MAP = {
        pointerdown: INPUT_START,
        pointermove: INPUT_MOVE,
        pointerup: INPUT_END,
        pointercancel: INPUT_CANCEL,
        pointerout: INPUT_CANCEL
    };

    // in IE10 the pointer types is defined as an enum
    var IE10_POINTER_TYPE_ENUM = {
        2: INPUT_TYPE_TOUCH,
        3: INPUT_TYPE_PEN,
        4: INPUT_TYPE_MOUSE,
        5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
    };

    var POINTER_ELEMENT_EVENTS = 'pointerdown';
    var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

    // IE10 has prefixed support, and case-sensitive
    if (window.MSPointerEvent) {
        POINTER_ELEMENT_EVENTS = 'MSPointerDown';
        POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
    }

    /**
     * Pointer events input
     * @constructor
     * @extends Input
     */
    function PointerEventInput() {
        this.evEl = POINTER_ELEMENT_EVENTS;
        this.evWin = POINTER_WINDOW_EVENTS;

        Input.apply(this, arguments);

        this.store = (this.manager.session.pointerEvents = []);
    }

    inherit(PointerEventInput, Input, {
        /**
         * handle mouse events
         * @param {Object} ev
         */
        handler: function PEhandler(ev) {
            var store = this.store;
            var removePointer = false;

            var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
            var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
            var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

            var isTouch = (pointerType == INPUT_TYPE_TOUCH);

            // get index of the event in the store
            var storeIndex = inArray(store, ev.pointerId, 'pointerId');

            // start and mouse must be down
            if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
                if (storeIndex < 0) {
                    store.push(ev);
                    storeIndex = store.length - 1;
                }
            } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
                removePointer = true;
            }

            // it not found, so the pointer hasn't been down (so it's probably a hover)
            if (storeIndex < 0) {
                return;
            }

            // update the event in the store
            store[storeIndex] = ev;

            this.callback(this.manager, eventType, {
                pointers: store,
                changedPointers: [ev],
                pointerType: pointerType,
                srcEvent: ev
            });

            if (removePointer) {
                // remove from the store
                store.splice(storeIndex, 1);
            }
        }
    });

    var SINGLE_TOUCH_INPUT_MAP = {
        touchstart: INPUT_START,
        touchmove: INPUT_MOVE,
        touchend: INPUT_END,
        touchcancel: INPUT_CANCEL
    };

    var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
    var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

    /**
     * Touch events input
     * @constructor
     * @extends Input
     */
    function SingleTouchInput() {
        this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
        this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
        this.started = false;

        Input.apply(this, arguments);
    }

    inherit(SingleTouchInput, Input, {
        handler: function TEhandler(ev) {
            var type = SINGLE_TOUCH_INPUT_MAP[ev.type];

            // should we handle the touch events?
            if (type === INPUT_START) {
                this.started = true;
            }

            if (!this.started) {
                return;
            }

            var touches = normalizeSingleTouches.call(this, ev, type);

            // when done, reset the started state
            if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
                this.started = false;
            }

            this.callback(this.manager, type, {
                pointers: touches[0],
                changedPointers: touches[1],
                pointerType: INPUT_TYPE_TOUCH,
                srcEvent: ev
            });
        }
    });

    /**
     * @this {TouchInput}
     * @param {Object} ev
     * @param {Number} type flag
     * @returns {undefined|Array} [all, changed]
     */
    function normalizeSingleTouches(ev, type) {
        var all = toArray(ev.touches);
        var changed = toArray(ev.changedTouches);

        if (type & (INPUT_END | INPUT_CANCEL)) {
            all = uniqueArray(all.concat(changed), 'identifier', true);
        }

        return [all, changed];
    }

    var TOUCH_INPUT_MAP = {
        touchstart: INPUT_START,
        touchmove: INPUT_MOVE,
        touchend: INPUT_END,
        touchcancel: INPUT_CANCEL
    };

    var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

    /**
     * Multi-user touch events input
     * @constructor
     * @extends Input
     */
    function TouchInput() {
        this.evTarget = TOUCH_TARGET_EVENTS;
        this.targetIds = {};

        Input.apply(this, arguments);
    }

    inherit(TouchInput, Input, {
        handler: function MTEhandler(ev) {
            var type = TOUCH_INPUT_MAP[ev.type];
            var touches = getTouches.call(this, ev, type);
            if (!touches) {
                return;
            }

            this.callback(this.manager, type, {
                pointers: touches[0],
                changedPointers: touches[1],
                pointerType: INPUT_TYPE_TOUCH,
                srcEvent: ev
            });
        }
    });

    /**
     * @this {TouchInput}
     * @param {Object} ev
     * @param {Number} type flag
     * @returns {undefined|Array} [all, changed]
     */
    function getTouches(ev, type) {
        var allTouches = toArray(ev.touches);
        var targetIds = this.targetIds;

        // when there is only one touch, the process can be simplified
        if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
            targetIds[allTouches[0].identifier] = true;
            return [allTouches, allTouches];
        }

        var i,
        targetTouches,
        changedTouches = toArray(ev.changedTouches),
            changedTargetTouches = [],
            target = this.target;

        // get target touches from touches
        targetTouches = allTouches.filter(function (touch) {
            return hasParent(touch.target, target);
        });

        // collect touches
        if (type === INPUT_START) {
            i = 0;
            while (i < targetTouches.length) {
                targetIds[targetTouches[i].identifier] = true;
                i++;
            }
        }

        // filter changed touches to only contain touches that exist in the collected target ids
        i = 0;
        while (i < changedTouches.length) {
            if (targetIds[changedTouches[i].identifier]) {
                changedTargetTouches.push(changedTouches[i]);
            }

            // cleanup removed touches
            if (type & (INPUT_END | INPUT_CANCEL)) {
                delete targetIds[changedTouches[i].identifier];
            }
            i++;
        }

        if (!changedTargetTouches.length) {
            return;
        }

        return [
        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
        changedTargetTouches];
    }

    /**
     * Combined touch and mouse input
     *
     * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
     * This because touch devices also emit mouse events while doing a touch.
     *
     * @constructor
     * @extends Input
     */
    function TouchMouseInput() {
        Input.apply(this, arguments);

        var handler = bindFn(this.handler, this);
        this.touch = new TouchInput(this.manager, handler);
        this.mouse = new MouseInput(this.manager, handler);
    }

    inherit(TouchMouseInput, Input, {
        /**
         * handle mouse and touch events
         * @param {Hammer} manager
         * @param {String} inputEvent
         * @param {Object} inputData
         */
        handler: function TMEhandler(manager, inputEvent, inputData) {
            var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
                isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

            // when we're in a touch event, so  block all upcoming mouse events
            // most mobile browser also emit mouseevents, right after touchstart
            if (isTouch) {
                this.mouse.allow = false;
            } else if (isMouse && !this.mouse.allow) {
                return;
            }

            // reset the allowMouse when we're done
            if (inputEvent & (INPUT_END | INPUT_CANCEL)) {
                this.mouse.allow = true;
            }

            this.callback(manager, inputEvent, inputData);
        },

        /**
         * remove the event listeners
         */
        destroy: function destroy() {
            this.touch.destroy();
            this.mouse.destroy();
        }
    });

    var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
    var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

    // magical touchAction value
    var TOUCH_ACTION_COMPUTE = 'compute';
    var TOUCH_ACTION_AUTO = 'auto';
    var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
    var TOUCH_ACTION_NONE = 'none';
    var TOUCH_ACTION_PAN_X = 'pan-x';
    var TOUCH_ACTION_PAN_Y = 'pan-y';

    /**
     * Touch Action
     * sets the touchAction property or uses the js alternative
     * @param {Manager} manager
     * @param {String} value
     * @constructor
     */
    function TouchAction(manager, value) {
        this.manager = manager;
        this.set(value);
    }

    TouchAction.prototype = {
        /**
         * set the touchAction value on the element or enable the polyfill
         * @param {String} value
         */
        set: function (value) {
            // find out the touch-action by the event handlers
            if (value == TOUCH_ACTION_COMPUTE) {
                value = this.compute();
            }

            if (NATIVE_TOUCH_ACTION) {
                this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
            }
            this.actions = value.toLowerCase().trim();
        },

        /**
         * just re-set the touchAction value
         */
        update: function () {
            this.set(this.manager.options.touchAction);
        },

        /**
         * compute the value for the touchAction property based on the recognizer's settings
         * @returns {String} value
         */
        compute: function () {
            var actions = [];
            each(this.manager.recognizers, function (recognizer) {
                if (boolOrFn(recognizer.options.enable, [recognizer])) {
                    actions = actions.concat(recognizer.getTouchAction());
                }
            });
            return cleanTouchActions(actions.join(' '));
        },

        /**
         * this method is called on each input cycle and provides the preventing of the browser behavior
         * @param {Object} input
         */
        preventDefaults: function (input) {
            // not needed with native support for the touchAction property
            if (NATIVE_TOUCH_ACTION) {
                return;
            }

            var srcEvent = input.srcEvent;
            var direction = input.offsetDirection;

            // if the touch action did prevented once this session
            if (this.manager.session.prevented) {
                srcEvent.preventDefault();
                return;
            }

            var actions = this.actions;
            var hasNone = inStr(actions, TOUCH_ACTION_NONE);
            var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);
            var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);

            if (hasNone || (hasPanY && direction & DIRECTION_HORIZONTAL) || (hasPanX && direction & DIRECTION_VERTICAL)) {
                return this.preventSrc(srcEvent);
            }
        },

        /**
         * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
         * @param {Object} srcEvent
         */
        preventSrc: function (srcEvent) {
            this.manager.session.prevented = true;
            srcEvent.preventDefault();
        }
    };

    /**
     * when the touchActions are collected they are not a valid value, so we need to clean things up. *
     * @param {String} actions
     * @returns {*}
     */
    function cleanTouchActions(actions) {
        // none
        if (inStr(actions, TOUCH_ACTION_NONE)) {
            return TOUCH_ACTION_NONE;
        }

        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

        // pan-x and pan-y can be combined
        if (hasPanX && hasPanY) {
            return TOUCH_ACTION_PAN_X + ' ' + TOUCH_ACTION_PAN_Y;
        }

        // pan-x OR pan-y
        if (hasPanX || hasPanY) {
            return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
        }

        // manipulation
        if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
            return TOUCH_ACTION_MANIPULATION;
        }

        return TOUCH_ACTION_AUTO;
    }

    /**
     * Recognizer flow explained; *
     * All recognizers have the initial state of POSSIBLE when a input session starts.
     * The definition of a input session is from the first input until the last input, with all it's movement in it. *
     * Example session for mouse-input: mousedown -> mousemove -> mouseup
     *
     * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
     * which determines with state it should be.
     *
     * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
     * POSSIBLE to give it another change on the next cycle.
     *
     *               Possible
     *                  |
     *            +-----+---------------+
     *            |                     |
     *      +-----+-----+               |
     *      |           |               |
     *   Failed      Cancelled          |
     *                          +-------+------+
     *                          |              |
     *                      Recognized       Began
     *                                         |
     *                                      Changed
     *                                         |
     *                                  Ended/Recognized
     */
    var STATE_POSSIBLE = 1;
    var STATE_BEGAN = 2;
    var STATE_CHANGED = 4;
    var STATE_ENDED = 8;
    var STATE_RECOGNIZED = STATE_ENDED;
    var STATE_CANCELLED = 16;
    var STATE_FAILED = 32;

    /**
     * Recognizer
     * Every recognizer needs to extend from this class.
     * @constructor
     * @param {Object} options
     */
    function Recognizer(options) {
        this.id = uniqueId();

        this.manager = null;
        this.options = merge(options || {}, this.defaults);

        // default is enable true
        this.options.enable = ifUndefined(this.options.enable, true);

        this.state = STATE_POSSIBLE;

        this.simultaneous = {};
        this.requireFail = [];
    }

    Recognizer.prototype = {
        /**
         * @virtual
         * @type {Object}
         */
        defaults: {},

        /**
         * set options
         * @param {Object} options
         * @return {Recognizer}
         */
        set: function (options) {
            extend(this.options, options);

            // also update the touchAction, in case something changed about the directions/enabled state
            this.manager && this.manager.touchAction.update();
            return this;
        },

        /**
         * recognize simultaneous with an other recognizer.
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        recognizeWith: function (otherRecognizer) {
            if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
                return this;
            }

            var simultaneous = this.simultaneous;
            otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
            if (!simultaneous[otherRecognizer.id]) {
                simultaneous[otherRecognizer.id] = otherRecognizer;
                otherRecognizer.recognizeWith(this);
            }
            return this;
        },

        /**
         * drop the simultaneous link. it doesnt remove the link on the other recognizer.
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        dropRecognizeWith: function (otherRecognizer) {
            if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
                return this;
            }

            otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
            delete this.simultaneous[otherRecognizer.id];
            return this;
        },

        /**
         * recognizer can only run when an other is failing
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        requireFailure: function (otherRecognizer) {
            if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
                return this;
            }

            var requireFail = this.requireFail;
            otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
            if (inArray(requireFail, otherRecognizer) === -1) {
                requireFail.push(otherRecognizer);
                otherRecognizer.requireFailure(this);
            }
            return this;
        },

        /**
         * drop the requireFailure link. it does not remove the link on the other recognizer.
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        dropRequireFailure: function (otherRecognizer) {
            if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
                return this;
            }

            otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
            var index = inArray(this.requireFail, otherRecognizer);
            if (index > -1) {
                this.requireFail.splice(index, 1);
            }
            return this;
        },

        /**
         * has require failures boolean
         * @returns {boolean}
         */
        hasRequireFailures: function () {
            return this.requireFail.length > 0;
        },

        /**
         * if the recognizer can recognize simultaneous with an other recognizer
         * @param {Recognizer} otherRecognizer
         * @returns {Boolean}
         */
        canRecognizeWith: function (otherRecognizer) {
            return !!this.simultaneous[otherRecognizer.id];
        },

        /**
         * You should use `tryEmit` instead of `emit` directly to check
         * that all the needed recognizers has failed before emitting.
         * @param {Object} input
         */
        emit: function (input) {
            var self = this;
            var state = this.state;

            function emit(withState) {
                self.manager.emit(self.options.event + (withState ? stateStr(state) : ''), input);
            }

            // 'panstart' and 'panmove'
            if (state < STATE_ENDED) {
                emit(true);
            }

            emit(); // simple 'eventName' events

            // panend and pancancel
            if (state >= STATE_ENDED) {
                emit(true);
            }
        },

        /**
         * Check that all the require failure recognizers has failed,
         * if true, it emits a gesture event,
         * otherwise, setup the state to FAILED.
         * @param {Object} input
         */
        tryEmit: function (input) {
            if (this.canEmit()) {
                return this.emit(input);
            }
            // it's failing anyway
            this.state = STATE_FAILED;
        },

        /**
         * can we emit?
         * @returns {boolean}
         */
        canEmit: function () {
            var i = 0;
            while (i < this.requireFail.length) {
                if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
                    return false;
                }
                i++;
            }
            return true;
        },

        /**
         * update the recognizer
         * @param {Object} inputData
         */
        recognize: function (inputData) {
            // make a new copy of the inputData
            // so we can change the inputData without messing up the other recognizers
            var inputDataClone = extend({}, inputData);

            // is is enabled and allow recognizing?
            if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
                this.reset();
                this.state = STATE_FAILED;
                return;
            }

            // reset when we've reached the end
            if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
                this.state = STATE_POSSIBLE;
            }

            this.state = this.process(inputDataClone);

            // the recognizer has recognized a gesture
            // so trigger an event
            if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
                this.tryEmit(inputDataClone);
            }
        },

        /**
         * return the state of the recognizer
         * the actual recognizing happens in this method
         * @virtual
         * @param {Object} inputData
         * @returns {Const} STATE
         */
        process: function (inputData) {}, // jshint ignore:line

        /**
         * return the preferred touch-action
         * @virtual
         * @returns {Array}
         */
        getTouchAction: function () {},

        /**
         * called when the gesture isn't allowed to recognize
         * like when another is being recognized or it is disabled
         * @virtual
         */
        reset: function () {}
    };

    /**
     * get a usable string, used as event postfix
     * @param {Const} state
     * @returns {String} state
     */
    function stateStr(state) {
        if (state & STATE_CANCELLED) {
            return 'cancel';
        } else if (state & STATE_ENDED) {
            return 'end';
        } else if (state & STATE_CHANGED) {
            return 'move';
        } else if (state & STATE_BEGAN) {
            return 'start';
        }
        return '';
    }

    /**
     * direction cons to string
     * @param {Const} direction
     * @returns {String}
     */
    function directionStr(direction) {
        if (direction == DIRECTION_DOWN) {
            return 'down';
        } else if (direction == DIRECTION_UP) {
            return 'up';
        } else if (direction == DIRECTION_LEFT) {
            return 'left';
        } else if (direction == DIRECTION_RIGHT) {
            return 'right';
        }
        return '';
    }

    /**
     * get a recognizer by name if it is bound to a manager
     * @param {Recognizer|String} otherRecognizer
     * @param {Recognizer} recognizer
     * @returns {Recognizer}
     */
    function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
        var manager = recognizer.manager;
        if (manager) {
            return manager.get(otherRecognizer);
        }
        return otherRecognizer;
    }

    /**
     * This recognizer is just used as a base for the simple attribute recognizers.
     * @constructor
     * @extends Recognizer
     */
    function AttrRecognizer() {
        Recognizer.apply(this, arguments);
    }

    inherit(AttrRecognizer, Recognizer, {
        /**
         * @namespace
         * @memberof AttrRecognizer
         */
        defaults: {
            /**
             * @type {Number}
             * @default 1
             */
            pointers: 1
        },

        /**
         * Used to check if it the recognizer receives valid input, like input.distance > 10.
         * @memberof AttrRecognizer
         * @param {Object} input
         * @returns {Boolean} recognized
         */
        attrTest: function (input) {
            var optionPointers = this.options.pointers;
            return optionPointers === 0 || input.pointers.length === optionPointers;
        },

        /**
         * Process the input and return the state for the recognizer
         * @memberof AttrRecognizer
         * @param {Object} input
         * @returns {*} State
         */
        process: function (input) {
            var state = this.state;
            var eventType = input.eventType;

            var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
            var isValid = this.attrTest(input);

            // on cancel input and we've recognized before, return STATE_CANCELLED
            if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
                return state | STATE_CANCELLED;
            } else if (isRecognized || isValid) {
                if (eventType & INPUT_END) {
                    return state | STATE_ENDED;
                } else if (!(state & STATE_BEGAN)) {
                    return STATE_BEGAN;
                }
                return state | STATE_CHANGED;
            }
            return STATE_FAILED;
        }
    });

    /**
     * Pan
     * Recognized when the pointer is down and moved in the allowed direction.
     * @constructor
     * @extends AttrRecognizer
     */
    function PanRecognizer() {
        AttrRecognizer.apply(this, arguments);

        this.pX = null;
        this.pY = null;
    }

    inherit(PanRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof PanRecognizer
         */
        defaults: {
            event: 'pan',
            threshold: 10,
            pointers: 1,
            direction: DIRECTION_ALL
        },

        getTouchAction: function () {
            var direction = this.options.direction;
            var actions = [];
            if (direction & DIRECTION_HORIZONTAL) {
                actions.push(TOUCH_ACTION_PAN_Y);
            }
            if (direction & DIRECTION_VERTICAL) {
                actions.push(TOUCH_ACTION_PAN_X);
            }
            return actions;
        },

        directionTest: function (input) {
            var options = this.options;
            var hasMoved = true;
            var distance = input.distance;
            var direction = input.direction;
            var x = input.deltaX;
            var y = input.deltaY;

            // lock to axis?
            if (!(direction & options.direction)) {
                if (options.direction & DIRECTION_HORIZONTAL) {
                    direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                    hasMoved = x != this.pX;
                    distance = Math.abs(input.deltaX);
                } else {
                    direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                    hasMoved = y != this.pY;
                    distance = Math.abs(input.deltaY);
                }
            }
            input.direction = direction;
            return hasMoved && distance > options.threshold && direction & options.direction;
        },

        attrTest: function (input) {
            return AttrRecognizer.prototype.attrTest.call(this, input) && (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
        },

        emit: function (input) {
            this.pX = input.deltaX;
            this.pY = input.deltaY;

            var direction = directionStr(input.direction);
            if (direction) {
                this.manager.emit(this.options.event + direction, input);
            }

            this._super.emit.call(this, input);
        }
    });

    /**
     * Pinch
     * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
     * @constructor
     * @extends AttrRecognizer
     */
    function PinchRecognizer() {
        AttrRecognizer.apply(this, arguments);
    }

    inherit(PinchRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof PinchRecognizer
         */
        defaults: {
            event: 'pinch',
            threshold: 0,
            pointers: 2
        },

        getTouchAction: function () {
            return [TOUCH_ACTION_NONE];
        },

        attrTest: function (input) {
            return this._super.attrTest.call(this, input) && (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
        },

        emit: function (input) {
            this._super.emit.call(this, input);
            if (input.scale !== 1) {
                var inOut = input.scale < 1 ? 'in' : 'out';
                this.manager.emit(this.options.event + inOut, input);
            }
        }
    });

    /**
     * Press
     * Recognized when the pointer is down for x ms without any movement.
     * @constructor
     * @extends Recognizer
     */
    function PressRecognizer() {
        Recognizer.apply(this, arguments);

        this._timer = null;
        this._input = null;
    }

    inherit(PressRecognizer, Recognizer, {
        /**
         * @namespace
         * @memberof PressRecognizer
         */
        defaults: {
            event: 'press',
            pointers: 1,
            time: 500, // minimal time of the pointer to be pressed
            threshold: 5 // a minimal movement is ok, but keep it low
        },

        getTouchAction: function () {
            return [TOUCH_ACTION_AUTO];
        },

        process: function (input) {
            var options = this.options;
            var validPointers = input.pointers.length === options.pointers;
            var validMovement = input.distance < options.threshold;
            var validTime = input.deltaTime > options.time;

            this._input = input;

            // we only allow little movement
            // and we've reached an end event, so a tap is possible
            if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
                this.reset();
            } else if (input.eventType & INPUT_START) {
                this.reset();
                this._timer = setTimeoutContext(function () {
                    this.state = STATE_RECOGNIZED;
                    this.tryEmit();
                }, options.time, this);
            } else if (input.eventType & INPUT_END) {
                return STATE_RECOGNIZED;
            }
            return STATE_FAILED;
        },

        reset: function () {
            clearTimeout(this._timer);
        },

        emit: function (input) {
            if (this.state !== STATE_RECOGNIZED) {
                return;
            }

            if (input && (input.eventType & INPUT_END)) {
                this.manager.emit(this.options.event + 'up', input);
            } else {
                this._input.timeStamp = now();
                this.manager.emit(this.options.event, this._input);
            }
        }
    });

    /**
     * Rotate
     * Recognized when two or more pointer are moving in a circular motion.
     * @constructor
     * @extends AttrRecognizer
     */
    function RotateRecognizer() {
        AttrRecognizer.apply(this, arguments);
    }

    inherit(RotateRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof RotateRecognizer
         */
        defaults: {
            event: 'rotate',
            threshold: 0,
            pointers: 2
        },

        getTouchAction: function () {
            return [TOUCH_ACTION_NONE];
        },

        attrTest: function (input) {
            return this._super.attrTest.call(this, input) && (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
        }
    });

    /**
     * Swipe
     * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
     * @constructor
     * @extends AttrRecognizer
     */
    function SwipeRecognizer() {
        AttrRecognizer.apply(this, arguments);
    }

    inherit(SwipeRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof SwipeRecognizer
         */
        defaults: {
            event: 'swipe',
            threshold: 10,
            velocity: 0.65,
            direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
            pointers: 1
        },

        getTouchAction: function () {
            return PanRecognizer.prototype.getTouchAction.call(this);
        },

        attrTest: function (input) {
            var direction = this.options.direction;
            var velocity;

            if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
                velocity = input.velocity;
            } else if (direction & DIRECTION_HORIZONTAL) {
                velocity = input.velocityX;
            } else if (direction & DIRECTION_VERTICAL) {
                velocity = input.velocityY;
            }

            return this._super.attrTest.call(this, input) && direction & input.direction && input.distance > this.options.threshold && abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
        },

        emit: function (input) {
            var direction = directionStr(input.direction);
            if (direction) {
                this.manager.emit(this.options.event + direction, input);
            }

            this.manager.emit(this.options.event, input);
        }
    });

    /**
     * A tap is ecognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
     * between the given interval and position. The delay option can be used to recognize multi-taps without firing
     * a single tap.
     *
     * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
     * multi-taps being recognized.
     * @constructor
     * @extends Recognizer
     */
    function TapRecognizer() {
        Recognizer.apply(this, arguments);

        // previous time and center,
        // used for tap counting
        this.pTime = false;
        this.pCenter = false;

        this._timer = null;
        this._input = null;
        this.count = 0;
    }

    inherit(TapRecognizer, Recognizer, {
        /**
         * @namespace
         * @memberof PinchRecognizer
         */
        defaults: {
            event: 'tap',
            pointers: 1,
            taps: 1,
            interval: 300, // max time between the multi-tap taps
            time: 250, // max time of the pointer to be down (like finger on the screen)
            threshold: 2, // a minimal movement is ok, but keep it low
            posThreshold: 10 // a multi-tap can be a bit off the initial position
        },

        getTouchAction: function () {
            return [TOUCH_ACTION_MANIPULATION];
        },

        process: function (input) {
            var options = this.options;

            var validPointers = input.pointers.length === options.pointers;
            var validMovement = input.distance < options.threshold;
            var validTouchTime = input.deltaTime < options.time;

            this.reset();

            if ((input.eventType & INPUT_START) && (this.count === 0)) {
                return this.failTimeout();
            }

            // we only allow little movement
            // and we've reached an end event, so a tap is possible
            if (validMovement && validTouchTime && validPointers) {
                if (input.eventType != INPUT_END) {
                    return this.failTimeout();
                }

                var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
                var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

                this.pTime = input.timeStamp;
                this.pCenter = input.center;

                if (!validMultiTap || !validInterval) {
                    this.count = 1;
                } else {
                    this.count += 1;
                }

                this._input = input;

                // if tap count matches we have recognized it,
                // else it has began recognizing...
                var tapCount = this.count % options.taps;
                if (tapCount === 0) {
                    // no failing requirements, immediately trigger the tap event
                    // or wait as long as the multitap interval to trigger
                    if (!this.hasRequireFailures()) {
                        return STATE_RECOGNIZED;
                    } else {
                        this._timer = setTimeoutContext(function () {
                            this.state = STATE_RECOGNIZED;
                            this.tryEmit();
                        }, options.interval, this);
                        return STATE_BEGAN;
                    }
                }
            }
            return STATE_FAILED;
        },

        failTimeout: function () {
            this._timer = setTimeoutContext(function () {
                this.state = STATE_FAILED;
            }, this.options.interval, this);
            return STATE_FAILED;
        },

        reset: function () {
            clearTimeout(this._timer);
        },

        emit: function () {
            if (this.state == STATE_RECOGNIZED) {
                this._input.tapCount = this.count;
                this.manager.emit(this.options.event, this._input);
            }
        }
    });

    /**
     * Simple way to create an manager with a default set of recognizers.
     * @param {HTMLElement} element
     * @param {Object} [options]
     * @constructor
     */
    function Hammer(element, options) {
        options = options || {};
        options.recognizers = ifUndefined(options.recognizers, Hammer.defaults.preset);
        return new Manager(element, options);
    }

    /**
     * @const {string}
     */
    Hammer.VERSION = '2.0.4';

    /**
     * default settings
     * @namespace
     */
    Hammer.defaults = {
        /**
         * set if DOM events are being triggered.
         * But this is slower and unused by simple implementations, so disabled by default.
         * @type {Boolean}
         * @default false
         */
        domEvents: false,

        /**
         * The value for the touchAction property/fallback.
         * When set to `compute` it will magically set the correct value based on the added recognizers.
         * @type {String}
         * @default compute
         */
        touchAction: TOUCH_ACTION_COMPUTE,

        /**
         * @type {Boolean}
         * @default true
         */
        enable: true,

        /**
         * EXPERIMENTAL FEATURE -- can be removed/changed
         * Change the parent input target element.
         * If Null, then it is being set the to main element.
         * @type {Null|EventTarget}
         * @default null
         */
        inputTarget: null,

        /**
         * force an input class
         * @type {Null|Function}
         * @default null
         */
        inputClass: null,

        /**
         * Default recognizer setup when calling `Hammer()`
         * When creating a new Manager these will be skipped.
         * @type {Array}
         */
        preset: [
        // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
        [RotateRecognizer, {
            enable: false
        }],
            [PinchRecognizer, {
                enable: false
            }, ['rotate']],
            [SwipeRecognizer, {
                direction: DIRECTION_HORIZONTAL
            }],
            [PanRecognizer, {
                direction: DIRECTION_HORIZONTAL
            }, ['swipe']],
            [TapRecognizer],
            [TapRecognizer, {
                event: 'doubletap',
                taps: 2
            }, ['tap']],
            [PressRecognizer]
        ],

        /**
         * Some CSS properties can be used to improve the working of Hammer.
         * Add them to this method and they will be set when creating a new Manager.
         * @namespace
         */
        cssProps: {
            /**
             * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
             * @type {String}
             * @default 'none'
             */
            userSelect: 'none',

            /**
             * Disable the Windows Phone grippers when pressing an element.
             * @type {String}
             * @default 'none'
             */
            touchSelect: 'none',

            /**
             * Disables the default callout shown when you touch and hold a touch target.
             * On iOS, when you touch and hold a touch target such as a link, Safari displays
             * a callout containing information about the link. This property allows you to disable that callout.
             * @type {String}
             * @default 'none'
             */
            touchCallout: 'none',

            /**
             * Specifies whether zooming is enabled. Used by IE10>
             * @type {String}
             * @default 'none'
             */
            contentZooming: 'none',

            /**
             * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
             * @type {String}
             * @default 'none'
             */
            userDrag: 'none',

            /**
             * Overrides the highlight color shown when the user taps a link or a JavaScript
             * clickable element in iOS. This property obeys the alpha value, if specified.
             * @type {String}
             * @default 'rgba(0,0,0,0)'
             */
            tapHighlightColor: 'rgba(0,0,0,0)'
        }
    };

    var STOP = 1;
    var FORCED_STOP = 2;

    /**
     * Manager
     * @param {HTMLElement} element
     * @param {Object} [options]
     * @constructor
     */
    function Manager(element, options) {
        options = options || {};

        this.options = merge(options, Hammer.defaults);
        this.options.inputTarget = this.options.inputTarget || element;

        this.handlers = {};
        this.session = {};
        this.recognizers = [];

        this.element = element;
        this.input = createInputInstance(this);
        this.touchAction = new TouchAction(this, this.options.touchAction);

        toggleCssProps(this, true);

        each(options.recognizers, function (item) {
            var recognizer = this.add(new(item[0])(item[1]));
            item[2] && recognizer.recognizeWith(item[2]);
            item[3] && recognizer.requireFailure(item[3]);
        }, this);
    }

    Manager.prototype = {
        /**
         * set options
         * @param {Object} options
         * @returns {Manager}
         */
        set: function (options) {
            extend(this.options, options);

            // Options that need a little more setup
            if (options.touchAction) {
                this.touchAction.update();
            }
            if (options.inputTarget) {
                // Clean up existing event listeners and reinitialize
                this.input.destroy();
                this.input.target = options.inputTarget;
                this.input.init();
            }
            return this;
        },

        /**
         * stop recognizing for this session.
         * This session will be discarded, when a new [input]start event is fired.
         * When forced, the recognizer cycle is stopped immediately.
         * @param {Boolean} [force]
         */
        stop: function (force) {
            this.session.stopped = force ? FORCED_STOP : STOP;
        },

        /**
         * run the recognizers!
         * called by the inputHandler function on every movement of the pointers (touches)
         * it walks through all the recognizers and tries to detect the gesture that is being made
         * @param {Object} inputData
         */
        recognize: function (inputData) {
            var session = this.session;
            if (session.stopped) {
                return;
            }

            // run the touch-action polyfill
            this.touchAction.preventDefaults(inputData);

            var recognizer;
            var recognizers = this.recognizers;

            // this holds the recognizer that is being recognized.
            // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
            // if no recognizer is detecting a thing, it is set to `null`
            var curRecognizer = session.curRecognizer;

            // reset when the last recognizer is recognized
            // or when we're in a new session
            if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
                curRecognizer = session.curRecognizer = null;
            }

            var i = 0;
            while (i < recognizers.length) {
                recognizer = recognizers[i];

                // find out if we are allowed try to recognize the input for this one.
                // 1.   allow if the session is NOT forced stopped (see the .stop() method)
                // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
                //      that is being recognized.
                // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
                //      this can be setup with the `recognizeWith()` method on the recognizer.
                if (session.stopped !== FORCED_STOP && ( // 1
                !curRecognizer || recognizer == curRecognizer || // 2
                recognizer.canRecognizeWith(curRecognizer))) { // 3
                    recognizer.recognize(inputData);
                } else {
                    recognizer.reset();
                }

                // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
                // current active recognizer. but only if we don't already have an active recognizer
                if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                    curRecognizer = session.curRecognizer = recognizer;
                }
                i++;
            }
        },

        /**
         * get a recognizer by its event name.
         * @param {Recognizer|String} recognizer
         * @returns {Recognizer|Null}
         */
        get: function (recognizer) {
            if (recognizer instanceof Recognizer) {
                return recognizer;
            }

            var recognizers = this.recognizers;
            for (var i = 0; i < recognizers.length; i++) {
                if (recognizers[i].options.event == recognizer) {
                    return recognizers[i];
                }
            }
            return null;
        },

        /**
         * add a recognizer to the manager
         * existing recognizers with the same event name will be removed
         * @param {Recognizer} recognizer
         * @returns {Recognizer|Manager}
         */
        add: function (recognizer) {
            if (invokeArrayArg(recognizer, 'add', this)) {
                return this;
            }

            // remove existing
            var existing = this.get(recognizer.options.event);
            if (existing) {
                this.remove(existing);
            }

            this.recognizers.push(recognizer);
            recognizer.manager = this;

            this.touchAction.update();
            return recognizer;
        },

        /**
         * remove a recognizer by name or instance
         * @param {Recognizer|String} recognizer
         * @returns {Manager}
         */
        remove: function (recognizer) {
            if (invokeArrayArg(recognizer, 'remove', this)) {
                return this;
            }

            var recognizers = this.recognizers;
            recognizer = this.get(recognizer);
            recognizers.splice(inArray(recognizers, recognizer), 1);

            this.touchAction.update();
            return this;
        },

        /**
         * bind event
         * @param {String} events
         * @param {Function} handler
         * @returns {EventEmitter} this
         */
        on: function (events, handler) {
            var handlers = this.handlers;
            each(splitStr(events), function (event) {
                handlers[event] = handlers[event] || [];
                handlers[event].push(handler);
            });
            return this;
        },

        /**
         * unbind event, leave emit blank to remove all handlers
         * @param {String} events
         * @param {Function} [handler]
         * @returns {EventEmitter} this
         */
        off: function (events, handler) {
            var handlers = this.handlers;
            each(splitStr(events), function (event) {
                if (!handler) {
                    delete handlers[event];
                } else {
                    handlers[event].splice(inArray(handlers[event], handler), 1);
                }
            });
            return this;
        },

        /**
         * emit event to the listeners
         * @param {String} event
         * @param {Object} data
         */
        emit: function (event, data) {
            // we also want to trigger dom events
            if (this.options.domEvents) {
                triggerDomEvent(event, data);
            }

            // no handlers, so skip it all
            var handlers = this.handlers[event] && this.handlers[event].slice();
            if (!handlers || !handlers.length) {
                return;
            }

            data.type = event;
            data.preventDefault = function () {
                data.srcEvent.preventDefault();
            };

            var i = 0;
            while (i < handlers.length) {
                handlers[i](data);
                i++;
            }
        },

        /**
         * destroy the manager and unbinds all events
         * it doesn't unbind dom events, that is the user own responsibility
         */
        destroy: function () {
            this.element && toggleCssProps(this, false);

            this.handlers = {};
            this.session = {};
            this.input.destroy();
            this.element = null;
        }
    };

    /**
     * add/remove the css properties as defined in manager.options.cssProps
     * @param {Manager} manager
     * @param {Boolean} add
     */
    function toggleCssProps(manager, add) {
        var element = manager.element;
        each(manager.options.cssProps, function (value, name) {
            element.style[prefixed(element.style, name)] = add ? value : '';
        });
    }

    /**
     * trigger dom event
     * @param {String} event
     * @param {Object} data
     */
    function triggerDomEvent(event, data) {
        var gestureEvent = document.createEvent('Event');
        gestureEvent.initEvent(event, true, true);
        gestureEvent.gesture = data;
        data.target.dispatchEvent(gestureEvent);
    }

    extend(Hammer, {
        INPUT_START: INPUT_START,
        INPUT_MOVE: INPUT_MOVE,
        INPUT_END: INPUT_END,
        INPUT_CANCEL: INPUT_CANCEL,

        STATE_POSSIBLE: STATE_POSSIBLE,
        STATE_BEGAN: STATE_BEGAN,
        STATE_CHANGED: STATE_CHANGED,
        STATE_ENDED: STATE_ENDED,
        STATE_RECOGNIZED: STATE_RECOGNIZED,
        STATE_CANCELLED: STATE_CANCELLED,
        STATE_FAILED: STATE_FAILED,

        DIRECTION_NONE: DIRECTION_NONE,
        DIRECTION_LEFT: DIRECTION_LEFT,
        DIRECTION_RIGHT: DIRECTION_RIGHT,
        DIRECTION_UP: DIRECTION_UP,
        DIRECTION_DOWN: DIRECTION_DOWN,
        DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
        DIRECTION_VERTICAL: DIRECTION_VERTICAL,
        DIRECTION_ALL: DIRECTION_ALL,

        Manager: Manager,
        Input: Input,
        TouchAction: TouchAction,

        TouchInput: TouchInput,
        MouseInput: MouseInput,
        PointerEventInput: PointerEventInput,
        TouchMouseInput: TouchMouseInput,
        SingleTouchInput: SingleTouchInput,

        Recognizer: Recognizer,
        AttrRecognizer: AttrRecognizer,
        Tap: TapRecognizer,
        Pan: PanRecognizer,
        Swipe: SwipeRecognizer,
        Pinch: PinchRecognizer,
        Rotate: RotateRecognizer,
        Press: PressRecognizer,

        on: addEventListeners,
        off: removeEventListeners,
        each: each,
        merge: merge,
        extend: extend,
        inherit: inherit,
        bindFn: bindFn,
        prefixed: prefixed
    });

    provide(Hammer);
});

modules.define(
    'chitalka',
    [
        'y-block',
        'jquery',
        'inherit',
        'y-extend',
        'chitalka-ui',
        'hammer',
        'storage'
    ],
    function (
        provide,
        YBlock,
        $,
        inherit,
        extend,
        ChitalkaUI,
        Hammer,
        Storage
    ) {

    var doc = $(document);

    var reportUnimplemented = function (method) {
        throw new Error('UNIMPLEMENTED METHOD: ' + method);
    };

    /**
     * Detect if device is touch
     * @see http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
     */
    var isTouch = function () {
        return 'ontouchstart' in window // works on most browsers 
            || 'onmsgesturechange' in window; // works on ie10
    };

    /**
     * Расширение объекта Math для вычисления медианы массива
     *
     * @param {Array} array
     * @returns {Number} медиана
     */
    Math.median = function (array) {
        if (!array) {
            return;
        }

        var entries = array.length;
        var median;

        if (entries % 2 === 0) {
            median = (array[entries / 2] + array[entries / 2 - 1]) / 2;
        } else {
            median = array[(entries - 1) / 2];
        }

        return median;
    };

    /**
     * Выбирает из массива массив медиан в заданном количестве
     *
     * @param {Array} array
     * @param {Number} q количество
     *
     * @return {Array}
     */
    var limitArrayByMedians = function (array, q) {
        var result = [];

        if (!Array.isArray(array)) {
            return result;
        }
        if (array.length <= q) {
            return array;
        }

        var median = Math.median(array);
        var index = array.indexOf(median);
        var start = Math.round(index - q / 2);

        return array.splice(start, q);
    };

    /**
     * Хэлпер для сортировки массивов чисел
     *
     * @param {Number} a
     * @param {Number} b
     * @returns {Number} 1 - a >=b, else -1
     */
    var numSort = function (a, b) {
        a = parseInt(a, 10);
        b = parseInt(b, 10);

        return a >= b ? 1 : -1;
    };

    var Chitalka = inherit(YBlock, {
        __constructor: function () {
            this.__base.apply(this, arguments);

            var params = extend({
                keyboard: false,
                touch: false,
                controls: false,

                fontSize: [9, 21],

                // Длина свайпа в пикселах
                swipeLength: 20
            }, this._getOptions());

            this._defaultFontSize = 15;
            this._settings = new Storage('settings');

            // Если читалка не доступна, то кидаем событие и больше
            // ничего не делаем
            if (!this._isAvailable()) {
                this.emit('unavailable');

                return;
            }

            if (params.keyboard) {
                this._initKeyboardEvents();
            }

            if (params.touch) {
                isTouch() && this._initTouchEvents();
            }

            this._fontSizeLimits = params.fontSize;

            this._setUpSpeed();
            this._initUI();
        },

        /**
         * Выставить скорость чтения книги
         */
        _setUpSpeed: function () {
            this._speed = Math.median(this._settings.get('speeds')) || 500;
        },

        _isAvailable: function () {
            return false;
        },

        /**
         * Активирует реакцию читалки на события с клавиатуры
         */
        _initKeyboardEvents: function () {
            this._bindTo(doc, 'keydown', this._onKeyDown);
        },

        /**
         * Активирует реакцию читалки на события блока «Controls»
         */
        _initUI: function () {
            this._ui = ChitalkaUI.find(doc).init(this);

            //var controls = Controls.find(this.getDomNode());
        },

        /**
         * Активация обработки тач-событий (в частности события swipe)
         * в функции выполняется навешивание соответствующих событий
         */
        _initTouchEvents: function () {
            this._swiper = new Hammer(this.getDomNode()[0]);

            this._swiper.on('swipe', function(e) {
                var direction = (e.direction === 2)? 'left' : 'right';

                switch (direction) {
                    case 'left': 
                        this.nextPage();
                        break;

                    case 'right': 
                        this.previousPage();
                        break;
                }
            }.bind(this));

        },

        _onKeyDown: function (e) {
            switch (e.keyCode) {
                // Fn + Right
                case 35:
                    this.lastPage();
                    break;

                // Fn + Left
                case 36:
                    this.firstPage();
                    break;

                // Left
                case 37:
                    this.previousPage();
                    e.preventDefault();
                    break;

                // Right
                case 39:
                    this.nextPage();
                    e.preventDefault();
                    break;

                // +
                case 61:
                case 187:
                    this.zoomIn();

                    if (e.metaKey) {
                        e.preventDefault();
                    }
                    break;

                // -
                case 173:
                case 189:
                    this.zoomOut();
                    if (e.metaKey) {
                        e.preventDefault();
                    }
                    break;

                // reset
                case 48:
                    if (e.metaKey) {
                        this.zoomReset();
                    }
                    break;
            }
        },

        /**
         * События перемещения по книге
         */
        firstPage: function () {
            reportUnimplemented('firstPage');
        },
        previousPage: function () {
            reportUnimplemented('previousPage');
        },
        nextPage: function () {
            reportUnimplemented('nextPage');
        },
        lastPage: function () {
            reportUnimplemented('lastPage');
        },

        /**
         * Функция сохранения скорости в аккумулируемый объект
         *
         * @param {Number} speed
         */
        _storeSpeed: function (speed) {
            this._speedAccumulator = this._speedAccumulator || [];

            if (this._speedAccumulator.length > 9) {
                do {
                    this._speedAccumulator.shift();
                } while (this._speedAccumulator.length !== 9);
            }
            this._speedAccumulator.push(speed);

            this._speedAccumulator = this._speedAccumulator.sort(numSort);
        },

        /**
         * Функция проверки скорости и её корректировки
         * общий принцип работы:
         * есть два массива
         *    this._speedAccumulator – аккумулирует чтение текущей книги
         *    speeds, который хранится в сторадже settings – хранит 10 меток скорости для пользователя
         * метки – это медианы, которые всегда вычисляются из аккумулятора
         * как только пользователь прочитывает 10 и более страниц, мы начинаем считать медиану и
         * править speeds и класть туда новую скорость, вычисленную из аккумулятора
         * При этом глобальная скорость чтения значительно изменится только если пользователь прочитает
         * 15 страниц значительно быстрее/медленнее чем раньше.
         * Во всех остальных случаях медиана поменяется совсем незначительно
         */
        _checkSpeed: function () {
            var speedEntries = this._speedAccumulator.length;
            if (speedEntries >= 10) {
                this._speedAccumulator = this._speedAccumulator.sort(numSort);

                var median = Math.median(this._speedAccumulator);

                // Отсекаем совсем неадекватные скорости
                if (median < 100000 && median > 10) {
                    this._speedAccumulator = this._speedAccumulator.sort(numSort);
                    if (!this._settings.get('speeds')) {
                        this._settings.save({
                            speeds: this._speedAccumulator
                        });
                    } else {
                        var speeds = limitArrayByMedians(this._settings.get('speeds'), 10);

                        if (speeds.length < 10) {
                            speeds.push(median);
                        } else {
                            if (median <= speeds[5]) {
                                speeds.pop();
                                speeds.unshift(median);
                            } else {
                                speeds.shift();
                                speeds.push(median);
                            }
                        }
                        speeds = speeds.sort(numSort);

                        this._settings.save({
                            speeds: speeds
                        });
                    }
                    this._speed = Math.median(this._settings.get('speeds'));
                }
            }
        },

        /**
         * Вернуть текущую скорость чтения
         * @returns {Number}
         */
        getSpeed: function () {
            return this._speed;
        },

        /**
         * События зума книги
         */
        zoomIn: function () {
            reportUnimplemented('zoomIn');
        },
        zoomOut: function () {
            reportUnimplemented('zoomOut');
        },
        zoomReset: function () {
            reportUnimplemented('zoomReset');
        }

    });

    provide(Chitalka);
});

modules.define(
    'storage',
    [
        'y-block',
        'jquery',
        'y-extend',
        'inherit'
    ],
    function (
        provide,
        YBlock,
        $,
        extend,
        inherit
        ) {

    var localStorage = window.localStorage;

    var Storage = inherit(YBlock, {
        __constructor: function (storageId) {
            this.__base.apply(this, arguments);

            this._id = storageId;
            this._restore();
        },

        /**
         * Возвращает значение из хранилища
         *
         * @param {String} key ключ хранилища
         *
         * @returns {String} значение
         */
        get: function (key) {
            return this._data && this._data[key];
        },

        /**
         * Удаляет ключ из хранилища
         *
         * @param {String} key
         */
        remove: function (key) {
            delete this._data[key];

            this._save();
        },

        /**
         * Сохранить данные в хранилище
         *
         * @param {String|Object} key ключ сохраняемого или же объект с данными для хранения
         * @param {String} [value] значение параметра для хранения
         */
        save: function (key, value) {
            if (!value && typeof key === 'object') {
                extend(this._data, key);
            } else {
                this._data[key] = value;
            }
            this._save();

        },

        /**
         * Взять данные из storage и наполнить ими текущий объект
         */
        _restore: function () {
            this._data = localStorage.getItem(this._id) || {};

            if (typeof this._data === 'string') {
                try {
                    this._data = JSON.parse(this._data);
                } catch (e) {
                    this._data = {};
                }
            }

            if (typeof this._data !== 'object') {
                this._data = {};
            }
        },

        /**
         * Выполнить сохранение всех данных в localStoarage
         */
        _save: function () {
            localStorage.setItem(this._id, JSON.stringify(this._data));
        }
    }, {
        getBlockName: function () {
            return 'storage';
        }
    });

    provide(Storage);
});

// jshint ignore: start
// jscs:disable

modules.define(
    'unzip',
    [],
    function (
        provide
    ) {

    var zip;
    var ERR_BAD_FORMAT = "File format is not recognized.";
    var ERR_ENCRYPTED = "File contains encrypted entry.";
    var ERR_ZIP64 = "File is using Zip64 (4gb+ file size).";
    var ERR_READ = "Error while reading zip file.";
    var ERR_WRITE = "Error while writing zip file.";
    var ERR_WRITE_DATA = "Error while writing file data.";
    var ERR_READ_DATA = "Error while reading file data.";
    var ERR_DUPLICATED_NAME = "File already exists.";
    var CHUNK_SIZE = 512 * 1024;

    var INFLATE_JS = "inflate.js";
    var DEFLATE_JS = "deflate.js";

    var TEXT_PLAIN = "text/plain";

    var MESSAGE_EVENT = "message";

    var appendABViewSupported;
    try {
        appendABViewSupported = new Blob([new DataView(new ArrayBuffer(0))]).size === 0;
    } catch (e) {}

    function Crc32() {
        var crc = -1,
            that = this;
        that.append = function (data) {
            var offset, table = that.table;
            for (offset = 0; offset < data.length; offset++)
            crc = (crc >>> 8) ^ table[(crc ^ data[offset]) & 0xFF];
        };
        that.get = function () {
            return~crc;
        };
    }
    Crc32.prototype.table = (function () {
        var i, j, t, table = [];
        for (i = 0; i < 256; i++) {
            t = i;
            for (j = 0; j < 8; j++)
            if (t & 1) t = (t >>> 1) ^ 0xEDB88320;
            else t = t >>> 1;
            table[i] = t;
        }
        return table;
    })();

    function blobSlice(blob, index, length) {
        if (blob.slice) return blob.slice(index, index + length);
        else if (blob.webkitSlice) return blob.webkitSlice(index, index + length);
        else if (blob.mozSlice) return blob.mozSlice(index, index + length);
        else if (blob.msSlice) return blob.msSlice(index, index + length);
    }

    function getDataHelper(byteLength, bytes) {
        var dataBuffer, dataArray;
        dataBuffer = new ArrayBuffer(byteLength);
        dataArray = new Uint8Array(dataBuffer);
        if (bytes) dataArray.set(bytes, 0);
        return {
            buffer: dataBuffer,
            array: dataArray,
            view: new DataView(dataBuffer)
        };
    }

    // Readers
    function Reader() {}

    function TextReader(text) {
        var that = this,
            blobReader;

        function init(callback, onerror) {
            var blob = new Blob([text], {
                type: TEXT_PLAIN
            });
            blobReader = new BlobReader(blob);
            blobReader.init(function () {
                that.size = blobReader.size;
                callback();
            }, onerror);
        }

        function readUint8Array(index, length, callback, onerror) {
            blobReader.readUint8Array(index, length, callback, onerror);
        }

        that.size = 0;
        that.init = init;
        that.readUint8Array = readUint8Array;
    }
    TextReader.prototype = new Reader();
    TextReader.prototype.constructor = TextReader;

    function Data64URIReader(dataURI) {
        var that = this,
            dataStart;

        function init(callback) {
            var dataEnd = dataURI.length;
            while (dataURI.charAt(dataEnd - 1) == "=")
            dataEnd--;
            dataStart = dataURI.indexOf(",") + 1;
            that.size = Math.floor((dataEnd - dataStart) * 0.75);
            callback();
        }

        function readUint8Array(index, length, callback) {
            var i, data = getDataHelper(length);
            var start = Math.floor(index / 3) * 4;
            var end = Math.ceil((index + length) / 3) * 4;
            var bytes = window.atob(dataURI.substring(start + dataStart, end + dataStart));
            var delta = index - Math.floor(start / 4) * 3;
            for (i = delta; i < delta + length; i++)
            data.array[i - delta] = bytes.charCodeAt(i);
            callback(data.array);
        }

        that.size = 0;
        that.init = init;
        that.readUint8Array = readUint8Array;
    }
    Data64URIReader.prototype = new Reader();
    Data64URIReader.prototype.constructor = Data64URIReader;

    function BlobReader(blob) {
        var that = this;

        function init(callback) {
            this.size = blob.size;
            callback();
        }

        function readUint8Array(index, length, callback, onerror) {
            var reader = new FileReader();
            reader.onload = function (e) {
                callback(new Uint8Array(e.target.result));
            };
            reader.onerror = onerror;
            reader.readAsArrayBuffer(blobSlice(blob, index, length));
        }

        that.size = 0;
        that.init = init;
        that.readUint8Array = readUint8Array;
    }
    BlobReader.prototype = new Reader();
    BlobReader.prototype.constructor = BlobReader;

    // Writers

    function Writer() {}
    Writer.prototype.getData = function (callback) {
        callback(this.data);
    };

    function TextWriter(encoding) {
        var that = this,
            blob;

        function init(callback) {
            blob = new Blob([], {
                type: TEXT_PLAIN
            });
            callback();
        }

        function writeUint8Array(array, callback) {
            blob = new Blob([blob, appendABViewSupported ? array : array.buffer], {
                type: TEXT_PLAIN
            });
            callback();
        }

        function getData(callback, onerror) {
            var reader = new FileReader();
            reader.onload = function (e) {
                callback(e.target.result);
            };
            reader.onerror = onerror;
            reader.readAsText(blob, encoding);
        }

        that.init = init;
        that.writeUint8Array = writeUint8Array;
        that.getData = getData;
    }
    TextWriter.prototype = new Writer();
    TextWriter.prototype.constructor = TextWriter;

    function Data64URIWriter(contentType) {
        var that = this,
            data = "",
            pending = "";

        function init(callback) {
            data += "data:" + (contentType || "") + ";base64,";
            callback();
        }

        function writeUint8Array(array, callback) {
            var i, delta = pending.length,
                dataString = pending;
            pending = "";
            for (i = 0; i < (Math.floor((delta + array.length) / 3) * 3) - delta; i++)
            dataString += String.fromCharCode(array[i]);
            for (; i < array.length; i++)
            pending += String.fromCharCode(array[i]);
            if (dataString.length > 2) data += window.btoa(dataString);
            else pending = dataString;
            callback();
        }

        function getData(callback) {
            callback(data + window.btoa(pending));
        }

        that.init = init;
        that.writeUint8Array = writeUint8Array;
        that.getData = getData;
    }
    Data64URIWriter.prototype = new Writer();
    Data64URIWriter.prototype.constructor = Data64URIWriter;

    function BlobWriter(contentType) {
        var blob, that = this;

        function init(callback) {
            blob = new Blob([], {
                type: contentType
            });
            callback();
        }

        function writeUint8Array(array, callback) {
            blob = new Blob([blob, appendABViewSupported ? array : array.buffer], {
                type: contentType
            });
            callback();
        }

        function getData(callback) {
            callback(blob);
        }

        that.init = init;
        that.writeUint8Array = writeUint8Array;
        that.getData = getData;
    }
    BlobWriter.prototype = new Writer();
    BlobWriter.prototype.constructor = BlobWriter;

    // inflate/deflate core functions

    function launchWorkerProcess(worker, reader, writer, offset, size, onappend, onprogress, onend, onreaderror, onwriteerror) {
        var chunkIndex = 0,
            index, outputSize;

        function onflush() {
            worker.removeEventListener(MESSAGE_EVENT, onmessage, false);
            onend(outputSize);
        }

        function onmessage(event) {
            var message = event.data,
                data = message.data;

            if (message.onappend) {
                outputSize += data.length;
                writer.writeUint8Array(data, function () {
                    onappend(false, data);
                    step();
                }, onwriteerror);
            }
            if (message.onflush) if (data) {
                outputSize += data.length;
                writer.writeUint8Array(data, function () {
                    onappend(false, data);
                    onflush();
                }, onwriteerror);
            } else onflush();
            if (message.progress && onprogress) onprogress(index + message.current, size);
        }

        function step() {
            index = chunkIndex * CHUNK_SIZE;
            if (index < size) reader.readUint8Array(offset + index, Math.min(CHUNK_SIZE, size - index), function (array) {
                worker.postMessage({
                    append: true,
                    data: array
                });
                chunkIndex++;
                if (onprogress) onprogress(index, size);
                onappend(true, array);
            }, onreaderror);
            else worker.postMessage({
                flush: true
            });
        }

        outputSize = 0;
        worker.addEventListener(MESSAGE_EVENT, onmessage, false);
        step();
    }

    function launchProcess(process, reader, writer, offset, size, onappend, onprogress, onend, onreaderror, onwriteerror) {
        var chunkIndex = 0,
            index, outputSize = 0;

        function step() {
            var outputData;
            index = chunkIndex * CHUNK_SIZE;
            if (index < size) reader.readUint8Array(offset + index, Math.min(CHUNK_SIZE, size - index), function (inputData) {
                var outputData = process.append(inputData, function () {
                    if (onprogress) onprogress(offset + index, size);
                });
                outputSize += outputData.length;
                onappend(true, inputData);
                writer.writeUint8Array(outputData, function () {
                    onappend(false, outputData);
                    chunkIndex++;
                    setTimeout(step, 1);
                }, onwriteerror);
                if (onprogress) onprogress(index, size);
            }, onreaderror);
            else {
                outputData = process.flush();
                if (outputData) {
                    outputSize += outputData.length;
                    writer.writeUint8Array(outputData, function () {
                        onappend(false, outputData);
                        onend(outputSize);
                    }, onwriteerror);
                } else onend(outputSize);
            }
        }

        step();
    }

    function inflate(reader, writer, offset, size, computeCrc32, onend, onprogress, onreaderror, onwriteerror) {
        var worker, crc32 = new Crc32();

        function oninflateappend(sending, array) {
            if (computeCrc32 && !sending) crc32.append(array);
        }

        function oninflateend(outputSize) {
            onend(outputSize, crc32.get());
        }

        if (zip.useWebWorkers) {
            worker = new Worker(zip.workerScriptsPath + INFLATE_JS);
            launchWorkerProcess(worker, reader, writer, offset, size, oninflateappend, onprogress, oninflateend, onreaderror, onwriteerror);
        } else launchProcess(new zip.Inflater(), reader, writer, offset, size, oninflateappend, onprogress, oninflateend, onreaderror, onwriteerror);
        return worker;
    }

    function deflate(reader, writer, level, onend, onprogress, onreaderror, onwriteerror) {
        var worker, crc32 = new Crc32();

        function ondeflateappend(sending, array) {
            if (sending) crc32.append(array);
        }

        function ondeflateend(outputSize) {
            onend(outputSize, crc32.get());
        }

        function onmessage() {
            worker.removeEventListener(MESSAGE_EVENT, onmessage, false);
            launchWorkerProcess(worker, reader, writer, 0, reader.size, ondeflateappend, onprogress, ondeflateend, onreaderror, onwriteerror);
        }

        if (zip.useWebWorkers) {
            worker = new Worker(zip.workerScriptsPath + DEFLATE_JS);
            worker.addEventListener(MESSAGE_EVENT, onmessage, false);
            worker.postMessage({
                init: true,
                level: level
            });
        } else launchProcess(new zip.Deflater(), reader, writer, 0, reader.size, ondeflateappend, onprogress, ondeflateend, onreaderror, onwriteerror);
        return worker;
    }

    function copy(reader, writer, offset, size, computeCrc32, onend, onprogress, onreaderror, onwriteerror) {
        var chunkIndex = 0,
            crc32 = new Crc32();

        function step() {
            var index = chunkIndex * CHUNK_SIZE;
            if (index < size) reader.readUint8Array(offset + index, Math.min(CHUNK_SIZE, size - index), function (array) {
                if (computeCrc32) crc32.append(array);
                if (onprogress) onprogress(index, size, array);
                writer.writeUint8Array(array, function () {
                    chunkIndex++;
                    step();
                }, onwriteerror);
            }, onreaderror);
            else onend(size, crc32.get());
        }

        step();
    }

    // ZipReader

    function decodeASCII(str) {
        var i, out = "",
            charCode, extendedASCII = ['Ç', 'ü', 'é', 'â', 'ä', 'à', 'å', 'ç', 'ê', 'ë',
                'è', 'ï', 'î', 'ì', 'Ä', 'Å', 'É', 'æ', 'Æ', 'ô', 'ö', 'ò', 'û', 'ù',
                'ÿ', 'Ö', 'Ü', 'ø', '£', 'Ø', '×', 'ƒ', 'á', 'í', 'ó', 'ú', 'ñ', 'Ñ',
                'ª', 'º', '¿', '®', '¬', '½', '¼', '¡', '«', '»', '_', '_', '_', '¦', '¦',
                'Á', 'Â', 'À', '©', '¦', '¦', '+', '+', '¢', '¥', '+', '+', '-', '-', '+', '-', '+', 'ã',
                'Ã', '+', '+', '-', '-', '¦', '-', '+', '¤', 'ð', 'Ð', 'Ê', 'Ë', 'È', 'i', 'Í', 'Î',
                'Ï', '+', '+', '_', '_', '¦', 'Ì', '_', 'Ó', 'ß', 'Ô', 'Ò', 'õ', 'Õ', 'µ', 'þ',
                'Þ', 'Ú', 'Û', 'Ù', 'ý', 'Ý', '¯', '´', '­', '±', '_', '¾', '¶', '§',
                '÷', '¸', '°', '¨', '·', '¹', '³', '²', '_', ' '];
        for (i = 0; i < str.length; i++) {
            charCode = str.charCodeAt(i) & 0xFF;
            if (charCode > 127) out += extendedASCII[charCode - 128];
            else out += String.fromCharCode(charCode);
        }
        return out;
    }

    function decodeUTF8(string) {
        return decodeURIComponent(escape(string));
    }

    function getString(bytes) {
        var i, str = "";
        for (i = 0; i < bytes.length; i++)
        str += String.fromCharCode(bytes[i]);
        return str;
    }

    function getDate(timeRaw) {
        var date = (timeRaw & 0xffff0000) >> 16,
            time = timeRaw & 0x0000ffff;
        try {
            return new Date(1980 + ((date & 0xFE00) >> 9), ((date & 0x01E0) >> 5) - 1, date & 0x001F, (time & 0xF800) >> 11, (time & 0x07E0) >> 5, (time & 0x001F) * 2, 0);
        } catch (e) {}
    }

    function readCommonHeader(entry, data, index, centralDirectory, onerror) {
        entry.version = data.view.getUint16(index, true);
        entry.bitFlag = data.view.getUint16(index + 2, true);
        entry.compressionMethod = data.view.getUint16(index + 4, true);
        entry.lastModDateRaw = data.view.getUint32(index + 6, true);
        entry.lastModDate = getDate(entry.lastModDateRaw);
        if ((entry.bitFlag & 0x01) === 0x01) {
            onerror(ERR_ENCRYPTED);
            return;
        }
        if (centralDirectory || (entry.bitFlag & 0x0008) != 0x0008) {
            entry.crc32 = data.view.getUint32(index + 10, true);
            entry.compressedSize = data.view.getUint32(index + 14, true);
            entry.uncompressedSize = data.view.getUint32(index + 18, true);
        }
        if (entry.compressedSize === 0xFFFFFFFF || entry.uncompressedSize === 0xFFFFFFFF) {
            onerror(ERR_ZIP64);
            return;
        }
        entry.filenameLength = data.view.getUint16(index + 22, true);
        entry.extraFieldLength = data.view.getUint16(index + 24, true);
    }

    function createZipReader(reader, onerror) {
        function Entry() {}

        Entry.prototype.getData = function (writer, onend, onprogress, checkCrc32) {
            var that = this,
                worker;

            function terminate(callback, param) {
                if (worker) worker.terminate();
                worker = null;
                if (callback) callback(param);
            }

            function testCrc32(crc32) {
                var dataCrc32 = getDataHelper(4);
                dataCrc32.view.setUint32(0, crc32);
                return that.crc32 == dataCrc32.view.getUint32(0);
            }

            function getWriterData(uncompressedSize, crc32) {
                if (checkCrc32 && !testCrc32(crc32)) onreaderror();
                else writer.getData(function (data) {
                    terminate(onend, data);
                });
            }

            function onreaderror() {
                terminate(onerror, ERR_READ_DATA);
            }

            function onwriteerror() {
                terminate(onerror, ERR_WRITE_DATA);
            }

            reader.readUint8Array(that.offset, 30, function (bytes) {
                var data = getDataHelper(bytes.length, bytes),
                    dataOffset;
                if (data.view.getUint32(0) != 0x504b0304) {
                    onerror(ERR_BAD_FORMAT);
                    return;
                }
                readCommonHeader(that, data, 4, false, onerror);
                dataOffset = that.offset + 30 + that.filenameLength + that.extraFieldLength;
                writer.init(function () {
                    if (that.compressionMethod === 0) copy(reader, writer, dataOffset, that.compressedSize, checkCrc32, getWriterData, onprogress, onreaderror, onwriteerror);
                    else worker = inflate(reader, writer, dataOffset, that.compressedSize, checkCrc32, getWriterData, onprogress, onreaderror, onwriteerror);
                }, onwriteerror);
            }, onreaderror);
        };

        function seekEOCDR(offset, entriesCallback) {
            reader.readUint8Array(reader.size - offset, offset, function (bytes) {
                var dataView = getDataHelper(bytes.length, bytes).view;
                if (dataView.getUint32(0) != 0x504b0506) {
                    seekEOCDR(offset + 1, entriesCallback);
                } else {
                    entriesCallback(dataView);
                }
            }, function () {
                onerror(ERR_READ);
            });
        }

        return {
            getEntries: function (callback) {
                if (reader.size < 22) {
                    onerror(ERR_BAD_FORMAT);
                    return;
                }
                // look for End of central directory record
                seekEOCDR(22, function (dataView) {
                    var datalength, fileslength;
                    datalength = dataView.getUint32(16, true);
                    fileslength = dataView.getUint16(8, true);
                    reader.readUint8Array(datalength, reader.size - datalength, function (bytes) {
                        var i, index = 0,
                            entries = [],
                            entry, filename, comment, data = getDataHelper(bytes.length, bytes);
                        for (i = 0; i < fileslength; i++) {
                            entry = new Entry();
                            if (data.view.getUint32(index) != 0x504b0102) {
                                onerror(ERR_BAD_FORMAT);
                                return;
                            }
                            readCommonHeader(entry, data, index + 6, true, onerror);
                            entry.commentLength = data.view.getUint16(index + 32, true);
                            entry.directory = ((data.view.getUint8(index + 38) & 0x10) == 0x10);
                            entry.offset = data.view.getUint32(index + 42, true);
                            filename = getString(data.array.subarray(index + 46, index + 46 + entry.filenameLength));
                            entry.filename = ((entry.bitFlag & 0x0800) === 0x0800) ? decodeUTF8(filename) : decodeASCII(filename);
                            if (!entry.directory && entry.filename.charAt(entry.filename.length - 1) == "/") entry.directory = true;
                            comment = getString(data.array.subarray(index + 46 + entry.filenameLength + entry.extraFieldLength, index + 46 + entry.filenameLength + entry.extraFieldLength + entry.commentLength));
                            entry.comment = ((entry.bitFlag & 0x0800) === 0x0800) ? decodeUTF8(comment) : decodeASCII(comment);
                            entries.push(entry);
                            index += 46 + entry.filenameLength + entry.extraFieldLength + entry.commentLength;
                        }
                        callback(entries);
                    }, function () {
                        onerror(ERR_READ);
                    });
                });
            },
            close: function (callback) {
                if (callback) callback();
            }
        };
    }

    // ZipWriter

    function encodeUTF8(string) {
        return unescape(encodeURIComponent(string));
    }

    function getBytes(str) {
        var i, array = [];
        for (i = 0; i < str.length; i++)
        array.push(str.charCodeAt(i));
        return array;
    }

    function createZipWriter(writer, onerror, dontDeflate) {
        var worker, files = {}, filenames = [],
            datalength = 0;

        function terminate(callback, message) {
            if (worker) worker.terminate();
            worker = null;
            if (callback) callback(message);
        }

        function onwriteerror() {
            terminate(onerror, ERR_WRITE);
        }

        function onreaderror() {
            terminate(onerror, ERR_READ_DATA);
        }

        return {
            add: function (name, reader, onend, onprogress, options) {
                var header, filename, date;

                function writeHeader(callback) {
                    var data;
                    date = options.lastModDate || new Date();
                    header = getDataHelper(26);
                    files[name] = {
                        headerArray: header.array,
                        directory: options.directory,
                        filename: filename,
                        offset: datalength,
                        comment: getBytes(encodeUTF8(options.comment || ""))
                    };
                    header.view.setUint32(0, 0x14000808);
                    if (options.version) header.view.setUint8(0, options.version);
                    if (!dontDeflate && options.level !== 0 && !options.directory) header.view.setUint16(4, 0x0800);
                    header.view.setUint16(6, (((date.getHours() << 6) | date.getMinutes()) << 5) | date.getSeconds() / 2, true);
                    header.view.setUint16(8, ((((date.getFullYear() - 1980) << 4) | (date.getMonth() + 1)) << 5) | date.getDate(), true);
                    header.view.setUint16(22, filename.length, true);
                    data = getDataHelper(30 + filename.length);
                    data.view.setUint32(0, 0x504b0304);
                    data.array.set(header.array, 4);
                    data.array.set(filename, 30);
                    datalength += data.array.length;
                    writer.writeUint8Array(data.array, callback, onwriteerror);
                }

                function writeFooter(compressedLength, crc32) {
                    var footer = getDataHelper(16);
                    datalength += compressedLength || 0;
                    footer.view.setUint32(0, 0x504b0708);
                    if (typeof crc32 != "undefined") {
                        header.view.setUint32(10, crc32, true);
                        footer.view.setUint32(4, crc32, true);
                    }
                    if (reader) {
                        footer.view.setUint32(8, compressedLength, true);
                        header.view.setUint32(14, compressedLength, true);
                        footer.view.setUint32(12, reader.size, true);
                        header.view.setUint32(18, reader.size, true);
                    }
                    writer.writeUint8Array(footer.array, function () {
                        datalength += 16;
                        terminate(onend);
                    }, onwriteerror);
                }

                function writeFile() {
                    options = options || {};
                    name = name.trim();
                    if (options.directory && name.charAt(name.length - 1) != "/") name += "/";
                    if (files.hasOwnProperty(name)) {
                        onerror(ERR_DUPLICATED_NAME);
                        return;
                    }
                    filename = getBytes(encodeUTF8(name));
                    filenames.push(name);
                    writeHeader(function () {
                        if (reader) if (dontDeflate || options.level === 0) copy(reader, writer, 0, reader.size, true, writeFooter, onprogress, onreaderror, onwriteerror);
                        else worker = deflate(reader, writer, options.level, writeFooter, onprogress, onreaderror, onwriteerror);
                        else writeFooter();
                    }, onwriteerror);
                }

                if (reader) reader.init(writeFile, onreaderror);
                else writeFile();
            },
            close: function (callback) {
                var data, length = 0,
                    index = 0,
                    indexFilename, file;
                for (indexFilename = 0; indexFilename < filenames.length; indexFilename++) {
                    file = files[filenames[indexFilename]];
                    length += 46 + file.filename.length + file.comment.length;
                }
                data = getDataHelper(length + 22);
                for (indexFilename = 0; indexFilename < filenames.length; indexFilename++) {
                    file = files[filenames[indexFilename]];
                    data.view.setUint32(index, 0x504b0102);
                    data.view.setUint16(index + 4, 0x1400);
                    data.array.set(file.headerArray, index + 6);
                    data.view.setUint16(index + 32, file.comment.length, true);
                    if (file.directory) data.view.setUint8(index + 38, 0x10);
                    data.view.setUint32(index + 42, file.offset, true);
                    data.array.set(file.filename, index + 46);
                    data.array.set(file.comment, index + 46 + file.filename.length);
                    index += 46 + file.filename.length + file.comment.length;
                }
                data.view.setUint32(index, 0x504b0506);
                data.view.setUint16(index + 8, filenames.length, true);
                data.view.setUint16(index + 10, filenames.length, true);
                data.view.setUint32(index + 12, length, true);
                data.view.setUint32(index + 16, datalength, true);
                writer.writeUint8Array(data.array, function () {
                    terminate(function () {
                        writer.getData(callback);
                    });
                }, onwriteerror);
            }
        };
    }

    zip = {
        Reader: Reader,
        Writer: Writer,
        BlobReader: BlobReader,
        Data64URIReader: Data64URIReader,
        TextReader: TextReader,
        BlobWriter: BlobWriter,
        Data64URIWriter: Data64URIWriter,
        TextWriter: TextWriter,
        createReader: function (reader, callback, onerror) {
            reader.init(function () {
                callback(createZipReader(reader, onerror));
            }, onerror);
        },
        createWriter: function (writer, callback, onerror, dontDeflate) {
            writer.init(function () {
                callback(createZipWriter(writer, onerror, dontDeflate));
            }, onerror);
        },
        workerScriptsPath: "",
        useWebWorkers: true
    };
    /*
     Copyright (c) 2013 Gildas Lormeau. All rights reserved.

     Redistribution and use in source and binary forms, with or without
     modification, are permitted provided that the following conditions are met:

     1. Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in
     the documentation and/or other materials provided with the distribution.

     3. The names of the authors may not be used to endorse or promote products
     derived from this software without specific prior written permission.

     THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
     INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
     FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
     INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
     INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
     LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
     OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
     LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
     NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
     EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     */

    (function () {

        var ERR_HTTP_RANGE = "HTTP Range not supported.";

        var Reader = zip.Reader;
        var Writer = zip.Writer;

        var ZipDirectoryEntry;

        var appendABViewSupported;
        try {
            appendABViewSupported = new Blob([new DataView(new ArrayBuffer(0))]).size === 0;
        } catch (e) {}

        function HttpReader(url) {
            var that = this;

            function getData(callback, onerror) {
                var request;
                if (!that.data) {
                    request = new XMLHttpRequest();
                    request.addEventListener("load", function (data) {
                        // При 500-ка не срабатывает error - триггерим руками
                        if (data.target.status >= 500) {
                            onerror();
                            return;
                        }

                        if (!that.size) that.size = Number(request.getResponseHeader("Content-Length"));
                        that.data = new Uint8Array(request.response);
                        callback();
                    }, false);
                    request.addEventListener("error", onerror, false);
                    request.open("GET", url);
                    request.responseType = "arraybuffer";
                    request.send();
                } else callback();
            }

            function init(callback, onerror) {
                var request = new XMLHttpRequest();
                request.addEventListener("load", function (data) {
                    // При 500-ка не срабатывает error - триггерим руками
                    if (data.target.status >= 500) {
                        onerror();
                        return;
                    }

                    that.size = Number(request.getResponseHeader("Content-Length"));
                    callback();
                }, false);
                request.addEventListener("error", onerror, false);
                request.open("HEAD", url);
                request.send();
            }

            function readUint8Array(index, length, callback, onerror) {
                getData(function () {
                    callback(new Uint8Array(that.data.subarray(index, index + length)));
                }, onerror);
            }

            that.size = 0;
            that.init = init;
            that.readUint8Array = readUint8Array;
        }
        HttpReader.prototype = new Reader();
        HttpReader.prototype.constructor = HttpReader;

        function HttpRangeReader(url) {
            var that = this;

            function init(callback, onerror) {
                var request = new XMLHttpRequest();
                request.addEventListener("load", function () {
                    that.size = Number(request.getResponseHeader("Content-Length"));
                    if (request.getResponseHeader("Accept-Ranges") == "bytes") callback();
                    else onerror(ERR_HTTP_RANGE);
                }, false);
                request.addEventListener("error", onerror, false);
                request.open("HEAD", url);
                request.send();
            }

            function readArrayBuffer(index, length, callback, onerror) {
                var request = new XMLHttpRequest();
                request.open("GET", url);
                request.responseType = "arraybuffer";
                request.setRequestHeader("Range", "bytes=" + index + "-" + (index + length - 1));
                request.addEventListener("load", function () {
                    callback(request.response);
                }, false);
                request.addEventListener("error", onerror, false);
                request.send();
            }

            function readUint8Array(index, length, callback, onerror) {
                readArrayBuffer(index, length, function (arraybuffer) {
                    callback(new Uint8Array(arraybuffer));
                }, onerror);
            }

            that.size = 0;
            that.init = init;
            that.readUint8Array = readUint8Array;
        }
        HttpRangeReader.prototype = new Reader();
        HttpRangeReader.prototype.constructor = HttpRangeReader;

        function ArrayBufferReader(arrayBuffer) {
            var that = this;

            function init(callback, onerror) {
                that.size = arrayBuffer.byteLength;
                callback();
            }

            function readUint8Array(index, length, callback, onerror) {
                callback(new Uint8Array(arrayBuffer.slice(index, index + length)));
            }

            that.size = 0;
            that.init = init;
            that.readUint8Array = readUint8Array;
        }
        ArrayBufferReader.prototype = new Reader();
        ArrayBufferReader.prototype.constructor = ArrayBufferReader;

        function ArrayBufferWriter() {
            var array, that = this;

            function init(callback, onerror) {
                array = new Uint8Array();
                callback();
            }

            function writeUint8Array(arr, callback, onerror) {
                var tmpArray = new Uint8Array(array.length + arr.length);
                tmpArray.set(array);
                tmpArray.set(arr, array.length);
                array = tmpArray;
                callback();
            }

            function getData(callback) {
                callback(array.buffer);
            }

            that.init = init;
            that.writeUint8Array = writeUint8Array;
            that.getData = getData;
        }
        ArrayBufferWriter.prototype = new Writer();
        ArrayBufferWriter.prototype.constructor = ArrayBufferWriter;

        function FileWriter(fileEntry, contentType) {
            var writer, that = this;

            function init(callback, onerror) {
                fileEntry.createWriter(function (fileWriter) {
                    writer = fileWriter;
                    callback();
                }, onerror);
            }

            function writeUint8Array(array, callback, onerror) {
                var blob = new Blob([appendABViewSupported ? array : array.buffer], {
                    type: contentType
                });
                writer.onwrite = function () {
                    writer.onwrite = null;
                    callback();
                };
                writer.onerror = onerror;
                writer.write(blob);
            }

            function getData(callback) {
                fileEntry.file(callback);
            }

            that.init = init;
            that.writeUint8Array = writeUint8Array;
            that.getData = getData;
        }
        FileWriter.prototype = new Writer();
        FileWriter.prototype.constructor = FileWriter;

        zip.FileWriter = FileWriter;
        zip.HttpReader = HttpReader;
        zip.HttpRangeReader = HttpRangeReader;
        zip.ArrayBufferReader = ArrayBufferReader;
        zip.ArrayBufferWriter = ArrayBufferWriter;

        if (zip.fs) {
            ZipDirectoryEntry = zip.fs.ZipDirectoryEntry;
            ZipDirectoryEntry.prototype.addHttpContent = function (name, URL, useRangeHeader) {
                function addChild(parent, name, params, directory) {
                    if (parent.directory) return directory ? new ZipDirectoryEntry(parent.fs, name, params, parent) : new zip.fs.ZipFileEntry(parent.fs, name, params, parent);
                    else throw "Parent entry is not a directory.";
                }

                return addChild(this, name, {
                    data: URL,
                    Reader: useRangeHeader ? HttpRangeReader : HttpReader
                });
            };
            ZipDirectoryEntry.prototype.importHttpContent = function (URL, useRangeHeader, onend, onerror) {
                this.importZip(useRangeHeader ? new HttpRangeReader(URL) : new HttpReader(URL), onend, onerror);
            };
            zip.fs.FS.prototype.importHttpContent = function (URL, useRangeHeader, onend, onerror) {
                this.entries = [];
                this.root = new ZipDirectoryEntry(this);
                this.root.importHttpContent(URL, useRangeHeader, onend, onerror);
            };
        }

    })();

    provide(zip);
});

// jshint ignore: start
// jscs:disable

var _gsScope = (typeof (module) !== "undefined" && module.exports && typeof (global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(_gsScope._gsQueue || (_gsScope._gsQueue = [])).push(function () {

    "use strict";

    _gsScope._gsDefine("plugins.CSSPlugin", ["plugins.TweenPlugin", "TweenLite"], function (TweenPlugin, TweenLite) {

        /** @constructor **/
        var CSSPlugin = function () {
            TweenPlugin.call(this, "css");
            this._overwriteProps.length = 0;
            this.setRatio = CSSPlugin.prototype.setRatio; //speed optimization (avoid prototype lookup on this "hot" method)
        },
        _globals = _gsScope._gsDefine.globals,
            _hasPriority, //turns true whenever a CSSPropTween instance is created that has a priority other than 0. This helps us discern whether or not we should spend the time organizing the linked list or not after a CSSPlugin's _onInitTween() method is called.
            _suffixMap, //we set this in _onInitTween() each time as a way to have a persistent variable we can use in other methods like _parse() without having to pass it around as a parameter and we keep _parse() decoupled from a particular CSSPlugin instance
            _cs, //computed style (we store this in a shared variable to conserve memory and make minification tighter
            _overwriteProps, //alias to the currently instantiating CSSPlugin's _overwriteProps array. We use this closure in order to avoid having to pass a reference around from method to method and aid in minification.
            _specialProps = {},
            p = CSSPlugin.prototype = new TweenPlugin("css");

        p.constructor = CSSPlugin;
        CSSPlugin.version = "1.15.0";
        CSSPlugin.API = 2;
        CSSPlugin.defaultTransformPerspective = 0;
        CSSPlugin.defaultSkewType = "compensated";
        p = "px"; //we'll reuse the "p" variable to keep file size down
        CSSPlugin.suffixMap = {
            top: p,
            right: p,
            bottom: p,
            left: p,
            width: p,
            height: p,
            fontSize: p,
            padding: p,
            margin: p,
            perspective: p,
            lineHeight: ""
        };


        var _numExp = /(?:\d|\-\d|\.\d|\-\.\d)+/g,
            _relNumExp = /(?:\d|\-\d|\.\d|\-\.\d|\+=\d|\-=\d|\+=.\d|\-=\.\d)+/g,
            _valuesExp = /(?:\+=|\-=|\-|\b)[\d\-\.]+[a-zA-Z0-9]*(?:%|\b)/gi, //finds all the values that begin with numbers or += or -= and then a number. Includes suffixes. We use this to split complex values apart like "1px 5px 20px rgb(255,102,51)"
            _NaNExp = /(?![+-]?\d*\.?\d+|[+-]|e[+-]\d+)[^0-9]/g, //also allows scientific notation and doesn't kill the leading -/+ in -= and +=
            _suffixExp = /(?:\d|\-|\+|=|#|\.)*/g,
            _opacityExp = /opacity *= *([^)]*)/i,
            _opacityValExp = /opacity:([^;]*)/i,
            _alphaFilterExp = /alpha\(opacity *=.+?\)/i,
            _rgbhslExp = /^(rgb|hsl)/,
            _capsExp = /([A-Z])/g,
            _camelExp = /-([a-z])/gi,
            _urlExp = /(^(?:url\(\"|url\())|(?:(\"\))$|\)$)/gi, //for pulling out urls from url(...) or url("...") strings (some browsers wrap urls in quotes, some don't when reporting things like backgroundImage)
            _camelFunc = function (s, g) {
                return g.toUpperCase();
            },
            _horizExp = /(?:Left|Right|Width)/i,
            _ieGetMatrixExp = /(M11|M12|M21|M22)=[\d\-\.e]+/gi,
            _ieSetMatrixExp = /progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,
            _commasOutsideParenExp = /,(?=[^\)]*(?:\(|$))/gi, //finds any commas that are not within parenthesis
            _DEG2RAD = Math.PI / 180,
            _RAD2DEG = 180 / Math.PI,
            _forcePT = {},
            _doc = document,
            _createElement = function (type) {
                return _doc.createElementNS ? _doc.createElementNS("http://www.w3.org/1999/xhtml", type) : _doc.createElement(type);
            },
            _tempDiv = _createElement("div"),
            _tempImg = _createElement("img"),
            _internals = CSSPlugin._internals = {
                _specialProps: _specialProps
            }, //provides a hook to a few internal methods that we need to access from inside other plugins
            _agent = navigator.userAgent,
            _autoRound,
            _reqSafariFix, //we won't apply the Safari transform fix until we actually come across a tween that affects a transform property (to maintain best performance).

            _isSafari,
            _isFirefox, //Firefox has a bug that causes 3D transformed elements to randomly disappear unless a repaint is forced after each update on each element.
            _isSafariLT6, //Safari (and Android 4 which uses a flavor of Safari) has a bug that prevents changes to "top" and "left" properties from rendering properly if changed on the same frame as a transform UNLESS we set the element's WebkitBackfaceVisibility to hidden (weird, I know). Doing this for Android 3 and earlier seems to actually cause other problems, though (fun!)
            _ieVers,
            _supportsOpacity = (function () { //we set _isSafari, _ieVers, _isFirefox, and _supportsOpacity all in one function here to reduce file size slightly, especially in the minified version.
                var i = _agent.indexOf("Android"),
                    a = _createElement("a");
                _isSafari = (_agent.indexOf("Safari") !== -1 && _agent.indexOf("Chrome") === -1 && (i === -1 || Number(_agent.substr(i + 8, 1)) > 3));
                _isSafariLT6 = (_isSafari && (Number(_agent.substr(_agent.indexOf("Version/") + 8, 1)) < 6));
                _isFirefox = (_agent.indexOf("Firefox") !== -1);
                if ((/MSIE ([0-9]{1,}[\.0-9]{0,})/).exec(_agent) || (/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/).exec(_agent)) {
                    _ieVers = parseFloat(RegExp.$1);
                }
                if (!a) {
                    return false;
                }
                a.style.cssText = "top:1px;opacity:.55;";
                return /^0.55/.test(a.style.opacity);
            }()),
            _getIEOpacity = function (v) {
                return (_opacityExp.test(((typeof (v) === "string") ? v : (v.currentStyle ? v.currentStyle.filter : v.style.filter) || "")) ? (parseFloat(RegExp.$1) / 100) : 1);
            },
            _log = function (s) { //for logging messages, but in a way that won't throw errors in old versions of IE.
                if (window.console) {
                    console.log(s);
                }
            },

            _prefixCSS = "", //the non-camelCase vendor prefix like "-o-", "-moz-", "-ms-", or "-webkit-"
            _prefix = "", //camelCase vendor prefix like "O", "ms", "Webkit", or "Moz".

            // @private feed in a camelCase property name like "transform" and it will check to see if it is valid as-is or if it needs a vendor prefix. It returns the corrected camelCase property name (i.e. "WebkitTransform" or "MozTransform" or "transform" or null if no such property is found, like if the browser is IE8 or before, "transform" won't be found at all)
            _checkPropPrefix = function (p, e) {
                e = e || _tempDiv;
                var s = e.style,
                    a, i;
                if (s[p] !== undefined) {
                    return p;
                }
                p = p.charAt(0).toUpperCase() + p.substr(1);
                a = ["O", "Moz", "ms", "Ms", "Webkit"];
                i = 5;
                while (--i > -1 && s[a[i] + p] === undefined) {}
                if (i >= 0) {
                    _prefix = (i === 3) ? "ms" : a[i];
                    _prefixCSS = "-" + _prefix.toLowerCase() + "-";
                    return _prefix + p;
                }
                return null;
            },

            _getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function () {},

            /**
             * @private Returns the css style for a particular property of an element. For example, to get whatever the current "left" css value for an element with an ID of "myElement", you could do:
             * var currentLeft = CSSPlugin.getStyle( document.getElementById("myElement"), "left");
             *
             * @param {!Object} t Target element whose style property you want to query
             * @param {!string} p Property name (like "left" or "top" or "marginTop", etc.)
             * @param {Object=} cs Computed style object. This just provides a way to speed processing if you're going to get several properties on the same element in quick succession - you can reuse the result of the getComputedStyle() call.
             * @param {boolean=} calc If true, the value will not be read directly from the element's "style" property (if it exists there), but instead the getComputedStyle() result will be used. This can be useful when you want to ensure that the browser itself is interpreting the value.
             * @param {string=} dflt Default value that should be returned in the place of null, "none", "auto" or "auto auto".
             * @return {?string} The current property value
             */
            _getStyle = CSSPlugin.getStyle = function (t, p, cs, calc, dflt) {
                var rv;
                if (!_supportsOpacity) if (p === "opacity") { //several versions of IE don't use the standard "opacity" property - they use things like filter:alpha(opacity=50), so we parse that here.
                    return _getIEOpacity(t);
                }
                if (!calc && t.style[p]) {
                    rv = t.style[p];
                } else if ((cs = cs || _getComputedStyle(t))) {
                    rv = cs[p] || cs.getPropertyValue(p) || cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
                } else if (t.currentStyle) {
                    rv = t.currentStyle[p];
                }
                return (dflt != null && (!rv || rv === "none" || rv === "auto" || rv === "auto auto")) ? dflt : rv;
            },

            /**
             * @private Pass the target element, the property name, the numeric value, and the suffix (like "%", "em", "px", etc.) and it will spit back the equivalent pixel number.
             * @param {!Object} t Target element
             * @param {!string} p Property name (like "left", "top", "marginLeft", etc.)
             * @param {!number} v Value
             * @param {string=} sfx Suffix (like "px" or "%" or "em")
             * @param {boolean=} recurse If true, the call is a recursive one. In some browsers (like IE7/8), occasionally the value isn't accurately reported initially, but if we run the function again it will take effect.
             * @return {number} value in pixels
             */
            _convertToPixels = _internals.convertToPixels = function (t, p, v, sfx, recurse) {
                if (sfx === "px" || !sfx) {
                    return v;
                }
                if (sfx === "auto" || !v) {
                    return 0;
                }
                var horiz = _horizExp.test(p),
                    node = t,
                    style = _tempDiv.style,
                    neg = (v < 0),
                    pix, cache, time;
                if (neg) {
                    v = -v;
                }
                if (sfx === "%" && p.indexOf("border") !== -1) {
                    pix = (v / 100) * (horiz ? t.clientWidth : t.clientHeight);
                } else {
                    style.cssText = "border:0 solid red;position:" + _getStyle(t, "position") + ";line-height:0;";
                    if (sfx === "%" || !node.appendChild) {
                        node = t.parentNode || _doc.body;
                        cache = node._gsCache;
                        time = TweenLite.ticker.frame;
                        if (cache && horiz && cache.time === time) { //performance optimization: we record the width of elements along with the ticker frame so that we can quickly get it again on the same tick (seems relatively safe to assume it wouldn't change on the same tick)
                            return cache.width * v / 100;
                        }
                        style[(horiz ? "width" : "height")] = v + sfx;
                    } else {
                        style[(horiz ? "borderLeftWidth" : "borderTopWidth")] = v + sfx;
                    }
                    node.appendChild(_tempDiv);
                    pix = parseFloat(_tempDiv[(horiz ? "offsetWidth" : "offsetHeight")]);
                    node.removeChild(_tempDiv);
                    if (horiz && sfx === "%" && CSSPlugin.cacheWidths !== false) {
                        cache = node._gsCache = node._gsCache || {};
                        cache.time = time;
                        cache.width = pix / v * 100;
                    }
                    if (pix === 0 && !recurse) {
                        pix = _convertToPixels(t, p, v, sfx, true);
                    }
                }
                return neg ? -pix : pix;
            },
            _calculateOffset = _internals.calculateOffset = function (t, p, cs) { //for figuring out "top" or "left" in px when it's "auto". We need to factor in margin with the offsetLeft/offsetTop
                if (_getStyle(t, "position", cs) !== "absolute") {
                    return 0;
                }
                var dim = ((p === "left") ? "Left" : "Top"),
                    v = _getStyle(t, "margin" + dim, cs);
                return t["offset" + dim] - (_convertToPixels(t, p, parseFloat(v), v.replace(_suffixExp, "")) || 0);
            },

            // @private returns at object containing ALL of the style properties in camelCase and their associated values.
            _getAllStyles = function (t, cs) {
                var s = {},
                i, tr;
                if ((cs = cs || _getComputedStyle(t, null))) {
                    if ((i = cs.length)) {
                        while (--i > -1) {
                            s[cs[i].replace(_camelExp, _camelFunc)] = cs.getPropertyValue(cs[i]);
                        }
                    } else { //Opera behaves differently - cs.length is always 0, so we must do a for...in loop.
                        for (i in cs) {
                            s[i] = cs[i];
                        }
                    }
                } else if ((cs = t.currentStyle || t.style)) {
                    for (i in cs) {
                        if (typeof (i) === "string" && s[i] === undefined) {
                            s[i.replace(_camelExp, _camelFunc)] = cs[i];
                        }
                    }
                }
                if (!_supportsOpacity) {
                    s.opacity = _getIEOpacity(t);
                }
                tr = _getTransform(t, cs, false);
                s.rotation = tr.rotation;
                s.skewX = tr.skewX;
                s.scaleX = tr.scaleX;
                s.scaleY = tr.scaleY;
                s.x = tr.x;
                s.y = tr.y;
                if (_supports3D) {
                    s.z = tr.z;
                    s.rotationX = tr.rotationX;
                    s.rotationY = tr.rotationY;
                    s.scaleZ = tr.scaleZ;
                }
                if (s.filters) {
                    delete s.filters;
                }
                return s;
            },

            // @private analyzes two style objects (as returned by _getAllStyles()) and only looks for differences between them that contain tweenable values (like a number or color). It returns an object with a "difs" property which refers to an object containing only those isolated properties and values for tweening, and a "firstMPT" property which refers to the first MiniPropTween instance in a linked list that recorded all the starting values of the different properties so that we can revert to them at the end or beginning of the tween - we don't want the cascading to get messed up. The forceLookup parameter is an optional generic object with properties that should be forced into the results - this is necessary for className tweens that are overwriting others because imagine a scenario where a rollover/rollout adds/removes a class and the user swipes the mouse over the target SUPER fast, thus nothing actually changed yet and the subsequent comparison of the properties would indicate they match (especially when px rounding is taken into consideration), thus no tweening is necessary even though it SHOULD tween and remove those properties after the tween (otherwise the inline styles will contaminate things). See the className SpecialProp code for details.
            _cssDif = function (t, s1, s2, vars, forceLookup) {
                var difs = {},
                style = t.style,
                    val, p, mpt;
                for (p in s2) {
                    if (p !== "cssText") if (p !== "length") if (isNaN(p)) if (s1[p] !== (val = s2[p]) || (forceLookup && forceLookup[p])) if (p.indexOf("Origin") === -1) if (typeof (val) === "number" || typeof (val) === "string") {
                        difs[p] = (val === "auto" && (p === "left" || p === "top")) ? _calculateOffset(t, p) : ((val === "" || val === "auto" || val === "none") && typeof (s1[p]) === "string" && s1[p].replace(_NaNExp, "") !== "") ? 0 : val; //if the ending value is defaulting ("" or "auto"), we check the starting value and if it can be parsed into a number (a string which could have a suffix too, like 700px), then we swap in 0 for "" or "auto" so that things actually tween.
                        if (style[p] !== undefined) { //for className tweens, we must remember which properties already existed inline - the ones that didn't should be removed when the tween isn't in progress because they were only introduced to facilitate the transition between classes.
                            mpt = new MiniPropTween(style, p, style[p], mpt);
                        }
                    }
                }
                if (vars) {
                    for (p in vars) { //copy properties (except className)
                        if (p !== "className") {
                            difs[p] = vars[p];
                        }
                    }
                }
                return {
                    difs: difs,
                    firstMPT: mpt
                };
            },
            _dimensions = {
                width: ["Left", "Right"],
                height: ["Top", "Bottom"]
            },
            _margins = ["marginLeft", "marginRight", "marginTop", "marginBottom"],

            /**
             * @private Gets the width or height of an element
             * @param {!Object} t Target element
             * @param {!string} p Property name ("width" or "height")
             * @param {Object=} cs Computed style object (if one exists). Just a speed optimization.
             * @return {number} Dimension (in pixels)
             */
            _getDimension = function (t, p, cs) {
                var v = parseFloat((p === "width") ? t.offsetWidth : t.offsetHeight),
                    a = _dimensions[p],
                    i = a.length;
                cs = cs || _getComputedStyle(t, null);
                while (--i > -1) {
                    v -= parseFloat(_getStyle(t, "padding" + a[i], cs, true)) || 0;
                    v -= parseFloat(_getStyle(t, "border" + a[i] + "Width", cs, true)) || 0;
                }
                return v;
            },

            // @private Parses position-related complex strings like "top left" or "50px 10px" or "70% 20%", etc. which are used for things like transformOrigin or backgroundPosition. Optionally decorates a supplied object (recObj) with the following properties: "ox" (offsetX), "oy" (offsetY), "oxp" (if true, "ox" is a percentage not a pixel value), and "oxy" (if true, "oy" is a percentage not a pixel value)
            _parsePosition = function (v, recObj) {
                if (v == null || v === "" || v === "auto" || v === "auto auto") { //note: Firefox uses "auto auto" as default whereas Chrome uses "auto".
                    v = "0 0";
                }
                var a = v.split(" "),
                    x = (v.indexOf("left") !== -1) ? "0%" : (v.indexOf("right") !== -1) ? "100%" : a[0],
                    y = (v.indexOf("top") !== -1) ? "0%" : (v.indexOf("bottom") !== -1) ? "100%" : a[1];
                if (y == null) {
                    y = "0";
                } else if (y === "center") {
                    y = "50%";
                }
                if (x === "center" || (isNaN(parseFloat(x)) && (x + "").indexOf("=") === -1)) { //remember, the user could flip-flop the values and say "bottom center" or "center bottom", etc. "center" is ambiguous because it could be used to describe horizontal or vertical, hence the isNaN(). If there's an "=" sign in the value, it's relative.
                    x = "50%";
                }
                if (recObj) {
                    recObj.oxp = (x.indexOf("%") !== -1);
                    recObj.oyp = (y.indexOf("%") !== -1);
                    recObj.oxr = (x.charAt(1) === "=");
                    recObj.oyr = (y.charAt(1) === "=");
                    recObj.ox = parseFloat(x.replace(_NaNExp, ""));
                    recObj.oy = parseFloat(y.replace(_NaNExp, ""));
                }
                return x + " " + y + ((a.length > 2) ? " " + a[2] : "");
            },

            /**
             * @private Takes an ending value (typically a string, but can be a number) and a starting value and returns the change between the two, looking for relative value indicators like += and -= and it also ignores suffixes (but make sure the ending value starts with a number or +=/-= and that the starting value is a NUMBER!)
             * @param {(number|string)} e End value which is typically a string, but could be a number
             * @param {(number|string)} b Beginning value which is typically a string but could be a number
             * @return {number} Amount of change between the beginning and ending values (relative values that have a "+=" or "-=" are recognized)
             */
            _parseChange = function (e, b) {
                return (typeof (e) === "string" && e.charAt(1) === "=") ? parseInt(e.charAt(0) + "1", 10) * parseFloat(e.substr(2)) : parseFloat(e) - parseFloat(b);
            },

            /**
             * @private Takes a value and a default number, checks if the value is relative, null, or numeric and spits back a normalized number accordingly. Primarily used in the _parseTransform() function.
             * @param {Object} v Value to be parsed
             * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
             * @return {number} Parsed value
             */
            _parseVal = function (v, d) {
                return (v == null) ? d : (typeof (v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0) + "1", 10) * parseFloat(v.substr(2)) + d : parseFloat(v);
            },

            /**
             * @private Translates strings like "40deg" or "40" or 40rad" or "+=40deg" or "270_short" or "-90_cw" or "+=45_ccw" to a numeric radian angle. Of course a starting/default value must be fed in too so that relative values can be calculated properly.
             * @param {Object} v Value to be parsed
             * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
             * @param {string=} p property name for directionalEnd (optional - only used when the parsed value is directional ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation). Property name would be "rotation", "rotationX", or "rotationY"
             * @param {Object=} directionalEnd An object that will store the raw end values for directional angles ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation.
             * @return {number} parsed angle in radians
             */
            _parseAngle = function (v, d, p, directionalEnd) {
                var min = 0.000001,
                    cap, split, dif, result;
                if (v == null) {
                    result = d;
                } else if (typeof (v) === "number") {
                    result = v;
                } else {
                    cap = 360;
                    split = v.split("_");
                    dif = Number(split[0].replace(_NaNExp, "")) * ((v.indexOf("rad") === -1) ? 1 : _RAD2DEG) - ((v.charAt(1) === "=") ? 0 : d);
                    if (split.length) {
                        if (directionalEnd) {
                            directionalEnd[p] = d + dif;
                        }
                        if (v.indexOf("short") !== -1) {
                            dif = dif % cap;
                            if (dif !== dif % (cap / 2)) {
                                dif = (dif < 0) ? dif + cap : dif - cap;
                            }
                        }
                        if (v.indexOf("_cw") !== -1 && dif < 0) {
                            dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
                        } else if (v.indexOf("ccw") !== -1 && dif > 0) {
                            dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
                        }
                    }
                    result = d + dif;
                }
                if (result < min && result > -min) {
                    result = 0;
                }
                return result;
            },

            _colorLookup = {
                aqua: [0, 255, 255],
                lime: [0, 255, 0],
                silver: [192, 192, 192],
                black: [0, 0, 0],
                maroon: [128, 0, 0],
                teal: [0, 128, 128],
                blue: [0, 0, 255],
                navy: [0, 0, 128],
                white: [255, 255, 255],
                fuchsia: [255, 0, 255],
                olive: [128, 128, 0],
                yellow: [255, 255, 0],
                orange: [255, 165, 0],
                gray: [128, 128, 128],
                purple: [128, 0, 128],
                green: [0, 128, 0],
                red: [255, 0, 0],
                pink: [255, 192, 203],
                cyan: [0, 255, 255],
                transparent: [255, 255, 255, 0]
            },

            _hue = function (h, m1, m2) {
                h = (h < 0) ? h + 1 : (h > 1) ? h - 1 : h;
                return ((((h * 6 < 1) ? m1 + (m2 - m1) * h * 6 : (h < 0.5) ? m2 : (h * 3 < 2) ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1) * 255) + 0.5) | 0;
            },

            /**
             * @private Parses a color (like #9F0, #FF9900, or rgb(255,51,153)) into an array with 3 elements for red, green, and blue. Also handles rgba() values (splits into array of 4 elements of course)
             * @param {(string|number)} v The value the should be parsed which could be a string like #9F0 or rgb(255,102,51) or rgba(255,0,0,0.5) or it could be a number like 0xFF00CC or even a named color like red, blue, purple, etc.
             * @return {Array.<number>} An array containing red, green, and blue (and optionally alpha) in that order.
             */
            _parseColor = CSSPlugin.parseColor = function (v) {
                var c1, c2, c3, h, s, l;
                if (!v || v === "") {
                    return _colorLookup.black;
                }
                if (typeof (v) === "number") {
                    return [v >> 16, (v >> 8) & 255, v & 255];
                }
                if (v.charAt(v.length - 1) === ",") { //sometimes a trailing commma is included and we should chop it off (typically from a comma-delimited list of values like a textShadow:"2px 2px 2px blue, 5px 5px 5px rgb(255,0,0)" - in this example "blue," has a trailing comma. We could strip it out inside parseComplex() but we'd need to do it to the beginning and ending values plus it wouldn't provide protection from other potential scenarios like if the user passes in a similar value.
                    v = v.substr(0, v.length - 1);
                }
                if (_colorLookup[v]) {
                    return _colorLookup[v];
                }
                if (v.charAt(0) === "#") {
                    if (v.length === 4) { //for shorthand like #9F0
                        c1 = v.charAt(1),
                        c2 = v.charAt(2),
                        c3 = v.charAt(3);
                        v = "#" + c1 + c1 + c2 + c2 + c3 + c3;
                    }
                    v = parseInt(v.substr(1), 16);
                    return [v >> 16, (v >> 8) & 255, v & 255];
                }
                if (v.substr(0, 3) === "hsl") {
                    v = v.match(_numExp);
                    h = (Number(v[0]) % 360) / 360;
                    s = Number(v[1]) / 100;
                    l = Number(v[2]) / 100;
                    c2 = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
                    c1 = l * 2 - c2;
                    if (v.length > 3) {
                        v[3] = Number(v[3]);
                    }
                    v[0] = _hue(h + 1 / 3, c1, c2);
                    v[1] = _hue(h, c1, c2);
                    v[2] = _hue(h - 1 / 3, c1, c2);
                    return v;
                }
                v = v.match(_numExp) || _colorLookup.transparent;
                v[0] = Number(v[0]);
                v[1] = Number(v[1]);
                v[2] = Number(v[2]);
                if (v.length > 3) {
                    v[3] = Number(v[3]);
                }
                return v;
            },
            _colorExp = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#.+?\\b"; //we'll dynamically build this Regular Expression to conserve file size. After building it, it will be able to find rgb(), rgba(), # (hexadecimal), and named color values like red, blue, purple, etc.

        for (p in _colorLookup) {
            _colorExp += "|" + p + "\\b";
        }
        _colorExp = new RegExp(_colorExp + ")", "gi");

        /**
         * @private Returns a formatter function that handles taking a string (or number in some cases) and returning a consistently formatted one in terms of delimiters, quantity of values, etc. For example, we may get boxShadow values defined as "0px red" or "0px 0px 10px rgb(255,0,0)" or "0px 0px 20px 20px #F00" and we need to ensure that what we get back is described with 4 numbers and a color. This allows us to feed it into the _parseComplex() method and split the values up appropriately. The neat thing about this _getFormatter() function is that the dflt defines a pattern as well as a default, so for example, _getFormatter("0px 0px 0px 0px #777", true) not only sets the default as 0px for all distances and #777 for the color, but also sets the pattern such that 4 numbers and a color will always get returned.
         * @param {!string} dflt The default value and pattern to follow. So "0px 0px 0px 0px #777" will ensure that 4 numbers and a color will always get returned.
         * @param {boolean=} clr If true, the values should be searched for color-related data. For example, boxShadow values typically contain a color whereas borderRadius don't.
         * @param {boolean=} collapsible If true, the value is a top/left/right/bottom style one that acts like margin or padding, where if only one value is received, it's used for all 4; if 2 are received, the first is duplicated for 3rd (bottom) and the 2nd is duplicated for the 4th spot (left), etc.
         * @return {Function} formatter function
         */
        var _getFormatter = function (dflt, clr, collapsible, multi) {
            if (dflt == null) {
                return function (v) {
                    return v;
                };
            }
            var dColor = clr ? (dflt.match(_colorExp) || [""])[0] : "",
                dVals = dflt.split(dColor).join("").match(_valuesExp) || [],
                pfx = dflt.substr(0, dflt.indexOf(dVals[0])),
                sfx = (dflt.charAt(dflt.length - 1) === ")") ? ")" : "",
                delim = (dflt.indexOf(" ") !== -1) ? " " : ",",
                numVals = dVals.length,
                dSfx = (numVals > 0) ? dVals[0].replace(_numExp, "") : "",
                formatter;
            if (!numVals) {
                return function (v) {
                    return v;
                };
            }
            if (clr) {
                formatter = function (v) {
                    var color, vals, i, a;
                    if (typeof (v) === "number") {
                        v += dSfx;
                    } else if (multi && _commasOutsideParenExp.test(v)) {
                        a = v.replace(_commasOutsideParenExp, "|").split("|");
                        for (i = 0; i < a.length; i++) {
                            a[i] = formatter(a[i]);
                        }
                        return a.join(",");
                    }
                    color = (v.match(_colorExp) || [dColor])[0];
                    vals = v.split(color).join("").match(_valuesExp) || [];
                    i = vals.length;
                    if (numVals > i--) {
                        while (++i < numVals) {
                            vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
                        }
                    }
                    return pfx + vals.join(delim) + delim + color + sfx + (v.indexOf("inset") !== -1 ? " inset" : "");
                };
                return formatter;

            }
            formatter = function (v) {
                var vals, a, i;
                if (typeof (v) === "number") {
                    v += dSfx;
                } else if (multi && _commasOutsideParenExp.test(v)) {
                    a = v.replace(_commasOutsideParenExp, "|").split("|");
                    for (i = 0; i < a.length; i++) {
                        a[i] = formatter(a[i]);
                    }
                    return a.join(",");
                }
                vals = v.match(_valuesExp) || [];
                i = vals.length;
                if (numVals > i--) {
                    while (++i < numVals) {
                        vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
                    }
                }
                return pfx + vals.join(delim) + sfx;
            };
            return formatter;
        },

        /**
         * @private returns a formatter function that's used for edge-related values like marginTop, marginLeft, paddingBottom, paddingRight, etc. Just pass a comma-delimited list of property names related to the edges.
         * @param {!string} props a comma-delimited list of property names in order from top to left, like "marginTop,marginRight,marginBottom,marginLeft"
         * @return {Function} a formatter function
         */
        _getEdgeParser = function (props) {
            props = props.split(",");
            return function (t, e, p, cssp, pt, plugin, vars) {
                var a = (e + "").split(" "),
                    i;
                vars = {};
                for (i = 0; i < 4; i++) {
                    vars[props[i]] = a[i] = a[i] || a[(((i - 1) / 2) >> 0)];
                }
                return cssp.parse(t, vars, pt, plugin);
            };
        },

        // @private used when other plugins must tween values first, like BezierPlugin or ThrowPropsPlugin, etc. That plugin's setRatio() gets called first so that the values are updated, and then we loop through the MiniPropTweens  which handle copying the values into their appropriate slots so that they can then be applied correctly in the main CSSPlugin setRatio() method. Remember, we typically create a proxy object that has a bunch of uniquely-named properties that we feed to the sub-plugin and it does its magic normally, and then we must interpret those values and apply them to the css because often numbers must get combined/concatenated, suffixes added, etc. to work with css, like boxShadow could have 4 values plus a color.
        _setPluginRatio = _internals._setPluginRatio = function (v) {
            this.plugin.setRatio(v);
            var d = this.data,
                proxy = d.proxy,
                mpt = d.firstMPT,
                min = 0.000001,
                val, pt, i, str;
            while (mpt) {
                val = proxy[mpt.v];
                if (mpt.r) {
                    val = Math.round(val);
                } else if (val < min && val > -min) {
                    val = 0;
                }
                mpt.t[mpt.p] = val;
                mpt = mpt._next;
            }
            if (d.autoRotate) {
                d.autoRotate.rotation = proxy.rotation;
            }
            //at the end, we must set the CSSPropTween's "e" (end) value dynamically here because that's what is used in the final setRatio() method.
            if (v === 1) {
                mpt = d.firstMPT;
                while (mpt) {
                    pt = mpt.t;
                    if (!pt.type) {
                        pt.e = pt.s + pt.xs0;
                    } else if (pt.type === 1) {
                        str = pt.xs0 + pt.s + pt.xs1;
                        for (i = 1; i < pt.l; i++) {
                            str += pt["xn" + i] + pt["xs" + (i + 1)];
                        }
                        pt.e = str;
                    }
                    mpt = mpt._next;
                }
            }
        },

        /**
         * @private @constructor Used by a few SpecialProps to hold important values for proxies. For example, _parseToProxy() creates a MiniPropTween instance for each property that must get tweened on the proxy, and we record the original property name as well as the unique one we create for the proxy, plus whether or not the value needs to be rounded plus the original value.
         * @param {!Object} t target object whose property we're tweening (often a CSSPropTween)
         * @param {!string} p property name
         * @param {(number|string|object)} v value
         * @param {MiniPropTween=} next next MiniPropTween in the linked list
         * @param {boolean=} r if true, the tweened value should be rounded to the nearest integer
         */
        MiniPropTween = function (t, p, v, next, r) {
            this.t = t;
            this.p = p;
            this.v = v;
            this.r = r;
            if (next) {
                next._prev = this;
                this._next = next;
            }
        },

        /**
         * @private Most other plugins (like BezierPlugin and ThrowPropsPlugin and others) can only tween numeric values, but CSSPlugin must accommodate special values that have a bunch of extra data (like a suffix or strings between numeric values, etc.). For example, boxShadow has values like "10px 10px 20px 30px rgb(255,0,0)" which would utterly confuse other plugins. This method allows us to split that data apart and grab only the numeric data and attach it to uniquely-named properties of a generic proxy object ({}) so that we can feed that to virtually any plugin to have the numbers tweened. However, we must also keep track of which properties from the proxy go with which CSSPropTween values and instances. So we create a linked list of MiniPropTweens. Each one records a target (the original CSSPropTween), property (like "s" or "xn1" or "xn2") that we're tweening and the unique property name that was used for the proxy (like "boxShadow_xn1" and "boxShadow_xn2") and whether or not they need to be rounded. That way, in the _setPluginRatio() method we can simply copy the values over from the proxy to the CSSPropTween instance(s). Then, when the main CSSPlugin setRatio() method runs and applies the CSSPropTween values accordingly, they're updated nicely. So the external plugin tweens the numbers, _setPluginRatio() copies them over, and setRatio() acts normally, applying css-specific values to the element.
         * This method returns an object that has the following properties:
         *  - proxy: a generic object containing the starting values for all the properties that will be tweened by the external plugin.  This is what we feed to the external _onInitTween() as the target
         *  - end: a generic object containing the ending values for all the properties that will be tweened by the external plugin. This is what we feed to the external plugin's _onInitTween() as the destination values
         *  - firstMPT: the first MiniPropTween in the linked list
         *  - pt: the first CSSPropTween in the linked list that was created when parsing. If shallow is true, this linked list will NOT attach to the one passed into the _parseToProxy() as the "pt" (4th) parameter.
         * @param {!Object} t target object to be tweened
         * @param {!(Object|string)} vars the object containing the information about the tweening values (typically the end/destination values) that should be parsed
         * @param {!CSSPlugin} cssp The CSSPlugin instance
         * @param {CSSPropTween=} pt the next CSSPropTween in the linked list
         * @param {TweenPlugin=} plugin the external TweenPlugin instance that will be handling tweening the numeric values
         * @param {boolean=} shallow if true, the resulting linked list from the parse will NOT be attached to the CSSPropTween that was passed in as the "pt" (4th) parameter.
         * @return An object containing the following properties: proxy, end, firstMPT, and pt (see above for descriptions)
         */
        _parseToProxy = _internals._parseToProxy = function (t, vars, cssp, pt, plugin, shallow) {
            var bpt = pt,
                start = {},
                end = {},
                transform = cssp._transform,
                oldForce = _forcePT,
                i, p, xp, mpt, firstPT;
            cssp._transform = null;
            _forcePT = vars;
            pt = firstPT = cssp.parse(t, vars, pt, plugin);
            _forcePT = oldForce;
            //break off from the linked list so the new ones are isolated.
            if (shallow) {
                cssp._transform = transform;
                if (bpt) {
                    bpt._prev = null;
                    if (bpt._prev) {
                        bpt._prev._next = null;
                    }
                }
            }
            while (pt && pt !== bpt) {
                if (pt.type <= 1) {
                    p = pt.p;
                    end[p] = pt.s + pt.c;
                    start[p] = pt.s;
                    if (!shallow) {
                        mpt = new MiniPropTween(pt, "s", p, mpt, pt.r);
                        pt.c = 0;
                    }
                    if (pt.type === 1) {
                        i = pt.l;
                        while (--i > 0) {
                            xp = "xn" + i;
                            p = pt.p + "_" + xp;
                            end[p] = pt.data[xp];
                            start[p] = pt[xp];
                            if (!shallow) {
                                mpt = new MiniPropTween(pt, xp, p, mpt, pt.rxp[xp]);
                            }
                        }
                    }
                }
                pt = pt._next;
            }
            return {
                proxy: start,
                end: end,
                firstMPT: mpt,
                pt: firstPT
            };
        },



        /**
         * @constructor Each property that is tweened has at least one CSSPropTween associated with it. These instances store important information like the target, property, starting value, amount of change, etc. They can also optionally have a number of "extra" strings and numeric values named xs1, xn1, xs2, xn2, xs3, xn3, etc. where "s" indicates string and "n" indicates number. These can be pieced together in a complex-value tween (type:1) that has alternating types of data like a string, number, string, number, etc. For example, boxShadow could be "5px 5px 8px rgb(102, 102, 51)". In that value, there are 6 numbers that may need to tween and then pieced back together into a string again with spaces, suffixes, etc. xs0 is special in that it stores the suffix for standard (type:0) tweens, -OR- the first string (prefix) in a complex-value (type:1) CSSPropTween -OR- it can be the non-tweening value in a type:-1 CSSPropTween. We do this to conserve memory.
         * CSSPropTweens have the following optional properties as well (not defined through the constructor):
         *  - l: Length in terms of the number of extra properties that the CSSPropTween has (default: 0). For example, for a boxShadow we may need to tween 5 numbers in which case l would be 5; Keep in mind that the start/end values for the first number that's tweened are always stored in the s and c properties to conserve memory. All additional values thereafter are stored in xn1, xn2, etc.
         *  - xfirst: The first instance of any sub-CSSPropTweens that are tweening properties of this instance. For example, we may split up a boxShadow tween so that there's a main CSSPropTween of type:1 that has various xs* and xn* values associated with the h-shadow, v-shadow, blur, color, etc. Then we spawn a CSSPropTween for each of those that has a higher priority and runs BEFORE the main CSSPropTween so that the values are all set by the time it needs to re-assemble them. The xfirst gives us an easy way to identify the first one in that chain which typically ends at the main one (because they're all prepende to the linked list)
         *  - plugin: The TweenPlugin instance that will handle the tweening of any complex values. For example, sometimes we don't want to use normal subtweens (like xfirst refers to) to tween the values - we might want ThrowPropsPlugin or BezierPlugin some other plugin to do the actual tweening, so we create a plugin instance and store a reference here. We need this reference so that if we get a request to round values or disable a tween, we can pass along that request.
         *  - data: Arbitrary data that needs to be stored with the CSSPropTween. Typically if we're going to have a plugin handle the tweening of a complex-value tween, we create a generic object that stores the END values that we're tweening to and the CSSPropTween's xs1, xs2, etc. have the starting values. We store that object as data. That way, we can simply pass that object to the plugin and use the CSSPropTween as the target.
         *  - setRatio: Only used for type:2 tweens that require custom functionality. In this case, we call the CSSPropTween's setRatio() method and pass the ratio each time the tween updates. This isn't quite as efficient as doing things directly in the CSSPlugin's setRatio() method, but it's very convenient and flexible.
         * @param {!Object} t Target object whose property will be tweened. Often a DOM element, but not always. It could be anything.
         * @param {string} p Property to tween (name). For example, to tween element.width, p would be "width".
         * @param {number} s Starting numeric value
         * @param {number} c Change in numeric value over the course of the entire tween. For example, if element.width starts at 5 and should end at 100, c would be 95.
         * @param {CSSPropTween=} next The next CSSPropTween in the linked list. If one is defined, we will define its _prev as the new instance, and the new instance's _next will be pointed at it.
         * @param {number=} type The type of CSSPropTween where -1 = a non-tweening value, 0 = a standard simple tween, 1 = a complex value (like one that has multiple numbers in a comma- or space-delimited string like border:"1px solid red"), and 2 = one that uses a custom setRatio function that does all of the work of applying the values on each update.
         * @param {string=} n Name of the property that should be used for overwriting purposes which is typically the same as p but not always. For example, we may need to create a subtween for the 2nd part of a "clip:rect(...)" tween in which case "p" might be xs1 but "n" is still "clip"
         * @param {boolean=} r If true, the value(s) should be rounded
         * @param {number=} pr Priority in the linked list order. Higher priority CSSPropTweens will be updated before lower priority ones. The default priority is 0.
         * @param {string=} b Beginning value. We store this to ensure that it is EXACTLY what it was when the tween began without any risk of interpretation issues.
         * @param {string=} e Ending value. We store this to ensure that it is EXACTLY what the user defined at the end of the tween without any risk of interpretation issues.
         */
        CSSPropTween = _internals.CSSPropTween = function (t, p, s, c, next, type, n, r, pr, b, e) {
            this.t = t; //target
            this.p = p; //property
            this.s = s; //starting value
            this.c = c; //change value
            this.n = n || p; //name that this CSSPropTween should be associated to (usually the same as p, but not always - n is what overwriting looks at)
            if (!(t instanceof CSSPropTween)) {
                _overwriteProps.push(this.n);
            }
            this.r = r; //round (boolean)
            this.type = type || 0; //0 = normal tween, -1 = non-tweening (in which case xs0 will be applied to the target's property, like tp.t[tp.p] = tp.xs0), 1 = complex-value SpecialProp, 2 = custom setRatio() that does all the work
            if (pr) {
                this.pr = pr;
                _hasPriority = true;
            }
            this.b = (b === undefined) ? s : b;
            this.e = (e === undefined) ? s + c : e;
            if (next) {
                this._next = next;
                next._prev = this;
            }
        },

        /**
         * Takes a target, the beginning value and ending value (as strings) and parses them into a CSSPropTween (possibly with child CSSPropTweens) that accommodates multiple numbers, colors, comma-delimited values, etc. For example:
         * sp.parseComplex(element, "boxShadow", "5px 10px 20px rgb(255,102,51)", "0px 0px 0px red", true, "0px 0px 0px rgb(0,0,0,0)", pt);
         * It will walk through the beginning and ending values (which should be in the same format with the same number and type of values) and figure out which parts are numbers, what strings separate the numeric/tweenable values, and then create the CSSPropTweens accordingly. If a plugin is defined, no child CSSPropTweens will be created. Instead, the ending values will be stored in the "data" property of the returned CSSPropTween like: {s:-5, xn1:-10, xn2:-20, xn3:255, xn4:0, xn5:0} so that it can be fed to any other plugin and it'll be plain numeric tweens but the recomposition of the complex value will be handled inside CSSPlugin's setRatio().
         * If a setRatio is defined, the type of the CSSPropTween will be set to 2 and recomposition of the values will be the responsibility of that method.
         *
         * @param {!Object} t Target whose property will be tweened
         * @param {!string} p Property that will be tweened (its name, like "left" or "backgroundColor" or "boxShadow")
         * @param {string} b Beginning value
         * @param {string} e Ending value
         * @param {boolean} clrs If true, the value could contain a color value like "rgb(255,0,0)" or "#F00" or "red". The default is false, so no colors will be recognized (a performance optimization)
         * @param {(string|number|Object)} dflt The default beginning value that should be used if no valid beginning value is defined or if the number of values inside the complex beginning and ending values don't match
         * @param {?CSSPropTween} pt CSSPropTween instance that is the current head of the linked list (we'll prepend to this).
         * @param {number=} pr Priority in the linked list order. Higher priority properties will be updated before lower priority ones. The default priority is 0.
         * @param {TweenPlugin=} plugin If a plugin should handle the tweening of extra properties, pass the plugin instance here. If one is defined, then NO subtweens will be created for any extra properties (the properties will be created - just not additional CSSPropTween instances to tween them) because the plugin is expected to do so. However, the end values WILL be populated in the "data" property, like {s:100, xn1:50, xn2:300}
         * @param {function(number)=} setRatio If values should be set in a custom function instead of being pieced together in a type:1 (complex-value) CSSPropTween, define that custom function here.
         * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parseComplex() call.
         */
        _parseComplex = CSSPlugin.parseComplex = function (t, p, b, e, clrs, dflt, pt, pr, plugin, setRatio) {
            //DEBUG: _log("parseComplex: "+p+", b: "+b+", e: "+e);
            b = b || dflt || "";
            pt = new CSSPropTween(t, p, 0, 0, pt, (setRatio ? 2 : 1), null, false, pr, b, e);
            e += ""; //ensures it's a string
            var ba = b.split(", ").join(",").split(" "), //beginning array
                ea = e.split(", ").join(",").split(" "), //ending array
                l = ba.length,
                autoRound = (_autoRound !== false),
                i, xi, ni, bv, ev, bnums, enums, bn, rgba, temp, cv, str;
            if (e.indexOf(",") !== -1 || b.indexOf(",") !== -1) {
                ba = ba.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
                ea = ea.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
                l = ba.length;
            }
            if (l !== ea.length) {
                //DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
                ba = (dflt || "").split(" ");
                l = ba.length;
            }
            pt.plugin = plugin;
            pt.setRatio = setRatio;
            for (i = 0; i < l; i++) {
                bv = ba[i];
                ev = ea[i];
                bn = parseFloat(bv);

                //if the value begins with a number (most common). It's fine if it has a suffix like px
                if (bn || bn === 0) {
                    pt.appendXtra("", bn, _parseChange(ev, bn), ev.replace(_relNumExp, ""), (autoRound && ev.indexOf("px") !== -1), true);

                    //if the value is a color
                } else if (clrs && (bv.charAt(0) === "#" || _colorLookup[bv] || _rgbhslExp.test(bv))) {
                    str = ev.charAt(ev.length - 1) === "," ? ")," : ")"; //if there's a comma at the end, retain it.
                    bv = _parseColor(bv);
                    ev = _parseColor(ev);
                    rgba = (bv.length + ev.length > 6);
                    if (rgba && !_supportsOpacity && ev[3] === 0) { //older versions of IE don't support rgba(), so if the destination alpha is 0, just use "transparent" for the end color
                        pt["xs" + pt.l] += pt.l ? " transparent" : "transparent";
                        pt.e = pt.e.split(ea[i]).join("transparent");
                    } else {
                        if (!_supportsOpacity) { //old versions of IE don't support rgba().
                            rgba = false;
                        }
                        pt.appendXtra((rgba ? "rgba(" : "rgb("), bv[0], ev[0] - bv[0], ",", true, true)
                            .appendXtra("", bv[1], ev[1] - bv[1], ",", true)
                            .appendXtra("", bv[2], ev[2] - bv[2], (rgba ? "," : str), true);
                        if (rgba) {
                            bv = (bv.length < 4) ? 1 : bv[3];
                            pt.appendXtra("", bv, ((ev.length < 4) ? 1 : ev[3]) - bv, str, false);
                        }
                    }

                } else {
                    bnums = bv.match(_numExp); //gets each group of numbers in the beginning value string and drops them into an array

                    //if no number is found, treat it as a non-tweening value and just append the string to the current xs.
                    if (!bnums) {
                        pt["xs" + pt.l] += pt.l ? " " + bv : bv;

                        //loop through all the numbers that are found and construct the extra values on the pt.
                    } else {
                        enums = ev.match(_relNumExp); //get each group of numbers in the end value string and drop them into an array. We allow relative values too, like +=50 or -=.5
                        if (!enums || enums.length !== bnums.length) {
                            //DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
                            return pt;
                        }
                        ni = 0;
                        for (xi = 0; xi < bnums.length; xi++) {
                            cv = bnums[xi];
                            temp = bv.indexOf(cv, ni);
                            pt.appendXtra(bv.substr(ni, temp - ni), Number(cv), _parseChange(enums[xi], cv), "", (autoRound && bv.substr(temp + cv.length, 2) === "px"), (xi === 0));
                            ni = temp + cv.length;
                        }
                        pt["xs" + pt.l] += bv.substr(ni);
                    }
                }
            }
            //if there are relative values ("+=" or "-=" prefix), we need to adjust the ending value to eliminate the prefixes and combine the values properly.
            if (e.indexOf("=") !== -1) if (pt.data) {
                str = pt.xs0 + pt.data.s;
                for (i = 1; i < pt.l; i++) {
                    str += pt["xs" + i] + pt.data["xn" + i];
                }
                pt.e = str + pt["xs" + i];
            }
            if (!pt.l) {
                pt.type = -1;
                pt.xs0 = pt.e;
            }
            return pt.xfirst || pt;
        },
        i = 9;


        p = CSSPropTween.prototype;
        p.l = p.pr = 0; //length (number of extra properties like xn1, xn2, xn3, etc.
        while (--i > 0) {
            p["xn" + i] = 0;
            p["xs" + i] = "";
        }
        p.xs0 = "";
        p._next = p._prev = p.xfirst = p.data = p.plugin = p.setRatio = p.rxp = null;


        /**
         * Appends and extra tweening value to a CSSPropTween and automatically manages any prefix and suffix strings. The first extra value is stored in the s and c of the main CSSPropTween instance, but thereafter any extras are stored in the xn1, xn2, xn3, etc. The prefixes and suffixes are stored in the xs0, xs1, xs2, etc. properties. For example, if I walk through a clip value like "rect(10px, 5px, 0px, 20px)", the values would be stored like this:
         * xs0:"rect(", s:10, xs1:"px, ", xn1:5, xs2:"px, ", xn2:0, xs3:"px, ", xn3:20, xn4:"px)"
         * And they'd all get joined together when the CSSPlugin renders (in the setRatio() method).
         * @param {string=} pfx Prefix (if any)
         * @param {!number} s Starting value
         * @param {!number} c Change in numeric value over the course of the entire tween. For example, if the start is 5 and the end is 100, the change would be 95.
         * @param {string=} sfx Suffix (if any)
         * @param {boolean=} r Round (if true).
         * @param {boolean=} pad If true, this extra value should be separated by the previous one by a space. If there is no previous extra and pad is true, it will automatically drop the space.
         * @return {CSSPropTween} returns itself so that multiple methods can be chained together.
         */
        p.appendXtra = function (pfx, s, c, sfx, r, pad) {
            var pt = this,
                l = pt.l;
            pt["xs" + l] += (pad && l) ? " " + pfx : pfx || "";
            if (!c) if (l !== 0 && !pt.plugin) { //typically we'll combine non-changing values right into the xs to optimize performance, but we don't combine them when there's a plugin that will be tweening the values because it may depend on the values being split apart, like for a bezier, if a value doesn't change between the first and second iteration but then it does on the 3rd, we'll run into trouble because there's no xn slot for that value!
                pt["xs" + l] += s + (sfx || "");
                return pt;
            }
            pt.l++;
            pt.type = pt.setRatio ? 2 : 1;
            pt["xs" + pt.l] = sfx || "";
            if (l > 0) {
                pt.data["xn" + l] = s + c;
                pt.rxp["xn" + l] = r; //round extra property (we need to tap into this in the _parseToProxy() method)
                pt["xn" + l] = s;
                if (!pt.plugin) {
                    pt.xfirst = new CSSPropTween(pt, "xn" + l, s, c, pt.xfirst || pt, 0, pt.n, r, pt.pr);
                    pt.xfirst.xs0 = 0; //just to ensure that the property stays numeric which helps modern browsers speed up processing. Remember, in the setRatio() method, we do pt.t[pt.p] = val + pt.xs0 so if pt.xs0 is "" (the default), it'll cast the end value as a string. When a property is a number sometimes and a string sometimes, it prevents the compiler from locking in the data type, slowing things down slightly.
                }
                return pt;
            }
            pt.data = {
                s: s + c
            };
            pt.rxp = {};
            pt.s = s;
            pt.c = c;
            pt.r = r;
            return pt;
        };

        /**
         * @constructor A SpecialProp is basically a css property that needs to be treated in a non-standard way, like if it may contain a complex value like boxShadow:"5px 10px 15px rgb(255, 102, 51)" or if it is associated with another plugin like ThrowPropsPlugin or BezierPlugin. Every SpecialProp is associated with a particular property name like "boxShadow" or "throwProps" or "bezier" and it will intercept those values in the vars object that's passed to the CSSPlugin and handle them accordingly.
         * @param {!string} p Property name (like "boxShadow" or "throwProps")
         * @param {Object=} options An object containing any of the following configuration options:
         *                      - defaultValue: the default value
         *                      - parser: A function that should be called when the associated property name is found in the vars. This function should return a CSSPropTween instance and it should ensure that it is properly inserted into the linked list. It will receive 4 paramters: 1) The target, 2) The value defined in the vars, 3) The CSSPlugin instance (whose _firstPT should be used for the linked list), and 4) A computed style object if one was calculated (this is a speed optimization that allows retrieval of starting values quicker)
         *                      - formatter: a function that formats any value received for this special property (for example, boxShadow could take "5px 5px red" and format it to "5px 5px 0px 0px red" so that both the beginning and ending values have a common order and quantity of values.)
         *                      - prefix: if true, we'll determine whether or not this property requires a vendor prefix (like Webkit or Moz or ms or O)
         *                      - color: set this to true if the value for this SpecialProp may contain color-related values like rgb(), rgba(), etc.
         *                      - priority: priority in the linked list order. Higher priority SpecialProps will be updated before lower priority ones. The default priority is 0.
         *                      - multi: if true, the formatter should accommodate a comma-delimited list of values, like boxShadow could have multiple boxShadows listed out.
         *                      - collapsible: if true, the formatter should treat the value like it's a top/right/bottom/left value that could be collapsed, like "5px" would apply to all, "5px, 10px" would use 5px for top/bottom and 10px for right/left, etc.
         *                      - keyword: a special keyword that can [optionally] be found inside the value (like "inset" for boxShadow). This allows us to validate beginning/ending values to make sure they match (if the keyword is found in one, it'll be added to the other for consistency by default).
         */
        var SpecialProp = function (p, options) {
            options = options || {};
            this.p = options.prefix ? _checkPropPrefix(p) || p : p;
            _specialProps[p] = _specialProps[this.p] = this;
            this.format = options.formatter || _getFormatter(options.defaultValue, options.color, options.collapsible, options.multi);
            if (options.parser) {
                this.parse = options.parser;
            }
            this.clrs = options.color;
            this.multi = options.multi;
            this.keyword = options.keyword;
            this.dflt = options.defaultValue;
            this.pr = options.priority || 0;
        },

        //shortcut for creating a new SpecialProp that can accept multiple properties as a comma-delimited list (helps minification). dflt can be an array for multiple values (we don't do a comma-delimited list because the default value may contain commas, like rect(0px,0px,0px,0px)). We attach this method to the SpecialProp class/object instead of using a private _createSpecialProp() method so that we can tap into it externally if necessary, like from another plugin.
        _registerComplexSpecialProp = _internals._registerComplexSpecialProp = function (p, options, defaults) {
            if (typeof (options) !== "object") {
                options = {
                    parser: defaults
                }; //to make backwards compatible with older versions of BezierPlugin and ThrowPropsPlugin
            }
            var a = p.split(","),
                d = options.defaultValue,
                i, temp;
            defaults = defaults || [d];
            for (i = 0; i < a.length; i++) {
                options.prefix = (i === 0 && options.prefix);
                options.defaultValue = defaults[i] || d;
                temp = new SpecialProp(a[i], options);
            }
        },

        //creates a placeholder special prop for a plugin so that the property gets caught the first time a tween of it is attempted, and at that time it makes the plugin register itself, thus taking over for all future tweens of that property. This allows us to not mandate that things load in a particular order and it also allows us to log() an error that informs the user when they attempt to tween an external plugin-related property without loading its .js file.
        _registerPluginProp = function (p) {
            if (!_specialProps[p]) {
                var pluginName = p.charAt(0).toUpperCase() + p.substr(1) + "Plugin";
                _registerComplexSpecialProp(p, {
                    parser: function (t, e, p, cssp, pt, plugin, vars) {
                        var pluginClass = _globals.com.greensock.plugins[pluginName];
                        if (!pluginClass) {
                            _log("Error: " + pluginName + " js file not loaded.");
                            return pt;
                        }
                        pluginClass._cssRegister();
                        return _specialProps[p].parse(t, e, p, cssp, pt, plugin, vars);
                    }
                });
            }
        };


        p = SpecialProp.prototype;

        /**
         * Alias for _parseComplex() that automatically plugs in certain values for this SpecialProp, like its property name, whether or not colors should be sensed, the default value, and priority. It also looks for any keyword that the SpecialProp defines (like "inset" for boxShadow) and ensures that the beginning and ending values have the same number of values for SpecialProps where multi is true (like boxShadow and textShadow can have a comma-delimited list)
         * @param {!Object} t target element
         * @param {(string|number|object)} b beginning value
         * @param {(string|number|object)} e ending (destination) value
         * @param {CSSPropTween=} pt next CSSPropTween in the linked list
         * @param {TweenPlugin=} plugin If another plugin will be tweening the complex value, that TweenPlugin instance goes here.
         * @param {function=} setRatio If a custom setRatio() method should be used to handle this complex value, that goes here.
         * @return {CSSPropTween=} First CSSPropTween in the linked list
         */
        p.parseComplex = function (t, b, e, pt, plugin, setRatio) {
            var kwd = this.keyword,
                i, ba, ea, l, bi, ei;
            //if this SpecialProp's value can contain a comma-delimited list of values (like boxShadow or textShadow), we must parse them in a special way, and look for a keyword (like "inset" for boxShadow) and ensure that the beginning and ending BOTH have it if the end defines it as such. We also must ensure that there are an equal number of values specified (we can't tween 1 boxShadow to 3 for example)
            if (this.multi) if (_commasOutsideParenExp.test(e) || _commasOutsideParenExp.test(b)) {
                ba = b.replace(_commasOutsideParenExp, "|").split("|");
                ea = e.replace(_commasOutsideParenExp, "|").split("|");
            } else if (kwd) {
                ba = [b];
                ea = [e];
            }
            if (ea) {
                l = (ea.length > ba.length) ? ea.length : ba.length;
                for (i = 0; i < l; i++) {
                    b = ba[i] = ba[i] || this.dflt;
                    e = ea[i] = ea[i] || this.dflt;
                    if (kwd) {
                        bi = b.indexOf(kwd);
                        ei = e.indexOf(kwd);
                        if (bi !== ei) {
                            e = (ei === -1) ? ea : ba;
                            e[i] += " " + kwd;
                        }
                    }
                }
                b = ba.join(", ");
                e = ea.join(", ");
            }
            return _parseComplex(t, this.p, b, e, this.clrs, this.dflt, pt, this.pr, plugin, setRatio);
        };

        /**
         * Accepts a target and end value and spits back a CSSPropTween that has been inserted into the CSSPlugin's linked list and conforms with all the conventions we use internally, like type:-1, 0, 1, or 2, setting up any extra property tweens, priority, etc. For example, if we have a boxShadow SpecialProp and call:
         * this._firstPT = sp.parse(element, "5px 10px 20px rgb(2550,102,51)", "boxShadow", this);
         * It should figure out the starting value of the element's boxShadow, compare it to the provided end value and create all the necessary CSSPropTweens of the appropriate types to tween the boxShadow. The CSSPropTween that gets spit back should already be inserted into the linked list (the 4th parameter is the current head, so prepend to that).
         * @param {!Object} t Target object whose property is being tweened
         * @param {Object} e End value as provided in the vars object (typically a string, but not always - like a throwProps would be an object).
         * @param {!string} p Property name
         * @param {!CSSPlugin} cssp The CSSPlugin instance that should be associated with this tween.
         * @param {?CSSPropTween} pt The CSSPropTween that is the current head of the linked list (we'll prepend to it)
         * @param {TweenPlugin=} plugin If a plugin will be used to tween the parsed value, this is the plugin instance.
         * @param {Object=} vars Original vars object that contains the data for parsing.
         * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parse() call.
         */
        p.parse = function (t, e, p, cssp, pt, plugin, vars) {
            return this.parseComplex(t.style, this.format(_getStyle(t, this.p, _cs, false, this.dflt)), this.format(e), pt, plugin);
        };

        /**
         * Registers a special property that should be intercepted from any "css" objects defined in tweens. This allows you to handle them however you want without CSSPlugin doing it for you. The 2nd parameter should be a function that accepts 3 parameters:
         *  1) Target object whose property should be tweened (typically a DOM element)
         *  2) The end/destination value (could be a string, number, object, or whatever you want)
         *  3) The tween instance (you probably don't need to worry about this, but it can be useful for looking up information like the duration)
         *
         * Then, your function should return a function which will be called each time the tween gets rendered, passing a numeric "ratio" parameter to your function that indicates the change factor (usually between 0 and 1). For example:
         *
         * CSSPlugin.registerSpecialProp("myCustomProp", function(target, value, tween) {
         *      var start = target.style.width;
         *      return function(ratio) {
         *              target.style.width = (start + value * ratio) + "px";
         *              console.log("set width to " + target.style.width);
         *          }
         * }, 0);
         *
         * Then, when I do this tween, it will trigger my special property:
         *
         * TweenLite.to(element, 1, {css:{myCustomProp:100}});
         *
         * In the example, of course, we're just changing the width, but you can do anything you want.
         *
         * @param {!string} name Property name (or comma-delimited list of property names) that should be intercepted and handled by your function. For example, if I define "myCustomProp", then it would handle that portion of the following tween: TweenLite.to(element, 1, {css:{myCustomProp:100}})
         * @param {!function(Object, Object, Object, string):function(number)} onInitTween The function that will be called when a tween of this special property is performed. The function will receive 4 parameters: 1) Target object that should be tweened, 2) Value that was passed to the tween, 3) The tween instance itself (rarely used), and 4) The property name that's being tweened. Your function should return a function that should be called on every update of the tween. That function will receive a single parameter that is a "change factor" value (typically between 0 and 1) indicating the amount of change as a ratio. You can use this to determine how to set the values appropriately in your function.
         * @param {number=} priority Priority that helps the engine determine the order in which to set the properties (default: 0). Higher priority properties will be updated before lower priority ones.
         */
        CSSPlugin.registerSpecialProp = function (name, onInitTween, priority) {
            _registerComplexSpecialProp(name, {
                parser: function (t, e, p, cssp, pt, plugin, vars) {
                    var rv = new CSSPropTween(t, p, 0, 0, pt, 2, p, false, priority);
                    rv.plugin = plugin;
                    rv.setRatio = onInitTween(t, e, cssp._tween, p);
                    return rv;
                },
                priority: priority
            });
        };







        //transform-related methods and properties
        var _transformProps = ("scaleX,scaleY,scaleZ,x,y,z,skewX,skewY,rotation,rotationX,rotationY,perspective,xPercent,yPercent").split(","),
            _transformProp = _checkPropPrefix("transform"), //the Javascript (camelCase) transform property, like msTransform, WebkitTransform, MozTransform, or OTransform.
            _transformPropCSS = _prefixCSS + "transform",
            _transformOriginProp = _checkPropPrefix("transformOrigin"),
            _supports3D = (_checkPropPrefix("perspective") !== null),
            Transform = _internals.Transform = function () {
                this.perspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0;
                this.force3D = (CSSPlugin.defaultForce3D === false || !_supports3D) ? false : CSSPlugin.defaultForce3D || "auto";
            },
            _SVGElement = window.SVGElement,
            _useSVGTransformAttr,
            //Some browsers (like Firefox and IE) don't honor transform-origin properly in SVG elements, so we need to manually adjust the matrix accordingly. We feature detect here rather than always doing the conversion for certain browsers because they may fix the problem at some point in the future.

            _createSVG = function (type, container, attributes) {
                var element = _doc.createElementNS("http://www.w3.org/2000/svg", type),
                    reg = /([a-z])([A-Z])/g,
                    p;
                for (p in attributes) {
                    element.setAttributeNS(null, p.replace(reg, "$1-$2").toLowerCase(), attributes[p]);
                }
                container.appendChild(element);
                return element;
            },
            _docElement = document.documentElement,
            _forceSVGTransformAttr = (function () {
                //IE and Android stock don't support CSS transforms on SVG elements, so we must write them to the "transform" attribute. We populate this variable in the _parseTransform() method, and only if/when we come across an SVG element
                var force = _ieVers || (/Android/i.test(_agent) && !window.chrome),
                    svg, rect, width;
                if (_doc.createElementNS && !force) { //IE8 and earlier doesn't support SVG anyway
                    svg = _createSVG("svg", _docElement);
                    rect = _createSVG("rect", svg, {
                        width: 100,
                        height: 50,
                        x: 100
                    });
                    width = rect.getBoundingClientRect().width;
                    rect.style[_transformOriginProp] = "50% 50%";
                    rect.style[_transformProp] = "scaleX(0.5)";
                    force = (width === rect.getBoundingClientRect().width);
                    _docElement.removeChild(svg);
                }
                return force;
            })(),
            _parseSVGOrigin = function (e, origin, decoratee) {
                var bbox = e.getBBox();
                origin = _parsePosition(origin).split(" ");
                decoratee.xOrigin = (origin[0].indexOf("%") !== -1 ? parseFloat(origin[0]) / 100 * bbox.width : parseFloat(origin[0])) + bbox.x;
                decoratee.yOrigin = (origin[1].indexOf("%") !== -1 ? parseFloat(origin[1]) / 100 * bbox.height : parseFloat(origin[1])) + bbox.y;
            },

            /**
             * Parses the transform values for an element, returning an object with x, y, z, scaleX, scaleY, scaleZ, rotation, rotationX, rotationY, skewX, and skewY properties. Note: by default (for performance reasons), all skewing is combined into skewX and rotation but skewY still has a place in the transform object so that we can record how much of the skew is attributed to skewX vs skewY. Remember, a skewY of 10 looks the same as a rotation of 10 and skewX of -10.
             * @param {!Object} t target element
             * @param {Object=} cs computed style object (optional)
             * @param {boolean=} rec if true, the transform values will be recorded to the target element's _gsTransform object, like target._gsTransform = {x:0, y:0, z:0, scaleX:1...}
             * @param {boolean=} parse if true, we'll ignore any _gsTransform values that already exist on the element, and force a reparsing of the css (calculated style)
             * @return {object} object containing all of the transform properties/values like {x:0, y:0, z:0, scaleX:1...}
             */
            _getTransform = _internals.getTransform = function (t, cs, rec, parse) {
                if (t._gsTransform && rec && !parse) {
                    return t._gsTransform; //if the element already has a _gsTransform, use that. Note: some browsers don't accurately return the calculated style for the transform (particularly for SVG), so it's almost always safest to just use the values we've already applied rather than re-parsing things.
                }
                var tm = rec ? t._gsTransform || new Transform() : new Transform(),
                    invX = (tm.scaleX < 0), //in order to interpret things properly, we need to know if the user applied a negative scaleX previously so that we can adjust the rotation and skewX accordingly. Otherwise, if we always interpret a flipped matrix as affecting scaleY and the user only wants to tween the scaleX on multiple sequential tweens, it would keep the negative scaleY without that being the user's intent.
                    min = 0.00002,
                    rnd = 100000,
                    minAngle = 179.99,
                    minPI = minAngle * _DEG2RAD,
                    zOrigin = _supports3D ? parseFloat(_getStyle(t, _transformOriginProp, cs, false, "0 0 0").split(" ")[2]) || tm.zOrigin || 0 : 0,
                    defaultTransformPerspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0,
                    isDefault, s, m, i, n, dec, scaleX, scaleY, rotation, skewX;
                if (_transformProp) {
                    s = _getStyle(t, _transformPropCSS, cs, true);
                } else if (t.currentStyle) {
                    //for older versions of IE, we need to interpret the filter portion that is in the format: progid:DXImageTransform.Microsoft.Matrix(M11=6.123233995736766e-17, M12=-1, M21=1, M22=6.123233995736766e-17, sizingMethod='auto expand') Notice that we need to swap b and c compared to a normal matrix.
                    s = t.currentStyle.filter.match(_ieGetMatrixExp);
                    s = (s && s.length === 4) ? [s[0].substr(4), Number(s[2].substr(4)), Number(s[1].substr(4)), s[3].substr(4), (tm.x || 0), (tm.y || 0)].join(",") : "";
                }
                isDefault = (!s || s === "none" || s === "matrix(1, 0, 0, 1, 0, 0)");
                tm.svg = !! (_SVGElement && typeof (t.getBBox) === "function" && t.getCTM && (!t.parentNode || (t.parentNode.getBBox && t.parentNode.getCTM))); //don't just rely on "instanceof _SVGElement" because if the SVG is embedded via an object tag, it won't work (SVGElement is mapped to a different object)
                if (tm.svg) {
                    _parseSVGOrigin(t, _getStyle(t, _transformOriginProp, _cs, false, "50% 50%") + "", tm);
                    _useSVGTransformAttr = CSSPlugin.useSVGTransformAttr || _forceSVGTransformAttr;
                    m = t.getAttribute("transform");
                    if (isDefault && m && m.indexOf("matrix") !== -1) { //just in case there's a "transfom" value specified as an attribute instead of CSS style. Only accept a matrix, though.
                        s = m;
                        isDefault = 0;
                    }
                }
                if (!isDefault) {
                    //split the matrix values out into an array (m for matrix)
                    m = (s || "").match(/(?:\-|\b)[\d\-\.e]+\b/gi) || [];
                    i = m.length;
                    while (--i > -1) {
                        n = Number(m[i]);
                        m[i] = (dec = n - (n |= 0)) ? ((dec * rnd + (dec < 0 ? -0.5 : 0.5)) | 0) / rnd + n : n; //convert strings to Numbers and round to 5 decimal places to avoid issues with tiny numbers. Roughly 20x faster than Number.toFixed(). We also must make sure to round before dividing so that values like 0.9999999999 become 1 to avoid glitches in browser rendering and interpretation of flipped/rotated 3D matrices. And don't just multiply the number by rnd, floor it, and then divide by rnd because the bitwise operations max out at a 32-bit signed integer, thus it could get clipped at a relatively low value (like 22,000.00000 for example).
                    }
                    if (m.length === 16) {

                        //we'll only look at these position-related 6 variables first because if x/y/z all match, it's relatively safe to assume we don't need to re-parse everything which risks losing important rotational information (like rotationX:180 plus rotationY:180 would look the same as rotation:180 - there's no way to know for sure which direction was taken based solely on the matrix3d() values)
                        var a13 = m[8],
                            a23 = m[9],
                            a33 = m[10],
                            a14 = m[12],
                            a24 = m[13],
                            a34 = m[14];

                        //we manually compensate for non-zero z component of transformOrigin to work around bugs in Safari
                        if (tm.zOrigin) {
                            a34 = -tm.zOrigin;
                            a14 = a13 * a34 - m[12];
                            a24 = a23 * a34 - m[13];
                            a34 = a33 * a34 + tm.zOrigin - m[14];
                        }
                        var a11 = m[0],
                            a21 = m[1],
                            a31 = m[2],
                            a41 = m[3],
                            a12 = m[4],
                            a22 = m[5],
                            a32 = m[6],
                            a42 = m[7],
                            a43 = m[11],
                            angle = Math.atan2(a21, a22),
                            t1, t2, t3, cos, sin;

                        //rotation
                        tm.rotation = angle * _RAD2DEG;
                        if (angle) {
                            cos = Math.cos(-angle);
                            sin = Math.sin(-angle);
                            a11 = a11 * cos + a12 * sin;
                            t2 = a21 * cos + a22 * sin;
                            a22 = a21 * -sin + a22 * cos;
                            a32 = a31 * -sin + a32 * cos;
                            a21 = t2;
                        }

                        //rotationY
                        angle = Math.atan2(a13, a11);
                        tm.rotationY = angle * _RAD2DEG;
                        if (angle) {
                            cos = Math.cos(-angle);
                            sin = Math.sin(-angle);
                            t1 = a11 * cos - a13 * sin;
                            t2 = a21 * cos - a23 * sin;
                            t3 = a31 * cos - a33 * sin;
                            a23 = a21 * sin + a23 * cos;
                            a33 = a31 * sin + a33 * cos;
                            a43 = a41 * sin + a43 * cos;
                            a11 = t1;
                            a21 = t2;
                            a31 = t3;
                        }

                        //rotationX
                        angle = Math.atan2(a32, a33);
                        tm.rotationX = angle * _RAD2DEG;
                        if (angle) {
                            cos = Math.cos(-angle);
                            sin = Math.sin(-angle);
                            t1 = a12 * cos + a13 * sin;
                            t2 = a22 * cos + a23 * sin;
                            t3 = a32 * cos + a33 * sin;
                            a13 = a12 * -sin + a13 * cos;
                            a23 = a22 * -sin + a23 * cos;
                            a33 = a32 * -sin + a33 * cos;
                            a43 = a42 * -sin + a43 * cos;
                            a12 = t1;
                            a22 = t2;
                            a32 = t3;
                        }

                        tm.scaleX = ((Math.sqrt(a11 * a11 + a21 * a21) * rnd + 0.5) | 0) / rnd;
                        tm.scaleY = ((Math.sqrt(a22 * a22 + a23 * a23) * rnd + 0.5) | 0) / rnd;
                        tm.scaleZ = ((Math.sqrt(a32 * a32 + a33 * a33) * rnd + 0.5) | 0) / rnd;
                        tm.skewX = 0;
                        tm.perspective = a43 ? 1 / ((a43 < 0) ? -a43 : a43) : 0;
                        tm.x = a14;
                        tm.y = a24;
                        tm.z = a34;

                    } else if ((!_supports3D || parse || !m.length || tm.x !== m[4] || tm.y !== m[5] || (!tm.rotationX && !tm.rotationY)) && !(tm.x !== undefined && _getStyle(t, "display", cs) === "none")) { //sometimes a 6-element matrix is returned even when we performed 3D transforms, like if rotationX and rotationY are 180. In cases like this, we still need to honor the 3D transforms. If we just rely on the 2D info, it could affect how the data is interpreted, like scaleY might get set to -1 or rotation could get offset by 180 degrees. For example, do a TweenLite.to(element, 1, {css:{rotationX:180, rotationY:180}}) and then later, TweenLite.to(element, 1, {css:{rotationX:0}}) and without this conditional logic in place, it'd jump to a state of being unrotated when the 2nd tween starts. Then again, we need to honor the fact that the user COULD alter the transforms outside of CSSPlugin, like by manually applying new css, so we try to sense that by looking at x and y because if those changed, we know the changes were made outside CSSPlugin and we force a reinterpretation of the matrix values. Also, in Webkit browsers, if the element's "display" is "none", its calculated style value will always return empty, so if we've already recorded the values in the _gsTransform object, we'll just rely on those.
                        var k = (m.length >= 6),
                            a = k ? m[0] : 1,
                            b = m[1] || 0,
                            c = m[2] || 0,
                            d = k ? m[3] : 1;
                        tm.x = m[4] || 0;
                        tm.y = m[5] || 0;
                        scaleX = Math.sqrt(a * a + b * b);
                        scaleY = Math.sqrt(d * d + c * c);
                        rotation = (a || b) ? Math.atan2(b, a) * _RAD2DEG : tm.rotation || 0; //note: if scaleX is 0, we cannot accurately measure rotation. Same for skewX with a scaleY of 0. Therefore, we default to the previously recorded value (or zero if that doesn't exist).
                        skewX = (c || d) ? Math.atan2(c, d) * _RAD2DEG + rotation : tm.skewX || 0;
                        if (Math.abs(skewX) > 90 && Math.abs(skewX) < 270) {
                            if (invX) {
                                scaleX *= -1;
                                skewX += (rotation <= 0) ? 180 : -180;
                                rotation += (rotation <= 0) ? 180 : -180;
                            } else {
                                scaleY *= -1;
                                skewX += (skewX <= 0) ? 180 : -180;
                            }
                        }
                        tm.scaleX = scaleX;
                        tm.scaleY = scaleY;
                        tm.rotation = rotation;
                        tm.skewX = skewX;
                        if (_supports3D) {
                            tm.rotationX = tm.rotationY = tm.z = 0;
                            tm.perspective = defaultTransformPerspective;
                            tm.scaleZ = 1;
                        }
                    }
                    tm.zOrigin = zOrigin;
                    //some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases. The conditional logic here is faster than calling Math.abs(). Also, browsers tend to render a SLIGHTLY rotated object in a fuzzy way, so we need to snap to exactly 0 when appropriate.
                    for (i in tm) {
                        if (tm[i] < min) if (tm[i] > -min) {
                            tm[i] = 0;
                        }
                    }
                }
                //DEBUG: _log("parsed rotation: "+(tm.rotationX)+", "+(tm.rotationY)+", "+(tm.rotation)+", scale: "+tm.scaleX+", "+tm.scaleY+", "+tm.scaleZ+", position: "+tm.x+", "+tm.y+", "+tm.z+", perspective: "+tm.perspective);
                if (rec) {
                    t._gsTransform = tm; //record to the object's _gsTransform which we use so that tweens can control individual properties independently (we need all the properties to accurately recompose the matrix in the setRatio() method)
                }
                return tm;
            },

            //for setting 2D transforms in IE6, IE7, and IE8 (must use a "filter" to emulate the behavior of modern day browser transforms)
            _setIETransformRatio = function (v) {
                var t = this.data, //refers to the element's _gsTransform object
                    ang = -t.rotation * _DEG2RAD,
                    skew = ang + t.skewX * _DEG2RAD,
                    rnd = 100000,
                    a = ((Math.cos(ang) * t.scaleX * rnd) | 0) / rnd,
                    b = ((Math.sin(ang) * t.scaleX * rnd) | 0) / rnd,
                    c = ((Math.sin(skew) * -t.scaleY * rnd) | 0) / rnd,
                    d = ((Math.cos(skew) * t.scaleY * rnd) | 0) / rnd,
                    style = this.t.style,
                    cs = this.t.currentStyle,
                    filters, val;
                if (!cs) {
                    return;
                }
                val = b; //just for swapping the variables an inverting them (reused "val" to avoid creating another variable in memory). IE's filter matrix uses a non-standard matrix configuration (angle goes the opposite way, and b and c are reversed and inverted)
                b = -c;
                c = -val;
                filters = cs.filter;
                style.filter = ""; //remove filters so that we can accurately measure offsetWidth/offsetHeight
                var w = this.t.offsetWidth,
                    h = this.t.offsetHeight,
                    clip = (cs.position !== "absolute"),
                    m = "progid:DXImageTransform.Microsoft.Matrix(M11=" + a + ", M12=" + b + ", M21=" + c + ", M22=" + d,
                    ox = t.x + (w * t.xPercent / 100),
                    oy = t.y + (h * t.yPercent / 100),
                    dx, dy;

                //if transformOrigin is being used, adjust the offset x and y
                if (t.ox != null) {
                    dx = ((t.oxp) ? w * t.ox * 0.01 : t.ox) - w / 2;
                    dy = ((t.oyp) ? h * t.oy * 0.01 : t.oy) - h / 2;
                    ox += dx - (dx * a + dy * b);
                    oy += dy - (dx * c + dy * d);
                }

                if (!clip) {
                    m += ", sizingMethod='auto expand')";
                } else {
                    dx = (w / 2);
                    dy = (h / 2);
                    //translate to ensure that transformations occur around the correct origin (default is center).
                    m += ", Dx=" + (dx - (dx * a + dy * b) + ox) + ", Dy=" + (dy - (dx * c + dy * d) + oy) + ")";
                }
                if (filters.indexOf("DXImageTransform.Microsoft.Matrix(") !== -1) {
                    style.filter = filters.replace(_ieSetMatrixExp, m);
                } else {
                    style.filter = m + " " + filters; //we must always put the transform/matrix FIRST (before alpha(opacity=xx)) to avoid an IE bug that slices part of the object when rotation is applied with alpha.
                }

                //at the end or beginning of the tween, if the matrix is normal (1, 0, 0, 1) and opacity is 100 (or doesn't exist), remove the filter to improve browser performance.
                if (v === 0 || v === 1) if (a === 1) if (b === 0) if (c === 0) if (d === 1) if (!clip || m.indexOf("Dx=0, Dy=0") !== -1) if (!_opacityExp.test(filters) || parseFloat(RegExp.$1) === 100) if (filters.indexOf("gradient(" && filters.indexOf("Alpha")) === -1) {
                    style.removeAttribute("filter");
                }

                //we must set the margins AFTER applying the filter in order to avoid some bugs in IE8 that could (in rare scenarios) cause them to be ignored intermittently (vibration).
                if (!clip) {
                    var mult = (_ieVers < 8) ? 1 : -1, //in Internet Explorer 7 and before, the box model is broken, causing the browser to treat the width/height of the actual rotated filtered image as the width/height of the box itself, but Microsoft corrected that in IE8. We must use a negative offset in IE8 on the right/bottom
                        marg, prop, dif;
                    dx = t.ieOffsetX || 0;
                    dy = t.ieOffsetY || 0;
                    t.ieOffsetX = Math.round((w - ((a < 0 ? -a : a) * w + (b < 0 ? -b : b) * h)) / 2 + ox);
                    t.ieOffsetY = Math.round((h - ((d < 0 ? -d : d) * h + (c < 0 ? -c : c) * w)) / 2 + oy);
                    for (i = 0; i < 4; i++) {
                        prop = _margins[i];
                        marg = cs[prop];
                        //we need to get the current margin in case it is being tweened separately (we want to respect that tween's changes)
                        val = (marg.indexOf("px") !== -1) ? parseFloat(marg) : _convertToPixels(this.t, prop, parseFloat(marg), marg.replace(_suffixExp, "")) || 0;
                        if (val !== t[prop]) {
                            dif = (i < 2) ? -t.ieOffsetX : -t.ieOffsetY; //if another tween is controlling a margin, we cannot only apply the difference in the ieOffsets, so we essentially zero-out the dx and dy here in that case. We record the margin(s) later so that we can keep comparing them, making this code very flexible.
                        } else {
                            dif = (i < 2) ? dx - t.ieOffsetX : dy - t.ieOffsetY;
                        }
                        style[prop] = (t[prop] = Math.round(val - dif * ((i === 0 || i === 2) ? 1 : mult))) + "px";
                    }
                }
            },

            _set3DTransformRatio = _internals.set3DTransformRatio = function (v) {
                var t = this.data, //refers to the element's _gsTransform object
                    style = this.t.style,
                    angle = t.rotation * _DEG2RAD,
                    sx = t.scaleX,
                    sy = t.scaleY,
                    sz = t.scaleZ,
                    x = t.x,
                    y = t.y,
                    z = t.z,
                    perspective = t.perspective,
                    a11, a12, a13, a14, a21, a22, a23, a24, a31, a32, a33, a34, a41, a42, a43,
                    zOrigin, rnd, cos, sin, t1, t2, t3, t4, transform, comma;
                if (v === 1 || v === 0) if (t.force3D === "auto") if (!t.rotationY && !t.rotationX && sz === 1 && !perspective && !z) { //on the final render (which could be 0 for a from tween), if there are no 3D aspects, render in 2D to free up memory and improve performance especially on mobile devices
                    _set2DTransformRatio.call(this, v);
                    return;
                }
                if (_isFirefox) {
                    var n = 0.0001;
                    if (sx < n && sx > -n) { //Firefox has a bug (at least in v25) that causes it to render the transparent part of 32-bit PNG images as black when displayed inside an iframe and the 3D scale is very small and doesn't change sufficiently enough between renders (like if you use a Power4.easeInOut to scale from 0 to 1 where the beginning values only change a tiny amount to begin the tween before accelerating). In this case, we force the scale to be 0.00002 instead which is visually the same but works around the Firefox issue.
                        sx = sz = 0.00002;
                    }
                    if (sy < n && sy > -n) {
                        sy = sz = 0.00002;
                    }
                    if (perspective && !t.z && !t.rotationX && !t.rotationY) { //Firefox has a bug that causes elements to have an odd super-thin, broken/dotted black border on elements that have a perspective set but aren't utilizing 3D space (no rotationX, rotationY, or z).
                        perspective = 0;
                    }
                }
                if (angle || t.skewX) {
                    cos = Math.cos(angle);
                    sin = Math.sin(angle);
                    a11 = cos;
                    a21 = sin;
                    if (t.skewX) {
                        angle -= t.skewX * _DEG2RAD;
                        cos = Math.cos(angle);
                        sin = Math.sin(angle);
                        if (t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
                            t1 = Math.tan(t.skewX * _DEG2RAD);
                            t1 = Math.sqrt(1 + t1 * t1);
                            cos *= t1;
                            sin *= t1;
                        }
                    }
                    a12 = -sin;
                    a22 = cos;

                } else if (!t.rotationY && !t.rotationX && sz === 1 && !perspective && !t.svg) { //if we're only translating and/or 2D scaling, this is faster...
                    style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) translate3d(" : "translate3d(") + x + "px," + y + "px," + z + "px)" + ((sx !== 1 || sy !== 1) ? " scale(" + sx + "," + sy + ")" : "");
                    return;
                } else {
                    a11 = a22 = 1;
                    a12 = a21 = 0;
                }
                a33 = 1;
                a13 = a14 = a23 = a24 = a31 = a32 = a34 = a41 = a42 = 0;
                a43 = (perspective) ? -1 / perspective : 0;
                zOrigin = t.zOrigin;
                rnd = 100000;
                comma = ",";
                angle = t.rotationY * _DEG2RAD;
                if (angle) {
                    cos = Math.cos(angle);
                    sin = Math.sin(angle);
                    a31 = a33 * -sin;
                    a41 = a43 * -sin;
                    a13 = a11 * sin;
                    a23 = a21 * sin;
                    a33 *= cos;
                    a43 *= cos;
                    a11 *= cos;
                    a21 *= cos;
                }
                angle = t.rotationX * _DEG2RAD;
                if (angle) {
                    cos = Math.cos(angle);
                    sin = Math.sin(angle);
                    t1 = a12 * cos + a13 * sin;
                    t2 = a22 * cos + a23 * sin;
                    t3 = a32 * cos + a33 * sin;
                    t4 = a42 * cos + a43 * sin;
                    a13 = a12 * -sin + a13 * cos;
                    a23 = a22 * -sin + a23 * cos;
                    a33 = a32 * -sin + a33 * cos;
                    a43 = a42 * -sin + a43 * cos;
                    a12 = t1;
                    a22 = t2;
                    a32 = t3;
                    a42 = t4;
                }
                if (sz !== 1) {
                    a13 *= sz;
                    a23 *= sz;
                    a33 *= sz;
                    a43 *= sz;
                }
                if (sy !== 1) {
                    a12 *= sy;
                    a22 *= sy;
                    a32 *= sy;
                    a42 *= sy;
                }
                if (sx !== 1) {
                    a11 *= sx;
                    a21 *= sx;
                    a31 *= sx;
                    a41 *= sx;
                }
                if (zOrigin) {
                    a34 -= zOrigin;
                    a14 = a13 * a34;
                    a24 = a23 * a34;
                    a34 = a33 * a34 + zOrigin;
                }
                if (t.svg) { //due to bugs in some browsers, we need to manage the transform-origin of SVG manually
                    a14 += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12);
                    a24 += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22);
                }
                //we round the x, y, and z slightly differently to allow even larger values.
                a14 = (t1 = (a14 += x) - (a14 |= 0)) ? ((t1 * rnd + (t1 < 0 ? -0.5 : 0.5)) | 0) / rnd + a14 : a14;
                a24 = (t1 = (a24 += y) - (a24 |= 0)) ? ((t1 * rnd + (t1 < 0 ? -0.5 : 0.5)) | 0) / rnd + a24 : a24;
                a34 = (t1 = (a34 += z) - (a34 |= 0)) ? ((t1 * rnd + (t1 < 0 ? -0.5 : 0.5)) | 0) / rnd + a34 : a34;

                //optimized way of concatenating all the values into a string. If we do it all in one shot, it's slower because of the way browsers have to create temp strings and the way it affects memory. If we do it piece-by-piece with +=, it's a bit slower too. We found that doing it in these sized chunks works best overall:
                transform = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix3d(" : "matrix3d(");
                transform += ((a11 * rnd) | 0) / rnd + comma + ((a21 * rnd) | 0) / rnd + comma + ((a31 * rnd) | 0) / rnd;
                transform += comma + ((a41 * rnd) | 0) / rnd + comma + ((a12 * rnd) | 0) / rnd + comma + ((a22 * rnd) | 0) / rnd;
                transform += comma + ((a32 * rnd) | 0) / rnd + comma + ((a42 * rnd) | 0) / rnd + comma + ((a13 * rnd) | 0) / rnd;
                transform += comma + ((a23 * rnd) | 0) / rnd + comma + ((a33 * rnd) | 0) / rnd + comma + ((a43 * rnd) | 0) / rnd;
                transform += comma + a14 + comma + a24 + comma + a34 + comma + (perspective ? (1 + (-a34 / perspective)) : 1) + ")";
                style[_transformProp] = transform;

                //OLD (slower on most devices): style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix3d(" : "matrix3d(") + [ (((a11 * rnd) | 0) / rnd), (((a21 * rnd) | 0) / rnd), (((a31 * rnd) | 0) / rnd), (((a41 * rnd) | 0) / rnd), (((a12 * rnd) | 0) / rnd), (((a22 * rnd) | 0) / rnd), (((a32 * rnd) | 0) / rnd), (((a42 * rnd) | 0) / rnd), (((a13 * rnd) | 0) / rnd), (((a23 * rnd) | 0) / rnd), (((a33 * rnd) | 0) / rnd), (((a43 * rnd) | 0) / rnd), a14, a24, a34, (perspective ? (1 + (-a34 / perspective)) : 1) ].join(",") + ")";
            },

            _set2DTransformRatio = _internals.set2DTransformRatio = function (v) {
                var t = this.data, //refers to the element's _gsTransform object
                    targ = this.t,
                    style = targ.style,
                    x = t.x,
                    y = t.y,
                    ang, skew, rnd, sx, sy, a, b, c, d, matrix, min;
                if ((t.rotationX || t.rotationY || t.z || t.force3D === true || (t.force3D === "auto" && v !== 1 && v !== 0)) && !(t.svg && _useSVGTransformAttr) && _supports3D) { //if a 3D tween begins while a 2D one is running, we need to kick the rendering over to the 3D method. For example, imagine a yoyo-ing, infinitely repeating scale tween running, and then the object gets rotated in 3D space with a different tween.
                    this.setRatio = _set3DTransformRatio;
                    _set3DTransformRatio.call(this, v);
                    return;
                }
                sx = t.scaleX;
                sy = t.scaleY;
                if (t.rotation || t.skewX || t.svg) {
                    ang = t.rotation * _DEG2RAD;
                    skew = ang - t.skewX * _DEG2RAD;
                    rnd = 100000;
                    a = Math.cos(ang) * sx;
                    b = Math.sin(ang) * sx;
                    c = Math.sin(skew) * -sy;
                    d = Math.cos(skew) * sy;
                    if (t.svg) {
                        x += t.xOrigin - (t.xOrigin * a + t.yOrigin * c);
                        y += t.yOrigin - (t.xOrigin * b + t.yOrigin * d);
                        min = 0.000001;
                        if (x < min) if (x > -min) {
                            x = 0;
                        }
                        if (y < min) if (y > -min) {
                            y = 0;
                        }
                    }
                    matrix = (((a * rnd) | 0) / rnd) + "," + (((b * rnd) | 0) / rnd) + "," + (((c * rnd) | 0) / rnd) + "," + (((d * rnd) | 0) / rnd) + "," + x + "," + y + ")";
                    if (t.svg && _useSVGTransformAttr) {
                        targ.setAttribute("transform", "matrix(" + matrix);
                    } else {
                        //some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 5 decimal places.
                        style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + matrix;
                    }
                } else {
                    style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + sx + ",0,0," + sy + "," + x + "," + y + ")";
                }
            };

        p = Transform.prototype;
        p.x = p.y = p.z = p.skewX = p.skewY = p.rotation = p.rotationX = p.rotationY = p.zOrigin = p.xPercent = p.yPercent = 0;
        p.scaleX = p.scaleY = p.scaleZ = 1;

        _registerComplexSpecialProp("transform,scale,scaleX,scaleY,scaleZ,x,y,z,rotation,rotationX,rotationY,rotationZ,skewX,skewY,shortRotation,shortRotationX,shortRotationY,shortRotationZ,transformOrigin,transformPerspective,directionalRotation,parseTransform,force3D,skewType,xPercent,yPercent", {
            parser: function (t, e, p, cssp, pt, plugin, vars) {
                if (cssp._lastParsedTransform === vars) {
                    return pt;
                } //only need to parse the transform once, and only if the browser supports it.
                cssp._lastParsedTransform = vars;
                var m1 = cssp._transform = _getTransform(t, _cs, true, vars.parseTransform),
                    style = t.style,
                    min = 0.000001,
                    i = _transformProps.length,
                    v = vars,
                    endRotations = {},
                    m2, skewY, copy, orig, has3D, hasChange, dr;
                if (typeof (v.transform) === "string" && _transformProp) { //for values like transform:"rotate(60deg) scale(0.5, 0.8)"
                    copy = _tempDiv.style; //don't use the original target because it might be SVG in which case some browsers don't report computed style correctly.
                    copy[_transformProp] = v.transform;
                    copy.display = "block"; //if display is "none", the browser often refuses to report the transform properties correctly.
                    copy.position = "absolute";
                    _doc.body.appendChild(_tempDiv);
                    m2 = _getTransform(_tempDiv, null, false);
                    _doc.body.removeChild(_tempDiv);
                } else if (typeof (v) === "object") { //for values like scaleX, scaleY, rotation, x, y, skewX, and skewY or transform:{...} (object)
                    m2 = {
                        scaleX: _parseVal((v.scaleX != null) ? v.scaleX : v.scale, m1.scaleX),
                        scaleY: _parseVal((v.scaleY != null) ? v.scaleY : v.scale, m1.scaleY),
                        scaleZ: _parseVal(v.scaleZ, m1.scaleZ),
                        x: _parseVal(v.x, m1.x),
                        y: _parseVal(v.y, m1.y),
                        z: _parseVal(v.z, m1.z),
                        xPercent: _parseVal(v.xPercent, m1.xPercent),
                        yPercent: _parseVal(v.yPercent, m1.yPercent),
                        perspective: _parseVal(v.transformPerspective, m1.perspective)
                    };
                    dr = v.directionalRotation;
                    if (dr != null) {
                        if (typeof (dr) === "object") {
                            for (copy in dr) {
                                v[copy] = dr[copy];
                            }
                        } else {
                            v.rotation = dr;
                        }
                    }
                    if (typeof (v.x) === "string" && v.x.indexOf("%") !== -1) {
                        m2.x = 0;
                        m2.xPercent = _parseVal(v.x, m1.xPercent);
                    }
                    if (typeof (v.y) === "string" && v.y.indexOf("%") !== -1) {
                        m2.y = 0;
                        m2.yPercent = _parseVal(v.y, m1.yPercent);
                    }

                    m2.rotation = _parseAngle(("rotation" in v) ? v.rotation : ("shortRotation" in v) ? v.shortRotation + "_short" : ("rotationZ" in v) ? v.rotationZ : m1.rotation, m1.rotation, "rotation", endRotations);
                    if (_supports3D) {
                        m2.rotationX = _parseAngle(("rotationX" in v) ? v.rotationX : ("shortRotationX" in v) ? v.shortRotationX + "_short" : m1.rotationX || 0, m1.rotationX, "rotationX", endRotations);
                        m2.rotationY = _parseAngle(("rotationY" in v) ? v.rotationY : ("shortRotationY" in v) ? v.shortRotationY + "_short" : m1.rotationY || 0, m1.rotationY, "rotationY", endRotations);
                    }
                    m2.skewX = (v.skewX == null) ? m1.skewX : _parseAngle(v.skewX, m1.skewX);

                    //note: for performance reasons, we combine all skewing into the skewX and rotation values, ignoring skewY but we must still record it so that we can discern how much of the overall skew is attributed to skewX vs. skewY. Otherwise, if the skewY would always act relative (tween skewY to 10deg, for example, multiple times and if we always combine things into skewX, we can't remember that skewY was 10 from last time). Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of -10 degrees.
                    m2.skewY = (v.skewY == null) ? m1.skewY : _parseAngle(v.skewY, m1.skewY);
                    if ((skewY = m2.skewY - m1.skewY)) {
                        m2.skewX += skewY;
                        m2.rotation += skewY;
                    }
                }
                if (_supports3D && v.force3D != null) {
                    m1.force3D = v.force3D;
                    hasChange = true;
                }

                m1.skewType = v.skewType || m1.skewType || CSSPlugin.defaultSkewType;

                has3D = (m1.force3D || m1.z || m1.rotationX || m1.rotationY || m2.z || m2.rotationX || m2.rotationY || m2.perspective);
                if (!has3D && v.scale != null) {
                    m2.scaleZ = 1; //no need to tween scaleZ.
                }

                while (--i > -1) {
                    p = _transformProps[i];
                    orig = m2[p] - m1[p];
                    if (orig > min || orig < -min || v[p] != null || _forcePT[p] != null) {
                        hasChange = true;
                        pt = new CSSPropTween(m1, p, m1[p], orig, pt);
                        if (p in endRotations) {
                            pt.e = endRotations[p]; //directional rotations typically have compensated values during the tween, but we need to make sure they end at exactly what the user requested
                        }
                        pt.xs0 = 0; //ensures the value stays numeric in setRatio()
                        pt.plugin = plugin;
                        cssp._overwriteProps.push(pt.n);
                    }
                }

                orig = v.transformOrigin;
                if (orig && m1.svg) {
                    _parseSVGOrigin(t, orig, m2);
                    pt = new CSSPropTween(m1, "xOrigin", m1.xOrigin, m2.xOrigin - m1.xOrigin, pt, -1, "transformOrigin");
                    pt.b = m1.xOrigin;
                    pt.e = pt.xs0 = m2.xOrigin;
                    pt = new CSSPropTween(m1, "yOrigin", m1.yOrigin, m2.yOrigin - m1.yOrigin, pt, -1, "transformOrigin");
                    pt.b = m1.yOrigin;
                    pt.e = pt.xs0 = m2.yOrigin;
                    orig = "0px 0px"; //certain browsers (like firefox) completely botch transform-origin, so we must remove it to prevent it from contaminating transforms. We manage it ourselves with xOrigin and yOrigin
                }
                if (orig || (_supports3D && has3D && m1.zOrigin)) { //if anything 3D is happening and there's a transformOrigin with a z component that's non-zero, we must ensure that the transformOrigin's z-component is set to 0 so that we can manually do those calculations to get around Safari bugs. Even if the user didn't specifically define a "transformOrigin" in this particular tween (maybe they did it via css directly).
                    if (_transformProp) {
                        hasChange = true;
                        p = _transformOriginProp;
                        orig = (orig || _getStyle(t, p, _cs, false, "50% 50%")) + ""; //cast as string to avoid errors
                        pt = new CSSPropTween(style, p, 0, 0, pt, -1, "transformOrigin");
                        pt.b = style[p];
                        pt.plugin = plugin;
                        if (_supports3D) {
                            copy = m1.zOrigin;
                            orig = orig.split(" ");
                            m1.zOrigin = ((orig.length > 2 && !(copy !== 0 && orig[2] === "0px")) ? parseFloat(orig[2]) : copy) || 0; //Safari doesn't handle the z part of transformOrigin correctly, so we'll manually handle it in the _set3DTransformRatio() method.
                            pt.xs0 = pt.e = orig[0] + " " + (orig[1] || "50%") + " 0px"; //we must define a z value of 0px specifically otherwise iOS 5 Safari will stick with the old one (if one was defined)!
                            pt = new CSSPropTween(m1, "zOrigin", 0, 0, pt, -1, pt.n); //we must create a CSSPropTween for the _gsTransform.zOrigin so that it gets reset properly at the beginning if the tween runs backward (as opposed to just setting m1.zOrigin here)
                            pt.b = copy;
                            pt.xs0 = pt.e = m1.zOrigin;
                        } else {
                            pt.xs0 = pt.e = orig;
                        }

                        //for older versions of IE (6-8), we need to manually calculate things inside the setRatio() function. We record origin x and y (ox and oy) and whether or not the values are percentages (oxp and oyp).
                    } else {
                        _parsePosition(orig + "", m1);
                    }
                }
                if (hasChange) {
                    cssp._transformType = (!(m1.svg && _useSVGTransformAttr) && (has3D || this._transformType === 3)) ? 3 : 2; //quicker than calling cssp._enableTransforms();
                }
                return pt;
            },
            prefix: true
        });

        _registerComplexSpecialProp("boxShadow", {
            defaultValue: "0px 0px 0px 0px #999",
            prefix: true,
            color: true,
            multi: true,
            keyword: "inset"
        });

        _registerComplexSpecialProp("borderRadius", {
            defaultValue: "0px",
            parser: function (t, e, p, cssp, pt, plugin) {
                e = this.format(e);
                var props = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
                    style = t.style,
                    ea1, i, es2, bs2, bs, es, bn, en, w, h, esfx, bsfx, rel, hn, vn, em;
                w = parseFloat(t.offsetWidth);
                h = parseFloat(t.offsetHeight);
                ea1 = e.split(" ");
                for (i = 0; i < props.length; i++) { //if we're dealing with percentages, we must convert things separately for the horizontal and vertical axis!
                    if (this.p.indexOf("border")) { //older browsers used a prefix
                        props[i] = _checkPropPrefix(props[i]);
                    }
                    bs = bs2 = _getStyle(t, props[i], _cs, false, "0px");
                    if (bs.indexOf(" ") !== -1) {
                        bs2 = bs.split(" ");
                        bs = bs2[0];
                        bs2 = bs2[1];
                    }
                    es = es2 = ea1[i];
                    bn = parseFloat(bs);
                    bsfx = bs.substr((bn + "").length);
                    rel = (es.charAt(1) === "=");
                    if (rel) {
                        en = parseInt(es.charAt(0) + "1", 10);
                        es = es.substr(2);
                        en *= parseFloat(es);
                        esfx = es.substr((en + "").length - (en < 0 ? 1 : 0)) || "";
                    } else {
                        en = parseFloat(es);
                        esfx = es.substr((en + "").length);
                    }
                    if (esfx === "") {
                        esfx = _suffixMap[p] || bsfx;
                    }
                    if (esfx !== bsfx) {
                        hn = _convertToPixels(t, "borderLeft", bn, bsfx); //horizontal number (we use a bogus "borderLeft" property just because the _convertToPixels() method searches for the keywords "Left", "Right", "Top", and "Bottom" to determine of it's a horizontal or vertical property, and we need "border" in the name so that it knows it should measure relative to the element itself, not its parent.
                        vn = _convertToPixels(t, "borderTop", bn, bsfx); //vertical number
                        if (esfx === "%") {
                            bs = (hn / w * 100) + "%";
                            bs2 = (vn / h * 100) + "%";
                        } else if (esfx === "em") {
                            em = _convertToPixels(t, "borderLeft", 1, "em");
                            bs = (hn / em) + "em";
                            bs2 = (vn / em) + "em";
                        } else {
                            bs = hn + "px";
                            bs2 = vn + "px";
                        }
                        if (rel) {
                            es = (parseFloat(bs) + en) + esfx;
                            es2 = (parseFloat(bs2) + en) + esfx;
                        }
                    }
                    pt = _parseComplex(style, props[i], bs + " " + bs2, es + " " + es2, false, "0px", pt);
                }
                return pt;
            },
            prefix: true,
            formatter: _getFormatter("0px 0px 0px 0px", false, true)
        });
        _registerComplexSpecialProp("backgroundPosition", {
            defaultValue: "0 0",
            parser: function (t, e, p, cssp, pt, plugin) {
                var bp = "background-position",
                    cs = (_cs || _getComputedStyle(t, null)),
                    bs = this.format(((cs) ? _ieVers ? cs.getPropertyValue(bp + "-x") + " " + cs.getPropertyValue(bp + "-y") : cs.getPropertyValue(bp) : t.currentStyle.backgroundPositionX + " " + t.currentStyle.backgroundPositionY) || "0 0"), //Internet Explorer doesn't report background-position correctly - we must query background-position-x and background-position-y and combine them (even in IE10). Before IE9, we must do the same with the currentStyle object and use camelCase
                    es = this.format(e),
                    ba, ea, i, pct, overlap, src;
                if ((bs.indexOf("%") !== -1) !== (es.indexOf("%") !== -1)) {
                    src = _getStyle(t, "backgroundImage").replace(_urlExp, "");
                    if (src && src !== "none") {
                        ba = bs.split(" ");
                        ea = es.split(" ");
                        _tempImg.setAttribute("src", src); //set the temp IMG's src to the background-image so that we can measure its width/height
                        i = 2;
                        while (--i > -1) {
                            bs = ba[i];
                            pct = (bs.indexOf("%") !== -1);
                            if (pct !== (ea[i].indexOf("%") !== -1)) {
                                overlap = (i === 0) ? t.offsetWidth - _tempImg.width : t.offsetHeight - _tempImg.height;
                                ba[i] = pct ? (parseFloat(bs) / 100 * overlap) + "px" : (parseFloat(bs) / overlap * 100) + "%";
                            }
                        }
                        bs = ba.join(" ");
                    }
                }
                return this.parseComplex(t.style, bs, es, pt, plugin);
            },
            formatter: _parsePosition
        });
        _registerComplexSpecialProp("backgroundSize", {
            defaultValue: "0 0",
            formatter: _parsePosition
        });
        _registerComplexSpecialProp("perspective", {
            defaultValue: "0px",
            prefix: true
        });
        _registerComplexSpecialProp("perspectiveOrigin", {
            defaultValue: "50% 50%",
            prefix: true
        });
        _registerComplexSpecialProp("transformStyle", {
            prefix: true
        });
        _registerComplexSpecialProp("backfaceVisibility", {
            prefix: true
        });
        _registerComplexSpecialProp("userSelect", {
            prefix: true
        });
        _registerComplexSpecialProp("margin", {
            parser: _getEdgeParser("marginTop,marginRight,marginBottom,marginLeft")
        });
        _registerComplexSpecialProp("padding", {
            parser: _getEdgeParser("paddingTop,paddingRight,paddingBottom,paddingLeft")
        });
        _registerComplexSpecialProp("clip", {
            defaultValue: "rect(0px,0px,0px,0px)",
            parser: function (t, e, p, cssp, pt, plugin) {
                var b, cs, delim;
                if (_ieVers < 9) { //IE8 and earlier don't report a "clip" value in the currentStyle - instead, the values are split apart into clipTop, clipRight, clipBottom, and clipLeft. Also, in IE7 and earlier, the values inside rect() are space-delimited, not comma-delimited.
                    cs = t.currentStyle;
                    delim = _ieVers < 8 ? " " : ",";
                    b = "rect(" + cs.clipTop + delim + cs.clipRight + delim + cs.clipBottom + delim + cs.clipLeft + ")";
                    e = this.format(e).split(",").join(delim);
                } else {
                    b = this.format(_getStyle(t, this.p, _cs, false, this.dflt));
                    e = this.format(e);
                }
                return this.parseComplex(t.style, b, e, pt, plugin);
            }
        });
        _registerComplexSpecialProp("textShadow", {
            defaultValue: "0px 0px 0px #999",
            color: true,
            multi: true
        });
        _registerComplexSpecialProp("autoRound,strictUnits", {
            parser: function (t, e, p, cssp, pt) {
                return pt;
            }
        }); //just so that we can ignore these properties (not tween them)
        _registerComplexSpecialProp("border", {
            defaultValue: "0px solid #000",
            parser: function (t, e, p, cssp, pt, plugin) {
                return this.parseComplex(t.style, this.format(_getStyle(t, "borderTopWidth", _cs, false, "0px") + " " + _getStyle(t, "borderTopStyle", _cs, false, "solid") + " " + _getStyle(t, "borderTopColor", _cs, false, "#000")), this.format(e), pt, plugin);
            },
            color: true,
            formatter: function (v) {
                var a = v.split(" ");
                return a[0] + " " + (a[1] || "solid") + " " + (v.match(_colorExp) || ["#000"])[0];
            }
        });
        _registerComplexSpecialProp("borderWidth", {
            parser: _getEdgeParser("borderTopWidth,borderRightWidth,borderBottomWidth,borderLeftWidth")
        }); //Firefox doesn't pick up on borderWidth set in style sheets (only inline).
        _registerComplexSpecialProp("float,cssFloat,styleFloat", {
            parser: function (t, e, p, cssp, pt, plugin) {
                var s = t.style,
                    prop = ("cssFloat" in s) ? "cssFloat" : "styleFloat";
                return new CSSPropTween(s, prop, 0, 0, pt, -1, p, false, 0, s[prop], e);
            }
        });

        //opacity-related
        var _setIEOpacityRatio = function (v) {
            var t = this.t, //refers to the element's style property
                filters = t.filter || _getStyle(this.data, "filter") || "",
                val = (this.s + this.c * v) | 0,
                skip;
            if (val === 100) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance, but make sure there isn't a transform (matrix) or gradient in the filters.
                if (filters.indexOf("atrix(") === -1 && filters.indexOf("radient(") === -1 && filters.indexOf("oader(") === -1) {
                    t.removeAttribute("filter");
                    skip = (!_getStyle(this.data, "filter")); //if a class is applied that has an alpha filter, it will take effect (we don't want that), so re-apply our alpha filter in that case. We must first remove it and then check.
                } else {
                    t.filter = filters.replace(_alphaFilterExp, "");
                    skip = true;
                }
            }
            if (!skip) {
                if (this.xn1) {
                    t.filter = filters = filters || ("alpha(opacity=" + val + ")"); //works around bug in IE7/8 that prevents changes to "visibility" from being applied properly if the filter is changed to a different alpha on the same frame.
                }
                if (filters.indexOf("pacity") === -1) { //only used if browser doesn't support the standard opacity style property (IE 7 and 8). We omit the "O" to avoid case-sensitivity issues
                    if (val !== 0 || !this.xn1) { //bugs in IE7/8 won't render the filter properly if opacity is ADDED on the same frame/render as "visibility" changes (this.xn1 is 1 if this tween is an "autoAlpha" tween)
                        t.filter = filters + " alpha(opacity=" + val + ")"; //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
                    }
                } else {
                    t.filter = filters.replace(_opacityExp, "opacity=" + val);
                }
            }
        };
        _registerComplexSpecialProp("opacity,alpha,autoAlpha", {
            defaultValue: "1",
            parser: function (t, e, p, cssp, pt, plugin) {
                var b = parseFloat(_getStyle(t, "opacity", _cs, false, "1")),
                    style = t.style,
                    isAutoAlpha = (p === "autoAlpha");
                if (typeof (e) === "string" && e.charAt(1) === "=") {
                    e = ((e.charAt(0) === "-") ? -1 : 1) * parseFloat(e.substr(2)) + b;
                }
                if (isAutoAlpha && b === 1 && _getStyle(t, "visibility", _cs) === "hidden" && e !== 0) { //if visibility is initially set to "hidden", we should interpret that as intent to make opacity 0 (a convenience)
                    b = 0;
                }
                if (_supportsOpacity) {
                    pt = new CSSPropTween(style, "opacity", b, e - b, pt);
                } else {
                    pt = new CSSPropTween(style, "opacity", b * 100, (e - b) * 100, pt);
                    pt.xn1 = isAutoAlpha ? 1 : 0; //we need to record whether or not this is an autoAlpha so that in the setRatio(), we know to duplicate the setting of the alpha in order to work around a bug in IE7 and IE8 that prevents changes to "visibility" from taking effect if the filter is changed to a different alpha(opacity) at the same time. Setting it to the SAME value first, then the new value works around the IE7/8 bug.
                    style.zoom = 1; //helps correct an IE issue.
                    pt.type = 2;
                    pt.b = "alpha(opacity=" + pt.s + ")";
                    pt.e = "alpha(opacity=" + (pt.s + pt.c) + ")";
                    pt.data = t;
                    pt.plugin = plugin;
                    pt.setRatio = _setIEOpacityRatio;
                }
                if (isAutoAlpha) { //we have to create the "visibility" PropTween after the opacity one in the linked list so that they run in the order that works properly in IE8 and earlier
                    pt = new CSSPropTween(style, "visibility", 0, 0, pt, -1, null, false, 0, ((b !== 0) ? "inherit" : "hidden"), ((e === 0) ? "hidden" : "inherit"));
                    pt.xs0 = "inherit";
                    cssp._overwriteProps.push(pt.n);
                    cssp._overwriteProps.push(p);
                }
                return pt;
            }
        });


        var _removeProp = function (s, p) {
            if (p) {
                if (s.removeProperty) {
                    if (p.substr(0, 2) === "ms") { //Microsoft browsers don't conform to the standard of capping the first prefix character, so we adjust so that when we prefix the caps with a dash, it's correct (otherwise it'd be "ms-transform" instead of "-ms-transform" for IE9, for example)
                        p = "M" + p.substr(1);
                    }
                    s.removeProperty(p.replace(_capsExp, "-$1").toLowerCase());
                } else { //note: old versions of IE use "removeAttribute()" instead of "removeProperty()"
                    s.removeAttribute(p);
                }
            }
        },
        _setClassNameRatio = function (v) {
            this.t._gsClassPT = this;
            if (v === 1 || v === 0) {
                this.t.setAttribute("class", (v === 0) ? this.b : this.e);
                var mpt = this.data, //first MiniPropTween
                    s = this.t.style;
                while (mpt) {
                    if (!mpt.v) {
                        _removeProp(s, mpt.p);
                    } else {
                        s[mpt.p] = mpt.v;
                    }
                    mpt = mpt._next;
                }
                if (v === 1 && this.t._gsClassPT === this) {
                    this.t._gsClassPT = null;
                }
            } else if (this.t.getAttribute("class") !== this.e) {
                this.t.setAttribute("class", this.e);
            }
        };
        _registerComplexSpecialProp("className", {
            parser: function (t, e, p, cssp, pt, plugin, vars) {
                var b = t.getAttribute("class") || "", //don't use t.className because it doesn't work consistently on SVG elements; getAttribute("class") and setAttribute("class", value") is more reliable.
                    cssText = t.style.cssText,
                    difData, bs, cnpt, cnptLookup, mpt;
                pt = cssp._classNamePT = new CSSPropTween(t, p, 0, 0, pt, 2);
                pt.setRatio = _setClassNameRatio;
                pt.pr = -11;
                _hasPriority = true;
                pt.b = b;
                bs = _getAllStyles(t, _cs);
                //if there's a className tween already operating on the target, force it to its end so that the necessary inline styles are removed and the class name is applied before we determine the end state (we don't want inline styles interfering that were there just for class-specific values)
                cnpt = t._gsClassPT;
                if (cnpt) {
                    cnptLookup = {};
                    mpt = cnpt.data; //first MiniPropTween which stores the inline styles - we need to force these so that the inline styles don't contaminate things. Otherwise, there's a small chance that a tween could start and the inline values match the destination values and they never get cleaned.
                    while (mpt) {
                        cnptLookup[mpt.p] = 1;
                        mpt = mpt._next;
                    }
                    cnpt.setRatio(1);
                }
                t._gsClassPT = pt;
                pt.e = (e.charAt(1) !== "=") ? e : b.replace(new RegExp("\\s*\\b" + e.substr(2) + "\\b"), "") + ((e.charAt(0) === "+") ? " " + e.substr(2) : "");
                if (cssp._tween._duration) { //if it's a zero-duration tween, there's no need to tween anything or parse the data. In fact, if we switch classes temporarily (which we must do for proper parsing) and the class has a transition applied, it could cause a quick flash to the end state and back again initially in some browsers.
                    t.setAttribute("class", pt.e);
                    difData = _cssDif(t, bs, _getAllStyles(t), vars, cnptLookup);
                    t.setAttribute("class", b);
                    pt.data = difData.firstMPT;
                    t.style.cssText = cssText; //we recorded cssText before we swapped classes and ran _getAllStyles() because in cases when a className tween is overwritten, we remove all the related tweening properties from that class change (otherwise class-specific stuff can't override properties we've directly set on the target's style object due to specificity).
                    pt = pt.xfirst = cssp.parse(t, difData.difs, pt, plugin); //we record the CSSPropTween as the xfirst so that we can handle overwriting propertly (if "className" gets overwritten, we must kill all the properties associated with the className part of the tween, so we can loop through from xfirst to the pt itself)
                }
                return pt;
            }
        });


        var _setClearPropsRatio = function (v) {
            if (v === 1 || v === 0) if (this.data._totalTime === this.data._totalDuration && this.data.data !== "isFromStart") { //this.data refers to the tween. Only clear at the END of the tween (remember, from() tweens make the ratio go from 1 to 0, so we can't just check that and if the tween is the zero-duration one that's created internally to render the starting values in a from() tween, ignore that because otherwise, for example, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in).
                var s = this.t.style,
                    transformParse = _specialProps.transform.parse,
                    a, p, i, clearTransform;
                if (this.e === "all") {
                    s.cssText = "";
                    clearTransform = true;
                } else {
                    a = this.e.split(" ").join("").split(",");
                    i = a.length;
                    while (--i > -1) {
                        p = a[i];
                        if (_specialProps[p]) {
                            if (_specialProps[p].parse === transformParse) {
                                clearTransform = true;
                            } else {
                                p = (p === "transformOrigin") ? _transformOriginProp : _specialProps[p].p; //ensures that special properties use the proper browser-specific property name, like "scaleX" might be "-webkit-transform" or "boxShadow" might be "-moz-box-shadow"
                            }
                        }
                        _removeProp(s, p);
                    }
                }
                if (clearTransform) {
                    _removeProp(s, _transformProp);
                    if (this.t._gsTransform) {
                        delete this.t._gsTransform;
                    }
                }

            }
        };
        _registerComplexSpecialProp("clearProps", {
            parser: function (t, e, p, cssp, pt) {
                pt = new CSSPropTween(t, p, 0, 0, pt, 2);
                pt.setRatio = _setClearPropsRatio;
                pt.e = e;
                pt.pr = -10;
                pt.data = cssp._tween;
                _hasPriority = true;
                return pt;
            }
        });

        p = "bezier,throwProps,physicsProps,physics2D".split(",");
        i = p.length;
        while (i--) {
            _registerPluginProp(p[i]);
        }








        p = CSSPlugin.prototype;
        p._firstPT = p._lastParsedTransform = p._transform = null;

        //gets called when the tween renders for the first time. This kicks everything off, recording start/end values, etc.
        p._onInitTween = function (target, vars, tween) {
            if (!target.nodeType) { //css is only for dom elements
                return false;
            }
            this._target = target;
            this._tween = tween;
            this._vars = vars;
            _autoRound = vars.autoRound;
            _hasPriority = false;
            _suffixMap = vars.suffixMap || CSSPlugin.suffixMap;
            _cs = _getComputedStyle(target, "");
            _overwriteProps = this._overwriteProps;
            var style = target.style,
                v, pt, pt2, first, last, next, zIndex, tpt, threeD;
            if (_reqSafariFix) if (style.zIndex === "") {
                v = _getStyle(target, "zIndex", _cs);
                if (v === "auto" || v === "") {
                    //corrects a bug in [non-Android] Safari that prevents it from repainting elements in their new positions if they don't have a zIndex set. We also can't just apply this inside _parseTransform() because anything that's moved in any way (like using "left" or "top" instead of transforms like "x" and "y") can be affected, so it is best to ensure that anything that's tweening has a z-index. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly. Plus zIndex is less memory-intensive.
                    this._addLazySet(style, "zIndex", 0);
                }
            }

            if (typeof (vars) === "string") {
                first = style.cssText;
                v = _getAllStyles(target, _cs);
                style.cssText = first + ";" + vars;
                v = _cssDif(target, v, _getAllStyles(target)).difs;
                if (!_supportsOpacity && _opacityValExp.test(vars)) {
                    v.opacity = parseFloat(RegExp.$1);
                }
                vars = v;
                style.cssText = first;
            }
            this._firstPT = pt = this.parse(target, vars, null);

            if (this._transformType) {
                threeD = (this._transformType === 3);
                if (!_transformProp) {
                    style.zoom = 1; //helps correct an IE issue.
                } else if (_isSafari) {
                    _reqSafariFix = true;
                    //if zIndex isn't set, iOS Safari doesn't repaint things correctly sometimes (seemingly at random).
                    if (style.zIndex === "") {
                        zIndex = _getStyle(target, "zIndex", _cs);
                        if (zIndex === "auto" || zIndex === "") {
                            this._addLazySet(style, "zIndex", 0);
                        }
                    }
                    //Setting WebkitBackfaceVisibility corrects 3 bugs:
                    // 1) [non-Android] Safari skips rendering changes to "top" and "left" that are made on the same frame/render as a transform update.
                    // 2) iOS Safari sometimes neglects to repaint elements in their new positions. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly.
                    // 3) Safari sometimes displayed odd artifacts when tweening the transform (or WebkitTransform) property, like ghosts of the edges of the element remained. Definitely a browser bug.
                    //Note: we allow the user to override the auto-setting by defining WebkitBackfaceVisibility in the vars of the tween.
                    if (_isSafariLT6) {
                        this._addLazySet(style, "WebkitBackfaceVisibility", this._vars.WebkitBackfaceVisibility || (threeD ? "visible" : "hidden"));
                    }
                }
                pt2 = pt;
                while (pt2 && pt2._next) {
                    pt2 = pt2._next;
                }
                tpt = new CSSPropTween(target, "transform", 0, 0, null, 2);
                this._linkCSSP(tpt, null, pt2);
                tpt.setRatio = (threeD && _supports3D) ? _set3DTransformRatio : _transformProp ? _set2DTransformRatio : _setIETransformRatio;
                tpt.data = this._transform || _getTransform(target, _cs, true);
                _overwriteProps.pop(); //we don't want to force the overwrite of all "transform" tweens of the target - we only care about individual transform properties like scaleX, rotation, etc. The CSSPropTween constructor automatically adds the property to _overwriteProps which is why we need to pop() here.
            }

            if (_hasPriority) {
                //reorders the linked list in order of pr (priority)
                while (pt) {
                    next = pt._next;
                    pt2 = first;
                    while (pt2 && pt2.pr > pt.pr) {
                        pt2 = pt2._next;
                    }
                    if ((pt._prev = pt2 ? pt2._prev : last)) {
                        pt._prev._next = pt;
                    } else {
                        first = pt;
                    }
                    if ((pt._next = pt2)) {
                        pt2._prev = pt;
                    } else {
                        last = pt;
                    }
                    pt = next;
                }
                this._firstPT = first;
            }
            return true;
        };


        p.parse = function (target, vars, pt, plugin) {
            var style = target.style,
                p, sp, bn, en, bs, es, bsfx, esfx, isStr, rel;
            for (p in vars) {
                es = vars[p]; //ending value string
                sp = _specialProps[p]; //SpecialProp lookup.
                if (sp) {
                    pt = sp.parse(target, es, p, this, pt, plugin, vars);

                } else {
                    bs = _getStyle(target, p, _cs) + "";
                    isStr = (typeof (es) === "string");
                    if (p === "color" || p === "fill" || p === "stroke" || p.indexOf("Color") !== -1 || (isStr && _rgbhslExp.test(es))) { //Opera uses background: to define color sometimes in addition to backgroundColor:
                        if (!isStr) {
                            es = _parseColor(es);
                            es = ((es.length > 3) ? "rgba(" : "rgb(") + es.join(",") + ")";
                        }
                        pt = _parseComplex(style, p, bs, es, true, "transparent", pt, 0, plugin);

                    } else if (isStr && (es.indexOf(" ") !== -1 || es.indexOf(",") !== -1)) {
                        pt = _parseComplex(style, p, bs, es, true, null, pt, 0, plugin);

                    } else {
                        bn = parseFloat(bs);
                        bsfx = (bn || bn === 0) ? bs.substr((bn + "").length) : ""; //remember, bs could be non-numeric like "normal" for fontWeight, so we should default to a blank suffix in that case.

                        if (bs === "" || bs === "auto") {
                            if (p === "width" || p === "height") {
                                bn = _getDimension(target, p, _cs);
                                bsfx = "px";
                            } else if (p === "left" || p === "top") {
                                bn = _calculateOffset(target, p, _cs);
                                bsfx = "px";
                            } else {
                                bn = (p !== "opacity") ? 0 : 1;
                                bsfx = "";
                            }
                        }

                        rel = (isStr && es.charAt(1) === "=");
                        if (rel) {
                            en = parseInt(es.charAt(0) + "1", 10);
                            es = es.substr(2);
                            en *= parseFloat(es);
                            esfx = es.replace(_suffixExp, "");
                        } else {
                            en = parseFloat(es);
                            esfx = isStr ? es.substr((en + "").length) || "" : "";
                        }

                        if (esfx === "") {
                            esfx = (p in _suffixMap) ? _suffixMap[p] : bsfx; //populate the end suffix, prioritizing the map, then if none is found, use the beginning suffix.
                        }

                        es = (en || en === 0) ? (rel ? en + bn : en) + esfx : vars[p]; //ensures that any += or -= prefixes are taken care of. Record the end value before normalizing the suffix because we always want to end the tween on exactly what they intended even if it doesn't match the beginning value's suffix.

                        //if the beginning/ending suffixes don't match, normalize them...
                        if (bsfx !== esfx) if (esfx !== "") if (en || en === 0) if (bn) { //note: if the beginning value (bn) is 0, we don't need to convert units!
                            bn = _convertToPixels(target, p, bn, bsfx);
                            if (esfx === "%") {
                                bn /= _convertToPixels(target, p, 100, "%") / 100;
                                if (vars.strictUnits !== true) { //some browsers report only "px" values instead of allowing "%" with getComputedStyle(), so we assume that if we're tweening to a %, we should start there too unless strictUnits:true is defined. This approach is particularly useful for responsive designs that use from() tweens.
                                    bs = bn + "%";
                                }

                            } else if (esfx === "em") {
                                bn /= _convertToPixels(target, p, 1, "em");

                                //otherwise convert to pixels.
                            } else if (esfx !== "px") {
                                en = _convertToPixels(target, p, en, esfx);
                                esfx = "px"; //we don't use bsfx after this, so we don't need to set it to px too.
                            }
                            if (rel) if (en || en === 0) {
                                es = (en + bn) + esfx; //the changes we made affect relative calculations, so adjust the end value here.
                            }
                        }

                        if (rel) {
                            en += bn;
                        }

                        if ((bn || bn === 0) && (en || en === 0)) { //faster than isNaN(). Also, previously we required en !== bn but that doesn't really gain much performance and it prevents _parseToProxy() from working properly if beginning and ending values match but need to get tweened by an external plugin anyway. For example, a bezier tween where the target starts at left:0 and has these points: [{left:50},{left:0}] wouldn't work properly because when parsing the last point, it'd match the first (current) one and a non-tweening CSSPropTween would be recorded when we actually need a normal tween (type:0) so that things get updated during the tween properly.
                            pt = new CSSPropTween(style, p, bn, en - bn, pt, 0, p, (_autoRound !== false && (esfx === "px" || p === "zIndex")), 0, bs, es);
                            pt.xs0 = esfx;
                            //DEBUG: _log("tween "+p+" from "+pt.b+" ("+bn+esfx+") to "+pt.e+" with suffix: "+pt.xs0);
                        } else if (style[p] === undefined || !es && (es + "" === "NaN" || es == null)) {
                            _log("invalid " + p + " tween value: " + vars[p]);
                        } else {
                            pt = new CSSPropTween(style, p, en || bn || 0, 0, pt, -1, p, false, 0, bs, es);
                            pt.xs0 = (es === "none" && (p === "display" || p.indexOf("Style") !== -1)) ? bs : es; //intermediate value should typically be set immediately (end value) except for "display" or things like borderTopStyle, borderBottomStyle, etc. which should use the beginning value during the tween.
                            //DEBUG: _log("non-tweening value "+p+": "+pt.xs0);
                        }
                    }
                }
                if (plugin) if (pt && !pt.plugin) {
                    pt.plugin = plugin;
                }
            }
            return pt;
        };


        //gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
        p.setRatio = function (v) {
            var pt = this._firstPT,
                min = 0.000001,
                val, str, i;
            //at the end of the tween, we set the values to exactly what we received in order to make sure non-tweening values (like "position" or "float" or whatever) are set and so that if the beginning/ending suffixes (units) didn't match and we normalized to px, the value that the user passed in is used here. We check to see if the tween is at its beginning in case it's a from() tween in which case the ratio will actually go from 1 to 0 over the course of the tween (backwards).
            if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
                while (pt) {
                    if (pt.type !== 2) {
                        pt.t[pt.p] = pt.e;
                    } else {
                        pt.setRatio(v);
                    }
                    pt = pt._next;
                }

            } else if (v || !(this._tween._time === this._tween._duration || this._tween._time === 0) || this._tween._rawPrevTime === -0.000001) {
                while (pt) {
                    val = pt.c * v + pt.s;
                    if (pt.r) {
                        val = Math.round(val);
                    } else if (val < min) if (val > -min) {
                        val = 0;
                    }
                    if (!pt.type) {
                        pt.t[pt.p] = val + pt.xs0;
                    } else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
                        i = pt.l;
                        if (i === 2) {
                            pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2;
                        } else if (i === 3) {
                            pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3;
                        } else if (i === 4) {
                            pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4;
                        } else if (i === 5) {
                            pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4 + pt.xn4 + pt.xs5;
                        } else {
                            str = pt.xs0 + val + pt.xs1;
                            for (i = 1; i < pt.l; i++) {
                                str += pt["xn" + i] + pt["xs" + (i + 1)];
                            }
                            pt.t[pt.p] = str;
                        }

                    } else if (pt.type === -1) { //non-tweening value
                        pt.t[pt.p] = pt.xs0;

                    } else if (pt.setRatio) { //custom setRatio() for things like SpecialProps, external plugins, etc.
                        pt.setRatio(v);
                    }
                    pt = pt._next;
                }

                //if the tween is reversed all the way back to the beginning, we need to restore the original values which may have different units (like % instead of px or em or whatever).
            } else {
                while (pt) {
                    if (pt.type !== 2) {
                        pt.t[pt.p] = pt.b;
                    } else {
                        pt.setRatio(v);
                    }
                    pt = pt._next;
                }
            }
        };

        /**
         * @private
         * Forces rendering of the target's transforms (rotation, scale, etc.) whenever the CSSPlugin's setRatio() is called.
         * Basically, this tells the CSSPlugin to create a CSSPropTween (type 2) after instantiation that runs last in the linked
         * list and calls the appropriate (3D or 2D) rendering function. We separate this into its own method so that we can call
         * it from other plugins like BezierPlugin if, for example, it needs to apply an autoRotation and this CSSPlugin
         * doesn't have any transform-related properties of its own. You can call this method as many times as you
         * want and it won't create duplicate CSSPropTweens.
         *
         * @param {boolean} threeD if true, it should apply 3D tweens (otherwise, just 2D ones are fine and typically faster)
         */
        p._enableTransforms = function (threeD) {
            this._transform = this._transform || _getTransform(this._target, _cs, true); //ensures that the element has a _gsTransform property with the appropriate values.
            this._transformType = (!(this._transform.svg && _useSVGTransformAttr) && (threeD || this._transformType === 3)) ? 3 : 2;
        };

        var lazySet = function (v) {
            this.t[this.p] = this.e;
            this.data._linkCSSP(this, this._next, null, true); //we purposefully keep this._next even though it'd make sense to null it, but this is a performance optimization, as this happens during the while (pt) {} loop in setRatio() at the bottom of which it sets pt = pt._next, so if we null it, the linked list will be broken in that loop.
        };
        /** @private Gives us a way to set a value on the first render (and only the first render). **/
        p._addLazySet = function (t, p, v) {
            var pt = this._firstPT = new CSSPropTween(t, p, 0, 0, this._firstPT, 2);
            pt.e = v;
            pt.setRatio = lazySet;
            pt.data = this;
        };

        /** @private **/
        p._linkCSSP = function (pt, next, prev, remove) {
            if (pt) {
                if (next) {
                    next._prev = pt;
                }
                if (pt._next) {
                    pt._next._prev = pt._prev;
                }
                if (pt._prev) {
                    pt._prev._next = pt._next;
                } else if (this._firstPT === pt) {
                    this._firstPT = pt._next;
                    remove = true; //just to prevent resetting this._firstPT 5 lines down in case pt._next is null. (optimized for speed)
                }
                if (prev) {
                    prev._next = pt;
                } else if (!remove && this._firstPT === null) {
                    this._firstPT = pt;
                }
                pt._next = next;
                pt._prev = prev;
            }
            return pt;
        };

        //we need to make sure that if alpha or autoAlpha is killed, opacity is too. And autoAlpha affects the "visibility" property.
        p._kill = function (lookup) {
            var copy = lookup,
                pt, p, xfirst;
            if (lookup.autoAlpha || lookup.alpha) {
                copy = {};
                for (p in lookup) { //copy the lookup so that we're not changing the original which may be passed elsewhere.
                    copy[p] = lookup[p];
                }
                copy.opacity = 1;
                if (copy.autoAlpha) {
                    copy.visibility = 1;
                }
            }
            if (lookup.className && (pt = this._classNamePT)) { //for className tweens, we need to kill any associated CSSPropTweens too; a linked list starts at the className's "xfirst".
                xfirst = pt.xfirst;
                if (xfirst && xfirst._prev) {
                    this._linkCSSP(xfirst._prev, pt._next, xfirst._prev._prev); //break off the prev
                } else if (xfirst === this._firstPT) {
                    this._firstPT = pt._next;
                }
                if (pt._next) {
                    this._linkCSSP(pt._next, pt._next._next, xfirst._prev);
                }
                this._classNamePT = null;
            }
            return TweenPlugin.prototype._kill.call(this, copy);
        };



        //used by cascadeTo() for gathering all the style properties of each child element into an array for comparison.
        var _getChildStyles = function (e, props, targets) {
            var children, i, child, type;
            if (e.slice) {
                i = e.length;
                while (--i > -1) {
                    _getChildStyles(e[i], props, targets);
                }
                return;
            }
            children = e.childNodes;
            i = children.length;
            while (--i > -1) {
                child = children[i];
                type = child.type;
                if (child.style) {
                    props.push(_getAllStyles(child));
                    if (targets) {
                        targets.push(child);
                    }
                }
                if ((type === 1 || type === 9 || type === 11) && child.childNodes.length) {
                    _getChildStyles(child, props, targets);
                }
            }
        };

        /**
         * Typically only useful for className tweens that may affect child elements, this method creates a TweenLite
         * and then compares the style properties of all the target's child elements at the tween's start and end, and
         * if any are different, it also creates tweens for those and returns an array containing ALL of the resulting
         * tweens (so that you can easily add() them to a TimelineLite, for example). The reason this functionality is
         * wrapped into a separate static method of CSSPlugin instead of being integrated into all regular className tweens
         * is because it creates entirely new tweens that may have completely different targets than the original tween,
         * so if they were all lumped into the original tween instance, it would be inconsistent with the rest of the API
         * and it would create other problems. For example:
         *  - If I create a tween of elementA, that tween instance may suddenly change its target to include 50 other elements (unintuitive if I specifically defined the target I wanted)
         *  - We can't just create new independent tweens because otherwise, what happens if the original/parent tween is reversed or pause or dropped into a TimelineLite for tight control? You'd expect that tween's behavior to affect all the others.
         *  - Analyzing every style property of every child before and after the tween is an expensive operation when there are many children, so this behavior shouldn't be imposed on all className tweens by default, especially since it's probably rare that this extra functionality is needed.
         *
         * @param {Object} target object to be tweened
         * @param {number} Duration in seconds (or frames for frames-based tweens)
         * @param {Object} Object containing the end values, like {className:"newClass", ease:Linear.easeNone}
         * @return {Array} An array of TweenLite instances
         */
        CSSPlugin.cascadeTo = function (target, duration, vars) {
            var tween = TweenLite.to(target, duration, vars),
                results = [tween],
                b = [],
                e = [],
                targets = [],
                _reservedProps = TweenLite._internals.reservedProps,
                i, difs, p;
            target = tween._targets || tween.target;
            _getChildStyles(target, b, targets);
            tween.render(duration, true);
            _getChildStyles(target, e);
            tween.render(0, true);
            tween._enabled(true);
            i = targets.length;
            while (--i > -1) {
                difs = _cssDif(targets[i], b[i], e[i]);
                if (difs.firstMPT) {
                    difs = difs.difs;
                    for (p in vars) {
                        if (_reservedProps[p]) {
                            difs[p] = vars[p];
                        }
                    }
                    results.push(TweenLite.to(targets[i], duration, difs));
                }
            }
            return results;
        };

        TweenPlugin.activate([CSSPlugin]);
        return CSSPlugin;

    }, true);

});
if (_gsScope._gsDefine) {
    _gsScope._gsQueue.pop()();
}

//export to AMD/RequireJS and CommonJS/Node (precursor to full modular build system coming at a later date)
(function (name) {
    "use strict";
    var getGlobal = function () {
        return (_gsScope.GreenSockGlobals || _gsScope)[name];
    };
    if (typeof (define) === "function" && define.amd) { //AMD
        define(["TweenLite"], getGlobal);
    } else if (typeof (module) !== "undefined" && module.exports) { //node
        require("../TweenLite.js");
        module.exports = getGlobal();
    }
}("CSSPlugin"));



/*!
 * VERSION: 1.15.0
 * DATE: 2014-12-03
 * UPDATES AND DOCS AT: http://www.greensock.com
 *
 * @license Copyright (c) 2008-2014, GreenSock. All rights reserved.
 * This work is subject to the terms at http://www.greensock.com/terms_of_use.html or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 */ (function (window, moduleName) {

    "use strict";
    var _globals = window.GreenSockGlobals = window.GreenSockGlobals || window;
    if (_globals.TweenLite) {
        return; //in case the core set of classes is already loaded, don't instantiate twice.
    }
    var _namespace = function (ns) {
        var a = ns.split("."),
            p = _globals,
            i;
        for (i = 0; i < a.length; i++) {
            p[a[i]] = p = p[a[i]] || {};
        }
        return p;
    },
    gs = _namespace("com.greensock"),
        _tinyNum = 0.0000000001,
        _slice = function (a) { //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
            var b = [],
                l = a.length,
                i;
            for (i = 0; i !== l; b.push(a[i++]));
            return b;
        },
        _emptyFunc = function () {},
        _isArray = (function () { //works around issues in iframe environments where the Array global isn't shared, thus if the object originates in a different window/iframe, "(obj instanceof Array)" will evaluate false. We added some speed optimizations to avoid Object.prototype.toString.call() unless it's absolutely necessary because it's VERY slow (like 20x slower)
            var toString = Object.prototype.toString,
                array = toString.call([]);
            return function (obj) {
                return obj != null && (obj instanceof Array || (typeof (obj) === "object" && !! obj.push && toString.call(obj) === array));
            };
        }()),
        a, i, p, _ticker, _tickerActive,
        _defLookup = {},

        /**
         * @constructor
         * Defines a GreenSock class, optionally with an array of dependencies that must be instantiated first and passed into the definition.
         * This allows users to load GreenSock JS files in any order even if they have interdependencies (like CSSPlugin extends TweenPlugin which is
         * inside TweenLite.js, but if CSSPlugin is loaded first, it should wait to run its code until TweenLite.js loads and instantiates TweenPlugin
         * and then pass TweenPlugin to CSSPlugin's definition). This is all done automatically and internally.
         *
         * Every definition will be added to a "com.greensock" global object (typically window, but if a window.GreenSockGlobals object is found,
         * it will go there as of v1.7). For example, TweenLite will be found at window.com.greensock.TweenLite and since it's a global class that should be available anywhere,
         * it is ALSO referenced at window.TweenLite. However some classes aren't considered global, like the base com.greensock.core.Animation class, so
         * those will only be at the package like window.com.greensock.core.Animation. Again, if you define a GreenSockGlobals object on the window, everything
         * gets tucked neatly inside there instead of on the window directly. This allows you to do advanced things like load multiple versions of GreenSock
         * files and put them into distinct objects (imagine a banner ad uses a newer version but the main site uses an older one). In that case, you could
         * sandbox the banner one like:
         *
         * <script>
         *     var gs = window.GreenSockGlobals = {}; //the newer version we're about to load could now be referenced in a "gs" object, like gs.TweenLite.to(...). Use whatever alias you want as long as it's unique, "gs" or "banner" or whatever.
         * </script>
         * <script src="js/greensock/v1.7/TweenMax.js"></script>
         * <script>
         *     window.GreenSockGlobals = window._gsQueue = window._gsDefine = null; //reset it back to null (along with the special _gsQueue variable) so that the next load of TweenMax affects the window and we can reference things directly like TweenLite.to(...)
         * </script>
         * <script src="js/greensock/v1.6/TweenMax.js"></script>
         * <script>
         *     gs.TweenLite.to(...); //would use v1.7
         *     TweenLite.to(...); //would use v1.6
         * </script>
         *
         * @param {!string} ns The namespace of the class definition, leaving off "com.greensock." as that's assumed. For example, "TweenLite" or "plugins.CSSPlugin" or "easing.Back".
         * @param {!Array.<string>} dependencies An array of dependencies (described as their namespaces minus "com.greensock." prefix). For example ["TweenLite","plugins.TweenPlugin","core.Animation"]
         * @param {!function():Object} func The function that should be called and passed the resolved dependencies which will return the actual class for this definition.
         * @param {boolean=} global If true, the class will be added to the global scope (typically window unless you define a window.GreenSockGlobals object)
         */
        Definition = function (ns, dependencies, func, global) {
            this.sc = (_defLookup[ns]) ? _defLookup[ns].sc : []; //subclasses
            _defLookup[ns] = this;
            this.gsClass = null;
            this.func = func;
            var _classes = [];
            this.check = function (init) {
                var i = dependencies.length,
                    missing = i,
                    cur, a, n, cl;
                while (--i > -1) {
                    if ((cur = _defLookup[dependencies[i]] || new Definition(dependencies[i], [])).gsClass) {
                        _classes[i] = cur.gsClass;
                        missing--;
                    } else if (init) {
                        cur.sc.push(this);
                    }
                }
                if (missing === 0 && func) {
                    a = ("com.greensock." + ns).split(".");
                    n = a.pop();
                    cl = _namespace(a.join("."))[n] = this.gsClass = func.apply(func, _classes);

                    //exports to multiple environments
                    if (global) {
                        _globals[n] = cl; //provides a way to avoid global namespace pollution. By default, the main classes like TweenLite, Power1, Strong, etc. are added to window unless a GreenSockGlobals is defined. So if you want to have things added to a custom object instead, just do something like window.GreenSockGlobals = {} before loading any GreenSock files. You can even set up an alias like window.GreenSockGlobals = windows.gs = {} so that you can access everything like gs.TweenLite. Also remember that ALL classes are added to the window.com.greensock object (in their respective packages, like com.greensock.easing.Power1, com.greensock.TweenLite, etc.)
                        if (typeof (define) === "function" && define.amd) { //AMD
                            define((window.GreenSockAMDPath ? window.GreenSockAMDPath + "/" : "") + ns.split(".").pop(), [], function () {
                                return cl;
                            });
                        } else if (ns === moduleName && typeof (module) !== "undefined" && module.exports) { //node
                            module.exports = cl;
                        }
                    }
                    for (i = 0; i < this.sc.length; i++) {
                        this.sc[i].check();
                    }
                }
            };
            this.check(true);
        },

        //used to create Definition instances (which basically registers a class that has dependencies).
        _gsDefine = window._gsDefine = function (ns, dependencies, func, global) {
            return new Definition(ns, dependencies, func, global);
        },

        //a quick way to create a class that doesn't have any dependencies. Returns the class, but first registers it in the GreenSock namespace so that other classes can grab it (other classes might be dependent on the class).
        _class = gs._class = function (ns, func, global) {
            func = func || function () {};
            _gsDefine(ns, [], function () {
                return func;
            }, global);
            return func;
        };

    _gsDefine.globals = _globals;



    /*
     * ----------------------------------------------------------------
     * Ease
     * ----------------------------------------------------------------
     */
    var _baseParams = [0, 0, 1, 1],
        _blankArray = [],
        Ease = _class("easing.Ease", function (func, extraParams, type, power) {
            this._func = func;
            this._type = type || 0;
            this._power = power || 0;
            this._params = extraParams ? _baseParams.concat(extraParams) : _baseParams;
        }, true),
        _easeMap = Ease.map = {},
        _easeReg = Ease.register = function (ease, names, types, create) {
            var na = names.split(","),
                i = na.length,
                ta = (types || "easeIn,easeOut,easeInOut").split(","),
                e, name, j, type;
            while (--i > -1) {
                name = na[i];
                e = create ? _class("easing." + name, null, true) : gs.easing[name] || {};
                j = ta.length;
                while (--j > -1) {
                    type = ta[j];
                    _easeMap[name + "." + type] = _easeMap[type + name] = e[type] = ease.getRatio ? ease : ease[type] || new ease();
                }
            }
        };

    p = Ease.prototype;
    p._calcEnd = false;
    p.getRatio = function (p) {
        if (this._func) {
            this._params[0] = p;
            return this._func.apply(null, this._params);
        }
        var t = this._type,
            pw = this._power,
            r = (t === 1) ? 1 - p : (t === 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
        if (pw === 1) {
            r *= r;
        } else if (pw === 2) {
            r *= r * r;
        } else if (pw === 3) {
            r *= r * r * r;
        } else if (pw === 4) {
            r *= r * r * r * r;
        }
        return (t === 1) ? 1 - r : (t === 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2);
    };

    //create all the standard eases like Linear, Quad, Cubic, Quart, Quint, Strong, Power0, Power1, Power2, Power3, and Power4 (each with easeIn, easeOut, and easeInOut)
    a = ["Linear", "Quad", "Cubic", "Quart", "Quint,Strong"];
    i = a.length;
    while (--i > -1) {
        p = a[i] + ",Power" + i;
        _easeReg(new Ease(null, null, 1, i), p, "easeOut", true);
        _easeReg(new Ease(null, null, 2, i), p, "easeIn" + ((i === 0) ? ",easeNone" : ""));
        _easeReg(new Ease(null, null, 3, i), p, "easeInOut");
    }
    _easeMap.linear = gs.easing.Linear.easeIn;
    _easeMap.swing = gs.easing.Quad.easeInOut; //for jQuery folks


    /*
     * ----------------------------------------------------------------
     * EventDispatcher
     * ----------------------------------------------------------------
     */
    var EventDispatcher = _class("events.EventDispatcher", function (target) {
        this._listeners = {};
        this._eventTarget = target || this;
    });
    p = EventDispatcher.prototype;

    p.addEventListener = function (type, callback, scope, useParam, priority) {
        priority = priority || 0;
        var list = this._listeners[type],
            index = 0,
            listener, i;
        if (list == null) {
            this._listeners[type] = list = [];
        }
        i = list.length;
        while (--i > -1) {
            listener = list[i];
            if (listener.c === callback && listener.s === scope) {
                list.splice(i, 1);
            } else if (index === 0 && listener.pr < priority) {
                index = i + 1;
            }
        }
        list.splice(index, 0, {
            c: callback,
            s: scope,
            up: useParam,
            pr: priority
        });
        if (this === _ticker && !_tickerActive) {
            _ticker.wake();
        }
    };

    p.removeEventListener = function (type, callback) {
        var list = this._listeners[type],
            i;
        if (list) {
            i = list.length;
            while (--i > -1) {
                if (list[i].c === callback) {
                    list.splice(i, 1);
                    return;
                }
            }
        }
    };

    p.dispatchEvent = function (type) {
        var list = this._listeners[type],
            i, t, listener;
        if (list) {
            i = list.length;
            t = this._eventTarget;
            while (--i > -1) {
                listener = list[i];
                if (listener) {
                    if (listener.up) {
                        listener.c.call(listener.s || t, {
                            type: type,
                            target: t
                        });
                    } else {
                        listener.c.call(listener.s || t);
                    }
                }
            }
        }
    };


    /*
     * ----------------------------------------------------------------
     * Ticker
     * ----------------------------------------------------------------
     */
    var _reqAnimFrame = window.requestAnimationFrame,
        _cancelAnimFrame = window.cancelAnimationFrame,
        _getTime = Date.now || function () {
            return new Date().getTime();
        },
        _lastUpdate = _getTime();

    //now try to determine the requestAnimationFrame and cancelAnimationFrame functions and if none are found, we'll use a setTimeout()/clearTimeout() polyfill.
    a = ["ms", "moz", "webkit", "o"];
    i = a.length;
    while (--i > -1 && !_reqAnimFrame) {
        _reqAnimFrame = window[a[i] + "RequestAnimationFrame"];
        _cancelAnimFrame = window[a[i] + "CancelAnimationFrame"] || window[a[i] + "CancelRequestAnimationFrame"];
    }

    _class("Ticker", function (fps, useRAF) {
        var _self = this,
            _startTime = _getTime(),
            _useRAF = (useRAF !== false && _reqAnimFrame),
            _lagThreshold = 500,
            _adjustedLag = 33,
            _tickWord = "tick", //helps reduce gc burden
            _fps, _req, _id, _gap, _nextTime,
            _tick = function (manual) {
                var elapsed = _getTime() - _lastUpdate,
                    overlap, dispatch;
                if (elapsed > _lagThreshold) {
                    _startTime += elapsed - _adjustedLag;
                }
                _lastUpdate += elapsed;
                _self.time = (_lastUpdate - _startTime) / 1000;
                overlap = _self.time - _nextTime;
                if (!_fps || overlap > 0 || manual === true) {
                    _self.frame++;
                    _nextTime += overlap + (overlap >= _gap ? 0.004 : _gap - overlap);
                    dispatch = true;
                }
                if (manual !== true) { //make sure the request is made before we dispatch the "tick" event so that timing is maintained. Otherwise, if processing the "tick" requires a bunch of time (like 15ms) and we're using a setTimeout() that's based on 16.7ms, it'd technically take 31.7ms between frames otherwise.
                    _id = _req(_tick);
                }
                if (dispatch) {
                    _self.dispatchEvent(_tickWord);
                }
            };

        EventDispatcher.call(_self);
        _self.time = _self.frame = 0;
        _self.tick = function () {
            _tick(true);
        };

        _self.lagSmoothing = function (threshold, adjustedLag) {
            _lagThreshold = threshold || (1 / _tinyNum); //zero should be interpreted as basically unlimited
            _adjustedLag = Math.min(adjustedLag, _lagThreshold, 0);
        };

        _self.sleep = function () {
            if (_id == null) {
                return;
            }
            if (!_useRAF || !_cancelAnimFrame) {
                clearTimeout(_id);
            } else {
                _cancelAnimFrame(_id);
            }
            _req = _emptyFunc;
            _id = null;
            if (_self === _ticker) {
                _tickerActive = false;
            }
        };

        _self.wake = function () {
            if (_id !== null) {
                _self.sleep();
            } else if (_self.frame > 10) { //don't trigger lagSmoothing if we're just waking up, and make sure that at least 10 frames have elapsed because of the iOS bug that we work around below with the 1.5-second setTimout().
                _lastUpdate = _getTime() - _lagThreshold + 5;
            }
            _req = (_fps === 0) ? _emptyFunc : (!_useRAF || !_reqAnimFrame) ? function (f) {
                return setTimeout(f, ((_nextTime - _self.time) * 1000 + 1) | 0);
            } : _reqAnimFrame;
            if (_self === _ticker) {
                _tickerActive = true;
            }
            _tick(2);
        };

        _self.fps = function (value) {
            if (!arguments.length) {
                return _fps;
            }
            _fps = value;
            _gap = 1 / (_fps || 60);
            _nextTime = this.time + _gap;
            _self.wake();
        };

        _self.useRAF = function (value) {
            if (!arguments.length) {
                return _useRAF;
            }
            _self.sleep();
            _useRAF = value;
            _self.fps(_fps);
        };
        _self.fps(fps);

        //a bug in iOS 6 Safari occasionally prevents the requestAnimationFrame from working initially, so we use a 1.5-second timeout that automatically falls back to setTimeout() if it senses this condition.
        setTimeout(function () {
            if (_useRAF && (!_id || _self.frame < 5)) {
                _self.useRAF(false);
            }
        }, 1500);
    });

    p = gs.Ticker.prototype = new gs.events.EventDispatcher();
    p.constructor = gs.Ticker;


    /*
     * ----------------------------------------------------------------
     * Animation
     * ----------------------------------------------------------------
     */
    var Animation = _class("core.Animation", function (duration, vars) {
        this.vars = vars = vars || {};
        this._duration = this._totalDuration = duration || 0;
        this._delay = Number(vars.delay) || 0;
        this._timeScale = 1;
        this._active = (vars.immediateRender === true);
        this.data = vars.data;
        this._reversed = (vars.reversed === true);

        if (!_rootTimeline) {
            return;
        }
        if (!_tickerActive) { //some browsers (like iOS 6 Safari) shut down JavaScript execution when the tab is disabled and they [occasionally] neglect to start up requestAnimationFrame again when returning - this code ensures that the engine starts up again properly.
            _ticker.wake();
        }

        var tl = this.vars.useFrames ? _rootFramesTimeline : _rootTimeline;
        tl.add(this, tl._time);

        if (this.vars.paused) {
            this.paused(true);
        }
    });

    _ticker = Animation.ticker = new gs.Ticker();
    p = Animation.prototype;
    p._dirty = p._gc = p._initted = p._paused = false;
    p._totalTime = p._time = 0;
    p._rawPrevTime = -1;
    p._next = p._last = p._onUpdate = p._timeline = p.timeline = null;
    p._paused = false;


    //some browsers (like iOS) occasionally drop the requestAnimationFrame event when the user switches to a different tab and then comes back again, so we use a 2-second setTimeout() to sense if/when that condition occurs and then wake() the ticker.
    var _checkTimeout = function () {
        if (_tickerActive && _getTime() - _lastUpdate > 2000) {
            _ticker.wake();
        }
        setTimeout(_checkTimeout, 2000);
    };
    _checkTimeout();


    p.play = function (from, suppressEvents) {
        if (from != null) {
            this.seek(from, suppressEvents);
        }
        return this.reversed(false).paused(false);
    };

    p.pause = function (atTime, suppressEvents) {
        if (atTime != null) {
            this.seek(atTime, suppressEvents);
        }
        return this.paused(true);
    };

    p.resume = function (from, suppressEvents) {
        if (from != null) {
            this.seek(from, suppressEvents);
        }
        return this.paused(false);
    };

    p.seek = function (time, suppressEvents) {
        return this.totalTime(Number(time), suppressEvents !== false);
    };

    p.restart = function (includeDelay, suppressEvents) {
        return this.reversed(false).paused(false).totalTime(includeDelay ? -this._delay : 0, (suppressEvents !== false), true);
    };

    p.reverse = function (from, suppressEvents) {
        if (from != null) {
            this.seek((from || this.totalDuration()), suppressEvents);
        }
        return this.reversed(true).paused(false);
    };

    p.render = function (time, suppressEvents, force) {
        //stub - we override this method in subclasses.
    };

    p.invalidate = function () {
        this._time = this._totalTime = 0;
        this._initted = this._gc = false;
        this._rawPrevTime = -1;
        if (this._gc || !this.timeline) {
            this._enabled(true);
        }
        return this;
    };

    p.isActive = function () {
        var tl = this._timeline, //the 2 root timelines won't have a _timeline; they're always active.
            startTime = this._startTime,
            rawTime;
        return (!tl || (!this._gc && !this._paused && tl.isActive() && (rawTime = tl.rawTime()) >= startTime && rawTime < startTime + this.totalDuration() / this._timeScale));
    };

    p._enabled = function (enabled, ignoreTimeline) {
        if (!_tickerActive) {
            _ticker.wake();
        }
        this._gc = !enabled;
        this._active = this.isActive();
        if (ignoreTimeline !== true) {
            if (enabled && !this.timeline) {
                this._timeline.add(this, this._startTime - this._delay);
            } else if (!enabled && this.timeline) {
                this._timeline._remove(this, true);
            }
        }
        return false;
    };


    p._kill = function (vars, target) {
        return this._enabled(false, false);
    };

    p.kill = function (vars, target) {
        this._kill(vars, target);
        return this;
    };

    p._uncache = function (includeSelf) {
        var tween = includeSelf ? this : this.timeline;
        while (tween) {
            tween._dirty = true;
            tween = tween.timeline;
        }
        return this;
    };

    p._swapSelfInParams = function (params) {
        var i = params.length,
            copy = params.concat();
        while (--i > -1) {
            if (params[i] === "{self}") {
                copy[i] = this;
            }
        }
        return copy;
    };

    //----Animation getters/setters --------------------------------------------------------

    p.eventCallback = function (type, callback, params, scope) {
        if ((type || "").substr(0, 2) === "on") {
            var v = this.vars;
            if (arguments.length === 1) {
                return v[type];
            }
            if (callback == null) {
                delete v[type];
            } else {
                v[type] = callback;
                v[type + "Params"] = (_isArray(params) && params.join("").indexOf("{self}") !== -1) ? this._swapSelfInParams(params) : params;
                v[type + "Scope"] = scope;
            }
            if (type === "onUpdate") {
                this._onUpdate = callback;
            }
        }
        return this;
    };

    p.delay = function (value) {
        if (!arguments.length) {
            return this._delay;
        }
        if (this._timeline.smoothChildTiming) {
            this.startTime(this._startTime + value - this._delay);
        }
        this._delay = value;
        return this;
    };

    p.duration = function (value) {
        if (!arguments.length) {
            this._dirty = false;
            return this._duration;
        }
        this._duration = this._totalDuration = value;
        this._uncache(true); //true in case it's a TweenMax or TimelineMax that has a repeat - we'll need to refresh the totalDuration.
        if (this._timeline.smoothChildTiming) if (this._time > 0) if (this._time < this._duration) if (value !== 0) {
            this.totalTime(this._totalTime * (value / this._duration), true);
        }
        return this;
    };

    p.totalDuration = function (value) {
        this._dirty = false;
        return (!arguments.length) ? this._totalDuration : this.duration(value);
    };

    p.time = function (value, suppressEvents) {
        if (!arguments.length) {
            return this._time;
        }
        if (this._dirty) {
            this.totalDuration();
        }
        return this.totalTime((value > this._duration) ? this._duration : value, suppressEvents);
    };

    p.totalTime = function (time, suppressEvents, uncapped) {
        if (!_tickerActive) {
            _ticker.wake();
        }
        if (!arguments.length) {
            return this._totalTime;
        }
        if (this._timeline) {
            if (time < 0 && !uncapped) {
                time += this.totalDuration();
            }
            if (this._timeline.smoothChildTiming) {
                if (this._dirty) {
                    this.totalDuration();
                }
                var totalDuration = this._totalDuration,
                    tl = this._timeline;
                if (time > totalDuration && !uncapped) {
                    time = totalDuration;
                }
                this._startTime = (this._paused ? this._pauseTime : tl._time) - ((!this._reversed ? time : totalDuration - time) / this._timeScale);
                if (!tl._dirty) { //for performance improvement. If the parent's cache is already dirty, it already took care of marking the ancestors as dirty too, so skip the function call here.
                    this._uncache(false);
                }
                //in case any of the ancestor timelines had completed but should now be enabled, we should reset their totalTime() which will also ensure that they're lined up properly and enabled. Skip for animations that are on the root (wasteful). Example: a TimelineLite.exportRoot() is performed when there's a paused tween on the root, the export will not complete until that tween is unpaused, but imagine a child gets restarted later, after all [unpaused] tweens have completed. The startTime of that child would get pushed out, but one of the ancestors may have completed.
                if (tl._timeline) {
                    while (tl._timeline) {
                        if (tl._timeline._time !== (tl._startTime + tl._totalTime) / tl._timeScale) {
                            tl.totalTime(tl._totalTime, true);
                        }
                        tl = tl._timeline;
                    }
                }
            }
            if (this._gc) {
                this._enabled(true, false);
            }
            if (this._totalTime !== time || this._duration === 0) {
                this.render(time, suppressEvents, false);
                if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when someone calls seek() or time() or progress(), they expect an immediate render.
                    _lazyRender();
                }
            }
        }
        return this;
    };

    p.progress = p.totalProgress = function (value, suppressEvents) {
        return (!arguments.length) ? this._time / this.duration() : this.totalTime(this.duration() * value, suppressEvents);
    };

    p.startTime = function (value) {
        if (!arguments.length) {
            return this._startTime;
        }
        if (value !== this._startTime) {
            this._startTime = value;
            if (this.timeline) if (this.timeline._sortChildren) {
                this.timeline.add(this, value - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
            }
        }
        return this;
    };

    p.endTime = function (includeRepeats) {
        return this._startTime + ((includeRepeats != false) ? this.totalDuration() : this.duration()) / this._timeScale;
    };

    p.timeScale = function (value) {
        if (!arguments.length) {
            return this._timeScale;
        }
        value = value || _tinyNum; //can't allow zero because it'll throw the math off
        if (this._timeline && this._timeline.smoothChildTiming) {
            var pauseTime = this._pauseTime,
                t = (pauseTime || pauseTime === 0) ? pauseTime : this._timeline.totalTime();
            this._startTime = t - ((t - this._startTime) * this._timeScale / value);
        }
        this._timeScale = value;
        return this._uncache(false);
    };

    p.reversed = function (value) {
        if (!arguments.length) {
            return this._reversed;
        }
        if (value != this._reversed) {
            this._reversed = value;
            this.totalTime(((this._timeline && !this._timeline.smoothChildTiming) ? this.totalDuration() - this._totalTime : this._totalTime), true);
        }
        return this;
    };

    p.paused = function (value) {
        if (!arguments.length) {
            return this._paused;
        }
        if (value != this._paused) if (this._timeline) {
            if (!_tickerActive && !value) {
                _ticker.wake();
            }
            var tl = this._timeline,
                raw = tl.rawTime(),
                elapsed = raw - this._pauseTime;
            if (!value && tl.smoothChildTiming) {
                this._startTime += elapsed;
                this._uncache(false);
            }
            this._pauseTime = value ? raw : null;
            this._paused = value;
            this._active = this.isActive();
            if (!value && elapsed !== 0 && this._initted && this.duration()) {
                this.render((tl.smoothChildTiming ? this._totalTime : (raw - this._startTime) / this._timeScale), true, true); //in case the target's properties changed via some other tween or manual update by the user, we should force a render.
            }
        }
        if (this._gc && !value) {
            this._enabled(true, false);
        }
        return this;
    };


    /*
     * ----------------------------------------------------------------
     * SimpleTimeline
     * ----------------------------------------------------------------
     */
    var SimpleTimeline = _class("core.SimpleTimeline", function (vars) {
        Animation.call(this, 0, vars);
        this.autoRemoveChildren = this.smoothChildTiming = true;
    });

    p = SimpleTimeline.prototype = new Animation();
    p.constructor = SimpleTimeline;
    p.kill()._gc = false;
    p._first = p._last = p._recent = null;
    p._sortChildren = false;

    p.add = p.insert = function (child, position, align, stagger) {
        var prevTween, st;
        child._startTime = Number(position || 0) + child._delay;
        if (child._paused) if (this !== child._timeline) { //we only adjust the _pauseTime if it wasn't in this timeline already. Remember, sometimes a tween will be inserted again into the same timeline when its startTime is changed so that the tweens in the TimelineLite/Max are re-ordered properly in the linked list (so everything renders in the proper order).
            child._pauseTime = child._startTime + ((this.rawTime() - child._startTime) / child._timeScale);
        }
        if (child.timeline) {
            child.timeline._remove(child, true); //removes from existing timeline so that it can be properly added to this one.
        }
        child.timeline = child._timeline = this;
        if (child._gc) {
            child._enabled(true, true);
        }
        prevTween = this._last;
        if (this._sortChildren) {
            st = child._startTime;
            while (prevTween && prevTween._startTime > st) {
                prevTween = prevTween._prev;
            }
        }
        if (prevTween) {
            child._next = prevTween._next;
            prevTween._next = child;
        } else {
            child._next = this._first;
            this._first = child;
        }
        if (child._next) {
            child._next._prev = child;
        } else {
            this._last = child;
        }
        child._prev = prevTween;
        this._recent = child;
        if (this._timeline) {
            this._uncache(true);
        }
        return this;
    };

    p._remove = function (tween, skipDisable) {
        if (tween.timeline === this) {
            if (!skipDisable) {
                tween._enabled(false, true);
            }

            if (tween._prev) {
                tween._prev._next = tween._next;
            } else if (this._first === tween) {
                this._first = tween._next;
            }
            if (tween._next) {
                tween._next._prev = tween._prev;
            } else if (this._last === tween) {
                this._last = tween._prev;
            }
            tween._next = tween._prev = tween.timeline = null;
            if (tween === this._recent) {
                this._recent = this._last;
            }

            if (this._timeline) {
                this._uncache(true);
            }
        }
        return this;
    };

    p.render = function (time, suppressEvents, force) {
        var tween = this._first,
            next;
        this._totalTime = this._time = this._rawPrevTime = time;
        while (tween) {
            next = tween._next; //record it here because the value could change after rendering...
            if (tween._active || (time >= tween._startTime && !tween._paused)) {
                if (!tween._reversed) {
                    tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
                } else {
                    tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
                }
            }
            tween = next;
        }
    };

    p.rawTime = function () {
        if (!_tickerActive) {
            _ticker.wake();
        }
        return this._totalTime;
    };

    /*
     * ----------------------------------------------------------------
     * TweenLite
     * ----------------------------------------------------------------
     */
    var TweenLite = _class("TweenLite", function (target, duration, vars) {
        Animation.call(this, duration, vars);
        this.render = TweenLite.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)

        if (target == null) {
            throw "Cannot tween a null target.";
        }

        this.target = target = (typeof (target) !== "string") ? target : TweenLite.selector(target) || target;

        var isSelector = (target.jquery || (target.length && target !== window && target[0] && (target[0] === window || (target[0].nodeType && target[0].style && !target.nodeType)))),
            overwrite = this.vars.overwrite,
            i, targ, targets;

        this._overwrite = overwrite = (overwrite == null) ? _overwriteLookup[TweenLite.defaultOverwrite] : (typeof (overwrite) === "number") ? overwrite >> 0 : _overwriteLookup[overwrite];

        if ((isSelector || target instanceof Array || (target.push && _isArray(target))) && typeof (target[0]) !== "number") {
            this._targets = targets = _slice(target); //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
            this._propLookup = [];
            this._siblings = [];
            for (i = 0; i < targets.length; i++) {
                targ = targets[i];
                if (!targ) {
                    targets.splice(i--, 1);
                    continue;
                } else if (typeof (targ) === "string") {
                    targ = targets[i--] = TweenLite.selector(targ); //in case it's an array of strings
                    if (typeof (targ) === "string") {
                        targets.splice(i + 1, 1); //to avoid an endless loop (can't imagine why the selector would return a string, but just in case)
                    }
                    continue;
                } else if (targ.length && targ !== window && targ[0] && (targ[0] === window || (targ[0].nodeType && targ[0].style && !targ.nodeType))) { //in case the user is passing in an array of selector objects (like jQuery objects), we need to check one more level and pull things out if necessary. Also note that <select> elements pass all the criteria regarding length and the first child having style, so we must also check to ensure the target isn't an HTML node itself.
                    targets.splice(i--, 1);
                    this._targets = targets = targets.concat(_slice(targ));
                    continue;
                }
                this._siblings[i] = _register(targ, this, false);
                if (overwrite === 1) if (this._siblings[i].length > 1) {
                    _applyOverwrite(targ, this, null, 1, this._siblings[i]);
                }
            }

        } else {
            this._propLookup = {};
            this._siblings = _register(target, this, false);
            if (overwrite === 1) if (this._siblings.length > 1) {
                _applyOverwrite(target, this, null, 1, this._siblings);
            }
        }
        if (this.vars.immediateRender || (duration === 0 && this._delay === 0 && this.vars.immediateRender !== false)) {
            this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
            this.render(-this._delay);
        }
    }, true),
        _isSelector = function (v) {
            return (v && v.length && v !== window && v[0] && (v[0] === window || (v[0].nodeType && v[0].style && !v.nodeType))); //we cannot check "nodeType" if the target is window from within an iframe, otherwise it will trigger a security error in some browsers like Firefox.
        },
        _autoCSS = function (vars, target) {
            var css = {},
            p;
            for (p in vars) {
                if (!_reservedProps[p] && (!(p in target) || p === "transform" || p === "x" || p === "y" || p === "width" || p === "height" || p === "className" || p === "border") && (!_plugins[p] || (_plugins[p] && _plugins[p]._autoCSS))) { //note: <img> elements contain read-only "x" and "y" properties. We should also prioritize editing css width/height rather than the element's properties.
                    css[p] = vars[p];
                    delete vars[p];
                }
            }
            vars.css = css;
        };

    p = TweenLite.prototype = new Animation();
    p.constructor = TweenLite;
    p.kill()._gc = false;

    //----TweenLite defaults, overwrite management, and root updates ----------------------------------------------------

    p.ratio = 0;
    p._firstPT = p._targets = p._overwrittenProps = p._startAt = null;
    p._notifyPluginsOfEnabled = p._lazy = false;

    TweenLite.version = "1.15.0";
    TweenLite.defaultEase = p._ease = new Ease(null, null, 1, 1);
    TweenLite.defaultOverwrite = "auto";
    TweenLite.ticker = _ticker;
    TweenLite.autoSleep = true;
    TweenLite.lagSmoothing = function (threshold, adjustedLag) {
        _ticker.lagSmoothing(threshold, adjustedLag);
    };

    TweenLite.selector = window.$ || window.jQuery || function (e) {
        var selector = window.$ || window.jQuery;
        if (selector) {
            TweenLite.selector = selector;
            return selector(e);
        }
        return (typeof (document) === "undefined") ? e : (document.querySelectorAll ? document.querySelectorAll(e) : document.getElementById((e.charAt(0) === "#") ? e.substr(1) : e));
    };

    var _lazyTweens = [],
        _lazyLookup = {},
        _internals = TweenLite._internals = {
            isArray: _isArray,
            isSelector: _isSelector,
            lazyTweens: _lazyTweens
        }, //gives us a way to expose certain private values to other GreenSock classes without contaminating tha main TweenLite object.
        _plugins = TweenLite._plugins = {},
        _tweenLookup = _internals.tweenLookup = {},
        _tweenLookupNum = 0,
        _reservedProps = _internals.reservedProps = {
            ease: 1,
            delay: 1,
            overwrite: 1,
            onComplete: 1,
            onCompleteParams: 1,
            onCompleteScope: 1,
            useFrames: 1,
            runBackwards: 1,
            startAt: 1,
            onUpdate: 1,
            onUpdateParams: 1,
            onUpdateScope: 1,
            onStart: 1,
            onStartParams: 1,
            onStartScope: 1,
            onReverseComplete: 1,
            onReverseCompleteParams: 1,
            onReverseCompleteScope: 1,
            onRepeat: 1,
            onRepeatParams: 1,
            onRepeatScope: 1,
            easeParams: 1,
            yoyo: 1,
            immediateRender: 1,
            repeat: 1,
            repeatDelay: 1,
            data: 1,
            paused: 1,
            reversed: 1,
            autoCSS: 1,
            lazy: 1,
            onOverwrite: 1
        },
        _overwriteLookup = {
            none: 0,
            all: 1,
            auto: 2,
            concurrent: 3,
            allOnStart: 4,
            preexisting: 5,
            "true": 1,
            "false": 0
        },
        _rootFramesTimeline = Animation._rootFramesTimeline = new SimpleTimeline(),
        _rootTimeline = Animation._rootTimeline = new SimpleTimeline(),
        _lazyRender = _internals.lazyRender = function () {
            var i = _lazyTweens.length,
                tween;
            _lazyLookup = {};
            while (--i > -1) {
                tween = _lazyTweens[i];
                if (tween && tween._lazy !== false) {
                    tween.render(tween._lazy[0], tween._lazy[1], true);
                    tween._lazy = false;
                }
            }
            _lazyTweens.length = 0;
        };

    _rootTimeline._startTime = _ticker.time;
    _rootFramesTimeline._startTime = _ticker.frame;
    _rootTimeline._active = _rootFramesTimeline._active = true;
    setTimeout(_lazyRender, 1); //on some mobile devices, there isn't a "tick" before code runs which means any lazy renders wouldn't run before the next official "tick".

    Animation._updateRoot = TweenLite.render = function () {
        var i, a, p;
        if (_lazyTweens.length) { //if code is run outside of the requestAnimationFrame loop, there may be tweens queued AFTER the engine refreshed, so we need to ensure any pending renders occur before we refresh again.
            _lazyRender();
        }
        _rootTimeline.render((_ticker.time - _rootTimeline._startTime) * _rootTimeline._timeScale, false, false);
        _rootFramesTimeline.render((_ticker.frame - _rootFramesTimeline._startTime) * _rootFramesTimeline._timeScale, false, false);
        if (_lazyTweens.length) {
            _lazyRender();
        }
        if (!(_ticker.frame % 120)) { //dump garbage every 120 frames...
            for (p in _tweenLookup) {
                a = _tweenLookup[p].tweens;
                i = a.length;
                while (--i > -1) {
                    if (a[i]._gc) {
                        a.splice(i, 1);
                    }
                }
                if (a.length === 0) {
                    delete _tweenLookup[p];
                }
            }
            //if there are no more tweens in the root timelines, or if they're all paused, make the _timer sleep to reduce load on the CPU slightly
            p = _rootTimeline._first;
            if (!p || p._paused) if (TweenLite.autoSleep && !_rootFramesTimeline._first && _ticker._listeners.tick.length === 1) {
                while (p && p._paused) {
                    p = p._next;
                }
                if (!p) {
                    _ticker.sleep();
                }
            }
        }
    };

    _ticker.addEventListener("tick", Animation._updateRoot);

    var _register = function (target, tween, scrub) {
        var id = target._gsTweenID,
            a, i;
        if (!_tweenLookup[id || (target._gsTweenID = id = "t" + (_tweenLookupNum++))]) {
            _tweenLookup[id] = {
                target: target,
                tweens: []
            };
        }
        if (tween) {
            a = _tweenLookup[id].tweens;
            a[(i = a.length)] = tween;
            if (scrub) {
                while (--i > -1) {
                    if (a[i] === tween) {
                        a.splice(i, 1);
                    }
                }
            }
        }
        return _tweenLookup[id].tweens;
    },

    _onOverwrite = function (overwrittenTween, overwritingTween, target, killedProps) {
        var func = overwrittenTween.vars.onOverwrite,
            r1, r2;
        if (func) {
            r1 = func(overwrittenTween, overwritingTween, target, killedProps);
        }
        func = TweenLite.onOverwrite;
        if (func) {
            r2 = func(overwrittenTween, overwritingTween, target, killedProps);
        }
        return (r1 !== false && r2 !== false);
    },
    _applyOverwrite = function (target, tween, props, mode, siblings) {
        var i, changed, curTween, l;
        if (mode === 1 || mode >= 4) {
            l = siblings.length;
            for (i = 0; i < l; i++) {
                if ((curTween = siblings[i]) !== tween) {
                    if (!curTween._gc) {
                        if (_onOverwrite(curTween, tween) && curTween._enabled(false, false)) {
                            changed = true;
                        }
                    }
                } else if (mode === 5) {
                    break;
                }
            }
            return changed;
        }
        //NOTE: Add 0.0000000001 to overcome floating point errors that can cause the startTime to be VERY slightly off (when a tween's time() is set for example)
        var startTime = tween._startTime + _tinyNum,
            overlaps = [],
            oCount = 0,
            zeroDur = (tween._duration === 0),
            globalStart;
        i = siblings.length;
        while (--i > -1) {
            if ((curTween = siblings[i]) === tween || curTween._gc || curTween._paused) {
                //ignore
            } else if (curTween._timeline !== tween._timeline) {
                globalStart = globalStart || _checkOverlap(tween, 0, zeroDur);
                if (_checkOverlap(curTween, globalStart, zeroDur) === 0) {
                    overlaps[oCount++] = curTween;
                }
            } else if (curTween._startTime <= startTime) if (curTween._startTime + curTween.totalDuration() / curTween._timeScale > startTime) if (!((zeroDur || !curTween._initted) && startTime - curTween._startTime <= 0.0000000002)) {
                overlaps[oCount++] = curTween;
            }
        }

        i = oCount;
        while (--i > -1) {
            curTween = overlaps[i];
            if (mode === 2) if (curTween._kill(props, target, tween)) {
                changed = true;
            }
            if (mode !== 2 || (!curTween._firstPT && curTween._initted)) {
                if (mode !== 2 && !_onOverwrite(curTween, tween)) {
                    continue;
                }
                if (curTween._enabled(false, false)) { //if all property tweens have been overwritten, kill the tween.
                    changed = true;
                }
            }
        }
        return changed;
    },

    _checkOverlap = function (tween, reference, zeroDur) {
        var tl = tween._timeline,
            ts = tl._timeScale,
            t = tween._startTime;
        while (tl._timeline) {
            t += tl._startTime;
            ts *= tl._timeScale;
            if (tl._paused) {
                return -100;
            }
            tl = tl._timeline;
        }
        t /= ts;
        return (t > reference) ? t - reference : ((zeroDur && t === reference) || (!tween._initted && t - reference < 2 * _tinyNum)) ? _tinyNum : ((t += tween.totalDuration() / tween._timeScale / ts) > reference + _tinyNum) ? 0 : t - reference - _tinyNum;
    };


    //---- TweenLite instance methods -----------------------------------------------------------------------------

    p._init = function () {
        var v = this.vars,
            op = this._overwrittenProps,
            dur = this._duration,
            immediate = !! v.immediateRender,
            ease = v.ease,
            i, initPlugins, pt, p, startVars;
        if (v.startAt) {
            if (this._startAt) {
                this._startAt.render(-1, true); //if we've run a startAt previously (when the tween instantiated), we should revert it so that the values re-instantiate correctly particularly for relative tweens. Without this, a TweenLite.fromTo(obj, 1, {x:"+=100"}, {x:"-=100"}), for example, would actually jump to +=200 because the startAt would run twice, doubling the relative change.
                this._startAt.kill();
            }
            startVars = {};
            for (p in v.startAt) { //copy the properties/values into a new object to avoid collisions, like var to = {x:0}, from = {x:500}; timeline.fromTo(e, 1, from, to).fromTo(e, 1, to, from);
                startVars[p] = v.startAt[p];
            }
            startVars.overwrite = false;
            startVars.immediateRender = true;
            startVars.lazy = (immediate && v.lazy !== false);
            startVars.startAt = startVars.delay = null; //no nesting of startAt objects allowed (otherwise it could cause an infinite loop).
            this._startAt = TweenLite.to(this.target, 0, startVars);
            if (immediate) {
                if (this._time > 0) {
                    this._startAt = null; //tweens that render immediately (like most from() and fromTo() tweens) shouldn't revert when their parent timeline's playhead goes backward past the startTime because the initial render could have happened anytime and it shouldn't be directly correlated to this tween's startTime. Imagine setting up a complex animation where the beginning states of various objects are rendered immediately but the tween doesn't happen for quite some time - if we revert to the starting values as soon as the playhead goes backward past the tween's startTime, it will throw things off visually. Reversion should only happen in TimelineLite/Max instances where immediateRender was false (which is the default in the convenience methods like from()).
                } else if (dur !== 0) {
                    return; //we skip initialization here so that overwriting doesn't occur until the tween actually begins. Otherwise, if you create several immediateRender:true tweens of the same target/properties to drop into a TimelineLite or TimelineMax, the last one created would overwrite the first ones because they didn't get placed into the timeline yet before the first render occurs and kicks in overwriting.
                }
            }
        } else if (v.runBackwards && dur !== 0) {
            //from() tweens must be handled uniquely: their beginning values must be rendered but we don't want overwriting to occur yet (when time is still 0). Wait until the tween actually begins before doing all the routines like overwriting. At that time, we should render at the END of the tween to ensure that things initialize correctly (remember, from() tweens go backwards)
            if (this._startAt) {
                this._startAt.render(-1, true);
                this._startAt.kill();
                this._startAt = null;
            } else {
                if (this._time !== 0) { //in rare cases (like if a from() tween runs and then is invalidate()-ed), immediateRender could be true but the initial forced-render gets skipped, so there's no need to force the render in this context when the _time is greater than 0
                    immediate = false;
                }
                pt = {};
                for (p in v) { //copy props into a new object and skip any reserved props, otherwise onComplete or onUpdate or onStart could fire. We should, however, permit autoCSS to go through.
                    if (!_reservedProps[p] || p === "autoCSS") {
                        pt[p] = v[p];
                    }
                }
                pt.overwrite = 0;
                pt.data = "isFromStart"; //we tag the tween with as "isFromStart" so that if [inside a plugin] we need to only do something at the very END of a tween, we have a way of identifying this tween as merely the one that's setting the beginning values for a "from()" tween. For example, clearProps in CSSPlugin should only get applied at the very END of a tween and without this tag, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in.
                pt.lazy = (immediate && v.lazy !== false);
                pt.immediateRender = immediate; //zero-duration tweens render immediately by default, but if we're not specifically instructed to render this tween immediately, we should skip this and merely _init() to record the starting values (rendering them immediately would push them to completion which is wasteful in that case - we'd have to render(-1) immediately after)
                this._startAt = TweenLite.to(this.target, 0, pt);
                if (!immediate) {
                    this._startAt._init(); //ensures that the initial values are recorded
                    this._startAt._enabled(false); //no need to have the tween render on the next cycle. Disable it because we'll always manually control the renders of the _startAt tween.
                    if (this.vars.immediateRender) {
                        this._startAt = null;
                    }
                } else if (this._time === 0) {
                    return;
                }
            }
        }
        this._ease = ease = (!ease) ? TweenLite.defaultEase : (ease instanceof Ease) ? ease : (typeof (ease) === "function") ? new Ease(ease, v.easeParams) : _easeMap[ease] || TweenLite.defaultEase;
        if (v.easeParams instanceof Array && ease.config) {
            this._ease = ease.config.apply(ease, v.easeParams);
        }
        this._easeType = this._ease._type;
        this._easePower = this._ease._power;
        this._firstPT = null;

        if (this._targets) {
            i = this._targets.length;
            while (--i > -1) {
                if (this._initProps(this._targets[i], (this._propLookup[i] = {}), this._siblings[i], (op ? op[i] : null))) {
                    initPlugins = true;
                }
            }
        } else {
            initPlugins = this._initProps(this.target, this._propLookup, this._siblings, op);
        }

        if (initPlugins) {
            TweenLite._onPluginEvent("_onInitAllProps", this); //reorders the array in order of priority. Uses a static TweenPlugin method in order to minimize file size in TweenLite
        }
        if (op) if (!this._firstPT) if (typeof (this.target) !== "function") { //if all tweening properties have been overwritten, kill the tween. If the target is a function, it's probably a delayedCall so let it live.
            this._enabled(false, false);
        }
        if (v.runBackwards) {
            pt = this._firstPT;
            while (pt) {
                pt.s += pt.c;
                pt.c = -pt.c;
                pt = pt._next;
            }
        }
        this._onUpdate = v.onUpdate;
        this._initted = true;
    };

    p._initProps = function (target, propLookup, siblings, overwrittenProps) {
        var p, i, initPlugins, plugin, pt, v;
        if (target == null) {
            return false;
        }

        if (_lazyLookup[target._gsTweenID]) {
            _lazyRender(); //if other tweens of the same target have recently initted but haven't rendered yet, we've got to force the render so that the starting values are correct (imagine populating a timeline with a bunch of sequential tweens and then jumping to the end)
        }

        if (!this.vars.css) if (target.style) if (target !== window && target.nodeType) if (_plugins.css) if (this.vars.autoCSS !== false) { //it's so common to use TweenLite/Max to animate the css of DOM elements, we assume that if the target is a DOM element, that's what is intended (a convenience so that users don't have to wrap things in css:{}, although we still recommend it for a slight performance boost and better specificity). Note: we cannot check "nodeType" on the window inside an iframe.
            _autoCSS(this.vars, target);
        }
        for (p in this.vars) {
            v = this.vars[p];
            if (_reservedProps[p]) {
                if (v) if ((v instanceof Array) || (v.push && _isArray(v))) if (v.join("").indexOf("{self}") !== -1) {
                    this.vars[p] = v = this._swapSelfInParams(v, this);
                }

            } else if (_plugins[p] && (plugin = new _plugins[p]())._onInitTween(target, this.vars[p], this)) {

                //t - target        [object]
                //p - property      [string]
                //s - start         [number]
                //c - change        [number]
                //f - isFunction    [boolean]
                //n - name          [string]
                //pg - isPlugin     [boolean]
                //pr - priority     [number]
                this._firstPT = pt = {
                    _next: this._firstPT,
                    t: plugin,
                    p: "setRatio",
                    s: 0,
                    c: 1,
                    f: true,
                    n: p,
                    pg: true,
                    pr: plugin._priority
                };
                i = plugin._overwriteProps.length;
                while (--i > -1) {
                    propLookup[plugin._overwriteProps[i]] = this._firstPT;
                }
                if (plugin._priority || plugin._onInitAllProps) {
                    initPlugins = true;
                }
                if (plugin._onDisable || plugin._onEnable) {
                    this._notifyPluginsOfEnabled = true;
                }

            } else {
                this._firstPT = propLookup[p] = pt = {
                    _next: this._firstPT,
                    t: target,
                    p: p,
                    f: (typeof (target[p]) === "function"),
                    n: p,
                    pg: false,
                    pr: 0
                };
                pt.s = (!pt.f) ? parseFloat(target[p]) : target[((p.indexOf("set") || typeof (target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3))]();
                pt.c = (typeof (v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0) + "1", 10) * Number(v.substr(2)) : (Number(v) - pt.s) || 0;
            }
            if (pt) if (pt._next) {
                pt._next._prev = pt;
            }
        }

        if (overwrittenProps) if (this._kill(overwrittenProps, target)) { //another tween may have tried to overwrite properties of this tween before init() was called (like if two tweens start at the same time, the one created second will run first)
            return this._initProps(target, propLookup, siblings, overwrittenProps);
        }
        if (this._overwrite > 1) if (this._firstPT) if (siblings.length > 1) if (_applyOverwrite(target, this, propLookup, this._overwrite, siblings)) {
            this._kill(propLookup, target);
            return this._initProps(target, propLookup, siblings, overwrittenProps);
        }
        if (this._firstPT) if ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration)) { //zero duration tweens don't lazy render by default; everything else does.
            _lazyLookup[target._gsTweenID] = true;
        }
        return initPlugins;
    };

    p.render = function (time, suppressEvents, force) {
        var prevTime = this._time,
            duration = this._duration,
            prevRawPrevTime = this._rawPrevTime,
            isComplete, callback, pt, rawPrevTime;
        if (time >= duration) {
            this._totalTime = this._time = duration;
            this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
            if (!this._reversed) {
                isComplete = true;
                callback = "onComplete";
            }
            if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
                if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
                    time = 0;
                }
                if (time === 0 || prevRawPrevTime < 0 || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
                    force = true;
                    if (prevRawPrevTime > _tinyNum) {
                        callback = "onReverseComplete";
                    }
                }
                this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
            }

        } else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
            this._totalTime = this._time = 0;
            this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
            if (prevTime !== 0 || (duration === 0 && prevRawPrevTime > 0 && prevRawPrevTime !== _tinyNum)) {
                callback = "onReverseComplete";
                isComplete = this._reversed;
            }
            if (time < 0) {
                this._active = false;
                if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
                    if (prevRawPrevTime >= 0 && !(prevRawPrevTime === _tinyNum && this.data === "isPause")) {
                        force = true;
                    }
                    this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
                }
            }
            if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
                force = true;
            }
        } else {
            this._totalTime = this._time = time;

            if (this._easeType) {
                var r = time / duration,
                    type = this._easeType,
                    pow = this._easePower;
                if (type === 1 || (type === 3 && r >= 0.5)) {
                    r = 1 - r;
                }
                if (type === 3) {
                    r *= 2;
                }
                if (pow === 1) {
                    r *= r;
                } else if (pow === 2) {
                    r *= r * r;
                } else if (pow === 3) {
                    r *= r * r * r;
                } else if (pow === 4) {
                    r *= r * r * r * r;
                }

                if (type === 1) {
                    this.ratio = 1 - r;
                } else if (type === 2) {
                    this.ratio = r;
                } else if (time / duration < 0.5) {
                    this.ratio = r / 2;
                } else {
                    this.ratio = 1 - (r / 2);
                }

            } else {
                this.ratio = this._ease.getRatio(time / duration);
            }
        }

        if (this._time === prevTime && !force) {
            return;
        } else if (!this._initted) {
            this._init();
            if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
                return;
            } else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) {
                this._time = this._totalTime = prevTime;
                this._rawPrevTime = prevRawPrevTime;
                _lazyTweens.push(this);
                this._lazy = [time, suppressEvents];
                return;
            }
            //_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
            if (this._time && !isComplete) {
                this.ratio = this._ease.getRatio(this._time / duration);
            } else if (isComplete && this._ease._calcEnd) {
                this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
            }
        }
        if (this._lazy !== false) { //in case a lazy render is pending, we should flush it because the new render is occurring now (imagine a lazy tween instantiating and then immediately the user calls tween.seek(tween.duration()), skipping to the end - the end render would be forced, and then if we didn't flush the lazy render, it'd fire AFTER the seek(), rendering it at the wrong time.
            this._lazy = false;
        }
        if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
            this._active = true; //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
        }
        if (prevTime === 0) {
            if (this._startAt) {
                if (time >= 0) {
                    this._startAt.render(time, suppressEvents, force);
                } else if (!callback) {
                    callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
                }
            }
            if (this.vars.onStart) if (this._time !== 0 || duration === 0) if (!suppressEvents) {
                this.vars.onStart.apply(this.vars.onStartScope || this, this.vars.onStartParams || _blankArray);
            }
        }
        pt = this._firstPT;
        while (pt) {
            if (pt.f) {
                pt.t[pt.p](pt.c * this.ratio + pt.s);
            } else {
                pt.t[pt.p] = pt.c * this.ratio + pt.s;
            }
            pt = pt._next;
        }

        if (this._onUpdate) {
            if (time < 0) if (this._startAt && time !== -0.0001) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
                this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
            }
            if (!suppressEvents) if (this._time !== prevTime || isComplete) {
                this._onUpdate.apply(this.vars.onUpdateScope || this, this.vars.onUpdateParams || _blankArray);
            }
        }
        if (callback) if (!this._gc || force) { //check _gc because there's a chance that kill() could be called in an onUpdate
            if (time < 0 && this._startAt && !this._onUpdate && time !== -0.0001) { //-0.0001 is a special value that we use when looping back to the beginning of a repeated TimelineMax, in which case we shouldn't render the _startAt values.
                this._startAt.render(time, suppressEvents, force);
            }
            if (isComplete) {
                if (this._timeline.autoRemoveChildren) {
                    this._enabled(false, false);
                }
                this._active = false;
            }
            if (!suppressEvents && this.vars[callback]) {
                this.vars[callback].apply(this.vars[callback + "Scope"] || this, this.vars[callback + "Params"] || _blankArray);
            }
            if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
                this._rawPrevTime = 0;
            }
        }
    };

    p._kill = function (vars, target, overwritingTween) {
        if (vars === "all") {
            vars = null;
        }
        if (vars == null) if (target == null || target === this.target) {
            this._lazy = false;
            return this._enabled(false, false);
        }
        target = (typeof (target) !== "string") ? (target || this._targets || this.target) : TweenLite.selector(target) || target;
        var i, overwrittenProps, p, pt, propLookup, changed, killProps, record, killed;
        if ((_isArray(target) || _isSelector(target)) && typeof (target[0]) !== "number") {
            i = target.length;
            while (--i > -1) {
                if (this._kill(vars, target[i])) {
                    changed = true;
                }
            }
        } else {
            if (this._targets) {
                i = this._targets.length;
                while (--i > -1) {
                    if (target === this._targets[i]) {
                        propLookup = this._propLookup[i] || {};
                        this._overwrittenProps = this._overwrittenProps || [];
                        overwrittenProps = this._overwrittenProps[i] = vars ? this._overwrittenProps[i] || {} : "all";
                        break;
                    }
                }
            } else if (target !== this.target) {
                return false;
            } else {
                propLookup = this._propLookup;
                overwrittenProps = this._overwrittenProps = vars ? this._overwrittenProps || {} : "all";
            }

            if (propLookup) {
                killProps = vars || propLookup;
                record = (vars !== overwrittenProps && overwrittenProps !== "all" && vars !== propLookup && (typeof (vars) !== "object" || !vars._tempKill)); //_tempKill is a super-secret way to delete a particular tweening property but NOT have it remembered as an official overwritten property (like in BezierPlugin)
                if (overwritingTween && (TweenLite.onOverwrite || this.vars.onOverwrite)) {
                    for (p in killProps) {
                        if (propLookup[p]) {
                            if (!killed) {
                                killed = [];
                            }
                            killed.push(p);
                        }
                    }
                    if (!_onOverwrite(this, overwritingTween, target, killed)) { //if the onOverwrite returned false, that means the user wants to override the overwriting (cancel it).
                        return false;
                    }
                }

                for (p in killProps) {
                    if ((pt = propLookup[p])) {
                        if (pt.pg && pt.t._kill(killProps)) {
                            changed = true; //some plugins need to be notified so they can perform cleanup tasks first
                        }
                        if (!pt.pg || pt.t._overwriteProps.length === 0) {
                            if (pt._prev) {
                                pt._prev._next = pt._next;
                            } else if (pt === this._firstPT) {
                                this._firstPT = pt._next;
                            }
                            if (pt._next) {
                                pt._next._prev = pt._prev;
                            }
                            pt._next = pt._prev = null;
                        }
                        delete propLookup[p];
                    }
                    if (record) {
                        overwrittenProps[p] = 1;
                    }
                }
                if (!this._firstPT && this._initted) { //if all tweening properties are killed, kill the tween. Without this line, if there's a tween with multiple targets and then you killTweensOf() each target individually, the tween would technically still remain active and fire its onComplete even though there aren't any more properties tweening.
                    this._enabled(false, false);
                }
            }
        }
        return changed;
    };

    p.invalidate = function () {
        if (this._notifyPluginsOfEnabled) {
            TweenLite._onPluginEvent("_onDisable", this);
        }
        this._firstPT = this._overwrittenProps = this._startAt = this._onUpdate = null;
        this._notifyPluginsOfEnabled = this._active = this._lazy = false;
        this._propLookup = (this._targets) ? {} : [];
        Animation.prototype.invalidate.call(this);
        if (this.vars.immediateRender) {
            this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
            this.render(-this._delay);
        }
        return this;
    };

    p._enabled = function (enabled, ignoreTimeline) {
        if (!_tickerActive) {
            _ticker.wake();
        }
        if (enabled && this._gc) {
            var targets = this._targets,
                i;
            if (targets) {
                i = targets.length;
                while (--i > -1) {
                    this._siblings[i] = _register(targets[i], this, true);
                }
            } else {
                this._siblings = _register(this.target, this, true);
            }
        }
        Animation.prototype._enabled.call(this, enabled, ignoreTimeline);
        if (this._notifyPluginsOfEnabled) if (this._firstPT) {
            return TweenLite._onPluginEvent((enabled ? "_onEnable" : "_onDisable"), this);
        }
        return false;
    };


    //----TweenLite static methods -----------------------------------------------------

    TweenLite.to = function (target, duration, vars) {
        return new TweenLite(target, duration, vars);
    };

    TweenLite.from = function (target, duration, vars) {
        vars.runBackwards = true;
        vars.immediateRender = (vars.immediateRender != false);
        return new TweenLite(target, duration, vars);
    };

    TweenLite.fromTo = function (target, duration, fromVars, toVars) {
        toVars.startAt = fromVars;
        toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
        return new TweenLite(target, duration, toVars);
    };

    TweenLite.delayedCall = function (delay, callback, params, scope, useFrames) {
        return new TweenLite(callback, 0, {
            delay: delay,
            onComplete: callback,
            onCompleteParams: params,
            onCompleteScope: scope,
            onReverseComplete: callback,
            onReverseCompleteParams: params,
            onReverseCompleteScope: scope,
            immediateRender: false,
            lazy: false,
            useFrames: useFrames,
            overwrite: 0
        });
    };

    TweenLite.set = function (target, vars) {
        return new TweenLite(target, 0, vars);
    };

    TweenLite.getTweensOf = function (target, onlyActive) {
        if (target == null) {
            return [];
        }
        target = (typeof (target) !== "string") ? target : TweenLite.selector(target) || target;
        var i, a, j, t;
        if ((_isArray(target) || _isSelector(target)) && typeof (target[0]) !== "number") {
            i = target.length;
            a = [];
            while (--i > -1) {
                a = a.concat(TweenLite.getTweensOf(target[i], onlyActive));
            }
            i = a.length;
            //now get rid of any duplicates (tweens of arrays of objects could cause duplicates)
            while (--i > -1) {
                t = a[i];
                j = i;
                while (--j > -1) {
                    if (t === a[j]) {
                        a.splice(i, 1);
                    }
                }
            }
        } else {
            a = _register(target).concat();
            i = a.length;
            while (--i > -1) {
                if (a[i]._gc || (onlyActive && !a[i].isActive())) {
                    a.splice(i, 1);
                }
            }
        }
        return a;
    };

    TweenLite.killTweensOf = TweenLite.killDelayedCallsTo = function (target, onlyActive, vars) {
        if (typeof (onlyActive) === "object") {
            vars = onlyActive; //for backwards compatibility (before "onlyActive" parameter was inserted)
            onlyActive = false;
        }
        var a = TweenLite.getTweensOf(target, onlyActive),
            i = a.length;
        while (--i > -1) {
            a[i]._kill(vars, target);
        }
    };



    /*
     * ----------------------------------------------------------------
     * TweenPlugin   (could easily be split out as a separate file/class, but included for ease of use (so that people don't need to include another script call before loading plugins which is easy to forget)
     * ----------------------------------------------------------------
     */
    var TweenPlugin = _class("plugins.TweenPlugin", function (props, priority) {
        this._overwriteProps = (props || "").split(",");
        this._propName = this._overwriteProps[0];
        this._priority = priority || 0;
        this._super = TweenPlugin.prototype;
    }, true);

    p = TweenPlugin.prototype;
    TweenPlugin.version = "1.10.1";
    TweenPlugin.API = 2;
    p._firstPT = null;

    p._addTween = function (target, prop, start, end, overwriteProp, round) {
        var c, pt;
        if (end != null && (c = (typeof (end) === "number" || end.charAt(1) !== "=") ? Number(end) - start : parseInt(end.charAt(0) + "1", 10) * Number(end.substr(2)))) {
            this._firstPT = pt = {
                _next: this._firstPT,
                t: target,
                p: prop,
                s: start,
                c: c,
                f: (typeof (target[prop]) === "function"),
                n: overwriteProp || prop,
                r: round
            };
            if (pt._next) {
                pt._next._prev = pt;
            }
            return pt;
        }
    };

    p.setRatio = function (v) {
        var pt = this._firstPT,
            min = 0.000001,
            val;
        while (pt) {
            val = pt.c * v + pt.s;
            if (pt.r) {
                val = Math.round(val);
            } else if (val < min) if (val > -min) { //prevents issues with converting very small numbers to strings in the browser
                val = 0;
            }
            if (pt.f) {
                pt.t[pt.p](val);
            } else {
                pt.t[pt.p] = val;
            }
            pt = pt._next;
        }
    };

    p._kill = function (lookup) {
        var a = this._overwriteProps,
            pt = this._firstPT,
            i;
        if (lookup[this._propName] != null) {
            this._overwriteProps = [];
        } else {
            i = a.length;
            while (--i > -1) {
                if (lookup[a[i]] != null) {
                    a.splice(i, 1);
                }
            }
        }
        while (pt) {
            if (lookup[pt.n] != null) {
                if (pt._next) {
                    pt._next._prev = pt._prev;
                }
                if (pt._prev) {
                    pt._prev._next = pt._next;
                    pt._prev = null;
                } else if (this._firstPT === pt) {
                    this._firstPT = pt._next;
                }
            }
            pt = pt._next;
        }
        return false;
    };

    p._roundProps = function (lookup, value) {
        var pt = this._firstPT;
        while (pt) {
            if (lookup[this._propName] || (pt.n != null && lookup[pt.n.split(this._propName + "_").join("")])) { //some properties that are very plugin-specific add a prefix named after the _propName plus an underscore, so we need to ignore that extra stuff here.
                pt.r = value;
            }
            pt = pt._next;
        }
    };

    TweenLite._onPluginEvent = function (type, tween) {
        var pt = tween._firstPT,
            changed, pt2, first, last, next;
        if (type === "_onInitAllProps") {
            //sorts the PropTween linked list in order of priority because some plugins need to render earlier/later than others, like MotionBlurPlugin applies its effects after all x/y/alpha tweens have rendered on each frame.
            while (pt) {
                next = pt._next;
                pt2 = first;
                while (pt2 && pt2.pr > pt.pr) {
                    pt2 = pt2._next;
                }
                if ((pt._prev = pt2 ? pt2._prev : last)) {
                    pt._prev._next = pt;
                } else {
                    first = pt;
                }
                if ((pt._next = pt2)) {
                    pt2._prev = pt;
                } else {
                    last = pt;
                }
                pt = next;
            }
            pt = tween._firstPT = first;
        }
        while (pt) {
            if (pt.pg) if (typeof (pt.t[type]) === "function") if (pt.t[type]()) {
                changed = true;
            }
            pt = pt._next;
        }
        return changed;
    };

    TweenPlugin.activate = function (plugins) {
        var i = plugins.length;
        while (--i > -1) {
            if (plugins[i].API === TweenPlugin.API) {
                _plugins[(new plugins[i]())._propName] = plugins[i];
            }
        }
        return true;
    };

    //provides a more concise way to define plugins that have no dependencies besides TweenPlugin and TweenLite, wrapping common boilerplate stuff into one function (added in 1.9.0). You don't NEED to use this to define a plugin - the old way still works and can be useful in certain (rare) situations.
    _gsDefine.plugin = function (config) {
        if (!config || !config.propName || !config.init || !config.API) {
            throw "illegal plugin definition.";
        }
        var propName = config.propName,
            priority = config.priority || 0,
            overwriteProps = config.overwriteProps,
            map = {
                init: "_onInitTween",
                set: "setRatio",
                kill: "_kill",
                round: "_roundProps",
                initAll: "_onInitAllProps"
            },
            Plugin = _class("plugins." + propName.charAt(0).toUpperCase() + propName.substr(1) + "Plugin",

            function () {
                TweenPlugin.call(this, propName, priority);
                this._overwriteProps = overwriteProps || [];
            }, (config.global === true)),
            p = Plugin.prototype = new TweenPlugin(propName),
            prop;
        p.constructor = Plugin;
        Plugin.API = config.API;
        for (prop in map) {
            if (typeof (config[prop]) === "function") {
                p[map[prop]] = config[prop];
            }
        }
        Plugin.version = config.version;
        TweenPlugin.activate([Plugin]);
        return Plugin;
    };


    //now run through all the dependencies discovered and if any are missing, log that to the console as a warning. This is why it's best to have TweenLite load last - it can check all the dependencies for you.
    a = window._gsQueue;
    if (a) {
        for (i = 0; i < a.length; i++) {
            a[i]();
        }
        for (p in _defLookup) {
            if (!_defLookup[p].func) {
                window.console.log("GSAP encountered missing dependency: com.greensock." + p);
            }
        }
    }

    _tickerActive = false; //ensures that the first official animation forces a ticker.tick() to update the time when it is instantiated

})((typeof (module) !== "undefined" && module.exports && typeof (global) !== "undefined") ? global : this || window, "TweenLite");


/*!
 * VERSION: 1.7.4
 * DATE: 2014-07-17
 * UPDATES AND DOCS AT: http://www.greensock.com
 *
 * @license Copyright (c) 2008-2014, GreenSock. All rights reserved.
 * This work is subject to the terms at http://www.greensock.com/terms_of_use.html or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/
var _gsScope = (typeof (module) !== "undefined" && module.exports && typeof (global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(_gsScope._gsQueue || (_gsScope._gsQueue = [])).push(function () {

    "use strict";

    var _doc = document.documentElement,
        _window = window,
        _max = function (element, axis) {
            var dim = (axis === "x") ? "Width" : "Height",
                scroll = "scroll" + dim,
                client = "client" + dim,
                body = document.body;
            return (element === _window || element === _doc || element === body) ? Math.max(_doc[scroll], body[scroll]) - (_window["inner" + dim] || Math.max(_doc[client], body[client])) : element[scroll] - element["offset" + dim];
        },

        ScrollToPlugin = _gsScope._gsDefine.plugin({
            propName: "scrollTo",
            API: 2,
            version: "1.7.4",

            //called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
            init: function (target, value, tween) {
                this._wdw = (target === _window);
                this._target = target;
                this._tween = tween;
                if (typeof (value) !== "object") {
                    value = {
                        y: value
                    }; //if we don't receive an object as the parameter, assume the user intends "y".
                }
                this.vars = value;
                this._autoKill = (value.autoKill !== false);
                this.x = this.xPrev = this.getX();
                this.y = this.yPrev = this.getY();
                if (value.x != null) {
                    this._addTween(this, "x", this.x, (value.x === "max") ? _max(target, "x") : value.x, "scrollTo_x", true);
                    this._overwriteProps.push("scrollTo_x");
                } else {
                    this.skipX = true;
                }
                if (value.y != null) {
                    this._addTween(this, "y", this.y, (value.y === "max") ? _max(target, "y") : value.y, "scrollTo_y", true);
                    this._overwriteProps.push("scrollTo_y");
                } else {
                    this.skipY = true;
                }
                return true;
            },

            //called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
            set: function (v) {
                this._super.setRatio.call(this, v);

                var x = (this._wdw || !this.skipX) ? this.getX() : this.xPrev,
                    y = (this._wdw || !this.skipY) ? this.getY() : this.yPrev,
                    yDif = y - this.yPrev,
                    xDif = x - this.xPrev;

                if (this._autoKill) {
                    //note: iOS has a bug that throws off the scroll by several pixels, so we need to check if it's within 7 pixels of the previous one that we set instead of just looking for an exact match.
                    if (!this.skipX && (xDif > 7 || xDif < -7) && x < _max(this._target, "x")) {
                        this.skipX = true; //if the user scrolls separately, we should stop tweening!
                    }
                    if (!this.skipY && (yDif > 7 || yDif < -7) && y < _max(this._target, "y")) {
                        this.skipY = true; //if the user scrolls separately, we should stop tweening!
                    }
                    if (this.skipX && this.skipY) {
                        this._tween.kill();
                        if (this.vars.onAutoKill) {
                            this.vars.onAutoKill.apply(this.vars.onAutoKillScope || this._tween, this.vars.onAutoKillParams || []);
                        }
                    }
                }
                if (this._wdw) {
                    _window.scrollTo((!this.skipX) ? this.x : x, (!this.skipY) ? this.y : y);
                } else {
                    if (!this.skipY) {
                        this._target.scrollTop = this.y;
                    }
                    if (!this.skipX) {
                        this._target.scrollLeft = this.x;
                    }
                }
                this.xPrev = this.x;
                this.yPrev = this.y;
            }

        }),
        p = ScrollToPlugin.prototype;

    ScrollToPlugin.max = _max;

    p.getX = function () {
        return (!this._wdw) ? this._target.scrollLeft : (_window.pageXOffset != null) ? _window.pageXOffset : (_doc.scrollLeft != null) ? _doc.scrollLeft : document.body.scrollLeft;
    };

    p.getY = function () {
        return (!this._wdw) ? this._target.scrollTop : (_window.pageYOffset != null) ? _window.pageYOffset : (_doc.scrollTop != null) ? _doc.scrollTop : document.body.scrollTop;
    };

    p._kill = function (lookup) {
        if (lookup.scrollTo_x) {
            this.skipX = true;
        }
        if (lookup.scrollTo_y) {
            this.skipY = true;
        }
        return this._super._kill.call(this, lookup);
    };

});
if (_gsScope._gsDefine) {
    _gsScope._gsQueue.pop()();
}


modules.define('y-debounce', function (provide) {
    /**
     * Вернет версию функции, исполнение которой начнется не ранее,
     * чем истечет промежуток wait, после ее последнего вызова.
     *
     * Полезно для реализации логики, которая зависит от завершения
     * действий пользователя. Например, проверить орфографию комментария
     * пользователя лучше будет после того, как он его окончательно введет,
     * а динамечески перерассчитать разметку после того, как пользователь
     * закончит изменять размер окна.
     *
     * @name debounce
     * @param {Function} func
     * @param {Number} wait
     * @param {Boolean} [immediate=false] Если true, выполнит функцию в начале
     *      интервала wait, иначе - в конце.
     * @returns {Function}
     *
     * @example
     * var calculateLayout = function() {};
     * var lazyLayout = debounce(calculateLayout, 300);
     * $(window).resize(lazyLayout);
     */
    provide(function (func, wait, immediate) {
        var result;
        var timeout = null;
        return function () {
            var context = this;
            var args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) {
                    result = func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                result = func.apply(context, args);
            }
            return result;
        };
    });
});

/* global escape */

modules.define(
    'chitalka-fb2-parser',
    [
        'chitalka',
        'jquery',
        'inherit',
        'y-extend',
        'unzip'
    ],
    function (
        provide,
        Chitalka,
        $,
        inherit,
        extend,
        zip
    ) {

    var TIMEOUT = 2 * 1000;

    /**
     * Функция выполняет трансформацию строки в XMLDocument
     * @param {String} text
     *
     * @returns {Document} XMLDocument
     */
    var _parseXml = (function () {
        var parseXml;

        if (window.DOMParser) {
            parseXml = function (xmlStr) {
                return (new window.DOMParser()).parseFromString(xmlStr, 'text/xml');
            };
        } else if (typeof window.ActiveXObject !== 'undefined' && new window.ActiveXObject('Microsoft.XMLDOM')) {
            parseXml = function (xmlStr) {
                var xmlDoc = new window.ActiveXObject('Microsoft.XMLDOM');
                xmlDoc.async = 'false';
                xmlDoc.loadXML(xmlStr);
                return xmlDoc;
            };
        } else {
            parseXml = function () {
                return null;
            };
        }

        return parseXml;
    })();

    /**
     * По расщирению файла проверяет,
     * запакованный файл или нет
     * @param {string} url
     * @returns {boolean}
     * @private
     */
    var _isZipArchive = function (url) {
        return /(\.zip)$/i.test(url);
    };

    var parserFb2 = {
        unzip: function (url, encoding) {
            var d = $.Deferred();
            var isBase64 = /^data:/.test(url);

            // наша ручка /data/ проксируется на http://partnersdnld.litres.ru/static/trials
            //url = url.replace('http://partnersdnld.litres.ru/static/trials', '/data');

            zip.workerScriptsPath = window.document.location.pathname + 'lib/';
            zip.createReader((isBase64 ? new zip.Data64URIReader(url) : new zip.HttpReader(url)), function (reader) {
                // get all entries from the zip
                reader.getEntries(function (entries) {
                    if (!entries.length) {
                        return;
                    }
                    // get first entry content as text
                    entries[0].getData(new zip.TextWriter(encoding), function (str) {

                        // close the zip reader
                        reader.close(function () {
                            // onclose callback
                            d.resolve(str);
                        });

                    }, function (/*current, total*/) {
                        // onprogress callback
                    });
                });
            }, function (error) {
                // onerror callback
                d.reject(error);
            });

            return d.promise();
        },

        getXml: function (xmlStr) {
            var d = $.Deferred();

            var xml = _parseXml(xmlStr);
            d.resolve(xml);

            return d.promise();
        },

        /**
         * Читает файл по урлу или DataURI,
         * если файл в архиве - распаковывает.
         * @param {string} obj
         * @returns {Promise}
         */
        readFile: function (obj) {
            var url = obj.file ? obj.result : obj;

            if (/^data:/.test(url)) {

                return this._readAsDataUri(obj);
            }
            if (_isZipArchive(url)) {
                return this.unzip(url);
            }
            return $.ajax({
                url: url,
                dataType: 'text',
                contentType: 'text/plain',
                timeout: TIMEOUT
            });
        },

        /**
         * Читает файл по DataURI
         * @param {Object} obj
         * @param {String} obj.url данные из файла
         * @param {Blob} obj.file файл для чтения
         *
         * @returns {Promise}
         */
        _readAsDataUri: function (obj) {
            var file = obj.file;
            var url = file ? obj.result : obj;
            var mediaInfo = url.split(',')[0];
            var data = url.substring(url.indexOf(',') + 1);

            var encodingRegExp = /encoding=\"UTF\-8\"/;

            // zip-архив
            if (mediaInfo.indexOf('zip') > 0) {
                // Сразу возвращаем промис unzip, но затем перепроверяем результат относительно кодировки
                return this.unzip(url).then(function (res) {

                    // Если кодировка не UTF-8, то нужно перезиповать с учётом прочитанной кодировки
                    if (!encodingRegExp.test(res)) {
                        var encoding = /encoding="([^"]+)"/.exec(res)[1];

                        return this.unzip(url, encoding);
                    } else {
                    // Иначе результат
                        var d = $.Deferred();
                        d.resolve(res);

                        return d.promise();
                    }
                }.bind(this));

            // Иначе получили просто текст
            } else {
                var d = $.Deferred();

                // Магия чтения DataURI
                // INFO: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/atob
                data = window.atob(data);

                // Опять же если кодировка не соответствует, то нужно перечитать файл
                if (!encodingRegExp.test(data)) {
                    var encoding = /encoding="([^"]+)"/.exec(data);

                    if (!encoding || !Array.isArray(encoding) || encoding.length > 2) {
                        d.reject('файл повреждён или книга неподдерживаемого формата');
                    } else {
                        encoding = encoding[1];
						if (!file) {

							function dataURLtoBlob(dataurl) {
							    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
						        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
								    while(n--){
							        u8arr[n] = bstr.charCodeAt(n);
								    }
							    return new Blob([u8arr], );
								}
							file=dataURLtoBlob(obj);

							}

                        var reader = new FileReader();
						reader.readAsText(file, encoding);
                        reader.onloadend = function () {
                            d.resolve(reader.result);
                        };
                    }
                } else {
                    try {
                        var result = decodeURIComponent(escape(data));
                        d.resolve(result);
                    } catch (e) {
                        d.reject(e);
                    }
                }

                return d.promise();
            }
        }
    };

    provide(parserFb2);
});

/**
 * next-tick module
 *
 * Copyright (c) 2013 Filatov Dmitry (dfilatov@yandex-team.ru)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * @version 1.0.1
 */

modules.define('y-next-tick', function(provide) {

/**
 * Вызывает переданную функцию в следующем тике.
 *
 * @name nextTick
 * @param {Function} callback
 */

var global = this.global,
    fns = [],
    enqueueFn = function(fn) {
        return fns.push(fn) === 1;
    },
    callFns = function() {
        var fnsToCall = fns, i = 0, len = fns.length;
        fns = [];
        while(i < len) {
            fnsToCall[i++]();
        }
    };

    if(typeof process === 'object' && process.nextTick) { // nodejs
        return provide(function(fn) {
            enqueueFn(fn) && process.nextTick(callFns);
        });
    }

    if(global.setImmediate) { // ie10
        return provide(function(fn) {
            enqueueFn(fn) && global.setImmediate(callFns);
        });
    }

    if(global.postMessage) { // modern browsers
        var isPostMessageAsync = true;
        if(global.attachEvent) {
            var checkAsync = function() {
                    isPostMessageAsync = false;
                };
            global.attachEvent('onmessage', checkAsync);
            global.postMessage('__checkAsync', '*');
            global.detachEvent('onmessage', checkAsync);
        }

        if(isPostMessageAsync) {
            var msg = '__nextTick' + +new Date,
                onMessage = function(e) {
                    if(e.data === msg) {
                        e.stopPropagation && e.stopPropagation();
                        callFns();
                    }
                };

            global.addEventListener?
                global.addEventListener('message', onMessage, true) :
                global.attachEvent('onmessage', onMessage);

            return provide(function(fn) {
                enqueueFn(fn) && global.postMessage(msg, '*');
            });
        }
    }

    var doc = global.document;
    if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
        var createScript = function() {
                var script = doc.createElement('script');
                script.onreadystatechange = function() {
                    script.parentNode.removeChild(script);
                    script = script.onreadystatechange = null;
                    callFns();
            };
            (doc.documentElement || doc.body).appendChild(script);
        };

        return provide(function(fn) {
            enqueueFn(fn) && createScript();
        });
    }

    provide(function(fn) { // old browsers
        enqueueFn(fn) && setTimeout(callFns, 0);
    });
});

/* global FileReader */
modules.define(
    'file-drag',
    [
        'y-block',
        'jquery',
        'y-extend',
        'inherit'
    ],
    function (
        provide,
        YBlock,
        $,
        extend,
        inherit
        ) {

    var FileDrag = inherit(YBlock, {
        __constructor: function (element) {
            this.__base.apply(this, arguments);

            if (!element) {
                return;
            }

            this._bindTo(element, 'dragstart', this._onDragOver.bind(this));
            this._bindTo(element, 'dragenter', this._onDragOver.bind(this));
            this._bindTo(element, 'dragover',  this._onDragOver.bind(this));

            this._bindTo(element, 'dragleave', this._onDragEnd.bind(this));
            this._bindTo(element, 'dragend',   this._onDragEnd.bind(this));
            this._bindTo(element, 'drop',      this._onDrop.bind(this));
        },

        /**
         * Действия по окончанию drag-событий
         *
         * @param {Event} e
         */
        _onDragEnd: function (e) {
            this._stopEvent(e);
            this._drag = false;

            setTimeout(function () {
                if (!this._drag) {
                    this.emit('hide-drag');
                }
            }.bind(this), 100);
        },

        /**
         * Действия во время drag-событий
         *
         * @param {Event} e
         */
        _onDragOver: function (e) {
            this._stopEvent(e);
            this._drag = true;
            this.emit('show-drag');
        },

        /**
         * Действия по бросания файла (drop-событие)
         *
         * @param {Event} e
         */
        _onDrop: function (e) {
            this._stopEvent(e);

            this.emit('hide-drag');

            var files = e.originalEvent.dataTransfer.files;

            if (files.length > 0 && window.FormData !== undefined && files[0]) {
                this.emit('file-dropped');
                var file = files[0];
                var reader = new FileReader();

                reader.onload = function (e) {
                    var res = e.target.result;
                    this.emit('file-loaded', {
                        result: res,
                        file: file
                    });
                }.bind(this);

                reader.readAsDataURL(file);
            }
        },

        /**
         * Останавливает всплытие события
         *
         * @param {Event} e событие
         */
        _stopEvent: function (e) {
            e.stopPropagation();
            e.preventDefault();
        }

    }, {
        getBlockName: function () {
            return 'file-drag';
        }
    });

    provide(FileDrag);
});

modules.define(
    'controls',
    [
        'y-block',
        'jquery',
        'y-extend',
        'inherit'
    ],
    function (
        provide,
        YBlock,
        $,
        extend,
        inherit
        ) {

    /*jshint devel:true*/
    var Controls = inherit(YBlock, {
        __constructor: function () {
            this.__base.apply(this, arguments);

            var menu = this._findElement('menu');
            var params = extend({
                zoom: false,

                // Длина свайпа в пикселах
                swipeLength: 20
            }, this._getOptions());

            this._trigger = this._findElement('trigger');
            this._bindTo(this._trigger, 'click', function () {
                this._toggleElementState(menu, 'state', 'opened', 'closed');
            });

            if (params.zoom) {
                this._initZoomControls();
            }

            if (params.footnotes) {
                this._initFootnotes();
            }

            if (params.pages) {
                this._initPageModes();
            }

            if (params.arrows) {
                this._initArrowControls();
            }
        },

        _initArrowControls: function () {
            this.arrowLeft = this._findElement('arrow-left');
            this.arrowRight = this._findElement('arrow-right');

            this._bindTo(this.arrowRight, 'click', function () {
                this.emit('next-page');
            });

            this._bindTo(this.arrowLeft, 'click', function () {
                this.emit('previous-page');
            });
        },

        _initZoomControls: function () {
            this._bindTo(this._findElement('plus'), 'click', function () {
                this.emit('zoom-in');
            });

            this._bindTo(this._findElement('minus'), 'click', function () {
                this.emit('zoom-out');
            });
        },

        /**
         * Инициализация блока со сносками
         */
        _initFootnotes: function () {
            this._bindTo(this._findElement('footnotes'), 'click', function (e) {
                this._toggleElementState($(e.currentTarget), 'mode', 'appendix', 'inline');

                this.emit('footnotes-' + this._getElementState($(e.currentTarget), 'mode'));
            });
        },

        /**
         * Устанавливает режим сносок в нужный
         *
         * @param {String} mode
         */
        setFootnotesMode: function (mode) {
            this._setElementState(this._findElement('footnotes'), 'mode', mode);
        },

        /**
         * Инициализация контрола страничного отображения
         */
        _initPageModes: function () {
            var pages = this._findElement('pages');
            var modes = ['auto', 'one', 'two'];
            this._pageMode = modes.indexOf(this._getElementState(pages, 'mode'));
            this._bindTo(pages, 'click', function () {
                this._pageMode = (this._pageMode + 1) % 3;
                this._setElementState(pages, 'mode', modes[this._pageMode]);

                this.emit('pages-' + this._getElementState(pages, 'mode'));
            });
        },

        /**
         * Устанавливает режим отображения в нужный
         *
         * @param {String} mode
         */
        setPageViewMode: function (mode) {
            var pages = this._findElement('pages');
            var modes = ['auto', 'one', 'two'];
            this._setElementState(pages, 'mode', mode);
            this._pageMode = modes.indexOf(mode);
        },

        resetZoomButtons: function () {
            this._removeElementState(
                this._findElement('plus'),
                'disabled'
            );
            this._removeElementState(
                this._findElement('minus'),
                'disabled'
            );
        },
        disableZoomIn: function () {
            this._setElementState(
                this._findElement('plus'),
                'disabled'
            );
        },
        disableZoomOut: function () {
            this._setElementState(
                this._findElement('minus'),
                'disabled'
            );
        },

        resetArrows: function () {
            this._removeElementState(
                this.arrowLeft,
                'disabled'
            );
            this._removeElementState(
                this.arrowRight,
                'disabled'
            );
        },
        disableArrowNext: function () {
            this._setElementState(
                this.arrowRight,
                'disabled'
            );
        },
        disableArrowPrev: function () {
            this._setElementState(
                this.arrowLeft,
                'disabled'
            );
        },

        /**
         * Показывает блок с контролами контролы
         */
        show: function () {
            this._removeState('hidden');
        },
        /**
         * Показывает блок с контролами контролы
         */
        hide: function () {
            this._setState('hidden');
        }
    }, {
        getBlockName: function () {
            return 'controls';
        }
    });

    provide(Controls);
});

modules.define(
    'spin',
    [
        'y-block',
        'inherit'
    ],
    function (
        provide,
        YBlock,
        inherit
    ) {

    var Spin = inherit(YBlock, {
        __constructor: function () {
            this.__base.apply(this, arguments);
        },
        /**
         * Останаваливает анимацию спиннера
         */
        stop: function () {
            this._removeState('progressed');
        },

        /**
         * Запускает анимацию спиннера
         */
        start: function () {
            this._setState('progressed');
        }

    }, {
        getBlockName: function () {
            return 'spin';
        }
    });

    provide(Spin);
});

modules.require(['jquery', 'y-block'], function ($, YBlock) {
    $(function () {
        YBlock.initDomTree(window.document).done();
    });
});

/* global XSLTProcessor, TweenLite, Power2, alert */

modules.define(
    'chitalka-fb2',
    [
        'chitalka',
        'jquery',
        'inherit',
        'y-extend',
        'y-debounce',
        'unzip',
        'chitalka-fb2-parser',
        'storage',
        'y-next-tick'
    ],
    function (
        provide,
        Chitalka,
        $,
        inherit,
        extend,
        debounce,
        zip,
        parser,
        Storage,
        nextTick
    ) {

    var win = $(window);

    var FONT_SIZE_STEP = 2;
    var TEXT_NODE = 3;

    var ChitalkaFb2 = inherit(Chitalka, {
        __constructor: function () {
            this.__base.apply(this, arguments);

            this._bookPlaceholder = this._findElement('bookholder');
            this._title = this._findElement('title');
			

			if (bookurl=location.href.split('?')[1]) {

				const myRequest = new Request(bookurl);	
				fetch(myRequest)
					.then ((response) => {
					if (!response.ok)
						{
						throw new Error(`HTTP error! Status: ${response.status}`);
						}
					return response.blob();
					})
					.then ((response) => {
					    

						var reader = new FileReader();
						
						reader.onload = (function(struct){
					    
					    return function(e){
						        struct._prepareBook(e.target.result);
							    };
							})(this); 

						reader.readAsDataURL(response);




					});
		
				}

			//else this._prepareBook();

        },

        _render: function (book) {
            this._bookPlaceholder.html(book);
        },

        _setup: function () {
            this._bookPlaceholder.scrollLeft(0);
            this._setTitle();
            this._afterDomAppending();
        },

        _setTitle: function () {
            // Ищем ноду с заголовком книги
            var titleNode = this._find(this._xml, 'title');

            if (!titleNode) {
                return;
            }

            // Ищем все параграфы в ноде, кастуем к массиву
            var titleParagraphs = [].slice.call(titleNode.querySelectorAll('p'));

            if (titleParagraphs.length === 0) {
                return;
            }

            // Вытягиваем тексты параграфов и конкатенируем
            var bookTitle = titleParagraphs.map(function (p) {
                return p.textContent;
            });

            var bookTitleHTML = bookTitle.join('&nbsp;&ndash;&nbsp;');
            var bookTitleAttr = bookTitle.join(' - ');

            this._title
                .attr('title', bookTitleAttr)
                .html(bookTitleHTML);
        },

        /**
         * Задаёт режим отображения сноски и триггерит событие change
         * @public
         *
         * @param {String} mode тип отображения сносок
         *                 'inline' – внутри текста
         *                 'appendix' – в конце
         */
        setFootnotesMode: function (mode) {
            this._setFootnotesMode(mode);
            this._settings.save('footnotes', mode);
            this._onBookChange();
        },

        /**
         * Задаёт режим количества отображаемых страниц
         * @public
         *
         * @param {String} mode тип режима:
         *                 – auto автоматический
         *                 – one всегда одна страница на листе
         *                 – two всегда две страницы на листt
         */
        setPageViewMode: function (mode) {
            this._setPageViewMode(mode);
            this._settings.save('pages', mode);
            this._onBookChange();
        },

        /**
         * Задаёт режим отображения сноски
         * @private
         *
         * @param {String} mode тип отображения сносок
         *                 'inline' – внутри текста
         *                 'appendix' – в конце
         */
        _setFootnotesMode: function (mode) {
            if (mode === 'inline') {
                this._footnotesMode = mode;
                this._setState('footnotes', 'inline');
            } else {
                this._footnotesMode = 'appendix';
                this._removeState('footnotes');
            }
        },

        /**
         * Задаёт режим количества отображаемых страниц
         * @private
         *
         * параметры см public метод
         */
        _setPageViewMode: function (mode) {
            if (mode === 'one' || mode === 'two') {
                this._setState('pages', mode);
            } else {
                this._removeState('pages');
            }
        },

        /**
         * Возвращает значение параметра «режим отображения сносок»
         *
         * @returns {String}
         */
        getFootnotesMode: function () {
            return this._footnotesMode;
        },

        /**
         * Возвращает значение параметра «режим отображения страниц»
         *
         * @returns {String}
         */
        getPageViewMode: function () {
            return this._getState('pages');
        },

        /**
         * Действия, которые необходимо проивести, когда книга физически
         * появится в DOM-дереве
         */
        _afterDomAppending: function () {
            this._book = this._findElement('book');
            /**
             * FIXME: https://st.yandex-team.ru/CHITALKA-84
             * Не до конца работают флексы, надо поискать более лаконичное решение,
             * нежели задавать контейнеру картинки размеры
             */
            this._images = this.getDomNode().find('.image');
            this._bookDOM = this._book[0];

            if (this._settings.get('font-size')) {
                this._setFontSize(this._settings.get('font-size'));
            } else {
                this._fontSize = parseInt(this._bookPlaceholder.css('font-size'), 10);
                this._settings.save('font-size', this._fontSize);
            }
            this._annotations = this.getDomNode().find('.annotation');

            this._subscribeToWindowEvents();
            this._subscribeToLinksEvents();

            this._setFootnotesMode(this._settings.get('footnotes') || this._getState('footnotes') || 'appendix');

            this._setPageViewMode(this._settings.get('pages') || this._getState('pages') || 'auto');

            this._storage = new Storage(this.getBookId());

            // В FF есть бага, что нельзя сразу после вставки в DOM начинать работать с ним
            // возможны пропуски элементов и их значений, поэтому работу с размерами DOM
            // откладываем до следующего tick'а, когда браузер закончит вставлять данные
            // связанный баг https://st.yandex-team.ru/CHITALKA-65
            nextTick(function () {
                this._buildCFIs();
                this._countSymbols();
                this._calcDimensions();

                this._restoreSavedPosition();

                this.emit('ready');
            }.bind(this));
        },

        /**
         * Строит CSS-селектор для выбора ноды по CFI
         *
         * @param {String} cfi
         * @return {String}
         */
        _buildSelectorByCfi: function (cfi) {
            return '[data-4cfi="' + cfi + '"]';
        },

        _storePagePosition: debounce(function () {
            this._storage.save({
                page: this._currentPage,
                '4cfi': this._getKeeper().getAttribute('data-4cfi')
            });
        }, 500),

        /**
         * Восстановление позиции последнего чтения книги
         */
        _restoreSavedPosition: function () {
            var storagePage;

            // Восстанавливаем страницу из инфы о местоположении (старая нотация)
            if (this._storage.get('page')) {
                storagePage = this._storage.get('page');
            }

            // Или из data-4cfi
            if (this._storage.get('4cfi')) {
                var selector = this._buildSelectorByCfi(this._storage.get('4cfi'));

                if ($(selector).length > 0) {
                    storagePage = this._whatPageIsDOMElem($(selector));
                } else {
                    this._storage.remove('cfi');
                }
            }

            // Если есть что восстанавилвать, то идем туда
            if (storagePage) {
                this._currentPage = storagePage;
                this._updateScrollPosition({
                    noAnimation: true,
                    dontChangeFirstElement: true
                });
            } else {
                this._currentPage = 0;
            }
        },

        /**
         * Математика внутри читалки - считаем отступы, ширины колонок, колоичество страниц
         */
        _calcDimensions: function () {
            // Ширина разрыва между колонками
            this._gapWidth = parseInt(this._book.css('column-gap'), 10);

            // Магия, т.к в вебките есть баг columnt-count: 1 – контент вытягивается в высоту
            // из-за этого приходится создавать вторую фейковую колонку (для применения свойства)
            // и компенисировать фейк математикой, что и происходит

            // Количество колонок
            // Если gapWidth === 0, то значит одна колонка и включается режим удвоения ширины и количества колонок
            // возвращаем количество в исходную позицию, если же ширина gapWidth > 0, то ничего не делаем.
            this._gaps = parseInt(this._book.css('column-count'), 10);

            // По сколько страниц пролистывать
            this._listBy = this._gapWidth === 40 ? 1 : 2;

            // Ширина книжного холста
            // Если колонка одна (gapWidth === 0), то book.width() вернет значение для 200% width, делим пополам

            // Приоритетнее для определения ширины использовать getComputedStyle, т.к он не округляет ширину
            if (window.getComputedStyle) {
                this._bookCanvasWidth = parseFloat(window.getComputedStyle(this._book[0]).width);
            } else {
                this._bookCanvasWidth = this._book.width();
            }
            this._bookCanvasWidth /= this._gapWidth ? 1 : 2;
            this._bookCanvasHeight = this._book.height();

            //this._updateMaxMins();

            // Ширина страницы книги
            // FIXME: Нужно будет переделать и ограничить ширину по количеству символов
            //        task https://st.yandex-team.ru/EBOOKS-106
            this._pageWidth = (this._bookCanvasWidth - this._gapWidth) / this._gaps;

            // Ширина шага для скролла страницы
            this._pageStepWidth = this._pageWidth + this._gapWidth;

            // Суммарное количество страниц в книге
            this._pageCount = this._getBookPages();

            // Среднее число символов на странице, speedCoeff - эмпирически вычисленный коэффцицент
            this._avgSymbolsOnPage = Math.round(this._totalBookSymbols / this._pageCount)
        },

        /**
         * События, которые надо произвести когда книга изменилась
         */
        _onBookChange: function () {
            var oldPageCount = this._pageCount;
            this._calcDimensions();
            this._updateScrollPosition({
                noAnimation: true,
                dontChangeFirstElement: true
            });

            if (oldPageCount !== this._pageCount) {
                this._currentPage = this._whatPageIsDOMElem(this._firstElementOnPage);

                this._updateScrollPosition({
                    noAnimation: true,
                    dontChangeFirstElement: true
                });
            }
            /**
             * FIXME: https://st.yandex-team.ru/CHITALKA-84
             */
            this._images.css('max-height', this._bookPlaceholder.height() + 'px');
        },

        // ------------------------------------------------------------
        // Секция событий

        /**
         * Подписываем на события окна
         */
        _subscribeToWindowEvents: function () {
            win.resize(this._onBookChange.bind(this));
        },

        /**
         * Подписка на события ссылок внутри страницы
         */
        _subscribeToLinksEvents: function () {
            this.getDomNode().on('click', 'a', function (e) {
                var link = $(e.currentTarget);
                var href = link.attr('href');

                if (/^#/.test(href)) {
                    if (this._footnotesMode === 'appendix') {
                        this._moveToAnnotation(href.replace('#', ''));
                    }
                    return false;
                } else {
                    link.attr('target', '_blank');
                }
            }.bind(this));
        },

        _unsubscribeFromLinksEvents: function () {
            this.getDomNode().off('click', 'a');
        },

        /**
         * Функция выполняет перелистывание книги до аннотации
         *
         * @param {String} annotationId значение параметра name аннотации
         */
        _moveToAnnotation: function (annotationId) {
            // Ищем аннотацию среди ей подобных
            var annotation = $.grep(this._annotations, function (annotation) {
                return $(annotation).find('a[name="' + annotationId + '"]').length > 0;
            });

            if (!annotation) {
                return;
            }

            // Сохраняем место вызова аннотации
            this._backPage = this._currentPage;

            // Ищем на какой странице находится сноска
            this._currentPage = this._annotationPage = this._whatPageIsDOMElem(annotation);

            // И идём к ней
            this._updateScrollPosition();
        },

        /**
         * Keeper - элемент, видимость которого мы будем сохранять при уменьшении масштаба/режима отображение страницы
         * Функции находит этот элемент относительно текущей страницы
         *
         * @param {String} [page] для какой страницы вернуть keeper'а
         * @returns {DOMElem} keeper
         */
        _getKeeper: function (page) {
            var elementsToPages = this._getElementsToPages(
                    this._listBy,
                    this._fontSize,
                    this._bookCanvasHeight,
                    this.getFootnotesMode()
                );
            var currentPage = page || this._currentPage;
            var lookup = elementsToPages[currentPage];

            // Элемент есть в массиве текущих страниц
            if (lookup && lookup.length) {
                return lookup[0];
            }

            // Ищем в предыдущих страницах последний элемент, такое может быть, например,
            // когда есть длинный абзац в несколько страниц, тогда на текущей странице
            // не будет указателя на элемент
            do {
                lookup = elementsToPages[currentPage--];
                if (lookup && lookup.length) {
                    return lookup[lookup.length - 1];
                }
            } while (currentPage >= 0);

            // Если всё равно не нашли, то берём первую страницу
            return elementsToPages[0][0];
        },

        /**
         * Получаем объект с соответствиями элементов DOM страницам книги
         *
         * @param {Number} gaps количество колонок
         * @param {Number} fontSize размер шрифта
         * @param {Number} height высота холста
         *
         * @returns {Object}
         */
        _getElementsToPages: function (gaps, fontSize, height, footnotesMode) {
            this._elementsToPages = this._elementsToPages || {};

            if (!this._elementsToPages[gaps]) {
                this._elementsToPages[gaps] = {};
            }

            if (!this._elementsToPages[gaps][fontSize]) {
                this._elementsToPages[gaps][fontSize] = {};
            }

            if (!this._elementsToPages[gaps][fontSize][height]) {
                this._elementsToPages[gaps][fontSize][height] = {};
            }

            if (!this._elementsToPages[gaps][fontSize][height][footnotesMode]) {
                this._buildElementsToPages(gaps, fontSize, height, footnotesMode);
            }

            return this._elementsToPages[gaps][fontSize][height][footnotesMode];
        },

        /**
         * Строит объект с соответствиями элементов DOM страницам книги,
         * для заданных gaps и fontSize.
         *
         * @param {Number} gaps количество колонок
         * @param {Number} fontSize размер шрифта
         * @param {Number} height высота холста
         */
        _buildElementsToPages: function (gaps, fontSize, height, footnotesMode) {
            var result = {};
            var allElementsInBook = this._bookPlaceholder.find('*');

            allElementsInBook.map(function (i, el) {
                var page = this._whatPageIsDOMElem(el);

                if (!result[page]) {
                    result[page] = [];
                }
                result[page].push(el);
            }.bind(this));

            this._elementsToPages[gaps][fontSize][height][footnotesMode] = result;
        },

        /**
         * Строить и навешивает на все элементы (в том числе текстовые)
         * data-аттрибут data-4cfi, содержащий универсальный идентификатор каждого элемента
         *
         * @param {DOM} parent нода внутри которой будет происходить строительство cfi
         * @param {String} id айдишник текущей ноды, нужен для конструирования следующего id
         */
        _buildCFIs: function (parent, id) {
            parent = parent || this._bookPlaceholder;
            var counter = 1;
            id = id || '/';

            $(parent).contents().map(function (i, el) {
                var genID = id + counter;

                if (el.nodeType === TEXT_NODE) {
                    // оборачиваем только если не пустая нода и не единственная
                    if ($.trim(el.textContent) !== '' && $(parent).length > 1) {
                        var wrap = $('<span></span>');
                        wrap.attr('data-4cfi', genID);
                        $(el).wrap(wrap);
                        counter++;
                    }
                } else {
                    $(el).attr('data-4cfi', genID);

                    this._buildCFIs(el, genID + '/');

                    counter++;
                }
            }.bind(this));
        },

        /**
         * Вычисляет число символов в книге
         */
        _countSymbols: function () {
            this._totalBookSymbols = $.trim(this._bookPlaceholder.get(0).textContent).replace(/\s{2,}/g, ' ').length;
        },

        /**
         * Измеряет скорость чтения книги
         */
        _measureReadingTime: function () {
            var currentTime = Number(new Date());

            if (this._previousPaging) {
                var readBy = (currentTime - this._previousPaging) / 60000;

                var speed = Math.floor(this._avgSymbolsOnPage * this._listBy / readBy);
                this._storeSpeed(speed);

                this._checkSpeed();
            }

            this._previousPaging = currentTime;
        },

        /**
         * Выполнить перелистывание книги на страницу где аннотация была вызвана
         */
        moveBackFromAnnotation: function () {
            this._currentPage = this._backPage;
            this.resetBackPage();
            this._updateScrollPosition();
        },

        /**
         * Сбрасывает счётчик возврата
         */
        resetBackPage: function () {
            this._backPage = null;
        },

        /**
         * Функция вычисляет страницу, на которой находится переданный элемент
         *
         * @param {DOMElem} domElem элемент, который ищем
         * @returns {Number} номер страницы, на которой находится левый край элемента
         */
        _whatPageIsDOMElem: function (domElem) {
            if (!domElem) {
                return;
            }

            var $domElem = $(domElem);

            // Элементы, которые не видимы или имеют position отличный
            // от static возвращают неверные координаты, включаем их
            // в boolean флаг preconditions
            var preconditions = $domElem.is(':visible') &&
                ['fixed', 'absolute'].indexOf($domElem.css('position')) === -1 &&
                // Мега костыль, т.к image__wrapper внутри содержить position: absolute элемент,
                // то это сносит крышу счетоводу
                !$domElem.is('.image__wrapper');

            var pageDelta = Number($domElem.position().left) / (this._pageWidth + this._gapWidth);

            // И если текущий элемент именно такой, то возвращаем 0
            return preconditions ?
                Math.floor((this._currentPage || 0) + pageDelta)
                : 0;
        },

        // ------------------------------------------------------------
        // Секция выполнения действия с читалкой

        nextPage: function () {
            if (!this.isLastPage()) {
                this._measureReadingTime();

                this._currentPage += this._listBy;
                this._updateScrollPosition({
                    isNextPage: true
                });
            }
        },

        previousPage: function () {
            if (!this.isFirstPage()) {
                // Меняем поведение: при переходе к сноскам нет смысла листать назад,
                // поэтому клик влево – переход обратно
                if (this._currentPage === this._annotationPage && this._backPage) {
                    this.moveBackFromAnnotation();
                } else {
                    this._currentPage -= this._listBy;
                    this._updateScrollPosition();
                }
            }
        },

        firstPage: function () {
            this._currentPage = 0;

            this._updateScrollPosition();
        },
        lastPage: function () {
            this._currentPage = this._pageCount - this._listBy;

            this._updateScrollPosition();
        },
        zoomIn: function () {
            this._updateFontSize(this._fontSize + FONT_SIZE_STEP);
        },
        zoomOut: function () {
            this._updateFontSize(this._fontSize - FONT_SIZE_STEP);
        },
        zoomReset: function () {
            this._resetFontSize();
        },

        /**
         * Хак для картинок, т.к max-height, max-width для них не работает
         * Хак для элементов section, у которых та же история
         */
        _updateMaxMins: function () {
            var h = this._bookCanvasHeight;
            var w = this._bookCanvasWidth;

            if (this._oldHeight !== h) {
                this.elem('image').map(function (i, elem) {
                    var $elem = $(elem);
                    $elem.find('img').css({
                        'max-width': w + 'px',
                        'max-height': h + 'px'
                    });

                    $elem.toggleClass('image-small', $elem.height() < h);
                });

                this.elem('section').css({
                    'min-height': h + 'px'
                });

                this._oldHeight = h;
            }
        },

        /**
         * Возвращает предыдущую страницу
         *
         * @returns {Number}
         */
        getBackPage: function () {
            return this._backPage && (this._backPage + 1) || null;

        },

        /**
         * Возвращает текущую страницу
         *
         * @returns {Number}
         */
        getCurrentPage: function () {
            return this._currentPage + 1;
        },

        /**
         * Возвращает общее количество страниц в книге
         *
         * @returns {Number}
         */
        getTotalPages: function () {
            return this._pageCount;
        },

        /**
         * Возвращает уникальный идентификатор книги
         * @return {String} id
         */
        getBookId: function () {
            this._isbn = this._isbn ||
                this._find(this._xml, 'isbn') ||
                this._find(this._xml, 'id') ||
                this._find(this._xml, 'title') ||
                '';

            return this._isbn.textContent;
        },

        getEstimatedTime: function () {
            // пока закомменчено но может понадобиться
            //var symbolsInBook = this._book.attr('data-symbols');
            var estimated = this.getTotalPages() * this._avgSymbolsOnPage -
                this.getCurrentPage() * this._avgSymbolsOnPage;
            var estimatedMins = Math.floor(estimated / this.getSpeed());

            //      hours                     minutes
            return [Math.floor(estimatedMins / 60), estimatedMins % 60];
        },

        /**
         * Изменение страницы
         * Функция в том числе включет пересчет важных параметров и физическое изменение скролла до нужной страницы
         * @param {Boolean} [params.noAnimation] – изменить страницу без анимации (по-умолчанию анимация будет)
         * @param {Boolean} [params.dontChangeFirstElement] - не пересчитывать первый элемент на странице
         * @param {Boolean} [params.isNextPage] - вызван метод ля следующей страницы
         */
        _updateScrollPosition: function (params) {
            var noAnimation = params && params.noAnimation;
            var dontChangeFirstElement = params && params.dontChangeFirstElement;

            if (this.isLastPage()) {
                this._currentPage = this._pageCount - this._listBy;
            }
            if (this.isFirstPage()) {
                this._currentPage = 0;
            }

            var newLeftPosition = this._pageStepWidth * this._currentPage;

            if (noAnimation || typeof TweenLite === 'undefined') {
                this._bookPlaceholder.scrollLeft(newLeftPosition);

                // Сбрасываем первый элемент
                if (!dontChangeFirstElement) {
                    this._firstElementOnPage = this._getKeeper();
                }
            } else {
                TweenLite.to(this._bookPlaceholder, 0.25, {
                    scrollTo: {
                        x: newLeftPosition
                    },
                    ease: Power2.easeOut,
                    onComplete: function () {
                        //  Сбрасываем первый элемент
                        if (!dontChangeFirstElement) {
                            this._firstElementOnPage = this._getKeeper();
                        }
                    }.bind(this)
                });
            }

            if (!params || !params.isNextPage) {
                this._previousPaging = null;
            }

            this.emit('page-changed');

            this._storePagePosition();

        },

        /**
         * Изменение размера шрифта
         */
        _onChangeFontSize: function () {
            // Пересчитываем параметры страницы
            this._calcDimensions();

            // Подстраиваем левые границы для текущей страницы --
            // размеры листа могут поменяться, если в данном браузере работает единица ch
            this._updateScrollPosition({
                noAnimation: true,
                dontChangeFirstElement: true
            });

            // После изменения размеров ищем где теперь находится элемент, который был первым ранее
            this._currentPage = this._whatPageIsDOMElem(this._firstElementOnPage, true);

            // Меняем страницу без анимации на ту, где виден элемент
            this._updateScrollPosition({
                noAnimation: true,
                dontChangeFirstElement: true
            });
        },

        /**
         * Установка значения fontSize
         *
         * @param {Number} fontSize новое значение fontSize
         */
        _setFontSize: function (fontSize) {
            this._fontSize = fontSize;

            // Меняем физически размеры шрифта
            this._bookPlaceholder.css('font-size', this._fontSize + 'px');
        },
        /**
         * Обновить значение размера шрифта
         * @param {Number} newFontSize разница между текущим шрифтом и новым
         */
        _updateFontSize: function (newFontSize) {
            if (this._fontSizeLimits[0] <= newFontSize && this._fontSizeLimits[1] >= newFontSize) {
                this.emit('reset-zoom-buttons');
                this._settings.save('font-size', newFontSize);

                this._setFontSize(newFontSize);
                this._onChangeFontSize();
            }

            if (this._fontSizeLimits[1] <= newFontSize) {
                this.emit('disabled-zoom-in');
            }

            if (this._fontSizeLimits[0] >= newFontSize) {
                this.emit('disabled-zoom-out');
            }
        },

        /**
         * Сбросить значение размера шрифта до первоначального
         */
        _resetFontSize: function () {
            this._fontSize = this._defaultFontSize;

            this._onChangeFontSize();
        },

        /**
         * Функция возращает true, если мы на первой странице или меньше (возможно при ресайзе)
         *
         * @returns {Boolean}
         */
        isFirstPage: function () {
            return this._currentPage <= 0;
        },

        /**
         * Функция возращает true, если мы на последней странице или больше (возможно при ресайзе)
         *
         * @returns {Boolean}
         */
        isLastPage: function () {
            return this._currentPage >= this._pageCount - this._listBy;
        },

        /**
         * Функция подсчета количества страниц в книге
         * формула: ширина книги + ширина распорки между страницами (т.к на n страниц – n-1 распорка)
         *          поделённая на ширину страницы книги + ширину распорки.
         *
         * @return {Number} количество страниц в книге
         */
        _getBookPages: function () {
            var bookDOMWidth = this._bookDOM.scrollWidth;

            return Math.floor((bookDOMWidth + this._gapWidth) /
                    (Math.floor(this._pageWidth) + this._gapWidth));
        },

        /////////////////////////////////////////////////////////////////////
        _flush: function () {
            this._currentPage = null;
            this._isbn = null;
            this._elementsToPages = {};

            // Важно отписаться от прошлых событий, иначе возможны двойные срабатывания
            this._unsubscribeFromLinksEvents();
        },

        _prepareBook: function (file) {
            this._flush();

            var pathToBook = file || this._getOptions().url;

            return parser.readFile(pathToBook, file ? true : false)
                .then(parser.getXml)
                .then(this._convertToHtml.bind(this))
                .then(this._render.bind(this))
                .then(this._setup.bind(this))
                .done(this._onBookChange.bind(this))
                .fail(this._fail.bind(this));
        },

        _fail: function (e) {
            alert('Ошибка: ' + e);
            this.emit('load-fail');
        },

        /**
         * Находит ноду selector в переданном xml (для ускорения написания)
         *
         * @param {XMLTree} xml
         * @param {String} selector
         *
         * @returns {Node} возвращает найденный в xml узел, соответствующий selector
         */
        _find: function (xml, selector) {
            return xml.querySelector(selector);
        },

        _convertToHtml: function (xml) {
            this._xml = xml;

            if (this._xsl) {
                var d = $.Deferred();
                d.resolve(this._xsltTransform(xml, this._xsl));

                return d.promise();
            }

            return $.ajax({
                dataType: 'xml',
                url: 'lib/reader.xsl'
            }).then(function (xsl) {
                return this._xsltTransform(xml, xsl);
            }.bind(this));
        },

        _xsltTransform: function (xml, xsl) {
            this._xsl = xsl;

            var html;
            // code for IE
            if (window.ActiveXObject) {
                html = xml.transformNode(xsl);
                // code for Chrome, Firefox, Opera, etc.
            } else if (document.implementation && document.implementation.createDocument) {
                var xsltProcessor = new XSLTProcessor();
                xsltProcessor.importStylesheet(xsl);
                html = xsltProcessor.transformToFragment(xml, document);
            }

            return html;
        },

        /**
         * @private
         * Функция проверки на то доступен ли данный формат книг для чтения в данном окружении
         *
         * @param {String} format строчное название формата
         * @returns {Boolean}
         */
        _isAvailable: function () {
            // Нет технологий
            if (!this._hasTechnologies(
                'Blob',
                'FileReader',
                'ArrayBuffer',
                'Uint8Array',
                'XSLTProcessor',
                'DataView')) {
                return false;
            }

            // Opera 12 падает по RangeError
            if (window.opera && parseInt(window.opera.version(), 10) <= 12) {
                return false;
            }

            return true;
        },

        /**
         * @private
         * Проверка на доступность технологии в данном окружении
         * каждый аргумент – это технология, наличие которой проверяется в окружении
         * @returns {Boolean}
         */
        _hasTechnologies: function () {
            return [].map.call(arguments, function (tech) {
                // Без window не сработает в IE
                return typeof window[tech] !== 'undefined';
            }).indexOf(false) === -1;
        }
    }, {
        getBlockName: function () {
            return 'chitalka-fb2';
        }
    });

    provide(ChitalkaFb2);
});

modules.define(
    'chitalka-ui',
    [
        'controls',
        'y-block',
        'jquery',
        'y-extend',
        'spin',
        'file-drag',
        'inherit'
    ],
    function (
        provide,
        Controls,
        YBlock,
        $,
        extend,
        Spin,
        FileDrag,
        inherit
    ) {

    var ChitalkaUI = inherit(YBlock, {
        __constructor: function () {
            this.__base.apply(this, arguments);

            //var params = extend({
                //menu: false,
                //progress: false
            //}, this._getOptions());
        },

        init: function (chitalka) {
            this._chitalka = chitalka;

            this._bindTo(this._chitalka, 'ready', this._onBookLoaded.bind(this));

            if (this._getOptions().controls) {
                this._initControls();
            }

            if (this._getOptions().progress) {
                this._initProgress();
            }

            if (this._getOptions()['progress-bar']) {
                this._initProgressBar();
            }

            if (this._getOptions().annotations) {
                this._initAnnotationsControl();
            }

            this._initEstimated();

            this._initDragListeners();

            return this;
        },

        _initControls: function () {
            this._controls = Controls.find(this.getDomNode());

            if (this._getOptions().controls.arrows) {
                this._initArrows();
            }

            this._bindTo(this._chitalka, 'ready', function () {
                if (this._getOptions().controls.zoom) {
                    this._controls.setFootnotesMode(this._chitalka.getFootnotesMode());
                    this._controls.setPageViewMode(this._chitalka.getPageViewMode());
                    this._initMenu();
                }
            }.bind(this));
        },

        _initArrows: function () {
            this._bindTo(this._controls, 'next-page', function () {
                this._chitalka.nextPage();
            });
            this._bindTo(this._controls, 'previous-page', function () {
                this._chitalka.previousPage();
            });

            this._bindTo(this._chitalka, 'page-changed', function () {
                 this._updateArrows();
            });
        },

        _initMenu: function () {
            this._bindTo(this._controls, 'zoom-in', function () {
                this._chitalka.zoomIn();
            });
            this._bindTo(this._controls, 'zoom-out', function () {
                this._chitalka.zoomOut();
            });

            this._bindTo(this._controls, 'footnotes-appendix', function () {
                this._chitalka.setFootnotesMode('appendix');
            });
            this._bindTo(this._controls, 'footnotes-inline', function () {
                this._chitalka.setFootnotesMode('inline');
            });

            this._bindTo(this._controls, 'pages-one', function () {
                this._chitalka.setPageViewMode('one');
                this._setState('mode', 'one-page');
            });
            this._bindTo(this._controls, 'pages-two', function () {
                this._chitalka.setPageViewMode('two');
                this._setState('mode', 'two-page');
            });
            this._bindTo(this._controls, 'pages-auto', function () {
                this._chitalka.setPageViewMode();
                this._removeState('mode');
            });

            this._bindTo(this._chitalka, 'disabled-zoom-in', function () {
                this._controls.disableZoomIn();
            });
            this._bindTo(this._chitalka, 'disabled-zoom-out', function () {
                this._controls.disableZoomOut();
            });
            this._bindTo(this._chitalka, 'reset-zoom-buttons', function () {
                this._controls.resetZoomButtons();
            });

            this._bindTo(this._chitalka, 'load-fail', function () {
                this._noBook();
                this._fileLoaded = false;
            }.bind(this));
        },

        /**
         * Переводит ui в состояние «нет книги
         */
        _noBook: function () {
            this._setState('no-book');
            Spin.find(this._findElement('loader')).stop();
        },

        /**
         * Активировать слушатели drag-событий
         */
        _initDragListeners: function () {
            this._drag = new FileDrag(this.getDomNode());

            this._bindTo(this._drag, 'show-drag', this._showDrag.bind(this));
            this._bindTo(this._drag, 'hide-drag', this._hideDrag.bind(this));
            this._bindTo(this._drag, 'file-dropped', this._onFileDropped.bind(this));
            this._bindTo(this._drag, 'file-loaded', this._onFileLoaded.bind(this));
        },

        /**
         * Активировать состояние drag
         */
        _showDrag: function () {
            this._setState('drag');
            this._removeState('no-book');
            this._controls.hide();
        },

        /**
         * Убрать состояние drag
         */
        _hideDrag: function () {
            if (this._fileLoaded) {
                this._removeState('drag');
                this._controls.show();
            }
        },

        /**
         * Действия по киданию файла внутрь интерфейса
         */
        _onFileDropped: function () {
            this._fileLoaded = true;
            this.loading();
        },

        /**
         * Действия по загрузке файла
         * @param {Event} e
         */
        _onFileLoaded: function (e) {
            this._chitalka._prepareBook(e.data).then(function () {
                this._removeState('drag');
                this._controls.show();
            }.bind(this));
        },

        /**
         * Вернуть UI в состояние «загрузка»
         */
        loading: function () {
            // Остановить кручения спиннера
            Spin.find(this._findElement('loader')).start();

            // Убирает стейт загрузки с текущего элемента
            this._setState('loading');

            // Показываем блок с контролами
            this._controls.hide();

        },

        /**
         * Действия после загрузки книги
         * @private
         */
        _onBookLoaded: function () {
            this._fileLoaded = true;

            // Остановить кручения спиннера
            Spin.find(this._findElement('loader')).stop();

            // Убирает стейт загрузки с текущего элемента
            this._removeState('loading');

            // Показываем блок с контролами
            this._controls.show();

        },

        /**
         * Если текущая страница первая/последняя,
         * то левая/правая(соответственно) стралка дизейблится.
         * @private
         */
        _updateArrows: function () {
            this._controls.resetArrows();

            if (this._chitalka.isFirstPage()) {
                this._controls.disableArrowPrev();
            }

            if (this._chitalka.isLastPage()) {
                this._controls.disableArrowNext();
            }
        },

        /**
         * Инициализация элемента, который отображает
         * номер текущей страницы из общего количества страниц
         * @private
         */
        _initProgress: function () {
            this._progress = this._findElement('progress');

            this._bindTo(this._chitalka, 'page-changed', this._updateProgress.bind(this));
            this._bindTo(this._chitalka, 'ready', this._updateProgress.bind(this));
        },

        /**
         * Инициализация элемента, который отображает
         * номер текущей страницы из общего количества страниц
         * @private
         */
        _initEstimated: function () {
            this._estimated = this._findElement('estimated');

            this._bindTo(this._chitalka, 'page-changed', this._updateEstimated.bind(this));
            this._bindTo(this._chitalka, 'ready', this._updateEstimated.bind(this));
        },

        _updateEstimated: function () {
            var estimatedTime = this._chitalka.getEstimatedTime();
            var estimatedPhrase = 'До конца книги ' +
                (estimatedTime[0] ? estimatedTime[0] + ' ч ' : '') +
                estimatedTime[1] + ' м';
            this._estimated.html(estimatedPhrase);
        },

        /**
         * Обновляет состояние элемента прогресса
         */
        _updateProgress: function () {
            this._progress.html(this._chitalka.getCurrentPage() + ' из ' + this._chitalka.getTotalPages());
        },

        /**
         * Инициализация прогресс-бара
         * @private
         */
        _initProgressBar: function () {
            this._progressBar = this._findElement('progress-bar');

            this._bindTo(this._chitalka, 'page-changed', function () {
                var progress = this._getCurrentProgress() + '%';

                this._progressBar.width(progress);
                this._progressBar.attr('title', progress);
            });
        },

        /**
         * Инициализация элемента работы с аннотациями
         * @private
         */
        _initAnnotationsControl: function () {
            this._backTo = this._findElement('back-to-page');
            var counter = 0;

            this._bindTo(this._chitalka, 'page-changed', function () {
                var prevPage = this._chitalka.getBackPage();

                // Когда нет prevPage значит его сбросили и надо убрать «возвращатор»
                if (!prevPage || counter === 1) {
                    this._setBackTo();
                    this._chitalka.resetBackPage();
                    counter = 0;
                } else if (counter) {
                    counter--;
                } else if (prevPage) {
                    this._setBackTo('Вернуться на страницу ' + prevPage);

                    // Сколько страниц даём пролистнуть
                    counter = 3;
                } else {
                    this._setBackTo();
                }
            });

            this._bindTo(this._backTo, 'click', function () {
                this._setBackTo();
                this._chitalka.moveBackFromAnnotation();
                counter = 0;
            });
        },

        _setBackTo: function (text) {
            if (text) {
                this._setElementState(this._backTo, 'visible');
                this._backTo.html(text);
            } else {
                this._removeElementState(this._backTo, 'visible');
            }
        },

        /**
         * Возвращает процент прочтения
         * @returns {number}
         * @private
         */
        _getCurrentProgress: function () {
            return ((this._chitalka.getCurrentPage() / this._chitalka.getTotalPages()) * 100).toFixed(2);
        }

    }, {
        getBlockName: function () {
            return 'chitalka-ui';
        }
    });

    provide(ChitalkaUI);
});

modules.define('bt', ["y-i18n"], function(provide, i18n) {
var BT = (function() {

/**
 * Счетчик используемый для генерации уникальных id в методе generateId.
 * @type {Number}
 */
var lastGenId = 0;

/**
 * BT: BtJson -> HTML процессор.
 * @constructor
 */
function BT() {
    /**
     * Используется для идентификации матчеров.
     * Каждому матчеру дается уникальный id для того, чтобы избежать повторного применения
     * матчера к одному и тому же узлу BtJson-дерева.
     * @type {Number}
     * @private
     */
    this._lastMatchId = 0;
    /**
     * Плоский массив для хранения матчеров.
     * Каждый элемент — массив с двумя элементами: [{String} выражение, {Function} матчер}]
     * @type {Array}
     * @private
     */
    this._matchers = {};
    /**
     * Отображения по умолчанию для блоков.
     * @type {Object}
     * @private
     */
    this._defaultViews = {};
    /**
     * Флаг, включающий автоматическую систему поиска зацикливаний. Следует использовать в development-режиме,
     * чтобы определять причины зацикливания.
     * @type {Boolean}
     * @private
     */
    this._infiniteLoopDetection = false;

    /**
     * Неймспейс для библиотек. Сюда можно писать различный функционал для дальнейшего использования в матчерах.
     * ```javascript
     * bt.lib.objects = bt.lib.objects || {};
     * bt.lib.objects.inverse = bt.lib.objects.inverse || function(obj) { ... };
     * ```
     * @type {Object}
     */
    this.lib = {};
    /**
     * Опции BT. Задаются через setOptions.
     * @type {Object}
     */
    this._options = {};
    this.utils = {

        _side: (typeof window === 'undefined') ? 's' : 'c',

        bt: this,

        /**
         * Возвращает позицию элемента в рамках родителя.
         * Отсчет производится с 1 (единицы).
         *
         * ```javascript
         * bt.match('list__item', function(ctx) {
         *     if (ctx.position() === 2) {
         *         ctx.setState('is-second');
         *     }
         * });
         * ```
         * @returns {Number}
         */
        getPosition: function () {
            var node = this.node;
            return node.index === '_content' ? 1 : node.index + 1;
        },

        /**
         * Возвращает true, если текущий bemjson-элемент первый в рамках родительского bemjson-элемента.
         *
         * ```javascript
         * bt.match('list__item', function(ctx) {
         *     if (ctx.isFirst()) {
         *         ctx.setState('is-first');
         *     }
         * });
         * ```
         * @returns {Boolean}
         */
        isFirst: function () {
            var node = this.node;
            return node.index === '_content' || node.index === 0;
        },

        /**
         * Возвращает true, если текущий bemjson-элемент последний в рамках родительского bemjson-элемента.
         *
         * ```javascript
         * bt.match('list__item', function(ctx) {
         *     if (ctx.isLast()) {
         *         ctx.setState('is-last');
         *     }
         * });
         * ```
         * @returns {Boolean}
         */
        isLast: function () {
            var node = this.node;
            return node.index === '_content' || node.index === node.arr.length - 1;
        },

        // --- HTML ---

        /**
         * Устанавливает тег.
         *
         * @param tagName
         * @returns {String|undefined}
         */
        setTag: function (tagName) {
            this.ctx._tag = tagName;
            return this;
        },

        /**
         * Возвращает тег.
         *
         * @returns {Ctx}
         */
        getTag: function () {
            return this.ctx._tag;
        },

        /**
         * Устанавливает значение атрибута.
         *
         * @param {Object|String} attrs Хэш c аттрибутами или имя аттрибута.
         * @param {String} [attrValue]
         */
        setAttr: function (attrs, attrValue) {
            if (!this.ctx._attrs) {
                this.ctx._attrs = {};
            }
            if (typeof attrs === 'string') {
                this.ctx._attrs[attrs] = attrValue;
            } else {
                for (var key in attrs) {
                    this.ctx._attrs[key] = attrs[key];
                }
            }
            return this;
        },

        /**
         * Возвращает значение атрибута.
         *
         * @param {String} attrName
         * @returns {Ctx}
         */
        getAttr: function (attrName) {
            return this.ctx._attrs ? this.ctx._attrs[attrName] : undefined;
        },

        /**
         * Отключает генерацию атрибута `class`.
         *
         * @returns {Ctx}
         */
        disableCssClassGeneration: function () {
            this.ctx._disableCssGeneration = true;
            return this;
        },

        /**
         * Включает генерацию атрибута `class`. По умолчанию — включено.
         *
         * @returns {Ctx}
         */
        enableCssClassGeneration: function () {
            this.ctx._disableCssGeneration = false;
            return this;
        },

        /**
         * Возвращает `true` если генерация атрибута `class` включена.
         *
         * @returns {Boolean}
         */
        isCssClassGenerationEnabled: function () {
            return !Boolean(this.ctx._disableCssGeneration);
        },

        /**
         * Отключает генерацию дополнительных data-атрибутов.
         *
         * @returns {Ctx}
         */
        disableDataAttrGeneration: function () {
            this.ctx._disableDataAttrGeneration = true;
            return this;
        },

        /**
         * Включает генерацию дополнительных data-атрибутов.
         *
         * @returns {Ctx}
         */
        enableDataAttrGeneration: function () {
            this.ctx._disableDataAttrGeneration = false;
            return this;
        },

        /**
         * Возвращает `true` если генерация дополнительных data-атрибутов включена.
         *
         * @returns {Boolean}
         */
        isDataAttrGenerationEnabled: function () {
            return !Boolean(this.ctx._disableDataAttrGeneration);
        },

        // --- BEViS ---

        /**
         * Возвращает состояние по его имени.
         *
         * @param {String} stateName
         * @returns {String|Boolean|undefined}
         */
        getState: function (stateName) {
            return this.ctx._state ? this.ctx._state[stateName] : undefined;
        },

        /**
         * Устанавливает значение состояния.
         *
         * @param {String} stateName
         * @param {String|Boolean|null} stateValue
         * @returns {Ctx}
         */
        setState: function (stateName, stateValue) {
            (this.ctx._state || (this.ctx._state = {}))[stateName] =
                arguments.length === 1 ? true : stateValue;
            return this;
        },

        /**
         * Возвращает значение параметра (btjson).
         *
         * @param {String} paramName
         * @returns {*|undefined}
         */
        getParam: function (paramName) {
            return this.ctx[paramName];
        },

        /**
         * Возвращает значение view.
         *
         * @returns {String|undefined}
         */
        getView: function () {
            return this.ctx.view;
        },

        /**
         * Возвращает имя блока.
         *
         * @returns {String}
         */
        getBlockName: function () {
            return this.ctx.block;
        },

        /**
         * Возвращает имя элемента, если матчинг происходит на элемент.
         *
         * @returns {String|undefined}
         */
        getElementName: function () {
            return this.ctx.elem;
        },

        /**
         * Устанавливает содержимое.
         *
         * @param {BtJson} content
         * @returns {Ctx}
         */
        setContent: function (content) {
            this.ctx._content = content;
            return this;
        },

        /**
         * Возвращает содержимое.
         *
         * @returns {BtJson|undefined}
         */
        getContent: function () {
            return this.ctx._content;
        },

        /**
         * Возвращает набор миксинов, либо `undefined`.
         *
         * @returns {BtJson[]|undefined}
         */
        getMixins: function () {
            return this.ctx.mixins;
        },

        /**
         * Добавляет миксин.
         *
         * @param {BtJson} mixin
         * @returns {Ctx}
         */
        addMixin: function (mixin) {
            (this.ctx.mixins || (this.ctx.mixins = [])).push(mixin);
            return this;
        },

        /**
         * Включает автоматическую инициализацию.
         *
         * @returns {Ctx}
         */
        enableAutoInit: function () {
            if (this.ctx.autoInit !== false) {
                this.ctx.autoInit = true;
            }
            return this;
        },

        /**
         * Возвращает `true`, если для данного элемента включена автоматическая инициализация.
         *
         * @returns {Boolean}
         */
        isAutoInitEnabled: function () {
            return Boolean(this.ctx.autoInit);
        },

        /**
         * Устанавливает опцию, которая передается в JS-блок при инициализации.
         *
         * @param {String} optName
         * @param {*} optValue
         * @returns {Ctx}
         */
        setInitOption: function (optName, optValue) {
            (this.ctx._initOptions || (this.ctx._initOptions = {}))[optName] = optValue;
            return this;
        },

        /**
         * Возвращает значение опции, которая передается в JS-блок при инициализации.
         *
         * @param {String} optName
         * @returns {*}
         */
        getInitOption: function (optName) {
            return this.ctx._initOptions ? this.ctx._initOptions[optName] : undefined;
        },

        /**
         * Возвращает уникальный идентификатор. Может использоваться, например,
         * чтобы задать соответствие между `label` и `input`.
         * @returns {String}
         */
        generateId: function () {
            return 'uniq' + this._side + (lastGenId++);
        },

        /**
         * Останавливает выполнение прочих матчеров для данного bemjson-элемента.
         *
         * Пример:
         * ```javascript
         * bt.match('button', function(ctx) {
         *     ctx.setTag('button');
         * });
         * bt.match('button', function(ctx) {
         *     ctx.setTag('span');
         *     ctx.stop();
         * });
         * ```
         * @returns {Ctx}
         */
        stop: function () {
            this.ctx._stop = true;
            return this;
        },

        /**
         * Выполняет преобразования данного bemjson-элемента остальными матчерами.
         * Может понадобиться, например, чтобы добавить элемент в самый конец содержимого,
         * если в базовых шаблонах в конец содержимого добавляются другие элементы.
         *
         * Предоставляет минимальный функционал доопределения в рамках библиотеки.
         *
         * @returns {Ctx}
         */
        applyTemplates: function () {
            var prevCtx = this.ctx,
                prevNode = this.node;
            var res = this.bt.processBtJson(this.ctx, this.ctx.block, true);
            if (res !== prevCtx) {
                this.newCtx = res;
            }
            this.ctx = prevCtx;
            this.node = prevNode;
            return this;
        },

        /**
         * Возвращает текущий фрагмент BtJson-дерева.
         * Может использоваться в связке с `return` для враппинга и подобных целей.
         * ```javascript
         *
         * bt.match('input', function(ctx) {
         *     return {
         *         elem: 'wrapper',
         *         content: ctx.getJson()
         *     };
         * });
         * ```
         * @returns {Object|Array}
         */
        getJson: function () {
            return this.newCtx || this.ctx;
        },

        /**
         * Экранирует HTML.
         *
         * @param {String} val
         * @return {String}
         */
        escapeHtml: escapeHtml
    };
}

BT.prototype = {
    /**
     * Включает/выключает механизм определения зацикливаний.
     *
     * @param {Boolean} enable
     * @returns {BT}
     */
    enableInfiniteLoopDetection: function(enable) {
        this._infiniteLoopDetection = enable;
        return this;
    },

    /**
     * Преобразует BtJson в HTML-код.
     * @param {Object|Array|String} btJson
     */
    apply: function (btJson) {
        return this.toHtml(this.processBtJson(btJson));
    },

    /**
     * Объявляет матчер.
     *
     * ```javascript
     * bt.match('b-page', function(ctx) {
     *     ctx.addMixin({ block: 'i-ua' });
     *     ctx.setAttr('class', 'i-ua_js_no i-ua_css_standard');
     * });
     * bt.match('block_mod_modVal', function(ctx) {
     *     ctx.setTag('span');
     * });
     * bt.match('block__elem', function(ctx) {
     *     ctx.setAttr('disabled', 'disabled');
     * });
     * bt.match('block__elem_elemMod_elemModVal', function(ctx) {
     *     ctx.setState('is-active');
     * });
     * bt.match('block_blockMod_blockModVal__elem', function(ctx) {
     *     ctx.setContent({
     *         elem: 'wrapper',
     *         content: ctx.getJson()
     *     };
     * });
     * ```
     * @param {String|Array} expr
     * @param {Function} matcher
     * @returns {Ctx}
     */
    match: function (expr, matcher) {
        matcher.__id = '__func' + (this._lastMatchId++);
        if (Array.isArray(expr)) {
            for (var i = 0, l = expr.length; i < l; i++) {
                (this._matchers[expr[i]] || (this._matchers[expr[i]] = [])).unshift(matcher);
            }
        } else {
            (this._matchers[expr] || (this._matchers[expr] = [])).unshift(matcher);
        }
        return this;
    },

    /**
     * Устанавливает отображение по умолчанию для блока.
     *
     * @param {String} blockName
     * @param {String} viewName
     * @returns {BT}
     */
    setDefaultView: function (blockName, viewName) {
        this._defaultViews[blockName] = viewName;
        return this;
    },

    /**
     * Раскрывает BtJson, превращая его из краткого в полный.
     * @param {Object|Array} btJson
     * @param {String} [blockName]
     * @param {Boolean} [ignoreContent]
     * @returns {Object|Array}
     */
    processBtJson: function (btJson, blockName, ignoreContent) {
        var resultArr = [btJson];
        var nodes = [{ json: btJson, arr: resultArr, index: 0, blockName: blockName }];
        var node, json, block, blockView, i, l, p, child, subRes;
        var matchers = this._matchers;
        var processContent = !ignoreContent;
        var infiniteLoopDetection = this._infiniteLoopDetection;

        /**
         * Враппер для json-узла.
         * @constructor
         */
        function Ctx() {
            this.ctx = null;
            this.newCtx = null;
        }
        Ctx.prototype = this.utils;
        var ctx = new Ctx();
        while (node = nodes.shift()) {
            json = node.json;
            block = node.blockName;
            blockView = node.blockView;
            if (Array.isArray(json)) {
                for (i = 0, l = json.length; i < l; i++) {
                    child = json[i];
                    if (child !== false && child != null && typeof child === 'object') {
                        nodes.push({ json: child, arr: json, index: i, blockName: block, blockView: blockView });
                    }
                }
            } else {
                var content, stopProcess = false;
                if (json.elem) {
                    if (json.block && json.block !== block) {
                        block = json.block;
                        blockView = json.view = json.view || this._defaultViews[block];
                    } else {
                        block = json.block = json.block || block;
                        blockView = json.view = json.view || blockView || this._defaultViews[block];
                    }
                } else if (json.block) {
                    block = json.block;
                    blockView = json.view = json.view || this._defaultViews[block];
                }

                if (json.block) {

                    if (infiniteLoopDetection) {
                        json.__processCounter = (json.__processCounter || 0) + 1;
                        if (json.__processCounter > 100) {
                            throw new Error(
                                'Infinite loop detected at "' + json.block + (json.elem ? '__' + json.elem : '') + '".'
                            );
                        }
                    }

                    subRes = null;

                    if (!json._stop) {
                        ctx.node = node;
                        ctx.ctx = json;
                        var selectorPostfix = json.elem ? '__' + json.elem : '';

                        var matcherList = matchers[json.block + (json.view ? '_' + json.view : '') + selectorPostfix];
                        if (!matcherList && json.view) {
                            matcherList = matchers[json.block + '_' + json.view.split('-')[0] + '*' + selectorPostfix];
                        }
                        if (!matcherList) {
                            matcherList = matchers[json.block + '*' + selectorPostfix];
                        }

                        if (matcherList) {
                            for (i = 0, l = matcherList.length; i < l; i++) {
                                var matcher = matcherList[i], mid = matcher.__id;
                                if (!json[mid]) {
                                    json[mid] = true;
                                    subRes = matcher(ctx);
                                    if (subRes != null) {
                                        json = subRes;
                                        node.json = json;
                                        node.blockName = block;
                                        node.blockView = blockView;
                                        nodes.push(node);
                                        stopProcess = true;
                                        break;
                                    }
                                    if (json._stop) {
                                        break;
                                    }
                                }
                            }
                        }
                    }

                }

                if (!stopProcess) {
                    if (Array.isArray(json)) {
                        node.json = json;
                        node.blockName = block;
                        node.blockView = blockView;
                        nodes.push(node);
                    } else {
                        if (processContent && ((content = json._content) != null)) {
                            if (Array.isArray(content)) {
                                var flatten;
                                do {
                                    flatten = false;
                                    for (i = 0, l = content.length; i < l; i++) {
                                        if (Array.isArray(content[i])) {
                                            flatten = true;
                                            break;
                                        }
                                    }
                                    if (flatten) {
                                        json._content = content = content.concat.apply([], content);
                                    }
                                } while (flatten);
                                for (i = 0, l = content.length, p = l - 1; i < l; i++) {
                                    child = content[i];
                                    if (child !== false && child != null && typeof child === 'object') {
                                        nodes.push({
                                            json: child, arr: content, index: i, blockName: block, blockView: blockView
                                        });
                                    }
                                }
                            } else {
                                nodes.push({
                                    json: content, arr: json, index: '_content', blockName: block, blockView: blockView
                                });
                            }
                        }
                    }
                }
            }
            node.arr[node.index] = json;
        }
        return resultArr[0];
    },

    /**
     * Превращает раскрытый BtJson в HTML.
     * @param {Object|Array|String} json
     * @returns {String}
     */
    toHtml: function (json) {
        var res, i, l, item;
        if (json === false || json == null) return '';
        if (typeof json !== 'object') {
            return escapeHtml(json);
        } else if (Array.isArray(json)) {
            res = '';
            for (i = 0, l = json.length; i < l; i++) {
                item = json[i];
                if (item !== false && item != null) {
                    res += this.toHtml(item);
                }
            }
            return res;
        } else {
            if (json.block) {
                var jattr,
                    attrs = json._disableDataAttrGeneration || json.elem || !json.block ?
                        '' :
                        ' data-block="' + json.block + '"', initOptions;

                if (jattr = json._attrs) {
                    for (i in jattr) {
                        var attrVal = jattr[i];
                        if (attrVal === true) {
                            attrs += ' ' + i;
                        } else if (attrVal != null) {
                            attrs += ' ' + i + '="' + escapeAttr(jattr[i]) + '"';
                        }
                    }
                }

                if (json._initOptions) {
                    (initOptions = {}).options = json._initOptions;
                }

                var mixins = json.mixins;
                if (mixins && mixins.length) {
                    (initOptions || (initOptions = {})).mixins = mixins;
                }

                if (initOptions) {
                    attrs += ' data-options="' + escapeAttr(JSON.stringify(initOptions)) + '"';
                }

                var content, tag = (json._tag || 'div');
                res = '<' + tag;

                if (!json._disableCssGeneration) {
                    res += ' class="';
                    res += (json.block) +
                        (json.view ? '_' + json.view : '') +
                        (json.elem ? '__' + json.elem : '');

                    var state = json._state;
                    if (state) {
                        for (i in state) {
                            var stateVal = state[i];
                            if (stateVal != null && stateVal !== '' && stateVal !== false) {
                                if (stateVal === true) {
                                    res += ' _' + i;
                                } else {
                                    res += ' _' + i + '_' + stateVal;
                                }
                            }
                        }
                    }

                    if (json.autoInit || (mixins && mixins.length > 0)) {
                        res += ' _init';
                    }

                    res += '"';
                }

                res += attrs;

                if (selfCloseHtmlTags[tag]) {
                    res += '/>';
                } else {
                    res += '>';
                    if ((content = json._content) != null) {
                        if (Array.isArray(content)) {
                            for (i = 0, l = content.length; i < l; i++) {
                                item = content[i];
                                if (item !== false && item != null) {
                                    res += this.toHtml(item);
                                }
                            }
                        } else {
                            res += this.toHtml(content);
                        }
                    }
                    res += '</' + tag + '>';
                }
                return res;
            } else if (json.hasOwnProperty('raw')) {
                return json.raw;
            }
        }
    }
};

var selfCloseHtmlTags = {
    area: 1,
    base: 1,
    br: 1,
    col: 1,
    command: 1,
    embed: 1,
    hr: 1,
    img: 1,
    input: 1,
    keygen: 1,
    link: 1,
    meta: 1,
    param: 1,
    source: 1,
    wbr: 1
};

var escapeHtml = function (val) {
    return ('' + val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g,'&#x2F;');
};

var escapeAttr = function (attrVal) {
    attrVal += '';
    if (~attrVal.indexOf('&')) {
        attrVal = attrVal.replace(/&/g, '&amp;');
    }
    if (~attrVal.indexOf('"')) {
        attrVal = attrVal.replace(/"/g, '&quot;');
    }
    return attrVal;
};

return BT;
})();

if (typeof module !== 'undefined') {
    module.exports = BT;
}

var bt = new BT();
bt.lib.i18n = i18n;


    bt.lib.global = bt.lib.global || {};
    bt.lib.global.lang = bt.lib.global.lang || 'ru';
    bt.lib.global.tld = bt.lib.global.tld || 'ru';
    bt.lib.global['content-region'] = bt.lib.global['content-region'] || 'ru';
    bt.lib.global['click-host'] = bt.lib.global['click-host'] || '//clck.yandex.ru';
    bt.lib.global['passport-host'] = bt.lib.global['passport-host'] || 'https://passport.yandex.ru';
    bt.lib.global['pass-host'] = bt.lib.global['pass-host'] || '//pass.yandex.ru';
    bt.lib.global['social-host'] = bt.lib.global['social-host'] || '//social.yandex.ru';
    bt.lib.global['export-host'] = bt.lib.global['export-host'] || '//export.yandex.ru';

    /**
     * Changes top level domain.
     *
     * @param {String} tld Top level domain.
     */
    bt.lib.global.setTld = function (tld) {
        var xYaDomain = tld === 'tr' ? 'yandex.com.tr' : 'yandex.' + tld;
        var yaDomain = ['ua', 'by', 'kz'].indexOf(tld) !== -1 ? 'yandex.ru' : xYaDomain;
        var globalObj = bt.lib.global;
        globalObj['content-region'] = tld;
        globalObj['click-host'] = '//clck.' + yaDomain;
        globalObj['passport-host'] = 'https://passport.' + yaDomain;
        globalObj['pass-host'] = '//pass.' + xYaDomain;
        globalObj['social-host'] = '//social.' + xYaDomain;
        globalObj['export-host'] = '//export.' + xYaDomain;
        globalObj.tld = tld;
    };

    /**
     * @returns {String}
     */
    bt.lib.global.getTld = function () {
        return bt.lib.global.tld;
    };

    if (bt.lib.i18n && bt.lib.i18n.getLanguage) {
        var tld = bt.lib.i18n.getLanguage();
        if (tld === 'uk') {
            tld = 'ua';
        }
        bt.lib.global.setTld(tld);
    }




    bt.match('y-ua', function (ctx) {
        ctx.setTag('script');
        ctx.disableCssClassGeneration();
        ctx.disableDataAttrGeneration();
        ctx.setContent([
            ';(function (d,e,c,r){' +
                'e=d.documentElement;' +
                'c="className";' +
                'r="replace";' +
                'e[c]=e[c][r]("y-ua_js_no","y-ua_js_yes");' +
                'if(d.compatMode!="CSS1Compat")' +
                'e[c]=e[c][r]("y-ua_css_standart","y-ua_css_quirks")' +
            '})(document);' +
            ';(function (d,e,c,r,n,w,v,f){' +
                'e=d.documentElement;' +
                'c="className";' +
                'r="replace";' +
                'n="createElementNS";' +
                'f="firstChild";' +
                'w="http://www.w3.org/2000/svg";' +
                'e[c]+=!!d[n]&&!!d[n](w,"svg").createSVGRect?" y-ua_svg_yes":" y-ua_svg_no";' +
                'v=d.createElement("div");' +
                'v.innerHTML="<svg/>";' +
                'e[c]+=(v[f]&&v[f].namespaceURI)==w?" y-ua_inlinesvg_yes":" y-ua_inlinesvg_no";' +
            '})(document);'
        ]);
    });



    bt.setDefaultView('controls', 'default');

    bt.match('controls*', function (ctx) {
        var content = [];
        ctx.enableAutoInit();

        var arrows = ctx.getParam('arrows') || false;
        var zoom = ctx.getParam('zoom') || false;
        var footnotes = ctx.getParam('footnotes') || false;
        var pages = ctx.getParam('pages') || false;

        ctx.setInitOption('zoom', zoom);
        ctx.setInitOption('footnotes', footnotes);
        ctx.setInitOption('pages', pages);
        ctx.setState('hidden');

        if (arrows) {
            ctx.setInitOption('arrows', arrows);

            content.push([
                {
                    elem: 'arrow-left',
                    disabled: true
                },
                {
                    elem: 'arrow-right'
                }
            ]);
        }

        if (zoom || footnotes || pages) {

            content.push({
                elem: 'menu',
                zoom: zoom,
                footnotes: footnotes,
                pages: pages
            });
        }

        ctx.setContent(content);
    });

    bt.match('controls*__menu', function (ctx) {
        ctx.setState('state', 'closed');

        ctx.setContent([
            {
                elem: 'trigger'
            },
            {
                elem: 'buttons',
                zoom: ctx.getParam('zoom'),
                footnotes: ctx.getParam('footnotes'),
                pages: ctx.getParam('pages')
            }
        ]);
    });

    bt.match(['controls*__arrow-left', 'controls*__arrow-right'], function (ctx) {
        if (ctx.getParam('disabled')) {
            ctx.setState('disabled');
        }
        ctx.setContent({
            elem: 'arrow-inner'
        });
    });

    bt.match('controls*__buttons', function (ctx) {
        var content = [];
        var baseHeight = 42;
        var items = 0;

        if (ctx.getParam('zoom')) {
            items += 2;

            content.push({
                elem: 'plus',
                alt: 'Увеличить размер шрифта'
            }, {
                elem: 'minus',
                alt: 'Уменьшить размер шрифта'
            });
        }
        if (ctx.getParam('footnotes')) {
            items += 1;

            content.push({
                elem: 'footnotes',
                footnotes: ctx.getParam('footnotes')
            });
        }

        if (ctx.getParam('pages')) {
            items += 1;

            content.push({
                elem: 'pages',
                pages: ctx.getParam('pages')
            });
        }

        ctx.setAttr('style', 'height: ' + baseHeight * items + 'px');

        ctx.setContent(content);
    });

    bt.match('controls*__footnotes', function (ctx) {
        ctx.setState('mode', ctx.getParam('footnotes') || 'appendix');
        ctx.setAttr('title', 'Изменить режим отображения сносок');
        ctx.setContent([{
                elem: 'footnotes-anchor'
            }, {
                elem: 'footnotes-footnote'
            }
        ]);
    });
    bt.match('controls*__footnotes-anchor', function (ctx) {
        ctx.setTag('span');
        ctx.setContent('x');
    });
    bt.match('controls*__footnotes-footnote', function (ctx) {
        ctx.setTag('span');
        ctx.setContent('[x]');
    });

    bt.match('controls*__pages', function (ctx) {
        ctx.setState('mode', ctx.getParam('pages') || 'auto');
        ctx.setAttr('title', 'Изменить режим отображения страниц');
        ctx.setContent([{
                elem: 'pages-one'
            }, {
                elem: 'pages-two'
            }
        ]);
    });
    bt.match(['controls*__plus', 'controls*__minus'], function (ctx) {
        ctx.setAttr('title', ctx.getParam('alt'));
    });


   bt.setDefaultView('spin', 'default');

   bt.match('spin_default*', function (ctx) {
      ctx.setState('progressed');
   });



    /**
     * @param {Bemjson} body Содержимое страницы. Следует использовать вместо `content`.
     * @param {String} doctype Доктайп. По умолчанию используется HTML5 doctype.
     * @param {Object[]} styles Набор CSS-файлов для подключения.
     *                          Каждый элемент массива должен содержать ключ `url`, содержащий путь к файлу.
     * @param {Object[]} scripts Набор JS-файлов для подключения.
     *                           Каждый элемент массива должен содержать ключ `url`, содержащий путь к файлу.
     * @param {Bemjson} head Дополнительные элементы для заголовочной части страницы.
     * @param {String} favicon Путь к фавиконке.
     */

    bt.setDefaultView('y-page', 'islet');

    bt.match('y-page_islet*', function (ctx) {
        var styleElements;
        var styles = ctx.getParam('styles');
        if (styles) {
            styleElements = styles.map(function (style) {
                return {
                    elem: 'css',
                    url: style.url,
                    ie: style.ie
                };
            });
        }
        return [
            ctx.getParam('doctype') || '<!DOCTYPE html>',
            {
                elem: 'html',
                content: [
                    {
                        elem: 'head',
                        content: [
                            [
                                {
                                    elem: 'meta',
                                    charset: 'utf-8'
                                },
                                ctx.getParam('x-ua-compatible') === false ?
                                    false :
                                    {
                                        elem: 'meta',
                                        'http-equiv': 'X-UA-Compatible',
                                        content: ctx.getParam('x-ua-compatible') || 'IE=edge'
                                    },
                                {
                                    elem: 'title',
                                    content: ctx.getParam('title')
                                },
                                ctx.getParam('favicon') ?
                                    {
                                        elem: 'favicon',
                                        url: ctx.getParam('favicon')
                                    } :
                                    '',
                                {
                                    block: 'y-ua'
                                }
                            ],
                            styleElements,
                            ctx.getParam('head')
                        ]
                    },
                    ctx.getJson()
                ]
            }
        ];
    });

    bt.match('y-page_islet*', function (ctx) {
        ctx.setTag('body');
        ctx.enableAutoInit();
        var scriptElements;
        var scripts = ctx.getParam('scripts');
        if (scripts) {
            var global = bt.lib.global;
            scriptElements = scripts.map(function (script) {
                return {
                    elem: 'js',
                    url: script.url ? script.url.replace('{lang}', global.lang) : undefined,
                    source: script.source
                };
            });
        }
        ctx.setContent([ctx.getParam('body'), scriptElements]);
    });

    bt.match('y-page_islet*__title', function (ctx) {
        ctx.disableCssClassGeneration();
        ctx.setTag('title');
        ctx.setContent(ctx.getParam('content'));
    });

    bt.match('y-page_islet*__html', function (ctx) {
        ctx.setTag('html');
        ctx.disableCssClassGeneration();
        ctx.setAttr('class', 'y-ua_js_no y-ua_css_standard');
        ctx.setContent(ctx.getParam('content'));
    });

    bt.match('y-page_islet*__head', function (ctx) {
        ctx.setTag('head');
        ctx.disableCssClassGeneration();
        ctx.setContent(ctx.getParam('content'));
    });

    bt.match('y-page_islet*__meta', function (ctx) {
        ctx.setTag('meta');
        ctx.disableCssClassGeneration();
        ctx.setAttr('content', ctx.getParam('content'));
        ctx.setAttr('http-equiv', ctx.getParam('http-equiv'));
        ctx.setAttr('charset', ctx.getParam('charset'));
    });

    bt.match('y-page_islet*__favicon', function (ctx) {
        ctx.disableCssClassGeneration();
        ctx.setTag('link');
        ctx.setAttr('rel', 'shortcut icon');
        ctx.setAttr('href', ctx.getParam('url'));
    });

    bt.match('y-page_islet*__js', function (ctx) {
        ctx.disableCssClassGeneration();
        ctx.setTag('script');
        var url = ctx.getParam('url');
        if (url) {
            ctx.setAttr('src', url);
        }
        var source = ctx.getParam('source');
        if (source) {
            ctx.setContent(source);
        }
        ctx.setAttr('type', 'text/javascript');
    });

    bt.match('y-page_islet*__css', function (ctx) {
        ctx.disableCssClassGeneration();
        var url = ctx.getParam('url');

        if (url) {
            ctx.setTag('link');
            ctx.setAttr('rel', 'stylesheet');
            ctx.setAttr('href', url);
        } else {
            ctx.setTag('style');
        }

        var ie = ctx.getParam('ie');
        if (ie !== undefined) {
            if (ie === true) {
                return ['<!--[if IE]>', ctx.getJson(), '<![endif]-->'];
            } else if (ie === false) {
                return ['<!--[if !IE]> -->', ctx.getJson(), '<!-- <![endif]-->'];
            } else {
                return ['<!--[if ' + ie + ']>', ctx.getJson(), '<![endif]-->'];
            }
        }
    });



    bt.setDefaultView('chitalka-fb2', 'default');

    bt.match('chitalka-fb2*', function (ctx) {
        ctx.setInitOption('keyboard', true);
        ctx.setInitOption('touch', true);
        ctx.setInitOption('url', ctx.getParam('url'));
        ctx.enableAutoInit();

        var footnotes = ctx.getParam('footnotes') || false;
        if (footnotes) {
            ctx.setState('footnotes', footnotes);
        }

        var pages = ctx.getParam('pages') || false;
        if (pages) {
            ctx.setState('pages', pages);
        }

        var content = [
        {
            elem: 'title'
        },
        {
            elem: 'bookholder'
        }];
        if (ctx.getParam('ui')) {
            ctx.setInitOption('ui', true);

            content.push({
                elem: 'ui',
                content: ctx.getParam('ui')
            });
        }

        ctx.setContent(content);
    });

    bt.match('chitalka-fb2*__ui', function (ctx) {
        ctx.setContent(ctx.getParam('content'));
    });


    bt.match('chitalka-ui', function (ctx) {
        ctx.enableAutoInit();

        var content = [];

        if (ctx.getParam('controls')) {
            var controls = ctx.getParam('controls');
            ctx.setInitOption('controls', controls);

            if (ctx.getParam('book')) {
                if (ctx.getParam('book').footnotes) {
                    controls.footnotes = ctx.getParam('book').footnotes;
                }

                if (ctx.getParam('book').pages) {
                    controls.pages = ctx.getParam('book').pages;
                }
            }

            controls.block = 'controls';
            content.push({
                elem: 'controls',
                /*
                 Передается объект вида(по умолчанию)
                 {
                     block: controls,
                     zoom: true,
                     arrows: true
                 }
                 */
                content: controls
            });
        }

        content.push({
            elem: 'book',
            content: ctx.getParam('book')
        });

        if (ctx.getParam('progress')) {
            ctx.setInitOption('progress', true);

            content.push({
                elem: 'progress'
            });
        }

        if (ctx.getParam('progress_bar')) {
            ctx.setInitOption('progress-bar', true);

            content.push({
                elem: 'progress-bar'
            });
        }

        if (ctx.getParam('annotations')) {
            ctx.setInitOption('annotations', true);

            content.push({
                elem: 'back-to-page'
            });
        }

        content.push({
            elem: 'estimated'
        });

        ctx.setState('loading');
        content.push({
            elem: 'loader'
        });

        ctx.setContent(content);
    });

    bt.match('chitalka-ui*__loader', function (ctx) {
        ctx.setContent({
            block: 'spin',
            view: 'default-large'
        });
    });

    bt.match([
        'chitalka-ui*__controls',
        'chitalka-ui*__book'
    ], function (ctx) {
        ctx.setContent(ctx.getParam('content'));
    });

provide(bt);
});
(function(){
function initKeyset(i18n) {
if (!i18n || typeof i18n !== "function") {
i18n = (function () {

function createI18nInstance() {
    /**
     * @param {String} keysetName
     * @param {String} keyName
     * @param {Object} [options]
     */
    var i18n = function (keysetName, keyName, options) {
        var keyset = i18n._keysets[keysetName];
        if (!keyset) {
            throw new Error('Keyset "' + keysetName + '" was not found.');
        }
        var value = keyset[keyName];
        if (value === undefined) {
            throw new Error('Key "' + keyName + '" in keyset "' + keysetName + '" was not found.');
        }
        if (typeof value === 'function') {
            return value(options || {});
        } else {
            return value;
        }
    };

    /**
     * @type {Object}
     */
    i18n._keysets = {};

    /**
     * @type {String}
     */
    i18n._language = 'ru';

    /**
     * @param {String} keysetName
     * @param {Object} keysetData
     */
    i18n.add = function (keysetName, keysetData) {
        i18n._keysets[keysetName] = keysetData;
        return i18n;
    };

    /**
     * @param {String} language
     */
    i18n.setLanguage = function (language) {
        this._language = language;
        return this;
    };

    /**
     * @returns {String}
     */
    i18n.getLanguage = function () {
        return this._language;
    };

    i18n.utils = {
        /**
         * @typedef {Object} YI18NPluralParams
         * @property {Number} count
         * @property {String} one
         * @property {String} some
         * @property {String} many
         */

        /**
         * @param {YI18NPluralParams} params
         * @returns {String}
         */
        plural: function (params) {
            var count = params.count;
            var one = params.one;
            var some = params.some;
            var many = params.many;
            if (many === undefined) {
                many = some;
            } else if (some === undefined) {
                some = many;
            }
            var lastDigit = count % 10;
            var tens = count % 100;

            if (lastDigit === 1 && tens !== 11) {
                return one;
            }

            return lastDigit > 1 && lastDigit < 5 && (tens < 10 || tens > 20) ? some : many;
        },

        /**
         * @typedef {Object} YI18NIncludeParams
         * @property {String} keyset
         * @property {String} key
         */

        /**
         * @param {YI18NIncludeParams} params
         * @returns {String}
         */
        include: function (params) {
            var subParams = {};
            for (var i in params) {
                if (params.hasOwnProperty(i) && i !== 'key' && i !== 'keyset') {
                    subParams[i] = params[i];
                }
            }
            return i18n(params.keyset, params.key, subParams);
        }
    };

    return i18n;
}

return createI18nInstance();

})();

}



i18n.setLanguage('ru');
return i18n;
}
if (typeof modules !== 'undefined') {
    modules.define('y-i18n', function (provide, i18n) {
        provide(initKeyset(i18n));
    });
} else if (typeof module !== 'undefined') {
    module.exports = function() {return initKeyset();};
} else if (typeof window !== 'undefined') {
    window.i18n = initKeyset();
} else {
    i18n = initKeyset();
}
})();

(function () {
var Modernizr = window.Modernizr;
try { delete window.Modernizr; } catch (e) {}
modules.define('modernizr', function (provide) { provide(Modernizr); });
})();