// NOTE: these tests call the versions for the functions that return Promises,
// as the Promise code wraps the callback versions,
// and this way both types are tested.


import chai                             = require('chai')
var expect                              = chai.expect
import fs                               = require('fs')
import child_process                    = require('child_process')
import mongoose                         = require('mongoose')
var ObjectId                            = mongoose.Schema.Types.ObjectId
import path                             = require('path')
import tmp                              = require('tmp')

import configure                        = require('configure-local')
import {UpdateFieldCommand} from 'document-database-if'
import {FieldsUsedInTests} from 'document-database-tests'


import {MongoDaemonRunner} from 'mongod-runner'
import {MongoDBAdaptor, UNSUPPORTED_UPDATE_CMDS} from 'mongodb-adaptor'
import {UpdateConfiguration, test_create, test_read, test_replace, test_del, test_update, test_find} from 'document-database-tests'

process.on('uncaughtException', function(error) {
  console.log('Found uncaughtException: ' + error)
})


function getOverTheNetworkObject(obj : any) : any {
    return JSON.parse(JSON.stringify(obj))
}



interface ConvertMongodbUpdateArgsTest {
    update_cmd:                 UpdateFieldCommand
    expected_mongo_query:       any
    expected_mongo_update:      any
}


interface ConvertMongodbUpdateArgsTests {
    [name : string]: ConvertMongodbUpdateArgsTest
}


namespace Parts {

    export interface Details {
        quantity?:           number
        style?:              string
        color?:              string
    }


    var DETAILS_SCHEMA_DEF = {
        quantity:           Number,
        style:              String,
        color:              String
    }


    export interface Component {
        part_id:            string  // The part ID in the database
        info?:              Details
    }


    var COMPONENT_SCHEMA_DEF = {
        part_id:            ObjectId,  // The part ID in the database
        info:               DETAILS_SCHEMA_DEF
    }


    export interface Part {
        _id?:                string
        name:                string
        description?:        string
        catalog_number:      string
        notes?:              [string]
        details?:            Details
        components?:         [Component]
    }


    var PART_SCHEMA_DEF = {
        name:               String,
        description:        String,
        catalog_number:     String,
        notes:              [String],
        details:            DETAILS_SCHEMA_DEF,
        components:         [COMPONENT_SCHEMA_DEF]
    }

    var SCHEMA = new mongoose.Schema(PART_SCHEMA_DEF)
    export var Model = mongoose.model('Part', SCHEMA)

}
type Part = Parts.Part


var fields_used_in_tests: FieldsUsedInTests = {
    populated_string: 'name',
    unpopulated_string: 'description',
    string_array: {name: 'notes'},
    obj_array: {
        name: 'components',
        key_field: 'part_id',
        populated_field: {name: 'info.quantity', type: 'number'},
        unpopulated_field: {name: 'info.color', type: 'string'},
        createElement: createNewPartComponent
    }
}


describe('deepEqualObjOrMongo', function() {
    
    var deepEqualObjOrMongo = MongoDBAdaptor.deepEqualObjOrMongo
    

    it('+ should compare null-equivalent values as equal', function() {
        expect(deepEqualObjOrMongo(null, null)).to.be.true
        expect(deepEqualObjOrMongo(undefined, undefined)).to.be.true
        expect(deepEqualObjOrMongo(null, undefined)).to.be.true
        expect(deepEqualObjOrMongo(undefined, null)).to.be.true
    })
            

    it('+ should compare null-equivalent and non-null-equivalent values as not equal', function() {
        expect(deepEqualObjOrMongo(null, 0)).to.be.false
        expect(deepEqualObjOrMongo(0, null)).to.be.false
        expect(deepEqualObjOrMongo(undefined, 0)).to.be.false
        expect(deepEqualObjOrMongo(0, undefined)).to.be.false
    })
            

    it('+ should compare equivalent arrays as equal', function() {
        expect(deepEqualObjOrMongo([1,'b',3], [1,'b',3])).to.be.true
    })
            

    it('+ should compare unequivalent arrays as not equal', function() {
        expect(deepEqualObjOrMongo([1,'b',3], [1,'b',3, 4])).to.be.false
        expect(deepEqualObjOrMongo([1,'b',3], [1,'b',3.01])).to.be.false
    })
            

    it('+ should compare equivalent objects as equal', function() {
        expect(deepEqualObjOrMongo({a: 1, b: 2}, {b: 2, a: 1})).to.be.true
    })
            

    it('+ should compare unequivalent objects as not equal', function() {
        expect(deepEqualObjOrMongo({a: 1, b: 2}, {a: 1, b: 3})).to.be.false
        expect(deepEqualObjOrMongo({a: 1, b: 2}, {a: 1, c: 2})).to.be.false
    })
            

    it('+ should compare equivalent Dates as equal', function() {
        var base_time = 1000000000000
        expect(deepEqualObjOrMongo(new Date(base_time), new Date(base_time))).to.be.true
    })
            

    it('+ should compare unequivalent Dates as notequal', function() {
        var base_time = 1000000000000
        expect(deepEqualObjOrMongo(new Date(base_time), new Date(base_time + 2000))).to.be.false
    })
            
})


