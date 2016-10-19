import mongoose                         = require('mongoose')
import {ArrayCallback, Conditions, Cursor, DocumentID, DocumentDatabase, ErrorOnlyCallback, Fields, ObjectCallback, ObjectOrArrayCallback, Sort, UpdateFieldCommand} from 'document-database-if'



export interface MongodbUpdateArgs {
    query:      any
    update:     any
}



export class MongoDBAdaptor<DocumentType extends {_id?: DocumentID}> implements DocumentDatabase<DocumentType> {
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
    create(obj: DocumentType): Promise<DocumentType>
    create(obj: DocumentType, done: ObjectCallback<DocumentType>): void
    read(_id_or_ids: DocumentID | DocumentID[]) : Promise<DocumentType | DocumentType[]> 
    read(_id_or_ids: DocumentID | DocumentID[], done: ObjectOrArrayCallback<DocumentType>) : void
    replace(obj: DocumentType) : Promise<DocumentType>
    replace(obj: DocumentType, done: ObjectCallback<DocumentType>) : void
    update(conditions : Conditions, updates: UpdateFieldCommand[]) : Promise<DocumentType>
    update(conditions : Conditions, updates: UpdateFieldCommand[], done: ObjectCallback<DocumentType>) : void
    del(_id: DocumentID) : Promise<void>
    del(_id: DocumentID, done: ErrorOnlyCallback) : void
    find(conditions : Conditions, fields?: Fields, sort?: Sort, cursor?: Cursor) : Promise<DocumentType[]> 
    find(conditions : Conditions, fields: Fields, sort: Sort, cursor: Cursor, done: ArrayCallback<DocumentType>) : void
}

