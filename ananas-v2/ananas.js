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

function verbs(subject, verb) {
    if (subject.the() == "you") {
        return verb;
    } else {
        return verb + "s";
    }
}

var Dir = {
    NORTH: 'north',
    SOUTH: 'south',
    EAST: 'east',
    WEST: 'west',
    NE: 'northeast',
    NW: 'northwest',
    SE: 'southeast',
    SW: 'southwest',
    cmp: function(a,b) {
        a = Dir.canonical_order.indexOf(a);
        b = Dir.canonical_order.indexOf(b);
        return (a < b) ? -1 : (a > b) ? +1 : 0;
    },
};
Dir.canonical_order = [Dir.NORTH, Dir.SOUTH, Dir.EAST, Dir.WEST, Dir.NE, Dir.NW, Dir.SE, Dir.SW];

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
            if (e.keyCode == ROT.VK_RETURN) {
                var text = Game.adventure_input.value;
                Game.adventure_input.value = '';
                if (text.trim() !== '') {
                    Game.alert('> ' + text, {userinput: true});
                    Game.parseAdventureInput(text);
                }
                Game.runGameLoopUntilBlocked();
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
        this._hasEverBeenVisible = {};
        try {
            this._generateMap();
        } catch (e) {
            console.log(e);
        }
        this._populateMap();
        this._oldroom = this.map.room(this.player.x, this.player.y);
        this.alert("You wake up, somewhat disoriented, in %s.".format(this._oldroom.description()));
        this.currentActor = 0;
        this.runGameLoopUntilBlocked();
    },

    runGameLoopUntilBlocked: function() {
        while (true) {
            var actor = this.actors[this.currentActor];
            actor.energy += actor.getSpeed();
            if (actor.energy >= 100) {
                actor.energy = 100;
                var action = actor.getNextAction();
                if (action === null) {
                    break;
                }
                while (action !== null) {
                    action = action.perform(actor);
                }
                this.redrawDisplay();
            }
            this.currentActor = (this.currentActor + 1) % this.actors.length;
        }
        this.redrawDisplay();
        this.reportSurroundings();
    },

    reportSurroundings: function() {
        var newroom = this.map.room(this.player.x, this.player.y);
        if (newroom != this._oldroom) {
            this.alert("You enter %s.".format(newroom.description()));
            this._oldroom = newroom;
        }
    },

    win: function() {
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

    parseRoguelikeInput: function(key) {
        if (Game.is_over) {
            return;
        }
        switch (key) {
            case ROT.VK_PERIOD:
                Game.player.setNextAction(new WaitAction()); return;
            case ROT.VK_SPACE:
            case ROT.VK_RETURN:
                Game.player.setNextAction(new BoxAction()); return;
            case ROT.VK_UP:
                Game.player.setNextAction(new WalkOrFightAction(0, -1)); return;
            case ROT.VK_DOWN:
                Game.player.setNextAction(new WalkOrFightAction(0, 1)); return;
            case ROT.VK_RIGHT:
                Game.player.setNextAction(new WalkOrFightAction(1, 0)); return;
            case ROT.VK_LEFT:
                Game.player.setNextAction(new WalkOrFightAction(-1, 0)); return;
            default:
                return;
        }
    },

    parseAdventureInput: function(text) {
        text = text.trim().toLowerCase();
        switch (text) {
            case 'restart':
                this.newGame();
                return;
        }
        if (this.is_over) {
            this.alert('Please type RESTART to begin a new game.');
            return;
        }
        var room = this.map.room(Game.player.x, Game.player.y);
        assert(room != null);
        assert(room.centroid.length == 2);
        assert(room.neighbors);
        switch (text) {
            case 'quit': case 'q':
                this.is_over = true;
                this.alert('Your game has ended. Type RESTART to begin a new game.');
                return;
            case 'look': case 'l':
                this.alert("You are in %s.".format(this.map.room(this.player.x, this.player.y).description()));
                return;
            case 'north': case 'n':
                if (Dir.NORTH in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.NORTH].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.NORTH));
                }
                return;
            case 'south': case 's':
                if (Dir.SOUTH in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.SOUTH].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.SOUTH));
                }
                return;
            case 'east': case 'e':
                if (Dir.EAST in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.EAST].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.EAST));
                }
                return;
            case 'west': case 'w':
                if (Dir.WEST in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.WEST].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.WEST));
                }
                return;
            case 'northwest': case 'nw':
                if (Dir.NW in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.NW].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.NW));
                }
                return;
            case 'northeast': case 'ne':
                if (Dir.NE in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.NE].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.NE));
                }
                return;
            case 'southwest': case 'sw':
                if (Dir.SW in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.SW].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.SW));
                }
                return;
            case 'southeast': case 'se':
                if (Dir.SE in room.neighbors) {
                    var [dx,dy] = room.neighbors[Dir.SE].centroid;
                    this.player.setStrategy(new MoveTowardStrategy(dx,dy));
                } else {
                    this.alert("You can't go %s from here.".format(Dir.SE));
                }
                return;
            case 'open box': case 'search': case 'search box':
                this.player.setNextAction(new BoxAction());
                return;
            case 'wait': case 'sleep': case 'z':
                this.player.setNextAction(new WaitAction());
                return;
            default:
                this.alert("I don't understand that.");
                return;
        }
    },

    actorsAt: function(x, y) {
        var result = [];
        for (var i = 0; i < this.actors.length; ++i) {
            var a = this.actors[i];
            if (a.x === x && a.y === y) {
                result.push(a);
            }
        }
        return result;
    },

    _generateMap: function() {
        this.ananas = null;
        this.actors = [];
        this.map = new Map(79, 25);
        this.map.generateDungeon();
    },

    _populateMap: function() {
        var freeCells = this.map.getAllPassableCoordinates();
        this.player = this._createBeing(Player, freeCells);
    },

    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        var actor = new what(x, y);
        this.actors.push(actor);
        return actor;
    },

    redrawDisplay: function() {
        var fov = new ROT.FOV.PreciseShadowcasting(Game.map.lightPassesCallback.bind(Game.map));
        var visibleSquares = {};
        fov.compute(this.player.x, this.player.y, 100, function(x, y, r, visibility) {
            visibleSquares[x+','+y] = (visibility > 0.5);
        });
        function isVisible(x, y) { return true || (x+','+y) in visibleSquares; }

        for (var x = 0; x < this.map.width; ++x) {
            for (var y = 0; y < this.map.height; ++y) {
                if (isVisible(x, y)) {
                    var actors = this.actorsAt(x, y);
                    if (actors.length > 0) {
                        function keycmp(a, b) {
                            if (a.displayPriority < b.displayPriority) return 1;
                            if (a.displayPriority > b.displayPriority) return -1;
                            return 0;
                        }
                        actors.sort(keycmp);
                        var [g, fg, bg] = actors[0].getAppearance();
                        this.display.draw(x, y, g, fg, bg);
                    } else {
                        var [g, fg, bg] = this.map.terrain(x, y).appearance;
                        this.display.draw(x, y, g, fg, bg);
                    }
                    this._hasEverBeenVisible[x + ',' + y] = true;
                } else if (this._hasEverBeenVisible[x + ',' + y]) {
                    var multiplier = Math.hypot(Game.player.x - x, Game.player.y - y) / 16;
                    multiplier = Math.min(Math.max(0.00, 1 - multiplier), 1.00);
                    var [g, fg, bg] = this.map.terrain(x, y).appearance;
                    fg = ROT.Color.toHex(ROT.Color.interpolate([64,64,64], ROT.Color.fromString(fg || '#777'), multiplier));
                    this.display.draw(x, y, g, fg, bg);
                } else {
                    this.display.draw(x, y, ' ');
                }
            }
        }
    },
};

