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
    constructor(typename : string, model : mongoose.Model<mongoose.Document>, done? : (error?: Error) => void)

    create(obj: T): Promise<T>
    create(obj: T, done: Database.CreateCallback<T>): void
    read(id : string) : Promise<T>
    read(id : string, done: Database.ReadCallback<T>) : void
    replace(obj: T) : Promise<T>
    replace(obj: T, done: Database.ReplaceCallback<T>) : void
    update(conditions : Database.Conditions, updates: Database.UpdateFieldCommand[], getOriginalDocument?: Database.GetOriginalDocumentCallback<T>) : Promise<T>
    update(conditions : Database.Conditions, updates: Database.UpdateFieldCommand[], getOriginalDocument: Database.GetOriginalDocumentCallback<T>, done: Database.UpdateSingleCallback<T>) : void
    del(conditions : Database.Conditions, getOriginalDocument?: (doc : T) => void) : Promise<void>
    del(conditions : Database.Conditions, getOriginalDocument: (doc : T) => void, done: Database.DeleteSingleCallback) : void
    find(conditions : Database.Conditions, fields?: Database.Fields, sort?: Database.Sort, cursor?: Database.Cursor) : Promise<T[]> 
    find(conditions : Database.Conditions, fields: Database.Fields, sort: Database.Sort, cursor: Database.Cursor, done: Database.FindCallback<T>) : void
}

