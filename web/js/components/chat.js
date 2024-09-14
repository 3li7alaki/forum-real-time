// chat.js


import {webSock} from "../websock.js";
import {fetchAPI} from "../api.js";
import { currentUser } from "../state.js";
import { timeSince } from "../utils.js";
import Toastr from "../toastr.js";

export class Chat {
    constructor() {
        this.users = [];
        this.input = document.getElementById('chat-input');
        this.messages = [];
        this.currentReceiver = null;

        // this.addTypingListener();
    }

    setUsers(users) {
        this.users = users;
        this.renderUsers();
    }

    renderUsers() {
        this.messages = [];
        this.users = this.users.sort((a, b) => {
            return new Date(b.last_messaged_at) - new Date(a.last_messaged_at);
        });

        const display = document.getElementById('chat-display');
        display.innerHTML = '';
        const usersList = document.createElement('div');
        usersList.id = 'users';
        usersList.innerHTML = '';
        display.appendChild(usersList)

        this.users?.forEach( user => {
            const userDiv = document.createElement('div');
            const nickname = user.nickname;
            const time = user.last_messaged_at? new Date(user.last_messaged_at): null;
            const displayMsg = time? `Last Messaged ${timeSince(time)}`: `Say hello`;
            userDiv.classList.add("listDiv");
            userDiv.innerHTML = `<div class="nicknameInList"><span class="nickListSpan">${nickname + " "}</span></div>
                                <div class="lastMessagedInList">${displayMsg}</div>`;
            usersList.appendChild(userDiv);

            userDiv.onclick = () => {
                this.currentReceiver = user;
                this.renderMessages(user.id)
            }

        });

        console.log('Rendering users:', this.users);
    }

    renderMessages(idMessaged){
        this.messages = this.getMessages(idMessaged);
        const backButton = document.createElement('div');
        const display = document.getElementById('chat-display');
        display.innerHTML = '';
        backButton.style.cursor = 'pointer';
        backButton.textContent = '< Back'
        backButton.id = 'chat-backButton'
        backButton.onclick = () => this.renderUsers();
        display.appendChild(backButton);
        const messagesDiv = document.createElement('div')

    }

    addTypingListener() {
        let isTyping = false;
        let typingTimer = null;
        let debounceDelay = 500;

        function debouncedTypingStart() {
            clearTimeout(typingTimer);
            if (!isTyping) {
                isTyping = true;
                webSock.typing("start");
            }
            typingTimer = setTimeout(() => {
                isTyping = false;
                webSock.typing("stop");
            }, debounceDelay);
        }

        this.input.addEventListener('input', debouncedTypingStart);

        this.input.addEventListener('blur', () => {
            clearTimeout(typingTimer);
            if (isTyping) {
                isTyping = false;
                webSock.typing("stop");
            }
        });
    }

    userTyping(user_id, status) {
        // TODO: Display user is typing
    }

    getMessages(user_id, limit = 10) {
        return fetchAPI(`/messages?user_id=${user_id}&limit=${limit}`);
    }

    receiveMessage(message) {
        this.users.forEach(user => {
            if (user.id === message.sender.id) {
                user.last_messaged_at = message.time;
            }
        })

        if (this.currentReceiver?.id === message.sender.id) {
            this.messages.push(message);
            this.renderMessages();
        } else {
            Toastr.info('New message from ' + message.sender.nickname);

            if (!this.currentReceiver) {
                this.renderUsers();
            }
        }
    }

    sendMessage(content) {
        if (!this.currentReceiver) {
            Toastr.error('Select a user to send message to');
            return;
        }

        const body = { content: content, receiver_id: this.currentReceiver.id };
        fetchAPI('/messages', 'POST', body).then(data => {
            this.messages.push(data);
            this.renderMessages();

            webSock.message(content, this.currentReceiver.id);
        }).catch(err => {
            Toastr.error('Failed to send message');
        });
    }
}