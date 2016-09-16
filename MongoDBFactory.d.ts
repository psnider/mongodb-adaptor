declare module 'MongoDBFactory' {

    import child_process                    = require('child_process');
    import mongoose                         = require('mongoose');
    import DatabaseFactory                  = require('DatabaseFactory');


    export function startMongod(port : string, db_path : string, log_path : string, done : (error? : Error) => void) : child_process.ChildProcess;
    export function stopMongod(spawned_mongod : child_process.ChildProcess, done : (error? : Error) => void);
    export function connectViaMongoose(mongo_path, onError : (error : Error) => void, done : (error? : Error) => void) : void;
    export function disconnectViaMongoose(done : (error? : Error) => void) : void;
    export function deepEqualObjOrMongo(lhs, rhs) : boolean;


    export interface MongodbUpdateArgs {
        query:      any;
        update:     any;
    }



    export class MongoDBAdaptor implements DatabaseFactory.IDocumentDatabase {
        static convertUpdateCommandToMongo(update : DatabaseFactory.IUpdateFieldCommand) : MongodbUpdateArgs;
        static convertUpdateCommandsToMongo(updates : DatabaseFactory.IUpdateFieldCommand[]) : MongodbUpdateArgs[];
        constructor(typename : string, model : mongoose.Model<mongoose.Document>, done? : () => void);
        create(obj : any) : Promise<any>;
        read(conditions : any, fields? : any, sort?: any, cursor? : DatabaseFactory.IDatabaseCursor) : Promise<any>;
        update(conditions : any, updates : DatabaseFactory.IUpdateFieldCommand[], getOriginalDocument? : (doc : any) => void) : Promise<any>;
        delete(conditions : any, getOriginalDocument? : (doc : any) => void) : Promise<any>;
    }


    export class MongoDBFactory implements DatabaseFactory.IDatabaseFactory {
        constructor(done? : (db_factory : DatabaseFactory.IDatabaseFactory) => void);
        disconnect(done? : () => void);
        createObjectId() : string;
        create(typename : string) : DatabaseFactory.IDocumentDatabase;
    }


}
