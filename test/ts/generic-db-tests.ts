import chai                             = require('chai')
var expect                              = chai.expect

import Database                         = require('document-database-if')


// @return the element at given field path, e.g. "hat.size""
function getValue(obj, fieldpath) {
    var name_components = fieldpath.split('.');
    for (var i in name_components) {
        var name_component = name_components[i];
        obj = obj[name_component];
        if (obj == null)
            return null;
    }
    return obj;
}



function getRandomValue(type: string): number | string {
    var value: number | string = Math.random()
    if (type === 'string') {
        value = value.toString()
    }
    return value
}



function expectDBOjectToContainAllObjectFields(db_obj, obj) {
    for (var key in obj) {
        expect(obj[key]).to.deep.equal(db_obj[key])
    }
}

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

// Any missing fields prevent any dependent tests from being run.
export interface Field {
    name: string 
    type: 'number' | 'string'
}

export interface Fieldnames {
    top_level?: {
        // must refer to a top-level field that is not present and supports operator "+ 1" (either a string or a number)
        populated_string?: string
        // must refer to a top-level field that is a string, and is not present
        unpopulated_string?: string
        string_array?: {
            name: string
        }
        obj_array?: {
            name: string
            key_field: string
            populated_field: Field
            unpopulated_field: Field
            createElement: () => {}   // 2 sequential calls must return different results
        }
    }
}
// seem to need getDB to be dynamic, otherwise DocumentDatabase is undefined!
export function test_update<T extends {_id?: string}>(getDB: () => Database.DocumentDatabase<T>, createNewObject: () => T, fieldnames: Fieldnames) {

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

    if (fieldnames.top_level) {

        describe('if selected item has a path without an array:', function() {

            describe('cmd=set:', function() {

                if (fieldnames.top_level.populated_string) {

                    it('+ should replace an existing field in an object', function(done) {
                        var obj: T = createNewObject()
                        var populated_string = fieldnames.top_level.populated_string 
                        expect(obj[populated_string]).to.exist
                        var replacement_value = obj[populated_string] + 1
                        var UPDATE_CMD: Database.UpdateFieldCommand = {cmd: 'set', field: populated_string, value: replacement_value}
                        test_update(obj, null, UPDATE_CMD, done, (updated_obj) => {
                            expect(updated_obj[populated_string]).to.equal(replacement_value)
                        })
                    })

                }

                if (fieldnames.top_level.unpopulated_string) {

                    it('+ should create a non-existant field in an object', function(done) {
                        var obj: T = createNewObject()
                        var unpopulated_string = fieldnames.top_level.unpopulated_string 
                        expect(obj[unpopulated_string]).to.not.exist
                        var value = 'abc'
                        var UPDATE_CMD: Database.UpdateFieldCommand = {cmd: 'set', field: unpopulated_string, value}
                        test_update(obj, null, UPDATE_CMD, done, (updated_obj) => {
                            expect(updated_obj[unpopulated_string]).to.equal(value)
                        })
                    })

                }

            })


            describe('cmd=unset', function() {

                if (fieldnames.top_level.populated_string) {

                    it('+ should remove an existing field in an object', function(done) {
                        var obj: T = createNewObject()
                        var populated_string = fieldnames.top_level.populated_string 
                        var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: populated_string}
                        test_update(obj, null, UPDATE_CMD, done, (updated_obj) => {
                            expect(updated_obj[populated_string]).to.be.undefined
                        })
                    })

                }

            })

        })

    }  // end if (fieldnames.top_level)


    if (fieldnames.top_level.string_array || fieldnames.top_level.obj_array) {

        describe('if selected item has a path with an array', function() {

            describe('cmd=set', function() {

                if (fieldnames.top_level.string_array) {

                    it('+ should replace an existing element in an array of simple types', function(done) {
                        var string_array = fieldnames.top_level.string_array
                        var obj: T = createNewObject()
                        const original_value = 'for all uses'
                        const updated_value = 'dont use with anti-widgets!'
                        obj[string_array.name] = [original_value]
                        var conditions = {}
                        conditions[string_array.name] = original_value
                        var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: string_array.name, element_id: original_value, value: updated_value}
                        test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                            expect(updated_obj[string_array.name].length).to.equal(1)
                            expect(updated_obj[string_array.name][0]).to.equal(updated_value)
                        })
                    })

                }



                it('+ should replace an existing element in an array of objects', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var obj: T = createNewObject()
                    var original_first_element = obj[obj_array.name][0]
                    var original_element_id = original_first_element[obj_array.key_field]
                    var path = `${obj_array.name}.${obj_array.key_field}`
                    var conditions = {}
                    conditions[path] = original_element_id
                    var REPLACED_COMPONENT = obj_array.createElement()
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: obj_array.name, key_field: obj_array.key_field, element_id: original_element_id, value: REPLACED_COMPONENT}
                    test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                        expect(updated_obj.components.length).to.equal(1)
                        var component = updated_obj.components[0]
                        expect(component).to.deep.equal(REPLACED_COMPONENT)
                    })
                })


                it('+ should create a new field in an existing element in an array of objects', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var unpopulated_field = fieldnames.top_level.obj_array.unpopulated_field
                    var obj: T = createNewObject()
                    var original_first_element = obj[obj_array.name][0]
                    var original_element_id = original_first_element[obj_array.key_field]
                    var path = `${obj_array.name}.${obj_array.key_field}`
                    var conditions = {}
                    conditions[path] = original_element_id
                    var value = getRandomValue(unpopulated_field.type)
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: obj_array.name, key_field: obj_array.key_field, element_id: original_element_id, subfield: unpopulated_field.name, value}
                    test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var component = updated_obj.components[0]
                        var updated_value = getValue(component, unpopulated_field.name)
                        expect(updated_value).to.equal(value)
                    })
                })


                it('+ should replace an existing field in an existing element in an array of objects', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var populated_field = fieldnames.top_level.obj_array.populated_field
                    var obj: T = createNewObject()
                    var original_first_element = obj[obj_array.name][0]
                    var original_element_id = original_first_element[obj_array.key_field]
                    var path = `${obj_array.name}.${obj_array.key_field}`
                    var conditions = {}
                    conditions[path] = original_element_id
                    var replacement_obj: T = createNewObject()
                    var value = getValue(replacement_obj[obj_array.name][0], populated_field.name)
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'set', field: obj_array.name, key_field: obj_array.key_field, element_id: original_element_id, subfield: populated_field.name, value}
                    test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var component = updated_obj.components[0]
                        var updated_value = getValue(component, populated_field.name)
                        expect(updated_value).to.equal(value)
                    })
                })
            
            })


            describe('cmd=unset ', function() {

                it('+ should remove an existing field from an existing element in the array', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var populated_field = fieldnames.top_level.obj_array.populated_field
                    var obj: T = createNewObject()
                    var original_first_element = obj[obj_array.name][0]
                    var original_element_id = original_first_element[obj_array.key_field]
                    var path = `${obj_array.name}.${obj_array.key_field}`
                    var conditions = {}
                    conditions[path] = original_element_id
                    var replacement_obj: T = createNewObject()
                    var value = getValue(replacement_obj[obj_array.name][0], populated_field.name)
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: obj_array.name, key_field: obj_array.key_field, element_id: original_element_id, subfield: populated_field.name}
                    test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var component = updated_obj.components[0]
                        expect(component.info).to.exist
                        expect(component.info.quantity).to.be.undefined
                    })
                })


                it('- should not remove or delete an existing element of an array of simple types', function(done) {
                    var string_array = fieldnames.top_level.string_array
                    var obj: T = createNewObject()
                    const original_value = 'for all uses'
                    obj[string_array.name] = [original_value]
                    var conditions = {}
                    conditions[string_array.name] = original_value
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: string_array.name, element_id: original_value}
                    test_update(obj, conditions, UPDATE_CMD, (error : Error) => {
                        if (error != null) {
                            expect(error.message).to.equal('cmd=unset not allowed on array without a subfield, use cmd=remove')
                            done()
                        } else {
                            var error = new Error('unset unexpectedly succeeded')
                            done(error)
                        }
                    }, () => {/* no tests */})
                })


                it('- should not remove or delete an existing element of an array of objects', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var obj: T = createNewObject()
                    const original_first_element = obj[obj_array.name][0]
                    var original_element_id = original_first_element[obj_array.key_field]
                    var path = `${obj_array.name}.${obj_array.key_field}`
                    var conditions = {}
                    conditions[path] = original_element_id
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'unset', field: obj_array.name, key_field: obj_array.key_field, element_id: original_element_id}
                    test_update(obj, conditions, UPDATE_CMD, (error : Error) => {
                        if (error != null) {
                            expect(error.message).to.equal('cmd=unset not allowed on array without a subfield, use cmd=remove')
                            done()
                        } else {
                            var error = new Error('unset unexpectedly succeeded')
                            done(error)
                        }
                    }, () => {/* no tests */})
                })

            })


            describe('cmd=insert', function() {

                it('+ should create a new element in an array of simple types', function(done) {
                    var string_array = fieldnames.top_level.string_array
                    var obj: T = createNewObject()
                    const original_value = getRandomValue('string')
                    obj[string_array.name] = [original_value]
                    var conditions = {}
                    conditions[string_array.name] = original_value
                    const additional_value = getRandomValue('string')
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'insert', field: string_array.name, value: additional_value}
                    test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var array = updated_obj[string_array.name]
                        expect(array.length).to.equal(2)
                        expect(array[0]).to.equal(original_value)
                        expect(array[1]).to.equal(additional_value)
                    })
                })


                it('+ should create a new element in an array of objects', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var obj: T = createNewObject()
                    const original_first_element = obj[obj_array.name][0]
                    var original_element_id = original_first_element[obj_array.key_field]
                    var path = `${obj_array.name}.${obj_array.key_field}`
                    var conditions = {}
                    conditions[path] = original_element_id
                    var added_element = obj_array.createElement()
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'insert', field: obj_array.name, value: added_element}
                    test_update(obj, conditions, UPDATE_CMD, done, (updated_obj) => {
                        var array = updated_obj[obj_array.name]
                        expect(array).to.have.lengthOf(2)
                        // didn't compare entire component via deep.equal because of _id
                        expectDBOjectToContainAllObjectFields(array[0], original_first_element)
                        expectDBOjectToContainAllObjectFields(array[1], added_element)
                    })
                })

            })


            describe('cmd=remove', function() {

                it('+ should remove an existing element from an array of simple types', function(done) {
                    var string_array = fieldnames.top_level.string_array
                    var obj: T = createNewObject()
                    expect(obj[string_array.name]).to.have.lengthOf(1)
                    var original_value = obj[string_array.name][0]
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'remove', field: string_array.name, element_id: original_value}
                    test_update(obj, undefined, UPDATE_CMD, done, (updated_obj) => {
                        expect(updated_obj[string_array.name]).to.have.lengthOf(0)
                    })
                })


                it('+ should remove an existing element from an array of objects', function(done) {
                    var obj_array = fieldnames.top_level.obj_array
                    var obj: T = createNewObject()
                    expect(obj[obj_array.name]).to.have.lengthOf(1)
                    const first_element = obj[obj_array.name][0]
                    var element_id = first_element[obj_array.key_field]
                    var UPDATE_CMD : Database.UpdateFieldCommand = {cmd: 'remove', field: obj_array.name, key_field: obj_array.key_field, element_id}
                        test_update(obj, null, UPDATE_CMD, done, (updated_obj) => {
                            expect(updated_obj[obj_array.name]).to.have.lengthOf(0)
                        })
                })

            })

        })

    }  // end if (fieldnames.array)

}



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