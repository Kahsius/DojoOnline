const socket = io();
const COL_EAU = "blue";
const COL_TERRE = "green";
const COL_FEU = "red";
const COL_AIR = "orange";

let num_need_click = 0;
let need_click_target = "none";
let drop_src = null;
let drop_srcParent = null;
let drop_target_zone = null;
let choix = null;
let id_glyphe = 0;
let data_game = null;
let regard = null;

function hover_prodige(prodige) {
    let preview = document.querySelector('#preview');
    preview.style.backgroundImage = "none";
    let clone = prodige.cloneNode(true);
    clone = get_full_art_prodige(clone);
    preview.appendChild(clone);
}

function hover_out_prodige(e) {
    let preview = document.querySelector('#preview');
    preview.innerHTML = '';
    preview.style.backgroundImage = 'url("images/Carte_DOJO.png")';
}

function text_ig(str) {
    let zone = document.querySelector('#hand_glyphes_j0 > #text_zone');
    zone.innerText = str;
}

function validate_maitrise(answer) {
    socket.emit('click', {'maitrise': answer});
    document.querySelector('#voie_button').style.display = 'none';     
    document.querySelector('#maitrise_button').style.display = 'none';     
}

function update_regard() {
    let prodige;
    let observed, observing;
    if (regard === 'me') {
        observed = 'j0';
        observing = 'j1';
    }
    else if (regard === 'opp') {
        observed = 'j1';
        observing = 'j0';
    }

    // Récupération éventuelle du prodige
    if (observing) {
        prodige = document.querySelector('#empty_prodige_' + observing).children[0].firstChild;
        if (prodige) {
            let elem = prodige.getAttribute('element');
            let voie = document.querySelector('#' + observed + '-' + elem);
            voie.style.backgroundColor = COL_AIR;
        }
    }
}

function add_glyph_to_opp_hand() {
    let hand = document.querySelector('#hand_glyphes_j0_01');
    let glyph = create_glyph(-1);
    if (hand.children.length < 7) {
        hand.appendChild(glyph);
    } else {
        document.querySelector('#hand_glyphes_j0_2345').appendChild(glyph);
    }
}

function add_glyph_to_hand(glyph) {
    let hand;

    // On ajoute le glyphe dans la main qu'il faut
    let value = glyph.getAttribute('valeur');
    if (value <= 1) {
        hand = document.querySelector('#hand_glyphes_j1_01');
    } else if (value > 1) {
        hand = document.querySelector('#hand_glyphes_j1_2345');
    }
    hand.appendChild(glyph);

    // On retrie la main
    for (let i = 0; i < 6; i++) {
        let lst = hand.querySelectorAll('.glyphe');
        for (let item of lst) {
            if (parseInt(item.getAttribute('valeur')) === i) {
                hand.appendChild(item)
            }
        }
    }
}

function update_borders() {
    for (let tag of ['.empty_voie', '.empty_prodige']) {
        let lst = document.querySelectorAll(tag);
        for (let item of lst) {
            let parent = item.parentNode;
            let item_class = item.getAttribute('class');
            let parent_id = parent.getAttribute('id');
            parent_id = parent_id ? parent_id : '';
            if (item.hasChildNodes()) {
                item.style.border = "medium none";
            } else {
                if (item_class.includes('j0') || parent_id.includes('j0')) {
                    item.style.border = "2px solid #3e403f";
                } else if (item_class.includes('j1') || parent_id.includes('j1')) {
                    item.style.border = "2px solid white";
                }        
            }
        }
    }
}

function get_full_art_prodige(prodige) {
    let elem = prodige.getAttribute('element');

    if (elem === 'feu') elem = 'Anar';
    else if (elem === 'eau') elem = 'Ulmo';
    else if (elem === 'air') elem = 'Sulimo';
    else if (elem === 'terre') elem = 'Wilwar';
    prodige.style.backgroundImage = "url('images/Fond_Carte_" + elem + ".png')"

    return prodige;
}

function drag(ev) {
    ev.dataTransfer.setData("id", ev.target.id);
}

function get_list_images() {
    socket.emit('get_list_images');
}

