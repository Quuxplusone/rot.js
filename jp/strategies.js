
var MoveTowardStrategy = function(coord) {
    this._coord = {x: coord.x, y: coord.y};
};
MoveTowardStrategy.prototype.getNextAction = function(actor) {
    console.log('evaluating MoveTowardStrategy for %the'.format(actor));
    if (actor.coordEquals(this._coord)) {
        // The current strategy has succeeded; time to pick a new strategy.
        return null;
    }
    var delta = actor.deltaToward(this._coord);
    if (actor.canPass(actor.coordPlus(delta))) {
        return new WalkAction(delta);
    } else {
        var dirs = [delta.deltaRotateLeft(), delta.deltaRotateRight()].randomize();
        if (actor.canPass(actor.coordPlus(dirs[0]))) {
            return new WalkAction(dirs[0]);
        } else if (actor.canPass(actor.coordPlus(dirs[1]))) {
            return new WalkAction(dirs[1]);
        } else {
            // The current strategy has failed; time to pick a new strategy.
            return null;
        }
    }
    assert(false);
};

var MoveAwayFromStrategy = function(coord) {
    this._coord = {x: coord.x, y: coord.y};
};
MoveAwayFromStrategy.prototype.getNextAction = function(actor) {
    console.log('evaluating MoveAwayFromStrategy for %the'.format(actor));
    if (actor.coordEquals(this._coord)) {
        var delta = randomDelta();
    } else {
        var delta = actor.deltaToward(this._coord).deltaInvert();
    }
    if (actor.canPass(actor.coordPlus(delta))) {
        return new WalkAction(delta);
    } else {
        var dirs = [delta.deltaRotateLeft(), delta.deltaRotateRight()].randomize();
        if (actor.canPass(actor.coordPlus(dirs[0]))) {
            return new WalkAction(dirs[0]);
        } else if (actor.canPass(actor.coordPlus(dirs[1]))) {
            return new WalkAction(dirs[1]);
        } else {
            // The current strategy has failed; time to pick a new strategy.
            return null;
        }
    }
    assert(false);
};

var ExploreStrategy = function(actor, target) {
    if (target == null) {
        var delta = randomDelta();
        target = {x: actor.x + 5*delta.x, y: actor.y + 5*delta.y};
    }
    this._target = {x: target.x, y: target.y};
    this._path = aStarDistanceAndPath(actor, this._target, 20, function(coord) {
        if (!actor.canPass(coord)) return Infinity;
        return 1;
    })[1];
};
ExploreStrategy.prototype.getNextAction = function(actor) {
    console.log('evaluating ExploreStrategy for %the'.format(actor));
    if (this._path.length == 0 || actor.coordEquals(this._target)) {
        return null;  // we've reached the target, or it's unreachable
    }
    // Follow the preordained path, if possible.
    var next = this._path.shift();
    if (actor.mooreDistanceTo(next) == 1) {
        if (actor.canPass(next)) {
            return new WalkAction(actor.deltaToward(next));
        }
    }
    // Otherwise, step around obstacles if possible.
    this.path = aStarDistanceAndPath(actor, this._target, 20, function(coord) {
        if (!actor.canPass(coord)) return Infinity;
        return 1;
    })[1];
    return this.getNextAction(actor);
};

var HuntBySightStrategy = function(prey) {
    this._prey = prey;
    this._preycoord = null;
    this._boredom = 0;
};
HuntBySightStrategy.prototype.getNextAction = function(actor) {
    console.log('evaluating HuntBySightStrategy (%the) for %the'.format(this._prey, actor));
    if (this._prey.hp <= 0) {
        return null;  // the hunt is over
    }
    if (actor.mooreDistanceTo(this._prey) == 1) {
        return new FightAction(this._prey, Object.keys(actor.attacks).random());
    }
    if (actor.canSee(this._prey)) {
        // Try to move in a straight line toward the prey.
        this._preycoord = {x:this._prey.x, y:this._prey.y};
        var s = new MoveTowardStrategy(this._prey);
        var action = s.getNextAction(actor);
        if (action != null) {
            return action;
        }
    } else {
        // Move toward the last known location of the prey.
        var s = new MoveTowardStrategy(this._preycoord);
        var action = s.getNextAction(actor);
        if (action != null) {
            return action;
        }
    }
    // Otherwise, set a timer after which we'll switch tactics.
    this._boredom += 1;
    if (this._boredom < 10) {
        return new WaitAction();
    }
    return null; // we're bored; switch tactics
};

var HuntSmartlyStrategy = function(prey) {
    this._prey = prey;
    this._preycoord = null;
    this._boredom = 0;
};
HuntSmartlyStrategy.prototype.getNextAction = function(actor) {
    console.log('evaluating HuntSmartlyStrategy (%the) for %the'.format(this._prey, actor));
    if (this._prey.hp <= 0) {
        return null;  // the hunt is over
    }
    if (actor.mooreDistanceTo(this._prey) == 1) {
        return new FightAction(this._prey, Object.keys(actor.attacks).random());
    }
    if (actor.canSee(this._prey)) {
        // Try to move in a straight line toward the prey.
        this._preycoord = {x:this._prey.x, y:this._prey.y};
        var s = new ExploreStrategy(actor, this._prey);
        var action = s.getNextAction(actor);
        if (action != null) {
            return action;
        }
    } else {
        // Move toward the last known location of the prey.
        var s = new ExploreStrategy(actor, this._preycoord);
        var action = s.getNextAction(actor);
        if (action != null) {
            return action;
        }
    }
    // Otherwise, set a timer after which we'll switch tactics.
    this._boredom += 1;
    if (this._boredom < 10) {
        return new WaitAction();
    }
    return null; // we're bored; switch tactics
};

var FleeStrategy = function(predator) {
    this._predator = predator;
    this._predatorcoord = null;
    this._boredom = 0;
};
FleeStrategy.prototype.getNextAction = function(actor) {
    console.log('evaluating FleeStrategy (%the) for %the'.format(this._predator, actor));
    if (this._predator.hp <= 0) {
        return null;  // the hunt is over
    }
    if (actor.canSee(this._predator)) {
        // Try to move in a straight line away from the predator.
        this._predatorcoord = {x:this._predator.x, y:this._predator.y};
        var s = new MoveAwayFromStrategy(this._predator);
        var action = s.getNextAction(actor);
        if (action != null) {
            return action;
        }
    } else {
        // Move away from the last known location of the predator.
        var s = new MoveAwayFromStrategy(this._predatorcoord);
        var action = s.getNextAction(actor);
        if (action != null) {
            return action;
        }
    }
    // Otherwise, set a timer after which we'll switch tactics.
    this._boredom += 1;
    if (this._boredom > 10) return null;  // we're bored, switch tactics
    if (actor.mooreDistanceTo(this._predator) == 1) {
        return new FightAction(this._predator, Object.keys(actor.attacks).random());
    }
    return new WaitAction();  // can't get away, but can't fight either
};
