var aStarDistanceAndPath = function(fromCoord, toCoord, maxCost, costCallback) {
    var frontier = [{
        x: fromCoord.x,
        y: fromCoord.y,
        cost: 0,
        estimatedTotalCost: Infinity,
        path: [],
    }];
    var visited = {};
    visited[fromCoord.coordKey()] = frontier[0];

    function visit(newcoord, oldpath, oldcost) {
        var newCost = oldcost + costCallback(newcoord);
        if (newCost >= maxCost) return;
        var key = newcoord.coordKey();
        if (!(key in visited)) {
            visited[key] = {
                x: newcoord.x,
                y: newcoord.y,
                estimatedTotalCost: Infinity,
            };
        }
        var avgCostPerStep = newCost / (oldpath.length + 1);
        var estimatedTotalCost = newCost + (newcoord.mooreDistanceTo(toCoord) * avgCostPerStep/2);
        if (visited[key].estimatedTotalCost > estimatedTotalCost) {
            visited[key].estimatedTotalCost = estimatedTotalCost;
            visited[key].cost = newCost;
            visited[key].path = oldpath.slice();
            visited[key].path.push({x:newcoord.x, y:newcoord.y});
            var idx = frontier.indexOf(visited[key]);
            if (idx !== -1) {
                frontier.splice(idx,1);
            }
            for (idx = 0; idx < frontier.length; ++idx) {
                if (frontier[idx].estimatedTotalCost > estimatedTotalCost) {
                    break;
                }
            }
            frontier.splice(idx,0,visited[key]);
        }
    };

    var [bestDist, bestPath] = [Infinity, []];
    while (frontier.length) {
        var item = frontier.shift();
        var dist = item.mooreDistanceTo(toCoord);
        if (dist == 0) {
            [bestDist, bestPath] = [0, item.path];
            break;
        } else if (dist < bestDist) {
            [bestDist, bestPath] = [dist, item.path];
        }
        // Otherwise, add each neighbor to the frontier.
        visit(item.coordPlus({x:-1,y:-1}), item.path, item.cost);
        visit(item.coordPlus({x: 0,y:-1}), item.path, item.cost);
        visit(item.coordPlus({x:+1,y:-1}), item.path, item.cost);
        visit(item.coordPlus({x:-1,y: 0}), item.path, item.cost);
        visit(item.coordPlus({x:+1,y: 0}), item.path, item.cost);
        visit(item.coordPlus({x:-1,y:+1}), item.path, item.cost);
        visit(item.coordPlus({x: 0,y:+1}), item.path, item.cost);
        visit(item.coordPlus({x:+1,y:+1}), item.path, item.cost);
    }
    return [bestDist, bestPath];  // it's unreachable
};