function drop(ev) {
    ev.preventDefault();
    drop_src = document.getElementById(ev.dataTransfer.getData("id"));
    drop_srcParent = drop_src.parentNode;
    drop_target_zone = ev.currentTarget;
    let data = {
        'source': drop_srcParent.getAttribute('class').split(' ')[0],
        'target': drop_target_zone.getAttribute('class').split(' ')[0]
    };
    let elem = drop_src.getAttribute('class');
    if (elem === 'glyphe') {
        if (data.source === 'empty_voie') data.source_elem = drop_srcParent.getAttribute('id').split('-')[1];
        if (data.target === 'empty_voie') data.target_elem = drop_target_zone.getAttribute('id').split('-')[1];
        data.value = drop_src.getAttribute('valeur');
        socket.emit('drop_glyphe', data);
    } else if (elem === 'prodige') {
        data['name'] = drop_src.getAttribute('id');
        socket.emit('drop_prodige', data);
    }
}

function click_glyph(ev) {
    let node = ev.currentTarget;
    let parent = node.parentNode;
    let value = node.getAttribute('valeur');
    let target_zone = parent.getAttribute('class').split(' ')[0];
    let element = (target_zone === 'empty_voie') ? parent.getAttribute('id').split('-')[1] : '';
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
    if (node.parentNode.getAttribute('class') === 'empty_prodige') {
        let element = node.getAttribute('element');
        socket.emit('click', {
            'element': element,
            'maitrise': true,
            'target_zone': 'prodige'
        });
    }
}

function create_glyph(v) {
    const glyph = document.createElement("div");
    if (v !== -1) {
        glyph.setAttribute("draggable", "true");
        glyph.setAttribute("ondragstart", "drag(event)");
        glyph.setAttribute("class", "glyphe");
        glyph.setAttribute("id", id_glyphe);
        id_glyphe++;
        glyph.setAttribute("valeur", v);
        glyph.setAttribute("onclick", "click_glyph(event);");
        glyph.setAttribute("clicked", "false");
        let path = 'images/Glyphe_' + ( (v === 0) ? 'Feinte.png' : '0' + v + '.png');
        glyph.style.backgroundImage = "url(" + path + ")";
    } else {
        glyph.setAttribute("class", "glyphe_opp");
        glyph.style.backgroundImage = "url('images/Glyphe_Dos.png')";
    }
    return glyph;
}

