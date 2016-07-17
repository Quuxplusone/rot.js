
// The average action should take about 100 energy.
// Waiting can take less time.

var WaitAction = function() {};
WaitAction.prototype.perform = function(actor) {
    actor.energy -= 50;
    return null;
};

var WalkOrFightAction = function(delta) {
    this.delta = delta;
};
WalkOrFightAction.prototype.perform = function(actor) {
    var actors = Game.actorsAt(actor.coordPlus(this.delta));
    for (var i = 0; i < actors.length; ++i) {
        if (actors[i] instanceof Creature) {
            return new FightAction(actors[i]);
        }
    }
    return new WalkAction(this.delta);
};

var WalkAction = function(delta) {
    assert({x:0,y:0}.mooreDistanceTo(delta) == 1);
    this.delta = delta;
};
WalkAction.prototype.perform = function(actor) {
    /* is there a free space? */
    var newCoord = actor.coordPlus(this.delta);
    assert(actor.mooreDistanceTo(newCoord) == 1);
    var tile = Game.map.terrain(newCoord.x, newCoord.y);
    if (tile.blocksWalking) {
        if (actor.currentlyVisibleToPlayer) {
            console.log('bump!');
            Game.alert("%The %s into %the.".format(actor, verbs(actor, "bump"), tile));
        }
        actor.setStrategy(null);
    } else {
        // Multiple creatures can't normally occupy the same space.
        var actors = Game.actorsAt(newCoord);
        for (var i = 0; i < actors.length; ++i) {
            if (actors[i] instanceof Creature) {
                if (actor.currentlyVisibleToPlayer && actors[i].currentlyVisibleToPlayer) {
                    Game.alert("%The %s into %the.".format(actor, verbs(actor, "bump"), actors[i]));
                }
                return null;
            }
        }
        // Looks like the move is valid.
        actor.x = newCoord.x;
        actor.y = newCoord.y;
        actor.energy -= 100;
    }
    return null;
};

var FightAction = function(defender) {
    this.defender = defender;
};
FightAction.prototype.perform = function(actor) {
    if (actor.currentlyVisibleToPlayer && this.defender.currentlyVisibleToPlayer) {
        Game.alert("%The %s %the!".format(actor, verbs(actor, "hit"), this.defender));
    }
    actor.energy -= 100;
    this.defender.getHit(5);
    return null;
};
