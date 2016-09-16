declare module 'DatabaseFactory' {

    export interface IDatabaseCursor {
        start_offset?:  number;
        count?:         number;
    }


    export interface IUpdateFieldCommand {
        cmd:            string;     // set, unset, and for arrays: insert, remove
        field:          string;
        key_field?:     string;     // The field that contains the unique key of an array element
        element_id?:    any;        // The unique key of an array element, required for selecting an array element
        subfield?:      string;     // the path within the array element for the value to be updated
        value?:         any;
    }


    interface IRequestQuery {
        ids?:           string[];   // DatabaseObjectID
        conditions?:    any;
        fields?:        string[];
        sort?:          any;
        cursor?:        IDatabaseCursor
    }


    interface IRequest {
        action:         string;
        // TYPENAME?:      T;    // used only by create, indexed by cscFrameworkServer.typename_key
        query?:         IRequestQuery;
        updates?:       IUpdateFieldCommand[];
    }


    interface IResponse_Result<T> {
        total_count?: number;
        elements: T[];
    }


    interface IResponse {
        error?: any;
        result?: any;
    }


    interface IResponseWStatus {
        http_status?:   number;
        response?:      IResponse;
    }


    export interface IDocumentDatabase {
        create(obj : any) : Promise<any>;
        read(conditions : any, fields? : any, sort?: any, cursor? : IDatabaseCursor) : Promise<any>;
        update(conditions : any, update : any, getOriginalDocument? : (doc : any) => void) : Promise<any>;
        delete(conditions : any, getOriginalDocument? : (doc : any) => void) : Promise<any>;
    }


    export interface IDatabaseFactory {
        create(typename : string) : IDocumentDatabase;
        disconnect(done? : () => void);
        createObjectId() : string;
    }


    export class DatabaseFactory implements IDatabaseFactory {
        constructor(db_type : string, done? : (db_factory : IDatabaseFactory) => void);
        disconnect(done? : () => void);
        create(typename : string) : IDocumentDatabase;
        createObjectId() : string;
    }

}
