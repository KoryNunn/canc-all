
function createCancellableTaskWrapper(){
    var wasCanceledWith = false;
    var inFlight = [];

    function cancel(cancellationError){
        if(wasCanceledWith){
            return;
        }

        wasCanceledWith = cancellationError;

        inFlight.forEach(function(callbackForTaskInFlight){
            if(!callbackForTaskInFlight){
                return;
            }

            callbackForTaskInFlight(cancellationError);
        });
    };

    function wrap(fn){
        return function(){

            var callback = arguments[arguments.length - 1];

            if(wasCanceledWith){
                callback(wasCanceledWith);
                return;
            }

            var index = inFlight.length;
            inFlight.push(callback);

            fn.apply(null, Array.prototype.slice.call(arguments, 0, -1).concat(function(){
                if(wasCanceledWith){
                    return;
                }

                inFlight[index] = null;
                callback.apply(null, arguments);
            }));
        }
    };

    wrap.cancel = cancel;

    return wrap;
}

module.exports = createCancellableTaskWrapper;