import { ComponentWatchOptions } from "@vue/runtime-core";

const isObject=  function(obj: any): boolean {
    return(obj !== undefined && typeof(obj) === "object" && !Array.isArray(obj) && obj instanceof Object);
};

const deepMap = function(target: {}, callback: Function, filter: Function|undefined = undefined, path: Array<any> = []): {} {
    if(isObject(target)) {
        let keys: Array<string|number> = Object.keys(target);

        for(let index = 0; index < keys.length; index++) {
            let key   = keys[index];
            let value = target[key];
            let self  = path.concat([key]);

            let map = filter ? filter(value, target) : "map";

            if ((isObject(value) || Array.isArray(value)) && map !== "ignore") {
                value = deepMap(value, callback, filter, self);
            }

            if(map === "map") {
                value = callback(value, self);
            }

            target[key] = value;
        }
    }

    return target;
};

const dots = function(obj: {}, using: string = ".", arrays: boolean = true,  path: Array<any> = []): {} {
    let keys: Array<string|number> = Object.keys(obj);
    let store: {[key: string]: any} = {};

    for(let index = 0; index < keys.length; index++) {
        let key   = keys[index];
        let value = obj[key];
        let self = [...path, key];

        if(isObject(value)) {
            store = Object.assign(store, dots(value, using, arrays, self));
        }
        else if(Array.isArray(value) && arrays) {
            for(let arrayIndex = 0; arrayIndex < value.length; arrayIndex++) {
                let arrayValue = value[arrayIndex];

                store[[self, arrayIndex.toString()].join(using)] = arrayValue;
            }
        }
        else {
            store[self.join(using)] = value;
        }
    }

    return store;
};

const mapObject = function(obj: {}, callback: Function): {} {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => callback(k, v, i)
        )
    );
};

export async function createStore(prefix: string, defaults: {}): Promise<{store: {}, watchers: ComponentWatchOptions<any>}> {
    const store: {} = deepMap(
        defaults,
        function(fallback: any, path: Array<string>): any {
            let self = [prefix, ...path].join(".");
    
            return window.localStorage.has(self) ? JSON.parse(window.localStorage.get(self) || "null") : fallback;
        },
        (v: any): boolean|string => !isObject(v) && "map",
        []
   );
   
   const watchers: ComponentWatchOptions = mapObject(
       dots(store, ".", false),
       function(key: string, value: any): [string, {}] {
           return ["store."+key, {
               handler(before: any, after: any): void {
                   window.localStorage.set(prefix+"."+key, JSON.stringify(before));
               }
           }];
       }
   ) as ComponentWatchOptions;

   return { store, watchers };
};