function create_prodige(data, opp=false) {
    const prodige = document.createElement("div");
    const puissance = document.createElement("div");
    const degats = document.createElement("div");
    const name = document.createElement("div");
    const img = document.createElement("div");
    const talent = document.createElement("div");
    const maitrise = document.createElement("div");

    prodige.setAttribute("id", data.name);
    prodige.setAttribute("class", "prodige");
    prodige.setAttribute("available", "false");
    prodige.setAttribute('element', data.element);
    prodige.setAttribute("onclick", "click_prodige(event);");
    prodige.setAttribute('onmouseover', 'hover_prodige(this)');
    prodige.setAttribute('onmouseout', 'hover_out_prodige(this)');

    let color = "";
    if (data.element === "air") color = COL_AIR;
    else if (data.element === "eau") color = COL_EAU;
    else if (data.element === "terre") color = COL_TERRE;
    else if (data.element === "feu") color = COL_FEU;
    prodige.style.borderColor = color;

    puissance.setAttribute("id", "puissance_" + data.name);
    puissance.setAttribute("class", "puissance");
    puissance.style.backgroundImage = "url('images/Carte_Puissance.png')";
    puissance.innerHTML = data.p;

    degats.setAttribute("id", "degats_" + data.name);
    degats.setAttribute("class", "degats");
    degats.style.backgroundImage = "url('images/Carte_Degat.png')";
    degats.innerHTML = data.d;

    name.setAttribute("class", "name");
    name.setAttribute("id", "name_" + data.name);
    name.style.color = color;
    name.innerHTML = data.name;

    img.setAttribute("class", "img");
    img.setAttribute("id", "img_" + data.name);

    talent.setAttribute("class", "capacity talent");
    talent.setAttribute("id", "talent_" + data.name);
    talent.setAttribute('talent_short', data.talent);
    talent.setAttribute('talent_long', data.talent_long);
    talent.innerHTML = data.talent;

    maitrise.setAttribute("class", "capacity maitrise");
    maitrise.setAttribute("id", "maitrise_" + data.name);
    maitrise.setAttribute('maitrise_short', data.maitrise);
    maitrise.setAttribute('maitrise_long', data.maitrise_long);
    maitrise.innerHTML = data.maitrise;

    prodige.appendChild(puissance);
    prodige.appendChild(name);
    prodige.appendChild(degats);
    prodige.appendChild(img);
    prodige.appendChild(talent);
    prodige.appendChild(maitrise);

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

    const hand_player_01 = document.getElementById('hand_glyphes_j1_01');
    const hand_player_2345 = document.getElementById('hand_glyphes_j1_2345');
    const hand_opp_01 = document.getElementById('hand_glyphes_j0_01');
    const hand_opp_2345 = document.getElementById('hand_glyphes_j0_2345');
    const hand_prodiges_player = document.getElementById('hand_prodiges_j1');
    const hand_prodiges_opp = document.getElementById('hand_prodiges_j0');

    const glyphes = me.hand;
    const prodiges = me.prodiges;
    const prodiges_opp = opp.prodiges;

    for (let prodige of prodiges) {
        hand_prodiges_player.appendChild(create_prodige(prodige));
    }

    for (let prodige of prodiges_opp) {
        hand_prodiges_opp.appendChild(create_prodige(prodige, true));
    }

    for (let i = 0; i < glyphes.length; i++) {
        if ([0, 1].includes(glyphes[i])) {
            hand_player_01.appendChild(create_glyph(glyphes[i]));
        } else {
            hand_player_2345.appendChild(create_glyph(glyphes[i]));
        }
    }
    for (let i = 0; i < glyphes.length; i++) {
        let g = create_glyph(-1);
        if (i < 7) {
            hand_opp_01.appendChild(g);
        } else {
            hand_opp_2345.appendChild(g);
        }
    }

    document.getElementById('hp_j1').innerHTML = me.hp;
    document.getElementById('hp_j0').innerHTML = opp.hp;
    document.querySelector('#pseudo0').querySelector('.pseudo').innerHTML = opp.pseudo;
    document.querySelector('#pseudo1').querySelector('.pseudo').innerHTML = me.pseudo;
}

function init_debug() {
    socket.emit('init_debug');
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('waiting').style.display = 'none';
}

function init() {
    let pseudo;
    do {
        pseudo = prompt('Votre pseudo');
    } while (pseudo === '');
    socket.pseudo = pseudo;
    socket.emit('init', pseudo);
}

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
    log = document.getElementsByClassName('log')[0];
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
    data_game = data;
    console.log('Chargement des images');
    socket.emit('get_list_images');
    text_log('Création de la partie');
});

socket.on('text_log', function(data){
    text_log(data);
});

socket.on('drop_validated', function(){
    let t;
    let src = drop_src;
    let srcParent = drop_srcParent;
    let target = drop_target_zone;
    let target_class = target.getAttribute('class').split(' ')[0];
    let srcParent_class = srcParent.getAttribute('class').split(' ')[0];

    // Si on vise la main, on ne fait pas de remplacement
    if (target_class === 'hand_glyphes_item') {
        add_glyph_to_hand(src); 
    } else if (target_class === 'empty_voie') {
        if (target.hasChildNodes()) {
            t = target.firstElementChild;
            target.replaceChild(src, t);
            if (srcParent_class === 'empty_voie') {
                srcParent.appendChild(t);
            } else if (srcParent_class === 'hand_glyphes_item') {
                add_glyph_to_hand(t);
            }
        } else {
            target.appendChild(src);
        }
    } else if (target_class === 'empty_prodige') {
        src = document.querySelector('#' + src.getAttributeNode('id').value);
        src = get_full_art_prodige(src);
        target.appendChild(src);
        update_regard();
    }
    update_borders();
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
    let prodige = document.querySelector('#' + id);
    prodige = get_full_art_prodige(prodige);
    const empty_prodige = document.querySelector('#empty_prodige_j0 > .empty_prodige');
    empty_prodige.appendChild(prodige);
    update_borders();
    update_regard();
});

