var socket = io();

var need_click = false;
var num_need_click = 0;
var num_current_click = 0;
var need_click_target = "none";
var drop_src = null;
var drop_srcParent = null;
var drop_target_zone = null;
var choix = null;
var glyphes_clicked = [];
var id_glyphe = 0;

function status() {
    console.log('need_click : ' + need_click);
    console.log('num_need_click : ' + num_need_click);
    console.log('num_current_click : ' + num_current_click);
    console.log('need_click_target : ' + need_click_target);
    console.log('choix : ' + choix);
}

function drag(ev) {
    ev.dataTransfer.setData("id", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    drop_src = document.getElementById(ev.dataTransfer.getData("id"));
    drop_srcParent = drop_src.parentNode;
    drop_target_zone = ev.currentTarget;
    let data = {
        'source': drop_srcParent.getAttribute('class'),
        'target': drop_target_zone.getAttribute('class')
    };

    if(drop_srcParent != drop_target_zone) {
        if (drop_src.getAttribute('class') == 'glyphe'
            && ['empty_voie', 'hand_glyphes'].includes(data.target)) {
            console.log('drop_glyphe');
            data['value'] = drop_src.getAttribute('valeur');
            let voie = (data.target) == 'empty_voie' ? drop_target_zone : drop_srcParent;
            data['voie'] = voie.getAttribute('id').split('-')[1];
            socket.emit('drop_glyphe', data);
        } else if (drop_src.getAttribute('class') == 'prodige'
            && ['empty_prodige', 'hand_prodiges'].includes(data.target)) {
            console.log('drop prodige');
            data['name'] = drop_src.getAttribute('id');
            socket.emit('drop_prodige', data);
        }
    }
}

function click_glyph(ev) {
    // TODO à refondre
    // doit renvoyer data = {'value': valeur, 'target_zone': zone du glyphe, 'element': si sur voie}
    let node = ev.currentTarget;
    let parent = node.parentNode;
    let value = node.getAttribute('valeur');
    let target_zone = parent.getAttribute('class');
    let element = target_zone == 'empty_voie' ? parent.getAttribute('id').split('-')[1] : 'hand_glyphes';
    socket.emit('click', {
        'value': value,
        'target_zone': target_zone,
        'element': element
    });
}

function click_voie(ev) {
    let node = ev.currentTarget;
    let element = node.getAttribute('id').split('_')[1];
    socket.emit('click', {
        'element': element,
        'maitrise': false,
        'target_zone': 'voie'
    });
}

function click_prodige(ev) {
    let node = ev.currentTarget;
    if (node.parentNode.getAttribute('class') == 'empty_prodige') {
        let element = node.getAttribute('element');
        socket.emit('click', {
            'element': element,
            'maitrise': true,
            'target_zone': 'prodige'
        });
    }
}

function create_glyph(v) {
    var glyph = document.createElement("div");
    if (v != -1) {
        glyph.setAttribute("draggable", "true");
        glyph.setAttribute("ondragstart", "drag(event)");
        glyph.setAttribute("class", "glyphe");
        glyph.setAttribute("id", id_glyphe);
        id_glyphe++;
        glyph.setAttribute("valeur", v);
        glyph.setAttribute("onclick", "click_glyph(event);");
        glyph.setAttribute("clicked", "false");
        glyph.innerHTML = v;
    } else {
        glyph.setAttribute("class", "glyphe_opp");
    }
    return glyph;
}

function create_prodige(data, opp=false) {
    var prodige = document.createElement("div");
    var puissance = document.createElement("div");
    var degats = document.createElement("div");
    var name = document.createElement("div");

    prodige.setAttribute("id", data.name);
    prodige.setAttribute("class", "prodige");
    prodige.setAttribute("available", "false");
    prodige.setAttribute('element', data.element);
    prodige.setAttribute("onclick", "click_prodige(event);");
    
    puissance.setAttribute("id", "puissance_" + data.name);
    puissance.setAttribute("class", "puissance");
    puissance.innerHTML = data.p;
    
    degats.setAttribute("id", "degats_" + data.name);
    degats.setAttribute("class", "degats");
    degats.innerHTML = data.d;
    
    name.setAttribute("class", "name");
    name.setAttribute("id", "name_" + data.name);
    name.innerHTML = data.name;
    
    prodige.appendChild(puissance);
    prodige.appendChild(name);
    prodige.appendChild(degats);
    if (!opp) {
        prodige.setAttribute("draggable", "true");
        prodige.setAttribute("ondragstart", "drag(event)");
        prodige.setAttribute('available', 'false')
    }
    return prodige;
}

function init_game(data) {
    me = data['me'];
    opp = data['opp'];

    var hand_player = document.getElementById('hand_glyphes_j1');
    var hand_opp = document.getElementById('hand_glyphes_j0');
    var hand_prodiges_player = document.getElementById('hand_prodiges_j1');
    var hand_prodiges_opp = document.getElementById('hand_prodiges_j0');

    var glyphes = me.hand;
    var prodiges = me.prodiges;
    var prodiges_opp = opp.prodiges;

    for (var prodige of prodiges) {
        hand_prodiges_player.appendChild(create_prodige(prodige));
    }
    for (var prodige of prodiges_opp) {
        hand_prodiges_opp.appendChild(create_prodige(prodige, true));
    }
    for (var i = 0; i < glyphes.length; i++) {
        hand_player.appendChild(create_glyph(glyphes[i]));
        hand_opp.appendChild(create_glyph(-1));
    }

    document.getElementById('hp_j1').innerHTML = me.hp;
    document.getElementById('hp_j0').innerHTML = opp.hp;
}

function debug(string) {
    socket.emit('debug', {'cmd': string});
}

// =========== ONLY FOR DEBUG
function init() {
    socket.emit('init_debug');
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('waiting').style.display = 'none';
}
// ==========================

function join_room(id) {
    socket.emit('join_room', id);
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('waiting').style.display = 'flex';
}

function refresh(id) {
    list = document.getElementById('room_choice_list');
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }
    socket.emit('init', socket.pseudo);
}

