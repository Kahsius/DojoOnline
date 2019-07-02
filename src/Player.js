const settings = require("../settings");

module.exports.Player = class {
    constructor(socket, order){
        this.pseudo = socket.pseudo;
        this.id = socket.id;
        this.hand = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
        this.played_glyphs = {'air': -1, 'eau': -1, 'terre': -1, 'feu': -1};
        this.played_prodigy = null;
        this.prodiges = {};
        this.hp = settings.BASE_HP;
        this.has_regard = true;
        this.winner = false;
        this.ready = false;
        this.order = -1;

        let glyph = order == 0 ? 5 : 4
        this.hand.push(glyph);
    }

    sum_played_glyphs(){
        let g = this.played_glyphs;
        let sum = 0;
        for (let voie in g){
            if (g[voie] != -1){
                sum += g[voie];
            }
        }
        return sum;
    }
}
