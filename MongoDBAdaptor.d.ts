import mongoose                         = require('mongoose')
import Database                         = require('document-database-if')


export interface MongodbUpdateArgs {
    query:      any
    update:     any
}




export class MongoDBAdaptor<T> implements Database.DocumentDatabase<T> {
    static  createObjectId() : string 
    static isEmpty(obj): boolean
    static deepEqualObjOrMongo(lhs, rhs) : boolean
    static convertUpdateCommandToMongo(update : Database.UpdateFieldCommand) : MongodbUpdateArgs
    static convertUpdateCommandsToMongo(updates : Database.UpdateFieldCommand[]) : MongodbUpdateArgs[]
 
    constructor(mongodb_path: string, model: mongoose.Model<mongoose.Document>)
    connect(done: Database.ErrorOnlyCallback): void
    connect() : Promise<void>
    disconnect(done: Database.ErrorOnlyCallback): void
    disconnect() : Promise<void>
    create(obj: T): Promise<T>
    create(obj: T, done: Database.ObjectCallback<T>): void
    read(id : string) : Promise<T>
    read(id : string, done: Database.ObjectCallback<T>) : void
    replace(obj: T) : Promise<T>
    replace(obj: T, done: Database.ObjectCallback<T>) : void
    update(conditions : Database.Conditions, updates: Database.UpdateFieldCommand[], getOriginalDocument?: Database.ObjectCallback<T>) : Promise<T>
    update(conditions : Database.Conditions, updates: Database.UpdateFieldCommand[], getOriginalDocument: Database.ObjectCallback<T>, done: Database.ObjectCallback<T>) : void
    del(conditions : Database.Conditions, getOriginalDocument?: (doc : T) => void) : Promise<void>
    del(conditions : Database.Conditions, getOriginalDocument: (doc : T) => void, done: Database.ErrorOnlyCallback) : void
    find(conditions : Database.Conditions, fields?: Database.Fields, sort?: Database.Sort, cursor?: Database.Cursor) : Promise<T[]> 
    find(conditions : Database.Conditions, fields: Database.Fields, sort: Database.Sort, cursor: Database.Cursor, done: Database.ArrayCallback<T>) : void
}

