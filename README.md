# cancAll

Create a cancellable wrapper for an arbitrary tree of async tasks.

# Usage

Read the tests for a thorough understanding.

Basic usage:

```javascript
// Import cancAll
var cancAll = require('cancAll');


// Create a cancellable task wrapper
var task = cancAll();


// Wrap required functions in cancellability
var someTask = task(function(callback){

    // Respond after 1 second.
    setTimeout(function(){
        callback(null, 'result');
    }, 1000);
});

var someDependantTask = task(function(callback){

    // call `someTask` and passthrough results.
    someTask(callback);
});

// use your wrapped function

someDependantTask(function(error, result){

    // Error from cancellation below.
    error.message === 'Reason for cancellation'
});

// Cancel the task while in flight

task.cancel(new Error('Reason for cancellation'));

```

More useful, deep task graph usage:


```javascript
var cancAll = require('cancAll');


// Define some nicely decoupled tasks.
function getNumber(callback){
    setTimeout(function(){
        callback(null, 1);
    });
}

function getNumber2(callback){
    setTimeout(function(){
        callback(null, 2);
    });
}

function slowAddValues(a, b, callback){

    // This task does get called, but it takes too long,
    // and results are ignored

    setTimeout(function(){
        callback(null, a + b);
    }, 100);
}

function passThroughNeverCalled(result, callback){

    // This task never gets called due to cancellation.

    setTimeout(function(){
        callback(null, result);
    });
}


// Build our async graph
var number = righto(task(getNumber));
var number2 = righto(task(getNumber2));
var added = righto(task(slowAddValues), number, number2);
var result = righto(task(passThroughNeverCalled), added);

// Execute the graph
result(function(error, result){

    // Got expected cancellation
    console.log(error.message) // 'timeout';
});

// Cancel execution part-way through
setTimeout(function(){
    task.cancel(new Error('timeout'));
}, 50);
```