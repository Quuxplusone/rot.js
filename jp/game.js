String.format.map.the = "the";

ROT.RNG.getNormalInt = function(min, max) {
    var x = this.getNormal((min + max + 1) / 2, (max - min + 1) / 4);
    return Math.min(Math.max(min, Math.round(x)), max);
};

var assert = function(x, message) {
    console.assert(x, message);
    if (!x) {
        throw 'assert failed';
    }
};

function createGrid(x, y, f) {
    var arr = new Array(x);
    for (var i=0; i < x; ++i) {
        arr[i] = new Array(y);
        for (var j=0; j < y; ++j) {
            arr[i][j] = f(i,j);
        }
    }
    return arr;
}

function verbs(subject, verb) {
    if (subject.the() == "you") {
        return verb;
    } else if (verb.endsWith('h')) {
        return verb + "es";
    } else {
        return verb + "s";
    }
}

var Game = {
    init: function() {
        this.display = new ROT.Display({
            width: 79,
            height: 25,
            spacing: 1.1,
        });
        this.level = document.querySelector("#level");
        this.legend = document.querySelector("#legend");
        this.prompt = document.querySelector("#prompt");
        this.adventure_input = document.querySelector("#adventure_input");
        this.level.appendChild(this.display.getContainer());

        this.level.addEventListener("keydown", function(e) {
            Game.parseRoguelikeInput(e.keyCode);
            Game.runGameLoopUntilBlocked();
        });
        this.adventure_input.addEventListener("keyup", function(e) {
            this.undo_buffer = this.undo_buffer || [''];
            this.undo_buffer_pos = this.undo_buffer_pos || 0;
            if (e.keyCode == ROT.VK_RETURN) {
                var text = Game.adventure_input.value;
                Game.adventure_input.value = '';
                if (text.trim() !== '') {
                    if (this.undo_buffer.length==1 || text != this.undo_buffer[this.undo_buffer.length-2]) {
                        this.undo_buffer[this.undo_buffer.length-1] = text;  // replace the command that was in progress
                        this.undo_buffer.push('');  // start a new command in progress
                    }
                    if (this.undo_buffer.length > 50) {
                        this.undo_buffer.shift();  // just to keep it from growing without bound
                    }
                    Game.alert('> ' + text, {userinput: true});
                    Game.parseAdventureInput(text);
                }
                this.undo_buffer_pos = this.undo_buffer.length-1;
                Game.runGameLoopUntilBlocked();
            } else if (e.keyCode == ROT.VK_UP) {
                if (this.undo_buffer_pos == this.undo_buffer.length-1) {
                    this.undo_buffer[this.undo_buffer_pos] = Game.adventure_input.value;  // save the command in progress
                }
                if (this.undo_buffer_pos != 0) {
                    this.undo_buffer_pos -= 1;
                    Game.adventure_input.value = this.undo_buffer[this.undo_buffer_pos];
                }
            } else if (e.keyCode == ROT.VK_DOWN) {
                if (this.undo_buffer_pos < this.undo_buffer.length-1) {
                    this.undo_buffer_pos += 1;
                    Game.adventure_input.value = this.undo_buffer[this.undo_buffer_pos];
                }
            } else {
                this.undo_buffer_pos = this.undo_buffer.length-1;
            }
        });

        this.newGame();
    },

    newGame: function() {
        // Clear the accumulated text in the legend box.
        while (this.legend.firstChild != this.prompt) {
            this.legend.removeChild(this.legend.firstChild);
        }
        this.adventure_input.value = '';
        this.legend.scrollTop = this.legend.scrollHeight;
        this.is_over = false;
        this.playersNextAction = null;
        try {
            this._generateMap();
        } catch (e) {
            console.log(e);
        }
        this._populateMap();
        this.alert("Welcome.");
        this.currentActor = 0;
        this.runGameLoopUntilBlocked();
    },

    runGameLoopUntilBlocked: function() {
        while (true) {
            var actor = this.actors[this.currentActor];
            if (!actor.currentlyVisibleToPlayer && actor.manhattanDistanceTo(Game.player) > 40) {
                // Skip this actor, for speed.
            } else {
                if (actor.energy < 100) {
                    actor.energy = Math.min(actor.energy + actor.getSpeed(), 100);
                    actor.hp = Math.min(actor.hp + actor.maxhp/1000, actor.maxhp);  // regenerate some HP
                }
                if (actor.energy >= 100) {
                    var action = actor.getNextAction();
                    assert(action !== undefined, actor.the());
                    if (action == null) {
                        break;
                    }
                    while (action != null) {
                        action = action.perform(actor);
                        assert(action !== undefined);
                    }
                }
            }
            this.currentActor = (this.currentActor + 1) % this.actors.length;
        }
        this.redrawDisplay();
    },

    win: function() {
        Game.is_over = true;
    },

    lose: function() {
        Game.is_over = true;
    },

    alert: function(message, options) {
        options = options || {
            userinput: false
        };
        var p = document.createElement('p');
        var span = document.createTextNode(message);
        p.appendChild(span);
        if (options['userinput']) {
            p.setAttribute('class', 'copy-of-user-input');
        }
        this.legend.insertBefore(p, this.prompt);
        this.legend.scrollTop = this.legend.scrollHeight;
    },

    setPlayer: function(actor) {
        this.player = actor;
        actor.the = function() { return "you"; };
        actor._getAppearance = actor.getAppearance;
        actor.getAppearance = function() {
            var [g, fg, bg] = this._getAppearance.call(this);
            if (Game.is_over) {
                return ['Ω', '#ff0', bg];
            } else {
               return [g, '#ff0', bg];
            }
        };
        actor.getNextAction = function() {
            Game.redrawDisplay();
            if (this._strategy != null) {
                var a = this._strategy.getNextAction(this);
                assert(a !== undefined);
                if (a !== null) return a;
                this.setStrategy(null);
                Game.alert('Your strategy has run out.');
            }
            var a = this._action;
            this._action = null;
            return a;
        };
        actor.setNextAction = function(a) { this._action = a; };
        actor.setNextAction(null);
    },

    parseRoguelikeInput: function(key) {
        this.has_been_over = this.has_been_over || false;
        if (Game.is_over) {
            if (!this.has_been_over) {
                Game.alert('Please type RESTART to begin a new game.');
                this.has_been_over = true;
            }
            return;
        } else {
            this.has_been_over = false;
        }
        switch (key) {
            case ROT.VK_PERIOD:
                Game.player.setNextAction(new WaitAction()); return;
            case ROT.VK_UP:
                Game.player.setNextAction(new WalkOrFightAction({x:0, y:-1})); return;
            case ROT.VK_DOWN:
                Game.player.setNextAction(new WalkOrFightAction({x:0, y:1})); return;
            case ROT.VK_RIGHT:
                Game.player.setNextAction(new WalkOrFightAction({x:1, y:0})); return;
            case ROT.VK_LEFT:
                Game.player.setNextAction(new WalkOrFightAction({x:-1, y:0})); return;
            default:
                return;
        }
    },

    parseAdventureInput: function(text) {
        text = text.trim().toLowerCase();
        switch (text) {
            case 'restart':
                Game.newGame();
                return;
        }
        if (Game.is_over) {
            Game.alert('Please type RESTART to begin a new game.');
            return;
        }
        if (text.startsWith('sethp ')) {
            Game.player.hp = +(text.substring(6));
            Game.alert('You have %s hit points remaining (out of %s).'.format(Game.player.hp, Game.player.maxhp));
            //Game.redrawDisplay();
            return;
        }
        switch (text) {
            case 'quit': case 'q':
                Game.is_over = true;
                Game.alert('Your game has ended. Type RESTART to begin a new game.');
                return;
            case 'explore':
                Game.player.setStrategy(new ExploreStrategy(Game.player));
                return;
            case 'diagnose':
                Game.alert('You have %s hit points remaining (out of %s).'.format(Math.round(Game.player.hp), Game.player.maxhp));
                break;
            default:
                Game.alert("I don't understand that.");
                return;
        }
    },

    actorsAt: function(coord) {
        return this.actors.filter(function(a) { return a.coordEquals(coord); });
    },

    _generateMap: function() {
        this.actors = [];
        this.map = new Map(100, 100);
        console.log('Generating the map...');
        this.map.generateDungeon();
    },

    _populateMap: function() {
        console.log('Placing the player...');
        this.player = null;
        for (var i=0; i < 1000; ++i) {
            var x = ROT.RNG.getUniformInt(0, this.map.width-1);
            var y = ROT.RNG.getUniformInt(0, this.map.height-1);
            console.log(x,y);
            var dino = new Human(x,y);
            if (dino.canPass({x:x,y:y})) {
                this.actors.push(dino);
                this.setPlayer(dino);
                break;
            }
        }
        assert(this.player != null);

        console.log('Placing compys...');
        for (var i = 0; i < 2; ++i) {
            var x = ROT.RNG.getUniformInt(0, this.map.width-1);
            var y = ROT.RNG.getUniformInt(0, this.map.height-1);
            var num_dinos = ROT.RNG.getNormalInt(3,10);
            for (var t2 = 0; t2 < num_dinos; ++t2) {
                var tx = ROT.RNG.getNormalInt(x-5, x+5);
                var ty = ROT.RNG.getNormalInt(y-5, y+5);
                var dino = new Procompsognathus(tx,ty);
                if (dino.canPass(dino)) {
                    this.actors.push(dino);
                }
            }
        }

        console.log('Placing allosaurs...');
        for (var i = 0; i < 2; ++i) {
            var x = ROT.RNG.getUniformInt(0, this.map.width-1);
            var y = ROT.RNG.getUniformInt(0, this.map.height-1);
            var dino = new Allosaurus(x,y);
            if (dino.canPass(dino)) {
                this.actors.push(dino);
            }
        }

        console.log('Placing velociraptors...');
        for (var i = 0; i < 1; ++i) {
            var x = ROT.RNG.getUniformInt(0, this.map.width-1);
            var y = ROT.RNG.getUniformInt(0, this.map.height-1);
            var num_dinos = 3;
            for (var t2 = 0; t2 < num_dinos; ++t2) {
                var tx = ROT.RNG.getNormalInt(x-5, x+5);
                var ty = ROT.RNG.getNormalInt(y-5, y+5);
                var dino = new Velociraptor(tx,ty);
                if (dino.canPass(dino)) {
                    this.actors.push(dino);
                }
            }
        }
    },

    interpolateVis: function(fg, vis) {
        return ROT.Color.toHex(ROT.Color.interpolate([64,64,64], ROT.Color.fromString(fg || '#777'), vis));
    },

    interpolateBloodshot: function(color, bloodshotRadius, actualRadius) {
        var normalized = (actualRadius - bloodshotRadius) * 0.4;
        var sigmoided = 1 / (1 + Math.exp(-normalized));
        return ROT.Color.toHex(ROT.Color.interpolate(ROT.Color.fromString(color || '#000'), [200,0,0], sigmoided));
    },

    redrawDisplay: function() {
        var display_width = this.display.getOptions().width;
        var display_height = this.display.getOptions().height;

        // Coordinates of the upper left corner.
        var dx = Math.min(Math.max(0, Game.player.x - Math.floor(display_width/2)), Game.map.width - display_width);
        var dy = Math.min(Math.max(0, Game.player.y - Math.floor(display_height/2)), Game.map.height - display_height);

        var inDisplay = function(x,y) { return (dx <= x && x < dx+display_width) && (dy <= y && y < dy+display_height); };

        var _visibility = createGrid(display_width, display_height, function(){ return 0; });
        var getVis = function(x,y) { return _visibility[x-dx][y-dy]; };
        var setVis = function(x,y,v) { if (inDisplay(x,y)) _visibility[x-dx][y-dy] = v; };
        var addVis = function(x,y,v) {
            if (inDisplay(x,y)) {
                _visibility[x-dx][y-dy] = Math.min(_visibility[x-dx][y-dy] + v, 1.0);
            }
        };

        var lightPasses = function(x,y) {
            return inDisplay(x,y) && !Game.map.terrain(x,y).blocksSight;
        };
        var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
        var maxVisRadius = Math.max(display_width, display_height);
        fov.compute(this.player.x, this.player.y, maxVisRadius, function(x, y, r, value) {
            if (!inDisplay(x,y)) return;
            addVis(x,y, value);
            addVis(x+1,y, value/10);
            addVis(x-1,y, value/10);
            addVis(x,y+1, value/10);
            addVis(x,y-1, value/10);
        });
        setVis(Game.player.x, Game.player.y, 1.0);

        for (var i = 0; i < this.actors.length; ++i) {
            this.actors[i].currentlyVisibleToPlayer = false;
        }

        var visThreshold = 0.3 - 0.2*(Game.player.hp / Game.player.maxhp);  // 0.1 but increase as you get hurt
        var distanceToEdgeOfDisplay = Math.max(
            Game.player.euclideanDistanceTo({x:dx,y:dy}),
            Game.player.euclideanDistanceTo({x:dx + display_width, y:dy}),
            Game.player.euclideanDistanceTo({x:dx, y:dy + display_height}),
            Game.player.euclideanDistanceTo({x:dx + display_width, y:dy + display_height})
        );
        var bloodshotRadius = distanceToEdgeOfDisplay * Game.player.hp / (0.6*Game.player.maxhp);  // at 60% health you start seeing red
        if (Game.is_over) {
            bloodshotRadius = Infinity;
        }

        for (var x = dx; x < dx + display_width; ++x) {
            for (var y = dy; y < dy + display_height; ++y) {
                var vis = getVis(x, y);
                var [g, fg, bg] = [' ', '#777', '#000'];
                if (vis >= visThreshold) {
                    var actors = this.actorsAt({x:x,y:y});
                    // TODO: actors can be hard to spot
                    if (actors.length > 0) {
                        function keycmp(a, b) {
                            if (a.displayPriority < b.displayPriority) return 1;
                            if (a.displayPriority > b.displayPriority) return -1;
                            return 0;
                        }
                        actors.sort(keycmp);
                        [g, fg, bg] = actors[0].getAppearance();
                        actors[0].currentlyVisibleToPlayer = true;
                        fg = this.interpolateVis(fg, vis);
                    } else {
                        [g, fg, bg] = this.map.terrain(x, y).appearance;
                        fg = this.interpolateVis(fg, vis);
                    }
                }
                fg = this.interpolateBloodshot(fg, bloodshotRadius, Game.player.euclideanDistanceTo({x:x,y:y})-5);
                bg = this.interpolateBloodshot(bg, bloodshotRadius, Game.player.euclideanDistanceTo({x:x,y:y}));
                this.display.draw(x-dx, y-dy, g, fg, bg);
            }
        }
    },
};

window.onload = function() {
    Game.init();
};