///////////////////////////////////////////////////////////////////////////
// ACTORS
//

var Actor = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
    this.energy = 0;
    this.displayPriority = 0;
    this._strategy = null;
};
Actor.prototype.setStrategy = function(strategy) { this._strategy = strategy; };
Actor.prototype.canSee = function(actor) {
    var result = false;
    var fov = new ROT.FOV.PreciseShadowcasting(Game.map.lightPassesCallback.bind(Game.map));
    fov.compute(this.x, this.y, 100, function(x, y, r, visibility) {
        if (x == actor.x && y == actor.y) {
            result = true;
        }
    });
    return result;
};

var Item = function(x, y) {
    Actor.call(this, x, y);
    this.displayPriority = 1;
};
Item.prototype = new Actor();
Item.prototype.getSpeed = function() { return 0; };
Item.prototype.getHit = function(dmg) {}

var Creature = function(x, y) {
    Actor.call(this, x, y);
    this.displayPriority = 50;
    this.hp = 100;
};
Creature.prototype = new Actor();
Creature.prototype.getHit = function(dmg) {
    // TODO: this isn't a very good division of labor here
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp == 0) {
        var i = Game.actors.indexOf(this);
        Game.actors.splice(i, 1);
    }
};

var Player = function(x, y) {
    Creature.call(this, x, y);
    this.displayPriority = 99;
    this.hp = 100;
    this._action = null;
};
Player.prototype = new Creature();
Player.prototype.the = function() { return "you"; };
Player.prototype.getAppearance = function() { return ['@', '#ff0', '#000']; };
Player.prototype.getSpeed = function() { return 10; };
Player.prototype.setNextAction = function(action) { this._action = action; };
Player.prototype.getNextAction = function() {
    console.log('Player.prototype.getNextAction');
    var action = this._action;
    if (this._strategy != null) {
        action = this._strategy.getNextAction(this);
        if (action == null) {
            this._strategy = null;
        }
    }
    this._action = null;
    return action;
};

