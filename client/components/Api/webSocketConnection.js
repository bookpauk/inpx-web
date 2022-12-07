import WebSocketConnection from '../../../server/core/WebSocketConnection';

const protocol = (window.location.protocol == 'https:' ? 'wss:' : 'ws:');
let url = `${protocol}//${window.location.host}${window.location.pathname}`;
url += (url[url.length - 1] === '/' ? 'ws' : '/ws');

export default new WebSocketConnection(url);