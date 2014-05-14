define([
	'goo/math/Matrix3x3'
],
/** @lends */
function (
	Matrix3x3
) {
	'use strict';

	var attach = function (event) {
		event = (event.touches && event.touches.length === 1) ? event.touches[0] : event;

		this.states.dx = 0;
		this.states.dy = 0;
		this.states.x = event.pageX;
		this.states.y = event.pageY;

		this.bindings.update = update.bind(this);
		this.bindings.remove = remove.bind(this);

		document.addEventListener('mousemove', this.bindings.update, false);
		document.addEventListener('touchmove', this.bindings.update, false);
		document.addEventListener('mouseup', this.bindings.remove, false);
		document.addEventListener('touchend', this.bindings.remove, false);
	};

	var update = function (event) {
		event = (event.touches && event.touches.length === 1) ? event.touches[0] : event;

		this.states.dirty = true;
		this.states.dx += event.pageX - this.states.x;
		this.states.dy += event.pageY - this.states.y;
		this.states.x = event.pageX;
		this.states.y = event.pageY;
	};

	var remove = function () {
		document.removeEventListener('mousemove', this.bindings.update);
		document.removeEventListener('touchmove', this.bindings.update);
		document.removeEventListener('mouseup', this.bindings.remove);
		document.removeEventListener('touchend', this.bindings.remove);
	};

	/**
	 * @class Script for controlling the rotation of an entity.
	 * @param {Element} element Document element on which to attach the event handlers.
	 */
	function RotationControlScript(properties) {
		properties = properties || {};

		/**
		 * @desc Bound event handlers.
		 * @type {Object}
		 * @default
		 */
		this.bindings = { 'attach' : attach.bind(this), 'update' : null, 'remove' : null };
		this.element = properties.domElement || null;
		this.name = 'RotationControlScript';
		this.states = { 'dirty' : false, 'x' : null, 'y' : null, 'dx' : null, 'dy' : null };

		if(this.element) {
			this.setupMouseControls();
		}
	}
	RotationControlScript.prototype.setupMouseControls = function() {
		this.element.addEventListener('mousedown', this.bindings.attach, false);
		this.element.addEventListener('touchstart', this.bindings.attach, false);
	};

	RotationControlScript.prototype.run = function (entity, tpf, env) {
		if(env) {
			if(!this.element && env.domElement) {
				this.element = env.domElement;
				this.setupMouseControls();
			}
		}
		if (this.states.dirty) {
			var x = Math.PI * this.states.dy / this.element.clientHeight;
			var y = Math.PI * this.states.dx / this.element.clientWidth;
			var cosx = Math.cos(x);
			var sinx = Math.sin(x);
			var cosy = Math.cos(y);
			var siny = Math.sin(y);
			var matrix = new Matrix3x3(cosy, sinx * siny, 0.0 - cosx * siny, 0.0, cosx, sinx, siny, 0.0 - sinx * cosy, cosx * cosy);

			Matrix3x3.combine(matrix, entity.transformComponent.transform.rotation, entity.transformComponent.transform.rotation);
			entity.transformComponent.setUpdated();

			this.states.dirty = false;
			this.states.dx = 0;
			this.states.dy = 0;
		}
	};

	return RotationControlScript;
});