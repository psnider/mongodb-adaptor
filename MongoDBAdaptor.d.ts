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

    create(obj : T) : Promise<T>
    create(obj : T, done: (error: Error, result?: T) => void) : void
    read(id : string) : Promise<T>
    read(id : string, done: (error: Error, result?: T) => void) : void
    update(conditions : Database.Conditions, updates: Database.UpdateFieldCommand[], getOriginalDocument?: (doc : T) => void) : Promise<T> 
    update(conditions : Database.Conditions, updates: Database.UpdateFieldCommand[], getOriginalDocument: (doc : T) => void, done: (error: Error, result?: T) => void) : void
    delete(conditions : Database.Conditions, getOriginalDocument?: (doc : T) => void) : Promise<void>
    delete(conditions : Database.Conditions, getOriginalDocument: (doc : T) => void, done: (error: Error) => void) : void
    find(conditions : Database.Conditions, fields?: Database.Fields, sort?: Database.Sort, cursor?: Database.Cursor) : Promise<T[]> 
    find(conditions : Database.Conditions, fields: Database.Fields, sort: Database.Sort, cursor: Database.Cursor, done: (error: Error, result?: T[]) => void) : void
}

