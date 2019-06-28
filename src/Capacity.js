const range = require('./utils').range

module.exports.Capacity = class {
	constructor(json, owner){
		this.owner = owner;
		this.opp = player_sockets[owner].opp;
		this.target = (json['target']) ? json['target'] : null;
        this.condition = (json['condition']) ? json['condition'] : "none";
        this.need_winner = false;
        if ((json['condition'] !== undefined)) {
            if (['victoire', 'defaite'].includes(json['condition'])) {
                this.need_winner = true;
            }
        }
        this.modification = (json['modification']) ? json['modification'] : "null";
        this.cost = (json['cost']) ? json['cost'] : false;
        this.cost_type = (json['cost_type']) ? json['cost_type'] : "null";
        this.cost_value = (json['cost_value']) ? json['cost_value'] : 0;
        this.effect = (json['effect']) ? effets[json['effect']] : null;
        this.priority = (json['effect'] != 'stop_talent') ? true : false;
        this.value = (json['value']) ? json['value'] : 0;
        this.contrecoup = (json['contrecoup']) ? json['contrecoup'] : false;
        this.stopped = false;
        this.data = json;
	}

    execute_capacity(turn) {
    	console.log('Application : ' + this.get_string_effect());
    	let o = this.get_player(this.owner);
	    if (this.check_condition(o) && !this.stopped) {
	        if (this.cost) {
	            if (this.cost_type == "glyph") {
	                let index = o.get_random_glyphe_index(feinte_allowed=false);
	                if (index != -1) {
	                    o.hand.splice(index, 1);
	                } else {
	                   return;
	                }
	            } else if (this.cost_type == "hp") {
	                o.hp = o.hp - this.cost_value;
	            }
	        }
	        this.set_target();
	        for (let i of range(0, this.get_modification(o, turn))) {
	            this.effect(this);
	        }
	    }
	}

	set_target() {
	    // Target definition;
	    let c = this.contrecoup;
	    let t = this.target;
	    let opp = this.get_player(this.opp);
	    let owner = this.get_player(this.owner);
	    if (t == "opp") {
	        this.target = (c) ? owner : opp;
	    }
	    else if (t == "owner") {
	        this.target = (c) ? opp : owner;
	    }
	}

	check_condition(owner) {
	    let victoire = this.condition == "victoire" && owner.winner;
	    let defaite = this.condition == "defaite" && !owner.winner;
	    let courage = this.condition == "courage" && owner.order == 0;
	    let riposte = this.condition == "riposte" && owner.order == 1;
	    let none = this.condition == "none";
	    if (victoire || defaite || courage || riposte || none) {
	        return true;
	    } else {
	        return false;
	    }
	}

	get_modification(owner, turn) {
	    if (this.modification == "patience") {
	        return turn;
	    } else if (this.modification == "acharnement") {
	        return 3 - turn;
	    } else if (this.modification == "par_glyphe") {
	        let count = 0;
	        for (element in owner.played_glyphs) {
	        	glyph = owner.played_glyphs[element];
	            if (glyph == 0) {
	                count = count + 1;
	            }
	        }
	        return count;
	    } else {
	        return 1;
	    }
	}

	get_string_effect() {
	    let string = "\t";
	    let d = this.data;
	    string = (!d['contrecoup']) ? string : string + "Contrecoup" + " ";
	    if (d['cost']) {
	        string = string + d['cost_value'] + " " + d['cost_type'] + " ";
	    }
	    string = (!d['condition']) ? string : string + d['condition'] + " ";
	    string = (!d['modification']) ? string : string + d['modification'] + " ";
	    string = string +  d['effect'] + " ";
	    string = (!d['value']) ? string : string + d['value'];
	    return string;
	}

    get_player(id){
    	return player_sockets[id].player;
    }
}

var effets = {};

effets['recuperation'] = function(capa) {
    let v = capa.value;
    let t = capa.target;
    let l = Object.keys(t.played_glyphs).length - 1;
    let count = 0;
    for (let i of range(0, l)) {
        if (count == v) {
            break;
        }
        let index = l - i;
        if (!range(0, 5).includes(t.played_glyphs[index])) {
            t.hand = t.hand + [t.played_glyphs[index]];
            t.played_glyphs.splice(index, 1);
            count = count + 1;
        }
    }
}


effets['modif_degats'] = function(capa) {
    let p = capa.target.played_prodigy;
    let v = capa.value;
    p.degats = (p.protected && v < 0) ? p.degats : p.degats + v;
}

effets['modif_puissance'] = function(capa) {
    let p = capa.target.played_prodigy;
    let v = capa.value;
    p.puissance = (p.protected && v < 0) ? p.puissance : p.puissance + v;
}


effets['modif_puissance_degats'] = function(capa) {
    effets['modif_puissance'](capa);
    effets['modif_degats'](capa);
}


effets['modif_hp'] = function(capa) {
    let p = capa.target;
    p.hp = p.hp + capa.value;
}


effets['stop_talent'] = function(capa) {
    let p = capa.target.played_prodigy;
    if (!p.protected) {
        p.talent.stopped = true;
    }
}


effets['stop_maitrise'] = function(capa) {
    let p = capa.target.played_prodigy;
    if (!p.protected) {
        p.maitrise.stopped = true;
    }
}


effets['protection'] = function(capa) {
    capa.target.played_prodigy.protected = true;
}


effets['echange_p'] = function(capa) {
    let p1 = capa.target.played_prodigy;
    let p2 = capa.target.opp.played_prodigy;
    let pp1 = p1.base_puissance;
    p1.base_puissance = p2.base_puissance;
    p2.base_puissance = pp1;
}


effets['echange_d'] = function(capa) {
    let p1 = capa.target.played_prodigy;
    let p2 = capa.target.opp.played_prodigy;
    let dp1 = p1.base_degats;
    p1.base_degats = p2.base_degats;
    p2.base_degats = dp1;
}


effets['copy_talent'] = function(capa) {
    let p1 = capa.target.played_prodigy;
    let p2 = capa.target.opp.played_prodigy;
    p2.talent = deepcopy(p1.talent);
}


effets['copy_maitrise'] = function(capa) {
    let p1 = capa.target.played_prodigy;
    let p2 = capa.target.opp.played_prodigy;
    p2.maitrise = deepcopy(p1.maitrise);
}


effets['oppression'] = function(capa) {
    let v = capa.value;
    let t = capa.target;
    let l = t.hand.length;
    let count = 0;
    for (let i of range(0, l)) {
        if (count == v) {
            break;
        }
        let index = l - i - 1;
        if (t.hand[index] != 0) {
            t.hand.splice(index, 1);
            count = count + 1;
        }
    }
}


effets['pillage'] = function(capa) {
    let v = capa.value;
    let t = capa.target;
    let l = t.hand.length;
    let count = 0;
    for (let i of range(0, l)) {
        if (count == v) {
            break;
        }
        let index = l - i - 1;
        if (t.hand[index] != 0) {
            t.opp.hand = t.opp.hand + [t.hand[index]];
            t.hand.splice(index, 1);
            count = count + 1;
        }
    }
}


effets['initiative'] = function(capa) {
    capa.target.played_prodigy.initiative = true;
}


effets['avantage'] = function(capa) {
    capa.target.played_prodigy.advantaged = true;
}


effets['vampirism'] = function(capa) {
    let v = capa.value;
    let t = capa.target;
    t.hp = t.hp - v;
    t.opp.hp = t.opp.hp + v;
}


effets['regard'] = function(capa) {
    capa.target.has_regard = true;
}


effets['nothing'] = function(capa) {}
