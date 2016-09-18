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
        conditions?:    any
        fields?:        string[]
        sort?:          any
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
        result?: any
    }


    interface ResponseWStatus {
        http_status?:   number
        response?:      Response
    }


    export interface DocumentDatabase {
        create(obj : any) : Promise<any>
        read(conditions : any, fields? : any, sort?: any, cursor? : DatabaseCursor) : Promise<any>
        update(conditions : any, update : any, getOriginalDocument? : (doc : any) => void) : Promise<any>
        delete(conditions : any, getOriginalDocument? : (doc : any) => void) : Promise<any>
    }

}
