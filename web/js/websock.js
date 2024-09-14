// websock.js

import {ChatComponent} from "./components";

export class WebSock {
    constructor() {
        let secure = window.location.protocol === 'https:';
        this.socket = new WebSocket(`${secure ? 'wss' : 'ws'}://${window.location.host}/ws`);

        this.socket.onopen = () => {
            console.log('Connected to server');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // Type is users list
            if (data.type === 'users') {
                ChatComponent.setUsers(data.users);
            }

            // Type is new user
            if (data.type === 'new_user') {
                ChatComponent.addUser(data.user);
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