function text_log(string){
    log = document.getElementsByClassName('log')[0]
    node = document.createElement('p');
    node.innerHTML = string;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
}

function validate_choice(){
    socket.emit('validate_glyphes');
}

function debug(str){
    socket.emit('debug', str);
}

socket.on('list_rooms', function(data){
    console.log('Récupération de la liste des parties');
    list = document.getElementById('room_choice_list');
    for (room of data){
        elem = document.createElement('div');
        elem.setAttribute('onclick', 'join_room("' + room['id'] + '")');
        elem.setAttribute('class', 'btn_room_choice');
        elem.innerHTML = room['pseudo'];
        list.appendChild(elem);
    }
});

socket.on('init_game', function(data){
    text_log('Création de la partie');
    document.getElementById('waiting').style.display = 'none';
    document.getElementById('main').style.display = 'flex';
    init_game(data);
});

socket.on('text_log', function(data){
    text_log(data);
});

socket.on('drop_validated', function(){
    let src = drop_src;
    let srcParent = drop_srcParent;
    let target = drop_target_zone;
        
    // Si on vise la main, on ne fait pas de remplacement
    if (['hand_glyphes', 'hand_prodiges'].includes(target.getAttributeNode("class").value)) {
        target.appendChild(src)
    } else {
        if (target.firstElementChild != null) {
            // S'il y a déjà quelque chose dans la case
            t = target.firstElementChild;
            target.replaceChild(src, t);
            srcParent.appendChild(t);
        } else {
            // Sinon
            target.appendChild(src);
        }
    }

    socket.emit('check_validate_button');
});

socket.on('drop_not_validated', function(string){
    text_log(string);
    drop_src = null;
    drop_srcParent = null;
    drop_target_zone = null;
    drop_ev = null;
    socket.emit('check_validate_button');
});

socket.on('init_choix_glyphes', function() {
    text_log('Choix des glyphes');
    choix = 'glyphes';
    glyphes = document.getElementById('hand_glyphes_j1').children;
    for (glyph of glyphes){
        glyph.setAttribute('draggable', 'true');
    }
});

socket.on('choix_prodige_adverse', function(id){
    text_log('L\'adversaire joue ' + id);
    var prodige = document.getElementById(id);
    var empty_prodige = document.getElementById('empty_prodige_j0');
    empty_prodige.appendChild(prodige);
});

socket.on('retire_glyphe_opp', function(voie){
    let glyph = document.createElement("div");
    glyph.setAttribute("class", "glyphe_opp");
    document.getElementById('hand_glyphes_j0').appendChild(glyph);
    document.getElementById('j0-' + voie).innerHTML = "";
});

