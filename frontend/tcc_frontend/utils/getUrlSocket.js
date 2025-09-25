export default function getHostName(){
    return 'wss://' + window.location.hostname + ':3001/api';
}