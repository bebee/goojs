var Action = require('goo/fsmpack/statemachine/actions/Action');
var SystemBus = require('goo/entities/SystemBus');

	'use strict';

	function EmitAction(/*id, settings*/) {
		Action.apply(this, arguments);
	}

	EmitAction.prototype = Object.create(Action.prototype);
	EmitAction.prototype.constructor = EmitAction;

	EmitAction.external = {
		key: 'Emit message',
		name: 'Emit Message',
		type: 'transitions',
		description: 'Emits a message (a ping) to a channel on the bus. Messages can be listened to by the Listen action, or by scripts using the SystemBus.addListener(channel, callback) function.',
		parameters: [{
			name: 'Channel',
			key: 'channel',
			type: 'string',
			description: 'Channel to transmit a message (a ping) on',
			'default': ''
		}],
		transitions: []
	};

	EmitAction.prototype._run = function (/*fsm*/) {
		SystemBus.emit(this.channel, this.data);
	};

	module.exports = EmitAction;