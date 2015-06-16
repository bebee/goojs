define([
	'goo/fsmpack/statemachine/actions/Action'
], function (
	Action
) {
	'use strict';

	function SoundFadeInAction(/*id, settings*/) {
		Action.apply(this, arguments);
	}

	SoundFadeInAction.prototype = Object.create(Action.prototype);
	SoundFadeInAction.prototype.constructor = SoundFadeInAction;

	SoundFadeInAction.external = {
		name: 'Sound Fade In',
		type: 'sound',
		description: 'Fades in a sound.',
		canTransition: true,
		parameters: [{
			name: 'Sound',
			key: 'sound',
			type: 'sound',
			description: 'Sound',
			'default': 0
		}, {
			name: 'Time (ms)',
			key: 'time',
			type: 'number',
			description: 'Time it takes for the fading to complete',
			'default': 1000
		}, {
			name: 'On Sound End',
			key: 'onSoundEnd',
			type: 'boolean',
			description: 'Whether to transition when the sound finishes playing, regardless of the specified transition time',
			'default': false,
		}],
		transitions: [{
			key: 'complete',
			name: 'On Completion',
			description: 'State to transition to when the time expires or when the sound finishes playing'
		}]
	};

	SoundFadeInAction.prototype._run = function(fsm) {
		var entity = fsm.getOwnerEntity();
		if (!entity.hasComponent('SoundComponent')) { return; }

		var sound = entity.soundComponent.getSoundById(this.sound);
		if (!sound) { return; }

		var endPromise = sound.fadeIn(this.time / 1000);

		if (this.onSoundEnd) {
			endPromise = sound.play();
		}

		endPromise.then(function() {
			fsm.send(this.transitions.complete);
		}.bind(this));
	};

	return SoundFadeInAction;
});