debug = require('src/Debug')
require('src/utils')
require('src/settings')

class Player {
    constructor(order){
        this.pseudo = "Default";
        this.hand = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
        this.played_glyphs = [];
        this.played_prodigy = null;
        this.prodigies = [];
        this.prodigies_order = [];
        this.hp = 10;
        this.has_regard = false;
        this.winner = false;
        this.id = -1;
        this.COMBINAISONS = {
            1: [[1]],
            2: [[2], [1, 1]],
            3: [[3], [2, 1], [1, 1, 1]],
            4: [[4], [3, 1], [2, 2], [2, 1, 1]],
            5: [[5], [4, 1], [3, 2], [3, 1, 1], [2, 2, 1], [2, 1, 1, 1]],
            6: [[5, 1], [4, 2], [3, 3], [4, 1, 1], [3, 2, 1], [2, 2, 2],
                [2, 2, 1, 1], [3, 1, 1, 1]],
            7: [[5, 2], [4, 3], [5, 1, 1], [4, 2, 1], [3, 3, 1], [3, 2, 2],
                [4, 1, 1, 1], [3, 2, 1, 1], [2, 2, 2, 1]],
            8: [[5, 3], [4, 4], [5, 2, 1], [4, 3, 1], [3, 3, 2], [4, 2, 2],
                [4, 2, 1, 1], [3, 3, 1, 1], [5, 1, 1, 1], [3, 2, 2, 1]],
            9: [[5, 4], [4, 4, 1], [4, 3, 2], [5, 2, 2], [5, 3, 1],
                [5, 2, 1, 1], [4, 3, 1, 1], [4, 2, 2, 1], [3, 2, 2, 2]]
        };

        for (let i = 1; i < 10; i++) {
            this.COMBINAISONS[i] = utils.shuffle(this.COMBINAISONS[i]);
        }

        let glyph = order == 0 ? 5 : 4
        this.hand.push(glyph);
    }
}