var next_part_number = 0
function createNewPart(): Part {
    next_part_number++
    return {
        name:               'widget',
        catalog_number:     `W-${next_part_number}`,
        notes:              ['all purpose'],
        components:         [createNewPartComponent()]
    }
}
function createNewPartComponent(): Parts.Component {
    return {
        part_id: MongoDBAdaptor.createObjectId(),
        info: {
            quantity: (next_part_number % 2),
            style:    ((next_part_number % 2) == 0) ? 'old' : 'new'
        }
    }
}


describe('MongoDBAdaptor', function() {

    var PORT = 27016  // one less than the default port

    var NOTE = 'dont use with anti-widgets!'
    var UPDATED_NOTE = 'It actually works with anti-widgets!'
    var PART_ID = '123400000000000000000000'
    var COMPONENT_PART_ID = '123411111111111111111111'
    var COMPONENT_PART_2_ID = '123422222222222222222222'

    var mongo_daemon: MongoDaemonRunner

    var PARTS_ADAPTOR: MongoDBAdaptor

    function getPartsAdaptor(): MongoDBAdaptor  {return PARTS_ADAPTOR}

    before(function(done) {
        mongo_daemon = new MongoDaemonRunner({port: PORT, use_tmp_dir: true, disable_logging: true})
        mongo_daemon.start((error) => {
            if (!error) {
                // TODO: move to configuration
                var mongo_path = `localhost:${PORT}/test`
                PARTS_ADAPTOR = new MongoDBAdaptor(mongo_path, Parts.Model)
                PARTS_ADAPTOR.connect((error) => {
                    done(error)
                })
            } else {
                done(error)
            }
        })
    })


    after(function(done) {
        PARTS_ADAPTOR.disconnect((error) => {
            if (!error) {
                mongo_daemon.stop((error) => {
                    done(error)
                })
            } else {
                done(error)
            }
        })
    })


    describe('convertUpdateCommandToMongo()', function() {

        var NON_ARRAY = {a: 1, b: 2}
        var ARRAY = [3, 4]
        var KEY = 'key'
        var ELEMENT_ID = 'el-id'


        // This test data comes from the table in ./doc/MongoDB_management.md
        var CONVERT_TO_UPDATE_ARGS_TESTS : ConvertMongodbUpdateArgsTests = {
            SET_NONARRAY_FIELD_IN_OBJECT: {
                update_cmd: {cmd: 'set', field: 'n1.n2', value: NON_ARRAY},
                expected_mongo_query: {},
                expected_mongo_update: {$set: {'n1.n2': NON_ARRAY}}
            },
            SET_ARRAY_FIELD_IN_OBJECT: {
                update_cmd: {cmd: 'set', field: 'n1.a1', value: ARRAY},
                expected_mongo_query: {},
                expected_mongo_update: {$set: {'n1.a1': ARRAY}}
            },
            UNSET_NONARRAY_FIELD_IN_OBJECT: {
                update_cmd: {cmd: 'unset', field: 'n1.n2'},
                expected_mongo_query: {},
                expected_mongo_update: {$unset: {'n1.n2': null}}
            },
            UNSET_ARRAY_FIELD_IN_OBJECT: {
                update_cmd: {cmd: 'unset', field: 'n1.a1'},
                expected_mongo_query: {},
                expected_mongo_update: {$unset: {'n1.a1': null}}
            },

            SET_ELEMENT_OF_ARRAY: {
                update_cmd: {cmd: 'set', field: 'n1.a1', key_field: KEY, element_id: ELEMENT_ID, value: NON_ARRAY},
                expected_mongo_query: {'n1.a1.key': ELEMENT_ID},
                expected_mongo_update: {$set: {'n1.a1.$': NON_ARRAY}}
            },
            SET_FIELD_IN_ELEMENT_OF_ARRAY: {
                update_cmd: {cmd: 'set', field: 'n1.a1', key_field: KEY, element_id: ELEMENT_ID, subfield: 'n2.n3', value: NON_ARRAY},
                expected_mongo_query: {'n1.a1.key': ELEMENT_ID},
                expected_mongo_update: {$set: {'n1.a1.$.n2.n3': NON_ARRAY}}
            },
            UNSET_FIELD_IN_ELEMENT_OF_ARRAY: {
                update_cmd: {cmd: 'unset', field: 'n1.a1', key_field: KEY, element_id: ELEMENT_ID, subfield: 'n2.n3'},
                expected_mongo_query: {'n1.a1.key': ELEMENT_ID},
                expected_mongo_update: {$unset: {'n1.a1.$.n2.n3': null}}
            },
            INSERT_ELEMENT_INTO_ARRAY: {
                update_cmd: {cmd: 'insert', field: 'n1.a1', value: NON_ARRAY},
                expected_mongo_query: {},
                expected_mongo_update: {$set: {$addToSet: {'n1.a1': NON_ARRAY}}}
            },
            REMOVE_ELEMENT_FROM_ARRAY: {
                update_cmd: {cmd: 'remove', field: 'n1.a1', key_field: KEY, element_id: ELEMENT_ID},
                expected_mongo_query: {},
                expected_mongo_update: {$pull: {'n1.a1': {KEY: ELEMENT_ID}}}
            }
        }


        function test_convertUpdateCommandToMongo(test_desc : ConvertMongodbUpdateArgsTest) {
            var mongo_update = MongoDBAdaptor.convertUpdateCommandToMongo(test_desc.update_cmd)
            expect(mongo_update.query).to.deep.equal(test_desc.expected_mongo_query)
            //expect(mongo_update.update).to.deep.equal(test_desc.expected_mongo_update)
        }


        it('+ should convert: set a non-array field in an object', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['SET_NONARRAY_FIELD_IN_OBJECT'])
        })


        it('+ should convert: set an array field in an object', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['SET_ARRAY_FIELD_IN_OBJECT'])
        })


        it('+ should convert: unset a non-array field in an object', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['UNSET_NONARRAY_FIELD_IN_OBJECT'])
        })


        it('+ should convert: unset an array field in an object', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['UNSET_ARRAY_FIELD_IN_OBJECT'])
        })


        it('+ should convert: set an element of an array', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['SET_ELEMENT_OF_ARRAY'])
        })


        it('+ should convert: set a field in an element of an array', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['SET_FIELD_IN_ELEMENT_OF_ARRAY'])
        })


        it('+ should convert: unset a field in an element of an array', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['UNSET_FIELD_IN_ELEMENT_OF_ARRAY'])
        })


        it('+ should convert: insert an element into an array', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['INSERT_ELEMENT_INTO_ARRAY'])
        })


        it('+ should convert: remove an element from an array', function() {
            test_convertUpdateCommandToMongo(CONVERT_TO_UPDATE_ARGS_TESTS['REMOVE_ELEMENT_FROM_ARRAY'])
        })

    })


    describe('create()', function() {
         test_create<Part>(getPartsAdaptor, createNewPart, ['name', 'catalog_number'])        
    })


    describe('read()', function() {
         test_read<Part>(getPartsAdaptor, createNewPart, ['name', 'catalog_number'])        
    })


    describe('replace()', function() {
         test_replace<Part>(getPartsAdaptor, createNewPart, ['name', 'catalog_number'])        
    })


    describe('update()', function() {
        var fieldnames: UpdateConfiguration = {
            test: fields_used_in_tests,
            unsupported: UNSUPPORTED_UPDATE_CMDS
        }

        test_update<Part>(getPartsAdaptor, createNewPart, fieldnames)
    })


    describe('del()', function() {
         test_del<Part>(getPartsAdaptor, createNewPart, ['name', 'catalog_number'])        
    })


    describe('find()', function() {
         test_find<Part>(getPartsAdaptor, createNewPart, 'catalog_number')        
    })

})