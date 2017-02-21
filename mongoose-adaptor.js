"use strict";
const mongoose = require('mongoose');
// Use native promises
mongoose.Promise = global.Promise;
const pino = require('pino');
var log = pino({ name: 'mongoose-adaptor' });
exports.SUPPORTED_FEATURES = {
    replace: true,
    update: {
        object: {
            set: true,
            unset: true,
        },
        array: {
            set: true,
            unset: true,
            insert: true,
            remove: true,
        }
    },
    find: {
        all: true
    }
};
// This adaptor converts application queries into Mongo queries
// and the query results into application results, suitable for use by cscFramework
class MongooseDBAdaptor {
    constructor(client_name, mongodb_path, shared_connections, model) {
        this.client_name = client_name;
        this.mongodb_path = mongodb_path;
        this.shared_connections = shared_connections;
        this.model = model;
        this.shared_connections = shared_connections;
    }
    static createObjectId() {
        var _id = new mongoose.Types.ObjectId;
        return _id.toHexString();
    }
    static isEmpty(obj) {
        return (Object.keys(obj).length === 0);
    }
    static convertUpdateCommandToMongo(update) {
        if (update.cmd in MongooseDBAdaptor.CONVERT_COMMAND) {
            // TODO: [remove <any> cast from access to CONVERT_COMMAND](https://github.com/psnider/mongoose-adaptor/issues/2)
            var mongo_update = MongooseDBAdaptor.CONVERT_COMMAND[update.cmd](update);
            return mongo_update;
        }
        else {
            throw new Error('unexpected update.cmd=' + update.cmd + ' field=' + update.field);
        }
    }
    static convertUpdateCommandsToMongo(updates) {
        var mongo_updates = [];
        for (var i = 0; i < updates.length; ++i) {
            var update = updates[i];
            var mongo_update = MongooseDBAdaptor.convertUpdateCommandToMongo(update);
            mongo_updates.push(mongo_update);
        }
        return mongo_updates;
    }
    // Convert from mongoose.Document to plain object,
    // in particular, converting ObjectId to a string
    static getOverTheNetworkObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    // Converting ObjectId to a string
    static convertMongoIdsToStrings(obj) {
        if (obj != null) {
            if (Array.isArray(obj)) {
                obj.forEach((element, i, array) => {
                    if (element) {
                        array[i] = MongooseDBAdaptor.convertMongoIdsToStrings(element);
                    }
                });
            }
            else if (obj instanceof mongoose.Types.ObjectId) {
                obj = obj.toString();
            }
            else if (typeof obj === 'object') {
                Object.keys(obj).forEach((key) => {
                    if (obj[key]) {
                        obj[key] = MongooseDBAdaptor.convertMongoIdsToStrings(obj[key]);
                    }
                });
            }
        }
        return obj;
    }
    connect(done) {
        if (done) {
            var onError = (error) => {
                log.error({ error }, 'mongoose_connect');
            };
            this.shared_connections.connect(this.client_name, this.mongodb_path, { onError, connectDone: done });
        }
        else {
            return this.connect_promisified();
        }
    }
    connect_promisified() {
        return new Promise((resolve, reject) => {
            this.connect((error) => {
                if (!error) {
                    resolve();
                }
                else {
                    reject(error);
                }
            });
        });
    }
    disconnect(done) {
        if (done) {
            // TODO: [re-enable connect() once we no longer use the default mongoose connection](https://github.com/psnider/mongoose-adaptor/issues/5)
            // mongoose_disconnect(done)
            done();
        }
        else {
            return this.disconnect_promisified();
        }
    }
    disconnect_promisified() {
        return new Promise((resolve, reject) => {
            this.connect((error) => {
                if (!error) {
                    resolve();
                }
                else {
                    reject(error);
                }
            });
        });
    }
    create(obj, done) {
        if (done) {
            if (obj['_id']) {
                done(new Error('_id isnt allowed for create'));
            }
            else {
                obj._obj_ver = 1;
                let document = new this.model(obj);
                document.save((error, saved_doc) => {
                    let result;
                    if (!error) {
                        let marshalable_doc = saved_doc.toObject();
                        result = MongooseDBAdaptor.convertMongoIdsToStrings(marshalable_doc);
                    }
                    else {
                        log.error({ function: 'MongooseDBAdaptor.create', obj: obj, text: 'db save error', error: error });
                    }
                    done(error, result);
                });
            }
        }
        else {
            return this.create_promisified(obj);
        }
    }
    create_promisified(obj) {
        return new Promise((resolve, reject) => {
            this.create(obj, (error, result) => {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    read(_id_or_ids, done) {
        if (done) {
            var mongoose_query;
            if (Array.isArray(_id_or_ids)) {
                let _ids = _id_or_ids;
                mongoose_query = this.model.find({
                    '_id': { $in: _ids }
                });
            }
            else if ((typeof _id_or_ids == 'string') && (_id_or_ids.length > 0)) {
                let _id = _id_or_ids;
                mongoose_query = this.model.findById(_id);
            }
            if (mongoose_query) {
                mongoose_query.lean().exec().then((result) => {
                    if (Array.isArray(result)) {
                        result.forEach((element) => {
                            MongooseDBAdaptor.convertMongoIdsToStrings(element);
                        });
                    }
                    else {
                        MongooseDBAdaptor.convertMongoIdsToStrings(result);
                    }
                    done(undefined, result);
                }, (error) => {
                    done(error);
                });
            }
            else {
                done(new Error('_id_or_ids is invalid'));
            }
        }
        else {
            // TODO: [resolve type declarations for overloaded methods](https://github.com/psnider/mongoose-adaptor/issues/3)
            return this.read_promisified(_id_or_ids);
        }
    }
    read_promisified(_id_or_ids) {
        return new Promise((resolve, reject) => {
            // TODO: [resolve type declarations for overloaded methods](https://github.com/psnider/mongoose-adaptor/issues/3)
            this.read(_id_or_ids, (error, result) => {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    replace(obj, done) {
        if (done) {
            let copy = Object.assign({}, obj);
            copy._obj_ver = obj._obj_ver + 1;
            this.model.update({ _id: obj._id, _obj_ver: obj._obj_ver }, copy, { overwrite: true }, (error, mongo_result) => {
                // assume that all keys are present in obj
                if (!error) {
                    if (mongo_result.n === 1) {
                        this.read(obj._id, done);
                    }
                    else {
                        log.error({ function: 'MongooseDBAdaptor.replace', obj, text: `db replace count=${mongo_result.n}` });
                        done(new Error(`db replace count=${mongo_result.n}`));
                    }
                }
                else {
                    log.error({ function: 'MongooseDBAdaptor.replace', obj, text: 'db replace error', error });
                    done(error);
                }
            });
        }
        else {
            return this.replace_promisified(obj);
        }
    }
    replace_promisified(obj) {
        return new Promise((resolve, reject) => {
            this.replace(obj, (error, result) => {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    find(conditions, fields, sort, cursor, done) {
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
            mongoose_query.lean().exec().then((elements) => {
                elements.forEach((element) => {
                    MongooseDBAdaptor.convertMongoIdsToStrings(element);
                });
                done(undefined, elements);
            }, (error) => {
                done(error);
            });
        }
        else {
            return this.find_promisified(conditions, fields, sort, cursor);
        }
    }
    find_promisified(conditions, fields, sort, cursor) {
        return new Promise((resolve, reject) => {
            this.find(conditions, fields, sort, cursor, (error, result) => {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    update(_id, _obj_ver, updates, done) {
        var readDoc = (_id) => {
            let promise = this.read(_id);
            return promise.then((result) => {
                return result;
            });
        };
        var chainPromise = (serial_promise, mongo_update, mongoose_query) => {
            return serial_promise.then(() => {
                return mongoose_query.lean().exec().then((result) => {
                    MongooseDBAdaptor.convertMongoIdsToStrings(result);
                    return result;
                });
            });
        };
        if (done) {
            try {
                var mongo_updates = MongooseDBAdaptor.convertUpdateCommandsToMongo(updates);
            }
            catch (error) {
                done(error);
                return;
            }
            if (mongo_updates.length == 0) {
                var error = new Error(`no updates specified in update command for _id=${_id}`);
                done(error);
            }
            else {
                // TODO: figure out how to do this in one call
                // apply the updates in the order they were given
                var initial_value = {};
                initial_value['MongooseDBAdaptor.update.error'] = 'You should never see this!';
                var serial_promise = Promise.resolve(initial_value);
                let obj_ver_update = { query: {}, update: { $inc: { _obj_ver: 1 } } };
                mongo_updates.push(obj_ver_update);
                for (var i = 0; i < mongo_updates.length; ++i) {
                    var mongo_update = mongo_updates[i];
                    var merged_conditions = {};
                    for (var key in mongo_update.query) {
                        merged_conditions[key] = mongo_update.query[key];
                    }
                    ;
                    merged_conditions['_id'] = _id;
                    merged_conditions['_obj_ver'] = _obj_ver;
                    var mongoose_query = this.model.update(merged_conditions, mongo_update.update);
                    // preserve the mongoose_query value to match its promise
                    serial_promise = chainPromise(serial_promise, mongo_update, mongoose_query);
                }
                // when the last resolves, read the latest document
                var read_promise = serial_promise.then((result) => {
                    return readDoc(_id);
                });
                read_promise.then((doc) => {
                    done(undefined, doc);
                }, (error) => {
                    done(error);
                });
            }
        }
        else {
            return this.update_promisified(_id, _obj_ver, updates);
        }
    }
    update_promisified(_id, _obj_ver, updates) {
        return new Promise((resolve, reject) => {
            this.update(_id, _obj_ver, updates, (error, result) => {
                if (!error) {
                    resolve(result);
                }
                else {
                    reject(error);
                }
            });
        });
    }
    del(_id, done) {
        if (done) {
            if (_id != null) {
                var mongoose_query = this.model.remove({ _id });
                mongoose_query.lean().exec().then((data) => {
                    done();
                }, (error) => {
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
    }
    del_promisified(_id) {
        return new Promise((resolve, reject) => {
            this.del(_id, (error) => {
                if (!error) {
                    resolve(null);
                }
                else {
                    reject(error);
                }
            });
        });
    }
}
MongooseDBAdaptor.CONVERT_COMMAND = {
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
exports.MongooseDBAdaptor = MongooseDBAdaptor;
