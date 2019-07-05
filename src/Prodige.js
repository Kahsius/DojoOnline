const Capacity = require('./Capacity').Capacity;

module.exports.Prodige = class {
    constructor(params, owner){
        this.name = params['name'];
        this.available = true;
        this.base_puissance = params['puissance'];
        this.puissance = params['puissance'];
        this.base_degats = params['degats'];
        this.degats = params['degats'];
        this.element = params['element'];
        this.talent = new Capacity(params['talent'], owner);
        this.maitrise = new Capacity(params['maitrise'], owner);
    }
}
