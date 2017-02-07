/**
 * @description:  仿门电路消息控制器，灵感来自于《数字电路设计》
 */
define([], function () {

    "use strict";

    var _isArray    = function (obj) {
            return !!obj && Object.prototype.toString.call(obj) === '[object Array]';
        },
        _isFunction = function (obj) {
            return !!obj && (typeof obj === 'function');
        },
        _getKeys    = function (map) {
            var keysArr = [];
            for (var key in map) {
                keysArr.push(key);
            }
            return keysArr;
        },
        _validate   = function (gate, name, notification) {
            return !gate.validate || gate.validate.call(gate.thisObj, name, notification);
        };

    // 门类型
    var GateType = {
        AND: 'and',//与门
        OR: 'or',//或门
        WATERFALL: 'waterfall'//瀑布流门
    };

    // 控制器上下文
    var Context = {};

    // 门控制器
    var Gate = function (options) {
        this.type = options.type;
        this.notificationNames = options.notificationNames;
        this.output = options.output;
        this.thisObj = options.thisObj;
        this.validate = options.validate;
        this.type !== GateType.OR && (this.notifications = {});
        this.type === GateType.WATERFALL && (this.notificationQuery = []);
    };

    var Controller = function () {
        this.notificationMap = {};
    };

    Controller.prototype = {

        /**
         * 控制器创建工厂
         * @param type
         * @param names {Array} 侦听消息名
         * @param output  {Function|Gate} 输出
         * @param thisObj {Object} 作用域
         * @param validate {Function} 检验器
         * @returns {Gate}
         */
        createGate: function (type, names, output, thisObj, validate) {
            var gate = new Gate({
                type: type || GateType.OR,
                notificationNames: names,
                output: output,
                thisObj: thisObj,
                validate: validate
            });
            return gate;
        },

        /**
         * 原始侦听消息
         * @param name {String} 消息名称
         * @param output {Function|Gate} 输出
         * @param thisObj {Object}作用域
         * @param validate {Function}检验器
         * @returns {Gate} 门控制器
         */
        addNotificationListener: function (name, output, thisObj, validate) {
            return this.addOrNotificationListener([name], output, thisObj, validate);
        },

        /**
         * 创建或门控制器，并且自动挂载到总线
         * @param names {Array} 侦听消息名
         * @param output  {Function|Gate} 输出
         * @param thisObj {Object}作用域
         * @param validate {Function}检验器
         * @returns {Gate}
         */
        addOrNotificationListener: function (names, output, thisObj, validate) {
            var gate = this.createGate(GateType.OR, names, output, thisObj, validate);
            return this.addGateToBus(gate);
        },

        /**
         * 创建与门控制器，并且自动挂截载到总线
         * @param names {Array} 侦听消息名
         * @param output {Function|Gate} 输出
         * @param thisObj {Object}作用域
         * @param validate {Function}检验器
         * @returns {Gate} 门控制器
         */
        addAndNotificationListener: function (names, output, thisObj, validate) {
            var gate = this.createGate(GateType.AND, names, output, thisObj, validate);
            return this.addGateToBus(gate);
        },

        /**
         * 创建瀑布流控制器，并且自动挂载到总线
         * @param names {Array} 侦听消息名
         * @param output  {Function|Gate} 输出
         * @param thisObj {Object}作用域
         * @param validate {Function}检验器
         * @returns {Gate} 门控制器
         */
        addWaterfallNotificationListener: function (names, output, thisObj, validate) {
            var gate = this.createGate(GateType.WATERFALL, names, output, thisObj, validate);
            return this.addGateToBus(gate);
        },

        /**
         * 挂载控制器到总线
         * @param gate {Gate} 门控制器
         * @returns {Gate} 门控制器
         */
        addGateToBus: function (gate) {
            gate.notificationNames.forEach(function (name) {
                var gates = this.notificationMap[name] || [];
                if (gates.indexOf(gate) < 0) {
                    gates.push(gate);
                }
                this.notificationMap[name] = gates;
            }, this);
            return gate;
        },

        /**
         * 将控制器从总线上卸载
         * @param gate {Gate} 门控制器
         */
        removeGateFromBus: function (gate) {
            gate && gate.notificationNames.forEach(function (name) {
                var gates = this.notificationMap[name];
                if (!gates || !gates.length) {
                    delete  this.notificationMap[name];
                    return;
                }
                this.notificationMap[name] = gates.filter(function (item) {
                    return item !== gate;
                });
            }, this);
        },

        /**
         * 卸载所特定侦听名下的所有控制器
         * @param name {String} 消息名称
         */
        removeAllGatesByName: function (name) {
            if (_isArray(name)) {
                return name.forEach(function (item) {
                    this.removeAllGatesByName(item);
                }, this);
            }
            delete this.notificationMap[name];
        },

        /**
         * 卸载所有控制器
         */
        removeAllGates: function () {
            this.notificationMap = {};
        },

        /**
         * 卸载控制器的特定消息侦听
         * @param name {String} 消息名称
         * @param gate {Gate}
         */
        removeGate: function (name, gate) {
            if (!name && gate) {
                return this.removeGateFromBus(gate);
            }
            if (name && !gate) {
                return this.removeAllGatesByName(name);
            }
            if (!name && !gate) {
                return this.removeAllGates();
            }
            var gates = this.notificationMap[name];
            if (!gates || !gates.length) {
                delete  this.notificationMap[name];
                return;
            }
            this.notificationMap[name] = gates.filter(function (item) {
                return item !== gate;
            });
        },

        /**
         * 总线上指定消息入口上是否已挂载指定的门
         * @param name {String} 消息名称
         * @param gate {Gate}门引用
         * @returns {boolean}
         */
        hasGate: function (name, gate) {
            var gates = this.getGatesByName(name);
            if (!gates || !gates.length) {
                return false;
            }
            if (gate) {
                return gates.indexOf(gate) !== -1;
            }
            return true;
        },

        /**
         * 根据output查询是否总线上已经挂载了相就的门
         * @param name
         * @param output
         * @returns {*}
         */
        hasGateWithOutput: function (name, output) {
            var gates = this.getGatesByName(name);
            if (!gates || !gates.length) {
                return false;
            }
            return gates.some(function (item) {
                return item.output === output;
            });
        },

        /**
         * 获取总线上指定消息入口上是否已挂载所有门
         * @param name
         * @returns {Array}
         */
        getGatesByName: function (name) {
            return this.notificationMap[name];
        },

        /**
         * 从总线发送消息
         * @param name {String} 消息名称
         * @param notification {Object} 消息数据
         */
        sendNotification: function (name, notification) {
            if (_isArray(name)) {
                return name.forEach(function (item) {
                    this.sendNotification(item, notification);
                }, this);
            }
            var gates = this.notificationMap[name] || [];
            gates.forEach(function (gate) {
                this.sendNotificationToGate(gate, name, notification);
            }, this);
        },

        /**
         * 发送消息给指定控制器
         * @param gate {Gate} 门控制器
         * @param name {String} 消息名称
         * @param notification 消息数据
         */
        sendNotificationToGate: function (gate, name, notification) {
            switch (gate.type) {
                case GateType.AND :
                    this.sendNotificationToAndGate(gate, name, notification);
                    break;
                case GateType.OR:
                    this.sendNotificationToOrGate(gate, name, notification);
                    break;
                case GateType.WATERFALL:
                    this.sendNotificationToWaterfallGate(gate, name, notification);
                    break;
            }
        },

        /**
         * 发送消息给与门控制器
         * @param gate {Gate} 门控制器
         * @param name {String} 消息名称
         * @param notification 消息数据
         */
        sendNotificationToAndGate: function (gate, name, notification) {
            if (gate.notificationNames.indexOf(name) < 0) {
                return;
            }
            gate.notifications[name] = notification;
            var receivedNotificationNames = _getKeys(gate.notifications).sort(),
                flag                      = gate.notificationNames.slice().sort().every(function (item, index) {
                    return receivedNotificationNames[index] === item;
                }, this);

            if (flag && _validate(gate, name, notification)) {
                this._output(gate, name, gate.notifications);
                gate.notifications = {};
            }
        },

        /**
         * 发送消息给或门控制器
         * @param gate {Gate} 门控制器
         * @param name {String} 消息名称
         * @param notification {Object} 消息数据
         */
        sendNotificationToOrGate: function (gate, name, notification) {
            if (gate.notificationNames.indexOf(name) < 0) {
                return;
            }
            if (_validate(gate, name, notification)) {
                this._output(gate, name, notification);
            }
        },

        /**
         * 发送消息给瀑布流控制器
         * @param gate {Gate} 门控制器
         * @param name {String} 消息名称
         * @param notification {Object} 消息数据
         */
        sendNotificationToWaterfallGate: function (gate, name, notification) {
            if (gate.notificationNames.indexOf(name) < 0) {
                return;
            }
            gate.notifications[name] = notification;
            var query = gate.notificationQuery;
            query.push(name);
            while (query.length > gate.notificationNames.length) {
                query.shift();
            }
            var flag = gate.notificationNames.every(function (item, index) {
                return item === query[index];
            });
            if (flag && _validate(gate, name, notification)) {
                this._output(gate, name, gate.notifications);
                gate.notificationQuery = [];
                gate.notifications = {};
            }
        },

        /**
         * 添加消息中继控制器
         * @param inputNotificationName {string} 接收消息名称
         * @param outputNotificationName {string} 经过中继后发送的消息名
         * @param mediator {Function} 中断内部执行 mediator返回true,则中断中继器输出
         * @param thisObj {object}
         * @param validate {function}
         * @returns {*|Gate} 返回控制门
         */
        addNotificationRepeater: function (inputNotificationName, outputNotificationName, mediator, thisObj, validate) {
            return this.addNotificationListener(inputNotificationName, function (name, notification) {
                var interrupted = mediator && mediator.call(thisObj, notification);
                !interrupted && this.sendNotification(outputNotificationName, notification);
            }.bind(this), thisObj, validate);
        },

        /**
         * 创建串行任务
         * @param tasks {Array} 0：执行函数， 1：执行完回调函数
         * @param thisObj {object} 作用域
         * @returns {{run: run, isRunning: isRunning}}
         */
        createSerialTaskQueue: function (tasks, thisObj) {
            var stop = false, _isRunning = false;
            var run = function () {
                if (stop) return;
                var task = tasks.shift();
                _isRunning = !!task;
                if (!task) return;
                task[0].call(thisObj, function () {
                    stop || task[1].call(thisObj) ? (_isRunning = false) : run();
                });
            };
            return {
                run: run,
                isRunning: function () { return _isRunning; },
                stop: function () {stop = true;}
            }
        },

        /**
         * 控制器执行输出
         * @param gate {Gate} 门控制器
         * @param notification {Object} 消息数据
         * @private
         */
        _output: function (gate, name, notification) {
            _isFunction(gate.output)
                ? gate.output.call(gate.thisObj, name, notification)
                : this.sendNotificationToGate(gate.output, name, notification);
        }
    };

    /**
     *
     * @param context 控制器上下文
     * @returns {Controller} 控制器单例实例
     */
    Controller.getInstance = function (context) {
        context = context || 'application';
        return Context[context] || (Context[context] = new this());
    };

    /**
     * 全局根据上下文获取控制器实例(调试用)
     * @param context
     * @returns {Controller}
     */
//    window.getController = Controller.getInstance;

    return Controller;
});
