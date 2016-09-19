declare module 'Database' {

    export interface DatabaseCursor {
        start_offset?:  number
        count?:         number
    }


    export interface UpdateFieldCommand {
        cmd:            string;     // set, unset, and for arrays: insert, remove
        field:          string
        key_field?:     string;     // The field that contains the unique key of an array element
        element_id?:    any;        // The unique key of an array element, required for selecting an array element
        subfield?:      string;     // the path within the array element for the value to be updated
        value?:         any
    }


    interface RequestQuery {
        ids?:           string[];   // DatabaseObjectID
        conditions?:    Object
        fields?:        string[]
        sort?:          Object
        cursor?:        DatabaseCursor
    }


    interface Request {
        action:         string
        // TYPENAME?:      T;    // used only by create, indexed by cscFrameworkServer.typename_key
        query?:         RequestQuery
        updates?:       UpdateFieldCommand[]
    }


    interface Response_Result<T> {
        total_count?: number
        elements: T[]
    }


    interface Response {
        error?: any
        result?: Object
    }


    interface ResponseWStatus {
        http_status?:   number
        response?:      Response
    }


    export interface DocumentDatabase {
        create(obj : Object) : Promise<Object>
        readById(id : String) : Promise<{elements: Object[]}>
        read(conditions : Object, fields? : Object, sort?: Object, cursor? : DatabaseCursor) : Promise<{elements: Object[]}>
        update(conditions : Object, update : Object, getOriginalDocument? : (doc : Object) => void) : Promise<Object>
        delete(conditions : Object, getOriginalDocument? : (doc : Object) => void) : Promise<Object>
    }

}
