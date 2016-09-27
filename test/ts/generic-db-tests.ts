import chai                             = require('chai')
var expect                              = chai.expect

import Database                         = require('document-database-if')



// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_create<T>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, fieldnames: string[]) {
    it('+ should create a new object', function(done) {
        var db = getDB()
        var obj: T = createNewObject()
        db.create(obj).then(
            (created_obj) => {
                expect(created_obj).to.not.be.eql(obj)
                expect(created_obj._id).to.exist
                fieldnames.forEach((fieldname) => {
                    expect(created_obj[fieldname]).to.equal(obj[fieldname])
                })
                done()
            },
            (error) => {
                done(error)
            }
        )
    })
}


// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_read<T>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, fieldnames: string[]) {

    it('+ should read a previously created object', function(done) {
        var db = getDB()
        var obj: T = createNewObject()
        var create_promise = db.create(obj)
        create_promise.then(
            (created_obj) => {
                var read_promise = db.read(created_obj._id)
                read_promise.then(
                    (read_obj: T) => {
                        expect(read_obj).to.not.be.eql(obj)
                        fieldnames.forEach((fieldname) => {
                            expect(created_obj[fieldname]).to.equal(obj[fieldname])
                        })
                        done()
                    }
                )
            },
            (error) => {
                done(error)
            }
        )
    })


    it('+ should return no result for a non-existant object', function(done) {
        var db = getDB()
        var read_promise = db.read('ffffffffffffffffffffffff')
        read_promise.then(
            (result) => {
                expect(result).to.not.exist
                done()
            },
            (error) => {
                done(error)
            }
        )
    })
}



// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_replace<T>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, fieldnames: string[]) {

    it('+ should replace an existing object', function(done) {
        var db = getDB()
        var obj: T = createNewObject()
        var create_promise = db.create(obj)
        create_promise.then(
            (created_obj) => {
                created_obj.name = 'widget-replaced'
                created_obj.catalog_number = 'W-123-replaced'
                var replace_promise = db.replace(created_obj)
                replace_promise.then(
                    (replaced_obj) => {
                        expect(replaced_obj).to.not.eql(created_obj)
                        fieldnames.forEach((fieldname) => {
                            expect(created_obj[fieldname]).to.equal(obj[fieldname])
                        })
                        done()
                    },
                    (error) => {
                        done(error)
                    }
                )
                done()
            },
            (error) => {
                done(error)
            }
        )
    })

}