socket.on('choix_glyphe_opp', function(data){
    let voie = data['voie'];
    let valeur = data['valeur'];
    let empty_voie = document.getElementById('j0-' + voie);
    if (data['regard']){
        let glyph = document.createElement("div");
        glyph.setAttribute("id", "glyph_opp_regard");
        glyph.setAttribute("class", "glyphe");
        glyph.setAttribute("valeur", valeur);
        glyph.innerHTML = valeur;
        let already_played = empty_voie.firstElementChild;
        if (already_played == null) {
            let hand = document.getElementById('hand_glyphes_j0');
            hand.removeChild(hand.firstElementChild);
        }
        empty_voie.innerHTML = "";
        empty_voie.appendChild(glyph);
    } else {
        let already_played = empty_voie.firstElementChild;
        if (already_played == null) {
            let glyph = document.getElementById('hand_glyphes_j0').firstElementChild;
            empty_voie.appendChild(glyph);
        }
    }
});

socket.on('ask_for_glyphs', function(data){
    need_click_target = data['where'];
    num_need_click = data['howmany'];
    choix = 'glyphes_clicked';
});

socket.on('choix_maitrise_voix', function(){
    text_log('Choix entre maitrise et voix');
});

socket.on('validate_button', function(validate){
    // Activation ou non du bouton "Valider"
    var btn = document.getElementById('validate_button');
    var false_btn = document.getElementById('false_button');
    if (validate) {
        btn.style.display = 'flex';
        false_btn.style.display = 'none';
    } else {
        btn.style.display = 'none';
        false_btn.style.display = 'flex';
    }   
});

socket.on('debug', function(str){
    console.log(str);
});

socket.on('choices_voies', function(effects){
    let voie;
    for (let node of document.getElementsByClassName('voie')){
        node.setAttribute('available', 'false');
    }
    let prodige = document.getElementById('empty_prodige_j1').children[0];
    prodige.setAttribute('available', 'false');
    for (let effect of effects) {
        if (effect.display) {
            voie = document.getElementById('voie_' + effect.element);
            voie.setAttribute('available', 'true');
            if (prodige.getAttribute('element') == effect.element) {
                prodige.setAttribute('available', 'true');
            }
        }
    }
});

socket.on('reveal', function(pg){
    let ev, id;
    for (let element in pg) {
        ev = document.getElementById('j0-' + element);
        id = ev.children[0].id;
        ev.removeChild(ev.children[0]);
        ev.appendChild(create_glyph(pg[element]));
    }
});

