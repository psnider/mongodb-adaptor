import mongoose                         = require('mongoose')
import DatabaseFactory                  = require('DatabaseFactory')


export interface MongodbUpdateArgs {
    query:      any
    update:     any
}


export class MongoDBAdaptor implements DatabaseFactory.IDocumentDatabase {
    static  createObjectId() : string 
    static isEmpty(obj): boolean
    static deepEqualObjOrMongo(lhs, rhs) : boolean
    static convertUpdateCommandToMongo(update : DatabaseFactory.IUpdateFieldCommand) : MongodbUpdateArgs
    static convertUpdateCommandsToMongo(updates : DatabaseFactory.IUpdateFieldCommand[]) : MongodbUpdateArgs[]
    constructor(typename : string, model : mongoose.Model<mongoose.Document>, done? : () => void)
    create(obj : any) : Promise<any>
    read(conditions : any, fields? : any, sort?: any, cursor? : DatabaseFactory.IDatabaseCursor) : Promise<any>
    update(conditions : any, updates : DatabaseFactory.IUpdateFieldCommand[], getOriginalDocument? : (doc : any) => void) : Promise<any>
    delete(conditions : any, getOriginalDocument? : (doc : any) => void) : Promise<any>
}