/**
// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_update<T extends {_id: string}>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, fieldnames: string[]) {

    function test_update(obj, conditions, update_cmd: Database.UpdateFieldCommand, done, tests) {
        var db = getDB()
        if (conditions == null)  conditions = {}
        var _id
        function update(result: T) {
            _id = result._id
            conditions['_id'] = _id
            return db.update(conditions, [update_cmd])
        }
        var create_promise = db.create(obj)
        var update_promise = create_promise.then(update)
        update_promise.then(
            (updated_obj) => {
                expect(updated_obj._id).to.equal(_id)
                tests(updated_obj)
                done()
            },
            (error) => {
                done(error)
            }
        )
    }


    describe('if selected item has a path without an array:', function() {

        describe('cmd=set:', function() {

            it('+ should replace an existing field in an object', function(done) {
                var PART = {
                    name:               'widget-u',
                    catalog_number:     'W-123.0'
                }
                var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: 'name', value: 'sideways widget'}
                test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                    expect(updated_obj.name).to.equal('sideways widget')
                })
            })


            it('+ should create a non-existant field in an object', function(done) {
                var PART = {
                    name:               'widget-u',
                    catalog_number:     'W-123.1'
                }
                var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: 'description', value: 'Used when upright isnt right'}
                test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                    expect(updated_obj.description).to.equal('Used when upright isnt right')
                })
            })

        })


        describe('cmd=unset', function() {

            it('+ should remove an existing field in an object', function(done) {
                var PART = {
                    name:               'widget-u',
                    catalog_number:     'W-123.2'
                }
                var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: 'name'}
                test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                    expect(updated_obj.name).to.be.undefined
                })
            })

        })

    })


    describe('if selected item has a path with an array', function() {

        describe('cmd=set', function() {

            it('+ should replace an existing element in an array of simple types', function(done) {
                var PART = {
                    name:               'widget-u',
                    catalog_number:     'W-123.3',
                    notes:              [NOTE]
                }
                var conditions = {notes: NOTE}
                var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: 'notes', element_id: NOTE, value: UPDATED_NOTE}
                test_update(PART, conditions, UPDATE_CMD, done, (updated_obj) => {
                    expect(updated_obj.notes.length).to.equal(1)
                    expect(updated_obj.notes[0]).to.equal(UPDATED_NOTE)
                })
            })


            it('+ should replace an existing element in an array of objects', function(done) {
                var PART = {
                    name:               'widget-u',
                    catalog_number:     'W-123.4',
                    components: [{part_id: PART_ID, info: {quantity: 1}}]
                }
                var conditions = {'components.part_id': PART_ID}
                var REPLACED_COMPONENT = {part_id: COMPONENT_PART_ID, info: {quantity: 1}}
                var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: 'components', key_field: 'part_id', element_id: PART_ID, value: REPLACED_COMPONENT}
                // TODO: fix: for some crazy reason, this sequence is modifying REPLACED_COMPONENT
                test_update(PART, conditions, UPDATE_CMD, done, (updated_obj) => {
                    expect(updated_obj.components.length).to.equal(1)
                    var component = updated_obj.components[0]
                    expect(component).to.deep.equal(REPLACED_COMPONENT)
                })
            })


            it('+ should create a new field in an existing element in an array of objects', function(done) {
                var PART = {
                    name:               'widget-u',
                    catalog_number:     'W-123.5',
                    components: [{part_id: PART_ID, info: {quantity: 1}}]
                }
                var conditions = {'components.part_id': PART_ID}
                var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: 'components', key_field: 'part_id', element_id: PART_ID, subfield: 'info.color', value: 'bronze'}
                test_update(PART, conditions, UPDATE_CMD, done, (updated_obj) => {
                    var component = updated_obj.components[0]
                    expect(component.info).to.deep.equal({color: 'bronze', quantity: 1})
                })
            })


            it('+ should replace an existing field in an existing element in an array of objects', function(done) {
                    var PART = {
                        name:               'widget-u',
                        catalog_number:     'W-123.6',
                        components: [{part_id: PART_ID, info: {quantity: 1}}]
                    }
                    var conditions = {'components.part_id': PART_ID}
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: 'components', key_field: 'part_id', element_id: PART_ID, subfield: 'info.quantity', value: 2}
                    test_update(PART, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var component = updated_obj.components[0]
                        expect(component.info).to.deep.equal({quantity: 2})
                    })
            })

        })


        describe('cmd=unset ', function() {

            it('+ should remove an existing field from an existing element in the array', function(done) {
                    var PART = {
                        name:               'widget-u',
                        catalog_number:     'W-123.7',
                        components: [{part_id: PART_ID, info: {quantity: 1}}]
                    }
                    var conditions = {'components.part_id': PART_ID}
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: 'components', key_field: 'part_id', element_id: PART_ID, subfield: 'info.quantity'}
                    test_update(PART, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var component = updated_obj.components[0]
                        expect(component.info).to.exist
                        expect(component.info.quantity).to.be.undefined
                    })
            })


            it('- should not remove or delete an existing element of an array of simple types', function(done) {
                    var PART = {
                        name:               'widget-u',
                        catalog_number:     'W-123.8',
                        notes:              [NOTE]
                    }
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: 'notes', element_id: NOTE}
                    test_update(PART, null, UPDATE_CMD, (error : Error) => {
                    if (error != null) {
                        expect(error.message).to.equal('cmd=unset not allowed on array without a subfield, use cmd=remove')
                        done()
                    } else {
                        var error = new Error('unset unexpectedly succeeded')
                        done(error)
                    }
                    }, () => {})
            })


            it('- should not remove or delete an existing element of an array of objects', function(done) {
                    var PART = {
                        name:               'widget-u',
                        catalog_number:     'W-123.9',
                        components: [{part_id: PART_ID, info: {quantity: 1}}]
                    }
                    var conditions = {'components.part_id': PART_ID}
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: 'components', key_field: 'part_id', element_id: PART_ID}
                    test_update(PART, conditions, UPDATE_CMD, (error : Error) => {
                    if (error != null) {
                        expect(error.message).to.equal('cmd=unset not allowed on array without a subfield, use cmd=remove')
                        done()
                    } else {
                        var error = new Error('unset unexpectedly succeeded')
                        done(error)
                    }
                    }, () => {})
            })

        })


        describe('cmd=insert', function() {

            it('+ should create a new element in an array of simple types', function(done) {
                    var PART = {
                        name:               'widget-u',
                        catalog_number:     'W-123.10',
                        notes:              [NOTE]
                    }
                    var ADDED_NOTE = 'compatible with both left- and right-widgets'
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'insert', field: 'notes', value: ADDED_NOTE}
                    test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                        var notes = updated_obj.notes
                        expect(notes.length).to.equal(2)
                        expect(notes[0]).to.equal(NOTE)
                        expect(notes[1]).to.equal(ADDED_NOTE)
                    })
            })


            it('+ should create a new element in an array of objects', function(done) {
                    var COMPONENT = {part_id: COMPONENT_PART_ID, info: {quantity: 1}}
                    var PART = {
                        name:              'widget-u',
                        catalog_number:    'W-123.11',
                        components:        [COMPONENT]
                    }
                    var ADDED_COMPONENT = {part_id: COMPONENT_PART_2_ID, info: {style: 'very stylish'}}
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'insert', field: 'components', value: ADDED_COMPONENT}
                    test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                        var components = getOverTheNetworkObject(updated_obj.components)
                        expect(components.length).to.equal(2)
                        // didn't compare entire component via deep.equal because of _id
                        expect(components[0].part_id).to.equal(COMPONENT.part_id)
                        expect(components[0].info).to.deep.equal(COMPONENT.info)
                        expect(components[1].part_id).to.equal(ADDED_COMPONENT.part_id)
                        expect(components[1].info).to.deep.equal(ADDED_COMPONENT.info)
                    })

            })

        })


        describe('cmd=remove', function() {

            it('+ should remove an existing element from an array of simple types', function(done) {
                    var PART = {
                        name:               'widget-u',
                        catalog_number:     'W-123.12',
                        notes:              [NOTE]
                    }
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'remove', field: 'notes', element_id: NOTE}
                    test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                        var notes = updated_obj.notes
                        expect(notes.length).to.equal(0)
                    })
            })


            it('+ should remove an existing element from an array of objects', function(done) {
                    var COMPONENT = {part_id: COMPONENT_PART_ID, info: {quantity: 1}}
                    var PART = {
                        name:              'widget-u',
                        catalog_number:    'W-123.13',
                        components:        [COMPONENT]
                    }
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'remove', field: 'components', key_field: 'part_id', element_id: COMPONENT_PART_ID}
                    test_update(PART, null, UPDATE_CMD, done, (updated_obj) => {
                        var notes = updated_obj.notes
                        expect(notes.length).to.equal(0)
                    })
            })

        })

    })

})
**/


// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_del<T>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, fieldnames: string[]) {

    it('+ should delete a previously created object', function(done) {
        var db = getDB()
        var obj: T = createNewObject()
        var create_promise = db.create(obj)
        create_promise.then(
            (created_obj) => {
                var del_promise = db.del(created_obj._id)
                del_promise.then(
                    (result) => {
                        expect(created_obj).to.not.be.eql(obj)
                        fieldnames.forEach((fieldname) => {
                            expect(created_obj[fieldname]).to.equal(obj[fieldname])
                        })
                    }
                ).then(
                    (result) => {
                        var read_promise = db.read(created_obj._id)
                        read_promise.then(
                            (read_obj) => {
                                expect(read_obj).to.not.exist
                                done()
                            },
                            (error) => {
                                done(error)
                            }
                        )
                    }
                )
            },
            (error) => {
                done(error)
            }
        )
    })

}


// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_find<T>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, unique_key_fieldname: string) {

    it('+ should find an object with a matching name', function(done) {
        var db = getDB()
        var obj: T = createNewObject()
        var create_promise = db.create(obj)
        create_promise.then(
            (created_obj) => {
                const conditions = {}
                conditions[unique_key_fieldname] = obj[unique_key_fieldname]
                var find_promise = db.find(conditions)
                find_promise.then(
                    (found_objs) => {
                console.log(`found_objs=${JSON.stringify(found_objs)}`)
                        expect(found_objs).to.be.instanceof(Array)
                        expect(found_objs).to.have.lengthOf(1)
                        const found_obj = found_objs[0]
                        expect(found_obj[unique_key_fieldname]).to.equal(obj[unique_key_fieldname])
                        done()
                    },
            (error) => {
                done(error)
            }
                )
            },
            (error) => {
                done(error)
            }
        )
    })

}