import mongoose                         = require('mongoose')
// Use native promises
mongoose.Promise = global.Promise
import pino                             = require('pino')

import configure                        = require('@sabbatical/configure-local')
import {ArrayCallback, DocumentBase, Conditions, Cursor, DocumentID, DocumentDatabase, ErrorOnlyCallback, Fields, ObjectCallback, ObjectOrArrayCallback, Sort, UpdateFieldCommand} from '@sabbatical/document-database'
import {UnsupportedUpdateCmds} from '@sabbatical/document-database/tests'
import {MongodbUpdateArgs} from './mongodb-adaptor.d'
import {connect as mongoose_connect, disconnect as mongoose_disconnect} from '@sabbatical/mongoose-connector'


type DocumentType = DocumentBase


var log = pino({name: 'mongodb-adaptor'})



export var UNSUPPORTED_UPDATE_CMDS: UnsupportedUpdateCmds = undefined

// export var SUPPORTED_DATABASE_FEATURES: SupportedFeatures = {
//     replace: true,
//     update: {
//         object: {
//             set: true, 
//             unset: true,
//         },
//         array: {
//             set: true, 
//             unset: true,
//             insert: true,
//             remove: true,
//         }
//     },
//     find: {
//         all: true
//     }
// }



// This adaptor converts application queries into Mongo queries
// and the query results into application results, suitable for use by cscFramework
export class MongoDBAdaptor implements DocumentDatabase {

    static  createObjectId() : string {
        var _id = new mongoose.Types.ObjectId
        return _id.toHexString()
    }


    static isEmpty(obj): boolean {
        return (Object.keys(obj).length === 0)
    }


    private static CONVERT_COMMAND = {

        set: function(update : UpdateFieldCommand) {
            var mongo_query = {}
            var set_args = {}
            if ('element_id' in update) {
                if ('key_field' in update) {
                    var key_path = update.field + '.' + update.key_field
                    mongo_query[key_path] = update.element_id
                    if ('subfield' in update) {
                        // case: array.set with subfield
                        var field_path = update.field + '.$.' + update.subfield
                    } else {
                        // case: array.set w/o subfield
                        field_path = update.field + '.$'
                    }
                } else {
                    // case: array contains simple types
                    var key_path = update.field
                    mongo_query[key_path] = update.element_id
                    field_path = update.field + '.$'
                }
            } else {
                // case: object.set
                field_path = update.field
            }
            set_args[field_path] = update.value
            return {query: mongo_query, update: {$set: set_args}}
        },


        unset: function(update : UpdateFieldCommand) {
            var mongo_query = {}
            var unset_args = {}
            if ('element_id' in update) {
                if ('key_field' in update) {
                    var key_path = update.field + '.' + update.key_field
                    mongo_query[key_path] = update.element_id
                    if ('subfield' in update) {
                        // case: array.unset with subfield
                        var field_path = update.field + '.$.' + update.subfield
                    } else {
                        // invalid case: array.unset w/o subfield
                        throw new Error('cmd=unset not allowed on array without a subfield, use cmd=remove')
                    }
                } else {
                    // invalid case: array contains simple types
                    throw new Error('cmd=unset not allowed on array without a subfield, use cmd=remove')
                }
            } else {
                // case: object.unset
                field_path = update.field
            }
            unset_args[field_path] = null
            return {query: mongo_query, update: {$unset: unset_args}}
        },


        insert: function(update : UpdateFieldCommand) {
            var mongo_query = {}
            var add_args = {}
            add_args[update.field] = update.value
            return {query: mongo_query, update: {$addToSet: add_args}}
        },


        remove: function(update : UpdateFieldCommand) {
            var mongo_query = {}
            var pull_args = {}
            var matcher : any
            if ('element_id' in update) {
                if ('key_field' in update) {
                    matcher = {}
                    matcher[update.key_field] = update.element_id
                } else {
                    matcher = update.element_id
                }
            } else {
                throw new Error('invalid remove, update_cmd=' + JSON.stringify(update))
            }
            pull_args[update.field] = matcher
            return {query: mongo_query, update: {$pull: pull_args}}
        }

    }


    static convertUpdateCommandToMongo(update : UpdateFieldCommand) : MongodbUpdateArgs {
        if (update.cmd in MongoDBAdaptor.CONVERT_COMMAND) {
            var mongo_update = MongoDBAdaptor.CONVERT_COMMAND[update.cmd](update)
            return mongo_update
        } else {
            throw new Error('unexpected update.cmd=' + update.cmd + ' field=' + update.field)
        }
    }


