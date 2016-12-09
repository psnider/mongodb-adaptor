import mongoose                         = require('mongoose')
import {ArrayCallback, Conditions, Cursor, DocumentBase, DocumentID, DocumentDatabase, ErrorOnlyCallback, Fields, ObjectCallback, ObjectOrArrayCallback, Sort, UpdateFieldCommand} from '@sabbatical/document-database'
import {UnsupportedUpdateCmds} from '@sabbatical/document-database/tests'

type DocumentType = DocumentBase


export interface MongodbUpdateArgs {
    query:      any
    update:     any
}


export var UNSUPPORTED_UPDATE_CMDS: UnsupportedUpdateCmds
//export var SUPPORTED_DATABASE_FEATURES: SupportedFeatures


export class MongoDBAdaptor implements DocumentDatabase {
    static createObjectId() : string 
    static isEmpty(obj: {}): boolean
    static convertUpdateCommandToMongo(update : UpdateFieldCommand) : MongodbUpdateArgs
    static convertUpdateCommandsToMongo(updates : UpdateFieldCommand[]) : MongodbUpdateArgs[]
 
    constructor(mongodb_path: string, model: mongoose.Model<mongoose.Document>)
    connect(done: ErrorOnlyCallback): void
    connect() : Promise<void>
    disconnect(done: ErrorOnlyCallback): void
    disconnect() : Promise<void>
    create(obj: DocumentType): Promise<DocumentType>
    create(obj: DocumentType, done: ObjectCallback): void
    read(_id_or_ids: DocumentID | DocumentID[]) : Promise<DocumentType | DocumentType[]> 
    read(_id_or_ids: DocumentID | DocumentID[], done: ObjectOrArrayCallback) : void
    replace(obj: DocumentType) : Promise<DocumentType>
    replace(obj: DocumentType, done: ObjectCallback) : void
    update(conditions : Conditions, updates: UpdateFieldCommand[]) : Promise<DocumentType>
    update(conditions : Conditions, updates: UpdateFieldCommand[], done: ObjectCallback) : void
    del(_id: DocumentID) : Promise<void>
    del(_id: DocumentID, done: ErrorOnlyCallback) : void
    find(conditions : Conditions, fields?: Fields, sort?: Sort, cursor?: Cursor) : Promise<DocumentType[]> 
    find(conditions : Conditions, fields: Fields, sort: Sort, cursor: Cursor, done: ArrayCallback) : void
}

