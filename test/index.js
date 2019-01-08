var test = require('tape');
var cancAll = require('../');
var righto = require('righto');

test('cancel one never responds', function(t){
    t.plan(1);

    // Broken function that never calls the callback.
    function neverRespond(callback){

    }

    // Set up our cancelable task handling
    var task = cancAll();

    // Wrap our function, and call it.
    task(neverRespond)(function(error, result){
        t.equal(error.message, 'cancelled');
    });

    // Manually cancel the task.
    task.cancel(new Error('cancelled'));
});

test('cancel one responds too late', function(t){
    t.plan(1);

    function neverRespond(callback){
        setTimeout(function(){
            callback(null, 'result');
        }, 100);
    }

    var task = cancAll();

    task(neverRespond)(function(error, result){
        t.equal(error.message, 'timeout');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 50);
});

test('cancel one already complete', function(t){
    t.plan(1);

    function respondInTime(callback){
        setTimeout(function(){
            callback(null, 'result');
        }, 50);
    }

    var task = cancAll();

    task(respondInTime)(function(error, result){
        t.equal(result, 'result');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 100);
});

test('cancel multiple never responds', function(t){
    t.plan(2);

    var task = cancAll();

    var neverRespond = task(function(callback){

    });

    var callAndPassResponse = task(function(callback){
        neverRespond(function(error, result){
            t.equal(error.message, 'cancelled', 'inner cancelled');

            callback(error, result);
        });
    });

    callAndPassResponse(function(error, result){
        t.equal(error.message, 'cancelled', 'outer cancelled');
    });

    task.cancel(new Error('cancelled'));
});

test('cancel multiple responds too late', function(t){
    t.plan(2);

    var task = cancAll();

    var respondTooLate = task(function(callback){
        setTimeout(function(){
            callback(null, 'result');
        }, 100);
    });

    var callAndPassResponse = task(function(callback){
        respondTooLate(function(error, result){
            t.equal(error.message, 'timeout', 'inner timeout');

            callback(error, result);
        });
    });

    callAndPassResponse(function(error, result){
        t.equal(error.message, 'timeout', 'outer timeout');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 50);
});

test('cancel multiple already complete', function(t){
    t.plan(2);

    var task = cancAll();

    var respondInTime = task(function(callback){
        setTimeout(function(){
            callback(null, 'result');
        }, 50);
    });

    var callAndPassResponse = task(function(callback){
        respondInTime(function(error, result){
            t.equal(result, 'result', 'inner result');

            callback(error, result);
        });
    });

    callAndPassResponse(function(error, result){
        t.equal(result, 'result', 'outer result');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 100);
});

test('cancel multiple graph success', function(t){
    t.plan(1);

    var task = cancAll();

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

    function addValues(a, b, callback){
        setTimeout(function(){
            callback(null, a + b);
        });
    }

    function passThrough(result, callback){
        setTimeout(function(){
            callback(null, result);
        });
    }

    var number = righto(task(getNumber));
    var number2 = righto(task(getNumber2));
    var added = righto(task(addValues), number, number2);
    var result = righto(task(passThrough), added);

    result(function(error, result){
        t.equal(result, 3, 'Successful result');
    });
});

test('cancel multiple graph deep cancelled', function(t){
    t.plan(1);

    var task = cancAll();

    function getNumber(callback){
        setTimeout(function(){
            callback(null, 1);
        });
    }

    function getSlowNumber(callback){
        setTimeout(function(){
            callback(null, 2);
        }, 100);
    }

    function addValues(a, b, callback){
        setTimeout(function(){
            callback(null, a + b);
        });
    }

    function passThrough(result, callback){
        setTimeout(function(){
            callback(null, result);
        });
    }

    var number = righto(task(getNumber));
    var number2 = righto(task(getSlowNumber));
    var added = righto(task(addValues), number, number2);
    var result = righto(task(passThrough), added);

    result(function(error, result){
        t.equal(error.message, 'timeout', 'got cancellation');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 50);
});

test('cancel multiple graph shallow cancelled', function(t){
    t.plan(2);

    var task = cancAll();

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
        t.pass('Add values called');
        setTimeout(function(){
            callback(null, a + b);
        }, 100);
    }

    function passThroughNeverCalled(result, callback){
        t.fail('passThrough should not be called.');
        setTimeout(function(){
            callback(null, result);
        });
    }

    var number = righto(task(getNumber));
    var number2 = righto(task(getNumber2));
    var added = righto(task(slowAddValues), number, number2);
    var result = righto(task(passThroughNeverCalled), added);

    result(function(error, result){
        t.equal(error.message, 'timeout', 'got cancellation');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 50);
});

test('cancel multiple graph shallow cancel after success', function(t){
    t.plan(2);

    var task = cancAll();

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
        t.pass('Add values called');
        setTimeout(function(){
            callback(null, a + b);
        }, 50);
    }

    function passThrough(result, callback){
        setTimeout(function(){
            callback(null, result);
        });
    }

    var number = righto(task(getNumber));
    var number2 = righto(task(getNumber2));
    var added = righto(task(slowAddValues), number, number2);
    var result = righto(task(passThrough), added);

    result(function(error, result){
        t.equal(result, 3, 'got result');
    });

    setTimeout(function(){
        task.cancel(new Error('timeout'));
    }, 100);
});

test('cancel multiple graph shallow cancel before execution', function(t){
    t.plan(1);

    var task = cancAll();

    function getNumber(callback){
        t.fail('nothing should run');
        setTimeout(function(){
            callback(null, 1);
        });
    }

    function getNumber2(callback){
        t.fail('nothing should run');
        setTimeout(function(){
            callback(null, 2);
        });
    }

    function slowAddValues(a, b, callback){
        t.fail('nothing should run');
        setTimeout(function(){
            callback(null, a + b);
        }, 50);
    }

    function passThrough(result, callback){
        t.fail('nothing should run');
        setTimeout(function(){
            callback(null, result);
        });
    }

    var number = righto(task(getNumber));
    var number2 = righto(task(getNumber2));
    var added = righto(task(slowAddValues), number, number2);
    var result = righto(task(passThrough), added);

    task.cancel(new Error('cancelled'));

    result(function(error, result){
        t.equal(error.message, 'cancelled', 'got cancellation');
    });
});