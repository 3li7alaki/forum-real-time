// websock.js

import {ChatComponent} from "./components.js";
import {currentUser} from "./state.js";

export class WebSock {
    constructor() {
        const subdomain = window.location.protocol === 'https:' ? 'wss' : 'ws';
        this.url = `${subdomain}://${window.location.host}/ws`;

        this.socket = null;
    }

    connect() {
        if (this.socket) {
            this.disconnect();
        }
        this.socket = new WebSocket(this.url);

        if (!currentUser) {
            return;
        }

        this.socket.onopen = () => {
            this.socket.send(JSON.stringify({
                type: 'open',
                content: '',
                sender_id: currentUser.id
            }));
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // Type is users list
            if (data.type === 'users') {
                ChatComponent.setUsers(data.content);
            }

            // Type is message
            if (data.type === 'message') {
                ChatComponent.receiveMessage(data);
            }

            if (data.type === 'typing') {
                ChatComponent.userTyping(data.sender_id, data.content);
            }
        };
    }

    disconnect() {
        this.socket.close();
        this.socket = null;
    }

    typing(status, recID) {
        if (!currentUser) {
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'typing',
            content: status,
            sender_id: currentUser.id,
            receiver_id: recID
        }));
    }

    message(content, receiverID) {
        if (!currentUser) {
            return;
        }
        
        this.socket.send(JSON.stringify({
            type: 'message',
            content: content,
            sender_id: currentUser.id,
            time: new Date().toJSON(),
            receiver_id: receiverID
        }));
    }

    register() {
        if (!currentUser) {
            return;
        }

        this.send(JSON.stringify({
            type: 'register',
            content: '',
            sender_id: currentUser.id
        }));
    }

    send(message) {
        this.waitForConnection(function () {
            this.socket.send(message);
        }, 1000);
    }

    waitForConnection(callback, interval) {
        if (this.socket.readyState === 1) {
            callback();
        } else {
            var that = this;
            setTimeout(function () {
                that.waitForConnection(callback, interval);
            }, interval);
        }
    }
}

export const webSock = new WebSock();