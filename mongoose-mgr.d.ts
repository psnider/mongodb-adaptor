declare module 'mongoose-mgr' {

    import mongoose                         = require('mongoose');


    export function connectViaMongoose(mongo_path, onError : (error : Error) => void, done : (error? : Error) => void) : void;
    export function disconnectViaMongoose(done : (error? : Error) => void) : void;

}