socket.on('capacity_resolution', function(state){
    let hp = document.getElementById('hp_j1');
    let hp_opp = document.getElementById('hp_j0');
    let prodige = document.getElementById('empty_prodige_j1').children[0];
    let p, d;
    let node, id, hand;
    for (let child of prodige.children) {
        if (child.className == 'puissance') p = child;
        if (child.className == 'degats') d = child;
    }
    let prodige_opp = document.getElementById('empty_prodige_j0').children[0];
    let p_opp, d_opp;
    for (let child of prodige_opp.children) {
        if (child.className == 'puissance') p_opp = child;
        if (child.className == 'degats') d_opp = child;
    }
    if (state.status == 'done') {
        if (state.label == 'recuperation') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                for (let item of state.choices) {
                    voie = document.getElementById('j1-' + item.element);
                    id = voie.children[0].getAttribute('id');
                    voie.innerHTML = '';
                    document.getElementById('hand_glyphes_j1').appendChild(create_glyph(item.value));
                }
            } else if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                for (let item of state.choices) {
                    voie = document.getElementById('j0-' + item.element);
                    id = voie.children[0].getAttribute('id');
                    voie.innerHTML = '';
                    document.getElementById('hand_glyphes_j0').appendChild(create_glyph(-1));
                }
            }
        } else if (state.label == 'modif_degats') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) d.innerHTML = parseInt(d.innerHTML) + state.value;
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) d_opp.innerHTML = parseInt(d_opp.innerHTML) + state.value;
        } else if (state.label == 'modif_puissance') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) p.innerHTML = parseInt(p.innerHTML) + state.value;
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) p_opp.innerHTML = parseInt(p_opp.innerHTML) + state.value;
        } else if (state.label == 'modif_puissance_degats') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                d.innerHTML = parseInt(d.innerHTML) + state.value;
                p.innerHTML = parseInt(p.innerHTML) + state.value;
            }
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                d_opp.innerHTML = parseInt(d_opp.innerHTML) + state.value;
                p_opp.innerHTML = parseInt(p_opp.innerHTML) + state.value;
            }
        } else if (state.label == 'modif_hp') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) hp.innerHTML = parseInt(hp.innerHTML) + state.value;
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) hp_opp.innerHTML = parseInt(hp_opp.innerHTML) + state.value;
        } else if (state.label == 'stop_talent') {
            // TODO
        } else if (state.label == 'stop_maitrise') {
            // TODO 
        } else if (state.label == 'protection') {
            // TODO
        } else if (state.label == 'echange_p') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                p.innerHTML = state.values[0];
                p_opp.innerHTML = state.values[1];
            }
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                p.innerHTML = state.values[1];
                p_opp.innerHTML = state.values[0];
            }
        } else if (state.label == 'echange_d') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                d.innerHTML = state.values[0];
                d_opp.innerHTML = state.values[1];
            }
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                d.innerHTML = state.values[1];
                d_opp.innerHTML = state.values[0];
            }
        } else if (state.label == 'copy_talent') {
            // TODO 
        } else if (state.label == 'copy_maitrise') {
            // TODO
        } else if (state.label == 'oppression') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                for (let item of state.choices) {
                    hand = document.getElementById('hand_glyphes_j1');
                    for (let node of hand.children) {
                        if (node.getAttribute('valeur') == item.value) {
                            node.remove();
                            break;
                        }
                    }
                }
            } else if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                for (let item of state.choices) {
                    hand = document.getElementById('hand_glyphes_j1');
                    for (let node of hand.children) {
                        hand.removeChild(hand.children[0]);
                    }
                }
            }
        } else if (state.label == 'pillage') {
            hand = document.getElementById('hand_glyphes_j1');
            hand_opp = document.getElementById('hand_glyphes_j0');
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                for (let item of state.choices) {
                    for (let node of hand.children) {
                        if (node.getAttribute('valeur') == item.value) {
                            node.remove();
                            hand_opp.appendChild(create_glyph(-1));
                            break;
                        }
                    }
                }
            } else if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                for (let item of state.choices) {
                    for (let node of hand.children) {
                        hand_opp.removeChild(hand.children[0]);
                        hand.appendChild(create_glyph(item.value));
                    }
                }
            }
        } else if (state.label == 'initiative') {
            // TODO
        } else if (state.label == 'avantage') {
            // TODO
        } else if (state.label == 'vampirism') {
            if (state.target == 'own' && state.me
                || state.target == 'opp' && !state.me) {
                hp.innerHTML = parseInt(hp.innerHTML) + state.value;
                hp_opp.innerHTML = parseInt(hp_opp.innerHTML) - state.value;
            }
            if (state.target == 'opp' && state.me
                || state.target == 'own' && !state.me) {
                hp.innerHTML = parseInt(hp.innerHTML) - state.value;
                hp_opp.innerHTML = parseInt(hp_opp.innerHTML) + state.value;
            }
        } else if (state.label == 'regard') {
            // TODO           
        }
    } else {
        text_log('En cours : ' + state.status);
    }
});

socket.on('clean_round', function() {
    let ev, g;

    let p0 = document.getElementById('empty_prodige_j0');
    let p1 = document.getElementById('empty_prodige_j1');

    p0.children[0].setAttribute('playable', 'false');
    p1.children[0].setAttribute('playable', 'false');

    document.getElementById('hand_prodiges_j0').appendChild(p0.children[0]);
    document.getElementById('hand_prodiges_j1').appendChild(p1.children[0]);

    for (let i of [0, 1]) {
        for (let element of ['terre', 'air', 'feu', 'eau']) {
            ev = document.getElementById('j' + i + '-' + element);
            g = ev.children[0];
            if (g.getAttribute('valeur') == 0) {
                if (i == 1) document.getElementById('hand_glyphes_j' + i).appendChild(g);
                if (i == 0) {
                    document.getElementById('hand_glyphes_j' + i).appendChild(create_glyph(-1));
                    g.remove();
                }
            } else {
                g.remove();
            }
        }
    }
});

socket.on('end_game', function(winners){
    document.getElementById('main').style.display = 'none';
    document.getElementById('end').style.display = 'flex';
    let win = document.getElementById('winners');
    if (winners.length == 1) {
        win.innerHTML = winners[0] + ' est le plus grand Maître de Dojo ! \\o/';
    } else if (winners.length == 2) {
        win.innerHTML = 'Vous n\'avez pas réussi à vous départager, try again 8)';
    }
    socket.emit('delete_game');
});