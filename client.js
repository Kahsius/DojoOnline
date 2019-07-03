var socket = io();

var need_click = false;
var num_need_click = 0;
var num_current_click = 0;
var need_click_target = "none";
var drop_src = null;
var drop_srcParent = null;
var drop_target_zone = null;
var choix = null;

function status() {
    console.log('need_click : ' + need_click);
    console.log('num_need_click : ' + num_need_click);
    console.log('num_current_click : ' + num_current_click);
    console.log('need_click_target : ' + need_click_target);
    console.log('choix : ' + choix);
}

function allowDrop(ev){
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop_triggered(ev) {
    drop_src = document.getElementById(ev.dataTransfer.getData("text"));
    drop_srcParent = drop_src.parentNode;
    drop_target_zone = ev.currentTarget;
    
    // On enlève le fait que le glyphe ait été cliqué, d'où qu'il vienne
    // Normalement servira à rien, vu qu'il n'y a pas d'action clickée qui
    // nécessite de déplacer des glyphes, mais sait on jamais
    if (drop_src.getAttribute('class') == 'glyphe'){
        drop_src.setAttribute("clicked", "false")
    }

    // On demande au serveur si le move est légal
    if (choix == 'prodige') {
        prodige = drop_src.getAttribute('id');
        if (drop_target_zone.getAttribute('class') == 'empty_prodige'){
            socket.emit('choix_prodige', prodige);
        } else if (drop_target_zone.getAttribute('class') == 'hand_prodiges'){
            socket.emit('retire_prodige', prodige);
        }
    } else if (choix == 'glyphes') {
        valeur = drop_src.getAttribute('valeur');
        if (drop_target_zone.getAttribute('class') == 'empty_voie'){
            voie = drop_target_zone.getAttribute('id');
            socket.emit('choix_glyphe', {'voie': voie, 'valeur': valeur});
        } else if (drop_target_zone.getAttribute('class') == 'hand_glyphes') {
            voie = drop_srcParent.getAttribute('id');
            socket.emit('retire_glyphe', voie);
        }
    }
}

function check_validate_button() {
    // Est-ce que toutes les voies sont pleines
    var lignePlayer = document.getElementById('ligne_centre_player');
    var glyphes = lignePlayer.children;
    var notEmpty = 0;
    for (var i = 0; i < glyphes.length; i++) {
        if (!glyphes[i].children.length == 0) {
            notEmpty++;
        }
    }
    var all_voies_full = notEmpty == 4;
    
    // Est-ce que le prodige a été joué
    var prodige_played = document.getElementById('empty_prodige_j1').children.length > 0;
    
    // Activation ou non du bouton "Valider"
    var btn = document.getElementById('validate_button');
    var false_btn = document.getElementById('false_button');
    let cond_prodige_played = choix == 'prodige' && prodige_played;
    let cond_glyphe_played = choix == 'glyphes' && all_voies_full;
    let cond_glyphe_chosen = choix == 'select_glyphes'
    if (cond_glyphe_chosen || cond_glyphe_played || cond_prodige_played) {
        btn.style.display = 'flex';
        false_btn.style.display = 'none';
    } else {
        btn.style.display = 'none';
        false_btn.style.display = 'flex';
    }   
}

function drop(ev) {
    ev.preventDefault();
    var src = document.getElementById(ev.dataTransfer.getData("text"));
    var srcParent = src.parentNode;
    var target = ev.currentTarget;
    
    if(srcParent != target) {
        if (src.getAttribute('class') == 'glyphe'
            && ['empty_voie', 'hand_glyphes'].includes(target.getAttribute('class'))) {
            drop_triggered(ev);
        } else if (src.getAttribute('class') == 'prodige'
                   && ['empty_prodige', 'hand_prodiges'].includes(target.getAttribute('class'))) {
            drop_triggered(ev);
        }
    }
}

function click_glyph(ev) {
    node = ev.currentTarget;
    num_current_click = get_num_current_click();
    if (need_click) {
        if ((need_click_target == "voie" && node.parentNode.getAttribute("class") == "empty_voie")
            || (need_click_target == "main" && node.parentNode.getAttribute("class") == "hand_glyphes"))
        if (node.getAttribute("clicked") == "false" && num_current_click < num_need_click) {
            node.setAttribute("clicked", "true");
        } else if (node.getAttribute("clicked") == "true") {
            node.setAttribute("clicked", "false");
        }
    }
}

function get_num_current_click() {
    glyphs = document.getElementsByClassName("glyphe")
    num_current_click = 0;
    for (let i = 0; i < glyphs.length; i++) {
        if (glyphs[i].getAttribute("player") == "self"
           && glyphs[i].getAttribute("clicked") == "true") {
            num_current_click++;
        }
    }
    return num_current_click;
}


function create_glyph(i, v) {
    var glyph = document.createElement("div");
    if (v != -1) {
        glyph.setAttribute("id", "g"+i);
        glyph.setAttribute("draggable", "false");
        glyph.setAttribute("ondragstart", "drag(event)");
        glyph.setAttribute("class", "glyphe");
        glyph.setAttribute("valeur", v);
        if (v != 0) {
            glyph.setAttribute("onclick", "click_glyph(event);");
            glyph.setAttribute("clicked", "false");
        }
        glyph.innerHTML = v;
    } else {
        glyph.setAttribute("class", "glyphe_opp");
    }
    return glyph;
}


function create_prodige(name, opp=false) {
    var prodige = document.createElement("div");
    prodige.setAttribute("id", name);
    prodige.setAttribute("class", "prodige");
    if (!opp) {
        prodige.setAttribute("draggable", "false");
        prodige.setAttribute("ondragstart", "drag(event)");
        prodige.setAttribute('available', 'true')
    }
    prodige.innerHTML = name;
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
        hand_prodiges_opp.appendChild(create_prodige(prodige, opp=true));
    }
    for (var i = 0; i < glyphes.length; i++) {
        hand_player.appendChild(create_glyph(i, glyphes[i]));
        hand_opp.appendChild(create_glyph(i+glyphes.length, -1));
    }   
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

function init_backup() {
    do {
        var pseudo = prompt('Votre pseudo');
    } while (pseudo == '');
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
    log = document.getElementsByClassName('log')[0]
    node = document.createElement('p');
    node.innerHTML = string;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
}

function validate_choice(){
    if (choix == 'prodige'){
        text_log('Envoi du Prodige au combat');
        freeze();
        socket.emit('valide_choix_prodige');
    } else if (choix == 'glyphes'){
        text_log('Validation des Glyphes');
        freeze();
        socket.emit('valide_choix_glyphes');
    }
}

function freeze(){
    // Freeze choix
    choix = 'rien';

    // Freeze prodiges
    prodiges = document.getElementsByClassName('prodige');
    for (prodige of prodiges){
        prodige.setAttribute('draggable', 'false');
    }

    // Freeze glyphes
    glyphs = document.getElementsByClassName('glyphe');
    for (glyph of glyphs){
        glyph.setAttribute('draggable', 'false');
    }

    // Freeze bouton Valider
    var btn = document.getElementById('validate_button');
    var false_btn = document.getElementById('false_button');
    btn.style.display = 'none';
    false_btn.style.display = 'flex';
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

socket.on('text_log', function(string){
    console.log('Texte dans logs')
    text_log(string);
});

socket.on('init_choix_prodige', function() {
    text_log('Choix du prodige');
    choix = 'prodige';
    hand = document.getElementById('hand_prodiges_j1');
    for (child of hand.children) {
        child.setAttribute('draggable', 'true');
    }
});

socket.on('drop_validated', function(){
    src = drop_src;
    srcParent = drop_srcParent;
    target = drop_target_zone;
        
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

    check_validate_button();
});

socket.on('drop_not_validated', function(string){
    text_log(string);
    drop_src = null;
    drop_srcParent = null;
    drop_target_zone = null;
    drop_ev = null;
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
