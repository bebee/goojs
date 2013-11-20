define([
	'goo/loaders/handlers/ConfigHandler',
	'goo/logic/LogicNodeTime',
	'goo/logic/LogicNodeSine',
	'goo/logic/LogicNodeDebug',
	'goo/logic/LogicNodeComponent',
	'goo/logic/LogicNodes',
	'goo/util/rsvp',
	'goo/util/PromiseUtil',
	'goo/util/ObjectUtil',
	'goo/logic/LogicNodeRandom',
	'goo/logic/LogicNodeVec3',
	'goo/logic/LogicNodeMultiply',
	'goo/logic/LogicNodeWASD',
	'goo/logic/LogicNodeAdd',
	'goo/logic/LogicNodeFloat'
], function(
	ConfigHandler,
	LogicNodeTime,
	LogicNodeSine,
	LogicNodeDebug,
	LogicNodeComponent,
	LogicNodes,
	RSVP,
	PromiseUtil,
	_
) {
	"use strict";

	function LogicHandler()  {
		ConfigHandler.apply(this, arguments);
		this._objects = {};
	}

	LogicHandler.prototype = Object.create(ConfigHandler.prototype);
	ConfigHandler._registerClass('logicnode', LogicHandler);
	LogicHandler.prototype.constructor = LogicHandler;

	LogicHandler.prototype._prepare = function(config) {
		// there are no defaults for this.
		_.defaults(config, {});
	};

	LogicHandler.prototype._create = function(ref) {
		// it is not known what logic node type it's going to be yet, so can't create it.	
		console.log("LogicHandler:create");
		return {
			is_dummy_of_unknown_type: true
		};
	};

	LogicHandler.prototype.update = function(ref, config) {
		// Special way of just reconfiguring the objects without needing to re-create them.
		var obj = this._objects[ref];
		if (obj === undefined) {
			var fn = LogicNodes.getClass(config.type);
			obj = new fn();
		}

		obj.addToWorldLogic(this.world);
		obj.configure(config);
		
		this._objects[ref] = obj;
		return PromiseUtil.createDummyPromise(obj);
	};

	LogicHandler.prototype.remove = function(ref) {
		delete this._objects[ref];
	};

	function isEqual(a, b) {
		var len = a.length;
		if (len !== b.length) {
			return false;
		}
		while (len--) {
			if (a[len] !== b[len]) {
				return false;
			}
		}
		return true;
	}

	return LogicHandler;
});