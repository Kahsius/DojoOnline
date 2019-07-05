const Capacity = require('./Capacity').Capacity;

module.exports.Voie = class {
	constructor(data) {
		this.element = data['element'];
		this.capacity = new Capacity(data['capacity'], null);
	}
}