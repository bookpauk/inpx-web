//import _ from 'lodash';

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function keyEventToCode(event) {
    let result = [];
    let code = event.code;

    const modCode = code.substring(0, 3);
    if (event.metaKey && modCode != 'Met')
        result.push('Meta');
    if (event.ctrlKey && modCode != 'Con')
        result.push('Ctrl');
    if (event.shiftKey && modCode != 'Shi')
        result.push('Shift');
    if (event.altKey && modCode != 'Alt')
        result.push('Alt');
    
    if (modCode == 'Dig') {
        code = code.substring(5, 6);
    } else if (modCode == 'Key') {
        code = code.substring(3, 4);
    }
    result.push(code);

    return result.join('+');
}

