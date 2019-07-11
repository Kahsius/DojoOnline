const settings = require("../settings");
const range = require("./utils").range;
const Prodige = require('./Prodige').Prodige;

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
        if (this.hand.includes(valeur)){
            let g = this.played_glyphs[voie]
            let offset = (g != -1) ? g : 0;
            if (this.sum_played_glyphs() + valeur - offset 
                <= this.get_played_prodigy().puissance){
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
            return false;
            console.log('... non validé (pas dans p.hand)');
        }
    }

    on_opp_regard(voie){
        let opp = players[this.opp];
        return (opp.has_regard && voie == opp.get_played_prodigy().element) ? true : false;
    }

    create_prodiges(list_names){
        for (let name of list_names) {
            this.prodiges[name] = new Prodige(prodige_data[name], this);
        }
    }

    retire_glyphe(voie){
        if (this.played_glyphs[voie] != -1) {
            this.hand.push(this.played_glyphs[voie]);
            this.played_glyphs[voie] = -1;
            return true;
        }
        return false;
    }

    get_played_prodigy(){
        return this.prodiges[this.played_prodigy];
    }


    valide_choix_prodige(prodige){
        if (prodige in this.prodiges) {
            let p = this.prodiges[prodige]
            if (p.available) {
                if (this.get_played_prodigy() != null){
                    this.get_played_prodigy().available = true;
                }
                this.played_prodigy = prodige;
                p.available = false;
                console.log('... validé')
                return({'valid': true});
            } else {
                console.log('...non validé (!available)')
                return({'valid': false, 'text': p.name + ' n\'est plus disponible'});
            }
        } else {
            console.log('...non validé (choix invalide ou prodige not in P.prodiges)')
            return({'valid': false, 'text': p.name + ' n\'est pas dans votre main'});
        }
    }

    get_hand_state() {
        let state = {};
        for (let i in range(0, 6)) {
            state[i] = 0;
        }
        for (let g of this.hand) {
            state[g]++;
        }
        return state;
    }

    get_prodiges_front() {
        var prodiges = [];
        let p;
        for (let name in this.prodiges) {
            p = this.prodiges[name];
            prodiges.push({
                'name': p.name,
                'p': p.puissance,
                'd': p.degats
            });
        }
        return prodiges;
    }
}