    static convertUpdateCommandsToMongo(updates : UpdateFieldCommand[]) : MongodbUpdateArgs[] {
        var mongo_updates = []
        for (var i = 0 ; i < updates.length ; ++i) {
            var update = updates[i]
            var mongo_update = MongoDBAdaptor.convertUpdateCommandToMongo(update)
            mongo_updates.push(mongo_update)
        }
        return mongo_updates
    }


    // Convert from mongoose.Document to plain object,
    // in particular, converting ObjectId to a string
    static getOverTheNetworkObject(obj : any) : any {
        return JSON.parse(JSON.stringify(obj))
    }


    // Converting ObjectId to a string
    static convertMongoIdsToStrings(obj : any) : any {
        if (obj != null) {
            if (Array.isArray(obj)) {
                obj.forEach((element, i, array) => {
                    if (element) {
                        array[i] = MongoDBAdaptor.convertMongoIdsToStrings(element)
                    }
                })
            } else if (obj instanceof mongoose.Types.ObjectId) {
                obj = obj.toString()
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach((key) => {
                    if (obj[key]) {
                        obj[key] = MongoDBAdaptor.convertMongoIdsToStrings(obj[key])
                    }
                })
            }
        }
        return obj
    }


    mongodb_path: string
    model: mongoose.Model<mongoose.Document>
    db: MongoDBAdaptor


    constructor(mongodb_path: string, model: mongoose.Model<mongoose.Document>) {
        this.mongodb_path = mongodb_path
        this.model = model
    }


    connect(): Promise<void>
    connect(done: ErrorOnlyCallback): void
    connect(done?: ErrorOnlyCallback): Promise<void> | void {
        if (done) {
            var onError = (error) => {
                log.error({error}, 'mongoose_connect')
            }
            mongoose_connect(this.mongodb_path, onError, done)
        } else {
            return this.connect_promisified()
        }
    }


