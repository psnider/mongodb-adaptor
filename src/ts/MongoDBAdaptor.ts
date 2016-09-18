import mongoose                         = require('mongoose')
// Use native promises
mongoose.Promise = global.Promise
import pino                             = require('pino')

import configure                        = require('configure-local')
import Database                  = require('Database')
import {MongodbUpdateArgs} from '../../MongoDBAdaptor'


var log = pino({name: 'MongoDBAdaptor'})






// This adaptor converts application queries into Mongo queries
// and the query results into application results, suitable for use by cscFramework
export class MongoDBAdaptor implements Database.DocumentDatabase {


    static  createObjectId() : string {
        var id = new mongoose.Types.ObjectId
        return id.toHexString()
    }


    static isEmpty(obj): boolean {
        return (Object.keys(obj).length === 0)
    }


    // considers null, empty array, and obj._id to all be undefined
    static  deepEqualObjOrMongo(lhs, rhs) : boolean {
        function coerceType(value) {
            if (typeof value === 'null') return undefined
            if (Array.isArray(value) && (value.length === 0)) return undefined
            return value
        }
        lhs = coerceType(lhs)
        rhs = coerceType(rhs)
        if ((lhs == null) && (rhs == null)) {
            return true;        
        }
        if ((lhs == null) || (rhs == null)) {
            return false
        }
        if (Array.isArray(lhs) && Array.isArray(rhs)) {
            if (lhs.length !== rhs.length) {
                return false
            } else {
                return lhs.every((element, i) => {
                    return MongoDBAdaptor.deepEqualObjOrMongo(element, rhs[i])
                })
            }
        } else if ((lhs instanceof Date) && (rhs instanceof Date)) {
            return (lhs.getTime() == rhs.getTime())
        } else if ((typeof lhs === 'object') && (typeof rhs === 'object')) {
            var lhs_keys = Object.keys(lhs)
            var rhs_keys = Object.keys(rhs)
            // check each key, because a missing key is equivalent to an empty value at an existing key
            return lhs_keys.every((key) => {
                if ((key === 'id') || (key === '_id')) {
                    // ignore id fields
                    return true
                } else {
                    return MongoDBAdaptor.deepEqualObjOrMongo(lhs[key], rhs[key])
                }
            })
        } else {
            return (lhs === rhs)
        }
    }


    private static CONVERT_COMMAND = {

        set: function(update : Database.UpdateFieldCommand) {
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


        unset: function(update : Database.UpdateFieldCommand) {
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


        insert: function(update : Database.UpdateFieldCommand) {
            var mongo_query = {}
            var add_args = {}
            add_args[update.field] = update.value
            return {query: mongo_query, update: {$addToSet: add_args}}
        },


        remove: function(update : Database.UpdateFieldCommand) {
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


    static convertUpdateCommandToMongo(update : Database.UpdateFieldCommand) : MongodbUpdateArgs {
        if (update.cmd in MongoDBAdaptor.CONVERT_COMMAND) {
            var mongo_update = MongoDBAdaptor.CONVERT_COMMAND[update.cmd](update)
            return mongo_update
        } else {
            throw new Error('unexpected update.cmd=' + update.cmd + ' field=' + update.field)
        }
    }


    static convertUpdateCommandsToMongo(updates : Database.UpdateFieldCommand[]) : MongodbUpdateArgs[] {
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
        return obj
    }


    constructor(private typename : string, private model : mongoose.Model<mongoose.Document>, done? : () => void) {
        if (done != null)  done()
    }


    // @return a Promise with the created element
    create(obj : any) : Promise<any> {
        return new Promise((resolve, reject) => {
            var document : mongoose.Document = new this.model(obj)
            document.save((error, element : mongoose.Document) => {
                if (error != null) {
                    log.error({function: 'MongoDBAdaptor.create', obj: obj, text: 'db save error', error: error})
                    reject(error)
                } else {
                    var obj = element.toObject()
                    obj = MongoDBAdaptor.convertMongoIdsToStrings(obj)
                    var result = {elements: [obj]}
                    resolve(result)
                }
            })
        })
    }


    // @return a Promise with the matching elements
    read(conditions : any, fields? : any, sort?: any, cursor? : Database.DatabaseCursor) : Promise<{elements: any[];}> {
        return new Promise((resolve, reject) => {
            var mongoose_query = this.model.find(conditions, fields, cursor)
            if (sort != null) {
                mongoose_query.sort(sort)
            }
            mongoose_query.lean().exec().then(
                (data: {}[]) => {
                    data.forEach((element) => {
                        MongoDBAdaptor.convertMongoIdsToStrings(element)
                    })
                    var result = {elements: data}
                    resolve(result)
                },
                (error) => {
                    reject(error)
                }
            )
        })
    }


    // @return a Promise with the updated elements
    update(conditions : any, updates : Database.UpdateFieldCommand[], getOriginalDocument? : (doc : any) => void) : Promise<any> {
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
        var readDoc : (_id) => Promise<any> = (_id) => {
            return this.read({_id}).then(
                (result) => {
                    return result.elements[0]
                }
            )
        }
        var getInitialDoc : (_id) => Promise<any> = (_id) => {
            if (getOriginalDocument) {
                return readDoc(_id).then(
                    (doc) => {
                        getOriginalDocument(doc)
                        return doc
                    }
                )
            } else {
                return Promise.resolve(null)
            }
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
        return new Promise((resolve, reject) => {
            var mongo_updates = MongoDBAdaptor.convertUpdateCommandsToMongo(updates)
            if (mongo_updates.length == 0) {
                var error = new Error('no updates specified in update command for conditions=' + JSON.stringify(conditions))
                reject(error)
            } else {
                var _id = getId(conditions)
                var initial_doc_promise = getInitialDoc(_id)
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
                var read_promise = Promise.all([initial_doc_promise, serial_promise]).then(
                    (result) => {
                        return readDoc(_id)
                    }
                )
                read_promise.then(
                    (doc) => {
                        var response = {elements: [doc]}
                        resolve(response)
                    },
                    (error) => {
                        reject(error)
                    }
                )
            }
        })
    }


    // @param id {string|ObjectId}
    // @return a Promise with the deleted elements
    delete(conditions : any, getOriginalDocument? : (doc : any) => void) : Promise<any> {
        return new Promise((resolve, reject) => {
            var mongoose_query = this.model.remove(conditions)
            mongoose_query.lean().exec().then(
                (data) => {
                    resolve(data)
                },
                (error) => {
                    reject(error)
                }
            )
        })
    }

}

