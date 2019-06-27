module.exports.Prodige = class {
    constructor(params){
        this.name = params['name'];
        this.available = true;
        this.base_puissance = params['puissance'];
        this.puissance = params['puissance'];
        this.base_degats = params['degats'];
        this.degats = params['degats'];
    }
}
