"use strict";
/**
 * @fileoverview Shortest path algorithms for unweighted graphs.
 */
goog.provide('jsnx.algorithms.shortest_paths.unweighted');

goog.require('goog.array');
goog.require('goog.iter');
goog.require('goog.object');
goog.require('jsnx.helper');

/**
 * Compute the shortest path lengths from source to all reachable nodes.
 *
 * TODO: example
 *
 * @param {jsnx.classes.Graph} G graph
 * @param {jsnx.Node} source Starting node for path 
 * @param {number=} opt_cutoff 
 *    Depth to stop the search. Only paths of length <= cutoff are returned.
 *
 * @return {!Object} Dictionary of shortest path lengths keyed by target.
 * @export
 */
jsnx.algorithms.shortest_paths.unweighted.single_source_shortest_path_length =
  function(G, source, opt_cutoff) {
    var seen = {}; // level (number of hops) when seen n BFS
    var level = 0; // the current level
    var nextlevel = {}; // dict of nodes to check at next level
    nextlevel[source] = 1;

    while (goog.object.getCount(nextlevel) > 0) {
      var thislevel = nextlevel;
      nextlevel = {};
      /*jshint loopfunc:true*/
      goog.object.forEach(thislevel, function(_, v) {
        if (!goog.object.containsKey(seen, v)) {
          seen[v] = level;
          goog.object.extend(nextlevel, G.get_node(v));
        }
      });
      if (goog.isNumber(opt_cutoff) && opt_cutoff <= level) {
        break;
      }
      level += 1;
    }
  return seen;
};
goog.exportSymbol(
  'jsnx.single_source_shortest_path_length',
  jsnx.algorithms.shortest_paths.unweighted.single_source_shortest_path_length
);

/**
 * Compute the shortest path lengths between all nodes in G.
 *
 * @param {jsnx.classes.Graph} G
 * @param {number=} opt_cutoff  depth to stop the search. 
 *    Only paths of length <= cutoff are returned.
 *
 * @return {!Object}
 * @export
 */
jsnx.algorithms.shortest_paths.unweighted.all_pairs_shortest_path_length = 
  function(G, opt_cutoff) {
    var paths = {};
    jsnx.helper.forEach(G, function(n) {
      paths[n] = 
        jsnx.algorithms.shortest_paths.unweighted.single_source_shortest_path_length(
          G,
          n,
          opt_cutoff
        );
    });
    return paths;
};
goog.exportSymbol(
  'jsnx.all_pairs_shortest_path_length',
  jsnx.algorithms.shortest_paths.unweighted.all_pairs_shortest_path_length
);


/**
 * Return a list of nodes in a shortest path between source and target.
 *
 * @param {jsnx.classes.Graph} G
 * @param {jsnx.Node} source starting node for path
 * @param {jsnx.Node} target ending node for path
 *
 * @return {!Array}
 * @export
 */
jsnx.algorithms.shortest_paths.unweighted.bidirectional_shortest_path = 
  function(G, source, target) {
    source = source.toString();
    target = target.toString();
    // call helper to do the real work
    var results = 
      jsnx.algorithms.shortest_paths.unweighted.bidirectional_pred_succ_(
        G,
        source,
        target
      );
    var pred = results[0];
    var succ = results[1];
    var w = results[2];

    // build path from pred+w+succ
    var path = [];
    // from w to target
    while (goog.isDefAndNotNull(w)) {
      path.push(w);
      w = succ[w];
    }
    // from source to w
    w = pred[path[0]];
    while (goog.isDefAndNotNull(w)) {
      path.unshift(w);
      w = pred[w];
    }
    return path;
};

goog.exportSymbol(
  'jsnx.bidirectional_shortest_path',
  jsnx.algorithms.shortest_paths.unweighted.bidirectional_shortest_path
);


/**
 * Bidirectional shortest path helper. 
 *
 * @return {!Array} Returns [pred,succ,w] where
 *    pred is a dictionary of predecessors from w to the source, and
 *    succ is a dictionary of successors from w to the target.
 *
 * @private
 */
jsnx.algorithms.shortest_paths.unweighted.bidirectional_pred_succ_ =
  function(G, source, target) {
    // does BFS from both source and target and meets in the middle
    if (!goog.isDef(source) || !goog.isDef(target)) {
      throw new jsnx.exception.JSNetworkXException(
        'Bidirectional shortest path called without source or target'
      );
    }

    var pred = {};
    var succ = {};
    if (target === source) {
      pred[target] = null;
      succ[source] = null;
      return [pred, succ, source];
    }

    // handle either directed or undirected
    var Gpred, Gsucc;
    if (G.is_directed()) {
      Gpred = G.predecessors_iter;
      Gsucc = G.successors_iter;
    }
    else {
      Gpred = G.neighbors_iter;
      Gsucc = G.neighbors_iter;
    }

    // predecesssor and successors in search
    pred[source] = null;
    succ[target] = null;
    // initialize fringes, start with forward
    var forward_fringe = [source];
    var reverse_fringe = [target];
    var this_level;
    var result;

    /*jshint loopfunc:true*/
    while (forward_fringe.length > 0 && reverse_fringe.length > 0 && !result) {
      if (forward_fringe.length <= reverse_fringe.length) {
        this_level = forward_fringe;
        forward_fringe = [];
        goog.array.forEach(this_level, function(v) {
          if (result) {
            return;
          }
          goog.iter.forEach(Gsucc.call(G, v), function(w) {
            if (result) {
              return;
            }
            if (!goog.object.containsKey(pred, w)) {
              forward_fringe.push(w);
              pred[w] = v;
            }
            if (goog.object.containsKey(succ, w)) {
              result = [pred, succ, w]; // found path
            }
          });
        });
      }
      else {
        this_level = reverse_fringe;
        reverse_fringe = [];
        goog.array.forEach(this_level, function(v) {
          if (result) {
            return;
          }
          goog.iter.forEach(Gpred.call(G, v), function(w) {
            if (result) {
              return;
            }
            if (!goog.object.containsKey(succ, w)) {
              succ[w] = v;
              reverse_fringe.push(w);
            }
            if (goog.object.containsKey(pred, w)) {
              result = [pred, succ, w];
            }
          });
        });
      }
    }

    if (result) {
      return result;
    }
    else {
      throw new jsnx.exception.JSNetworkXNoPath(
        'No path between ' + source + ' and ' + target + '.'
      );
    }
};


