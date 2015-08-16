/**
 * This is based on https://github.com/robrich/sequencify, but modified to use a WeakMap.
 */

var sequence = function sequence ( map, components, results, missing, recursive, nest ) {
  components.forEach( component => {
		if ( results.indexOf( component ) !== -1 ) {
			return; // de-dup results
		}
		var deps = map.get( component );
		if ( ! deps ) {
			missing.push( component );
		} else if ( nest.indexOf( component ) > -1 ) {
			nest.push( component );
			recursive.push( nest.slice(0) );
			nest.pop( component );
		} else if ( deps.length ) {
			nest.push( component );
			sequence( map, deps, results, missing, recursive, nest ); // recurse
			nest.pop( component );
		}
		results.push( component );
	});
};

// map: WeakMap of map -> deps
// components: array of task components
function sequencify ( map, components ) {
	var results = []; // the final sequence
	var missing = []; // missing map
	var recursive = []; // recursive task dependencies

	sequence( map, components, results, missing, recursive, [] );

	if ( missing.length || recursive.length ) {
		results = []; // results are incomplete at best, completely wrong at worst, remove them to avoid confusion
	}

	return {
		sequence: results,
		missingTasks: missing,
		recursiveDependencies: recursive
	};
}

export default sequencify;