socket.on('retire_glyphe_opp', function(voie){
    let glyph = document.createElement("div");
    glyph.setAttribute("class", "glyphe_opp");
    document.getElementById('hand_glyphes_j0').appendChild(glyph);
    document.getElementById('j0-' + voie).innerHTML = "";
    update_borders();
});

socket.on('choix_glyphe_opp', function(data){
    let voie = data['voie'];
    let valeur = data['valeur'];
    let remove = data['remove'];
    let empty_voie = document.getElementById('j0-' + voie);
    let hand = document.querySelector('#hand_glyphes_j0_2345');
    if (hand.children.length === 0) {
        hand = document.querySelector('#hand_glyphes_j0_01');
    }
    if (data['regard']){
        let glyph = document.createElement("div");
        glyph.setAttribute("id", "glyph_opp_regard");
        glyph.setAttribute("class", "glyphe");
        glyph.setAttribute("valeur", valeur);
        glyph.innerHTML = valeur;
        let already_played = empty_voie.firstElementChild;
        if (already_played === null || remove) {
            hand.removeChild(hand.firstElementChild);
        }
        empty_voie.innerHTML = "";
        empty_voie.appendChild(glyph);
    } else {
        let already_played = empty_voie.firstElementChild;
        let glyph = hand.firstElementChild;
        if (already_played === null || remove) {
            empty_voie.appendChild(glyph);
        }
    }
    update_borders();
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
    const btn = document.getElementById('validate_button');
    if (validate) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
});

socket.on('debug', function(str){
    console.log(str);
});

socket.on('update_voies', function(translations) {
    for (let voie in translations) {
        document.querySelector('#voie_' + voie).setAttribute('available', translations[voie]);
    }
});

