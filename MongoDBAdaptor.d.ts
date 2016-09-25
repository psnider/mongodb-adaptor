import mongoose                         = require('mongoose')
import {ArrayCallback, Conditions, Cursor, DatabaseID, DocumentDatabase, ErrorOnlyCallback, Fields, ObjectCallback, ObjectOrArrayCallback, Sort, UpdateFieldCommand} from 'document-database-if'



export interface MongodbUpdateArgs {
    query:      any
    update:     any
}




export class MongoDBAdaptor<T> implements DocumentDatabase<T> {
    static  createObjectId() : string 
    static isEmpty(obj): boolean
    static deepEqualObjOrMongo(lhs, rhs) : boolean
    static convertUpdateCommandToMongo(update : UpdateFieldCommand) : MongodbUpdateArgs
    static convertUpdateCommandsToMongo(updates : UpdateFieldCommand[]) : MongodbUpdateArgs[]
 
    constructor(mongodb_path: string, model: mongoose.Model<mongoose.Document>)
    connect(done: ErrorOnlyCallback): void
    connect() : Promise<void>
    disconnect(done: ErrorOnlyCallback): void
    disconnect() : Promise<void>
    create(obj: T): Promise<T>
    create(obj: T, done: ObjectCallback<T>): void
    read(_id_or_ids: DatabaseID | DatabaseID[]) : Promise<T | T[]> 
    read(_id_or_ids: DatabaseID | DatabaseID[], done: ObjectOrArrayCallback<T>) : void
    replace(obj: T) : Promise<T>
    replace(obj: T, done: ObjectCallback<T>) : void
    update(conditions : Conditions, updates: UpdateFieldCommand[]) : Promise<T>
    update(conditions : Conditions, updates: UpdateFieldCommand[], done: ObjectCallback<T>) : void
    del(_id: DatabaseID) : Promise<void>
    del(_id: DatabaseID, done: ErrorOnlyCallback) : void
    find(conditions : Conditions, fields?: Fields, sort?: Sort, cursor?: Cursor) : Promise<T[]> 
    find(conditions : Conditions, fields: Fields, sort: Sort, cursor: Cursor, done: ArrayCallback<T>) : void
}