    private connect_promisified(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.connect((error) => {
                if (!error) {
                    resolve()
                } else {
                    reject(error)
                }
            })
        })
    }


    disconnect(): Promise<void>
    disconnect(done: ErrorOnlyCallback): void
    disconnect(done?: ErrorOnlyCallback): Promise<void> | void {
        if (done) {
            mongoose_disconnect(done)
        } else {
            return this.disconnect_promisified()
        }
    }


    private disconnect_promisified(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.connect((error) => {
                if (!error) {
                    resolve()
                } else {
                    reject(error)
                }
            })
        })
    }


    // create(obj: DocumentType): Promise<DocumentType>
    // create(obj: DocumentType, done: ObjectCallback): void
    // TODO: REPAIR: create(obj: DocumentType, done?: ObjectCallback) : Promise<DocumentType> | void {
    create(obj: DocumentType) : Promise<DocumentType>
    create(obj: DocumentType, done: ObjectCallback): void
    create(obj: DocumentType, done?: ObjectCallback) : Promise<DocumentType> | void {
        if (done) {
            if (obj['_id']) {
                done(new Error('_id isnt allowed for create'))
            } else {
                let document : mongoose.Document = new this.model(obj)
                document.save((error, saved_doc: mongoose.Document) => {
                    let result: DocumentType
                    if (!error) {
                        let marshalable_doc: DocumentType = <DocumentType>saved_doc.toObject()
                        // TODO: perhaps toObject should call convertMongoIdsToStrings? 
                        result = MongoDBAdaptor.convertMongoIdsToStrings(marshalable_doc)
                    } else {
                        log.error({function: 'MongoDBAdaptor.create', obj: obj, text: 'db save error', error: error})
                    }
                    done(error, result)
                })
            }
        } else {
            return this.create_promisified(obj)
        }
    }


    private create_promisified(obj: DocumentType): Promise<DocumentType> {
        return new Promise((resolve, reject) => {
            this.create(obj, (error, result) => {
                if (!error)  {
                    resolve(result)
                } else {
                    reject(error)
                }
            })
        })
    }


    read(_id_or_ids : DocumentID | DocumentID[]) : Promise<DocumentType | DocumentType[]>
    read(_id_or_ids : DocumentID | DocumentID[], done: ObjectOrArrayCallback) : void
    read(_id_or_ids : DocumentID | DocumentID[], done?: ObjectOrArrayCallback) : Promise<DocumentType | DocumentType[]> | void {
        if (done) {
            var mongoose_query
            if (Array.isArray(_id_or_ids)) {
                let _ids = <DocumentID[]>_id_or_ids
                let mongoose_ids = _ids.map((_id) => {return mongoose.Types.ObjectId.createFromHexString(_id)})
                mongoose_query = this.model.find({
                    '_id': { $in: mongoose_ids}
                });
            } else if ((typeof _id_or_ids == 'string') && (_id_or_ids.length > 0)){
                let _id = <DocumentID>_id_or_ids
                mongoose_query = this.model.findById(_id)
            }
            if (mongoose_query) {
                mongoose_query.lean().exec().then(
                    (result: DocumentType | DocumentType[]) => {
                        if (Array.isArray(result)) {
                            result.forEach((element) => {
                                MongoDBAdaptor.convertMongoIdsToStrings(element)
                            })
                        } else {
                            MongoDBAdaptor.convertMongoIdsToStrings(result)
                        }
                        done(undefined, result)
                    },
                    (error) => {
                        done(error)
                    }
                )
            } else {
                done(new Error('_id is invalid'))
            }

        } else {
            return this.read_promisified(_id_or_ids)
        }
    }


    private read_promisified(_id_or_ids: DocumentID | DocumentID[]): Promise<DocumentType | DocumentType[]> {
        return new Promise((resolve, reject) => {
            this.read(_id_or_ids, (error, result) => {
                if (!error)  {
                    resolve(result)
                } else {
                    reject(error)
                }
            })
        })
    }


    // TODO: obsolete this function, as all updates should be performed with update()
    // @return a Promise with the created element, if there is no callback
    // TODO: REPAIR: replace(obj: DocumentType, done?: ObjectCallback) : Promise<DocumentType> | void {
    replace(obj: DocumentType): Promise<DocumentType>
    replace(obj: DocumentType, done: ObjectCallback): void
    replace(obj: DocumentType, done?: ObjectCallback): Promise<DocumentType> | void {
        if (done) {
            this.model.findById(obj['_id'], function (err, document) {
                // assume that all keys are present in obj
                for (let key in obj) {
                    document[key] = obj[key]
                }
                document.save((error, saved_doc: mongoose.Document) => {
                    let result: DocumentType
                    if (!error) {
                        let marshalable_doc: DocumentType = <DocumentType>saved_doc.toObject()
                        // TODO: perhaps toObject should call convertMongoIdsToStrings? 
                        result = MongoDBAdaptor.convertMongoIdsToStrings(marshalable_doc)
                    } else {
                        log.error({function: 'MongoDBAdaptor.replace', obj: obj, text: 'db save error', error: error})
                    }
                    done(error, result)
                })
            })
        } else {
            return this.replace_promisified(obj)
        }
    }


    private replace_promisified(obj: DocumentType): Promise<DocumentType> {
        return new Promise((resolve, reject) => {
            this.replace(obj, (error, result) => {
                if (!error)  {
                    resolve(result)
                } else {
                    reject(error)
                }
            })
        })
    }


    find(conditions : Conditions, fields?: Fields, sort?: Sort, cursor?: Cursor) : Promise<DocumentType[]>
    find(conditions : Conditions, fields: Fields, sort: Sort, cursor: Cursor, done: ArrayCallback) : void
    find(conditions : Conditions, fields?: Fields, sort?: Sort, cursor?: Cursor, done?: ArrayCallback) : Promise<DocumentType[]> | void {
        if (done) {
            var mongoose_query = this.model.find(conditions, fields, cursor)
            if (sort != null) {
                mongoose_query.sort(sort)
            }
            if (cursor == null) cursor = {}
            if (cursor.start_offset == null) cursor.start_offset = 0
            if (cursor.count == null) cursor.count = 10
            if (cursor.start_offset != null) {
                mongoose_query.skip(cursor.start_offset)
            }
            if (cursor.count != null) {
                mongoose_query.limit(cursor.count)
            }
            mongoose_query.lean().exec().then(
                (elements: DocumentType[]) => {
                    elements.forEach((element) => {
                        MongoDBAdaptor.convertMongoIdsToStrings(element)
                    })
                    done(undefined, elements)
                },
                (error) => {
                    done(error)
                }
            )
        } else {
            return this.find_promisified(conditions, fields, sort, cursor)
        }
    }


    private find_promisified(conditions: Conditions, fields?: Fields, sort?: Sort, cursor?: Cursor): Promise<DocumentType[]> {
        return new Promise((resolve, reject) => {
            this.find(conditions, fields, sort, cursor, (error, result) => {
                if (!error)  {
                    resolve(result)
                } else {
                    reject(error)
                }
            })
        })
    }



    // @return a Promise with the updated elements
    // TODO: REPAIR: update(conditions: any, updates: UpdateFieldCommand[], done?: ObjectCallback) : Promise<DocumentType> | void {
    update(conditions: any, updates: UpdateFieldCommand[], done?: ObjectCallback) : any {
        function getId(conditions) : string {
            if ('_id' in conditions) {
                var condition = conditions._id
                if (typeof condition == 'string') {
                    return condition
                } else if (Array.isArray(condition)) {
                    if (condition.length == 1) {
                        if ((typeof condition[0] == 'string') || (!Array.isArray(condition[0]) && (typeof condition[0] == 'object'))) {
                            return condition[0]
                        } else {
                            return null
                        }
                    } else {
                        return null
                    }
                } else if (typeof condition == 'object') {
                    return condition
                } else {
                    return null
                }
            } else {
                return null
            }
        }
        var readDoc : (_id) => Promise<DocumentType> = (_id) => {
            let promise = <Promise<DocumentType>>this.read(_id)
            return promise.then(
                (result) => {
                    return result
                }
            )
        }
        var chainPromise: (serial_promise: Promise<any>, mongo_update, mongoose_query: mongoose.Query<any>) => Promise<any> = (serial_promise, mongo_update, mongoose_query) => {
            return serial_promise.then(() => {
                return mongoose_query.lean().exec().then(
                    (result) => {
                        MongoDBAdaptor.convertMongoIdsToStrings(mongo_update)
                        return result
                    }
                )
            })
        }
        if (done) {
            try {
                var mongo_updates = MongoDBAdaptor.convertUpdateCommandsToMongo(updates)
            } catch (error) {
                done(error)
                return                
            }
            if (mongo_updates.length == 0) {
                var error = new Error('no updates specified in update command for conditions=' + JSON.stringify(conditions))
                done(error)
            } else {
                var _id = getId(conditions)
                // apply the updates in the order they were given
                var initial_value : mongoose.Document = <mongoose.Document>{}
                initial_value['MongoDBAdaptor.update.error'] = 'You should never see this!'
                var serial_promise = Promise.resolve(initial_value)
                for (var i = 0 ; i < mongo_updates.length ; ++i) {
                    var mongo_update = mongo_updates[i]
                    var merged_conditions = {}
                    for (var key in conditions) {
                        merged_conditions[key] = conditions[key]
                    }
                    for (var key in mongo_update.query) {
                        merged_conditions[key] = mongo_update.query[key]
                    }
                    var mongoose_query = this.model.update(merged_conditions, mongo_update.update)
                    // preserve the mongoose_query value to match its promise
                    serial_promise = chainPromise(serial_promise, mongo_update, mongoose_query)
                }
                // when the last resolves, read the latest document
                var read_promise = serial_promise.then(
                    (result) => {
                        return readDoc(_id)
                    }
                )
                read_promise.then(
                    (doc) => {
                        done(undefined, doc)
                    },
                    (error) => {
                        done(error)
                    }
                )
            }
        } else {
            return this.update_promisified(conditions, updates)
        }
    }


    private update_promisified(conditions: any, updates: UpdateFieldCommand[]): Promise<DocumentType> {
        return new Promise((resolve, reject) => {
            this.update(conditions, updates, (error, result) => {
                if (!error)  {
                    resolve(result)
                } else {
                    reject(error)
                }
            })
        })
    }


    // del(_id: DocumentID) : Promise<void>
    // del(_id: DocumentID, done: ErrorOnlyCallback) : void
    // TODO: REPAIR: del(_id: DocumentID, done?: ErrorOnlyCallback) : Promise<null> | void {
    del(_id: DocumentID, done?: ErrorOnlyCallback) : any {
        if (done) {
            if (_id != null) {
                var mongoose_query = this.model.remove({_id})
                mongoose_query.lean().exec().then(
                    (data) => {
                        done()
                    },
                    (error) => {
                        done(error)
                    }
                )
            } else {
                done(new Error('_id is invalid'))
            }
        } else {
            return this.del_promisified(_id)
        }
    }


    private del_promisified(_id: DocumentID): Promise<null> {
        return new Promise((resolve, reject) => {
            this.del(_id, (error) => {
                if (!error)  {
                    resolve(null)
                } else {
                    reject(error)
                }
            })
        })
    }

}

