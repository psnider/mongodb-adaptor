declare module 'mongod-mgr' {

    import child_process                    = require('child_process')


    export function startMongod(port : string, db_path : string, log_path : string, done : (error? : Error) => void) : child_process.ChildProcess
    export function stopMongod(spawned_mongod : child_process.ChildProcess, done : (error? : Error) => void)

}
