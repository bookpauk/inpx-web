import dayjs from 'dayjs';
import {Buffer} from 'safe-buffer';
//import _ from 'lodash';

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function toHex(buf) {
    return Buffer.from(buf).toString('hex');
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

export function wordEnding(num, type = 0) {
    const endings = [
        ['ов', '', 'а', 'а', 'а', 'ов', 'ов', 'ов', 'ов', 'ов'],//0
        ['й', 'я', 'и', 'и', 'и', 'й', 'й', 'й', 'й', 'й'],//1
        ['о', '', 'о', 'о', 'о', 'о', 'о', 'о', 'о', 'о'],//2
        ['ий', 'ие', 'ия', 'ия', 'ия', 'ий', 'ий', 'ий', 'ий', 'ий'],//3
        ['о', 'а', 'о', 'о', 'о', 'о', 'о', 'о', 'о', 'о'],//4
        ['ок', 'ка', 'ки', 'ки', 'ки', 'ок', 'ок', 'ок', 'ок', 'ок'],//5
        ['ых', 'ое', 'ых', 'ых', 'ых', 'ых', 'ых', 'ых', 'ых', 'ых'],//6
        ['о', 'о', 'о', 'о', 'о', 'о', 'о', 'о', 'о', 'о'],//7
    ];
    const deci = num % 100;
    if (deci > 10 && deci < 20) {
        return endings[type][0];
    } else {
        return endings[type][num % 10];
    }
}

export function fallbackCopyTextToClipboard(text) {
    let textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let result = false;
    try {
         result = document.execCommand('copy');
    } catch (e) {
        console.error(e);
    }

    document.body.removeChild(textArea);
    return result;
}

export async function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        return fallbackCopyTextToClipboard(text);
    }

    let result = false;
    try {
        await navigator.clipboard.writeText(text);
        result = true;
    } catch (e) {
        console.error(e);
    }

    return result;
}

export function isDigit(c) {
    return !isNaN(parseInt(c, 10));
}

export function dateFormat(date, format = 'DD.MM.YYYY') {
    return dayjs(date).format(format);
}

export function sqlDateFormat(date, format = 'DD.MM.YYYY') {
    return dayjs(date, 'YYYY-MM-DD').format(format);
}

export function isManualDate(date) {
    return date && (date[0] == ',' || (isDigit(date[0]) && isDigit(date[1])));
}