socket.on('choices_voies', function(effects){
    for (let effect of effects) {
        if (effect.display) {
            voie = document.getElementById('voie_' + effect.element);
            voie.setAttribute('available', 'me');
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
    let prodige = document.querySelector('#empty_prodige_j1 .prodige')
    let g;
    let p = prodige.querySelector('.puissance')
    let d = prodige.querySelector('.degats')
    let node, id, hand;
    let prodige_opp = document.querySelector('#empty_prodige_j0 .prodige')
    let p_opp = prodige_opp.querySelector('.puissance')
    let d_opp = prodige_opp.querySelector('.degats')
    if (state.status === 'done') {
        if (state.label === 'recuperation') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                for (let item of state.choices) {
                    voie = document.getElementById('j1-' + item.element);
                    g = voie.children[0];
                    add_glyph_to_hand(g);
                }
            } else if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                for (let item of state.choices) {
                    voie = document.getElementById('j0-' + item.element);
                    voie.innerHTML = '';
                    add_glyph_to_opp_hand();
                }
            }
        } else if (state.label === 'modif_degats') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) d.innerHTML = Math.max(0, parseInt(d.innerHTML) + state.value);
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) d_opp.innerHTML = Math.max(0, parseInt(d_opp.innerHTML) + state.value);
        } else if (state.label === 'modif_puissance') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) p.innerHTML = Math.max(0, parseInt(p.innerHTML) + state.value);
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) p_opp.innerHTML = Math.max(0, parseInt(p_opp.innerHTML) + state.value);
        } else if (state.label === 'modif_puissance_degats') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                d.innerHTML = Math.max(0, parseInt(d.innerHTML) + state.value);
                p.innerHTML = Math.max(0, parseInt(p.innerHTML) + state.value);
            }
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                d_opp.innerHTML = Math.max(0, parseInt(d_opp.innerHTML) + state.value);
                p_opp.innerHTML = Math.max(0, parseInt(p_opp.innerHTML) + state.value);
            }
        } else if (state.label === 'modif_hp') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) hp.innerHTML = parseInt(hp.innerHTML) + state.value;
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) hp_opp.innerHTML = parseInt(hp_opp.innerHTML) + state.value;
        } else if (state.label === 'stop_talent') {
            // TODO
        } else if (state.label === 'stop_maitrise') {
            // TODO 
        } else if (state.label === 'protection') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) null;
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) null;
        } else if (state.label === 'echange_p') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                p.innerHTML = state.values[0];
                p_opp.innerHTML = state.values[1];
            }
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                p.innerHTML = state.values[1];
                p_opp.innerHTML = state.values[0];
            }
        } else if (state.label === 'echange_d') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                d.innerHTML = state.values[0];
                d_opp.innerHTML = state.values[1];
            }
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                d.innerHTML = state.values[1];
                d_opp.innerHTML = state.values[0];
            }
        } else if (state.label === 'copy_talent') {
            // TODO 
        } else if (state.label === 'copy_maitrise') {
            // TODO
        } else if (state.label === 'oppression') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                for (let item of state.choices) {
                    hand = document.getElementById('hand_glyphes_j1');
                    for (let node of hand.children) {
                        if (node.getAttribute('valeur') === item) {
                            node.remove();
                            break;
                        }
                    }
                }
            } else if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                hand = document.getElementById('hand_glyphes_j0');
                for (let item of state.choices) {
                    hand.removeChild(hand.children[0]);
                }
            }
        } else if (state.label === 'pillage') {
            hand = document.getElementById('hand_glyphes_j1');
            hand_opp = document.getElementById('hand_glyphes_j0');
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                for (let item of state.choices) {
                    for (let node of hand.children) {
                        if (node.getAttribute('valeur') === item) {
                            node.remove();
                            hand_opp.appendChild(create_glyph(-1));
                            break;
                        }
                    }
                }
            } else if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                for (let item of state.choices) {
                    hand_opp.children[0].remove();
                    hand.appendChild(create_glyph(item));
                }
            }
        } else if (state.label === 'initiative') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) null;
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) null;
        } else if (state.label === 'avantage') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) null;
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) null;
        } else if (state.label === 'vampirism') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                hp.innerHTML = parseInt(hp.innerHTML) + state.value;
                hp_opp.innerHTML = parseInt(hp_opp.innerHTML) - state.value;
            }
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                hp.innerHTML = parseInt(hp.innerHTML) - state.value;
                hp_opp.innerHTML = parseInt(hp_opp.innerHTML) + state.value;
            }
        } else if (state.label === 'regard') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) regard = 'me';
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) regard = 'opp';
        } else if (state.label === 'remove_glyph_hand') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) {
                hand = document.getElementById('hand_glyphes_j1');
                for (g of hand.children) {
                    if (g.getAttribute('valeur') === state.value) {
                        g.remove();
                        break;
                    }
                }
            } else if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) {
                document.getElementById('hand_glyphes_j0').children[0].remove();
            }
        } else if (state.label === 'protected') {
            if (state.target === 'own' && state.me
                || state.target === 'opp' && !state.me) text_log('Vous êtes protégés');
            if (state.target === 'opp' && state.me
                || state.target === 'own' && !state.me) text_log('L\'adversaire est protégé');
        }
    } else {
        text_log('En cours : ' + state.status);
    }
});

socket.on('clean_round', function() {
    let ev, g, voie;

    let p0 = document.getElementById('empty_prodige_j0').children[0].firstChild;
    let p1 = document.getElementById('empty_prodige_j1').children[0].firstChild;

    p0.setAttribute('playable', 'false');
    p0.style.backgroundImage = 'none';
    p1.setAttribute('playable', 'false');
    p1.style.backgroundImage = 'none';

    document.getElementById('hand_prodiges_j0').appendChild(p0);
    document.getElementById('hand_prodiges_j1').appendChild(p1);

    for (let i of [0, 1]) {
        for (let element of ['terre', 'air', 'feu', 'eau']) {
            ev = document.getElementById('j' + i + '-' + element);
            g = ev.children[0];
            if (g) {
                if (g.getAttribute('valeur') === '0') {
                    if (i === 0) {
                        add_glyph_to_opp_hand();
                        g.remove();
                    }
                    if (i === 1) add_glyph_to_hand(g);
                } else {
                    g.remove();
                }
            }
            voie = document.querySelector('#voie_' + element);
            voie.setAttribute('available', 'null');
        }
    }

    update_borders();
});

