
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
            return new FightAction(actors[i], Object.keys(actor.attacks).random());
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
    if (tile.movementCost == Infinity) {
        if (actor.currentlyVisibleToPlayer) {
            if (tile.name == 'water' || tile.name == 'seawater') {
                Game.alert("%The can't cross %the.".format(actor, tile));
            } else {
                Game.alert("%The %s into %the.".format(actor, verbs(actor, "bump"), tile));
            }
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
        actor.energy -= 100 * tile.movementCost;
    }
    return null;
};

var FightAction = function(defender, damageType) {
    this.defender = defender;
    this.damageType = damageType;
    console.log('new FightAction defender=%the damageType=%s'.format(defender, damageType));
};
FightAction.prototype.perform = function(attacker) {
    var defender = this.defender;
    var attack = attacker.attacks[this.damageType];
    assert(attack != null);
    var shouldAnnounce = (attacker.currentlyVisibleToPlayer && defender.currentlyVisibleToPlayer);
    var description = '%The %s %the!'.format(attacker, verbs(attacker, this.damageType), defender);
    defender.hp = Math.max(0, defender.hp - attack.strength());
    if (defender.hp == 0) {
        description = '%The %s %the!'.format(attacker, verbs(attacker, 'kill'), defender);
        if (defender != Game.player) {
            // TODO: removing the player from the actors list is never correct; how should we handle this really?
            Game.actors.splice(Game.actors.indexOf(defender), 1);
        } else {
            Game.alert(description);
            description = '*** You have died ***';
            Game.lose();
        }
        // TODO: corpses
    } else {
        defender.whenHitBy(attacker);
    }
    if (shouldAnnounce) {
        Game.alert(description);
    }
    attacker.energy -= 100;
    return null;
};
