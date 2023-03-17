const chardet = require('chardet');

function getEncoding(buf) {
    let selected = getEncodingLite(buf);

    if (selected == 'ISO-8859-5' && buf.length > 10) {
        const charsetAll = chardet.analyse(buf.slice(0, 100000));
        for (const charset of charsetAll) {
            if (charset.name.indexOf('ISO-8859') < 0) {
                selected = charset.name;
                break;
            }
        }
    }

    return selected;
}


function getEncodingLite(buf, returnAll) {
    const lowerCase = 3;
    const upperCase = 1;

    const codePage = {
        'k': 'koi8-r',
        'w': 'Windows-1251',
        'd': 'cp866',
        'i': 'ISO-8859-5',
        'm': 'maccyrillic',
        'u': 'utf-8',
    };

    let charsets = {
        'k': 0,
        'w': 0,
        'd': 0,
        'i': 0,
        'm': 0,
        'u': 0,
    };

    const len = (buf.length > 100000 ? 100000 : buf.length);
    let i = 0;
    let totalChecked = 0;
    while (i < len) {
        const char = buf[i];
        const nextChar = (i < len - 1 ? buf[i + 1] : 0);
        totalChecked++;
        i++;
        //non-russian characters
        if (char < 128 || char > 256)
            continue;
        //UTF-8
        if ((char == 208 || char == 209) && nextChar >= 128 && nextChar <= 190)
            charsets['u'] += lowerCase;
        else {
            //CP866
            if ((char > 159 && char < 176) || (char > 223 && char < 242)) charsets['d'] += lowerCase;
            if ((char > 127 && char < 160)) charsets['d'] += upperCase;

            //KOI8-R
            if ((char > 191 && char < 223)) charsets['k'] += lowerCase;
            if ((char > 222 && char < 256)) charsets['k'] += upperCase;

            //WIN-1251
            if (char > 223 && char < 256) charsets['w'] += lowerCase;
            if (char > 191 && char < 224) charsets['w'] += upperCase;

            //MAC
            if (char > 221 && char < 255) charsets['m'] += lowerCase;
            if (char > 127 && char < 160) charsets['m'] += upperCase;

            //ISO-8859-5
            if (char > 207 && char < 240) charsets['i'] += lowerCase;
            if (char > 175 && char < 208) charsets['i'] += upperCase;
        }
    }

    let sorted = Object.keys(charsets).map(function(key) {
        return { codePage: codePage[key], c: charsets[key], totalChecked };
    });

    sorted.sort((a, b) => b.c - a.c);

    if (returnAll)
        return sorted;
    else if (sorted[0].c > 0 && sorted[0].c > sorted[0].totalChecked/2)
        return sorted[0].codePage;
    else
        return 'ISO-8859-5';
}

function checkIfText(buf) {
    const enc = getEncodingLite(buf, true);
    if (enc[0].c > enc[0].totalChecked*0.9)
        return true;

    let spaceCount = 0;
    let crCount = 0;
    let lfCount = 0;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] == 32)
            spaceCount++;
        if (buf[i] == 13)
            crCount++;
        if (buf[i] == 10)
            lfCount++;
    }

    const spaceFreq = spaceCount/(buf.length + 1);
    const crFreq = crCount/(buf.length + 1);
    const lfFreq = lfCount/(buf.length + 1);

    return (buf.length < 1000 || spaceFreq > 0.1 || crFreq > 0.03 || lfFreq > 0.03);
}

module.exports = {
    getEncoding,
    getEncodingLite,
    checkIfText,
}