socket.on('end_game', function(winners){
    if (winners.length === 1) {
       text_ig(winners[0] + ' est le plus grand Maître de Dojo ! \\o/');
    } else if (winners.length === 2) {
        text_if('Vous n\'avez pas réussi à vous départager, try again 8)');
    }
    socket.emit('delete_game');
});

socket.on('clean_regard', function(){
    regard = null;
    for (let voie of document.querySelectorAll('.empty_voie')) {
        voie.style.backgroundColor = 'transparent';
    }
});

socket.on('reconnect', function(state){

    // Show playing screen
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('waiting').style.display = 'none';
    document.getElementById('end').style.display = 'none';
    document.getElementById('main').style.display = 'flex';

    let me = state.me;
    let opp = state.opp;

    // Glyphes
    let hand = document.getElementById('hand_glyphes_j1');
    for (let glyph of me.hand){
        hand.appendChild(create_glyph(glyph));
    }
    for (let elem in me.played_glyphs){
        let g = me.played_glyphs[elem];
        if (g > -1) document.getElementById('j1-' + elem).appendChild(create_glyph(g));
    }

    for (let i = 0; i < opp.hand_hist.length; i++) {
        document.getElementById('list_'+ (i+1)).innerText = opp.hand_hist[i];
    }

    hand = document.getElementById('hand_glyphes_j0');
    for (let i = 0; i < opp.hand; i++){
        hand.appendChild(create_glyph(-1));
    }
    for (let elem in opp.played_glyphs){
        let g = opp.played_glyphs[elem];
        if (g > -2) document.getElementById('j0-' + elem).appendChild(create_glyph(g));
    }

    // Prodiges
    for (let prodige in me.prodiges){
        let p = me.prodiges[prodige];
        let data = {'name': prodige, 'p': p.p, 'd': p.d};
        let prod = create_prodige(data);
        if (p.played) {
            document.getElementById('empty_prodige_j1').appendChild(prod);
        } else {
            if (!p.available) prod.setAttribute('available', 'false');
            document.getElementById('hand_prodiges_j1').appendChild(prod);
        }
    }
    for (let prodige in opp.prodiges){
        let p = opp.prodiges[prodige];
        let data = {'name': prodige, 'p': p.p, 'd': p.d};
        let prod = create_prodige(data);
        if (p.played) {
            document.getElementById('empty_prodige_j0').appendChild(prod);
        } else {
            if (!p.available) prod.setAttribute('available', 'false');
            document.getElementById('hand_prodiges_j0').appendChild(prod);
        }
    }

    // Status
    document.getElementById('pseudo').innerText = state.me.pseudo;
    document.getElementById('hp_j0').innerHTML = opp.hp;
    document.getElementById('hp_j1').innerHTML = me.hp;
    //for (let status of ['protection', 'avantage', 'initiative']){
        //if (me[status]) document.getElementById(status).innerHTML = status;
        //if (opp[status]) document.getElementById(status + '_opp').innerHTML = status;
    //}
});

socket.on('list_glyphs_opp', function (list) {
    let values = [1, 2, 3, 4, 5];
    let res;
    res = values.map(x => list.map(y => y === x).reduce((a, b) => a + b));
    for (let i of values) {
        document.getElementById('list_' + i).innerText = res[i-1];
    }
});

socket.on('error_reconnection', function() {
    document.getElementById('room_choice').style.display = 'none';
    document.getElementById('end').style.display = 'none';
    document.getElementById('main').style.display = 'none';
    document.getElementById('waiting').style.display = 'flex';
    document.getElementById('waiting').innerText = 'Erreur lors de la reconnexion';
});

socket.on('list_images', function(list) {
    let images_to_load = list.length;
    for (let name of list) {
        let img = new Image();
        img.onload = function() {
            images_to_load--;
            if (images_to_load === 0) {
                document.getElementById('waiting').style.display = 'none';
                document.getElementById('main').style.display = 'flex';
                init_game(data_game);
            }
        }
        img.src = name;
    }
});

socket.on('choice_voie_valid', function(elem) {
    let node = document.querySelector('#voie_' + elem);
    node.setAttribute('available', 'none');
});

socket.on('choice_voie_maitrise', function() {
    document.querySelector('#voie_button').style.display = 'flex';     
    document.querySelector('#maitrise_button').style.display = 'flex';     
});
