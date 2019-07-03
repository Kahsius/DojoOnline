const settings = require("../settings");

module.exports.Player = class {
    constructor(socket, order){
        this.pseudo = socket.pseudo;
        this.socket = socket;
        this.hand = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
        this.played_glyphs = {'air': -1, 'eau': -1, 'terre': -1, 'feu': -1};
        this.played_prodigy = null;
        this.prodiges = {};
        this.hp = settings.BASE_HP;
        this.has_regard = true;
        this.winner = false;
        this.ready = false;
        this.order = order;
        this.opp = null;

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

    valide_choix_glyphe(voie, valeur){
        if (valeur in this.hand){
            let g = this.played_glyphs[voie]
            let offset = (g != -1) ? g : 0;
            console.log(voie);
            if (this.sum_played_glyphs() + valeur - offset 
                <= this.played_prodigy.puissance){
                console.log('... validé');
                this.hand.splice(this.hand.indexOf(valeur), 1);
                if (g >= 0){
                    this.hand.push(g);
                }
                this.played_glyphs[voie] = valeur
                return true;
            } else {
                return false;
                console.log('... non valide ( > puissance)');
            }
        } else {
            console.log('... non validé (pas dans p.hand)');
        }
    }

    on_opp_regard(voie){
        let opp = players[this.opp];
        return (opp.has_regard && voie == opp.played_prodigy.element) ? true : false;
    }

    retire_glyphe(voie){
        if (this.played_glyphs[voie] != -1) {
            this.hand.push(this.played_glyphs[voie]);
            this.played_glyphs[voie] = -1;
            return true;
        }
        return false;
    }
}
