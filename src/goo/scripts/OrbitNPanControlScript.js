define([
	'goo/scripts/OrbitCamControlScript',
	'goo/renderer/Renderer',
	'goo/math/Vector3',
	'goo/math/MathUtils',
	'goo/entities/SystemBus'
],
/** @lends */
function(
	OrbitCamControlScript,
	Renderer,
	Vector3,
	MathUtils,
	SystemBus
) {
	"use strict";

	var Button = {
		LEFT: 0,
		MIDDLE: 1,
		RIGHT: 2
	};

	// REVIEW: I think a bit of jsDoc would be a great idea and maybe a short introduction what this class does.
	/**
	 * @class Enables camera to orbit around a point in 3D space using the right mouse button, while panning with the middle button.
	 * @extends OrbitCamControlScript
	 * @param {Object} [properties]
	 * @param {Element} [properties.domElement=document] Element to add mouse listeners to
	 * @param {number} [properties.turnSpeedHorizontal=0.005]
	 * @param {number} [properties.turnSpeedVertical=0.005]
	 * @param {number} [properties.zoomSpeed=0.2]
	 * @param {boolean} [properties.dragOnly=true] Only move the camera when dragging
	 * @param {Vector3} [properties.worldUpVector=Vector3(0,1,0)]
	 * @param {number} [properties.minZoomDistance=1]
	 * @param {number} [properties.maxZoomDistance=1000]
	 * @parma {number} [properties.detailZoom=0.15] Multiplies the zoom when using shift+zoom to enable smaller zoom increments.
	 * @param {number} [properties.minAscent=-89.95 * MathUtils.DEG_TO_RAD] Maximum arc (in radians) the camera can reach below the target point
	 * @param {number} [properties.maxAscent=89.95 * MathUtils.DEG_TO_RAD] Maximum arc (in radians) the camera can reach above the target point
	 * @param {boolean} [properties.clampAzimuth=false]
	 * @param {number} [properties.minAzimuth=-90 * MathUtils.DEG_TO_RAD] Maximum arc (in radians) the camera can reach clockwise of the target point
	 * @param {number} [properties.maxAzimuth=270 * MathUtils.DEG_TO_RAD] Maximum arc (in radians) the camera can reach counter-clockwise of the target point
	 * @param {boolean} [properties.invertedX=false]
	 * @param {boolean} [properties.invertedY=false]
	 * @param {boolean} [properties.invertedWheel=true]
	 * @param {Vector3} [properties.lookAtPoint=Vector3(0,0,0)] The point to orbit around.
	 * @param {Vector3} [properties.spherical=Vector3(15,0,0)] The initial position of the camera given in spherical coordinates (r, theta, phi).
	 * Theta is the angle from the x-axis towards the z-axis, and phi is the angle from the xz-plane towards the y-axis. Some examples:
	 * <ul>
	 * <li>View from right: <code>new Vector3(15,0,0); // y is up and z is left</code> </li>
	 * <li>View from front: <code>new Vector3(15, Math.PI/2, 0) // y is up and x is right </code> </li>
	 * <li>View from top: <code>new Vector3(15,Math.PI/2,Math.PI/2) // z is down and x is right</code> </li>
	 * <li>View from top-right corner: <code>new Vector3(15, Math.PI/3, Math.PI/8)</code> </li>
	 * </ul>
	 */
	function OrbitNPanControlScript(properties) {
		properties = properties || {};
		OrbitCamControlScript.call(this, properties);
		this.name = 'OrbitNPanControlScript';
		this.panState = {
			buttonDown: false,
			lastX: NaN,
			lastY: NaN,
			lastPos: new Vector3()
		};
		this.orbitButton = properties.orbitButton !== undefined ? properties.orbitButton : Button.LEFT;
		this.panButton = properties.panButton !== undefined ? properties.panButton : Button.RIGHT;
		this.orbitKey = properties.orbitKey || 'altKey';
		this.panKey = properties.panKey || 'shiftKey';

		this.viewportWidth = 0;
		this.viewportHeight = 0;
		this.shiftKey = false;
		this.altKey = false;
		this.goingToLookAt = new Vector3().setv(this.lookAtPoint);

		//
		this.active = false;
		this.currentCameraEntity = null;
		SystemBus.addListener('goo.setCurrentCamera', function (data) {
			this.currentCameraEntity = data.entity;
		}.bind(this));
	}

	OrbitNPanControlScript.prototype = Object.create(OrbitCamControlScript.prototype);

	// REVIEW: missing JsDoc
	// POST-REVIEW Will soon be replaced by new script
	OrbitNPanControlScript.prototype.updateConfig = function(properties) {
		OrbitCamControlScript.prototype.updateConfig.call(this,properties);
		this.goingToLookAt.setv(this.lookAtPoint);
	};

	// REVIEW: missing JsDoc
	OrbitNPanControlScript.prototype.setupMouseControls = function() {
		var that = this;
		this.domElement.addEventListener('mousedown', function (event) {
			if (!that.active) { return; }

			that.shiftKey = event.shiftKey;
			that.altKey = event.altKey;
			that.metaKey = event.metaKey;
			that.ctrlKey = event.ctrlKey;

			that.updateButtonState(event.button, true, event);
		}, false);

		document.addEventListener('mouseup', function (event) {
			if (!that.active) { return; }

			that.updateButtonState(event.button, false, event);
		}, false);

		document.addEventListener('mousemove', function (event) {
			if (!that.active) { return; }

			that.updateDeltas(event.clientX, event.clientY);
		}, false);

		this.domElement.addEventListener('mousewheel', function (event) {
			if (!that.active) { return; }

			that.shiftKey = event.shiftKey;
			that.applyWheel(event.wheelDelta || -event.detail);
		}, false);
		this.domElement.addEventListener('DOMMouseScroll', function (event) {
			if (!that.active) { return; }

			that.shiftKey = event.shiftKey;
			that.applyWheel(event.wheelDelta || -event.detail);
		}, false);


		// Avoid missing the mouseup event because of Chrome bug:
		// https://code.google.com/p/chromium/issues/detail?id=244289
		this.domElement.addEventListener('dragstart', function (event) {
			if (!that.active) { return; }

			event.preventDefault();
		}, false);
		this.domElement.oncontextmenu = function() { return false; };

		// Touch controls
		this.domElement.addEventListener('touchstart', function(event) {
			if (!that.active) { return; }

			var pan = (event.targetTouches.length === 2);
			var orbit = (event.targetTouches.length === 1);
			that.updateButtonState(that.panButton, pan);
			that.updateButtonState(that.orbitButton, orbit);
		});
		this.domElement.addEventListener('touchend', function(event) {
			if (!that.active) { return; }

			var pan = (event.targetTouches.length === 2);
			var orbit = (event.targetTouches.length === 1);
			that.updateButtonState(that.panButton, pan);
			that.updateButtonState(that.orbitButton, orbit);
		});
		var oldDistance = 0;
		this.domElement.addEventListener('touchmove', function(event) {
			if (!that.active) { return; }

			var cx, cy, distance;
			var touches = event.targetTouches;
			var x1 = touches[0].clientX;
			var y1 = touches[0].clientY;
			if (touches.length === 2) {
				var x2 = touches[1].clientX;
				var y2 = touches[1].clientY;
				cx = (x1 + x2) / 2;
				cy = (y1 + y2) / 2;
				distance = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
			} else {
				cx = x1;
				cy = y1;
			}
			that.updateDeltas(cx, cy);
			var scale = (distance - oldDistance) / Math.max(that.domElement.height, that.domElement.width);
			scale /= 3;
			if (touches.length === 2 && Math.abs(scale) > 0.3) {
				that.applyWheel(that.zoomSpeed * scale);
				oldDistance = distance;
			}
		});
	};

	OrbitNPanControlScript.prototype.updateButtonState = function(buttonIndex, down) {
		if (buttonIndex === this.orbitButton && !this[this.panKey] || this[this.orbitKey]) {
			OrbitCamControlScript.prototype.updateButtonState.call(this, 0, down);
		} else if (buttonIndex === this.panButton && !this[this.orbitKey] || this[this.panKey]) {
			this.panState.buttonDown = down;
			if(down) {
				this.panState.lastX = NaN;
				this.panState.lastY = NaN;
				this.panState.lastPos.setv(this.lookAtPoint);
			}
		}
	};

	OrbitNPanControlScript.prototype.resetLookAt = function(lookat, x, y, z) {
		this.goingToLookAt.setv(lookat);
		this.lookAtPoint.setv(lookat);
		this.panState.lastX = NaN;
		this.panState.lastY = NaN;
		this.panState.lastPos.setv(lookat);
		this.velocity.set(0);

		MathUtils.cartesianToSpherical(x, y, z, this.spherical);
		this.targetSpherical.setv(this.spherical);
		// REVIEW: Is this necessary? It's always set in run loop
		MathUtils.sphericalToCartesian(this.spherical.x, this.spherical.y, this.spherical.z, this.cartesian);
	};

	OrbitNPanControlScript.prototype.updateDeltas = function(mouseX, mouseY) {
		OrbitCamControlScript.prototype.updateDeltas.call(this, mouseX, mouseY);
		var v = new Vector3();
		var u = new Vector3();

		if (isNaN(this.panState.lastX) || isNaN(this.panState.lastY)) {
			this.panState.lastX = mouseX;
			this.panState.lastY = mouseY;
		}
		if(this.panState.buttonDown) {
			var c = Renderer.mainCamera;

			if (!c) {
				return;
			}

			c.getScreenCoordinates(this.panState.lastPos, 1, 1, u);
			u.x -= (mouseX - this.panState.lastX) / this.viewportWidth;
			u.y += (mouseY - this.panState.lastY) / this.viewportHeight;
			c.getWorldCoordinates(
				u.x,
				u.y,
				1,
				1,
				u.z,
				v
			);
			this.lookAtPoint.setv(v);
			this.goingToLookAt.setv(this.lookAtPoint);
			this.dirty = true;
		}
	};

	OrbitNPanControlScript.prototype.applyWheel = function (delta) {
		var delta = (this.invertedWheel ? -1 : 1) * MathUtils.clamp(delta, -1, 1);

		// Decrease zoom if shift is pressed
		if (this.shiftKey) {
			delta *= this.detailZoom;
		}
		delta *= this.zoomDistanceFactor * this.targetSpherical.x;


		this.zoom(this.zoomSpeed * delta);
	};

	OrbitNPanControlScript.prototype.run = function(entity, tpf, env) {

		this.active = entity === this.currentCameraEntity;

		if(!this.goingToLookAt.equals(this.lookAtPoint)) {
			var delta = tpf * 7;
			this.lookAtPoint.lerp(this.goingToLookAt, delta);
			this.dirty = true;
		}
		OrbitCamControlScript.prototype.run.call(this, entity, tpf, env);


		if (env) {
			this.viewportWidth = env.viewportWidth;
			this.viewportHeight = env.viewportHeight;
		}
	};

	return OrbitNPanControlScript;
});