/**
 * Compute shortest path between source
 * and all other nodes reachable from source.
 * 
 * Note:
 * The shortest path is not necessarily unique. So there can be multiple⋅
 * paths between the source and each target node, all of which have the⋅
 * same 'shortest' length. For each target node, this function returns⋅
 * only one of those paths.
 *
 * @param {jsnx.classes.Graph} G 
 * @param {jsnx.Node} source
 * @param {number=} opt_cutoff Depth to stop the search.
 *    Only paths of length <= cutoff are returned.
 *
 * @return {!Object} Dictionary, keyed by target, of shortest paths.
 * @export
 */
jsnx.algorithms.shortest_paths.unweighted.single_source_shortest_path =
  function(G, source, opt_cutoff) {
    source = source.toString();
    var level = 0;
    var nextlevel = {};
    nextlevel[source] = 1;
    var paths = {};
    paths[source] = [source];
    if (opt_cutoff === 0) {
      return paths;
    }
    /*jshint loopfunc:true*/
    while (goog.object.getCount(nextlevel) > 0) {
      var thislevel = nextlevel;
      nextlevel = {};
      goog.object.forEach(thislevel, function(_, v) {
        goog.object.forEach(G.get_node(v), function(_, w) {
          if (!goog.object.containsKey(paths, w)) {
            paths[w] = paths[v].concat([w]);
            nextlevel[w] = 1;
          }
        });
      });
      level = level + 1;
      if (goog.isDef(opt_cutoff) && opt_cutoff <= level) {
        break;
      }
    }
    return paths;
};
goog.exportSymbol(
  'jsnx.single_source_shortest_path',
  jsnx.algorithms.shortest_paths.unweighted.single_source_shortest_path
);


/**
 * Compute shortest paths between all nodes. 
 *
 * @param {jsnx.classes.Graph} G
 * @param {number=} opt_cutoff Depth to stop the search.
 *    Only paths of length <= cutoff are returned.
 * 
 * @return {!Object} Dictionary, keyed by source and target, of shortest paths.
 * @export
 */
jsnx.algorithms.shortest_paths.unweighted.all_pairs_shortest_path = 
  function(G, opt_cutoff) {
    var paths = {};
    jsnx.helper.forEach(G, function(n) {
      paths[n] = 
        jsnx.algorithms.shortest_paths.unweighted.single_source_shortest_path(
          G,
          n,
          opt_cutoff
        );
    });
    return paths;
};
goog.exportSymbol(
  'jsnx.all_pairs_shortest_path',
  jsnx.algorithms.shortest_paths.unweighted.all_pairs_shortest_path
);


/**
 *  Returns dictionary of predecessors for the path from source 
 *  to all nodes in G.
 *
 *  @param {jsnx.classes.Graph} G
 *  @param {jsnx.Node} source Starting node for path
 *  @param {?jsnx.Node=} opt_target Ending node for path.
 *    If provided only predecessors between⋅source and target are returned
 *  @param {?number=} opt_cutoff Depth to stop the search.
 *    Only paths of length <= cutoff are returned.
 *  @param {boolean=} opt_return_seen
 *
 *  @return {!Object} Dictionary, keyed by node, 
 *    of predecessors in the shortest path.
 *  @export
 */
jsnx.algorithms.shortest_paths.unweighted.predecessor = 
  function(G, source, opt_target, opt_cutoff, opt_return_seen) {
    source = source.toString();
    var level = 0;
    var nextlevel = [source];
    var seen = {};
    seen[source] = level;
    var pred = {};
    pred[source] = [];

    /*jshint loopfunc:true*/
    while (nextlevel.length > 0) {
      level += 1;
      var thislevel = nextlevel;
      nextlevel = [];
      goog.array.forEach(thislevel, function(v) {
        goog.object.forEach(G.get_node(v), function(_, w) {
          if (!goog.object.containsKey(seen, w)) {
            pred[w] = [v];
            seen[w] = level;
            nextlevel.push(w);
          }
          else if (seen[w] === level) { // add v to predecesssor list if it
            pred[w].push(v);            // is at the correct level
          }
        });
      });
      if (goog.isDefAndNotNull(opt_cutoff) && opt_cutoff <= level) {
        break;
      }
    }

    if (goog.isDefAndNotNull(opt_target)) {
      opt_target = opt_target.toString();
      if (opt_return_seen) {
        if (!goog.object.containsKey(pred, opt_target)) {
          return [[], -1];
        }
        return [pred[opt_target], seen[opt_target]];
      }
      else {
        if (!goog.object.containsKey(pred, opt_target)) {
          return [];
        }
        return pred[opt_target];
      }
    }
    else {
      if (opt_return_seen) {
        return [pred, seen];
      }
      else {
        return pred;
      }
    }
};

goog.exportSymbol(
  'jsnx.predecessor',
  jsnx.algorithms.shortest_paths.unweighted.predecessor
);
