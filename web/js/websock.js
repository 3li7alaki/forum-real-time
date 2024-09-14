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
                user_id: currentUser.id
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
                ChatComponent.receiveMessage(data.content);
            }

            if (data.type === 'typing') {
                ChatComponent.userTyping(data.user_id, data.content);
            }
        };
    }

    disconnect() {
        this.socket.close();
        this.socket = null;
    }

    typing(status) {
        if (!currentUser) {
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'typing',
            content: status,
            user_id: currentUser.id
        }));
    }

    message(content, receiverID) {
        if (!currentUser) {
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'message',
            content: content,
            user_id: currentUser.id,
            receiver_id: receiverID
        }));
    }

    register() {
        if (!currentUser) {
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'register',
            content: '',
            user_id: currentUser.id
        }));
    }
}

export const webSock = new WebSock();