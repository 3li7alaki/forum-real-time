// websock.js

import {ChatComponent} from "./components.js";

export class WebSock {
    constructor() {
        let secure = window.location.protocol === 'https:';
        this.socket = new WebSocket(`${secure ? 'wss' : 'ws'}://${window.location.host}/ws`);

        this.socket.onopen = () => {
            this.socket.send(JSON.stringify({
                type: 'open',
                content: '',
                user_id: 1
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
                // TODO: Notify user

                // If chat is open, display new message in chat

                // If chat is closed, display notification
            }

            if (data.type === 'typing') {
                // TODO: Display user is typing
            }
        };
    }
}