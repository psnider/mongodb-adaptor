"use strict";
var mongoose = require('mongoose');
// Use native promises
mongoose.Promise = global.Promise;
var pino = require('pino');
var mongoose_connector_1 = require('mongoose-connector');
var log = pino({ name: 'MongoDBAdaptor' });
// This adaptor converts application queries into Mongo queries
// and the query results into application results, suitable for use by cscFramework
var MongoDBAdaptor = (function () {
    function MongoDBAdaptor(mongodb_path, model) {
        this.mongodb_path = mongodb_path;
        this.model = model;
    }
    MongoDBAdaptor.createObjectId = function () {
        var _id = new mongoose.Types.ObjectId;
        return _id.toHexString();
    };
    MongoDBAdaptor.isEmpty = function (obj) {
        return (Object.keys(obj).length === 0);
    };
    // considers null, empty array, and obj._id to all be undefined
    MongoDBAdaptor.deepEqualObjOrMongo = function (lhs, rhs) {
        function coerceType(value) {
            if (typeof value === 'null')
                return undefined;
            if (Array.isArray(value) && (value.length === 0))
                return undefined;
            return value;
        }
        lhs = coerceType(lhs);
        rhs = coerceType(rhs);
        if ((lhs == null) && (rhs == null)) {
            return true;
        }
        if ((lhs == null) || (rhs == null)) {
            return false;
        }
        if (Array.isArray(lhs) && Array.isArray(rhs)) {
            if (lhs.length !== rhs.length) {
                return false;
            }
            else {
                return lhs.every(function (element, i) {
                    return MongoDBAdaptor.deepEqualObjOrMongo(element, rhs[i]);
                });
            }
        }
        else if ((lhs instanceof Date) && (rhs instanceof Date)) {
            return (lhs.getTime() == rhs.getTime());
        }
        else if ((typeof lhs === 'object') && (typeof rhs === 'object')) {
            var lhs_keys = Object.keys(lhs);
            var rhs_keys = Object.keys(rhs);
            // check each key, because a missing key is equivalent to an empty value at an existing key
            return lhs_keys.every(function (key) {
                if (key === '_id') {
                    // ignore _id fields, but compare id, as id is a user-defined field
                    return true;
                }
                else {
                    return MongoDBAdaptor.deepEqualObjOrMongo(lhs[key], rhs[key]);
                }
            });
        }
        else {
            return (lhs === rhs);
        }
    };
    MongoDBAdaptor.convertUpdateCommandToMongo = function (update) {
        if (update.cmd in MongoDBAdaptor.CONVERT_COMMAND) {
            var mongo_update = MongoDBAdaptor.CONVERT_COMMAND[update.cmd](update);
            return mongo_update;
        }
        else {
            throw new Error('unexpected update.cmd=' + update.cmd + ' field=' + update.field);
        }
    };
    MongoDBAdaptor.convertUpdateCommandsToMongo = function (updates) {
        var mongo_updates = [];
        for (var i = 0; i < updates.length; ++i) {
            var update = updates[i];
            var mongo_update = MongoDBAdaptor.convertUpdateCommandToMongo(update);
            mongo_updates.push(mongo_update);
        }
        return mongo_updates;
    };
    // Convert from mongoose.Document to plain object,
    // in particular, converting ObjectId to a string
    MongoDBAdaptor.getOverTheNetworkObject = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };
    // Converting ObjectId to a string
    MongoDBAdaptor.convertMongoIdsToStrings = function (obj) {
        if (obj != null) {
            if (Array.isArray(obj)) {
                obj.forEach(function (element, i, array) {
                    if (element) {
                        array[i] = MongoDBAdaptor.convertMongoIdsToStrings(element);
                    }
                });
            }
            else if (obj instanceof mongoose.Types.ObjectId) {
                obj = obj.toString();
            }
            else if (typeof obj === 'object') {
                Object.keys(obj).forEach(function (key) {
                    if (obj[key]) {
                        obj[key] = MongoDBAdaptor.convertMongoIdsToStrings(obj[key]);
                    }
                });
            }
        }
        return obj;
    };
    MongoDBAdaptor.prototype.connect = function (done) {
        if (done) {
            var onError = function (error) { console.log("mongoose_connect error=" + error); };
            mongoose_connector_1.connect(this.mongodb_path, onError, done);
        }
        else {
            return this.connect_promisified();
        }
    };
    MongoDBAdaptor.prototype.connect_promisified = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connect(function (error) {
                if (!error) {
                    resolve();
                }
                else {
                    reject(error);
                }
            });
        });
    };
    MongoDBAdaptor.prototype.disconnect = function (done) {
        if (done) {
            mongoose_connector_1.disconnect(done);
        }
        else {
            return this.disconnect_promisified();
        }
    };
    MongoDBAdaptor.prototype.disconnect_promisified = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connect(function (error) {
                if (!error) {
                    resolve();
                }
                else {
                    reject(error);
                }
            });
        });
    };
    // create(obj: T): Promise<T>
    // create(obj: T, done: ObjectCallback<T>): void
    MongoDBAdaptor.prototype.create = function (obj, done) {
        if (done) {
            if (obj['_id']) {
                done(new Error('_id isnt allowed for create'));
            }
            else {
                var document_1 = new this.model(obj);
                document_1.save(function (error, saved_doc) {
                    var result;
                    if (!error) {
                        var marshalable_doc = saved_doc.toObject();
                        // TODO: perhaps toObject should call convertMongoIdsToStrings? 
                        result = MongoDBAdaptor.convertMongoIdsToStrings(marshalable_doc);
                    }
                    else {
                        log.error({ function: 'MongoDBAdaptor.create', obj: obj, text: 'db save error', error: error });
                    }
                    done(error, result);
                });
            }
        }
        else {
            return this.create_promisified(obj);
        }
    };
    MongoDBAdaptor.prototype.create_promisified = function (obj) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.create(obj, function (error, result) {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    // read(_id: DatabaseID | DatabaseID[]) : Promise<T | T[]> 
    // read(_id: DatabaseID | DatabaseID[], done: ObjectOrArrayCallback<T>) : void
    MongoDBAdaptor.prototype.read = function (_id_or_ids, done) {
        if (done) {
            var mongoose_query;
            if (Array.isArray(_id_or_ids)) {
                var _ids = _id_or_ids;
                var mongoose_ids = _ids.map(function (_id) { return mongoose.Types.ObjectId.createFromHexString(_id); });
                mongoose_query = this.model.find({
                    '_id': { $in: mongoose_ids }
                });
            }
            else if ((typeof _id_or_ids == 'string') && (_id_or_ids.length > 0)) {
                var _id = _id_or_ids;
                mongoose_query = this.model.findById(_id);
            }
            if (mongoose_query) {
                mongoose_query.lean().exec().then(function (result) {
                    if (Array.isArray(result)) {
                        result.forEach(function (element) {
                            MongoDBAdaptor.convertMongoIdsToStrings(element);
                        });
                    }
                    else {
                        MongoDBAdaptor.convertMongoIdsToStrings(result);
                    }
                    done(undefined, result);
                }, function (error) {
                    done(error);
                });
            }
            else {
                done(new Error('_id is invalid'));
            }
        }
        else {
            return this.read_promisified(_id_or_ids);
        }
    };
    MongoDBAdaptor.prototype.read_promisified = function (_id_or_ids) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.read(_id_or_ids, function (error, result) {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    // TODO: obsolete this function, as all updates should be performed with update()
    // @return a Promise with the created element, if there is no callback
    MongoDBAdaptor.prototype.replace = function (obj, done) {
        if (done) {
            this.model.findById(obj['_id'], function (err, document) {
                // assume that all keys are present in obj
                for (var key in obj) {
                    document[key] = obj[key];
                }
                document.save(function (error, saved_doc) {
                    var result;
                    if (!error) {
                        var marshalable_doc = saved_doc.toObject();
                        // TODO: perhaps toObject should call convertMongoIdsToStrings? 
                        result = MongoDBAdaptor.convertMongoIdsToStrings(marshalable_doc);
                    }
                    else {
                        log.error({ function: 'MongoDBAdaptor.replace', obj: obj, text: 'db save error', error: error });
                    }
                    done(error, result);
                });
            });
        }
        else {
            return this.replace_promisified(obj);
        }
    };
    MongoDBAdaptor.prototype.replace_promisified = function (obj) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.replace(obj, function (error, result) {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    // @return a Promise with the matching elements
    MongoDBAdaptor.prototype.find = function (conditions, fields, sort, cursor, done) {
        if (done) {
            var mongoose_query = this.model.find(conditions, fields, cursor);
            if (sort != null) {
                mongoose_query.sort(sort);
            }
            if (cursor == null)
                cursor = {};
            if (cursor.start_offset == null)
                cursor.start_offset = 0;
            if (cursor.count == null)
                cursor.count = 10;
            if (cursor.start_offset != null) {
                mongoose_query.skip(cursor.start_offset);
            }
            if (cursor.count != null) {
                mongoose_query.limit(cursor.count);
            }
            mongoose_query.lean().exec().then(function (elements) {
                elements.forEach(function (element) {
                    MongoDBAdaptor.convertMongoIdsToStrings(element);
                });
                done(undefined, elements);
            }, function (error) {
                done(error);
            });
        }
        else {
            return this.find_promisified(conditions, fields, sort, cursor);
        }
    };
    MongoDBAdaptor.prototype.find_promisified = function (conditions, fields, sort, cursor) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.find(conditions, fields, sort, cursor, function (error, result) {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    // @return a Promise with the updated elements
    MongoDBAdaptor.prototype.update = function (conditions, updates, done) {
        var _this = this;
        function getId(conditions) {
            if ('_id' in conditions) {
                var condition = conditions._id;
                if (typeof condition == 'string') {
                    return condition;
                }
                else if (Array.isArray(condition)) {
                    if (condition.length == 1) {
                        if ((typeof condition[0] == 'string') || (!Array.isArray(condition[0]) && (typeof condition[0] == 'object'))) {
                            return condition[0];
                        }
                        else {
                            return null;
                        }
                    }
                    else {
                        return null;
                    }
                }
                else if (typeof condition == 'object') {
                    return condition;
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
        }
        var readDoc = function (_id) {
            var promise = _this.read(_id);
            return promise.then(function (result) {
                return result;
            });
        };
        var chainPromise = function (serial_promise, mongo_update, mongoose_query) {
            return serial_promise.then(function () {
                return mongoose_query.lean().exec().then(function (result) {
                    MongoDBAdaptor.convertMongoIdsToStrings(mongo_update);
                    return result;
                });
            });
        };
        if (done) {
            var mongo_updates = MongoDBAdaptor.convertUpdateCommandsToMongo(updates);
            if (mongo_updates.length == 0) {
                var error = new Error('no updates specified in update command for conditions=' + JSON.stringify(conditions));
                done(error);
            }
            else {
                var _id = getId(conditions);
                // apply the updates in the order they were given
                var initial_value = {};
                initial_value['MongoDBAdaptor.update.error'] = 'You should never see this!';
                var serial_promise = Promise.resolve(initial_value);
                for (var i = 0; i < mongo_updates.length; ++i) {
                    var mongo_update = mongo_updates[i];
                    var merged_conditions = {};
                    for (var key in conditions) {
                        merged_conditions[key] = conditions[key];
                    }
                    for (var key in mongo_update.query) {
                        merged_conditions[key] = mongo_update.query[key];
                    }
                    var mongoose_query = this.model.update(merged_conditions, mongo_update.update);
                    // preserve the mongoose_query value to match its promise
                    serial_promise = chainPromise(serial_promise, mongo_update, mongoose_query);
                }
                // when the last resolves, read the latest document
                var read_promise = serial_promise.then(function (result) {
                    return readDoc(_id);
                });
                read_promise.then(function (doc) {
                    done(undefined, doc);
                }, function (error) {
                    done(error);
                });
            }
        }
        else {
            return this.update_promisified(conditions, updates);
        }
    };
    MongoDBAdaptor.prototype.update_promisified = function (conditions, updates) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.update(conditions, updates, function (error, result) {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    // del(_id: DatabaseID) : Promise<void>
    // del(_id: DatabaseID, done: ErrorOnlyCallback) : void
    MongoDBAdaptor.prototype.del = function (_id, done) {
        if (done) {
            if (_id != null) {
                var mongoose_query = this.model.remove({ _id: _id });
                mongoose_query.lean().exec().then(function (data) {
                    done();
                }, function (error) {
                    done(error);
                });
            }
            else {
                done(new Error('_id is invalid'));
            }
        }
        else {
            return this.del_promisified(_id);
        }
    };
    MongoDBAdaptor.prototype.del_promisified = function (_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.del(_id, function (error) {
                if (!error) {
                    resolve(null);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    MongoDBAdaptor.CONVERT_COMMAND = {
        set: function (update) {
            var mongo_query = {};
            var set_args = {};
            if ('element_id' in update) {
                if ('key_field' in update) {
                    var key_path = update.field + '.' + update.key_field;
                    mongo_query[key_path] = update.element_id;
                    if ('subfield' in update) {
                        // case: array.set with subfield
                        var field_path = update.field + '.$.' + update.subfield;
                    }
                    else {
                        // case: array.set w/o subfield
                        field_path = update.field + '.$';
                    }
                }
                else {
                    // case: array contains simple types
                    var key_path = update.field;
                    mongo_query[key_path] = update.element_id;
                    field_path = update.field + '.$';
                }
            }
            else {
                // case: object.set
                field_path = update.field;
            }
            set_args[field_path] = update.value;
            return { query: mongo_query, update: { $set: set_args } };
        },
        unset: function (update) {
            var mongo_query = {};
            var unset_args = {};
            if ('element_id' in update) {
                if ('key_field' in update) {
                    var key_path = update.field + '.' + update.key_field;
                    mongo_query[key_path] = update.element_id;
                    if ('subfield' in update) {
                        // case: array.unset with subfield
                        var field_path = update.field + '.$.' + update.subfield;
                    }
                    else {
                        // invalid case: array.unset w/o subfield
                        throw new Error('cmd=unset not allowed on array without a subfield, use cmd=remove');
                    }
                }
                else {
                    // invalid case: array contains simple types
                    throw new Error('cmd=unset not allowed on array without a subfield, use cmd=remove');
                }
            }
            else {
                // case: object.unset
                field_path = update.field;
            }
            unset_args[field_path] = null;
            return { query: mongo_query, update: { $unset: unset_args } };
        },
        insert: function (update) {
            var mongo_query = {};
            var add_args = {};
            add_args[update.field] = update.value;
            return { query: mongo_query, update: { $addToSet: add_args } };
        },
        remove: function (update) {
            var mongo_query = {};
            var pull_args = {};
            var matcher;
            if ('element_id' in update) {
                if ('key_field' in update) {
                    matcher = {};
                    matcher[update.key_field] = update.element_id;
                }
                else {
                    matcher = update.element_id;
                }
            }
            else {
                throw new Error('invalid remove, update_cmd=' + JSON.stringify(update));
            }
            pull_args[update.field] = matcher;
            return { query: mongo_query, update: { $pull: pull_args } };
        }
    };
    return MongoDBAdaptor;
}());
exports.MongoDBAdaptor = MongoDBAdaptor;
