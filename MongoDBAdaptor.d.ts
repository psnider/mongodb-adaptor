import mongoose                         = require('mongoose')
import Database                  = require('Database')


export interface MongodbUpdateArgs {
    query:      any
    update:     any
}


export class MongoDBAdaptor implements Database.DocumentDatabase {
    static  createObjectId() : string 
    static isEmpty(obj): boolean
    static deepEqualObjOrMongo(lhs, rhs) : boolean
    static convertUpdateCommandToMongo(update : Database.UpdateFieldCommand) : MongodbUpdateArgs
    static convertUpdateCommandsToMongo(updates : Database.UpdateFieldCommand[]) : MongodbUpdateArgs[]
    constructor(typename : string, model : mongoose.Model<mongoose.Document>, done? : () => void)
    create(obj : any) : Promise<any>
    read(conditions : any, fields? : any, sort?: any, cursor? : Database.DatabaseCursor) : Promise<any>
    update(conditions : any, updates : Database.UpdateFieldCommand[], getOriginalDocument? : (doc : any) => void) : Promise<any>
    delete(conditions : any, getOriginalDocument? : (doc : any) => void) : Promise<any>
}

