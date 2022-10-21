import { defineComponent } from 'vue';
import _ from 'lodash';

export default function(componentClass) {    
    const comp = {};
    const obj = new componentClass();
    
    //data, options, props
    const data = {};
    for (const prop of Object.getOwnPropertyNames(obj)) {
        if (['_options', '_props'].includes(prop)) {//meta props
            if (prop === '_options') {
                const options = obj[prop];
                for (const optName of ['components', 'watch', 'emits']) {
                    if (options[optName]) {
                        comp[optName] = options[optName];
                    }
                }
            } else if (prop === '_props') {
                comp.props = obj[prop];
            }
        } else {//usual prop
            data[prop] = obj[prop];
        }
    }
    comp.data = () => _.cloneDeep(data);
    
    //methods
    const methods = {};
    const computed = {};

    let classProto = Object.getPrototypeOf(obj);
    while (classProto) {
        const classMethods = Object.getOwnPropertyNames(classProto);
        for (const method of classMethods) {
            const desc = Object.getOwnPropertyDescriptor(classProto, method);
            if (desc.get) {//has getter, computed
                if (!computed[method]) {
                    computed[method] = {get: desc.get};
                    if (desc.set)
                        computed[method].set = desc.set;
                }
            } else if ( ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'activated',
                        'deactivated', 'beforeUnmount', 'unmounted', 'errorCaptured', 'renderTracked', 'renderTriggered',
                        'setup'].includes(method) ) {//life cycle hooks
                if (!comp[method])
                    comp[method] = obj[method];
            } else if (method !== 'constructor') {//usual
                if (!methods[method])
                    methods[method] = obj[method];
            }
        }

        classProto = Object.getPrototypeOf(classProto);
    }
    comp.methods = methods;
    comp.computed = computed;

    //console.log(comp);
    return defineComponent(comp);
}