var MoveTowardStrategy = function(x,y) {
    this.x = x;
    this.y = y;

    var isPassable = function(x, y) {
        return !Game.map.terrain(x, y).blocksWalking;
    }
    this.astar = new ROT.Path.AStar(this.x, this.y, isPassable, {topology:8});
};
MoveTowardStrategy.prototype.getNextAction = function(actor) {
    console.log('MoveTowardStrategy.prototype.getNextAction');

    if (actor.x == this.x && actor.y == this.y) {
        return null;
    }

    var path = [];
    this.astar.compute(actor.x, actor.y, function(x, y) {
        path.push([x, y]);
    });

    if (path.length == 0) {
        if (actor == Game.player) {
            Game.alert("Sorry, I don't know how to get there from here.");
        }
        return null;
    }
    assert(path[0][0] == actor.x && path[0][1] == actor.y);
    assert(path[1][0] != actor.x || path[1][1] != actor.y);
    return new WalkAction(path[1][0] - actor.x, path[1][1] - actor.y);
};

var GridBug = function(x, y) {
    Creature.call(this, x, y);
    this.hp = 10;
};
GridBug.prototype = new Creature();
GridBug.prototype.the = function() { return "the grid bug"; };
GridBug.prototype.getAppearance = function() { return ['x', '#f0f']; };
GridBug.prototype.getSpeed = function() { return 6; };
GridBug.prototype.getNextAction = function() {
    var x = Game.player.x;
    var y = Game.player.y;

    var isPassable = function(x, y) {
        return !Game.map.terrain(x, y).blocksWalking;
    }
    var astar = new ROT.Path.AStar(x, y, isPassable, {topology:4});

    var path = [];
    var pathCallback = function(x, y) {
        path.push([x, y]);
    }
    astar.compute(this.x, this.y, pathCallback);

    if (path.length == 0) {
        return new WaitAction();
    }
    var newX = path[1][0];
    var newY = path[1][1];
    var targets = Game.actorsAt(newX, newY);
    if (targets.length > 0) {
        return new ShockAction(targets[0]);
    } else {
        return new WalkAction(newX - this.x, newY - this.y);
    }
};

///////////////////////////////////////////////////////////////////////////
// ACTIONS
//

var WaitAction = function() {};
WaitAction.prototype.perform = function(actor) {
    actor.energy -= 100;
    return null;
};

var WalkOrFightAction = function(dx, dy) {
    this.dx = dx;
    this.dy = dy;
};
WalkOrFightAction.prototype.perform = function(actor) {
    var newX = actor.x + this.dx;
    var newY = actor.y + this.dy;
    var actors = Game.actorsAt(newX, newY);
    for (var i = 0; i < actors.length; ++i) {
        if (actors[i] instanceof Creature) {
            return new FightAction(actors[i]);
        }
    }
    return new WalkAction(this.dx, this.dy);
};

var WalkAction = function(dx, dy) {
    this.dx = dx;
    this.dy = dy;
};
WalkAction.prototype.perform = function(actor) {
    /* is there a free space? */
    var newX = actor.x + this.dx;
    var newY = actor.y + this.dy;
    if (Game.map.terrain(newX, newY).blocksWalking) {
        Game.alert("%The %s into %the.".format(actor, verbs(actor, "bump"), Game.map.terrain(newX, newY)));
        actor.setStrategy(null);
    } else {
        // Multiple creatures can't normally occupy the same space.
        var actors = Game.actorsAt(newX, newY);
        for (var i = 0; i < actors.length; ++i) {
            if (actors[i] instanceof Creature) {
                if (Game.player.canSee(actor) && Game.player.canSee(actors[i])) {
                    Game.alert("%The %s into %the.".format(actor, verbs(actor, "bump"), actors[i]));
                }
                actor.setStrategy(null);
                return null;
            }
        }
        // Looks like the move is valid.
        actor.x = newX;
        actor.y = newY;
        actor.energy -= 100;
    }
    return null;
};

var FightAction = function(defender) {
    this.defender = defender;
};
FightAction.prototype.perform = function(actor) {
    if (Game.player.canSee(actor) && Game.player.canSee(this.defender)) {
        Game.alert("%The %s %the!".format(actor, verbs(actor, "hit"), this.defender));
    }
    actor.energy -= 100;
    this.defender.getHit(5);
    return null;
};

var BoxAction = function() {};
BoxAction.prototype.perform = function(actor) {
    var itemsHere = Game.actorsAt(actor.x, actor.y);
    if (!itemsHere.some(function(a) { return a instanceof BananaBox; })) {
        Game.alert("There is no box here!");
    } else if (itemsHere.some(function(a) { return a == Game.ananas; })) {
        Game.alert("Hooray! You found an ananas and won this game.");
        Game.win();
    } else {
        Game.alert("This box is empty :-(");
        actor.energy -= 100;
    }
    return null;
};

var ShockAction = function(defender) {
    this.defender = defender;
};
ShockAction.prototype.perform = function(actor) {
    if (Game.player.canSee(actor) && Game.player.canSee(this.defender)) {
        Game.alert("%The %s %the!".format(actor, verbs(actor, "shock"), this.defender));
    }
    actor.energy -= 100;
    this.defender.getHit(1);
    return null;
};

window.onload = function() {
    Game.init();
};
