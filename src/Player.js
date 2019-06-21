const settings = require("../settings");

module.exports.Player = class {
    constructor(pseudo, order){
        this.pseudo = pseudo;
        this.hand = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
        this.played_glyphs = [];
        this.played_prodigy = null;
        this.prodigies = [];
        this.hp = settings.BASE_HP;
        this.has_regard = false;
        this.winner = false;

        let glyph = order == 0 ? 5 : 4
        this.hand.push(glyph);
    }
}
